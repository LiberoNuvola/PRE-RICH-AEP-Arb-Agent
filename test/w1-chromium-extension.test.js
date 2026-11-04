import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
test('Chromium extension is a no-permission launcher for the Arb dApp URL',async()=>{
 const [m,h,i]=await Promise.all([read('../dist/arb-agent-chromium/manifest.json'),read('../dist/arb-agent-chromium/popup.html'),read('../dist/arb-agent-chromium/INSTALL.txt')]);
 const manifest=JSON.parse(m);assert.equal(manifest.manifest_version,3);assert.equal(manifest.action.default_popup,'popup.html');
 assert.equal(Object.hasOwn(manifest,'permissions'),false);assert.equal(Object.hasOwn(manifest,'host_permissions'),false);
 assert.match(h,/Connessione non ancora attivata/);
 assert.match(h,/Cloudflare Pages/);
 assert.doesNotMatch(h,/github\\.io|pages\\.dev|target="_blank"/);
 assert.doesNotMatch(h,/<script\\b/);
 assert.match(i,/safe placeholder launcher/);
 assert.match(i,/verified dedicated Cloudflare Pages project URL/);
});
test('hosted dApp build includes the existing W1 module and decoder',async()=>{
 const [h,m,p,d]=await Promise.all([read('../dist/pages/app/index.html'),read('../dist/pages/app/main.js'),read('../dist/pages/wallet-companion/cip30-read-only.js'),read('../dist/pages/wallet-companion/minswap-v2-position-link.js')]);
 assert.match(h,/Content-Security-Policy/);assert.match(m,/window\.cardano/);assert.match(m,/connectReadOnlyWallet/);
 for(const method of ['getNetworkId','getChangeAddress','getBalance','getUtxos'])assert.ok(p.includes(method));
 assert.match(d,/decodeCardanoValueCbor/);
});
test('extension ZIP and Pages site are built',async()=>{
 const z=await stat(new URL('../dist/arb-agent-chromium.zip',import.meta.url));const s=await stat(new URL('../dist/pages/app/index.html',import.meta.url));assert.ok(z.size>500);assert.ok(s.size>1000);
});
