'use strict';
const {randomBytes,randomInt,createHmac,timingSafeEqual,createHash}=require('node:crypto');
const COOLDOWN_MS=30*60*1000;
const SESSION_SECONDS=24*60*60;
const OTP_SECONDS=10*60;
const JOB_SECONDS=24*60*60;

// Todas as decisões concorrentes são feitas no Redis, compartilhado pelas instâncias.
const RATE_LUA=`
local emailCount=tonumber(redis.call('GET',KEYS[1]) or '0')
local ipCount=tonumber(redis.call('GET',KEYS[2]) or '0')
local wait=redis.call('PTTL',KEYS[3])
if wait>0 then return wait end
if emailCount>=5 then return math.max(1000,redis.call('PTTL',KEYS[1])) end
if ipCount>=12 then return math.max(1000,redis.call('PTTL',KEYS[2])) end
if redis.call('INCR',KEYS[1])==1 then redis.call('PEXPIRE',KEYS[1],1800000) end
if redis.call('INCR',KEYS[2])==1 then redis.call('PEXPIRE',KEYS[2],900000) end
redis.call('SET',KEYS[3],'1','PX',60000)
return 0`;
const VERIFY_LUA=`
local raw=redis.call('GET',KEYS[1])
if not raw then return false end
local challenge=cjson.decode(raw)
if challenge.codeHash~=ARGV[1] then
 challenge.attempts=challenge.attempts+1
 if challenge.attempts>=5 then redis.call('DEL',KEYS[1])
 else local ttl=redis.call('PTTL',KEYS[1]); if ttl>0 then redis.call('SET',KEYS[1],cjson.encode(challenge),'PX',ttl) end end
 return false
end
redis.call('DEL',KEYS[1])
return raw`;
const ACCEPT_LUA=`
local old=redis.call('GET',KEYS[1])
if old then
 if cjson.decode(old).fingerprint~=ARGV[1] then return {'conflict'} end
 return {'replay',old}
end
local wait=redis.call('PTTL',KEYS[2])
if wait>0 then return {'blocked',tostring(wait)} end
local clock=redis.call('TIME')
local now=tonumber(clock[1])*1000+math.floor(tonumber(clock[2])/1000)
local job=cjson.decode(ARGV[2])
job.acceptedAt=now
job.nextAllowedAt=now+tonumber(ARGV[3])
local encoded=cjson.encode(job)
redis.call('SET',KEYS[1],encoded,'EX',ARGV[4])
redis.call('SET',KEYS[2],job.id,'PX',ARGV[3])
redis.call('SET',KEYS[3],job.id,'EX',ARGV[4])
return {'accepted',encoded}`;
const RELEASE_LUA=`if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0`;
const FINISH_LUA=`
if redis.call('GET',KEYS[2])~=ARGV[1] then return 0 end
local raw=redis.call('GET',KEYS[1])
if raw then local job=cjson.decode(raw); job.delivery='sent'; job.providerId=ARGV[2];
 local ttl=redis.call('PTTL',KEYS[1]); if ttl>0 then redis.call('SET',KEYS[1],cjson.encode(job),'PX',ttl) end end
redis.call('DEL',KEYS[2])
return 1`;

class ContactError extends Error {
  constructor(status,code,retryAfterMs=0){super(code);this.status=status;this.code=code;this.retryAfterMs=retryAfterMs;}
}
function emailAddress(value){
  const email=String(value||'').trim().toLowerCase();
  if(email.length>254||!/^[-a-z0-9.!#$%&'*+/=?^_`{|}~]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email))throw new ContactError(400,'invalid_email');
  return email;
}
function accountEmail(email){
  let [local,domain]=email.split('@');
  if(domain==='googlemail.com')domain='gmail.com';
  if(domain==='gmail.com')local=local.split('+')[0].replaceAll('.','');
  return `${local}@${domain}`;
}
function text(value,max,multiline=false){
  let result=String(value||'').normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
  if(!multiline)result=result.replace(/[\r\n\u2028\u2029]+/g,' ');
  if(result.length>max)throw new ContactError(400,'invalid_message');
  return result;
}
function equal(left,right){const a=Buffer.from(String(left||'')),b=Buffer.from(String(right||''));return a.length===b.length&&timingSafeEqual(a,b);}
function redisStore({url,token,request=fetch}){
  if(!/^https:\/\/[a-z0-9.-]+\.upstash\.io\/?$/.test(url||''))throw new ContactError(503,'unavailable');
  return {async command(...command){
    const response=await request(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new ContactError(503,'unavailable');
    const data=await response.json();
    if(data.error)throw new ContactError(503,'unavailable');
    return data.result;
  }};
}
function resendMailer({key,from,request=fetch}){
  return {async send({to,subject,body,replyTo,idempotencyKey}){
    const response=await request('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from,to:[to],subject,text:body,...(replyTo?{reply_to:replyTo}:{})}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new ContactError(503,'mail_unavailable');
    const data=await response.json();
    if(typeof data.id!=='string')throw new ContactError(503,'mail_unavailable');
    return data.id;
  }};
}
function createContactService({store,mailer,secret,recipient,now=()=>Date.now()}){
  if(!store||!mailer||typeof secret!=='string'||secret.length<32)throw new ContactError(503,'unavailable');
  const digest=value=>createHmac('sha256',secret).update(value).digest('hex');
  const key=(type,id)=>`neox:contact:v1:${type}:${id}`;
  const evaluate=(script,keys,args=[])=>store.command('EVAL',script,keys.length,...keys,...args.map(String));
  const uid=email=>digest(`user:${accountEmail(email)}`);
  const cookieKey=token=>key('session',digest(`session:${token}`));
  async function session(token){
    if(!/^[a-f0-9]{64}$/.test(token||''))throw new ContactError(401,'sign_in');
    const raw=await store.command('GET',cookieKey(token));
    if(!raw)throw new ContactError(401,'sign_in');
    return JSON.parse(raw);
  }
  async function requestCode(rawEmail,ip,language='pt'){
    const email=emailAddress(rawEmail),user=uid(email);
    const wait=await evaluate(RATE_LUA,[key('code-count',user),key('ip-codes',digest(`ip:${ip}`)),key('code-wait',user)]);
    if(Number(wait)>0)throw new ContactError(429,'code_wait',Number(wait));
    const challenge=randomBytes(24).toString('hex'),code=String(randomInt(1000000)).padStart(6,'0');
    const challengeKey=key('challenge',challenge);
    await store.command('SET',challengeKey,JSON.stringify({email,uid:user,codeHash:digest(`code:${challenge}:${code}`),attempts:0}),'EX',OTP_SECONDS);
    try {
      await mailer.send({to:email,subject:language==='en'?'Your NeoX access code':'Seu código para falar com a NeoX',body:language==='en'?`Your access code is ${code}.\n\nIt is valid for 10 minutes. If you did not request it, you can ignore this email.\n\nNeoX Studio`:`Seu código de acesso é ${code}.\n\nEle vale por 10 minutos. Se você não pediu este código, pode ignorar este e-mail.\n\nNeoX Studio`,idempotencyKey:`neox-code/${challenge}`});
    } catch(error){await store.command('DEL',challengeKey);throw error;}
    return {challengeId:challenge,expiresIn:OTP_SECONDS,resendAfter:60};
  }
  async function verifyCode(challenge,code){
    if(!/^[a-f0-9]{48}$/.test(challenge||'')||!/^\d{6}$/.test(code||''))throw new ContactError(400,'invalid_code');
    const raw=await evaluate(VERIFY_LUA,[key('challenge',challenge)],[digest(`code:${challenge}:${code}`)]);
    if(!raw)throw new ContactError(400,'invalid_code');
    const data=JSON.parse(raw),token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');
    await store.command('SET',cookieKey(token),JSON.stringify({uid:data.uid,email:data.email,csrf}),'EX',SESSION_SECONDS);
    return {token,...await status(token)};
  }
  async function status(token){
    const account=await session(token);
    const ttl=Number(await store.command('PTTL',key('cooldown',account.uid)));
    const last=await store.command('GET',key('last',account.uid));
    const raw=last?await store.command('GET',key('message',last)):null;
    const job=raw?JSON.parse(raw):null;
    const serverNow=now();
    return {authenticated:true,email:account.email,csrf:account.csrf,serverNow,nextAllowedAt:serverNow+Math.max(0,ttl),lastMessage:job?{id:job.id,delivery:job.delivery}:null};
  }
  async function authenticated(token,csrf){const account=await session(token);if(!equal(account.csrf,csrf))throw new ContactError(403,'forbidden');return account;}
  async function deliver(job){
    if(job.delivery==='sent')return 'sent';
    // O provedor mantém a chave por 24h. Não repetir uma entrega incerta fora dessa janela.
    if(now()-job.acceptedAt>23*60*60*1000)return 'pending';
    const messageKey=key('message',job.id),lockKey=key('delivery-lock',job.id),lock=randomBytes(16).toString('hex');
    if(!await store.command('SET',lockKey,lock,'NX','PX',30000))return 'pending';
    try {
      const providerId=await mailer.send({to:recipient,replyTo:job.email,subject:'Mensagem pelo site da NeoX Studio',body:`Nome: ${job.name}\nE-mail confirmado: ${job.email}\nRoblox: ${job.roblox||'Não informado'}\n\n${job.message}`,idempotencyKey:`neox-message/${job.id}`});
      await evaluate(FINISH_LUA,[messageKey,lockKey],[lock,providerId]);
      return 'sent';
    } catch{return 'pending';}
    finally{await evaluate(RELEASE_LUA,[lockKey],[lock]);}
  }
  async function sendMessage(token,csrf,input){
    const account=await authenticated(token,csrf);
    if(input._honey)throw new ContactError(400,'invalid_message');
    if(!/^[a-f0-9-]{36}$/i.test(input.idempotencyKey||''))throw new ContactError(400,'invalid_request');
    const name=text(input.name,80),roblox=text(input.roblox,60),message=text(input.message,2000,true);
    if(name.length<2||message.length<16)throw new ContactError(400,'invalid_message');
    const fingerprint=createHash('sha256').update(JSON.stringify([name,roblox,message])).digest('hex');
    const id=digest(`message:${account.uid}:${input.idempotencyKey}`);
    const inputJob={id,uid:account.uid,email:account.email,name,roblox,message,fingerprint,delivery:'pending'};
    const result=await evaluate(ACCEPT_LUA,[key('message',id),key('cooldown',account.uid),key('last',account.uid)],[fingerprint,JSON.stringify(inputJob),COOLDOWN_MS,JOB_SECONDS]);
    if(result[0]==='conflict')throw new ContactError(409,'message_changed');
    if(result[0]==='blocked')throw new ContactError(429,'message_wait',Number(result[1]));
    const job=JSON.parse(result[1]);
    const delivery=await deliver(job);
    const serverNow=now();
    const wait=Math.max(0,Number(await store.command('PTTL',key('cooldown',account.uid))));
    return {id:job.id,delivery,replayed:result[0]==='replay',serverNow,nextAllowedAt:serverNow+wait};
  }
  async function retryDelivery(token,csrf,id){
    const account=await authenticated(token,csrf);
    if(!/^[a-f0-9]{64}$/.test(id||''))throw new ContactError(400,'invalid_request');
    const raw=await store.command('GET',key('message',id));
    const job=raw?JSON.parse(raw):null;
    if(!job||job.uid!==account.uid)throw new ContactError(404,'not_found');
    return {id,delivery:await deliver(job)};
  }
  async function logout(token,csrf){await authenticated(token,csrf);await store.command('DEL',cookieKey(token));return {authenticated:false};}
  return {requestCode,verifyCode,status,sendMessage,retryDelivery,logout};
}
function createHandler({env=process.env,service,allowLocal=false}={}){
  const origin=String(env.CONTACT_ORIGIN||'https://www.neoxinc.website').replace(/\/+$/,'');
  let instance=service;
  const cookieName=allowLocal?'neox_contact_dev':'__Host-neox_contact';
  function getService(){
    if(instance)return instance;
    if(env.CONTACT_ENABLED!=='true'||!env.CONTACT_SECRET||!env.CONTACT_TO||!env.CONTACT_FROM||!env.RESEND_API_KEY||!env.UPSTASH_REDIS_REST_TOKEN)throw new ContactError(503,'unavailable');
    instance=createContactService({secret:env.CONTACT_SECRET,recipient:emailAddress(env.CONTACT_TO),store:redisStore({url:env.UPSTASH_REDIS_REST_URL,token:env.UPSTASH_REDIS_REST_TOKEN}),mailer:resendMailer({key:env.RESEND_API_KEY,from:env.CONTACT_FROM})});
    return instance;
  }
  return async function handler(req,res){
    res.setHeader('Cache-Control','no-store, private');
    res.setHeader('X-Content-Type-Options','nosniff');
    const reply=(status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));};
    try {
      const url=new URL(req.url,origin),action=url.searchParams.get('action')||'session';
      if(!['GET','POST'].includes(req.method))throw new ContactError(405,'invalid_request');
      if(req.method==='POST'){
        if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new ContactError(403,'forbidden');
        if(Number(req.headers['content-length']||0)>10000)throw new ContactError(413,'invalid_request');
      }
      const backend=getService();
      const cookies=Object.fromEntries(String(req.headers.cookie||'').split(';').map(item=>item.trim().split('=')).filter(item=>item.length===2));
      const token=cookies[cookieName]||'';
      const csrf=req.headers['x-neox-csrf']||'';
      let body={};
      if(req.method==='POST'){
        if(req.body!==undefined)body=typeof req.body==='string'?JSON.parse(req.body):req.body;
        else {
          const chunks=[];let length=0;
          for await(const chunk of req){length+=chunk.length;if(length>10000)throw new ContactError(413,'invalid_request');chunks.push(chunk);}
          body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        }
        if(!body||typeof body!=='object'||Array.isArray(body)||Buffer.byteLength(JSON.stringify(body))>10000)throw new ContactError(400,'invalid_request');
      }
      let result;
      if(action==='session'&&req.method==='GET'){
        try{result=await backend.status(token);}catch(error){if(error.status!==401)throw error;result={authenticated:false,serverNow:Date.now()};}
      } else if(action==='request-code'&&req.method==='POST'){
        // Este header é definido pela Vercel. Nunca confiar em x-forwarded-for arbitrário.
        const ip=req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown';
        result=await backend.requestCode(body.email,ip,body.language==='en'?'en':'pt');
      } else if(action==='verify-code'&&req.method==='POST'){
        result=await backend.verifyCode(body.challengeId,body.code);
        res.setHeader('Set-Cookie',`${cookieName}=${result.token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; SameSite=Lax${allowLocal?'':'; Secure'}`);
        delete result.token;
      } else if(action==='message'&&req.method==='POST')result=await backend.sendMessage(token,csrf,body);
      else if(action==='retry'&&req.method==='POST')result=await backend.retryDelivery(token,csrf,body.id);
      else if(action==='logout'&&req.method==='POST'){
        result=await backend.logout(token,csrf);
        res.setHeader('Set-Cookie',`${cookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${allowLocal?'':'; Secure'}`);
      } else throw new ContactError(404,'not_found');
      reply(result.delivery==='pending'?202:200,result);
    } catch(error){
      const known=error instanceof ContactError;
      if(known&&error.retryAfterMs)res.setHeader('Retry-After',String(Math.ceil(error.retryAfterMs/1000)));
      const status=known?error.status:error instanceof SyntaxError?400:503;
      reply(status,{error:known?error.code:status===400?'invalid_request':'unavailable',retryAfterMs:known?error.retryAfterMs:0,serverNow:Date.now()});
    }
  };
}
module.exports={COOLDOWN_MS,ContactError,accountEmail,emailAddress,redisStore,resendMailer,createContactService,createHandler};
