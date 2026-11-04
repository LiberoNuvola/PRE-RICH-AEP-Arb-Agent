import { cp,mkdir,readFile,rm,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'dist','pages');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
await cp(path.join(root,'app'),path.join(output,'app'),{recursive:true});
await cp(path.join(root,'wallet-companion'),path.join(output,'wallet-companion'),{recursive:true});
const rootHtml=[
'<!doctype html>','<html lang="it"><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1">',
'<meta http-equiv="refresh" content="0; url=./app/">','<title>Arb Agent</title></head><body>',
'<p>Apri <a href="./app/">Arb Agent Wallet Companion</a>.</p>','</body></html>',''
].join('\n');
await writeFile(path.join(output,'index.html'),rootHtml,'utf8');
for(const p of ['app/index.html','app/main.js','app/styles.css','app/manifest.webmanifest','app/service-worker.js','wallet-companion/cip30-read-only.js','wallet-companion/minswap-v2-position-link.js'])await readFile(path.join(output,p));
console.log('Built dist/pages');
