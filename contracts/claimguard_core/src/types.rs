use ink::primitives::AccountId;

pub type ClaimId = u64;
pub type AssertionId = u32;
pub type Hash256 = [u8; 32];
pub type Balance = u128;
pub type Timestamp = u64;

#[derive(Debug, PartialEq, Eq, Clone, Copy, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum ClaimStatus {
    Registered,
    Acknowledged,
    Pledged,
    Settled,
    Defaulted,
    Cancelled,
}

#[derive(Debug, PartialEq, Eq, Clone, Copy, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum VerificationStatus {
    Unverified,
    Asserted,
    Disputed,
    Verified,
    Rejected,
}

#[derive(Debug, PartialEq, Eq, Clone, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct Claim {
    pub id: ClaimId,
    pub issuer: AccountId,
    pub buyer: AccountId,
    pub face_value: Balance,
    pub currency_code: [u8; 4],
    pub due_date: Timestamp,
    pub doc_hash: Hash256,
    pub status: ClaimStatus,
    pub verification: VerificationStatus,
    pub max_advance_rate_bps: u16,
    pub allowed_jurisdiction: [u8; 2],
    pub registered_at: Timestamp,
    pub total_pledged: Balance,
    pub require_verified: bool,
}

#[derive(Debug, PartialEq, Eq, Clone, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct Lien {
    pub lien_id: u32,
    pub claim_id: ClaimId,
    pub lender: AccountId,
    pub amount: Balance,
    pub timestamp: Timestamp,
    pub active: bool,
}

#[derive(Debug, PartialEq, Eq, Clone, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct Assertion {
    pub assertion_id: AssertionId,
    pub claim_id: ClaimId,
    pub asserter: AccountId,
    pub bond: Balance,
    pub asserted_at: Timestamp,
    pub challenge_deadline: Timestamp,
    pub challenged: bool,
    pub challenger: Option<AccountId>,
    pub challenger_bond: Balance,
    pub resolved: bool,
    pub passed: bool,
}

#[derive(Debug, PartialEq, Eq, Clone, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct ClaimSnapshot {
    pub claim_id: ClaimId,
    pub status: ClaimStatus,
    pub verification: VerificationStatus,
    pub face_value: Balance,
    pub total_pledged: Balance,
    pub max_advance_rate_bps: u16,
    pub require_verified: bool,
    pub nonce: u64,
    pub timestamp: Timestamp,
    pub expiry: Timestamp,
}

