(() => {
'use strict';
const $=id=>document.getElementById(id), game=window.NurseDokuProgress, config=window.NURSEDOKU_ACCOUNT_CONFIG;
const metaKey=id=>'nursedoku-sync-'+id;
let client, loading, user=null, ready=false, busy=false, timer, epoch=0, changes=0, conflict=null, recovery=false, switching=false;
const readMeta=id=>{try{return JSON.parse(localStorage.getItem(metaKey(id)))||{};}catch{return {};}};
const writeMeta=(id,value)=>{try{localStorage.setItem(metaKey(id),JSON.stringify(value));}catch{}};
const message=text=>{$('accountStatus').textContent=text;};
function badge(text){$('cloudStatus').textContent=text;}
function draw(){
 if(config.registrationEnabled===false){$('signupOption').disabled=true;$('registrationNote').hidden=false;}
 $('authForm').hidden=!!user&&!recovery;
 $('accountTools').hidden=!user||recovery;
 $('accountEmail').textContent=user?.email||'';
 $('accountBtn').textContent=user?'Account':'Sign in';
 $('syncConflict').hidden=!conflict;
 $('authSubmit').textContent=recovery?'Save new password':$('authMode').value==='signup'?'Create account':'Sign in';
 $('authPassword').autocomplete=recovery||$('authMode').value==='signup'?'new-password':'current-password';
 $('authPassword').minLength=recovery||$('authMode').value==='signup'?8:1;
 $('authEmail').required=!recovery;
 $('authEmailRow').hidden=recovery;
 $('authModeRow').hidden=recovery;
}
function stashDirty(){
 const id=user?.id||game.owner();if(!id)return;
 const m=readMeta(id);m.dirty=true;writeMeta(id,m);
}
function applyProgress(value,id){switching=true;try{game.apply(value,id);}finally{switching=false;}}
function changed(){
 if(switching||!(user?.id||game.owner()))return;
 changes++;stashDirty();badge(navigator.onLine?'Saving…':'Offline · saved on device');
 clearTimeout(timer);timer=setTimeout(()=>sync(),1200);
}
window.NurseDokuCloud={changed};
async function sdk(){
 if(client)return client;
 if(!loading)loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
  script.onload=()=>resolve();script.onerror=()=>{script.remove();loading=null;reject(new Error('Sign-in could not load. Check your connection; guest play still works.'));};
  document.head.append(script);
 }).then(()=>{
  client=window.supabase.createClient(config.url,config.key,{auth:{storageKey:'nursedoku-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  client.auth.onAuthStateChange((event,session)=>{
   if(event==='PASSWORD_RECOVERY'){recovery=true;$('accountDialog').showModal();}
   // Avoid making Auth calls inside its state callback.
   setTimeout(()=>{switchUser(session?.user||null).catch(showError);draw();},0);
  });
  return client;
 });
 return loading;
}
function showError(error){message(error?.message||'Connection failed. Your device save is safe.');badge(user?'Cloud unavailable · saved on device':'Guest · saved on device');}
async function fetchSave(id){
 const {data,error}=await client.from('nursedoku_progress').select('progress,revision,updated_at').eq('user_id',id).maybeSingle();
 if(error)throw error;return data;
}
async function switchUser(next){
 if(user?.id===next?.id && ready)return;
 const ticket=++epoch;ready=false;clearTimeout(timer);conflict=null;
 user=next;draw();
 const id=next?.id||null;
 if(game.owner()!==id)applyProgress(game.readOwner(id),id);
 if(!next){badge('Guest · saved on device');return;}
 badge('Connecting cloud save…');
 try{
  const cloud=await fetchSave(id);if(ticket!==epoch)return;
  const m=readMeta(id);
  if(m.dirty){
   if((cloud?.revision||0)!==(m.revision||0)){conflict=cloud||{revision:0,progress:null};badge('Two saves · choose in Account');}
  }else{
   if(cloud?.progress)applyProgress(cloud.progress,id);
   writeMeta(id,{revision:cloud?.revision||0,dirty:false});
   badge(cloud?'Cloud save loaded':'Cloud ready');
  }
  ready=true;draw();
  if(readMeta(id).dirty&&!conflict)sync();
 }catch(error){
  if(ticket!==epoch)return;
  ready=true;showError(error);
 }
}
async function sync(){
 if(!ready||!user||busy||conflict||!navigator.onLine)return;
 const id=user.id,ticket=epoch,m=readMeta(id);
 if(!m.dirty){badge('Cloud saved');return;}
 busy=true;const captured=changes,progress=game.snapshot();
 badge('Saving…');
 try{
  const revision=m.revision||0;
  let result;
  if(revision)result=await client.from('nursedoku_progress').update({progress,revision:revision+1,updated_at:new Date().toISOString()}).eq('user_id',id).eq('revision',revision).select('revision');
  else result=await client.from('nursedoku_progress').insert({user_id:id,progress,revision:1}).select('revision');
  if(ticket!==epoch)return;
  if(result.error?.code==='23505'||(!result.error&&!result.data?.length)){
   conflict=await fetchSave(id)||{revision:0,progress:null};badge('Two saves · choose in Account');message('Another device changed your cloud save. Choose which active puzzle to keep. Completed shifts will be combined when you keep this device.');draw();return;
  }
  if(result.error)throw result.error;
  const dirty=changes!==captured;
  writeMeta(id,{revision:result.data[0].revision,dirty});
  badge(dirty?'Saving…':'Cloud saved');
  if(dirty){clearTimeout(timer);timer=setTimeout(()=>sync(),1200);}
 }catch(error){if(ticket===epoch)showError(error);}
 finally{busy=false;}
}
function mergeProgress(local,remote){
 const a=local.stats||{},b=remote?.stats||{};
 const best=[a.best,b.best].filter(n=>Number.isFinite(n)&&n>=0);
 return {...local,completed:[...new Set([...(local.completed||[]),...(remote?.completed||[])])],stats:{wins:Math.max(a.wins||0,b.wins||0),best:best.length?Math.min(...best):null,dailyDates:[...new Set([...(a.dailyDates||[]),...(b.dailyDates||[])])]}};
}
async function resolveConflict(keepLocal){
 if(!user)return;
 const id=user.id,ticket=epoch;
 const remote=await fetchSave(id);if(ticket!==epoch)return;
 ready=false;
 const value=keepLocal?mergeProgress(game.snapshot(),remote?.progress):(remote?.progress||{});
 applyProgress(value,id);
 writeMeta(id,{revision:remote?.revision||0,dirty:keepLocal});
 conflict=null;ready=true;changes++;draw();
 if(keepLocal)await sync();else badge('Cloud save loaded');
}
$('accountBtn').addEventListener('click',async()=>{
 game.pause();$('accountDialog').showModal();draw();
 try{await sdk();const {data,error}=await client.auth.getSession();if(error)throw error;await switchUser(data.session?.user||null);}
 catch(error){showError(error);}
});
$('closeAccountBtn').addEventListener('click',()=>$('accountDialog').close());
$('accountDialog').addEventListener('close',()=>{game.resume();$('authPassword').value='';});
$('authMode').addEventListener('change',draw);
$('authForm').addEventListener('submit',async event=>{
 event.preventDefault();$('authSubmit').disabled=true;message('Connecting…');
 try{
  await sdk();
  const email=$('authEmail').value.trim(),password=$('authPassword').value;
  let response;
  if(recovery)response=await client.auth.updateUser({password});
  else if($('authMode').value==='signup')response=await client.auth.signUp({email,password,options:{emailRedirectTo:config.redirect}});
  else response=await client.auth.signInWithPassword({email,password});
  $('authPassword').value='';
  if(response.error)throw response.error;
  if(recovery){recovery=false;message('Password updated.');draw();}
  else if($('authMode').value==='signup'&&!response.data.session)message('Check your email to verify your account, then sign in. Guest progress stays on this device until you import it.');
  else {await switchUser(response.data.user);message('Signed in. Your account save is separate from guest progress.');}
 }catch(error){showError(error);}
 finally{$('authSubmit').disabled=false;}
});
$('forgotPasswordBtn').addEventListener('click',async()=>{
 const email=$('authEmail').value.trim();
 if(!$('authEmail').reportValidity())return;
 try{await sdk();const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:config.redirect});if(error)throw error;message('If an account exists, check your email for the recovery link.');}catch(error){showError(error);}
});
$('syncNowBtn').addEventListener('click',()=>sync());
$('useCloudBtn').addEventListener('click',()=>resolveConflict(false).catch(showError));
$('useDeviceBtn').addEventListener('click',()=>resolveConflict(true).catch(showError));
$('importGuestBtn').addEventListener('click',()=>{
 if(!user||!ready||conflict)return;
 const combined=mergeProgress(game.readOwner(null),game.snapshot());
 ready=false;applyProgress(combined,user.id);ready=true;changed();
 message('Guest completions were combined with your account, and the guest puzzle is now active. The original guest save remains on this device.');
});
$('signOutBtn').addEventListener('click',async()=>{
 if(!client)return;
 try{await sync();const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;await switchUser(null);message('Signed out. Guest progress restored.');}
 catch(error){showError(error);}
});
window.addEventListener('online',()=>{if(user)sync();});
window.addEventListener('offline',()=>badge(user?'Offline · saved on device':'Guest · saved on device'));
draw();badge(game.owner()?'Offline account save · connecting…':'Guest · saved on device');
if(game.owner()||location.hash.includes('access_token')||location.search.includes('code=')){
 sdk().then(async()=>{const {data,error}=await client.auth.getSession();if(error)throw error;await switchUser(data.session?.user||null);}).catch(showError);
}
// Export only for isolated unit tests; no authentication state or tokens.
window.NurseDokuMergeProgress=mergeProgress;
})();
