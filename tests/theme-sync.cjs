const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('toggle-theme.js','utf8');let cookie='';
function page(host,id,legacy='light'){
 const listeners={},events={},timer=[],attrs={},control={type:id.includes('toggle-theme')?'checkbox':'button',checked:false,setAttribute(k,v){attrs[k]=v},addEventListener(k,f){listeners[k]=f}};
 const root={dataset:{},style:{}};
 const document={documentElement:root,body:{classList:{toggle(){}}},hidden:false,readyState:'complete',getElementById(k){return k===id?control:null},querySelector(){return null},addEventListener(k,f){events[k]=f}};
 Object.defineProperty(document,'cookie',{get(){return cookie},set(v){cookie=v.split(';')[0];assert(v.includes('Domain=siahverse.cc'));assert(v.includes('Path=/'));assert(v.includes('Secure'));}});
 const window={matchMedia(){return {matches:false,addEventListener(){}}},addEventListener(k,f){events[k]=f},setInterval(f){timer.push(f)}};
 vm.runInNewContext(source,{document,window,location:{hostname:host},localStorage:{getItem(){return legacy},setItem(){}}});
 return {root,window,events,timer,control,toggle(){if(control.type==='checkbox'){control.checked=!control.checked;listeners.change()}else listeners.click()}};
}
const home=page('siahverse.cc','toggle-theme');assert.equal(home.root.dataset.theme,'light');home.toggle();assert.equal(cookie,'sv_theme=dark');
const task=page('todo.siahverse.cc','toggle-theme-checkbox','light');assert.equal(task.root.dataset.theme,'dark');task.toggle();assert.equal(cookie,'sv_theme=light');home.events.focus();assert.equal(home.root.dataset.theme,'light');
const game=page('siahverse.cc','appearanceBtn','dark');assert.equal(game.root.dataset.appearance,'light');game.toggle();assert.equal(cookie,'sv_theme=dark');task.timer[0]();assert.equal(task.root.dataset.theme,'dark');
const pharm=page('siahverse.cc','themeToggle','light');assert.equal(pharm.root.dataset.theme,'dark');pharm.toggle();home.events.pageshow();assert.equal(home.root.dataset.theme,'light');assert.equal(page('nursing.siahverse.cc','sharedThemeToggle','dark').root.dataset.theme,'light');
assert.equal(fs.readFileSync('public/theme.js','utf8'),source);assert.equal(fs.readFileSync('nursedoku/appearance.js','utf8'),source);
console.log('PASS: homepage → Tasks → homepage; NurseDoku → Tasks; Pharmacology → Nursing; reload, stale legacy preferences, tab refresh, shared domain/path and all controller copies.');
