#[derive(Debug, PartialEq, Eq, Clone, Copy, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum Error {
    ClaimNotFound,
    DuplicateDocHash,
    Unauthorized,
    InvalidStatusTransition,
    ClaimPastMaturity,
    BuyerNotAcknowledged,
    ExceedsAdvanceRate,
    ClaimFrozenOrLocked,
    NotVerified,
    ClaimRejected,
    DisallowedJurisdiction,
    LienNotFound,
    LienAlreadyInactive,
    ArithmeticOverflow,
    ZeroAmount,
    AssertionNotFound,
    AssertionAlreadyChallenged,
    AssertionAlreadyResolved,
    ChallengePeriodExpired,
    ChallengePeriodNotExpired,
    InsufficientBond,
}

