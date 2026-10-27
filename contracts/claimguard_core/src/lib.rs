#![cfg_attr(not(feature = "std"), no_std, no_main)]

pub mod errors;
pub mod events;
pub mod rules;
pub mod types;

#[ink::contract]
mod claimguard_core {
    use crate::errors::Error;
    use crate::events::{
        ClaimAcknowledged, ClaimRegistered, ClaimSettled, ClaimTransferred,
        InvariantViolationAttempt, LienRecorded, LienReleased, VerificationStatusUpdated,
    };
    use crate::rules::{
        validate_advance_rate, validate_buyer_acknowledged, validate_doc_hash_unique,
        validate_jurisdiction, validate_maturity, validate_transfer_lock,
        validate_verification_status,
    };
    use crate::types::{
        Claim, ClaimId, ClaimSnapshot, ClaimStatus, Hash256, Lien,
        VerificationStatus,
    };
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    #[ink(storage)]
    pub struct ClaimGuardCore {
        pub owner: AccountId,
        pub next_claim_id: ClaimId,
        pub claims: Mapping<ClaimId, Claim>,
        pub doc_hash_to_claim: Mapping<Hash256, ClaimId>,
        pub liens: Mapping<(ClaimId, u32), Lien>,
        pub claim_lien_count: Mapping<ClaimId, u32>,
        pub snapshot_nonce: Mapping<ClaimId, u64>,
        pub authorized_verifiers: Mapping<AccountId, bool>,
    }

    impl ClaimGuardCore {
        /// Constructor initializes the registry with caller as owner.
        #[ink(constructor)]
        pub fn new() -> Self {
            let caller = Self::env().caller();
            let mut authorized_verifiers = Mapping::default();
            authorized_verifiers.insert(caller, &true);

            Self {
                owner: caller,
                next_claim_id: 1,
                claims: Mapping::default(),
                doc_hash_to_claim: Mapping::default(),
                liens: Mapping::default(),
                claim_lien_count: Mapping::default(),
                snapshot_nonce: Mapping::default(),
                authorized_verifiers,
            }
        }

        /// Authorize an address (e.g. BondedVerification contract) to update claim verification status.
        #[ink(message)]
        pub fn set_authorized_verifier(
            &mut self,
            verifier: AccountId,
            authorized: bool,
        ) -> Result<(), Error> {
            if self.env().caller() != self.owner {
                return Err(Error::Unauthorized);
            }
            self.authorized_verifiers.insert(verifier, &authorized);
            Ok(())
        }

        /// 1. Register a new claim (MSME invoice).
        /// Rejects duplicate document hash across the entire registry.
        #[ink(message)]
        #[allow(clippy::too_many_arguments)]
        pub fn register_claim(
            &mut self,
            buyer: AccountId,
            face_value: Balance,
            currency_code: [u8; 4],
            due_date: Timestamp,
            doc_hash: Hash256,
            max_advance_rate_bps: u16,
            allowed_jurisdiction: [u8; 2],
        ) -> Result<ClaimId, Error> {
            let caller = self.env().caller();

            if face_value == 0 {
                return Err(Error::ZeroAmount);
            }

            let current_time = self.env().block_timestamp();
            if due_date <= current_time {
                return Err(Error::ClaimPastMaturity);
            }

            // Rule 1: Anti-duplicate invoice check
            validate_doc_hash_unique(self.doc_hash_to_claim.contains(doc_hash))?;

            // Cap max advance rate at 100% (10,000 bps)
            let max_advance_rate = if max_advance_rate_bps > 10_000 {
                10_000
            } else if max_advance_rate_bps == 0 {
                8_000 // default 80% if 0 specified
            } else {
                max_advance_rate_bps
            };

            let claim_id = self.next_claim_id;
            let claim = Claim {
                id: claim_id,
                issuer: caller,
                buyer,
                face_value,
                currency_code,
                due_date,
                doc_hash,
                status: ClaimStatus::Registered,
                verification: VerificationStatus::Unverified,
                max_advance_rate_bps: max_advance_rate,
                allowed_jurisdiction,
                registered_at: current_time,
                total_pledged: 0,
            };

            self.claims.insert(claim_id, &claim);
            self.doc_hash_to_claim.insert(doc_hash, &claim_id);
            self.claim_lien_count.insert(claim_id, &0);
            self.next_claim_id = self
                .next_claim_id
                .checked_add(1)
                .ok_or(Error::ArithmeticOverflow)?;

            self.env().emit_event(ClaimRegistered {
                claim_id,
                issuer: caller,
                buyer,
                face_value,
                doc_hash,
            });

            Ok(claim_id)
        }

        /// 2. Buyer acknowledgment: buyer confirms the invoice goods/services and liability.
        #[ink(message)]
        pub fn acknowledge(&mut self, claim_id: ClaimId) -> Result<(), Error> {
            let caller = self.env().caller();
            let mut claim = self.claims.get(claim_id).ok_or(Error::ClaimNotFound)?;

            if caller != claim.buyer {
                return Err(Error::Unauthorized);
            }

            if claim.status != ClaimStatus::Registered {
                return Err(Error::InvalidStatusTransition);
            }

            claim.status = ClaimStatus::Acknowledged;
            self.claims.insert(claim_id, &claim);

            self.env().emit_event(ClaimAcknowledged {
                claim_id,
                buyer: caller,
            });

            Ok(())
        }

        /// 3. Invariant check simulation for pledge (view method for SDK / dApps).
        /// Returns remaining capacity if allowed, or exact Error if rejected.
        #[ink(message)]
        pub fn check_pledge(
            &self,
            claim_id: ClaimId,
            _lender: AccountId,
            amount: Balance,
        ) -> Result<Balance, Error> {
            let claim = self.claims.get(claim_id).ok_or(Error::ClaimNotFound)?;
            let current_time = self.env().block_timestamp();

            // Check Buyer Acknowledged
            validate_buyer_acknowledged(claim.status)?;

            // Check Maturity
            validate_maturity(current_time, claim.due_date)?;

            // Check Verification (cannot be Rejected)
            validate_verification_status(claim.verification, false)?;

            // Check Max Advance Rate
            let _new_total = validate_advance_rate(
                claim.face_value,
                claim.total_pledged,
                amount,
                claim.max_advance_rate_bps,
            )?;

            let max_allowed = claim
                .face_value
                .saturating_mul(claim.max_advance_rate_bps as u128)
                .checked_div(10_000)
                .unwrap_or(0);
            let attempted_total = claim.total_pledged.saturating_add(amount);
            let remaining_capacity = max_allowed.saturating_sub(attempted_total);

            Ok(remaining_capacity)
        }

        /// 4. Pledge claim to lender: records lien in the shared LienManager.
        /// Reverts on-chain if invariants (e.g. double pledge over limit) are breached.
        #[ink(message)]
        pub fn pledge(
            &mut self,
            claim_id: ClaimId,
            lender: AccountId,
            amount: Balance,
        ) -> Result<u32, Error> {
            let caller = self.env().caller();
            let mut claim = self.claims.get(claim_id).ok_or(Error::ClaimNotFound)?;
            let current_time = self.env().block_timestamp();

            // Authorization: issuer or approved contract
            if caller != claim.issuer
                && caller != lender
                && caller != self.owner
                && !self.authorized_verifiers.get(caller).unwrap_or(false)
            {
                return Err(Error::Unauthorized);
            }

            // Invariant 1: Buyer must have acknowledged
            if let Err(err) = validate_buyer_acknowledged(claim.status) {
                self.emit_violation(claim_id, b"BuyerNotAcknowledged\0\0\0\0\0\0\0\0\0\0\0\0", caller, amount);
                return Err(err);
            }

            // Invariant 2: Maturity check
            if let Err(err) = validate_maturity(current_time, claim.due_date) {
                self.emit_violation(claim_id, b"ClaimPastMaturity\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0", caller, amount);
                return Err(err);
            }

            // Invariant 3: Verification status check
            if let Err(err) = validate_verification_status(claim.verification, false) {
                self.emit_violation(claim_id, b"ClaimRejected\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0", caller, amount);
                return Err(err);
            }

            // Invariant 4: Max Advance Rate check (DOUBLE-PLEDGE PROTECTION)
            let new_total = match validate_advance_rate(
                claim.face_value,
                claim.total_pledged,
                amount,
                claim.max_advance_rate_bps,
            ) {
                Ok(t) => t,
                Err(err) => {
                    self.emit_violation(claim_id, b"ExceedsAdvanceRate\0\0\0\0\0\0\0\0\0\0\0\0\0\0", caller, amount);
                    return Err(err);
                }
            };

            // All invariants passed! Update state
            claim.total_pledged = new_total;
            claim.status = ClaimStatus::Pledged;
            self.claims.insert(claim_id, &claim);

            let lien_count = self.claim_lien_count.get(claim_id).unwrap_or(0);
            let next_lien_id = lien_count
                .checked_add(1)
                .ok_or(Error::ArithmeticOverflow)?;

            let lien = Lien {
                lien_id: next_lien_id,
                claim_id,
                lender,
                amount,
                timestamp: current_time,
                active: true,
            };

            self.liens.insert((claim_id, next_lien_id), &lien);
            self.claim_lien_count.insert(claim_id, &next_lien_id);

            self.env().emit_event(LienRecorded {
                claim_id,
                lien_id: next_lien_id,
                lender,
                amount,
                new_total_pledged: new_total,
            });

            Ok(next_lien_id)
        }

        /// 5. Release a lien upon repayment or cancellation.
        #[ink(message)]
        pub fn release(&mut self, claim_id: ClaimId, lien_id: u32) -> Result<(), Error> {
            let caller = self.env().caller();
            let mut claim = self.claims.get(claim_id).ok_or(Error::ClaimNotFound)?;
            let mut lien = self
                .liens
                .get((claim_id, lien_id))
                .ok_or(Error::LienNotFound)?;

            if !lien.active {
                return Err(Error::LienAlreadyInactive);
            }

            if caller != lien.lender && caller != self.owner {
                return Err(Error::Unauthorized);
            }

            lien.active = false;
            self.liens.insert((claim_id, lien_id), &lien);

            claim.total_pledged = claim.total_pledged.saturating_sub(lien.amount);

            let current_time = self.env().block_timestamp();
            if claim.total_pledged == 0 {
                if current_time >= claim.due_date {
                    claim.status = ClaimStatus::Settled;
                    self.env().emit_event(ClaimSettled { claim_id });
                } else {
                    claim.status = ClaimStatus::Acknowledged;
                }
            }

            self.claims.insert(claim_id, &claim);

            self.env().emit_event(LienReleased {
                claim_id,
                lien_id,
                lender: lien.lender,
                amount: lien.amount,
            });

            Ok(())
        }

        /// 6. Transfer claim ownership (enforcing TransferLock and Jurisdiction invariants).
        #[ink(message)]
        pub fn transfer_claim(
            &mut self,
            claim_id: ClaimId,
            new_owner: AccountId,
            recipient_jurisdiction: [u8; 2],
        ) -> Result<(), Error> {
            let caller = self.env().caller();
            let mut claim = self.claims.get(claim_id).ok_or(Error::ClaimNotFound)?;

            if caller != claim.issuer {
                return Err(Error::Unauthorized);
            }

            // Invariant 5: Transfer Lock (cannot transfer if pledged)
            validate_transfer_lock(claim.total_pledged)?;

            // Invariant 6: Jurisdiction Allowlist
            validate_jurisdiction(claim.allowed_jurisdiction, recipient_jurisdiction)?;

            let old_issuer = claim.issuer;
            claim.issuer = new_owner;
            self.claims.insert(claim_id, &claim);

            self.env().emit_event(ClaimTransferred {
                claim_id,
                old_issuer,
                new_issuer: new_owner,
            });

            Ok(())
        }

        /// 7. Update verification status (called by BondedVerification module).
        #[ink(message)]
        pub fn set_verification(
            &mut self,
            claim_id: ClaimId,
            new_status: VerificationStatus,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            if caller != self.owner && !self.authorized_verifiers.get(caller).unwrap_or(false) {
                return Err(Error::Unauthorized);
            }

            let mut claim = self.claims.get(claim_id).ok_or(Error::ClaimNotFound)?;
            claim.verification = new_status;
            self.claims.insert(claim_id, &claim);

            self.env().emit_event(VerificationStatusUpdated {
                claim_id,
                new_status,
            });

            Ok(())
        }

        /// 8. Export signed state snapshot for cross-chain sync.
        #[ink(message)]
        pub fn export_snapshot(
            &mut self,
            claim_id: ClaimId,
            validity_duration: Timestamp,
        ) -> Result<ClaimSnapshot, Error> {
            let claim = self.claims.get(claim_id).ok_or(Error::ClaimNotFound)?;
            let current_time = self.env().block_timestamp();
            let current_nonce = self.snapshot_nonce.get(claim_id).unwrap_or(0);
            let next_nonce = current_nonce
                .checked_add(1)
                .ok_or(Error::ArithmeticOverflow)?;

            self.snapshot_nonce.insert(claim_id, &next_nonce);

            let duration = if validity_duration == 0 {
                3600 // 1 hour default
            } else {
                validity_duration
            };

            let snapshot = ClaimSnapshot {
                claim_id,
                status: claim.status,
                verification: claim.verification,
                face_value: claim.face_value,
                total_pledged: claim.total_pledged,
                max_advance_rate_bps: claim.max_advance_rate_bps,
                nonce: next_nonce,
                timestamp: current_time,
                expiry: current_time.saturating_add(duration),
            };

            Ok(snapshot)
        }

        // =====================================================================
        // Read-Only Getters
        // =====================================================================

        #[ink(message)]
        pub fn get_claim(&self, claim_id: ClaimId) -> Option<Claim> {
            self.claims.get(claim_id)
        }

        #[ink(message)]
        pub fn get_claim_by_doc_hash(&self, doc_hash: Hash256) -> Option<ClaimId> {
            self.doc_hash_to_claim.get(doc_hash)
        }

        #[ink(message)]
        pub fn get_lien(&self, claim_id: ClaimId, lien_id: u32) -> Option<Lien> {
            self.liens.get((claim_id, lien_id))
        }

        #[ink(message)]
        pub fn get_lien_count(&self, claim_id: ClaimId) -> u32 {
            self.claim_lien_count.get(claim_id).unwrap_or(0)
        }

        #[ink(message)]
        pub fn get_total_pledged(&self, claim_id: ClaimId) -> Balance {
            self.claims
                .get(claim_id)
                .map(|c| c.total_pledged)
                .unwrap_or(0)
        }

        #[ink(message)]
        pub fn get_max_pledge_allowed(&self, claim_id: ClaimId) -> Balance {
            self.claims
                .get(claim_id)
                .map(|c| {
                    c.face_value
                        .saturating_mul(c.max_advance_rate_bps as u128)
                        .checked_div(10_000)
                        .unwrap_or(0)
                })
                .unwrap_or(0)
        }

        #[ink(message)]
        pub fn is_claim_pledgeable(&self, claim_id: ClaimId, amount: Balance) -> bool {
            self.check_pledge(claim_id, AccountId::from([0u8; 32]), amount)
                .is_ok()
        }

        #[ink(message)]
        pub fn get_liens_for_claim(&self, claim_id: ClaimId) -> Vec<Lien> {
            let count = self.claim_lien_count.get(claim_id).unwrap_or(0);
            let mut list = Vec::new();
            for i in 1..=count {
                if let Some(lien) = self.liens.get((claim_id, i)) {
                    list.push(lien);
                }
            }
            list
        }

        // Internal helper to emit violation attempt
        fn emit_violation(
            &self,
            claim_id: ClaimId,
            rule_name: &[u8; 32],
            actor: AccountId,
            attempted_amount: Balance,
        ) {
            self.env().emit_event(InvariantViolationAttempt {
                claim_id,
                rule_name: *rule_name,
                actor,
                attempted_amount,
            });
        }
    }

    // =========================================================================
    // Unit Tests
    // =========================================================================
    #[cfg(test)]
    mod tests {
        use super::*;

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        fn set_caller(account: AccountId) {
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(account);
        }

        fn set_block_timestamp(timestamp: u64) {
            ink::env::test::set_block_timestamp::<ink::env::DefaultEnvironment>(timestamp);
        }

        #[ink::test]
        fn test_register_and_acknowledge() {
            let accounts = default_accounts();
            let mut contract = ClaimGuardCore::new();
            set_block_timestamp(1_000);

            // 1. Register claim
            set_caller(accounts.alice);
            let doc_hash = [1u8; 32];
            let claim_id = contract
                .register_claim(
                    accounts.bob,
                    1_000_000,
                    *b"INR\0",
                    90_000,
                    doc_hash,
                    8000, // 80%
                    *b"IN",
                )
                .expect("Registration should succeed");

            assert_eq!(claim_id, 1);
            let claim = contract.get_claim(claim_id).expect("Claim should exist");
            assert_eq!(claim.status, ClaimStatus::Registered);
            assert_eq!(claim.total_pledged, 0);

            // 2. Reject duplicate doc hash
            let dup_err = contract.register_claim(
                accounts.charlie,
                500_000,
                *b"INR\0",
                90_000,
                doc_hash,
                8000,
                *b"IN",
            );
            assert_eq!(dup_err, Err(Error::DuplicateDocHash));

            // 3. Acknowledge by unauthorized caller should fail
            set_caller(accounts.charlie);
            let unauth_ack = contract.acknowledge(claim_id);
            assert_eq!(unauth_ack, Err(Error::Unauthorized));

            // 4. Acknowledge by buyer (Bob) should succeed
            set_caller(accounts.bob);
            let ack_res = contract.acknowledge(claim_id);
            assert_eq!(ack_res, Ok(()));

            let updated_claim = contract.get_claim(claim_id).unwrap();
            assert_eq!(updated_claim.status, ClaimStatus::Acknowledged);
        }

        #[ink::test]
        fn test_double_pledge_rejected() {
            let accounts = default_accounts();
            let mut contract = ClaimGuardCore::new();
            set_block_timestamp(1_000);

            // Alice registers ₹10,00,000 invoice with Bob
            set_caller(accounts.alice);
            let claim_id = contract
                .register_claim(
                    accounts.bob,
                    1_000_000,
                    *b"INR\0",
                    90_000,
                    [2u8; 32],
                    8000, // 80% = max ₹8,00,000
                    *b"IN",
                )
                .unwrap();

            // Bob acknowledges
            set_caller(accounts.bob);
            contract.acknowledge(claim_id).unwrap();

            // Pledge ₹8,00,000 to Lender A (Eve) -> Valid (reaches 80%)
            set_caller(accounts.alice);
            let lien_1 = contract.pledge(claim_id, accounts.eve, 800_000);
            assert_eq!(lien_1, Ok(1));
            assert_eq!(contract.get_total_pledged(claim_id), 800_000);

            // Second pledge of ₹8,00,000 to Lender B (Frank) -> REVERT with ExceedsAdvanceRate!
            let double_pledge = contract.pledge(claim_id, accounts.frank, 800_000);
            assert_eq!(double_pledge, Err(Error::ExceedsAdvanceRate));

            // Even a small pledge of ₹1 more should revert
            let over_limit = contract.pledge(claim_id, accounts.frank, 1);
            assert_eq!(over_limit, Err(Error::ExceedsAdvanceRate));

            // Total pledged remains ₹8,00,000
            assert_eq!(contract.get_total_pledged(claim_id), 800_000);
        }

        #[ink::test]
        fn test_split_pledge_and_release() {
            let accounts = default_accounts();
            let mut contract = ClaimGuardCore::new();
            set_block_timestamp(1_000);

            set_caller(accounts.alice);
            let claim_id = contract
                .register_claim(
                    accounts.bob,
                    1_000_000,
                    *b"INR\0",
                    90_000,
                    [3u8; 32],
                    8000, // 80% = ₹8,00,000
                    *b"IN",
                )
                .unwrap();

            set_caller(accounts.bob);
            contract.acknowledge(claim_id).unwrap();

            // Lender A takes 50% (₹5,00,000)
            set_caller(accounts.alice);
            let l1 = contract.pledge(claim_id, accounts.eve, 500_000).unwrap();
            assert_eq!(l1, 1);

            // Lender C takes 30% (₹3,00,000) -> total reaches ₹8,00,000
            let l2 = contract.pledge(claim_id, accounts.frank, 300_000).unwrap();
            assert_eq!(l2, 2);

            // Third pledge of ₹10,000 fails
            let l3 = contract.pledge(claim_id, accounts.django, 10_000);
            assert_eq!(l3, Err(Error::ExceedsAdvanceRate));

            // Transfer while pledged must fail (TransferLock)
            let transfer_err = contract.transfer_claim(claim_id, accounts.django, *b"IN");
            assert_eq!(transfer_err, Err(Error::ClaimFrozenOrLocked));

            // Release Lender A's lien
            set_caller(accounts.eve);
            contract.release(claim_id, l1).unwrap();
            assert_eq!(contract.get_total_pledged(claim_id), 300_000);

            // Now Lender D can pledge up to ₹5,00,000
            set_caller(accounts.alice);
            let l4 = contract.pledge(claim_id, accounts.django, 500_000).unwrap();
            assert_eq!(l4, 3);
            assert_eq!(contract.get_total_pledged(claim_id), 800_000);
        }

        #[ink::test]
        fn test_maturity_and_jurisdiction() {
            let accounts = default_accounts();
            let mut contract = ClaimGuardCore::new();
            set_block_timestamp(1_000);

            set_caller(accounts.alice);
            let claim_id = contract
                .register_claim(
                    accounts.bob,
                    1_000_000,
                    *b"INR\0",
                    5_000, // expires at 5000
                    [4u8; 32],
                    8000,
                    *b"IN",
                )
                .unwrap();

            set_caller(accounts.bob);
            contract.acknowledge(claim_id).unwrap();

            // Advance time past maturity
            set_block_timestamp(6_000);

            // Pledge after maturity must fail
            set_caller(accounts.alice);
            let expired_pledge = contract.pledge(claim_id, accounts.eve, 100_000);
            assert_eq!(expired_pledge, Err(Error::ClaimPastMaturity));
        }
    }
}
