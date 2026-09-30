(() => {
const legacy=new URLSearchParams(location.search).get('legacy')==='1';
window.SiahverseLegacyTasks=legacy;
window.canEditTasks=()=>legacy?!!localStorage.getItem('adminPassword'):!!window.SiahverseTaskUser;
if(legacy){document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('task-account-status').textContent='Original task list · uses the original editing password.';
  document.getElementById('import-original-tasks').hidden=true;
  document.getElementById('enter-password').textContent='Unlock original list';
  document.getElementById('admin-title').textContent='Unlock original list';
  document.getElementById('admin-title').nextElementSibling.textContent='Enter the original password to edit this list.';
  document.getElementById('login-btn').textContent='Unlock';
});return;}
const nativeFetch=window.fetch.bind(window);let revision=null,queue=Promise.resolve(),generation=0;
window.fetch=(input,init={})=>{
  if(typeof input!=='string'||!/^\/todos(?:\/|$)/.test(input))return nativeFetch(input,init);
  const scheduledGeneration=generation,initial=window.SiahverseTaskUser===undefined;
  const run=async()=>{
    await window.SiahverseAccount.ready;
    await new Promise(resolve=>setTimeout(resolve,0));
    if(!initial&&scheduledGeneration!==generation)throw Error('Your account changed. Reload before editing.');
    const ticket=generation;
    if(ticket!==generation)throw Error('Your account changed. Reload before editing.');
    const headers=new Headers(init.headers);headers.delete('Authorization');headers.set('X-Siahverse-Account','1');
    if(revision!==null)headers.set('X-Task-Revision',revision);
    const response=await nativeFetch(input.replace(/^\/todos/,'/account-todos'),{...init,headers,credentials:'include',cache:'no-store'});
    if(ticket!==generation)throw Error('Your account changed. Reload before editing.');
    if(response.ok){revision=response.headers.get('X-Task-Revision');return response;}
    if(response.status===401&&(init.method||'GET')==='GET')return new Response('[]',{headers:{'Content-Type':'application/json'}});
    const data=await response.json().catch(()=>({}));throw Error(data.error||'Tasks could not be saved.');
  };
  const pending=queue.then(run);queue=pending.catch(()=>{});return pending;
};
window.SiahverseAccount.auth.onAuthStateChange((event,session)=>{
  const id=session?.user.id||null;
  const changed=(window.SiahverseTaskUser?.id||null)!==id;
  if(changed){generation++;revision=null;}
  window.SiahverseTaskUser=session?.user||null;
  const status=document.getElementById('task-account-status');
  if(status)status.textContent=session?'Signed in as '+session.user.email:'Sign in with your Siahverse account to use your private task list.';
  if(changed&&typeof window.SiahverseTasksAccountChanged==='function')window.SiahverseTasksAccountChanged();
});
document.addEventListener('DOMContentLoaded',()=>{
  const status=document.getElementById('task-account-status');
  if(window.SiahverseTaskUser!==undefined)status.textContent=window.SiahverseTaskUser?'Signed in as '+window.SiahverseTaskUser.email:'Sign in with your Siahverse account to use your private task list.';
  document.getElementById('import-original-tasks').onclick=()=>{
    if(!window.SiahverseTaskUser)return location.assign('https://siahverse.cc/account/?app=tasks');
    document.getElementById('admin-modal').style.display='block';
  };
});
window.importOriginalTasks=async password=>{
  await window.fetch('/todos');
  const response=await window.fetch('/todos/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
  return response.json();
};
})();
