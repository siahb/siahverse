const fs=require('fs'),vm=require('vm'),assert=require('assert');
class El {constructor(){this.children=[];this.dataset={};this.style={setProperty(){}};this.classList={toggle(){},add(){}};this.events={};this.open=false;}set innerHTML(v){this.children=[];} get innerHTML(){return '';}append(x){this.children.push(x);}before(){}contains(x){return this.children.includes(x);}setAttribute(k,v){(this.attributes??={})[k]=v;}addEventListener(n,f){(this.events[n]??=[]).push(f);}showModal(){this.open=true;}close(){this.open=false;}focus(){}setPointerCapture(){}hasPointerCapture(){return false;}releasePointerCapture(){}}
const els={};const get=id=>els[id]??=new El();get('difficulty').value='6';
const storage={};let hit=null,timerId=0;const timers=new Map();
const doc={getElementById:get,createElement:()=>new El(),querySelector:()=>new El(),querySelectorAll:()=>[],addEventListener(){},hidden:false,documentElement:new El(),elementFromPoint:()=>hit};
const context={document:doc,window:{addEventListener(){}},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},setInterval(){},setTimeout(f,ms){timers.set(++timerId,{f,ms});return timerId;},clearTimeout(id){timers.delete(id)},confirm:()=>true,Date,console,navigator:{},location:{protocol:'file:'}};
vm.createContext(context);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../large-puzzles.js'),'utf8')+'\n'+fs.readFileSync(require('path').join(__dirname,'../puzzles.js'),'utf8')+'\n'+fs.readFileSync(require('path').join(__dirname,'../app.js'),'utf8'),context);
function run(code){return vm.runInContext(code,context);}
assert.equal(run('inGame'),false);assert.equal(run('runningSince'),null);assert.equal(get('gameView').hidden,undefined);
get('closeChangelogBtn').events.click[0]();get('changelogDialog').events.close[0]();
assert.equal(storage['nursedoku-changelog'],'2026-09-29-menu-and-flow');
get('continueBtn').events.click[0]();assert.equal(run('inGame'),true);assert.notEqual(run('runningSince'),null);
const evt={pointerId:1,isPrimary:true,button:0,clientX:10,clientY:10,preventDefault(){}};
hit=get('board').children[0];hit.closest=()=>hit;
function emit(n,e=evt){get('board').events[n].forEach(f=>f(e));}
emit('pointerdown');emit('pointerup');run('flushTap()');assert.equal(run('state[0][0]'),'x');
emit('pointerdown');emit('pointerup');emit('pointerdown');emit('pointerup');assert.equal(run('state[0][0]'),'rn');
// RN survives a drag; other cells become X; one Undo reverses the stroke.
run('history=[]');emit('pointerdown');hit=get('board').children[1];hit.closest=()=>hit;emit('pointermove',{...evt,clientX:80});emit('pointerup');assert.equal(run('state[0][0]'),'rn');assert.equal(run('state[0][1]'),'x');assert.equal(run('history.length'),1);
get('undoBtn').events.click[0]();assert.equal(run('state[0][1]'),'');assert.equal(run('state[0][0]'),'rn');
run('state=blank();puzzle().solution.forEach((c,r)=>state[r][c]="rn");afterMove()');assert.equal(run('finished'),true);assert.equal(get('winDialog').open,false);assert.equal(run('stats.wins'),1);
const winDelay=[...timers.values()].find(t=>t.ms===2000);assert(winDelay);winDelay.f();assert.equal(get('winDialog').open,true);
get('bonusAnswers').children[0].onclick();assert.equal(get('playAgainBtn').disabled,true);get('confirmBonusBtn').onclick();assert.equal(get('playAgainBtn').disabled,false);
assert.equal(JSON.parse(storage['nursedoku-v2']).finished,true);
let notes=0;
context.window.AudioContext=class {
 constructor(){this.state='running';this.currentTime=0;this.destination={};}
 createOscillator(){notes++;return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};}
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
};
run("soundEnabled=true;sound('rn')");assert.equal(notes,2);
run("soundEnabled=false;sound('rn')");assert.equal(notes,2);
run("updateSoundButton()");assert.equal(get('soundBtn').attributes['data-muted'],'true');assert.equal(get('soundBtn').attributes['aria-label'],'Enable game sounds');
run('soundEnabled=true;updateSoundButton()');assert.equal(get('soundBtn').attributes['data-muted'],'false');assert.equal(get('soundBtn').attributes['aria-label'],'Mute game sounds');
console.log('PASS: original audio synthesis, mute suppresses audio, mute control reflects state.');
console.log('PASS: single tap, double tap, drag, RN protection, whole-stroke undo, auto-win, saved completion.');
for(const d of ['easy','medium','hard'])for(let seed=1;seed<16;seed++){
 const p=run(`practicePuzzle('${d}',${seed})`);assert.equal(p.rating.difficulty,d);
 assert.equal(new Set(p.solution).size,p.regions.length);assert.equal(new Set(p.solution.map((c,r)=>p.regions[r][c])).size,p.regions.length);
 assert(p.solution.every((c,r)=>!r||Math.abs(c-p.solution[r-1])>1));
}
run('finished=false;runningSince=null;resume()');const start=run('runningSince');run('resume()');assert.equal(run('runningSince'),start);
assert.equal(run('LEVELS.length'),56);assert.equal(run('completedShifts.includes(0)'),true);
console.log('PASS: 45 puzzle transforms preserve solutions and ratings; 56 training levels; saved completion; repeated resume preserves timer.');
run('reset();toggle(0,1,"rn");toggle(0,0,"rn")');assert.equal(run('strikes'),1);assert.equal(run('state[0][0]'),'');assert.equal(run('state[0][1]'),'rn');
get('undoBtn').events.click[0]();assert.equal(run('strikes'),1);
run('toggle(0,1,"rn");toggle(0,0,"rn");toggle(0,0,"rn")');assert.equal(run('strikes'),3);assert.equal(run('lost'),true);assert.equal(run('finished'),true);assert(get('lossDialog').open);
const save=JSON.parse(storage['nursedoku-v2']);assert.equal(save.strikes,3);assert.equal(save.lost,true);
get('retryBtn').events.click[0]();assert.equal(run('strikes'),0);assert.equal(run('finished'),false);
run('showBonus()');const choices=get('bonusAnswers').children;choices[0].onclick();assert(!choices[0].disabled);assert.equal(get('playAgainBtn').disabled,true);choices[1].onclick();assert.equal(get('bonusFeedback').textContent,'Ready? Confirm your answer to see the explanation.');get('confirmBonusBtn').onclick();assert(choices.every(b=>b.disabled));assert(get('bonusFeedback').textContent.length>20);
get('boardSize').value='10';for(const d of ['easy','medium','hard']){const p=run(`practicePuzzle('${d}',12)`);assert.equal(p.regions.length,10);assert.equal(p.rating.difficulty,d);}
console.log('PASS: invalid RN placement rejected; strikes survive undo and saving; third strike ends shift; retry resets; bonus answers lock; 10×10 difficulty selection.');
const bridge=context.window.NurseDokuProgress;
const guest=bridge.snapshot();
bridge.apply({version:2,completed:[0,1],stats:{wins:2,dailyDates:['2026-09-29']},game:guest.game},'test-user-a');
assert.equal(bridge.owner(),'test-user-a');
assert.equal(bridge.snapshot().stats.wins,2);
assert(storage['nursedoku-user-test-user-a:nursedoku-v2']);
assert.equal(bridge.readOwner(null).stats.wins,guest.stats.wins);
bridge.apply({},'test-user-b');
assert.equal(bridge.snapshot().stats.wins,0);
assert.equal(bridge.readOwner('test-user-a').stats.wins,2);
bridge.apply(guest,null);
assert.equal(bridge.snapshot().stats.wins,guest.stats.wins);
assert.equal(bridge.owner(),null);
console.log('PASS: separate account saves, guest preservation, account switching, restore validation.');
run('finished=false;bonusSubmitted=false;reset();state[0][0]="x";state[0][1]="x";state[0][2]="rn";history=[];paint()');
hit=get('board').children[0];hit.closest=()=>hit;emit('pointerdown');
hit=get('board').children[1];hit.closest=()=>hit;emit('pointermove',{...evt,clientX:80});
hit=get('board').children[2];hit.closest=()=>hit;emit('pointermove',{...evt,clientX:120});emit('pointerup');
assert.equal(run('state[0][0]'),'');assert.equal(run('state[0][1]'),'');assert.equal(run('state[0][2]'),'rn');
get('undoBtn').events.click[0]();assert.equal(run('state[0][0]'),'x');assert.equal(run('state[0][1]'),'x');assert.equal(run('state[0][2]'),'rn');
get('menuBtn').events.click[0]();assert.equal(run('inGame'),false);assert.equal(run('runningSince'),null);assert.equal(get('gameView').hidden,true);
run('finished=false;enterGame();reset();state=blank();puzzle().solution.forEach((c,r)=>state[r][c]="rn");afterMove()');
assert.equal(run('bonusSubmitted'),false);assert.equal(run("switchGame('practice')"),false);assert.equal(run('gameKind'),'journey');
const pending=JSON.parse(storage['nursedoku-v2']);assert.equal(pending.bonusSubmitted,false);
get('confirmBonusBtn').onclick();assert.equal(run('bonusSubmitted'),false,'Empty answer cannot submit');
const button=get('bonusAnswers').children[0];button.onclick();assert.equal(run('bonusSubmitted'),false);
get('confirmBonusBtn').onclick();assert.equal(run('bonusSubmitted'),true);assert.equal(JSON.parse(storage['nursedoku-v2']).bonusSubmitted,true);
const restored=context.window.NurseDokuProgress.snapshot();context.window.NurseDokuProgress.apply(restored,null);assert.equal(get('playAgainBtn').disabled,false);
console.log('PASS: startup/menu timer pause; changelog acknowledgment; 2-second win delay; swipe erase + whole stroke undo; required answer selection/confirmation/persistence.');

