import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {createStatsHandler}=createRequire(import.meta.url)('../server/stats.cjs');
function response(){return {headers:{},setHeader(name,value){this.headers[name]=value;},end(body){this.body=JSON.parse(body);}};}
const request={method:'GET',headers:{origin:'https://eosein.github.io'}};
test('estatísticas agrupam chamadas concorrentes e usam cache compartilhável',async()=>{
  let calls=0,clock=0;
  const handler=createStatsHandler({now:()=>clock,request:async url=>{calls++;return{ok:true,json:async()=>({data:url.includes('/votes')?[{id:10079271418,upVotes:10,downVotes:1}]:[{id:10079271418,playing:5,visits:100,favoritedCount:20,genre:'All',maxPlayers:10}]})};}});
  const responses=Array.from({length:20},response);await Promise.all(responses.map(res=>handler(request,res)));
  assert.equal(calls,2);assert.equal(responses[0].body.games.ap.likes,10);
  const cached=response();await handler(request,cached);assert.equal(calls,2);
  assert.match(cached.headers['Cache-Control'],/s-maxage=10/);
  assert.equal(cached.headers['Access-Control-Allow-Origin'],'https://eosein.github.io');
  clock=10001;await handler(request,response());assert.equal(calls,4);
});
test('falha dos votos não apaga os dados restantes',async()=>{
  const handler=createStatsHandler({request:async url=>{if(url.includes('/votes'))throw new Error('votes offline');return{ok:true,json:async()=>({data:[{id:10079271418,playing:12,visits:1000}]})};}});
  const res=response();await handler(request,res);assert.equal(res.statusCode,200);assert.equal(res.body.games.ap.playing,12);
});
test('votos do projeto em desenvolvimento continuam presentes sem detalhes públicos',async()=>{
  const handler=createStatsHandler({request:async url=>({ok:true,json:async()=>({data:url.includes('/votes')?[{id:7660190629,upVotes:20,downVotes:2}]:[{id:10079271418,playing:4}]})})});
  const res=response();await handler(request,res);assert.equal(res.body.games.cr.likes,20);
});
test('não usa URLs fornecidas por visitantes nem expõe cache de erro',async()=>{
  const urls=[];const handler=createStatsHandler({request:async url=>{urls.push(url);return{ok:false};}});
  const res=response();await handler({...request,url:'/api/stats?url=https://attacker.test'},res);
  assert.ok(urls.every(url=>url.startsWith('https://games.roblox.com/')));assert.equal(res.statusCode,503);assert.equal(res.headers['Cache-Control'],'no-store');
});
