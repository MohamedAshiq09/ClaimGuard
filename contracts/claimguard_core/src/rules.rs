use crate::errors::Error;
use crate::types::{Balance, ClaimStatus, Timestamp, VerificationStatus};

/// 1. Validate that the invoice document hash is not already registered.
pub fn validate_doc_hash_unique(already_registered: bool) -> Result<(), Error> {
    if already_registered {
        return Err(Error::DuplicateDocHash);
    }
    Ok(())
}

/// 2. Validate that the buyer has acknowledged the invoice before any pledge.
pub fn validate_buyer_acknowledged(status: ClaimStatus) -> Result<(), Error> {
    match status {
        ClaimStatus::Acknowledged | ClaimStatus::Pledged => Ok(()),
        ClaimStatus::Registered => Err(Error::BuyerNotAcknowledged),
        ClaimStatus::Settled | ClaimStatus::Defaulted | ClaimStatus::Cancelled => {
            Err(Error::InvalidStatusTransition)
        }
    }
}

/// 3. Validate that total pledged plus new pledge does not exceed the max advance rate.
///
/// Returns the resulting new total pledged balance on success.
pub fn validate_advance_rate(
    face_value: Balance,
    current_pledged: Balance,
    new_pledge_amount: Balance,
    max_advance_bps: u16,
) -> Result<Balance, Error> {
    if new_pledge_amount == 0 {
        return Err(Error::ZeroAmount);
    }

    // max_allowed = face_value * max_advance_bps / 10_000
    let max_allowed = face_value
        .checked_mul(max_advance_bps as u128)
        .ok_or(Error::ArithmeticOverflow)?
        .checked_div(10_000)
        .ok_or(Error::ArithmeticOverflow)?;

    let new_total = current_pledged
        .checked_add(new_pledge_amount)
        .ok_or(Error::ArithmeticOverflow)?;

    if new_total > max_allowed {
        return Err(Error::ExceedsAdvanceRate);
    }

    Ok(new_total)
}

/// 4. Validate that the invoice has not passed its maturity due date.
pub fn validate_maturity(current_time: Timestamp, due_date: Timestamp) -> Result<(), Error> {
    if current_time >= due_date {
        return Err(Error::ClaimPastMaturity);
    }
    Ok(())
}

/// 5. Validate transfer lock: an asset cannot be transferred while active liens exist.
pub fn validate_transfer_lock(total_pledged: Balance) -> Result<(), Error> {
    if total_pledged > 0 {
        return Err(Error::ClaimFrozenOrLocked);
    }
    Ok(())
}

/// 6. Validate jurisdiction allowlist.
pub fn validate_jurisdiction(
    allowed_jurisdiction: [u8; 2],
    actor_jurisdiction: [u8; 2],
) -> Result<(), Error> {
    // If allowed_jurisdiction is wildcard (b"--" or b"\0\0"), allow any
    if allowed_jurisdiction == *b"--" || allowed_jurisdiction == [0, 0] {
        return Ok(());
    }

    if allowed_jurisdiction != actor_jurisdiction {
        return Err(Error::DisallowedJurisdiction);
    }

    Ok(())
}

/// 7. Validate verification status: if required, claim must be Verified, and cannot be Rejected.
pub fn validate_verification_status(
    status: VerificationStatus,
    require_verified: bool,
) -> Result<(), Error> {
    if status == VerificationStatus::Rejected {
        return Err(Error::ClaimRejected);
    }

    if require_verified && status != VerificationStatus::Verified {
        return Err(Error::NotVerified);
    }

    Ok(())
}
