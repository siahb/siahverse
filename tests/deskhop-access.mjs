import test from 'node:test';
import assert from 'node:assert/strict';
import {deskhopAccess} from '../server/deskhop-access.js';
const owner='verified-owner-id';
function context(path='/deskhop/',env={}){return {request:new Request('https://siahverse.cc'+path),env,next:async()=>new Response('PRIVATE DESKTOP PAGE')};}
const session=id=>async()=>({session:{user:{id}},set:[]});
test('anonymous visitors receive sign-in without private content',async()=>{
 const r=await deskhopAccess(context(),async()=>({session:null,set:[]}));assert.equal(r.status,401);const body=await r.text();assert.match(body,/deskhop-login/);assert.doesNotMatch(body,/PRIVATE DESKTOP PAGE/);assert.match(r.headers.get('Cache-Control'),/no-store/);
});
test('signed-in non-owner denied even with editable metadata',async()=>{
 const r=await deskhopAccess(context(),async()=>({session:{user:{id:'other',user_metadata:{owner:true}}},set:[]}),[owner]);assert.equal(r.status,403);
});
test('empty allowlist fails closed',async()=>assert.equal((await deskhopAccess(context(),session(owner),[])).status,403));
test('verified owner can access page and renewed cookies propagate',async()=>{
 const r=await deskhopAccess(context(),async()=>({session:{user:{id:owner}},set:['renewed=1; HttpOnly']}),[owner]);assert.equal(r.status,200);assert.equal(await r.text(),'PRIVATE DESKTOP PAGE');assert.match(r.headers.get('Set-Cookie'),/renewed/);assert.match(r.headers.get('Cache-Control'),/no-store/);
});
for(const path of ['/deskhop/index.html','/deskhop/config.js','/deskhop/connect'])test('protected direct URL '+path,async()=>assert.equal((await deskhopAccess(context(path),session('other'),[owner])).status,403));
test('verification failure never serves private content',async()=>assert.equal((await deskhopAccess(context(),async()=>{throw Error('offline')})).status,503));
test('owner launch validates gateway and rechecks session',async()=>{
 const r=await deskhopAccess(context('/deskhop/connect',{DESKHOP_GATEWAY_URL:'https://desktop.example.com/guacamole/'}),session(owner),[owner]);assert.equal(r.status,302);assert.equal(r.headers.get('Location'),'https://desktop.example.com/guacamole/');assert.match(r.headers.get('Cache-Control'),/no-store/);
});
test('unsafe gateway blocked',async()=>assert.equal((await deskhopAccess(context('/deskhop/connect',{DESKHOP_GATEWAY_URL:'http://desktop.example.com'}),session(owner),[owner])).status,503));
test('unconfigured gateway cannot launch',async()=>assert.equal((await deskhopAccess(context('/deskhop/connect'),session(owner),[owner])).status,503));
test('forged access cookie is rejected by actual account verification',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('{}',{status:401,headers:{'Content-Type':'application/json'}});
 try{const ctx=context();ctx.request=new Request('https://siahverse.cc/deskhop/',{headers:{Cookie:'sv_account_access=forged'}});assert.equal((await deskhopAccess(ctx,undefined,[owner])).status,401);}finally{globalThis.fetch=original;}
});
test('Pages router applies auth before database and static routing',async()=>{
 const {onRequest}=await import('../functions/[[path]].js');
 for(const path of ['/deskhop','/deskhop/','/deskhop/index.html','/deskhop/config.js','/deskhop/connect']){
  const r=await onRequest(context(path));assert.equal(r.status,401,path);assert.match(r.headers.get('Cache-Control'),/no-store/);
 }
});
