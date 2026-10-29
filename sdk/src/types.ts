export type ClaimId = number | bigint;
export type AssertionId = number;
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
  requireVerified: boolean;
}

export interface Lien {
  lienId: number;
  claimId: ClaimId;
  lender: string;
  amount: bigint;
  timestamp: bigint;
  active: boolean;
}

export interface Assertion {
  assertionId: AssertionId;
  claimId: ClaimId;
  asserter: string;
  bond: bigint;
  assertedAt: bigint;
  challengeDeadline: bigint;
  challenged: boolean;
  challenger?: string;
  challengerBond: bigint;
  resolved: boolean;
  passed: boolean;
}

export interface ClaimSnapshot {
  claimId: ClaimId;
  status: ClaimStatus;
  verification: VerificationStatus;
  faceValue: bigint;
  totalPledged: bigint;
  maxAdvanceRateBps: number;
  requireVerified: boolean;
  nonce: bigint;
  timestamp: bigint;
  expiry: bigint;
}

export interface InvariantCheckResult {
  allowed: boolean;
  remainingCapacity: bigint;
  violatedRule?: string;
  reason?: string;
}

export interface ViolationLogEntry {
  timestamp: number;
  claimId: ClaimId;
  ruleName: string;
  actor: string;
  attemptedAmount: bigint;
  reason: string;
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
  requireVerified: boolean;
}

export interface SignedSnapshot {
  snapshot: ClaimSnapshot;
  signature: string;
  signer: string;
  snapshotHash: string;
}

export interface SnapshotVerificationResult {
  valid: boolean;
  reason?: string;
  remainingCapacity: bigint;
  isAlreadyPledged: boolean;
  status: ClaimStatus;
  verification: VerificationStatus;
}

export interface ClaimGuardConfig {
  rpcUrl: string;
  contractAddress: string;
  signerUri?: string; // SURI or seed phrase (e.g. "//Alice" or seed)
  metadataJson?: any;
}

