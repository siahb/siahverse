const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_MODULE_PATH||'jsdom');
const html=fs.readFileSync('account/index.html','utf8'),script=fs.readFileSync('account/account.js','utf8');
const dom=new JSDOM(html,{url:'https://siahverse.cc/account/',runScripts:'outside-only'}),w=dom.window,d=w.document;
const session={user:{email:'test@example.com'}};let listener;let failure=false;
w.SiahverseAccount={ready:Promise.resolve(null),auth:{onAuthStateChange:fn=>listener=fn,signInWithPassword:async()=>failure?{error:{message:'Invalid credentials'}}:{data:{session}},signUp:async()=>({data:{}}),resetPasswordForEmail:async()=>({data:{}}),updateUser:async()=>({data:{}}),signOut:async()=>({data:{}})}};
w.eval(script);const el=id=>d.getElementById(id),click=mode=>d.querySelector(`[data-mode="${mode}"]`).click();
(async()=>{
assert.equal(el('modes').hidden,false);click('signup');assert.equal(el('password').minLength,10);click('recover');assert.equal(el('passwordRow').hidden,true);click('signin');
failure=true;await el('form').onsubmit({preventDefault(){}});assert.equal(el('status').textContent,'Invalid credentials');assert.equal(el('submit').disabled,false);
failure=false;await el('form').onsubmit({preventDefault(){}});assert.equal(el('signedIn').hidden,false);assert.equal(el('form').hidden,true);assert.equal(el('modes').hidden,true);assert.equal(el('status').hidden,true);assert.equal(el('email').textContent,session.user.email);
listener('SIGNED_IN',session);click('update');assert.equal(el('password').minLength,10);assert.equal(el('back').hidden,false);el('back').click();assert.equal(el('signedIn').hidden,false);
click('update');await el('form').onsubmit({preventDefault(){}});assert.equal(el('signedIn').hidden,false);assert.equal(el('status').textContent,'Password updated.');
await el('signout').onclick();assert.equal(el('signedIn').hidden,true);assert.equal(el('modes').hidden,false);
listener('PASSWORD_RECOVERY',session);assert.equal(el('heading').textContent,'New password');assert.equal(el('form').hidden,false);assert.equal(el('emailRow').hidden,true);
console.log('Account UI: signed-out, signed-in, signup, recovery, password update, errors, and sign-out passed.');w.close();
})();
