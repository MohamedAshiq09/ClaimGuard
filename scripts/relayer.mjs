import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ClaimGuard } from '../sdk/dist/index.js';

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
  console.log(`\n${COLORS.bright}${COLORS.cyan}========================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}  ClaimGuard Cross-Chain Relayer Service${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}========================================================================${COLORS.reset}\n`);

  await cryptoWaitReady();

  const rpcUrl = process.env.PORTALDOT_RPC_URL || 'ws://127.0.0.1:9944';
  const contractArtifactPath = path.resolve(__dirname, '../target/ink/claimguard_core/claimguard_core.contract');
  const contractJson = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));

  // Contract address from environment or local deployment
  const contractAddress = process.env.CLAIMGUARD_CONTRACT_ADDRESS || '5CZFQkVULD8zgSgfL6siPw95U6NG4UkbsLjajtGvNpE5fh93';

  console.log(`  ${COLORS.dim}Connecting to Portaldot node:${COLORS.reset} ${rpcUrl}`);
  console.log(`  ${COLORS.dim}Core Contract:${COLORS.reset} ${contractAddress}`);

  // Authorized Relayer signer
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
  const relayerSigner = keyring.addFromUri('//Alice');
  console.log(`  ${COLORS.dim}Authorized Relayer Public Key:${COLORS.reset} ${relayerSigner.address}\n`);

  const sdk = new ClaimGuard({
    rpcUrl,
    contractAddress,
    signerUri: '//Alice',
    metadataJson: contractJson,
  });
  await sdk.init();

  const claimId = 1n;
  console.log(`${COLORS.yellow}>>> 1. Fetching canonical state snapshot for Claim #${claimId} from Portaldot...${COLORS.reset}`);
  const snapshot = await sdk.exportSnapshot(claimId, 7200); // 2 hours validity

  console.log(`  ${COLORS.green}✔ Authoritative on-chain state retrieved:${COLORS.reset}`);
  console.log(`    ► Claim ID:              ${snapshot.claimId}`);
  console.log(`    ► Status:                ${snapshot.status}`);
  console.log(`    ► Verification:          ${snapshot.verification}`);
  console.log(`    ► Face Value:            ₹${snapshot.faceValue.toString()}`);
  console.log(`    ► Total Pledged:         ₹${snapshot.totalPledged.toString()}`);
  console.log(`    ► Max Advance Rate:      ${snapshot.maxAdvanceRateBps / 100}%`);
  console.log(`    ► Nonce:                 ${snapshot.nonce}`);
  console.log(`    ► Snapshot Expiry:       ${new Date(Number(snapshot.expiry)).toISOString()}`);

  console.log(`\n${COLORS.yellow}>>> 2. Cryptographically signing snapshot with Relayer key...${COLORS.reset}`);
  const signedSnapshot = sdk.signSnapshot(snapshot, relayerSigner);

  console.log(`  ${COLORS.green}✔ Snapshot successfully signed!${COLORS.reset}`);
  console.log(`    ► Payload Hash:          ${signedSnapshot.snapshotHash}`);
  console.log(`    ► Relayer Signer:        ${signedSnapshot.signer}`);
  console.log(`    ► Cryptographic Sig:     ${signedSnapshot.signature.slice(0, 32)}...${signedSnapshot.signature.slice(-16)}`);

  // Write out signed snapshot package for destination chains & lenders
  const outputPath = path.resolve(__dirname, 'signed_snapshot_claim_1.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      signedSnapshot,
      (key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2
    )
  );

  console.log(`\n  ${COLORS.bright}${COLORS.green}✔ Attestation package exported to:${COLORS.reset} ${outputPath}\n`);

  await sdk.disconnect();
}

main().catch((err) => {
  console.error('Relayer error:', err);
  process.exit(1);
});
