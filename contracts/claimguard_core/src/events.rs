use ink::primitives::AccountId;
use crate::types::{Balance, ClaimId, Hash256, VerificationStatus};

#[ink::event]
pub struct ClaimRegistered {
    #[ink(topic)]
    pub claim_id: ClaimId,
    #[ink(topic)]
    pub issuer: AccountId,
    #[ink(topic)]
    pub buyer: AccountId,
    pub face_value: Balance,
    pub doc_hash: Hash256,
}

#[ink::event]
pub struct ClaimAcknowledged {
    #[ink(topic)]
    pub claim_id: ClaimId,
    #[ink(topic)]
    pub buyer: AccountId,
}

#[ink::event]
pub struct LienRecorded {
    #[ink(topic)]
    pub claim_id: ClaimId,
    pub lien_id: u32,
    #[ink(topic)]
    pub lender: AccountId,
    pub amount: Balance,
    pub new_total_pledged: Balance,
}

#[ink::event]
pub struct LienReleased {
    #[ink(topic)]
    pub claim_id: ClaimId,
    pub lien_id: u32,
    #[ink(topic)]
    pub lender: AccountId,
    pub amount: Balance,
}

#[ink::event]
pub struct ClaimSettled {
    #[ink(topic)]
    pub claim_id: ClaimId,
}

#[ink::event]
pub struct ClaimTransferred {
    #[ink(topic)]
    pub claim_id: ClaimId,
    #[ink(topic)]
    pub old_issuer: AccountId,
    #[ink(topic)]
    pub new_issuer: AccountId,
}

#[ink::event]
pub struct VerificationStatusUpdated {
    #[ink(topic)]
    pub claim_id: ClaimId,
    pub new_status: VerificationStatus,
}

#[ink::event]
pub struct InvariantViolationAttempt {
    #[ink(topic)]
    pub claim_id: ClaimId,
    pub rule_name: [u8; 32],
    #[ink(topic)]
    pub actor: AccountId,
    pub attempted_amount: Balance,
}
