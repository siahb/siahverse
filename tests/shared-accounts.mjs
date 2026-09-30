import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {accountApi,accountSession} from '../server/account-api.js';
import {accountTasks} from '../server/account-tasks.js';
import {onRequest} from '../functions/[[path]].js';

const sqlite=new DatabaseSync(':memory:');
const DB={prepare(sql){let values=[];return {bind(...v){values=v;return this;},async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};},async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return {results:sqlite.prepare(sql).all(...values)};}};}};
sqlite.exec('CREATE TABLE siahdo_tasks (id INTEGER PRIMARY KEY, sort_order INTEGER, data TEXT)');
sqlite.prepare('INSERT INTO siahdo_tasks VALUES (1,0,?)').run(JSON.stringify({text:'Original task',done:false}));
let outage=false;const revoked=new Set();
const user=id=>({id,email:id+'@example.test',email_confirmed_at:'2026-09-30'});
globalThis.fetch=async(input,init={})=>{
  if(outage)return Response.json({error:'unavailable'},{status:503});
  const url=new URL(input),path=url.pathname,body=init.body?JSON.parse(init.body):{},token=new Headers(init.headers).get('Authorization')?.slice(7);
  if(path.endsWith('/user'))return token?.startsWith('access-')&&!revoked.has(token)?Response.json(user(token.slice(7))):Response.json({error:'expired'},{status:401});
  if(path.endsWith('/logout')){revoked.add(token);return Response.json({});}
  if(path.endsWith('/token')){
    const id=url.searchParams.get('grant_type')==='password'?body.email.split('@')[0]:body.refresh_token?.slice(8);
    if(!id)return Response.json({error:'invalid'},{status:400});
    return Response.json({access_token:'access-'+id,refresh_token:'refresh-'+id,user:user(id)});
  }
  throw Error('Unexpected upstream request '+url);
};
const jar=new Map();
const cookieHeader=()=>[...jar].map(([k,v])=>k+'='+v).join('; ');
async function api(path,body,origin='https://siahverse.cc'){
  const request=new Request('https://siahverse.cc/api/account/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,Cookie:cookieHeader(),'X-Siahverse-Account':'1','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const response=await accountApi({request},path);
  for(const value of response.headers.getSetCookie()){assert.match(value,/Domain=siahverse\.cc/);assert.match(value,/HttpOnly/);assert.match(value,/Secure/);const [pair]=value.split(';'),i=pair.indexOf('=');if(value.includes('Max-Age=0'))jar.delete(pair.slice(0,i));else jar.set(pair.slice(0,i),pair.slice(i+1));}
  return response;
}
assert.equal((await api('session')).status,200);
assert.equal((await api('signin',{email:'a@example.test',password:'correct'},'https://evil.example')).status,403);
assert.equal((await api('signin',{email:'a@example.test',password:'correct'})).status,200);
for(const host of ['siahverse.cc','todo.siahverse.cc','nextset.siahverse.cc'])assert.equal((await accountSession(new Request('https://'+host,{headers:{Cookie:cookieHeader()}}))).session.user.id,'a');
assert.equal((await api('callback',{access_token:'access-a',refresh_token:'refresh-b'})).status,401);
jar.set('sv_account_access','expired');const renewed=await api('session');assert.equal((await renewed.json()).session.user.id,'a');assert.equal(jar.get('sv_account_access'),'access-a');
outage=true;assert.equal((await api('session')).status,503);assert.equal(jar.get('sv_account_refresh'),'refresh-a');outage=false;

async function tasks(method,path='/account-todos',body,revision,origin='https://todo.siahverse.cc'){
  const headers={Cookie:cookieHeader(),Origin:origin,'X-Siahverse-Account':'1','Content-Type':'application/json'};if(revision!==undefined)headers['X-Task-Revision']=String(revision);
  return accountTasks({request:new Request('https://todo.siahverse.cc'+path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})}),env:{DB,SIAHDO_ADMIN_PASSWORD:'old-password'}},path);
}
assert.deepEqual(await (await tasks('GET')).json(),[]);
assert.equal((await tasks('POST','/account-todos',{text:'Private A'},0)).status,200);
assert.equal((await tasks('PATCH','/account-todos/0',{done:true},0)).status,409);
assert.equal((await tasks('POST','/account-todos',{text:'CSRF'},1,'https://evil.example')).status,403);
assert.equal((await tasks('POST','/account-todos/reorder',[],1)).status,409);
await api('signin',{email:'b@example.test',password:'correct'});
assert.deepEqual(await (await tasks('GET')).json(),[]);
assert.equal((await tasks('POST','/account-todos/import',{password:'wrong'},0)).status,401);
assert.equal((await tasks('POST','/account-todos/import',{password:'old-password'},0)).status,200);
assert.equal((await tasks('POST','/account-todos/import',{password:'old-password'},1)).status,409);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM siahdo_tasks').get().n,1);
await api('signin',{email:'a@example.test',password:'correct'});
assert.equal((await (await tasks('GET')).json())[0].text,'Private A');
assert.equal((await tasks('DELETE','/account-todos/0',undefined,1)).status,200);

const source=readFileSync('account-client.js','utf8');
assert.equal(readFileSync('nursedoku/shared-account.js','utf8'),source);
assert.equal(readFileSync('public/account-client.js','utf8'),source);
const settle=()=>new Promise(resolve=>setTimeout(resolve,15));
function browser(host){
  const listeners={},document={hidden:false,addEventListener(name,fn){listeners[name]=fn;}};
  const window={addEventListener(name,fn){listeners[name]=fn;}};
  const fetch=async(url,init={})=>api(new URL(url).pathname.split('/').pop(),init.body?JSON.parse(init.body):undefined,'https://'+host);
  vm.runInNewContext(source,{window,document,location:{hash:'',pathname:'/',search:''},history:{replaceState(){}},fetch,URLSearchParams,setTimeout,setInterval(){}});
  return {auth:window.SiahverseAccount.auth,ready:window.SiahverseAccount.ready,listeners};
}
const nurse=browser('siahverse.cc');await nurse.ready;
assert.equal((await nurse.auth.signInWithPassword({email:'shared@example.test',password:'correct'})).error,null);
const next=browser('nextset.siahverse.cc'),task=browser('todo.siahverse.cc');await Promise.all([next.ready,task.ready]);
assert.equal((await next.auth.getSession()).data.session.user.id,'shared');assert.equal((await task.auth.getSession()).data.session.user.id,'shared');
let nextUser='shared';next.auth.onAuthStateChange((_event,session)=>nextUser=session?.user.id||null);await settle();
assert.equal((await task.auth.signOut()).error,null);nurse.listeners.focus();next.listeners.focus();await settle();assert.equal(nextUser,null);assert.equal((await nurse.auth.getSession()).data.session,null);
assert.equal((await tasks('GET')).status,401);
outage=true;jar.set('sv_account_access','access-a');assert.equal((await api('signout',{})).status,200);assert.equal(jar.size,0);outage=false;
assert.equal((await onRequest({request:new Request('https://siahverse.cc/api/account/session'),env:{},next(){throw Error('Wrong route');}})).status,200);
sqlite.close();
console.log('PASS: cross-app login/logout, refresh, outage handling, secure cookies, CSRF, callback identity, two-user task isolation, stale-write protection, original-list import, and account route.');
