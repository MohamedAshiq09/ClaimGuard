import { ApiPromise, WsProvider } from '../sdk/node_modules/@polkadot/api/bundle.js';
import { Keyring } from '../sdk/node_modules/@polkadot/keyring/bundle.js';
import { CodePromise } from '../sdk/node_modules/@polkadot/api-contract/bundle.js';
import { cryptoWaitReady } from '../sdk/node_modules/@polkadot/util-crypto/bundle.js';
import fs from 'fs';

async function main() {
  await cryptoWaitReady();
  const wsProvider = new WsProvider('wss://test-node-v3.portaldot.dev');
  const api = await ApiPromise.create({ provider: wsProvider });

  const seed = 'acid flash embody april cotton beauty love ramp excuse void potato teach';
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
  const deployer = keyring.addFromUri(seed);

  console.log('Deployer Address:', deployer.address);
  const { data: balance } = await api.query.system.account(deployer.address);
  console.log('Deployer Balance Free:', balance.free.toHuman(), '(', balance.free.toString(), ')');

  const contractJson = JSON.parse(
    fs.readFileSync('./target/ink/claimguard_core/claimguard_core.contract', 'utf8')
  );
  const wasm = contractJson.source.wasm;
  console.log('Wasm code length in bytes:', wasm.length / 2 - 1);

  const code = new CodePromise(api, contractJson, wasm);

  const gasLimit = api.registry.createType('WeightV2', {
    refTime: 300_000_000_000n,
    proofSize: 1_000_000n,
  });

  console.log('Dry-running instantiate...');
  try {
    const { gasRequired, storageDeposit, result } = await code.query.new(
      deployer.address,
      { gasLimit, storageDepositLimit: null }
    );
    console.log('Dry-run result:', result.toHuman());
    console.log('Gas required:', gasRequired.toHuman());
    console.log('Storage deposit:', storageDeposit.toHuman());
  } catch (err) {
    console.error('Dry-run query error:', err.message);
  }

  console.log('Sending instantiate transaction...');
  const tx = code.tx.new({ gasLimit, storageDepositLimit: null });

  await new Promise((resolve, reject) => {
    tx.signAndSend(deployer, ({ status, events = [], dispatchError }) => {
      console.log('Status:', status.type);
      if (status.isInBlock) {
        console.log('Included in block:', status.asInBlock.toHex());
      }
      if (status.isFinalized) {
        console.log('Finalized in block:', status.asFinalized.toHex());
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            console.error(`Dispatch Error: ${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`);
            reject(new Error(`${decoded.section}.${decoded.name}`));
          } else {
            console.error('Dispatch Error:', dispatchError.toString());
            reject(new Error(dispatchError.toString()));
          }
        } else {
          for (const { event } of events) {
            if (event.section === 'contracts' && event.method === 'Instantiated') {
              console.log('Contract Address:', event.data[1].toString());
            }
          }
          resolve();
        }
      }
    }).catch(reject);
  });

  await api.disconnect();
}

main().catch(err => {
  console.error('Core Deployment Error:', err.message);
  process.exit(1);
});
