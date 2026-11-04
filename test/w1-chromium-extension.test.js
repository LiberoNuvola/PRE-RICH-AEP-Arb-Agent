import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Chromium extension is a Manifest V3 active-tab companion with no persistent host access', async () => {
  const [manifestText, html, popup, runtime, install] = await Promise.all([
    read('../dist/arb-agent-chromium/manifest.json'),
    read('../dist/arb-agent-chromium/popup.html'),
    read('../dist/arb-agent-chromium/popup.js'),
    read('../browser-extension/page-bridge.runtime.js'),
    read('../dist/arb-agent-chromium/INSTALL.txt'),
  ]);
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'scripting']);
  assert.equal(Object.hasOwn(manifest, 'host_permissions'), false);
  assert.equal(manifest.action.default_popup, 'popup.html');
  assert.match(html, /popup\.js/);
  assert.match(popup, /chrome\.scripting\.executeScript/);
  assert.match(popup, /world: 'MAIN'/);
  assert.match(popup, /page-bridge\.js/);
  assert.match(runtime, /connectReadOnlyWallet/);
  assert.match(runtime, /discoverCip30Wallets\(window\.cardano\)/);
  assert.match(runtime, /session\.close\(\)/);
  assert.match(install, /activeTab/);
  assert.doesNotMatch(popup, /chrome\.storage|fetch\s*\(|XMLHttpRequest|WebSocket/);
});

test('built page bridge reuses the existing W1 port and Cardano Value decoder without adding actuation', async () => {
  const bridge = await read('../dist/arb-agent-chromium/page-bridge.js');
  for (const operation of ['getNetworkId', 'getChangeAddress', 'getBalance', 'getUtxos']) {
    assert.ok(bridge.includes(operation), 'missing W1 read operation: ' + operation);
  }
  assert.match(bridge, /connectReadOnlyWallet/);
  assert.match(bridge, /decodeCardanoValueCbor/);
  for (const forbidden of ['signTx', 'signData', 'submitTx', 'signTxs', 'submitTxs']) {
    assert.equal(bridge.includes(forbidden), false, 'forbidden wallet capability present: ' + forbidden);
  }
  assert.doesNotMatch(bridge, /\bfetch\s*\(|\bWebSocket\b|XMLHttpRequest|https?:\/\//);
});

test('Chromium package ZIP is generated and non-empty', async () => {
  const info = await stat(new URL('../dist/arb-agent-chromium.zip', import.meta.url));
  assert.ok(info.size > 1000);
});
