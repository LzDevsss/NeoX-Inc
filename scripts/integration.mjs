import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import net from 'node:net';
const root=fileURLToPath(new URL('../',import.meta.url));
const reservation=net.createServer();
await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
const port=reservation.address().port;
await new Promise(resolve=>reservation.close(resolve));
const python=spawn(process.env.PYTHON||'python',['tests/fixtures/redis-rest.py',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
let errors='';python.stderr.on('data',chunk=>{errors+=chunk;});
try{
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Redis de teste não iniciou. Instale tests/requirements.txt. '+errors)),15000);
    python.stdout.on('data',chunk=>{if(String(chunk).includes('ready')){clearTimeout(timer);resolve();}});
    python.once('error',error=>{clearTimeout(timer);reject(error);});
    python.once('exit',code=>{if(code){clearTimeout(timer);reject(new Error(errors));}});
  });
  const tests=spawn(process.execPath,['--test'],{cwd:root,stdio:'inherit',env:{...process.env,TEST_REDIS_REST_URL:`http://127.0.0.1:${port}`}});
  process.exitCode=await new Promise(resolve=>tests.on('exit',resolve));
}finally{python.kill();}
