import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ClaimGuard, ClaimStatus, VerificationStatus } from '../sdk/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

async function main() {
  console.log(`\n${COLORS.bright}${COLORS.magenta}========================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.magenta}  Lender B: Cross-Chain Invariant Verifier & Double-Pledge Defense${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.magenta}========================================================================${COLORS.reset}\n`);

  await cryptoWaitReady();

  // Trusted Relayer Public Key configured in Lender B's protocol
  const TRUSTED_RELAYER_ADDRESS = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  console.log(`  ${COLORS.dim}Destination Chain:${COLORS.reset}      Secondary DeFi Lending Pool (Cross-Chain Consumer)`);
  console.log(`  ${COLORS.dim}Trusted Relayer Key:${COLORS.reset}    ${TRUSTED_RELAYER_ADDRESS}`);

  // In-memory nonce store for replay protection
  const lastSeenNonces = new Map();

  // -------------------------------------------------------------------------
  // SCENARIO 1: Real-time Double-Pledge Attack Defense
  // -------------------------------------------------------------------------
  console.log(`\n${COLORS.bright}${COLORS.yellow}>>> SCENARIO 1: Borrower Attempts Double-Financing on Secondary Chain${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Invoice INV-1042 was already pledged for ₹800,000 to Lender A on Portaldot V3.${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Fraudulent borrower presents signed snapshot to Lender B requesting ₹800,000 loan...${COLORS.reset}\n`);

  // Simulated active snapshot signed by the Relayer where totalPledged is ₹800,000 (100% capacity)
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
  const relayerKeypair = keyring.addFromUri('//Alice');

  const now = BigInt(Date.now());
  const activePledgedSnapshot = {
    claimId: 1042n,
    status: ClaimStatus.Pledged,
    verification: VerificationStatus.Verified,
    faceValue: 1_000_000n,
    totalPledged: 800_000n, // 100% of 80% advance rate used!
    maxAdvanceRateBps: 8000,
    requireVerified: true,
    nonce: 5n,
    timestamp: now,
    expiry: now + 3600_000n, // valid for 1 hour
  };

  const signedPledgedSnapshot = new ClaimGuard({
    rpcUrl: 'ws://127.0.0.1:9944',
    contractAddress: '',
  }).signSnapshot(activePledgedSnapshot, relayerKeypair);

  console.log(`  ► Proposed Collateral:   Invoice INV-1042 (Claim #1042)`);
  console.log(`  ► Requested Loan Amount: ₹800,000`);
  console.log(`  ► Attestation Payload:   Signed Portaldot V3 Snapshot (Nonce: ${activePledgedSnapshot.nonce})`);

  console.log(`\n  ${COLORS.dim}Lender B verifying Relayer cryptographic signature & freshness...${COLORS.reset}`);
  const result1 = await ClaimGuard.verifySnapshot(
    signedPledgedSnapshot,
    TRUSTED_RELAYER_ADDRESS,
    lastSeenNonces.get(activePledgedSnapshot.claimId) || 0n
  );

  if (!result1.valid) {
    console.log(`  ${COLORS.red}✖ Verification Failed:${COLORS.reset} ${result1.reason}`);
    process.exit(1);
  }

  console.log(`  ${COLORS.green}✔ Cryptographic verification PASSED!${COLORS.reset}`);
  console.log(`    ► Relayer Signature:  VALID (Authorized Relayer: ${TRUSTED_RELAYER_ADDRESS})`);
  console.log(`    ► Freshness:          FRESH (Expires in ${(Number(activePledgedSnapshot.expiry - now) / 60000).toFixed(1)} mins)`);
  console.log(`    ► Replay Check:       VALID (Nonce ${activePledgedSnapshot.nonce} > last seen 0)`);
  console.log(`    ► On-Chain State:     ${result1.status} | Verification: ${result1.verification}`);

  console.log(`\n  ${COLORS.dim}Checking Invariant Capacity...${COLORS.reset}`);
  console.log(`    ► Face Value:         ₹${activePledgedSnapshot.faceValue.toString()}`);
  console.log(`    ► Max Advance Rate:   ${activePledgedSnapshot.maxAdvanceRateBps / 100}% (Max ₹${(activePledgedSnapshot.faceValue * 80n / 100n).toString()})`);
  console.log(`    ► Pledged on Origin:  ₹${activePledgedSnapshot.totalPledged.toString()}`);
  console.log(`    ► Remaining Capacity: ₹${result1.remainingCapacity.toString()}`);

  if (result1.isAlreadyPledged || result1.remainingCapacity < 800_000n) {
    console.log(`\n  ${COLORS.bright}${COLORS.red}========================================================================${COLORS.reset}`);
    console.log(`  ${COLORS.bright}${COLORS.red}  [DOUBLE-PLEDGE DETECTED & BLOCKED BY LENDER B!]${COLORS.reset}`);
    console.log(`  ${COLORS.bright}${COLORS.red}========================================================================${COLORS.reset}`);
    console.log(`  ${COLORS.red}✖ LOAN REQUEST REJECTED: Invoice is already pledged on Portaldot V3!${COLORS.reset}`);
    console.log(`  ${COLORS.dim}► Reason: Zero remaining capacity (attempted ₹800,000, available: ₹${result1.remainingCapacity}).${COLORS.reset}`);
    console.log(`  ${COLORS.green}✔ Result: Zero bad debt incurred by Lender B. Invariant traveled with asset!${COLORS.reset}\n`);
  } else {
    console.log(`  ${COLORS.green}✔ Loan Approved!${COLORS.reset}`);
  }

  // Update nonce store for replay tracking
  lastSeenNonces.set(activePledgedSnapshot.claimId, activePledgedSnapshot.nonce);

  // -------------------------------------------------------------------------
  // SCENARIO 2: Tamper Attack Defense
  // -------------------------------------------------------------------------
  console.log(`${COLORS.bright}${COLORS.yellow}>>> SCENARIO 2: Tamper Attack Defense${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Attacker tampers with snapshot payload, changing totalPledged from ₹800,000 to ₹0...${COLORS.reset}`);

  const tamperedSnapshot = {
    ...signedPledgedSnapshot,
    snapshot: {
      ...signedPledgedSnapshot.snapshot,
      totalPledged: 0n, // Tampered value!
    },
  };

  const tamperResult = await ClaimGuard.verifySnapshot(
    tamperedSnapshot,
    TRUSTED_RELAYER_ADDRESS,
    0n
  );

  if (!tamperResult.valid) {
    console.log(`  ${COLORS.green}✔ Tamper Attack Intercepted!${COLORS.reset}`);
    console.log(`    ► Block Reason: ${tamperResult.reason}`);
    console.log(`    ► Result: Tampered snapshot rejected immediately.\n`);
  } else {
    console.error(`  ${COLORS.red}✖ Security Failure: Tampered snapshot was accepted!${COLORS.reset}`);
  }

  // -------------------------------------------------------------------------
  // SCENARIO 3: Replay Attack Defense
  // -------------------------------------------------------------------------
  console.log(`${COLORS.bright}${COLORS.yellow}>>> SCENARIO 3: Replay Attack Defense${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Attacker replays the same snapshot with nonce ${activePledgedSnapshot.nonce} after loan release...${COLORS.reset}`);

  const replayResult = await ClaimGuard.verifySnapshot(
    signedPledgedSnapshot,
    TRUSTED_RELAYER_ADDRESS,
    activePledgedSnapshot.nonce // Replaying an already-seen nonce!
  );

  if (!replayResult.valid) {
    console.log(`  ${COLORS.green}✔ Replay Attack Intercepted!${COLORS.reset}`);
    console.log(`    ► Block Reason: ${replayResult.reason}`);
    console.log(`    ► Result: Replay attack rejected by nonce gatekeeper.\n`);
  } else {
    console.error(`  ${COLORS.red}✖ Security Failure: Replayed snapshot was accepted!${COLORS.reset}`);
  }

  console.log(`${COLORS.bright}${COLORS.green}========================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.green}  Block 11 Verified: Signed Snapshot & Cross-Chain Gateway Complete!${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.green}========================================================================${COLORS.reset}\n`);
}

main().catch((err) => {
  console.error('Lender B Verifier error:', err);
  process.exit(1);
});
