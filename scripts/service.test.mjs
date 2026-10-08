import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as pause } from 'node:timers/promises';
const cwd = new URL('../', import.meta.url);
async function start() {
 const child=spawn(process.execPath,['server.mjs'],{cwd,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 let logs='';child.stdout.on('data',x=>logs+=x);
 const deadline=Date.now()+5000;
 while(!logs.includes('"listening"')&&Date.now()<deadline&&child.exitCode===null)await pause(20);
 assert.match(logs,/"listening"/);const first=JSON.parse(logs.split('\n')[0]);assert.equal(first.host,'0.0.0.0');
 return {child,origin:`http://127.0.0.1:${first.port}`,logs:()=>logs};
}
async function stop(app){const exit=once(app.child,'exit');app.child.kill('SIGTERM');const [code,signal]=await exit;assert.equal(code,0);assert.equal(signal,null);assert.match(app.logs(),/"shutdown_complete"/);assert.doesNotMatch(app.logs(),/"shutdown_deadline"/);}
test('HTTP allowlist, live state, healthcheck, restart and SIGTERM',{timeout:15000},async()=>{
 let app=await start();try{
 assert.equal(process.version,'v22.23.3');
 for(const [path,type] of [['/','text/html'],['/service.css','text/css'],['/signal.svg','image/svg+xml'],['/healthz','application/json'],['/status.json','application/json']]){const r=await fetch(app.origin+path);assert.equal(r.status,200);assert.ok(r.headers.get('content-type').startsWith(type));assert.equal(r.headers.get('cache-control'),'no-store');}
 const first=await(await fetch(app.origin+'/status.json')).json();await pause(60);const second=await(await fetch(app.origin+'/status.json')).json();assert.equal(second.version,'1.0.0');assert.equal(second.storage,'ephemeral-memory');assert.equal(second.bootId,first.bootId);assert.ok(second.uptimeSeconds>first.uptimeSeconds);assert.ok(second.requests>first.requests);
 for(const path of ['/unknown','/missing.svg','/healthz/','/status.json?test=1','/.env','/%2e%2e/package.json']){const r=await fetch(app.origin+path);assert.equal(r.status,404);assert.equal(await r.text(),'Not found\n');}
 const head=await fetch(app.origin+'/status.json',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
 // Negative POST only on this local fixture; never production.
 const rejected=await fetch(app.origin+'/healthz',{method:'POST'});assert.equal(rejected.status,405);assert.equal(rejected.headers.get('allow'),'GET, HEAD');
 const health=spawn(process.execPath,['scripts/healthcheck.mjs'],{cwd,env:{...process.env,PORT:new URL(app.origin).port}});assert.equal((await once(health,'exit'))[0],0);
 await stop(app);await assert.rejects(fetch(app.origin+'/healthz'));app=await start();const reset=await(await fetch(app.origin+'/status.json')).json();assert.notEqual(reset.bootId,first.bootId);assert.equal(reset.requests,1);await stop(app);
 }finally{if(app.child.exitCode===null)app.child.kill('SIGKILL');}
});
test('invalid PORT fails before accepting requests',async()=>{const child=spawn(process.execPath,['server.mjs'],{cwd,env:{...process.env,PORT:'wrong'},stdio:'ignore'});assert.notEqual((await once(child,'exit'))[0],0);});
