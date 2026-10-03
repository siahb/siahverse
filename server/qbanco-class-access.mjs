// The host must supply its verified nursing session, never browser claims.
export function isClassExamPath(path){
 try{path=decodeURIComponent(path).toLowerCase();}catch{return true;}
 return ['/pharm1','/medsurg1','/qbanco/class-exams'].some(base=>path===base||path.startsWith(base+'/'));
}
export function hasClassAccess(session,config,now=Date.now()){
 if(!session)return false;
 if(session.is_admin)return true;
 try{
  const entries=JSON.parse(config||'[]');
  return Array.isArray(entries)&&entries.some(e=>e&&e.credential_id===session.credential_id&&e.revoked!==true&&e.status==='active'&&typeof e.expires_at==='string'&&Number.isFinite(Date.parse(e.expires_at))&&Date.parse(e.expires_at)>now);
 }catch{return false;}
}
export async function classExamAccess(context,session){
 if(!hasClassAccess(session,context.env.QBANCO_CLASS_ENTITLEMENTS)){
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Class Exams access · QBanco</title><style>body{font:16px/1.6 system-ui;background:#f3f7f6;color:#173630;margin:0}main{max-width:560px;margin:10vh auto;padding:28px}a{display:inline-flex;align-items:center;min-height:48px;color:#086c60;margin-right:20px}</style></head><body><main><p>QBanco · Class Exams</p><h1>Paid access required</h1><p>Class Exams requires approved nursing access and an active Class Exams subscription.</p><p>Purchases are not available yet. Subscription pricing and payment setup are being finalized. One student per account; signing in again ends the previous session.</p><a href="/qbanco/">Back to QBanco</a><a href="/nursing/">Nursing</a></main></body></html>`,{status:402,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Robots-Tag':'noindex'}});
 }
 const response=await context.next();const headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');headers.set('Vary','Cookie');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
