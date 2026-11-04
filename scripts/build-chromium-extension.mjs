import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'browser-extension');
const distDir = path.join(root, 'dist');
const packageDir = path.join(distDir, 'arb-agent-chromium');

function stripEsmExports(source) {
  return source.replace(/^export\s+/gm, '');
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function listFiles(directory, prefix = '') {
  const output = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const relative = prefix ? prefix + '/' + entry.name : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await listFiles(absolute, relative));
    else if (entry.isFile()) output.push({ absolute, relative });
  }
  return output;
}

async function writeZip(directory, destination) {
  const files = await listFiles(directory);
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const file of files) {
    const name = Buffer.from(file.relative.split(path.sep).join('/'), 'utf8');
    const body = await readFile(file.absolute);
    const checksum = crc32(body);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x0021, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x0021, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);

    localOffset += local.length + name.length + body.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);

  await writeFile(destination, Buffer.concat([...localParts, centralDirectory, end]));
}

await rm(distDir, { recursive: true, force: true });
await mkdir(packageDir, { recursive: true });

for (const name of ['manifest.json', 'popup.html', 'popup.css', 'popup.js']) {
  const content = await readFile(path.join(sourceDir, name));
  await writeFile(path.join(packageDir, name), content);
}

const cip30Source = await readFile(path.join(root, 'wallet-companion/cip30-read-only.js'), 'utf8');
const minswapSource = await readFile(path.join(root, 'wallet-companion/minswap-v2-position-link.js'), 'utf8');
const decoderStart = minswapSource.indexOf('class CborMap');
const decoderEnd = minswapSource.indexOf('function requireRecord', decoderStart);
if (decoderStart < 0 || decoderEnd < 0) {
  throw new Error('Could not isolate the existing Cardano Value CBOR decoder.');
}

const decoderSource = stripEsmExports(minswapSource.slice(decoderStart, decoderEnd));
const bridgeRuntime = await readFile(path.join(sourceDir, 'page-bridge.runtime.js'), 'utf8');
const bundle = [
  '(function arbAgentWalletCompanionBundle() {',
  "  'use strict';",
  '  const walletCore = (() => {',
  stripEsmExports(cip30Source),
  '    return { connectReadOnlyWallet, discoverCip30Wallets };',
  '  })();',
  '  const walletDecoder = (() => {',
  decoderSource,
  '    return { decodeCardanoValueCbor };',
  '  })();',
  bridgeRuntime,
  '})();',
  '',
].join('\n');

await writeFile(path.join(packageDir, 'page-bridge.js'), bundle, 'utf8');
await writeFile(path.join(packageDir, 'INSTALL.txt'), [
  'ARB AGENT — CHROMIUM WALLET COMPANION',
  '',
  'LOCAL PILOT INSTALLATION',
  '1. Extract this ZIP into a permanent folder.',
  '2. Open chrome://extensions in Chrome or edge://extensions in Edge.',
  '3. Enable Developer mode.',
  '4. Select Load unpacked and choose the extracted folder containing manifest.json.',
  '5. Pin Arb Agent to the browser toolbar.',
  '',
  'USAGE',
  'Open a trusted web page in the same browser where your Cardano CIP-30 wallet is installed.',
  'Click the Arb Agent toolbar icon, select the wallet, then select Connect and read.',
  'The wallet controls access. Arb requests only getNetworkId, getChangeAddress, getBalance and getUtxos.',
  '',
  'SECURITY SCOPE',
  'This pilot injects the read-only bridge into the active page because CIP-30 is a page-injected API.',
  'The wallet connection is therefore associated with the active page origin. Use only a trusted origin.',
  'The extension requests activeTab and scripting only; it has no persistent host permissions.',
  'It does not store wallet data, credentials, keys, signatures or transactions.',
  'The extension is a local pilot and is not yet published or signed in the Chrome Web Store / Edge Add-ons.',
  '',
].join('\n'), 'utf8');

await writeZip(packageDir, path.join(distDir, 'arb-agent-chromium.zip'));
process.stdout.write('Built ' + packageDir + '\n');
process.stdout.write('Built ' + path.join(distDir, 'arb-agent-chromium.zip') + '\n');
