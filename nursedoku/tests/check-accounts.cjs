const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
(async()=>{
class El {constructor(){this.events={};this.value='';this.hidden=false;this.disabled=false;}addEventListener(n,f){this.events[n]=f;}showModal(){this.open=true;}close(){this.open=false;}reportValidity(){return true;}remove(){}focus(){this.focused=true;}setAttribute(k,v){this[k]=v;}}
const els={},get=id=>els[id]??=new El();get('authMode').value='signin';
const storage={},timers=[];
let owner=null,save={version:2,completed:[],stats:{wins:0,dailyDates:[]},game:{level:0}},cloud=null,nextUser=null,authCallback,conflictOnce=false,writes=0,failRead=false,confirmChoice=true,confirmCalls=0;
const bridge={owner:()=>owner,snapshot:()=>JSON.parse(JSON.stringify(save)),readOwner:id=>id?{version:2,stats:{wins:0},completed:[]}:{version:2,stats:{wins:3,dailyDates:['2026-09-29'],questionHistory:{'nclex-00001':'correct','nclex-00002':'missed'}},completed:[1],game:{level:2}},pause(){},resume(){},apply(v,id){save=JSON.parse(JSON.stringify(v));owner=id;}};
const client={
 auth:{onAuthStateChange(f){authCallback=f;},getSession:async()=>({data:{session:nextUser?{user:nextUser}:null}}),signInWithPassword:async()=>({data:{user:nextUser}}),signOut:async()=>({}),signUp:async()=>({data:{session:null}})},
 from(){let op='read',values,revision;
 const q={select(){return q;},eq(k,v){if(k==='revision')revision=v;return q;},maybeSingle:async()=>failRead?{error:{message:"Temporary cloud connection failure"}}:{data:cloud},insert(v){op='insert';values=v;return q;},update(v){op='update';values=v;return q;},
 then(resolve,reject){return Promise.resolve().then(()=>{
  if(conflictOnce){conflictOnce=false;cloud={progress:{version:2,completed:[4],stats:{wins:4,dailyDates:[]}},revision:9};return {data:[]};}
  if(op==='update'&&cloud.revision!==revision)return {data:[]};
  writes++;cloud={progress:values.progress,revision:values.revision};return {data:[{revision:cloud.revision}]};
 }).then(resolve,reject);}};
 return q;}
};
const context={document:{getElementById:get,createElement:()=>new El(),head:{append(s){s.onload();}}},window:{confirm(){confirmCalls++;return confirmChoice;},NurseDokuProgress:bridge,NURSEDOKU_ACCOUNT_CONFIG:{url:'https://example.supabase.co',key:'sb_publishable_test',redirect:'https://example.com/'},supabase:{createClient:()=>client},SiahverseAccount:{auth:client.auth},addEventListener(){}},navigator:{onLine:true},location:{hash:'',search:''},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},console};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../accounts.js'),'utf8'),context);
nextUser={id:'a',email:'a@example.invalid'};
await get('accountBtn').events.click();
assert.equal(owner,'a');assert.equal(writes,0,'Guest data must not upload on login');
await get('syncNowBtn').events.click();assert.equal(writes,1,'Manual sync creates the first account save');assert.equal(cloud.progress.stats.wins,0,'Guest progress is not silently imported');

confirmChoice=false;const preImport=JSON.stringify(save);get('importGuestBtn').events.click();assert.equal(JSON.stringify(save),preImport);confirmChoice=true;
save.stats.questionHistory={'nclex-00002':'correct','nclex-00003':'seen'};
get('importGuestBtn').events.click();await get('syncNowBtn').events.click();await new Promise(r=>setImmediate(r));
assert.equal(cloud.progress.stats.questionHistory['nclex-00001'],'correct');assert.equal(cloud.progress.stats.questionHistory['nclex-00002'],'correct');assert.equal(cloud.progress.stats.questionHistory['nclex-00003'],'seen');
assert.equal(cloud.progress.stats.wins,3);assert.equal(cloud.progress.game.level,2);
assert(get('accountStatus').textContent.includes('saved in the cloud'));
 const first=cloud.revision;
 await get('syncNowBtn').events.click();assert(get('accountStatus').textContent.includes('already up to date'));assert.equal(cloud.revision,first);
 cloud={progress:{version:2,game:{level:5},completed:[1,2],stats:{wins:5}},revision:first+1};await get('syncNowBtn').events.click();assert.equal(save.game.level,5);assert(get('accountStatus').textContent.includes('Latest cloud progress'));const syncedRevision=cloud.revision;
save.completed.push(2);context.window.NurseDokuCloud.changed();await get('syncNowBtn').events.click();await new Promise(r=>setImmediate(r));
assert.equal(cloud.revision,syncedRevision+1);
conflictOnce=true;save.completed.push(3);context.window.NurseDokuCloud.changed();await get('syncNowBtn').events.click();await new Promise(r=>setImmediate(r));
assert.equal(get('syncConflict').hidden,false);await get('syncNowBtn').events.click();assert(get('accountStatus').textContent.includes('need a choice'));assert.equal(cloud.revision,9);
assert.equal(get('importGuestBtn').disabled,true);assert.equal(get('syncNowBtn').textContent,'Resolve save conflict');assert(get('useCloudBtn').focused);
confirmChoice=false;const preResolve=JSON.stringify(save);await get('useDeviceBtn').events.click();await get('useCloudBtn').events.click();assert.equal(JSON.stringify(save),preResolve);assert.equal(cloud.revision,9);confirmChoice=true;
await get('useDeviceBtn').events.click();await new Promise(r=>setImmediate(r));
assert.equal(cloud.revision,10);assert(cloud.progress.completed.includes(4));assert(cloud.progress.completed.includes(3));
context.navigator.onLine=false;context.window.NurseDokuCloud.changed();const before=writes;await get('syncNowBtn').events.click();await new Promise(r=>setImmediate(r));assert.equal(writes,before);assert(get('accountStatus').textContent.includes('offline'));assert(JSON.parse(storage['nursedoku-sync-a']).dirty);
confirmChoice=false;await get('signOutBtn').events.click();assert.equal(owner,'a');confirmChoice=true;await get('signOutBtn').events.click();assert.equal(owner,null);assert.equal(save.stats.wins,3);
assert.equal(get('syncNowBtn').disabled,false);assert.equal(get('syncNowBtn').textContent,'Sync now');
nextUser={id:'b',email:'b@example.invalid'};failRead=true;context.navigator.onLine=true;
await get('accountBtn').events.click();
assert.equal(get('accountStatus').textContent,'Temporary cloud connection failure');
assert.equal(get('syncNowBtn').disabled,false,'Failed initial fetch must allow manual retry');
assert.equal(get('syncNowBtn').textContent,'Sync now');
failRead=false;await get('syncNowBtn').events.click();assert(get('accountStatus').textContent.includes('Latest cloud progress'));
console.log('PASS: failed initial cloud connection keeps manual retry available.');
console.log('PASS: explicit first save, clean-cloud fetch/restore, up-to-date feedback, conflict and offline messages; login never imports guest automatically; explicit import; revisions; conflict resolution; offline queue; sign-out restores guest.');
})().catch(e=>{console.error(e);process.exit(1);});
