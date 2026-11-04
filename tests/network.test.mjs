import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),createNetwork=require('../assets/js/network.js');
test('consultas simultâneas e consultas próximas compartilham a resposta',async()=>{
  let requests=0,clock=0;
  const client=createNetwork({now:()=>clock,request:async()=>{requests++;return{ok:true,status:200,text:async()=>JSON.stringify({playing:3})};}});
  const values=await Promise.all(Array.from({length:20},()=>client.fetchJSON('https://games.example/stats')));
  assert.equal(requests,1);assert.equal(values[0].playing,3);
  clock=4000;await client.fetchJSON('https://games.example/stats');assert.equal(requests,1);
  clock=6000;await client.fetchJSON('https://games.example/stats');assert.equal(requests,2);
});
test('HTTP 429 pausa toda a origem pelo Retry-After, inclusive outros endpoints',async()=>{
  let requests=0,clock=0;
  const client=createNetwork({now:()=>clock,request:async()=>{requests++;return{status:429,headers:{get:()=> '120'}};}});
  await assert.rejects(client.fetchJSON('https://games.example/one'),error=>error.status===429&&error.retryAfterMs===120000);
  await assert.rejects(client.fetchJSON('https://games.example/two'),error=>error.status===429);
  assert.equal(requests,1);clock=120001;
  await assert.rejects(client.fetchJSON('https://games.example/two'));assert.equal(requests,2);
});
test('uma resposta inválida não fica presa no cache de chamadas em andamento',async()=>{
  let requests=0;
  const client=createNetwork({request:async()=>{requests++;if(requests===1)throw new Error('offline');return{ok:true,status:200,text:async()=>JSON.stringify({ok:true})};}});
  await assert.rejects(client.fetchJSON('https://games.example/stats'));
  assert.equal((await client.fetchJSON('https://games.example/stats')).ok,true);
});
test('respostas grandes de fornecedores não entram no cache',async()=>{
  const client=createNetwork({request:async()=>({ok:true,status:200,text:async()=>'x'.repeat(400001)})});
  await assert.rejects(client.fetchJSON('https://games.example/stats'),/too large/);
});

test('vídeos fora da tela não têm src que dispare download antecipado',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(!/<source\b[^>]*\ssrc=/.test(html));
  assert.equal([...html.matchAll(/<source data-src=/g)].length,3);
  assert.equal([...html.matchAll(/<video\b[^>]*preload="none"/g)].length,3);
  assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html));
});
test('imagens otimizadas diminuem o volume sem remover os arquivos originais',()=>{
  const dir=new URL('../assets/optimized/',import.meta.url);
  const names=fs.readdirSync(dir).filter(name=>name.endsWith('.webp'));
  let original=0,optimized=0;
  for(const name of names){original+=fs.statSync(new URL(`../assets/${name.replace('.webp','.png')}`,import.meta.url)).size;optimized+=fs.statSync(new URL(name,dir)).size;}
  assert.equal(names.length,15);assert.ok(optimized<original*.2);
});
