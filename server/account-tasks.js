import {accountSession} from './account-api.js';
import {validTask} from './task-validation.js';

// The original task table stays intact. Every new list belongs to a verified account.
export async function accountTasks({request,env},path){
  const headers=new Headers({'Content-Type':'application/json','Cache-Control':'private, no-store'});
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  try{
    if(!env.DB)return reply({error:'Task storage is unavailable.'},503);
    const state=await accountSession(request);
    for(const value of state.set)headers.append('Set-Cookie',value);
    if(!state.session)return reply({error:'Sign in to see your tasks.'},401);
    const user=state.session.user.id;
    if(request.method!=='GET'&&(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('X-Siahverse-Account')!=='1'))return reply({error:'Request not allowed.'},403);
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS siahverse_account_tasks (user_id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT \'[]\', revision INTEGER NOT NULL DEFAULT 0)').run();
    await env.DB.prepare('INSERT OR IGNORE INTO siahverse_account_tasks (user_id) VALUES (?)').bind(user).run();
    const row=await env.DB.prepare('SELECT data,revision FROM siahverse_account_tasks WHERE user_id=?').bind(user).first();
    headers.set('X-Task-Revision',String(row.revision));
    const tasks=JSON.parse(row.data);
    if(request.method==='GET'&&path==='/account-todos')return reply(tasks);
    if(request.headers.get('X-Task-Revision')!==String(row.revision))return reply({error:'Your task list changed. Reload and try again.'},409);
    let body=null;
    if(request.method!=='DELETE'){const raw=await request.text();if(raw.length>1000000)return reply({error:'Task data is too large.'},413);try{body=JSON.parse(raw);}catch{return reply({error:'Invalid task data.'},400);}}
    let result;
    if(path==='/account-todos/import'&&request.method==='POST'){
      if(tasks.length)return reply({error:'Import is available only when your account list is empty.'},409);
      const expected=env.SIAHDO_ADMIN_PASSWORD;
      if(!expected||typeof body?.password!=='string')return reply({error:'The original task password is required.'},401);
      const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
      const [a,b]=await Promise.all([hash(expected),hash(body.password)]);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
      if(difference)return reply({error:'The original task password is incorrect.'},401);
      const {results}=await env.DB.prepare('SELECT data FROM siahdo_tasks ORDER BY sort_order ASC,id ASC').all();
      tasks.push(...results.map(r=>JSON.parse(r.data)));result={status:'imported',count:tasks.length};
    }else if(path==='/account-todos'&&request.method==='POST'){
      if(typeof body?.text!=='string'||!body.text.trim()||body.text.length>10000)return reply({error:'Enter a task.'},400);
      const task={done:false,...body,text:body.text.trim()};
      if(!validTask(task))return reply({error:'Invalid task fields.'},400);
      tasks.push(task);result={status:'added',todo:task};
    }else if(path==='/account-todos/reorder'&&request.method==='POST'){
      if(!Array.isArray(body)||body.length!==tasks.length)return reply({error:'Reload before reordering.'},409);
      const remaining=tasks.map(t=>JSON.stringify(t));
      for(const task of body){const i=remaining.indexOf(JSON.stringify(task));if(i<0)return reply({error:'Reload before reordering.'},409);remaining.splice(i,1);}
      tasks.splice(0,tasks.length,...body);result={status:'reordered'};
    }else{
      const match=path.match(/^\/account-todos\/(\d+)$/),index=match?Number(match[1]):-1;
      if(index<0||index>=tasks.length)return reply({error:'Task not found.'},404);
      if(request.method==='PATCH'){
        if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'Invalid task.'},400);
        const task={...tasks[index],...body};
        if(!validTask(task))return reply({error:'Invalid task fields.'},400);
        tasks[index]=task;result={status:'updated',todo:task};
      }else if(request.method==='DELETE')result={status:'deleted',removed:tasks.splice(index,1)};
      else return reply({error:'Method not allowed.'},405);
    }
    const saved=await env.DB.prepare('UPDATE siahverse_account_tasks SET data=?,revision=revision+1 WHERE user_id=? AND revision=?').bind(JSON.stringify(tasks),user,row.revision).run();
    if(!saved.meta.changes)return reply({error:'Your task list changed. Reload and try again.'},409);
    headers.set('X-Task-Revision',String(row.revision+1));return reply(result);
  }catch{return reply({error:'Tasks are temporarily unavailable.'},503);}
}
