const fs=require('fs'),vm=require('vm'),assert=require('assert');
class El {constructor(){this.children=[];this.dataset={};this.style={setProperty(){}};this.classList={toggle(){},add(){}};this.events={};this.open=false;}set innerHTML(v){this.children=[];} get innerHTML(){return '';}append(x){this.children.push(x);}before(){}contains(x){return this.children.includes(x);}setAttribute(k,v){(this.attributes??={})[k]=v;}addEventListener(n,f){(this.events[n]??=[]).push(f);}showModal(){this.open=true;}close(){this.open=false;}focus(){}setPointerCapture(){}hasPointerCapture(){return false;}releasePointerCapture(){}}
const els={};const get=id=>els[id]??=new El();get('difficulty').value='6';
const storage={};let hit=null,timerId=0;const timers=new Map();
const doc={getElementById:get,createElement:()=>new El(),querySelector:()=>new El(),querySelectorAll:()=>[],addEventListener(){},hidden:false,documentElement:new El(),elementFromPoint:()=>hit};
const context={document:doc,window:{addEventListener(){}},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},setInterval(){},setTimeout(f,ms){timers.set(++timerId,{f,ms});return timerId;},clearTimeout(id){timers.delete(id)},confirm:()=>true,Date,console,navigator:{},location:{protocol:'file:'}};
vm.createContext(context);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../large-puzzles.js'),'utf8')+'\n'+fs.readFileSync(require('path').join(__dirname,'../puzzles.js'),'utf8')+'\n'+fs.readFileSync(require('path').join(__dirname,'../app.js'),'utf8'),context);
function run(code){return vm.runInContext(code,context);}
assert.equal(run('inGame'),false);assert.equal(run('runningSince'),null);assert.equal(get('gameView').hidden,undefined);
get('closeChangelogBtn').events.click[0]();get('changelogDialog').events.close[0]();
assert.equal(storage['nursedoku-changelog'],'2026-09-29-v1.1.0');
get('continueBtn').events.click[0]();assert.equal(run('inGame'),true);assert.notEqual(run('runningSince'),null);
const evt={pointerId:1,isPrimary:true,button:0,clientX:10,clientY:10,preventDefault(){}};
hit=get('board').children[1];hit.closest=()=>hit;
function emit(n,e=evt){get('board').events[n].forEach(f=>f(e));}
emit('pointerdown');emit('pointerup');run('flushTap()');assert.equal(run('state[0][1]'),'x');
emit('pointerdown');emit('pointerup');emit('pointerdown');emit('pointerup');assert.equal(run('state[0][1]'),'rn');
// RN survives a drag; other cells become X; one Undo reverses the stroke.
run('history=[]');emit('pointerdown');hit=get('board').children[2];hit.closest=()=>hit;emit('pointermove',{...evt,clientX:80});emit('pointerup');assert.equal(run('state[0][1]'),'rn');assert.equal(run('state[0][2]'),'x');assert.equal(run('history.length'),1);
get('undoBtn').events.click[0]();assert.equal(run('state[0][2]'),'');assert.equal(run('state[0][1]'),'rn');
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
// An incorrect RN must cost a strike even on an otherwise empty board.
run('toggle(0,0,"x");const beforeHistory=history.length;toggle(0,0,"rn")');
assert.equal(run('strikes'),1);assert.equal(run('state[0][0]'),'x');assert.equal(run('positions().length'),0);assert.equal(run('history.length===beforeHistory'),true);
run('toggle(0,0,"x");toggle(0,1,"rn");toggle(0,1,"rn")');assert.equal(run('strikes'),1);assert.equal(run('state[0][1]'),'');
run('toggle(0,0,"rn");toggle(0,0,"rn")');assert.equal(run('strikes'),3);assert.equal(run('lost'),true);
get('retryBtn').events.click[0]();
console.log('PASS: wrong nonconflicting RN costs one strike; rejected RN preserves X and history; Xs and correct RN removal are penalty-free.');
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


const reloadedEls={},reloadedGet=id=>reloadedEls[id]??=new El();
const reloadedDoc={...doc,getElementById:reloadedGet,querySelector:()=>new El()};
const reloaded={...context,document:reloadedDoc,window:{addEventListener(){}},setTimeout(){return 1;},clearTimeout(){}};
vm.createContext(reloaded);
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../large-puzzles.js'),'utf8')+'\n'+fs.readFileSync(require('path').join(__dirname,'../puzzles.js'),'utf8')+'\n'+fs.readFileSync(require('path').join(__dirname,'../app.js'),'utf8'),reloaded);
assert.equal(vm.runInContext('inGame',reloaded),false);assert.equal(vm.runInContext('runningSince',reloaded),null);
assert.equal(reloadedGet('winDialog').open,false);assert.equal(reloadedGet('changelogDialog').open,false);
assert.equal(vm.runInContext('bonusSubmitted',reloaded),true);assert.equal(reloadedGet('playAgainBtn').disabled,false);
assert(reloadedGet('resultShareX').href.includes('intent/tweet?text='));
assert(reloadedGet('resultShareWhatsapp').href.includes('wa.me/?text='));
console.log('PASS: completed-save reload stays on menu; submitted quiz persists; changelog is not repeated; social links include results.');
// Check hints against the unique solutions, including arbitrary player X marks.
for(const bank of ['PUZZLE_BANK','LARGE_PUZZLE_BANK'])for(const difficulty of ['easy','medium','hard']){
 const count=run(`${bank}.${difficulty}.length`);
 for(let i=0;i<count;i++)for(const filled of [0,1,3]){
  const result=run(`(()=>{const p=${bank}.${difficulty}[${i}],n=p.regions.length,marks=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>(r+c)%3===0?'x':''));for(let r=0;r<${filled};r++)marks[r][p.solution[r]]='rn';const h=explainHint(p,marks);return {h,correct:p.solution[h.r]===h.c};})()`);
  assert.equal(result.correct,result.h.kind!=='x','A deduction must agree with the independently verified unique solution');
 }
}
run("gameKind='journey';level=0;state=blank();finished=false;strikes=0;");
get('hintBtn').events.click[0]();assert(get('message').textContent.includes('Only row 1, column 2'));
assert(get('message').textContent.includes('care zone 1'));
let calendar=run("calendarDays('2026-09','2026-09-30',['2026-09-29'],'2026-09-29')");
assert.equal(calendar.offset,2);assert.equal(calendar.days.length,30);assert(calendar.days[27].disabled);assert(calendar.days[28].completed);assert(calendar.days[28].selected);assert(calendar.days[29].today);
calendar=run("calendarDays('2028-02','2028-02-14',[],'2028-02-14')");assert.equal(calendar.days.length,29);assert(!calendar.days[13].disabled);assert(calendar.days[14].disabled);
run("stats.dailyDates=['2026-09-29'];openArchive()");assert(get('archiveCalendar').children.length>=30);assert.equal(get('archivePrevBtn').disabled,true);
get('archiveCalendar').children.find(b=>b.attributes?.['aria-label']==='2026-09-29, completed').onclick();assert.equal(get('archiveDate').value,'2026-09-29');assert(get('archiveStatus').textContent.includes('completed — replay'));
console.log('PASS: deduction hints agree with unique 6×6/10×10 solutions despite arbitrary Xs; daily calendar marks completion, selection, launch bounds, future dates, and leap years.');
const questionCount=run('BONUS.length');assert(questionCount>=12&&questionCount<=5000);
for(let i=0;i<questionCount;i++){
 run(`bonusIndex=${i};bonusChoice=null;bonusSubmitted=false;showBonus()`);
 assert(get('bonusQuestion').textContent.length>40);assert(get('bonusTopic').textContent);
 const correct=run(`BONUS[${i}].correct`);
 get('bonusAnswers').children.find(b=>+b.dataset.choice===correct).onclick();
 assert(get('playAgainBtn').disabled);get('confirmBonusBtn').onclick();
 assert(get('bonusFeedback').textContent.startsWith('Correct. '));assert(!get('playAgainBtn').disabled);
 assert.equal(get('bonusSource').hidden,!run(`BONUS[${i}].source`));
}
const legacyQuiz=context.window.NurseDokuProgress.snapshot();delete legacyQuiz.game.bonusVersion;legacyQuiz.game.bonusChoice=0;legacyQuiz.game.bonusSubmitted=true;context.window.NurseDokuProgress.apply(legacyQuiz,null);assert.equal(run('bonusSubmitted'),false);assert.equal(run('bonusChoice'),null);
console.log('PASS: all NCLEX questions support choice/confirmation, topic/rationale/source display, calculation sources stay hidden, and old-bank answers cannot apply to new questions.');
// Never recycle correct questions; reserve seen items and revisit only misses.
run('stats.questionHistory={};bonusIndex=null;bonusChoice=null;bonusSubmitted=false;showBonus()');
assert.equal(run('bonusIndex'),0);assert.equal(run('stats.questionHistory[BONUS[0].id]'),'seen');
assert.equal(run('chooseQuestion()'),1);
get('bonusAnswers').children.find(b=>+b.dataset.choice===run('BONUS[0].correct')).onclick();get('confirmBonusBtn').onclick();
assert.equal(run('stats.questionHistory[BONUS[0].id]'),'correct');
assert.equal(JSON.parse(storage['nursedoku-stats']).questionHistory['nclex-00001'],'correct');
run("stats.questionHistory=Object.fromEntries(BONUS.map(q=>[q.id,'correct']));stats.questionHistory[BONUS[3].id]='missed'");
assert.equal(run('chooseQuestion()'),3);
run('bonusIndex=chooseQuestion();bonusChoice=null;bonusSubmitted=false;showBonus()');
get('bonusAnswers').children.find(b=>+b.dataset.choice===run('BONUS[3].correct')).onclick();get('confirmBonusBtn').onclick();
assert.equal(run('chooseQuestion()'),-1);
run('bonusIndex=null;bonusSubmitted=false;showBonus()');assert.equal(get('bonusAnswers').children.length,0);assert.equal(get('playAgainBtn').disabled,false);assert(get('confirmBonusBtn').hidden);
const mastered=context.window.NurseDokuProgress.snapshot();context.window.NurseDokuProgress.apply(mastered,'quiz-owner');assert.equal(run('chooseQuestion()'),-1);
context.window.NurseDokuProgress.apply({stats:{wins:0,dailyDates:[]},completed:[]},null);assert.equal(run('chooseQuestion()'),0);
assert.equal(Object.keys(run("normalizeQuestionHistory({'nclex-00001':'correct','bad':'correct','nclex-00002':'junk'})")).length,1);
assert.equal(new Set(run('BONUS.map(q=>q.id)')).size,questionCount);
// Existing owners who mastered the original bank must receive appended items first.
run("stats.questionHistory=Object.fromEntries(BONUS.slice(0,12).map(q=>[q.id,'correct']));stats.questionHistory[BONUS[3].id]='missed'");
assert.equal(run('chooseQuestion()'),12);
run('bonusIndex=3;bonusChoice=BONUS[3].correct;bonusSubmitted=true');
const priorSave=context.window.NurseDokuProgress.snapshot();
context.window.NurseDokuProgress.apply(priorSave,'existing-owner');
assert.equal(run('bonusIndex'),3);assert.equal(run('bonusChoice'),run('BONUS[3].correct'));assert.equal(run('bonusSubmitted'),true);
assert.equal(run("stats.questionHistory['nclex-00001']"),'correct');assert.equal(run('chooseQuestion()'),12);
console.log('PASS: bank append preserves completed answers and cloud history; new items precede previously missed items.');
console.log('PASS: unseen-first selection, missed-only review, mastery retirement, caught-up state, stable IDs, guest/account/cloud history isolation.');

// Tap feedback is immediate; the second tap replaces the first tap's undo entry.
run('reset();state=blank();history=[];finished=false;clearTap();render()');
hit=get('board').children[1];hit.closest=()=>hit;emit('pointerdown');emit('pointerup');
assert.equal(run('state[0][1]'),'x');assert.equal(run('history.length'),1);
emit('pointerdown');emit('pointerup');assert.equal(run('state[0][1]'),'rn');assert.equal(run('history.length'),1);
get('undoBtn').events.click[0]();assert.equal(run('state[0][1]'),'');
run('state=blank();clearedZones=new Set();render();puzzle().regions.forEach((row,r)=>row.forEach((z,c)=>{if(z===2)state[r][c]="x"}));paint()');
assert.equal(run('clearedZones.size'),0,'All-X region is not cleared');
run('state[2][0]="rn";paint()');assert(run('clearedZones.has(2)'));assert.equal(get('zoneClearMessage').textContent,'Care zone 3 cleared!');assert.equal(get('zoneClearMessage').hidden,false);
run('state[1][0]="";paint()');assert(!run('clearedZones.has(2)'));
run('state[1][0]="x";paint()');assert(run('clearedZones.has(2)'));
run('render()');assert.equal(get('zoneClearMessage').hidden,true,'Saved complete region does not replay celebration');
assert.equal(run("new Set(Array.from({length:7},(_,i)=>tipForDate('2026-10-'+String(i+1).padStart(2,'0')).text)).size"),7);
run('dismissedTipDate="2026-10-01";renderDailyTip("2026-10-01")');assert.equal(get('dailyTipCard').hidden,true);
run('renderDailyTip("2026-10-02")');assert.equal(get('dailyTipCard').hidden,false);assert(get('dailyTipSource').href.startsWith('https://'));
console.log('PASS: immediate X taps, transactional double-tap RN/undo, zone clear requires RN and Xs, restore suppresses celebrations, daily tip rotates and dismissal expires.');

