import {accountSession} from './account-api.js';
import {gatewayUrl} from '../deskhop/config.js';
import {validateGatewayUrl} from '../deskhop/gateway-url.mjs';
// Verified account IDs only. Empty means nobody is authorized.
export const DESKHOP_OWNER_IDS = [];
const headers = {'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
function page(title,message,status,set=[]){
  const h=new Headers({...headers,'Content-Type':'text/html; charset=utf-8'});
  for(const value of set)h.append('Set-Cookie',value);
  const signin=status===401?`<form id="deskhop-login"><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Sign in</button><p id="login-status" role="status"></p></form><a href="/account/">Manage account or reset password</a><script src="/account-client.js"></script><script src="/deskhop-login.js" defer></script>`:`<a href="/account/">Manage account</a>`;
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · DeskHop</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/deskhop-login.css"><script src="/toggle-theme.js"></script></head><body><main><a href="/">← Siahverse</a><p class="eyebrow">PRIVATE REMOTE DESKTOP</p><h1>${title}</h1><p>${message}</p>${signin}<p>Your PC remains protected by the gateway’s own login and two-factor authentication.</p></main></body></html>`,{status,headers:h});
}
export async function deskhopAccess(context,verify=accountSession,owners=DESKHOP_OWNER_IDS){
  const path=new URL(context.request.url).pathname;
  let state;
  try{state=await verify(context.request);}catch{return page('Sign-in unavailable','Account verification is temporarily unavailable. Try again shortly.',503);}
  if(!state.session)return page('Sign in to DeskHop','Use your Siahverse account. Access is limited to the owner.',401,state.set);
  const configured=(context.env.DESKHOP_OWNER_IDS||'').split(',').map(id=>id.trim()).filter(Boolean);
  const allowed=configured.length?configured:owners;
  if(!allowed.includes(state.session.user.id))return page('Private access only','This account is not authorized to use DeskHop.',403,state.set);
  if(path==='/deskhop/connect'){
    if(context.request.method!=='GET')return new Response('Method not allowed',{status:405,headers});
    let target;try{target=validateGatewayUrl(context.env.DESKHOP_GATEWAY_URL||gatewayUrl);}catch{return page('Setup needed','The gateway address needs configuration.',503,state.set);}
    if(!target)return page('Setup needed','Your remote desktop gateway has not been configured yet.',503,state.set);
    const h=new Headers({...headers,Location:target});for(const value of state.set)h.append('Set-Cookie',value);
    return new Response(null,{status:302,headers:h});
  }
  const response=await context.next();
  const h=new Headers(response.headers);for(const [key,value]of Object.entries(headers))h.set(key,value);for(const value of state.set)h.append('Set-Cookie',value);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
