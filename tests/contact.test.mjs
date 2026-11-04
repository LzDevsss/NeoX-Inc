import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
const require=createRequire(import.meta.url);
const {createContactService,createHandler,COOLDOWN_MS,accountEmail,redisStore,resendMailer}=require('../server/contact.cjs');
const redisUrl=process.env.TEST_REDIS_REST_URL;
if(redisUrl&&!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(redisUrl))throw new Error('Os testes destrutivos usam somente o Redis simulado local, nunca produção.');
const secret='test-only-secret-'.repeat(4);
const origin='http://127.0.0.1:4173';
const integration=redisUrl?test:test.skip;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function command(...args){
  const response=await fetch(redisUrl,{method:'POST',body:JSON.stringify(args)});
  const data=await response.json();
  if(data.error)throw new Error(data.error);
  return data.result;
}
async function advance(ms){await fetch(redisUrl,{method:'POST',body:JSON.stringify({__advance:ms})});}
async function fixture(){
  await command('FLUSHDB');
  const sent=new Map(),calls=[];
  let failMessages=false;
  const mailer={async send(message){
    calls.push(message);
    if(failMessages&&message.idempotencyKey.startsWith('neox-message/'))throw new Error('Simulated provider outage');
    await sleep(5);
    if(!sent.has(message.idempotencyKey))sent.set(message.idempotencyKey,message);
    return message.idempotencyKey;
  }};
  const options={store:{command},mailer,secret,recipient:'team@example.test'};
  const service=createContactService(options);
  const login=async(email='player@example.test',backend=service)=>{
    const challenge=await backend.requestCode(email,'test-ip');
    const message=[...sent.values()].find(message=>message.idempotencyKey===`neox-code/${challenge.challengeId}`);
    const code=/\b\d{6}\b/.exec(message.body)[0];
    return {challenge,code,...await backend.verifyCode(challenge.challengeId,code)};
  };
  const payload=(changes={})=>({name:'Player',roblox:'PlayerRoblox',message:'Uma mensagem de teste suficientemente longa.',idempotencyKey:randomUUID(),...changes});
  return {service,options,sent,calls,login,payload,failMessages:value=>{failMessages=value;}};
}

test('identidade normalizada cobre aliases do mesmo Gmail',()=>{
  assert.equal(accountEmail('play.er+tag@gmail.com'),'player@gmail.com');
  assert.equal(accountEmail('player@googlemail.com'),'player@gmail.com');
});
test('backend sem configuração falha fechado',async()=>{
  const handler=createHandler({env:{CONTACT_ENABLED:'false'}});
  const response={headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=JSON.parse(body);}};
  await handler({url:'/api/contact?action=session',method:'GET',headers:{}},response);
  assert.equal(response.statusCode,503);
  assert.equal(response.body.error,'unavailable');
});
test('contratos de Redis e e-mail não desativam TLS e incluem idempotência',async()=>{
  assert.throws(()=>redisStore({url:'http://example.test',token:'test'}));
  let request;
  const mailer=resendMailer({key:'test-key',from:'NeoX <team@example.test>',request:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({id:'message-1'})};}});
  await mailer.send({to:'player@example.test',subject:'Test',body:'Body',idempotencyKey:'test-message'});
  assert.equal(request.url,'https://api.resend.com/emails');
  assert.equal(request.options.headers['Idempotency-Key'],'test-message');
});

integration('30 minutos obrigatórios, inclusive depois de sair, entrar e reiniciar a instância',async()=>{
  const f=await fixture(),account=await f.login();
  const first=await f.service.sendMessage(account.token,account.csrf,f.payload());
  assert.equal(first.delivery,'sent');
  assert.ok(first.nextAllowedAt-first.serverNow>COOLDOWN_MS-1000);
  await assert.rejects(f.service.sendMessage(account.token,account.csrf,f.payload()),error=>error.status===429&&error.retryAfterMs>COOLDOWN_MS-1000);
  await f.service.logout(account.token,account.csrf);
  await assert.rejects(f.service.status(account.token),error=>error.status===401);
  await advance(61000);
  const otherInstance=createContactService(f.options);
  const newAccount=await f.login('player@example.test',otherInstance);
  const status=await otherInstance.status(newAccount.token);
  assert.ok(status.nextAllowedAt-status.serverNow>COOLDOWN_MS-63000);
  await assert.rejects(otherInstance.sendMessage(newAccount.token,newAccount.csrf,f.payload()),error=>error.status===429);
  await advance(COOLDOWN_MS);
  const second=await otherInstance.sendMessage(newAccount.token,newAccount.csrf,f.payload());
  assert.notEqual(second.id,first.id);
  assert.equal(second.delivery,'sent');
});
integration('requisições simultâneas com chaves diferentes aceitam apenas uma mensagem',async()=>{
  const f=await fixture(),account=await f.login();
  const instances=[f.service,createContactService(f.options)];
  const results=await Promise.allSettled(Array.from({length:24},(_,i)=>instances[i%2].sendMessage(account.token,account.csrf,f.payload())));
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.filter(result=>result.status==='rejected'&&result.reason.status===429).length,23);
  assert.equal([...f.sent.keys()].filter(key=>key.startsWith('neox-message/')).length,1);
});
integration('duas sessões ativas do mesmo e-mail compartilham o limite',async()=>{
  const f=await fixture(),deviceOne=await f.login();
  await advance(61000);
  const otherInstance=createContactService(f.options),deviceTwo=await f.login('player@example.test',otherInstance);
  assert.notEqual(deviceOne.token,deviceTwo.token);
  const results=await Promise.allSettled([
    f.service.sendMessage(deviceOne.token,deviceOne.csrf,f.payload({nextAllowedAt:0,userId:'fake'})),
    otherInstance.sendMessage(deviceTwo.token,deviceTwo.csrf,f.payload({nextAllowedAt:0,userId:'fake'}))
  ]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.filter(result=>result.status==='rejected'&&result.reason.status===429).length,1);
});
integration('cliques repetidos e replays usam o mesmo recibo e enviam um único e-mail',async()=>{
  const f=await fixture(),account=await f.login(),payload=f.payload();
  const instances=[f.service,createContactService(f.options)];
  const replies=await Promise.all(Array.from({length:24},(_,i)=>instances[i%2].sendMessage(account.token,account.csrf,payload)));
  assert.equal(new Set(replies.map(reply=>reply.id)).size,1);
  assert.equal([...f.sent.keys()].filter(key=>key.startsWith('neox-message/')).length,1);
  await assert.rejects(f.service.sendMessage(account.token,account.csrf,{...payload,message:'Alteração da mensagem com a mesma chave.'}),error=>error.status===409);
});
integration('código errado, consumido ou expirado não cria sessão',async()=>{
  const f=await fixture();
  const challenge=await f.service.requestCode('wrong@example.test','test-ip');
  const mailed=[...f.sent.values()].find(message=>message.idempotencyKey===`neox-code/${challenge.challengeId}`);
  const code=/\b\d{6}\b/.exec(mailed.body)[0];
  const wrong=code==='000000'?'111111':'000000';
  for(let i=0;i<5;i++)await assert.rejects(f.service.verifyCode(challenge.challengeId,wrong),error=>error.code==='invalid_code');
  await assert.rejects(f.service.verifyCode(challenge.challengeId,code),error=>error.code==='invalid_code');
  const good=await f.login('good@example.test');
  await assert.rejects(f.service.verifyCode(good.challenge.challengeId,good.code),error=>error.code==='invalid_code');
  const expired=await f.service.requestCode('expired@example.test','another-ip');
  await advance(601000);
  await assert.rejects(f.service.verifyCode(expired.challengeId,'123456'),error=>error.code==='invalid_code');
});
integration('pedidos de código também têm limite por e-mail e por IP',async()=>{
  const f=await fixture();
  await f.service.requestCode('rate@example.test','test-ip');
  await assert.rejects(f.service.requestCode('rate@example.test','other-ip'),error=>error.status===429&&error.retryAfterMs>59000);
});
integration('não aceita sessão falsa, CSRF errado nem identidade vinda do formulário',async()=>{
  const f=await fixture(),account=await f.login();
  await assert.rejects(f.service.sendMessage('0'.repeat(64),account.csrf,f.payload()),error=>error.status===401);
  await assert.rejects(f.service.sendMessage(account.token,'wrong',f.payload()),error=>error.status===403);
  await f.service.sendMessage(account.token,account.csrf,f.payload({email:'spoof@example.test'}));
  const message=[...f.sent.values()].find(message=>message.idempotencyKey.startsWith('neox-message/'));
  assert.equal(message.replyTo,'player@example.test');
});
integration('falha no e-mail preserva a mensagem e o prazo; reenvio não cria duplicata',async()=>{
  const f=await fixture(),account=await f.login();f.failMessages(true);
  const payload=f.payload(),first=await f.service.sendMessage(account.token,account.csrf,payload);
  assert.equal(first.delivery,'pending');
  const restarted=createContactService(f.options);
  assert.equal((await restarted.status(account.token)).lastMessage.id,first.id);
  await assert.rejects(restarted.sendMessage(account.token,account.csrf,f.payload()),error=>error.status===429);
  f.failMessages(false);
  assert.equal((await restarted.retryDelivery(account.token,account.csrf,first.id)).delivery,'sent');
  assert.equal((await restarted.sendMessage(account.token,account.csrf,payload)).delivery,'sent');
  assert.equal([...f.sent.keys()].filter(key=>key.startsWith('neox-message/')).length,1);
});
integration('HTTP rejeita origem externa e corpo inválido e usa cookie HttpOnly',async()=>{
  const f=await fixture();
  const handler=createHandler({env:{CONTACT_ORIGIN:origin},service:f.service});
  const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api/contact`;
  try{
    const blocked=await fetch(base+'?action=request-code',{method:'POST',headers:{Origin:'https://other.example','Content-Type':'application/json'},body:JSON.stringify({email:'http@example.test'})});
    assert.equal(blocked.status,403);
    const malformed=await fetch(base+'?action=request-code',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{'});
    assert.equal(malformed.status,400);
    const requested=await fetch(base+'?action=request-code',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'http@example.test'})});
    const {challengeId}=await requested.json();
    const mailed=[...f.sent.values()].find(message=>message.idempotencyKey===`neox-code/${challengeId}`);
    const code=/\b\d{6}\b/.exec(mailed.body)[0];
    const verified=await fetch(base+'?action=verify-code',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({challengeId,code})});
    assert.equal(verified.status,200);
    assert.match(verified.headers.get('set-cookie'),/HttpOnly; SameSite=Lax; Secure/);
    assert.equal((await verified.json()).token,undefined);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
