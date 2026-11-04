import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'browser-extension'), dist=path.join(root,'dist');
const folder=path.join(dist,'arb-agent-chromium');
function crc32(b){let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
async function list(d,p=''){const out=[];for(const e of (await readdir(d,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const r=p?p+'/'+e.name:e.name,a=path.join(d,e.name);if(e.isDirectory())out.push(...await list(a,r));else if(e.isFile())out.push({a,r});}return out;}
async function zip(d,dest){const local=[],central=[];let offset=0;const fs=await list(d);for(const f of fs){const n=Buffer.from(f.r.split(path.sep).join('/'),'utf8'),data=await readFile(f.a),crc=crc32(data);const l=Buffer.alloc(30);l.writeUInt32LE(0x04034b50,0);l.writeUInt16LE(20,4);l.writeUInt16LE(0x0800,6);l.writeUInt16LE(0,8);l.writeUInt16LE(0,10);l.writeUInt16LE(0x0021,12);l.writeUInt32LE(crc,14);l.writeUInt32LE(data.length,18);l.writeUInt32LE(data.length,22);l.writeUInt16LE(n.length,26);l.writeUInt16LE(0,28);local.push(l,n,data);const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x0800,8);c.writeUInt16LE(0,10);c.writeUInt16LE(0,12);c.writeUInt16LE(0x0021,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(n.length,28);c.writeUInt16LE(0,30);c.writeUInt16LE(0,32);c.writeUInt16LE(0,34);c.writeUInt16LE(0,36);c.writeUInt32LE(0,38);c.writeUInt32LE(offset,42);central.push(c,n);offset+=l.length+n.length+data.length;}const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(0,4);end.writeUInt16LE(0,6);end.writeUInt16LE(fs.length,8);end.writeUInt16LE(fs.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);end.writeUInt16LE(0,20);await writeFile(dest,Buffer.concat([...local,cd,end]));}
await rm(dist,{recursive:true,force:true});await mkdir(folder,{recursive:true});
for(const n of ['manifest.json','popup.html','popup.css'])await writeFile(path.join(folder,n),await readFile(path.join(source,n)));
await writeFile(path.join(folder,'INSTALL.txt'),[
'ARB AGENT — BRAVE / CHROMIUM WALLET COMPANION','','Extract this ZIP, open brave://extensions, enable Developer mode, and choose Load unpacked.',
'Select the extracted folder containing manifest.json.','','The extension is a launcher only. It requests no browser permissions and does not inspect',
'the active tab or inject scripts into unrelated websites. It opens the Arb Agent dApp URL.',
'The dApp itself uses the existing W1 read-only CIP-30 port.','','The GitHub Pages project URL uses the account pages hostname. Other project sites under that',
'same hostname share the browser origin; a custom isolated Arb Agent domain is recommended',
'before broad production use or any future signing feature.',''
].join('\n'),'utf8');
await zip(folder,path.join(dist,'arb-agent-chromium.zip'));console.log('Built dist/arb-agent-chromium.zip');
