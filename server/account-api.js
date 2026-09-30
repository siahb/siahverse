const URL = 'https://duimxtfcnbfgpeawzszl.supabase.co';
const KEY = 'sb_publishable_1EPAmQQ4xCiL-HSzh41lbA_AMzRZODY';
const ORIGINS = new Set(['https://siahverse.cc','https://nextset.siahverse.cc','https://todo.siahverse.cc','https://nursing.siahverse.cc']);
const ACCESS = 'sv_account_access', REFRESH = 'sv_account_refresh';
const cookie = (name,value,seconds) => `${name}=${encodeURIComponent(value)}; Domain=siahverse.cc; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${seconds}`;
function cookies(request) {
  const values={};
  for(const part of (request.headers.get('Cookie')||'').split(';')){
    const i=part.indexOf('='),name=part.slice(0,i).trim();
    if(name!==ACCESS&&name!==REFRESH)continue;
    try{values[name]=decodeURIComponent(part.slice(i+1));}catch{}
  }
  return values;
}
async function auth(path,body,token) {
  const response=await fetch(URL+'/auth/v1/'+path,{method:body?'POST':'GET',headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({}));
  return {response,data};
}
export async function accountSession(request) {
  const saved=cookies(request);let access=saved[ACCESS],refresh=saved[REFRESH],renewed=null;
  if(!access&&!refresh)return {session:null,set:[]};
  let result=access?await auth('user',null,access):null;
  if(result?.response.status>=500)throw Error('Account verification is temporarily unavailable.');
  if(!result?.response.ok&&refresh){
    const renewal=await auth('token?grant_type=refresh_token',{refresh_token:refresh});
    if(renewal.response.status>=500)throw Error('Account verification is temporarily unavailable.');
    if(renewal.response.ok){renewed=renewal.data;access=renewed.access_token;refresh=renewed.refresh_token;result=await auth('user',null,access);}
  }
  if(!result?.response.ok||!result.data.id||!result.data.email_confirmed_at)return {session:null,set:[cookie(ACCESS,'',0),cookie(REFRESH,'',0)]};
  return {session:{access_token:access,user:{id:result.data.id,email:result.data.email},expires_at:renewed?.expires_at},set:renewed?[cookie(ACCESS,access,3600),cookie(REFRESH,refresh,60*60*24*30)]:[]};
}
export async function accountApi(context,path) {
  const request=context.request,origin=request.headers.get('Origin');
  const headers=new Headers({'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Origin'});
  if(origin&&ORIGINS.has(origin)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Credentials','true');headers.set('Access-Control-Allow-Headers','Content-Type, X-Siahverse-Account');headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');}
  const reply=(data,status=200,set=[])=>{for(const item of set)headers.append('Set-Cookie',item);return new Response(JSON.stringify(data),{status,headers});};
  if(origin&&!ORIGINS.has(origin))return reply({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return reply({});
  if(path==='session'&&request.method==='GET'){try{const state=await accountSession(request);return reply({session:state.session},200,state.set);}catch{return reply({error:'Account verification is temporarily unavailable.'},503);}}
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  if(!origin||!ORIGINS.has(origin)||request.headers.get('X-Siahverse-Account')!=='1')return reply({error:'Request not allowed'},403);
  let body;try{const raw=await request.text();if(raw.length>12000)throw Error();body=JSON.parse(raw);}catch{return reply({error:'Invalid request'},400);}
  try {
    if(path==='signout'){
      const saved=cookies(request);
      if(saved[ACCESS])try{await auth('logout?scope=local',{},saved[ACCESS]);}catch{}
      return reply({},200,[cookie(ACCESS,'',0),cookie(REFRESH,'',0)]);
    }
    if(path==='password'){
      if(typeof body.password!=='string'||body.password.length<12||body.password.length>1024)return reply({error:'Use 12 to 1024 characters.'},400);
      const state=await accountSession(request);if(!state.session)return reply({error:'Sign in first.'},401);
      const response=await fetch(URL+'/auth/v1/user',{method:'PUT',headers:{apikey:KEY,Authorization:'Bearer '+state.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({password:body.password})});
      return reply(response.ok?{user:state.session.user}:{error:'Password could not be updated.'},response.ok?200:400,state.set);
    }
    if(path==='callback'){
      if(typeof body.access_token!=='string'||typeof body.refresh_token!=='string')return reply({error:'Invalid confirmation link.'},400);
      const result=await auth('user',null,body.access_token);
      if(!result.response.ok||!result.data.email_confirmed_at)return reply({error:'This link is invalid or expired.'},401);
      // The refresh token must identify the same verified user as the callback access token.
      const renewed=await auth('token?grant_type=refresh_token',{refresh_token:body.refresh_token});
      if(!renewed.response.ok||renewed.data.user?.id!==result.data.id)return reply({error:'This link is invalid or expired.'},401);
      return reply({session:{access_token:renewed.data.access_token,user:{id:result.data.id,email:result.data.email}}},200,[cookie(ACCESS,renewed.data.access_token,3600),cookie(REFRESH,renewed.data.refresh_token,2592000)]);
    }
    if(!['signin','signup','recover'].includes(path))return reply({error:'Not found'},404);
    if(typeof body.email!=='string'||body.email.length>254||!body.email.includes('@'))return reply({error:'Enter a valid email address.'},400);
    if(path!=='recover'&&(typeof body.password!=='string'||body.password.length>1024||!body.password))return reply({error:'Enter your password.'},400);
    if(path==='signup'&&body.password.length<12)return reply({error:'Use at least 12 characters.'},400);
    const redirect='https://siahverse.cc/account/';
    const target=path==='signin'?'token?grant_type=password':path==='signup'?'signup?redirect_to='+encodeURIComponent(redirect):'recover?redirect_to='+encodeURIComponent(redirect);
    const result=await auth(target,{email:body.email.trim(),...(path!=='recover'?{password:body.password}:{})});
    if(!result.response.ok)return reply({error:path==='signin'?'Email or password is incorrect.':(result.response.status===429?'Please wait before trying again.':'Account email could not be sent. Please try again later.')},result.response.status===429?429:400);
    const s=result.data;
    if(s.access_token&&(!s.user?.id||!s.user.email_confirmed_at))return reply({error:'Confirm your email before signing in.'},401);
    return reply({session:s.access_token?{access_token:s.access_token,user:{id:s.user.id,email:s.user.email}}:null,user:s.user?{id:s.user.id,email:s.user.email}:null},200,s.access_token?[cookie(ACCESS,s.access_token,3600),cookie(REFRESH,s.refresh_token,2592000)]:[]);
  }catch{return reply({error:'Account service is temporarily unavailable.'},503);}
}
