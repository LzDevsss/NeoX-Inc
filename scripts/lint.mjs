import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,syncContent} from './sync-content.mjs';
function files(directory) {return fs.readdirSync(directory,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(path.join(directory,item.name)):[path.join(directory,item.name)]);}
const sources=['assets/js','scripts','tests','server','api'].filter(name=>fs.existsSync(path.join(root,name))).flatMap(name=>files(path.join(root,name))).filter(name=>/\.(?:mjs|cjs|js)$/.test(name));
for (const file of sources) {
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if (result.status!==0) throw new Error(result.stderr || `Erro de sintaxe: ${file}`);
}
syncContent({check:true});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
if (/\son(?:click|load|error|submit)\s*=|javascript:/i.test(html)) throw new Error('JavaScript inline não é permitido');
JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
console.log(`Verificação concluída: ${sources.length} arquivos, textos e configuração.`);
