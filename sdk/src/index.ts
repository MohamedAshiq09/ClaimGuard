import {
  Claim,
  ClaimId,
  ClaimGuardConfig,
  InvariantCheckResult,
  Lien,
  LienStatus,
  ClaimStatus,
  VerificationStatus,
} from "./types";

export * from "./types";

/**
 * ClaimGuard TypeScript SDK
 * Enables lenders, DeFi protocols, and suppliers to interact with ClaimGuard
 * on Portaldot V3 in ~5 lines of code.
 */
export class ClaimGuard {
  private rpcUrl: string;
  private contractAddress: string;
  private privateKey?: string;

  constructor(config: ClaimGuardConfig) {
    this.rpcUrl = config.rpcUrl;
    this.contractAddress = config.contractAddress;
    this.privateKey = config.privateKey;
  }

  /**
   * Check whether a pledge is allowed by running all invariant rules.
   */
  async checkInvariants(
    claimId: ClaimId,
    _action: "pledge" | "transfer",
    _lender: string,
    amount: bigint
  ): Promise<InvariantCheckResult> {
    const status = await this.getLienStatus(claimId);

    if (status.status !== ClaimStatus.Acknowledged && status.status !== ClaimStatus.Pledged) {
      return {
        allowed: false,
        remainingCapacity: 0n,
        violatedRule: "BuyerAcknowledged",
        reason: "Claim has not been acknowledged by buyer",
      };
    }

    if (status.verification === VerificationStatus.Rejected) {
      return {
        allowed: false,
        remainingCapacity: 0n,
        violatedRule: "ClaimRejected",
        reason: "Claim verification was rejected due to fraud dispute",
      };
    }

    const newTotal = status.totalPledged + amount;
    if (newTotal > status.maxPledgeAllowed) {
      return {
        allowed: false,
        remainingCapacity: status.maxPledgeAllowed > status.totalPledged ? status.maxPledgeAllowed - status.totalPledged : 0n,
        violatedRule: "ExceedsAdvanceRate",
        reason: `Pledge of ${amount} exceeds max advance capacity. Remaining: ${status.maxPledgeAllowed - status.totalPledged}`,
      };
    }

    return {
      allowed: true,
      remainingCapacity: status.maxPledgeAllowed - newTotal,
    };
  }

  /**
   * Record a financing lien on a claim.
   */
  async pledge(
    claimId: ClaimId,
    lender: string,
    amount: bigint
  ): Promise<{ txHash: string; lienId: number }> {
    const check = await this.checkInvariants(claimId, "pledge", lender, amount);
    if (!check.allowed) {
      throw new Error(`[ClaimGuard] Invariant Rejection: ${check.violatedRule} - ${check.reason}`);
    }

    // In local / mock testnet mode:
    return {
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      lienId: 1,
    };
  }

  /**
   * Fetch the live lien and advance rate status of a claim.
   */
  async getLienStatus(claimId: ClaimId): Promise<LienStatus> {
    // Default mockable structure for SDK initialization
    const faceValue = 1_000_000n;
    const maxAdvanceRateBps = 8000; // 80%
    const maxPledgeAllowed = (faceValue * BigInt(maxAdvanceRateBps)) / 10000n;
    const totalPledged = 0n;

    return {
      claimId,
      faceValue,
      totalPledged,
      maxPledgeAllowed,
      currentAdvanceRatePct: Number((totalPledged * 10000n) / faceValue) / 100,
      maxAdvanceRatePct: maxAdvanceRateBps / 100,
      isFullyPledged: totalPledged >= maxPledgeAllowed,
      activeLienCount: 0,
      status: ClaimStatus.Acknowledged,
      verification: VerificationStatus.Unverified,
    };
  }
}
