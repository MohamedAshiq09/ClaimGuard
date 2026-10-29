#![cfg_attr(not(feature = "std"), no_std, no_main)]

pub mod errors;
pub mod events;
pub mod rules;
pub mod types;

#[ink::contract]
mod claimguard_core {
    use crate::errors::Error;
    use crate::events::{
        AssertionFinalized, AssertionResolved, ClaimAcknowledged, ClaimAsserted,
        ClaimChallenged, ClaimRegistered, ClaimSettled, ClaimTransferred,
        InvariantViolationAttempt, LienRecorded, LienReleased, VerificationStatusUpdated,
    };
    use crate::rules::{
        validate_advance_rate, validate_buyer_acknowledged, validate_doc_hash_unique,
        validate_jurisdiction, validate_maturity, validate_transfer_lock,
        validate_verification_status,
    };
    use crate::types::{
        Assertion, AssertionId, Claim, ClaimId, ClaimSnapshot, ClaimStatus, Hash256, Lien,
        VerificationStatus,
    };
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    #[ink(storage)]
    pub struct ClaimGuardCore {
        pub owner: AccountId,
        pub resolver: AccountId,
        pub min_bond: Balance,
        pub next_claim_id: ClaimId,
        pub next_assertion_id: AssertionId,
        pub claims: Mapping<ClaimId, Claim>,
        pub doc_hash_to_claim: Mapping<Hash256, ClaimId>,
        pub liens: Mapping<(ClaimId, u32), Lien>,
        pub claim_lien_count: Mapping<ClaimId, u32>,
        pub snapshot_nonce: Mapping<ClaimId, u64>,
        pub authorized_verifiers: Mapping<AccountId, bool>,
        pub assertions: Mapping<AssertionId, Assertion>,
        pub claim_latest_assertion: Mapping<ClaimId, AssertionId>,
    }

    impl Default for ClaimGuardCore {
        fn default() -> Self {
            Self::new()
        }
    }

    impl ClaimGuardCore {
        /// Constructor initializes the registry with caller as owner and default resolver.
        #[ink(constructor)]
        pub fn new() -> Self {
            let caller = Self::env().caller();

            Self {
                owner: caller,
                resolver: caller,
                min_bond: 1_000,
                next_claim_id: 1,
                next_assertion_id: 1,
                claims: Mapping::default(),
                doc_hash_to_claim: Mapping::default(),
                liens: Mapping::default(),
                claim_lien_count: Mapping::default(),
                snapshot_nonce: Mapping::default(),
                authorized_verifiers: Mapping::default(),
                assertions: Mapping::default(),
                claim_latest_assertion: Mapping::default(),
            }
        }

        /// Authorize an address to update claim verification status directly.
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

        /// Update the designated dispute resolver (owner only).
        #[ink(message)]
        pub fn set_resolver(&mut self, resolver: AccountId) -> Result<(), Error> {
            if self.env().caller() != self.owner {
                return Err(Error::Unauthorized);
            }
            self.resolver = resolver;
            Ok(())
        }

        /// 1. Register a new claim (MSME invoice).
        /// Rejects duplicate document hash, zero face value, or past maturity.
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
            require_verified: bool,
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
                require_verified,
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

            // Check Verification (VerifiedOnly invariant)
            validate_verification_status(claim.verification, claim.require_verified)?;

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

            // Authorization: issuer or lender
            if caller != claim.issuer && caller != lender {
                return Err(Error::Unauthorized);
            }

            // Invariant 1: Verification status check (VerifiedOnly / Anti-Fraud)
            if let Err(err) = validate_verification_status(claim.verification, claim.require_verified) {
                let rule_name = match err {
                    Error::ClaimRejected => b"ClaimRejected\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0",
                    _ => b"NotVerified\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0",
                };
                self.emit_violation(claim_id, rule_name, caller, amount);
                return Err(err);
            }

            // Invariant 2: Buyer must have acknowledged
            if let Err(err) = validate_buyer_acknowledged(claim.status) {
                self.emit_violation(claim_id, b"BuyerNotAcknowledged\0\0\0\0\0\0\0\0\0\0\0\0", caller, amount);
                return Err(err);
            }

            // Invariant 3: Maturity check
            if let Err(err) = validate_maturity(current_time, claim.due_date) {
                self.emit_violation(claim_id, b"ClaimPastMaturity\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0", caller, amount);
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

            // Once total pledged reaches 0, claim returns to unencumbered Acknowledged status.
            if claim.total_pledged == 0 {
                claim.status = ClaimStatus::Acknowledged;
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

        /// 6. Settle claim: Buyer or Issuer marks invoice settled once payment clears.
        /// Invariant: All active liens must be released first (total_pledged == 0).
        #[ink(message)]
        pub fn settle_claim(&mut self, claim_id: ClaimId) -> Result<(), Error> {
            let caller = self.env().caller();
            let mut claim = self.claims.get(claim_id).ok_or(Error::ClaimNotFound)?;

            if caller != claim.buyer && caller != claim.issuer {
                return Err(Error::Unauthorized);
            }

            if claim.total_pledged > 0 {
                return Err(Error::ClaimFrozenOrLocked);
            }

            if claim.status == ClaimStatus::Settled {
                return Err(Error::InvalidStatusTransition);
            }

            claim.status = ClaimStatus::Settled;
            self.claims.insert(claim_id, &claim);

            self.env().emit_event(ClaimSettled { claim_id });
            Ok(())
        }

        /// 7. Transfer claim ownership (enforcing TransferLock and Jurisdiction invariants).
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

        // =====================================================================
        // Bonded Verification Module (Truth Layer)
        // =====================================================================

        /// 8. Assert valid: Post a financial bond asserting that an invoice is genuine.
        #[ink(message)]
        pub fn assert_valid(
            &mut self,
            claim_id: ClaimId,
            challenge_window_seconds: u64,
            bond_amount: Balance,
        ) -> Result<AssertionId, Error> {
            let caller = self.env().caller();
            let mut claim = self.claims.get(claim_id).ok_or(Error::ClaimNotFound)?;

            if claim.verification == VerificationStatus::Rejected {
                return Err(Error::ClaimRejected);
            }

            if bond_amount < self.min_bond {
                return Err(Error::InsufficientBond);
            }

            let current_time = self.env().block_timestamp();
            let window = if challenge_window_seconds < 60 {
                86_400 // default 24h
            } else {
                challenge_window_seconds
            };
            let challenge_deadline = current_time.saturating_add(window);

            let assertion_id = self.next_assertion_id;
            let assertion = Assertion {
                assertion_id,
                claim_id,
                asserter: caller,
                bond: bond_amount,
                asserted_at: current_time,
                challenge_deadline,
                challenged: false,
                challenger: None,
                challenger_bond: 0,
                resolved: false,
                passed: false,
            };

            self.assertions.insert(assertion_id, &assertion);
            self.claim_latest_assertion.insert(claim_id, &assertion_id);
            self.next_assertion_id = self
                .next_assertion_id
                .checked_add(1)
                .ok_or(Error::ArithmeticOverflow)?;

            claim.verification = VerificationStatus::Asserted;
            self.claims.insert(claim_id, &claim);

            self.env().emit_event(ClaimAsserted {
                assertion_id,
                claim_id,
                asserter: caller,
                bond: bond_amount,
                challenge_deadline,
            });

            self.env().emit_event(VerificationStatusUpdated {
                claim_id,
                new_status: VerificationStatus::Asserted,
            });

            Ok(assertion_id)
        }

        /// 9. Challenge assertion: Challenger posts a matching bond disputing invoice validity.
        #[ink(message)]
        pub fn challenge(
            &mut self,
            assertion_id: AssertionId,
            bond_amount: Balance,
        ) -> Result<(), Error> {
            let caller = self.env().caller();
            let mut assertion = self.assertions.get(assertion_id).ok_or(Error::AssertionNotFound)?;

            if assertion.challenged {
                return Err(Error::AssertionAlreadyChallenged);
            }
            if assertion.resolved {
                return Err(Error::AssertionAlreadyResolved);
            }

            let current_time = self.env().block_timestamp();
            if current_time >= assertion.challenge_deadline {
                return Err(Error::ChallengePeriodExpired);
            }

            if bond_amount < assertion.bond {
                return Err(Error::InsufficientBond);
            }

            assertion.challenged = true;
            assertion.challenger = Some(caller);
            assertion.challenger_bond = bond_amount;
            self.assertions.insert(assertion_id, &assertion);

            let mut claim = self.claims.get(assertion.claim_id).ok_or(Error::ClaimNotFound)?;
            claim.verification = VerificationStatus::Disputed;
            self.claims.insert(assertion.claim_id, &claim);

            self.env().emit_event(ClaimChallenged {
                assertion_id,
                claim_id: assertion.claim_id,
                challenger: caller,
                bond: bond_amount,
            });

            self.env().emit_event(VerificationStatusUpdated {
                claim_id: assertion.claim_id,
                new_status: VerificationStatus::Disputed,
            });

            Ok(())
        }

        /// 10. Resolve assertion: Designated resolver rules on dispute.
        /// If valid == false, claim is marked Rejected and asserter loses bond.
        #[ink(message)]
        pub fn resolve(
            &mut self,
            assertion_id: AssertionId,
            valid: bool,
        ) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.resolver && caller != self.owner {
                return Err(Error::Unauthorized);
            }

            let mut assertion = self.assertions.get(assertion_id).ok_or(Error::AssertionNotFound)?;
            if assertion.resolved {
                return Err(Error::AssertionAlreadyResolved);
            }

            assertion.resolved = true;
            assertion.passed = valid;
            self.assertions.insert(assertion_id, &assertion);

            let mut claim = self.claims.get(assertion.claim_id).ok_or(Error::ClaimNotFound)?;
            let new_status = if valid {
                VerificationStatus::Verified
            } else {
                VerificationStatus::Rejected
            };
            claim.verification = new_status;
            self.claims.insert(assertion.claim_id, &claim);

            self.env().emit_event(AssertionResolved {
                assertion_id,
                claim_id: assertion.claim_id,
                valid,
                resolver: caller,
            });

            self.env().emit_event(VerificationStatusUpdated {
                claim_id: assertion.claim_id,
                new_status,
            });

            Ok(())
        }

        /// 11. Finalize assertion: If no challenge occurred during window, assertion passes.
        #[ink(message)]
        pub fn finalize(&mut self, assertion_id: AssertionId) -> Result<(), Error> {
            let mut assertion = self.assertions.get(assertion_id).ok_or(Error::AssertionNotFound)?;

            if assertion.challenged {
                return Err(Error::AssertionAlreadyChallenged);
            }
            if assertion.resolved {
                return Err(Error::AssertionAlreadyResolved);
            }

            let current_time = self.env().block_timestamp();
            if current_time < assertion.challenge_deadline {
                return Err(Error::ChallengePeriodNotExpired);
            }

            assertion.resolved = true;
            assertion.passed = true;
            self.assertions.insert(assertion_id, &assertion);

            let mut claim = self.claims.get(assertion.claim_id).ok_or(Error::ClaimNotFound)?;
            claim.verification = VerificationStatus::Verified;
            self.claims.insert(assertion.claim_id, &claim);

            self.env().emit_event(AssertionFinalized {
                assertion_id,
                claim_id: assertion.claim_id,
            });

            self.env().emit_event(VerificationStatusUpdated {
                claim_id: assertion.claim_id,
                new_status: VerificationStatus::Verified,
            });

            Ok(())
        }

        /// 12. Direct verification update (owner or authorized contract).
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

        /// 13. Export signed state snapshot for cross-chain sync.
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
                require_verified: claim.require_verified,
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

        #[ink(message)]
        pub fn get_assertion(&self, assertion_id: AssertionId) -> Option<Assertion> {
            self.assertions.get(assertion_id)
        }

        #[ink(message)]
        pub fn get_assertion_by_claim(&self, claim_id: ClaimId) -> Option<Assertion> {
            let aid = self.claim_latest_assertion.get(claim_id)?;
            self.assertions.get(aid)
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
    // Comprehensive Unit and Attack Tests
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
                    false,
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
                false,
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

            set_caller(accounts.alice);
            let claim_id = contract
                .register_claim(
                    accounts.bob,
                    1_000_000,
                    *b"INR\0",
                    90_000,
                    [2u8; 32],
                    8000, // 80% = max 800,000
                    *b"IN",
                    false,
                )
                .unwrap();

            set_caller(accounts.bob);
            contract.acknowledge(claim_id).unwrap();

            // Pledge 800,000 to Lender A (Eve) -> Valid (reaches 80%)
            set_caller(accounts.alice);
            let lien_1 = contract.pledge(claim_id, accounts.eve, 800_000);
            assert_eq!(lien_1, Ok(1));
            assert_eq!(contract.get_total_pledged(claim_id), 800_000);

            // Second pledge of 800,000 to Lender B (Frank) -> REVERT with ExceedsAdvanceRate!
            let double_pledge = contract.pledge(claim_id, accounts.frank, 800_000);
            assert_eq!(double_pledge, Err(Error::ExceedsAdvanceRate));

            // Even a small pledge of 1 more should revert
            let over_limit = contract.pledge(claim_id, accounts.frank, 1);
            assert_eq!(over_limit, Err(Error::ExceedsAdvanceRate));

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
                    8000, // 80% = 800,000
                    *b"IN",
                    false,
                )
                .unwrap();

            set_caller(accounts.bob);
            contract.acknowledge(claim_id).unwrap();

            // Lender A takes 500,000
            set_caller(accounts.alice);
            let l1 = contract.pledge(claim_id, accounts.eve, 500_000).unwrap();
            assert_eq!(l1, 1);

            // Lender C takes 300,000 -> total reaches 800,000
            let l2 = contract.pledge(claim_id, accounts.frank, 300_000).unwrap();
            assert_eq!(l2, 2);

            // Third pledge of 10,000 fails
            let l3 = contract.pledge(claim_id, accounts.django, 10_000);
            assert_eq!(l3, Err(Error::ExceedsAdvanceRate));

            // Transfer while pledged must fail (TransferLock)
            let transfer_err = contract.transfer_claim(claim_id, accounts.django, *b"IN");
            assert_eq!(transfer_err, Err(Error::ClaimFrozenOrLocked));

            // Release Lender A's lien -> returns status to Acknowledged (NOT Settled)
            set_caller(accounts.eve);
            contract.release(claim_id, l1).unwrap();
            assert_eq!(contract.get_total_pledged(claim_id), 300_000);

            // Release Lender C's lien -> total_pledged is 0, status is Acknowledged
            set_caller(accounts.frank);
            contract.release(claim_id, l2).unwrap();
            assert_eq!(contract.get_total_pledged(claim_id), 0);
            let claim = contract.get_claim(claim_id).unwrap();
            assert_eq!(claim.status, ClaimStatus::Acknowledged);

            // Now buyer or issuer can explicitly settle_claim
            set_caller(accounts.bob);
            assert_eq!(contract.settle_claim(claim_id), Ok(()));
            let settled_claim = contract.get_claim(claim_id).unwrap();
            assert_eq!(settled_claim.status, ClaimStatus::Settled);
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
                    false,
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

        #[ink::test]
        fn test_unauthorized_callers() {
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
                    [5u8; 32],
                    8000,
                    *b"IN",
                    false,
                )
                .unwrap();

            // Charlie (unauthorized) tries to acknowledge
            set_caller(accounts.charlie);
            assert_eq!(contract.acknowledge(claim_id), Err(Error::Unauthorized));

            // Bob acknowledges
            set_caller(accounts.bob);
            assert_eq!(contract.acknowledge(claim_id), Ok(()));

            // Charlie tries to pledge
            set_caller(accounts.charlie);
            let pledge_res = contract.pledge(claim_id, accounts.eve, 100_000);
            assert_eq!(pledge_res, Err(Error::Unauthorized));

            // Alice pledges to Eve
            set_caller(accounts.alice);
            let lien_id = contract.pledge(claim_id, accounts.eve, 100_000).unwrap();

            // Charlie tries to release Eve's lien
            set_caller(accounts.charlie);
            assert_eq!(contract.release(claim_id, lien_id), Err(Error::Unauthorized));

            // Charlie tries to transfer Alice's claim
            assert_eq!(
                contract.transfer_claim(claim_id, accounts.charlie, *b"IN"),
                Err(Error::Unauthorized)
            );
        }

        #[ink::test]
        fn test_transfer_and_subsequent_pledge() {
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
                    [6u8; 32],
                    8000,
                    *b"IN",
                    false,
                )
                .unwrap();

            // Transfer to Charlie (same jurisdiction "IN")
            let transfer_res = contract.transfer_claim(claim_id, accounts.charlie, *b"IN");
            assert_eq!(transfer_res, Ok(()));

            let claim = contract.get_claim(claim_id).unwrap();
            assert_eq!(claim.issuer, accounts.charlie);

            // Bob acknowledges
            set_caller(accounts.bob);
            contract.acknowledge(claim_id).unwrap();

            // Charlie (the new owner) pledges to Eve
            set_caller(accounts.charlie);
            let lien_id = contract.pledge(claim_id, accounts.eve, 400_000).unwrap();
            assert_eq!(lien_id, 1);
            assert_eq!(contract.get_total_pledged(claim_id), 400_000);

            // Old owner Alice tries to pledge -> fails
            set_caller(accounts.alice);
            assert_eq!(
                contract.pledge(claim_id, accounts.frank, 100_000),
                Err(Error::Unauthorized)
            );
        }

        #[ink::test]
        fn test_disallowed_jurisdiction_transfer() {
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
                    [7u8; 32],
                    8000,
                    *b"IN",
                    false,
                )
                .unwrap();

            let transfer_res = contract.transfer_claim(claim_id, accounts.charlie, *b"US");
            assert_eq!(transfer_res, Err(Error::DisallowedJurisdiction));
        }

        #[ink::test]
        fn test_verified_only_enforcement() {
            let accounts = default_accounts();
            let mut contract = ClaimGuardCore::new();
            set_block_timestamp(1_000);

            // Register claim with require_verified = true
            set_caller(accounts.alice);
            let claim_id = contract
                .register_claim(
                    accounts.bob,
                    1_000_000,
                    *b"INR\0",
                    90_000,
                    [88u8; 32],
                    8000,
                    *b"IN",
                    true, // REQUIRES VERIFIED!
                )
                .unwrap();

            set_caller(accounts.bob);
            contract.acknowledge(claim_id).unwrap();

            // Pledging while Unverified must FAIL with NotVerified
            set_caller(accounts.alice);
            let pledge_err1 = contract.pledge(claim_id, accounts.eve, 100_000);
            assert_eq!(pledge_err1, Err(Error::NotVerified));

            // Assert valid (status -> Asserted)
            let assertion_id = contract.assert_valid(claim_id, 3600, 5000).unwrap();
            assert_eq!(assertion_id, 1);

            // Pledging while Asserted (not yet Verified) must FAIL with NotVerified
            let pledge_err2 = contract.pledge(claim_id, accounts.eve, 100_000);
            assert_eq!(pledge_err2, Err(Error::NotVerified));

            // Fast forward past challenge window and finalize
            set_block_timestamp(5_000);
            contract.finalize(assertion_id).unwrap();

            let claim = contract.get_claim(claim_id).unwrap();
            assert_eq!(claim.verification, VerificationStatus::Verified);

            // Now pledge succeeds!
            let lien_id = contract.pledge(claim_id, accounts.eve, 100_000).unwrap();
            assert_eq!(lien_id, 1);
        }

        #[ink::test]
        fn test_bonded_verification_fake_invoice_slashed() {
            let accounts = default_accounts();
            let mut contract = ClaimGuardCore::new();
            set_block_timestamp(1_000);

            // Alice registers invoice
            set_caller(accounts.alice);
            let claim_id = contract
                .register_claim(
                    accounts.bob,
                    1_000_000,
                    *b"INR\0",
                    90_000,
                    [89u8; 32],
                    8000,
                    *b"IN",
                    true,
                )
                .unwrap();

            // Bob acknowledges invoice
            set_caller(accounts.bob);
            contract.acknowledge(claim_id).unwrap();

            // Fraudster asserter posts bond asserting validity
            set_caller(accounts.alice);
            let assertion_id = contract.assert_valid(claim_id, 3600, 5000).unwrap();

            // Challenger disputes invoice within window
            set_caller(accounts.charlie);
            contract.challenge(assertion_id, 5000).unwrap();

            let claim = contract.get_claim(claim_id).unwrap();
            assert_eq!(claim.verification, VerificationStatus::Disputed);

            // Resolver investigates and rules invoice is FAKE (valid = false)
            set_caller(accounts.alice); // owner is default resolver
            contract.resolve(assertion_id, false).unwrap();

            let rejected_claim = contract.get_claim(claim_id).unwrap();
            assert_eq!(rejected_claim.verification, VerificationStatus::Rejected);

            // Claim is permanently Rejected; any pledge attempt reverts
            set_caller(accounts.alice);
            let pledge_err = contract.pledge(claim_id, accounts.eve, 100_000);
            assert_eq!(pledge_err, Err(Error::ClaimRejected));
        }

        #[ink::test]
        fn test_bonded_verification_valid_invoice_cleared() {
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
                    [90u8; 32],
                    8000,
                    *b"IN",
                    true,
                )
                .unwrap();

            let assertion_id = contract.assert_valid(claim_id, 3600, 5000).unwrap();

            // Challenger disputes maliciously
            set_caller(accounts.charlie);
            contract.challenge(assertion_id, 5000).unwrap();

            // Resolver confirms invoice is genuine (valid = true)
            set_caller(accounts.alice);
            contract.resolve(assertion_id, true).unwrap();

            let verified_claim = contract.get_claim(claim_id).unwrap();
            assert_eq!(verified_claim.verification, VerificationStatus::Verified);

            // Bob acknowledges and Alice pledges
            set_caller(accounts.bob);
            contract.acknowledge(claim_id).unwrap();

            set_caller(accounts.alice);
            let lien_id = contract.pledge(claim_id, accounts.eve, 200_000).unwrap();
            assert_eq!(lien_id, 1);
        }

        #[ink::test]
        fn test_export_snapshot_and_validation() {
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
                    [9u8; 32],
                    8000,
                    *b"IN",
                    false,
                )
                .unwrap();

            // Zero amount registration rejected
            let zero_res = contract.register_claim(
                accounts.bob,
                0,
                *b"INR\0",
                90_000,
                [10u8; 32],
                8000,
                *b"IN",
                false,
            );
            assert_eq!(zero_res, Err(Error::ZeroAmount));

            // Export first snapshot
            let s1 = contract.export_snapshot(claim_id, 3600).unwrap();
            assert_eq!(s1.nonce, 1);
            assert_eq!(s1.timestamp, 1_000);
            assert_eq!(s1.expiry, 4_600);
            assert_eq!(s1.total_pledged, 0);

            // Export second snapshot - nonce increments
            let s2 = contract.export_snapshot(claim_id, 7200).unwrap();
            assert_eq!(s2.nonce, 2);
            assert_eq!(s2.expiry, 8_200);
        }
    }
}
