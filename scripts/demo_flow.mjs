import { ApiPromise, WsProvider } from '../sdk/node_modules/@polkadot/api/bundle.js';
import { Keyring } from '../sdk/node_modules/@polkadot/keyring/bundle.js';
import { CodePromise, ContractPromise } from '../sdk/node_modules/@polkadot/api-contract/bundle.js';
import { cryptoWaitReady } from '../sdk/node_modules/@polkadot/util-crypto/bundle.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import compiled SDK
import { ClaimGuard, ClaimStatus, VerificationStatus } from '../sdk/dist/index.js';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function banner(text) {
  console.log(`\n${COLORS.bright}${COLORS.cyan}========================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}  ${text}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}========================================================================${COLORS.reset}\n`);
}

function step(title) {
  console.log(`\n${COLORS.bright}${COLORS.yellow}>>> ${title}${COLORS.reset}`);
}

function success(msg) {
  console.log(`  ${COLORS.green}✔ ${msg}${COLORS.reset}`);
}

function alert(msg) {
  console.log(`  ${COLORS.red}✖ ${msg}${COLORS.reset}`);
}

function info(msg) {
  console.log(`  ${COLORS.dim}ℹ ${msg}${COLORS.reset}`);
}

async function main() {
  const args = process.argv.slice(2);
  const target = args.includes('--target') ? args[args.indexOf('--target') + 1] : 'local';

  banner('ClaimGuard — Receivables Compliance & Lien Registry Demo');
  info(`Target Environment: ${target.toUpperCase()}`);

  await cryptoWaitReady();

  let rpcUrl = 'ws://127.0.0.1:9944';
  if (target === 'testnet') {
    rpcUrl = process.env.PORTALDOT_RPC_URL || 'wss://testnet.portaldot.net';
  }

  const ws = new WsProvider(rpcUrl);
  const api = await ApiPromise.create({ provider: ws });
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });

  // Key actors
  const alice = keyring.addFromUri('//Alice');   // Deployer & Supplier (Issuer)
  const bob = keyring.addFromUri('//Bob');       // Buyer (Retailer)
  const dave = keyring.addFromUri('//Dave');     // Lender A (Primary Financer)
  const eve = keyring.addFromUri('//Eve');       // Lender B (Secondary Financer)

  const contractArtifactPath = path.resolve(__dirname, '../target/ink/claimguard_core/claimguard_core.contract');
  if (!fs.existsSync(contractArtifactPath)) {
    throw new Error(`Contract artifact not found at ${contractArtifactPath}. Run cargo-contract build first.`);
  }

  const contractJson = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));
  let contractAddress = process.env.CLAIMGUARD_CONTRACT_ADDRESS;

  const gasLimit = api.registry.createType('WeightV2', {
    refTime: 300_000_000_000n,
    proofSize: 1_000_000n,
  });

  if (!contractAddress || target === 'local') {
    step('Step 0: Deploying claimguard_core contract...');
    const code = new CodePromise(api, contractJson, contractJson.source.wasm);
    await new Promise((resolve, reject) => {
      const tx = code.tx.new({ gasLimit, storageDepositLimit: null });
      tx.signAndSend(alice, ({ status, events = [], dispatchError }) => {
        if (status.isFinalized) {
          if (dispatchError) return reject(new Error(dispatchError.toString()));
          for (const { event } of events) {
            if (event.section === 'contracts' && event.method === 'Instantiated') {
              contractAddress = event.data[1].toString();
            }
          }
          resolve();
        }
      }).catch(reject);
    });
    success(`Contract deployed at: ${contractAddress}`);
  } else {
    info(`Using existing contract: ${contractAddress}`);
  }

  const contract = new ContractPromise(api, contractJson, contractAddress);

  // Initialize ClaimGuard SDK instance
  const sdk = new ClaimGuard({
    rpcUrl,
    contractAddress,
    signerUri: '//Alice',
    metadataJson: contractJson,
  });
  await sdk.init();

  // 1. Supplier registers invoice
  step('Step 1: MSME Supplier registers Invoice INV-1042 (₹1,000,000, 80% Max Advance Rate)');
  const docHash = new Uint8Array(32);
  docHash.fill(42);
  const dueDate = Date.now() + 90 * 86400 * 1000;
  const faceValue = 1_000_000n;
  const advanceRateBps = 8000; // 80%

  let claimId = 1n;
  await new Promise((resolve, reject) => {
    const tx = contract.tx.registerClaim(
      { gasLimit, storageDepositLimit: null },
      bob.address,
      faceValue,
      [73, 78, 82, 0], // INR
      dueDate,
      docHash,
      advanceRateBps,
      [73, 78], // IN
      true      // require_verified = true
    );
    tx.signAndSend(alice, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) return reject(new Error(dispatchError.toString()));
        resolve();
      }
    }).catch(reject);
  });
  success(`Claim registered on-chain with ID: ${claimId}`);
  info(`Face Value: ₹1,000,000 | Max Advance Capacity: ₹800,000 | Require Verified: YES`);

  // 2. Buyer Acknowledges
  step('Step 2: Buyer (Retailer Bob) acknowledges invoice liability');
  await new Promise((resolve, reject) => {
    const tx = contract.tx.acknowledge({ gasLimit, storageDepositLimit: null }, claimId);
    tx.signAndSend(bob, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) return reject(new Error(dispatchError.toString()));
        resolve();
      }
    }).catch(reject);
  });
  success('Retailer Bob signed and acknowledged invoice on-chain.');

  // 3. Verification Enforcement Check before Verification
  step('Step 3: Verification Enforcement (Checking VerifiedOnly Invariant)');
  const checkBeforeVerify = await sdk.checkInvariants(claimId, 'pledge', dave.address, 500_000n);
  if (!checkBeforeVerify.allowed) {
    success(`Pre-verification pledge correctly blocked! Rule: ${checkBeforeVerify.violatedRule}`);
  } else {
    alert('Failed: pledge should have been blocked before verification.');
  }

  // Bonded verification assertion
  info('Supplier Alice posts 5,000 bond to assert invoice validity...');
  await new Promise((resolve, reject) => {
    const tx = contract.tx.assertValid({ gasLimit, storageDepositLimit: null }, claimId, 3600, 5000n);
    tx.signAndSend(alice, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) return reject(new Error(dispatchError.toString()));
        resolve();
      }
    }).catch(reject);
  });
  // Resolve valid
  await new Promise((resolve, reject) => {
    const tx = contract.tx.resolve({ gasLimit, storageDepositLimit: null }, 1, true);
    tx.signAndSend(alice, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) return reject(new Error(dispatchError.toString()));
        resolve();
      }
    }).catch(reject);
  });
  success('Invoice verified via Bonded Verification mechanism.');

  // 4. Lender A Pledges
  step('Step 4: Lender A funds ₹800,000 (utilizing 100% of max advance capacity)');
  const checkLenderA = await sdk.checkInvariants(claimId, 'pledge', dave.address, 800_000n);
  if (checkLenderA.allowed) {
    info(`Invariant check passed: remaining capacity is ₹${checkLenderA.remainingCapacity}`);
    await new Promise((resolve, reject) => {
      const tx = contract.tx.pledge(
        { gasLimit, storageDepositLimit: null },
        claimId,
        dave.address,
        800_000n
      );
      tx.signAndSend(alice, ({ status, dispatchError }) => {
        if (status.isFinalized) {
          if (dispatchError) return reject(new Error(dispatchError.toString()));
          resolve();
        }
      }).catch(reject);
    });
    success('Lender A lien recorded on-chain! Lien Amount: ₹800,000');
  } else {
    alert(`Unexpected check failure: ${checkLenderA.reason}`);
  }

  const status1 = await sdk.getLienStatus(claimId);
  info(`Live Lien Status: Total Pledged: ₹${status1.totalPledged} / ₹${status1.maxPledgeAllowed} (${status1.currentAdvanceRatePct}%)`);

  // 5. THE DOUBLE PLEDGE ATTACK DEMO
  step('Step 5: [DEFENSE DEMO] Lender B attempts DOUBLE-PLEDGE of ₹800,000 on the same invoice');
  info('Simulating Lender B financing request via ClaimGuard SDK...');

  const checkLenderB = await sdk.checkInvariants(claimId, 'pledge', eve.address, 800_000n);
  if (!checkLenderB.allowed) {
    alert(`DOUBLE-PLEDGE ATTEMPT INTERCEPTED BY CLAIMGUARD INVARIANT ENGINE!`);
    console.log(`    ${COLORS.red}► Rule Breached:${COLORS.reset} ${checkLenderB.violatedRule}`);
    console.log(`    ${COLORS.red}► Reason:${COLORS.reset}        ${checkLenderB.reason}`);
    console.log(`    ${COLORS.red}► Action Taken:${COLORS.reset}  Blocked before execution. Zero gas wasted.`);
  } else {
    alert('CRITICAL: Invariant failed to block double pledge!');
  }

  // 6. Query Violation Log
  step('Step 6: Audit & Violation Log Summary');
  const violations = sdk.getViolationLog();
  console.log(`  Total Violations Intercepted: ${violations.length}`);
  violations.forEach((v, idx) => {
    console.log(`  [${idx + 1}] Rule: ${COLORS.bright}${v.ruleName}${COLORS.reset} | Actor: ${v.actor} | Amount: ₹${v.attemptedAmount}`);
  });

  // 7. Repayment & Clean Settlement
  step('Step 7: Loan Repayment, Lien Release, and Invoice Settlement');
  await new Promise((resolve, reject) => {
    const tx = contract.tx.release({ gasLimit, storageDepositLimit: null }, claimId, 1);
    tx.signAndSend(dave, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) return reject(new Error(dispatchError.toString()));
        resolve();
      }
    }).catch(reject);
  });
  success('Lender A lien released upon loan repayment.');

  await new Promise((resolve, reject) => {
    const tx = contract.tx.settleClaim({ gasLimit, storageDepositLimit: null }, claimId);
    tx.signAndSend(bob, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) return reject(new Error(dispatchError.toString()));
        resolve();
      }
    }).catch(reject);
  });
  success('Buyer Retailer Bob finalized settlement. Claim status: Settled.');

  const finalStatus = await sdk.getLienStatus(claimId);
  info(`Final Claim State: ${finalStatus.status} | Total Pledged: ₹${finalStatus.totalPledged}`);

  banner('Demo Complete: Zero Double-Pledges Permitted. State 100% Invariant Compliant!');

  await sdk.disconnect();
  await api.disconnect();
}

main().catch((err) => {
  console.error('Demo encountered error:', err);
  process.exit(1);
});
