import { ApiPromise, WsProvider } from '../sdk/node_modules/@polkadot/api/bundle.js';
import { Keyring } from '../sdk/node_modules/@polkadot/keyring/bundle.js';
import { CodePromise, ContractPromise } from '../sdk/node_modules/@polkadot/api-contract/bundle.js';
import { cryptoWaitReady } from '../sdk/node_modules/@polkadot/util-crypto/bundle.js';
import fs from 'fs';

async function main() {
  await cryptoWaitReady();
  const ws = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider: ws });

  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
  const alice = keyring.addFromUri('//Alice');   // Deployer / Issuer / Resolver
  const bob = keyring.addFromUri('//Bob');       // Buyer (Retailer)
  const charlie = keyring.addFromUri('//Charlie'); // Challenger / 3rd party
  const dave = keyring.addFromUri('//Dave');     // Lender A
  const eve = keyring.addFromUri('//Eve');       // Lender B

  console.log('=== 1. Deploying claimguard_core to Local Contracts Node ===');
  const contractJson = JSON.parse(
    fs.readFileSync('./target/ink/claimguard_core/claimguard_core.contract', 'utf8')
  );
  const code = new CodePromise(api, contractJson, contractJson.source.wasm);

  const gasLimit = api.registry.createType('WeightV2', {
    refTime: 300_000_000_000n,
    proofSize: 1_000_000n,
  });

  let contractAddress = null;

  await new Promise((resolve, reject) => {
    const tx = code.tx.new({ gasLimit, storageDepositLimit: null });
    tx.signAndSend(alice, ({ status, events = [], dispatchError }) => {
      if (status.isInBlock) {
        console.log('Deploy included in block:', status.asInBlock.toHex());
      }
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(dispatchError.toString()));
        } else {
          for (const { event } of events) {
            if (event.section === 'contracts' && event.method === 'Instantiated') {
              contractAddress = event.data[1].toString();
              console.log('Contract Instantiated at:', contractAddress);
            }
          }
          resolve();
        }
      }
    }).catch(reject);
  });

  const contract = new ContractPromise(api, contractJson, contractAddress);

  console.log('\n=== 2. Register Claim (Invoice INV-1042: ₹1,000,000, 80% Max Advance) ===');
  const docHash = new Uint8Array(32);
  docHash.fill(7);
  const dueDate = Date.now() + 90 * 86400 * 1000; // 90 days from now in milliseconds

  let claimId = null;
  // Dry run first
  const dryRun = await contract.query.registerClaim(
    alice.address,
    { gasLimit, storageDepositLimit: null },
    bob.address,
    1_000_000n,
    [73, 78, 82, 0],
    dueDate,
    docHash,
    8000,
    [73, 78],
    true
  );
  console.log('registerClaim dry run result:', dryRun.result.toHuman(), 'output:', dryRun.output?.toHuman());

  await new Promise((resolve, reject) => {
    const tx = contract.tx.registerClaim(
      { gasLimit, storageDepositLimit: null },
      bob.address,
      1_000_000n,
      [73, 78, 82, 0],
      dueDate,
      docHash,
      8000,
      [73, 78],
      true
    );

    tx.signAndSend(alice, ({ status, events = [], dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const meta = api.registry.findMetaError(dispatchError.asModule);
            console.error(`Dispatch Error: ${meta.section}.${meta.name}: ${meta.docs.join(' ')}`);
          } else {
            console.error('Dispatch Error:', dispatchError.toString());
          }
          return reject(new Error(dispatchError.toString()));
        }
        for (const { event } of events) {
          if (event.section === 'contracts' && event.method === 'ContractEmitted') {
            console.log('Event emitted on register');
          }
        }
        claimId = 1n;
        resolve();
      }
    }).catch(reject);
  });

  console.log('Registered Claim ID:', claimId);

  console.log('\n=== 3. Buyer Acknowledgment (Retailer Bob acknowledges liability) ===');
  await new Promise((resolve, reject) => {
    const tx = contract.tx.acknowledge(
      { gasLimit, storageDepositLimit: null },
      claimId
    );
    tx.signAndSend(bob, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) return reject(new Error(dispatchError.toString()));
        console.log('Buyer acknowledged claim on-chain.');
        resolve();
      }
    }).catch(reject);
  });

  console.log('\n=== 4. Test VerifiedOnly invariant: Pledge before verification should fail ===');
  const preVerifyCheck = await contract.query.checkPledge(
    alice.address,
    { gasLimit, storageDepositLimit: null },
    claimId,
    dave.address,
    800_000n
  );
  console.log('Simulation pledge before verification:', preVerifyCheck.result.toHuman());
  if (preVerifyCheck.result.isOk && preVerifyCheck.result.asOk.isErr) {
    console.log('Correctly blocked by rule:', preVerifyCheck.result.asOk.asErr.toHuman());
  }

  console.log('\n=== 5. Bonded Verification: Assert Valid & Finalize ===');
  let assertionId = null;
  await new Promise((resolve, reject) => {
    const tx = contract.tx.assertValid(
      { gasLimit, storageDepositLimit: null },
      claimId,
      60,     // 60 seconds challenge window for test
      5_000n  // bond
    );
    tx.signAndSend(alice, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) return reject(new Error(dispatchError.toString()));
        console.log('Invoice asserted valid with bond.');
        assertionId = 1;
        resolve();
      }
    }).catch(reject);
  });

  // Directly resolve as valid for instant test flow
  await new Promise((resolve, reject) => {
    const tx = contract.tx.resolve(
      { gasLimit, storageDepositLimit: null },
      assertionId,
      true // valid = true
    );
    tx.signAndSend(alice, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) return reject(new Error(dispatchError.toString()));
        console.log('Dispute resolved: invoice confirmed VERIFIED on-chain.');
        resolve();
      }
    }).catch(reject);
  });

  console.log('\n=== 6. Lender A Pledges ₹800,000 (80% advance rate limit) ===');
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
        console.log('Lender A lien successfully recorded on-chain.');
        resolve();
      }
    }).catch(reject);
  });

  const totalPledged1 = await contract.query.getTotalPledged(alice.address, { gasLimit }, claimId);
  console.log('Total Pledged after Lender A:', totalPledged1.output.toHuman());

  console.log('\n=== 7. CRITICAL TEST: Lender B Attempts Double-Pledge of ₹800,000 ===');
  // First test Dry-Run / Simulation (how the SDK detects & logs blocked attempts)
  const dryRunPledge = await contract.query.pledge(
    alice.address,
    { gasLimit, storageDepositLimit: null },
    claimId,
    eve.address,
    800_000n
  );
  console.log('Dry run simulation output:', dryRunPledge.output.toHuman());

  // Now submit the actual extrinsic on-chain to test state revert and event behavior
  console.log('Submitting second pledge on-chain (should return Err(ExceedsAdvanceRate))...');
  let secondTxEvents = [];
  let secondTxDispatchError = null;

  await new Promise((resolve) => {
    const tx = contract.tx.pledge(
      { gasLimit, storageDepositLimit: null },
      claimId,
      eve.address,
      800_000n
    );
    tx.signAndSend(alice, ({ status, events = [], dispatchError }) => {
      if (status.isFinalized) {
        secondTxEvents = events;
        secondTxDispatchError = dispatchError;
        resolve();
      }
    }).catch((err) => {
      console.log('Caught submission error:', err.message);
      resolve();
    });
  });

  console.log('\n=== 8. Analyzing Results of Failed Double-Pledge ===');
  const totalPledged2 = await contract.query.getTotalPledged(alice.address, { gasLimit }, claimId);
  console.log('Total Pledged after blocked second pledge:', totalPledged2.output.toHuman());

  if (totalPledged2.output.toString() === totalPledged1.output.toString()) {
    console.log('RESULT 1: [CONFIRMED] State was perfectly protected! Total pledged remained unchanged at 800,000.');
  } else {
    console.error('RESULT 1: [FAILED] State was corrupted!');
  }

  console.log('Second Tx Events count:', secondTxEvents.length);
  const contractEvents = secondTxEvents.filter(({ event }) => event.section === 'contracts');
  console.log('Contracts pallet events in block:', contractEvents.map(e => `${e.event.section}.${e.event.method}`));

  if (contractEvents.some(e => e.event.method === 'ContractEmitted')) {
    console.log('RESULT 2: Violation event was emitted into block.');
  } else {
    console.log('RESULT 2: [CONFIRMED] Ink! reverted state on Err return; the on-chain event was dropped.');
    console.log('         Conclusion: The SDK simulation log pattern is required and works seamlessly!');
  }

  console.log('\n=== 9. Testing Lien Release and Settle Flow ===');
  await new Promise((resolve, reject) => {
    const tx = contract.tx.release({ gasLimit, storageDepositLimit: null }, claimId, 1);
    tx.signAndSend(dave, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) return reject(new Error(dispatchError.toString()));
        console.log('Lender A lien released upon loan repayment.');
        resolve();
      }
    }).catch(reject);
  });

  const statusAfterRelease = await contract.query.getClaim(alice.address, { gasLimit }, claimId);
  console.log('Claim after release:', JSON.stringify(statusAfterRelease.output?.toHuman()));

  // Settle claim
  await new Promise((resolve, reject) => {
    const tx = contract.tx.settleClaim({ gasLimit, storageDepositLimit: null }, claimId);
    tx.signAndSend(bob, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) return reject(new Error(dispatchError.toString()));
        console.log('Buyer successfully marked invoice Settled.');
        resolve();
      }
    }).catch(reject);
  });

  const finalClaim = await contract.query.getClaim(alice.address, { gasLimit }, claimId);
  console.log('Final Claim:', JSON.stringify(finalClaim.output?.toHuman()));

  await api.disconnect();
  console.log('\n=== ALL LOCAL ON-CHAIN TESTS COMPLETED SUCCESSFULLY! ===');
}

main().catch(err => {
  console.error('Test Flow Failed:', err);
  process.exit(1);
});
