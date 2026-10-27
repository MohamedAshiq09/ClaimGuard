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
  console.log('Deployer Balance:', balance.free.toString());

  const contractJson = JSON.parse(
    fs.readFileSync('./scratch_flipper/target/ink/scratch_flipper.contract', 'utf8')
  );
  const wasm = contractJson.source.wasm;

  console.log('Wasm code length in bytes:', wasm.length / 2 - 1);

  const code = new CodePromise(api, contractJson, wasm);

  // Gas limit and storage deposit limit
  // Dry run constructor `new(init_value: bool)`
  const gasLimit = api.registry.createType('WeightV2', {
    refTime: 300_000_000_000n,
    proofSize: 1_000_000n,
  });

  console.log('Sending instantiate tx...');
  const tx = code.tx.new({ gasLimit, storageDepositLimit: null }, true);

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
          // Find instantiated event
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
  console.error('Deployment Failed:', err);
  process.exit(1);
});
