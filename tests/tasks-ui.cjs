const {JSDOM}=require(process.env.JSDOM_MODULE_PATH || 'jsdom');
const fs=require('node:fs'),assert=require('node:assert/strict');
const root=require('node:path').join(__dirname,'..');
const copy=value=>JSON.parse(JSON.stringify(value));
const results=[];
const tick=()=>new Promise(resolve=>setTimeout(resolve,40));
async function fixture(seed=[],account=false){
 const dom=new JSDOM(fs.readFileSync(root+'/public/index.html','utf8'),{url:'https://todo.siahverse.cc/'+(account?'':'?legacy=1'),runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let tasks=copy(seed),revision=0,fail=null,callback,drag;
 const writes=[],alerts=[];
 w.alert=value=>alerts.push(String(value));w.Headers=Headers;w.Response=Response;
 w.HTMLCanvasElement.prototype.getContext=()=>({clearRect(){},beginPath(){},arc(){},fill(){}});
 w.Sortable=class{constructor(_list,options){drag=options;}destroy(){drag=null;}};
 w.localStorage.setItem('adminPassword','test-only');
 w.SiahverseAccount={ready:Promise.resolve(),auth:{onAuthStateChange(fn){callback=fn;setTimeout(()=>fn('SIGNED_IN',{user:{id:'qa',email:'qa@example.test'}}),0);},async signOut(){callback('SIGNED_OUT',null);return {error:null};}}};
 w.fetch=async(path,init={})=>{
  const method=init.method||'GET',route=path.replace('/account-todos','/todos');
  if(route==='/todos/auth-check')return new Response('{"ok":true}');
  if(account&&!w.SiahverseTaskUser)return new Response('{"error":"Sign in"}',{status:401});
  if(method==='GET')return new Response(JSON.stringify(tasks),{headers:{'X-Task-Revision':String(revision)}});
  writes.push({method,path,body:init.body&&JSON.parse(init.body)});
  if(fail&&fail.method===method&&(!fail.path||route===fail.path)){const item=fail;fail=null;if(item.throw)throw Error('Offline');return new Response('{"error":"Rejected"}',{status:item.status||503});}
  if(account&&new Headers(init.headers).get('X-Task-Revision')!==String(revision))return new Response('{"error":"Stale list"}',{status:409});
  const body=init.body&&JSON.parse(init.body);let data;
  if(route==='/todos/reorder'){
   const remaining=tasks.map(t=>JSON.stringify(t));
   if(!Array.isArray(body)||body.length!==tasks.length||body.some(t=>{let i=remaining.indexOf(JSON.stringify(t));if(i<0)return true;remaining.splice(i,1);return false;}))return new Response('{"error":"Incomplete reorder"}',{status:409});
   tasks=copy(body);data={status:'reordered'};
  }else if(route==='/todos'&&method==='POST'){const task={done:false,...body};tasks.push(task);data={todo:task};}
  else{const index=Number(route.split('/').pop());if(method==='PATCH'){tasks[index]={...tasks[index],...body};data={todo:tasks[index]};}else if(method==='DELETE')data={removed:tasks.splice(index,1)};}
  revision++;return new Response(JSON.stringify(data),{headers:{'X-Task-Revision':String(revision)}});
 };
 w.eval(fs.readFileSync(root+'/public/task-account.js','utf8'));
 w.eval(fs.readFileSync(root+'/public/todo.js','utf8'));
 await tick();
 return {w,dom,tasks:()=>tasks,writes,alerts,setFail:value=>fail=value,drag:()=>drag,changeUser:()=>callback('SIGNED_IN',{user:{id:'other',email:'other@example.test'}}),close:()=>w.close()};
}
async function check(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(error){results.push({name,status:'FAIL',error:error.message});}}
(async()=>{
 for(const account of [false,true]){
 const prefix=account?'Account':'Original';
 const today=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
 const tomorrow=new Date(today);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);const tomorrowISO=tomorrow.toISOString().slice(0,10);
 const initial=[{text:'Alpha',done:false,due:today,tags:['work'],priority:'H'},{text:'Beta',done:false,due:'2099-01-01',tags:[]},{text:'Complete',done:true}];
 const f=await fixture(initial,account),d=f.w.document;
 await check(prefix+' initial loading, totals, and read-only GET',async()=>{assert.equal(d.querySelectorAll('#todo-list li').length,2);assert.equal(d.querySelectorAll('#done-list li').length,1);assert.equal(f.writes.length,0);});
 await check(prefix+' search, priority search, and focus filter',async()=>{
  d.querySelector('#search-toggle').click();d.querySelector('#search-input').value='high';d.querySelector('#search-input').dispatchEvent(new f.w.Event('input'));assert.equal(d.querySelectorAll('#todo-list li').length,1);
  d.querySelector('#search-input').value='';d.querySelector('#search-input').dispatchEvent(new f.w.Event('input'));
  d.querySelector('[data-task-view="today"]').click();assert.equal(d.querySelectorAll('#todo-list li').length,1);
 });
 await check(prefix+' filtered reorder retains hidden and completed tasks',async()=>{d.querySelector('#save-order').click();await tick();assert.deepEqual(f.tasks(),initial);d.querySelector('[data-task-view="all"]').click();});
 await check(prefix+' edit preserves literal quotes and markup',async()=>{
  f.w.editTodo(0);const text='Buy "milk" & <b data-qa="text">bread</b>';
  d.querySelector('.edit-text').value=text;d.querySelector('.btn-save').click();await tick();assert.equal(f.tasks()[0].text,text);assert.equal(d.querySelector('.todo-text').textContent,text);assert.equal(d.querySelector('[data-qa]'),null);
  f.w.editTodo(0);assert.equal(d.querySelector('.edit-text').value,text);d.querySelector('.btn-cancel').click();
 });
 await check(prefix+' complete and reopen',async()=>{await f.w.markAsDone(0);assert.equal(f.tasks()[0].done,true);await f.w.unmarkDone(0);assert.equal(f.tasks()[0].done,false);});
 await check(prefix+' failed delete does not create a duplicate on Undo',async()=>{
  f.setFail({method:'DELETE'});f.w.removeTodo(0);d.querySelector('#confirm-delete-btn').click();await tick();d.querySelector('#cancel-delete-btn').click();d.querySelector('#undo-btn').click();await tick();assert.equal(f.tasks().length,3);
 });
 await check(prefix+' successful delete, failed Undo, and retry',async()=>{
  f.w.removeTodo(0);d.querySelector('#confirm-delete-btn').click();await tick();assert.equal(f.tasks().length,2);
  f.setFail({method:'POST',path:'/todos'});d.querySelector('#undo-btn').click();await tick();assert.equal(f.tasks().length,2);
  d.querySelector('#undo-btn').click();await tick();assert.equal(f.tasks().length,3);
 });
 await check(prefix+' repeating add completes exactly one occurrence',async()=>{
  d.querySelector('#todo-input').value='Daily QA';d.querySelector('#due-input').value=today;d.querySelector('#repeat-select').value='daily';d.querySelector('#add-task-btn').click();await tick();const index=f.tasks().findIndex(t=>t.text==='Daily QA');assert.equal(f.tasks()[index].nextDue,today);
  await f.w.markAsDone(index);assert.equal(f.tasks()[index].due,tomorrowISO);assert.equal(f.tasks()[index].done,false);
 });
 await check(prefix+' repeat Undo retains identity after deleting earlier index',async()=>{
  f.w.removeTodo(0);d.querySelector('#confirm-delete-btn').click();await tick();d.querySelector('#undo-btn').click();await tick();assert.equal(f.tasks().find(t=>t.text==='Daily QA').due,today);
 });
  await check(prefix+' failed reorder does not hide or lose tasks',async()=>{
  f.setFail({method:'POST',path:'/todos/reorder'});d.querySelector('#save-order').click();await tick();assert.equal(d.querySelectorAll('#todo-list li').length,f.tasks().filter(t=>!t.done).length);
  });
 await check(prefix+' drag saves complete list and retains archived tasks',async()=>{
  d.querySelector('[data-task-view="all"]').click();d.querySelector('#toggle-drag').click();const before=copy(f.tasks());
  const list=d.querySelector('#todo-list');list.appendChild(list.firstElementChild);await f.drag().onEnd();assert.equal(f.tasks().length,before.length);
  assert.deepEqual(f.tasks().filter(t=>t.done),before.filter(t=>t.done));d.querySelector('#toggle-drag').click();
 });
 if(account)await check('Account switch resets selection, drag, and modal state',async()=>{
  d.querySelector('#select-mode-btn').click();d.querySelector('#toggle-drag').click();f.changeUser();await tick();assert.equal(d.body.classList.contains('select-mode-active'),false);assert.equal(d.body.classList.contains('dragging-active'),false);assert.equal(f.drag(),null);
 });
 f.close();
 }
 await check('Collapsed archive is excluded from Select all and bulk delete',async()=>{
  const f=await fixture([{text:'Open A',done:false},{text:'Open B',done:false},{text:'Archive',done:true}]),d=f.w.document;
  d.querySelector('#select-mode-btn').click();d.querySelector('#select-all').click();assert.equal(d.querySelector('#done-list .select-todo').checked,false);
  f.w.deleteSelected();d.querySelector('#confirm-delete-btn').click();await tick();assert.deepEqual(f.tasks(),[{text:'Archive',done:true}]);d.querySelector('#undo-btn').click();await tick();assert.equal(f.tasks().length,3);f.close();
 });
 await check('All sort modes, weekly repeat, and keyboard archive control',async()=>{
  const f=await fixture([{text:'Zebra',done:false,tags:['z'],priority:'L',createdAt:1,due:'2099-02-02'},{text:'Alpha',done:false,tags:['a'],priority:'H',createdAt:2,due:'2099-01-01'},{text:'Done',done:true}]),d=f.w.document;
  for(const [mode,first] of [['alpha','Alpha'],['priority','Alpha'],['dueAsc','Alpha'],['dueDesc','Zebra'],['tagsAZ','Alpha'],['created','Alpha'],['default','Zebra']]){d.querySelector('#sort-select').value=mode;d.querySelector('#sort-select').dispatchEvent(new f.w.Event('change'));assert.equal(d.querySelector('#todo-list .todo-text').textContent,first);}
  const heading=d.querySelector('.done-heading');heading.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Enter'}));assert.equal(heading.getAttribute('aria-expanded'),'true');heading.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:' '}));assert.equal(heading.getAttribute('aria-expanded'),'false');
  d.querySelector('#todo-input').value='Weekly';d.querySelector('#due-input').value='2099-01-01';d.querySelector('#repeat-select').value='weekly';d.querySelector('#interval-input').value='2';d.querySelector('#add-task-btn').click();await tick();await f.w.markAsDone(3);assert.equal(f.tasks()[3].due,'2099-01-15');f.close();
 });
 await check('Late list response cannot replace a newer account load',async()=>{
  const f=await fixture(),d=f.w.document,pending=[];f.w.fetch=()=>new Promise(resolve=>pending.push(resolve));
  f.w.SiahverseTasksAccountChanged();f.w.SiahverseTasksAccountChanged();pending[1](new Response('[{"text":"New list","done":false}]'));await tick();pending[0](new Response('[{"text":"Old list","done":false}]'));await tick();assert.equal(d.querySelector('.todo-text').textContent,'New list');f.close();
 });
 await check('Overdue repeat loading never writes or advances existing dates',async()=>{
  const f=await fixture([{text:'Overdue',done:false,due:'2026-03-08',nextDue:'2026-03-08',repeat:{freq:'daily',interval:1}}]);assert.equal(f.writes.length,0);assert.equal(f.tasks()[0].due,'2026-03-08');f.close();
 });
 if(process.env.TASKS_QA_REPORT)fs.writeFileSync(process.env.TASKS_QA_REPORT,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
})();
