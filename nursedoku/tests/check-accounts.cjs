const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
(async()=>{
class El {constructor(){this.events={};this.value='';this.hidden=false;this.disabled=false;}addEventListener(n,f){this.events[n]=f;}showModal(){this.open=true;}close(){this.open=false;}reportValidity(){return true;}remove(){}}
const els={},get=id=>els[id]??=new El();get('authMode').value='signin';
const storage={},timers=[];
let owner=null,save={version:2,completed:[],stats:{wins:0,dailyDates:[]},game:{level:0}},cloud=null,nextUser=null,authCallback,conflictOnce=false,writes=0;
const bridge={owner:()=>owner,snapshot:()=>JSON.parse(JSON.stringify(save)),readOwner:id=>id?{version:2,stats:{wins:0},completed:[]}:{version:2,stats:{wins:3,dailyDates:['2026-09-29']},completed:[1],game:{level:2}},pause(){},resume(){},apply(v,id){save=JSON.parse(JSON.stringify(v));owner=id;}};
const client={
 auth:{onAuthStateChange(f){authCallback=f;},getSession:async()=>({data:{session:nextUser?{user:nextUser}:null}}),signInWithPassword:async()=>({data:{user:nextUser}}),signOut:async()=>({}),signUp:async()=>({data:{session:null}})},
 from(){let op='read',values,revision;
 const q={select(){return q;},eq(k,v){if(k==='revision')revision=v;return q;},maybeSingle:async()=>({data:cloud}),insert(v){op='insert';values=v;return q;},update(v){op='update';values=v;return q;},
 then(resolve,reject){return Promise.resolve().then(()=>{
  if(conflictOnce){conflictOnce=false;cloud={progress:{version:2,completed:[4],stats:{wins:4,dailyDates:[]}},revision:9};return {data:[]};}
  if(op==='update'&&cloud.revision!==revision)return {data:[]};
  writes++;cloud={progress:values.progress,revision:values.revision};return {data:[{revision:cloud.revision}]};
 }).then(resolve,reject);}};
 return q;}
};
const context={document:{getElementById:get,createElement:()=>new El(),head:{append(s){s.onload();}}},window:{NurseDokuProgress:bridge,NURSEDOKU_ACCOUNT_CONFIG:{url:'https://example.supabase.co',key:'sb_publishable_test',redirect:'https://example.com/'},supabase:{createClient:()=>client},addEventListener(){}},navigator:{onLine:true},location:{hash:'',search:''},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},console};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../accounts.js'),'utf8'),context);
nextUser={id:'a',email:'a@example.invalid'};
await get('accountBtn').events.click();
assert.equal(owner,'a');assert.equal(writes,0,'Guest data must not upload on login');
get('importGuestBtn').events.click();await get('syncNowBtn').events.click();await new Promise(r=>setImmediate(r));
assert.equal(cloud.progress.stats.wins,3);assert.equal(cloud.progress.game.level,2);
const first=cloud.revision;
save.completed.push(2);context.window.NurseDokuCloud.changed();await get('syncNowBtn').events.click();await new Promise(r=>setImmediate(r));
assert.equal(cloud.revision,first+1);
conflictOnce=true;save.completed.push(3);context.window.NurseDokuCloud.changed();await get('syncNowBtn').events.click();await new Promise(r=>setImmediate(r));
assert.equal(get('syncConflict').hidden,false);assert.equal(cloud.revision,9);
await get('useDeviceBtn').events.click();await new Promise(r=>setImmediate(r));
assert.equal(cloud.revision,10);assert(cloud.progress.completed.includes(4));assert(cloud.progress.completed.includes(3));
context.navigator.onLine=false;context.window.NurseDokuCloud.changed();const before=writes;await get('syncNowBtn').events.click();await new Promise(r=>setImmediate(r));assert.equal(writes,before);assert(JSON.parse(storage['nursedoku-sync-a']).dirty);
await get('signOutBtn').events.click();assert.equal(owner,null);assert.equal(save.stats.wins,3);
console.log('PASS: login never imports guest automatically; explicit import; revisions; conflict resolution; offline queue; sign-out restores guest.');
})().catch(e=>{console.error(e);process.exit(1);});
