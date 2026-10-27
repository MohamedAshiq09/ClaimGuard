export type ClaimId = number | bigint;
export type Hash256 = string; // Hex string '0x...'
export type Balance = bigint;
export type Timestamp = bigint;

export enum ClaimStatus {
  Registered = "Registered",
  Acknowledged = "Acknowledged",
  Pledged = "Pledged",
  Settled = "Settled",
  Defaulted = "Defaulted",
  Cancelled = "Cancelled",
}

export enum VerificationStatus {
  Unverified = "Unverified",
  Asserted = "Asserted",
  Disputed = "Disputed",
  Verified = "Verified",
  Rejected = "Rejected",
}

export interface Claim {
  id: ClaimId;
  issuer: string;
  buyer: string;
  faceValue: bigint;
  currencyCode: string;
  dueDate: bigint;
  docHash: string;
  status: ClaimStatus;
  verification: VerificationStatus;
  maxAdvanceRateBps: number;
  allowedJurisdiction: string;
  registeredAt: bigint;
  totalPledged: bigint;
}

export interface Lien {
  lienId: number;
  claimId: ClaimId;
  lender: string;
  amount: bigint;
  timestamp: bigint;
  active: boolean;
}

export interface InvariantCheckResult {
  allowed: boolean;
  remainingCapacity: bigint;
  violatedRule?: string;
  reason?: string;
}

export interface LienStatus {
  claimId: ClaimId;
  faceValue: bigint;
  totalPledged: bigint;
  maxPledgeAllowed: bigint;
  currentAdvanceRatePct: number;
  maxAdvanceRatePct: number;
  isFullyPledged: boolean;
  activeLienCount: number;
  status: ClaimStatus;
  verification: VerificationStatus;
}

export interface ClaimGuardConfig {
  rpcUrl: string;
  contractAddress: string;
  privateKey?: string;
}
