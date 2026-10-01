(() => {
if(typeof window==='undefined')return;
if(window.SiahverseAccount)return;
const base='https://siahverse.cc/api/account/', listeners=new Set();
let identity=undefined,lastSession=null,pending=null;
const emit=(event,session)=>{lastSession=session;identity=session?.user.id||null;for(const callback of listeners)setTimeout(()=>callback(event,session),0);};
async function request(path,body){
  const response=await fetch(base+path,{credentials:'include',cache:'no-store',...(body!==undefined?{method:'POST',headers:{'Content-Type':'application/json','X-Siahverse-Account':'1'},body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Account service is unavailable.');return data;
}
const ready=(async()=>{
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.has('access_token')&&hash.has('refresh_token')){
    const tokens={access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token')},recovery=hash.get('type')==='recovery';
    history.replaceState(null,'',location.pathname+location.search);
    const result=await request('callback',tokens);emit(recovery?'PASSWORD_RECOVERY':'SIGNED_IN',result.session);
    window.SiahverseRecovery=recovery;
  }else {const result=await request('session');emit('INITIAL_SESSION',result.session);}
  return lastSession;
})();
ready.catch(()=>{});
async function getSession(){
  if(pending)return pending;
  pending=(async()=>{try{await ready.catch(()=>{});const result=await request('session');if(identity!==(result.session?.user.id||null))emit(result.session?'SIGNED_IN':'SIGNED_OUT',result.session);else lastSession=result.session;return {data:{session:result.session},error:null};}catch(error){return {data:{session:null},error};}})();
  try{return await pending;}finally{pending=null;}
}
async function action(path,body,event){try{await ready.catch(()=>{});const result=await request(path,body);if(event)emit(event,result.session||null);return {data:{...result,user:result.user||result.session?.user||null},error:null};}catch(error){return {data:{},error};}}
const auth={
  getSession,
  signInWithPassword:body=>action('signin',body,'SIGNED_IN'),
  signUp:body=>action('signup',{email:body.email,password:body.password},null),
  resetPasswordForEmail:email=>action('recover',{email},null),
  updateUser:body=>action('password',body,null),
  signOut:()=>action('signout',{},'SIGNED_OUT'),
  onAuthStateChange(callback){listeners.add(callback);ready.then(session=>callback(window.SiahverseRecovery?'PASSWORD_RECOVERY':'INITIAL_SESSION',session)).catch(()=>{});return {data:{subscription:{unsubscribe(){listeners.delete(callback);}}}};}
};
window.SiahverseAccount={auth,ready};
window.addEventListener('focus',()=>void getSession());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void getSession();});
setInterval(()=>{if(!document.hidden)void getSession();},15000);
})();

