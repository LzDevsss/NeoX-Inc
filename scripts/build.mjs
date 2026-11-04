import fs from 'node:fs';
import path from 'node:path';
import {root,syncContent} from './sync-content.mjs';
const html = syncContent();
const dist = path.join(root,'dist');
// Remove apenas arquivos gerados, dentro da pasta de build conhecida.
if (path.resolve(dist) !== path.resolve(root,'dist')) throw new Error('Invalid build directory');
fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,'index.html'),html);
for (const directory of ['assets/js','assets/css','assets/fonts','assets/optimized']) fs.cpSync(path.join(root,directory),path.join(dist,directory),{recursive:true});
const referenced = new Set([...html.matchAll(/(?:src|data-src|data-fallbacks|href|poster)="(?:https:\/\/(?:www\.neoxinc\.website|neoxinc\.vercel\.app)\/)?(assets\/[^"?#,]+)/g)].map(m=>m[1]));
for (const name of referenced) {
  if (!fs.existsSync(path.join(root,name))) throw new Error(`Recurso ausente: ${name}`);
  fs.mkdirSync(path.dirname(path.join(dist,name)),{recursive:true});
  fs.copyFileSync(path.join(root,name),path.join(dist,name));
}
console.log(`Build estática pronta: ${referenced.size} referências locais verificadas.`);
