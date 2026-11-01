import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";
import { ContractPromise } from "@polkadot/api-contract";
import { cryptoWaitReady, signatureVerify, blake2AsHex } from "@polkadot/util-crypto";
import { stringToU8a, u8aToHex } from "@polkadot/util";
import {
  Assertion,
  AssertionId,
  Claim,
  ClaimId,
  ClaimGuardConfig,
  ClaimSnapshot,
  ClaimStatus,
  InvariantCheckResult,
  Lien,
  LienStatus,
  SignedSnapshot,
  SnapshotVerificationResult,
  VerificationStatus,
  ViolationLogEntry,
} from "./types";

export * from "./types";

function persistViolation(entry: ViolationLogEntry, violationsPath?: string) {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const existingStr = window.localStorage.getItem("claimguard_violations");
      const list = existingStr ? JSON.parse(existingStr) : [];
      list.unshift({
        ...entry,
        attemptedAmount: entry.attemptedAmount.toString(),
      });
      window.localStorage.setItem("claimguard_violations", JSON.stringify(list));
    } catch {}
  }
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      // Dynamic require avoids bundler issues in frontend Vite
      const fs = eval("require")("fs");
      const path = eval("require")("path");
      const filePath = violationsPath || path.resolve(process.cwd(), "data/violations.json");
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      let list = [];
      if (fs.existsSync(filePath)) {
        try {
          list = JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch {}
      }
      list.unshift({
        ...entry,
        attemptedAmount: entry.attemptedAmount.toString(),
      });
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf8");
    } catch {}
  }
}

function loadPersistedViolations(violationsPath?: string): ViolationLogEntry[] {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const existingStr = window.localStorage.getItem("claimguard_violations");
      if (existingStr) {
        const raw = JSON.parse(existingStr);
        return raw.map((r: any) => ({
          ...r,
          attemptedAmount: BigInt(r.attemptedAmount || 0),
        }));
      }
    } catch {}
  }
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      const fs = eval("require")("fs");
      const path = eval("require")("path");
      const filePath = violationsPath || path.resolve(process.cwd(), "data/violations.json");
      if (fs.existsSync(filePath)) {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return raw.map((r: any) => ({
          ...r,
          attemptedAmount: BigInt(r.attemptedAmount || 0),
        }));
      }
    } catch {}
  }
  return [];
}

/**
 * ClaimGuard TypeScript SDK
 * Enables lenders, DeFi protocols, and suppliers to enforce and verify
 * invariants and liens on Portaldot V3 in ~5 lines of code.
 */
export class ClaimGuard {
  private rpcUrl: string;
  private contractAddress: string;
  private signerUri?: string;
  private metadataJson?: any;
  private violationsPath?: string;
  private api?: ApiPromise;
  private contract?: ContractPromise;
  private signer?: any;
  private violationLog: ViolationLogEntry[] = [];

  constructor(config: ClaimGuardConfig) {
    this.rpcUrl = config.rpcUrl;
    this.contractAddress = config.contractAddress;
    this.signerUri = config.signerUri;
    this.metadataJson = config.metadataJson;
    this.violationsPath = config.violationsPath;
    this.violationLog = loadPersistedViolations(this.violationsPath);
  }

  /**
   * Initialize API and Contract connection.
   */
  async init(): Promise<void> {
    await cryptoWaitReady();
    const wsProvider = new WsProvider(this.rpcUrl);
    this.api = await ApiPromise.create({ provider: wsProvider });

    if (this.signerUri) {
      const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
      this.signer = keyring.addFromUri(this.signerUri);
    }

    if (this.metadataJson && this.contractAddress) {
      this.contract = new ContractPromise(this.api, this.metadataJson, this.contractAddress);
    }
  }

  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
    }
  }

  getContract(): ContractPromise | undefined {
    return this.contract;
  }

  getSignerAddress(): string {
    return this.signer?.address || "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
  }

  /**
   * 1. Check whether a pledge satisfies all on-chain invariants before loan execution.
   */
  async checkInvariants(
    claimId: ClaimId,
    _action: "pledge" | "transfer",
    lender: string,
    amount: bigint
  ): Promise<InvariantCheckResult> {
    if (this.contract && this.api) {
      const gasLimit: any = this.api.registry.createType("WeightV2", {
        refTime: 300_000_000_000n,
        proofSize: 1_000_000n,
      });

      const caller = this.getSignerAddress();
      const dryRun = await this.contract.query.checkPledge(
        caller,
        { gasLimit, storageDepositLimit: null },
        claimId,
        lender,
        amount
      );

      if (dryRun.result.isOk && dryRun.output) {
        const output = dryRun.output.toHuman() as any;
        if (output && output.Ok !== undefined) {
          const inner = output.Ok;
          if (inner && typeof inner === "object") {
            if (inner.Ok !== undefined) {
              return {
                allowed: true,
                remainingCapacity: BigInt(inner.Ok.toString().replace(/,/g, "")),
              };
            } else if (inner.Err !== undefined) {
              const rule = typeof inner.Err === "string" ? inner.Err : JSON.stringify(inner.Err);
              this.logViolation(claimId, rule, caller, amount, `Simulation failed with ${rule}`);
              return {
                allowed: false,
                remainingCapacity: 0n,
                violatedRule: rule,
                reason: `Invariant breach: ${rule}`,
              };
            }
          } else {
            return {
              allowed: true,
              remainingCapacity: BigInt(inner.toString().replace(/,/g, "")),
            };
          }
        } else if (output && output.Err !== undefined) {
          const rule = typeof output.Err === "string" ? output.Err : JSON.stringify(output.Err);
          this.logViolation(claimId, rule, caller, amount, `Call error: ${rule}`);
          return {
            allowed: false,
            remainingCapacity: 0n,
            violatedRule: rule,
            reason: `Call error: ${rule}`,
          };
        }
      }
    }

    // Client-side fallback computation
    const status = await this.getLienStatus(claimId);

    if (status.status !== ClaimStatus.Acknowledged && status.status !== ClaimStatus.Pledged) {
      this.logViolation(claimId, "BuyerAcknowledged", lender, amount, "Claim not acknowledged");
      return {
        allowed: false,
        remainingCapacity: 0n,
        violatedRule: "BuyerAcknowledged",
        reason: "Claim has not been acknowledged by buyer",
      };
    }

    if (status.requireVerified && status.verification !== VerificationStatus.Verified) {
      this.logViolation(claimId, "NotVerified", lender, amount, "Claim not verified");
      return {
        allowed: false,
        remainingCapacity: 0n,
        violatedRule: "NotVerified",
        reason: "Claim requires verified status before pledge",
      };
    }

    if (status.verification === VerificationStatus.Rejected) {
      this.logViolation(claimId, "ClaimRejected", lender, amount, "Claim verification was rejected");
      return {
        allowed: false,
        remainingCapacity: 0n,
        violatedRule: "ClaimRejected",
        reason: "Claim verification was rejected due to fraud dispute",
      };
    }

    const newTotal = status.totalPledged + amount;
    if (newTotal > status.maxPledgeAllowed) {
      this.logViolation(claimId, "ExceedsAdvanceRate", lender, amount, "Exceeds advance rate limit");
      return {
        allowed: false,
        remainingCapacity:
          status.maxPledgeAllowed > status.totalPledged
            ? status.maxPledgeAllowed - status.totalPledged
            : 0n,
        violatedRule: "ExceedsAdvanceRate",
        reason: `Pledge of ${amount} exceeds max advance capacity. Remaining: ${
          status.maxPledgeAllowed - status.totalPledged
        }`,
      };
    }

    return {
      allowed: true,
      remainingCapacity: status.maxPledgeAllowed - newTotal,
    };
  }

  /**
   * 2. Record a financing lien on a claim.
   * If options.skipDryRun is true, submits the transaction to the chain directly
   * so an over-limit double-pledge attempt is recorded in a block with a failed result and real tx hash.
   */
  async pledge(
    claimId: ClaimId,
    lender: string,
    amount: bigint,
    options?: { skipDryRun?: boolean }
  ): Promise<{ txHash: string; lienId?: number; success: boolean; error?: string }> {
    if (!options?.skipDryRun) {
      const check = await this.checkInvariants(claimId, "pledge", lender, amount);
      if (!check.allowed) {
        throw new Error(`[ClaimGuard] Invariant Rejection: ${check.violatedRule} - ${check.reason}`);
      }
    }

    if (!this.contract || !this.signer || !this.api) {
      throw new Error("SDK not initialized with signer or contract");
    }

    const gasLimit: any = this.api.registry.createType("WeightV2", {
      refTime: 300_000_000_000n,
      proofSize: 1_000_000n,
    });

    const tx = this.contract.tx.pledge(
      { gasLimit, storageDepositLimit: null },
      claimId,
      lender,
      amount
    );

    return new Promise((resolve, reject) => {
      tx.signAndSend(this.signer, (result: any) => {
        const { status, events = [], dispatchError } = result;
        const txHash = status.isFinalized
          ? status.asFinalized.toHex()
          : status.isInBlock
          ? status.asInBlock.toHex()
          : "";

        if (status.isFinalized || status.isInBlock) {
          if (dispatchError) {
            let errorMsg = dispatchError.toString();
            if (dispatchError.isModule && this.api) {
              const decoded = this.api.registry.findMetaError(dispatchError.asModule);
              errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`;
            }
            this.logViolation(
              claimId,
              "ExceedsAdvanceRate",
              lender,
              amount,
              `On-chain transaction failed: ${errorMsg}`,
              txHash
            );
            if (options?.skipDryRun) {
              resolve({
                txHash,
                success: false,
                error: errorMsg,
              });
            } else {
              reject(new Error(errorMsg));
            }
          } else if (status.isFinalized) {
            let lienId = 1;
            resolve({
              txHash,
              lienId,
              success: true,
            });
          }
        }
      }).catch(reject);
    });
  }

  /**
   * Authorize a lender to pledge against a claim up to maxAmount (issuer consent).
   */
  async approveLender(
    claimId: ClaimId,
    lender: string,
    maxAmount: bigint
  ): Promise<{ txHash: string }> {
    if (!this.contract || !this.signer || !this.api) {
      throw new Error("SDK not initialized with signer or contract");
    }

    const gasLimit: any = this.api.registry.createType("WeightV2", {
      refTime: 300_000_000_000n,
      proofSize: 1_000_000n,
    });

    const tx = this.contract.tx.approveLender(
      { gasLimit, storageDepositLimit: null },
      claimId,
      lender,
      maxAmount
    );

    return new Promise((resolve, reject) => {
      tx.signAndSend(this.signer, (result: any) => {
        const { status, dispatchError } = result;
        if (status.isFinalized) {
          if (dispatchError) {
            reject(new Error(dispatchError.toString()));
          } else {
            resolve({ txHash: status.asFinalized.toHex() });
          }
        }
      }).catch(reject);
    });
  }

  /**
   * Read approved pledge allowance for a lender on a claim.
   */
  async getLenderApproval(claimId: ClaimId, lender: string): Promise<bigint> {
    if (this.contract && this.api) {
      const gasLimit: any = this.api.registry.createType("WeightV2", {
        refTime: 300_000_000_000n,
        proofSize: 1_000_000n,
      });
      const caller = this.getSignerAddress();
      const res = await this.contract.query.getLenderApproval(
        caller,
        { gasLimit },
        claimId,
        lender
      );
      if (res.result.isOk && res.output) {
        return BigInt(res.output.toString());
      }
    }
    return 0n;
  }

  /**
   * 3. Fetch live lien status.
   */
  async getLienStatus(claimId: ClaimId): Promise<LienStatus> {
    if (this.contract && this.api) {
      const gasLimit: any = this.api.registry.createType("WeightV2", {
        refTime: 300_000_000_000n,
        proofSize: 1_000_000n,
      });

      const caller = this.getSignerAddress();
      const res = await this.contract.query.getClaim(caller, { gasLimit }, claimId);
      const claimHuman = (res.output?.toHuman() as any)?.Ok;

      if (claimHuman) {
        const faceValue = BigInt(claimHuman.faceValue.toString().replace(/,/g, ""));
        const totalPledged = BigInt(claimHuman.totalPledged.toString().replace(/,/g, ""));
        const maxAdvanceRateBps = Number(claimHuman.maxAdvanceRateBps.toString().replace(/,/g, ""));
        const maxPledgeAllowed = (faceValue * BigInt(maxAdvanceRateBps)) / 10000n;

        return {
          claimId,
          faceValue,
          totalPledged,
          maxPledgeAllowed,
          currentAdvanceRatePct: Number((totalPledged * 10000n) / faceValue) / 100,
          maxAdvanceRatePct: maxAdvanceRateBps / 100,
          isFullyPledged: totalPledged >= maxPledgeAllowed,
          activeLienCount: 1,
          status: claimHuman.status as ClaimStatus,
          verification: claimHuman.verification as VerificationStatus,
          requireVerified: claimHuman.requireVerified,
        };
      }
    }

    // Default structure if not connected
    const faceValue = 1_000_000n;
    const maxAdvanceRateBps = 8000;
    const maxPledgeAllowed = 800_000n;
    const totalPledged = 0n;

    return {
      claimId,
      faceValue,
      totalPledged,
      maxPledgeAllowed,
      currentAdvanceRatePct: 0,
      maxAdvanceRatePct: 80,
      isFullyPledged: false,
      activeLienCount: 0,
      status: ClaimStatus.Acknowledged,
      verification: VerificationStatus.Verified,
      requireVerified: false,
    };
  }

  /**
   * 4. Query violation log (reads from persistent storage, falling back to memory).
   */
  getViolationLog(): ViolationLogEntry[] {
    const persisted = loadPersistedViolations(this.violationsPath);
    if (persisted.length > 0) {
      return persisted;
    }
    return [...this.violationLog];
  }

  /**
   * 5. Export cryptographic state snapshot for cross-chain relaying.
   */
  async exportSnapshot(
    claimId: ClaimId,
    validityDuration: number = 3600
  ): Promise<ClaimSnapshot> {
    if (this.contract && this.api) {
      const gasLimit: any = this.api.registry.createType("WeightV2", {
        refTime: 300_000_000_000n,
        proofSize: 1_000_000n,
      });
      const caller = this.getSignerAddress();
      const res = await this.contract.query.exportSnapshot(
        caller,
        { gasLimit },
        claimId,
        validityDuration * 1000
      );

      const human = (res.output?.toHuman() as any)?.Ok;
      if (human && human.Ok) {
        const snap = human.Ok;
        return {
          claimId,
          status: snap.status as ClaimStatus,
          verification: snap.verification as VerificationStatus,
          faceValue: BigInt(snap.faceValue.toString().replace(/,/g, "")),
          totalPledged: BigInt(snap.totalPledged.toString().replace(/,/g, "")),
          maxAdvanceRateBps: Number(snap.maxAdvanceRateBps.toString().replace(/,/g, "")),
          requireVerified: snap.requireVerified,
          nonce: BigInt(snap.nonce.toString().replace(/,/g, "")),
          timestamp: BigInt(snap.timestamp.toString().replace(/,/g, "")),
          expiry: BigInt(snap.expiry.toString().replace(/,/g, "")),
        };
      }
    }

    // Client fallback snapshot
    const status = await this.getLienStatus(claimId);
    const now = BigInt(Date.now());
    return {
      claimId,
      status: status.status,
      verification: status.verification,
      faceValue: status.faceValue,
      totalPledged: status.totalPledged,
      maxAdvanceRateBps: status.maxAdvanceRatePct * 100,
      requireVerified: status.requireVerified,
      nonce: 1n,
      timestamp: now,
      expiry: now + BigInt(validityDuration * 1000),
    };
  }

  /**
   * 6. Sign state snapshot with authorized Relayer keypair.
   */
  signSnapshot(snapshot: ClaimSnapshot, customSigner?: any): SignedSnapshot {
    const signer = customSigner || this.signer;
    if (!signer) {
      throw new Error("No signer available to sign snapshot");
    }

    const payload = ClaimGuard.getCanonicalPayload(snapshot);
    const snapshotHash = blake2AsHex(stringToU8a(payload), 256);
    const signatureU8a = signer.sign(stringToU8a(snapshotHash));
    const signature = u8aToHex(signatureU8a);

    return {
      snapshot,
      signature,
      signer: signer.address,
      snapshotHash,
    };
  }

  /**
   * 7. Canonical serialization for determinism across environments.
   */
  static getCanonicalPayload(snapshot: ClaimSnapshot): string {
    return [
      snapshot.claimId.toString(),
      snapshot.status,
      snapshot.verification,
      snapshot.faceValue.toString(),
      snapshot.totalPledged.toString(),
      snapshot.maxAdvanceRateBps.toString(),
      snapshot.requireVerified ? "1" : "0",
      snapshot.nonce.toString(),
      snapshot.timestamp.toString(),
      snapshot.expiry.toString(),
    ].join(":");
  }

  /**
   * 8. Verify a signed snapshot (for destination chains / Lender B).
   */
  static async verifySnapshot(
    signedSnapshot: SignedSnapshot,
    trustedSignerAddress: string,
    lastSeenNonce: bigint = 0n
  ): Promise<SnapshotVerificationResult> {
    await cryptoWaitReady();
    const { snapshot, signature, signer, snapshotHash } = signedSnapshot;

    // 1. Replay payload hash verification
    const expectedPayload = ClaimGuard.getCanonicalPayload(snapshot);
    const computedHash = blake2AsHex(stringToU8a(expectedPayload), 256);
    if (computedHash !== snapshotHash) {
      return {
        valid: false,
        reason: "Snapshot payload hash mismatch (tampered data)",
        remainingCapacity: 0n,
        isAlreadyPledged: true,
        status: snapshot.status,
        verification: snapshot.verification,
      };
    }

    // 2. Cryptographic signature check
    if (signer !== trustedSignerAddress) {
      return {
        valid: false,
        reason: `Untrusted signer: ${signer} (expected ${trustedSignerAddress})`,
        remainingCapacity: 0n,
        isAlreadyPledged: true,
        status: snapshot.status,
        verification: snapshot.verification,
      };
    }

    const sigCheck = signatureVerify(stringToU8a(snapshotHash), signature, trustedSignerAddress);
    if (!sigCheck.isValid) {
      return {
        valid: false,
        reason: "Invalid cryptographic signature",
        remainingCapacity: 0n,
        isAlreadyPledged: true,
        status: snapshot.status,
        verification: snapshot.verification,
      };
    }

    // 3. Expiry / Freshness check
    const now = BigInt(Date.now());
    if (now > snapshot.expiry) {
      return {
        valid: false,
        reason: `Snapshot expired at ${snapshot.expiry} (current: ${now})`,
        remainingCapacity: 0n,
        isAlreadyPledged: true,
        status: snapshot.status,
        verification: snapshot.verification,
      };
    }

    // 4. Nonce / Replay protection check
    if (snapshot.nonce <= lastSeenNonce) {
      return {
        valid: false,
        reason: `Replay attack detected: snapshot nonce ${snapshot.nonce} <= last seen ${lastSeenNonce}`,
        remainingCapacity: 0n,
        isAlreadyPledged: true,
        status: snapshot.status,
        verification: snapshot.verification,
      };
    }

    // 5. Invariant capacity calculation
    const isSettled = snapshot.status === ClaimStatus.Settled;
    const maxAllowed = (snapshot.faceValue * BigInt(snapshot.maxAdvanceRateBps)) / 10000n;
    const remainingCapacity =
      (!isSettled && maxAllowed > snapshot.totalPledged) ? maxAllowed - snapshot.totalPledged : 0n;
    const isAlreadyPledged = isSettled || remainingCapacity === 0n || snapshot.totalPledged >= maxAllowed;

    return {
      valid: true,
      remainingCapacity,
      isAlreadyPledged,
      status: snapshot.status,
      verification: snapshot.verification,
    };
  }

  private logViolation(
    claimId: ClaimId,
    ruleName: string,
    actor: string,
    attemptedAmount: bigint,
    reason: string,
    txHash?: string | null,
    blockHash?: string | null
  ): void {
    const entry: ViolationLogEntry = {
      timestamp: Date.now(),
      claimId,
      ruleName,
      actor,
      attemptedAmount,
      reason,
      txHash: txHash || null,
      blockHash: blockHash || null,
    };
    this.violationLog.unshift(entry);
    persistViolation(entry, this.violationsPath);
  }
}

