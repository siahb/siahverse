const LEVELS = [{"regions": [[2, 0, 1, 1], [2, 2, 1, 1], [2, 2, 1, 1], [3, 3, 3, 3]], "solution": [1, 3, 0, 2]}, {"regions": [[0, 0, 0, 0], [2, 0, 0, 1], [2, 0, 3, 3], [2, 2, 3, 3]], "solution": [1, 3, 0, 2]}, {"regions": [[0, 0, 0, 0, 2], [1, 1, 0, 0, 2], [1, 3, 0, 0, 2], [1, 3, 3, 3, 4], [3, 3, 3, 4, 4]], "solution": [2, 0, 4, 1, 3]}, {"regions": [[2, 0, 0, 1, 1], [2, 2, 2, 1, 1], [2, 2, 2, 1, 1], [2, 2, 3, 3, 3], [2, 2, 3, 3, 4]], "solution": [1, 3, 0, 2, 4]}, {"regions": [[3, 0, 1, 1, 1, 1], [3, 3, 2, 1, 1, 1], [3, 3, 2, 2, 1, 1], [3, 3, 2, 2, 1, 1], [3, 3, 2, 4, 4, 4], [3, 3, 4, 4, 4, 5]], "solution": [1, 4, 2, 0, 3, 5]}, {"regions": [[2, 0, 0, 0, 1, 1], [2, 0, 1, 1, 1, 1], [2, 2, 2, 1, 3, 1], [2, 2, 2, 1, 3, 5], [4, 4, 4, 4, 4, 5], [4, 4, 4, 4, 5, 5]], "solution": [1, 3, 0, 4, 2, 5]}, {"regions": [[1, 1, 1, 0, 0, 0], [1, 1, 1, 0, 0, 0], [1, 1, 1, 1, 1, 2], [3, 3, 3, 4, 1, 2], [3, 3, 3, 4, 1, 2], [5, 3, 4, 4, 4, 4]], "solution": [4, 2, 5, 1, 3, 0]}, {"regions": [[2, 2, 0, 0, 0, 1], [2, 2, 3, 3, 3, 1], [2, 2, 2, 2, 3, 3], [5, 5, 2, 2, 3, 3], [5, 4, 4, 3, 3, 3], [5, 5, 5, 3, 3, 3]], "solution": [3, 5, 1, 4, 2, 0]}];
const LEGACY_LEVELS=[...LEVELS,...PUZZLE_BANK.easy.slice(0,12),...PUZZLE_BANK.medium.slice(0,12),...PUZZLE_BANK.hard.slice(0,12)];
LEVELS.push(...PUZZLE_BANK.easy.slice(0,10),...PUZZLE_BANK.medium.slice(0,10),...PUZZLE_BANK.hard.slice(0,10),...LARGE_PUZZLE_BANK.easy.slice(0,6),...LARGE_PUZZLE_BANK.medium.slice(0,6),...LARGE_PUZZLE_BANK.hard.slice(0,6));
const difficultyOrder={easy:0,medium:1,hard:2};
LEVELS.sort((a,b)=>difficultyOrder[analyzePuzzle(a).difficulty]-difficultyOrder[analyzePuzzle(b).difficulty]||a.regions.length-b.regions.length);
function migrateLevel(oldIndex){const old=LEGACY_LEVELS[oldIndex];return old?Math.max(0,LEVELS.findIndex(p=>JSON.stringify(p.regions)===JSON.stringify(old.regions))):0;}
// Seeded generation: each accepted board has connected zones and exactly one solution.
function generatePuzzle(n,seed) {
  let randomState=seed>>>0;
  const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
  const perms=[];
  function perm(p,used) {
    if(p.length===n){perms.push(p);return;}
    for(let c=0;c<n;c++)if(!used.has(c)&&(!p.length||Math.abs(c-p.at(-1))>1))perm([...p,c],new Set([...used,c]));
  }
  perm([],new Set());
  for(let attempt=0;attempt<3000;attempt++) {
    const solution=perms[Math.floor(random()*perms.length)];
    const regions=Array.from({length:n},()=>Array(n).fill(-1));
    solution.forEach((c,r)=>regions[r][c]=r);
    let left=n*n-n;
    while(left) {
      const edges=[];
      for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(regions[r][c]===-1) {
        for(const [rr,cc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]])if(rr>=0&&rr<n&&cc>=0&&cc<n&&regions[rr][cc]>=(n===8?2:0))edges.push([r,c,regions[rr][cc]]);
      }
      if(!edges.length)break;
      const [r,c,z]=edges[Math.floor(random()*edges.length)];regions[r][c]=z;left--;
    }
    if(left)continue;
    let count=0;
    for(const p of perms)if(new Set(p.map((c,r)=>regions[r][c])).size===n && ++count>1)break;
    if(count===1)return {regions,solution};
  }
  // Verified starter fallback prevents a generation failure from blocking play.
  return copy(n===8?{"regions":[[2,2,2,2,2,2,2,0],[2,2,1,2,2,2,2,3],[4,4,4,4,2,2,3,3],[5,5,4,4,2,4,3,3],[5,5,5,4,4,4,3,3],[5,5,5,5,4,4,4,4],[7,5,5,5,5,6,6,6],[7,5,5,5,5,6,6,6]],"solution":[7,2,4,6,3,1,5,0]}:LEVELS.find(p=>p.regions.length===n));
}
const SAVE_KEY = 'nursedoku-v2';
const $ = id => document.getElementById(id);
const board = $('board');
// Original synthesized effects; no audio downloads or autoplay.
let soundEnabled=true, audioContext=null, lastTickAt=0;
try {soundEnabled=localStorage.getItem('nursedoku-sound')!=='off';}catch{}
function updateSoundButton() {
  $('soundBtn').setAttribute('data-muted',String(!soundEnabled));
  $('soundBtn').setAttribute('title',soundEnabled?'Mute game sounds':'Enable game sounds');
  $('soundBtn').setAttribute('aria-pressed',String(soundEnabled));
  $('soundBtn').setAttribute('aria-label',soundEnabled?'Mute game sounds':'Enable game sounds');
}
function unlockAudio() {
  if(!soundEnabled)return;
  try {
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)return;
    if(!audioContext)audioContext=new Context();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  }catch{}
}
function tone(freq,when,length,volume=.035,endFreq=freq,type='sine') {
  if(!audioContext||audioContext.state!=='running')return;
  const at=audioContext.currentTime+when;
  const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
  oscillator.type=type;oscillator.frequency.setValueAtTime(freq,at);
  oscillator.frequency.exponentialRampToValueAtTime(endFreq,at+length);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.006);
  gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  oscillator.connect(gain);gain.connect(audioContext.destination);
  oscillator.start(at);oscillator.stop(at+length+.01);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
}
function sound(kind) {
  if(!soundEnabled)return;
  unlockAudio();
  try {
    if(kind==='x') {
      if(Date.now()-lastTickAt<40)return;lastTickAt=Date.now();
      tone(760,0,.045,.025,420,'triangle');
    }else if(kind==='rn') {
      tone(523,0,.12,.04,640);tone(784,.065,.17,.028,1047);
    }else if(kind==='erase')tone(430,0,.06,.02,260);
    else if(kind==='hint'){tone(659,0,.12,.03);tone(988,.09,.18,.025);}
    else if(kind==='win') [523,659,784,1047,1319].forEach((f,i)=>tone(f,i*.10,.28,.04));
    else if(kind==='strike'){tone(250,0,.12,.03,160,'triangle');}
    else if(kind==='undo')tone(520,0,.08,.025,330);
    else if(kind==='new') {tone(392,0,.10,.025);tone(523,.08,.13,.025);}
  }catch{}
}
function celebrate(target='celebration') {
  const layer=$(target);layer.innerHTML='';
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  for(let i=0;i<36;i++) {
    const piece=document.createElement('i');piece.className='confetti-piece';
    piece.style.left=(Math.random()*100)+'%';
    piece.style.background=`var(--r${i%6})`;
    piece.style.setProperty('--drift',(Math.random()*150-75)+'px');
    piece.style.setProperty('--turn',(Math.random()*720-360)+'deg');
    piece.style.animationDelay=(Math.random()*.3)+'s';layer.append(piece);
  }
  setTimeout(()=>{layer.innerHTML='';},1800);
}
$('soundBtn').addEventListener('click',()=>{
  soundEnabled=!soundEnabled;
  try{localStorage.setItem('nursedoku-sound',soundEnabled?'on':'off');}catch{}
  updateSoundButton();if(soundEnabled){unlockAudio();sound('rn');}
});
document.addEventListener('pointerdown',unlockAudio,{passive:true});
document.addEventListener('keydown',unlockAudio);
updateSoundButton();

// Guest progress retains its original keys; each account has a separate local save.
let progressOwner=null;
try {progressOwner=localStorage.getItem('nursedoku-owner')||null;}catch{}
const progressStorage={
 getItem(key){return localStorage.getItem(progressOwner?'nursedoku-user-'+progressOwner+':'+key:key);},
 setItem(key,value){localStorage.setItem(progressOwner?'nursedoku-user-'+progressOwner+':'+key:key,value);}
};

let gameKind='journey', customPuzzle=null, dailyDate=null;
let stats={wins:0,best:null,dailyDates:[]};
try { const x=JSON.parse(progressStorage.getItem('nursedoku-stats'));if(x&&Number.isInteger(x.wins)&&x.wins>=0&&Array.isArray(x.dailyDates))stats=x; } catch {}
let completedShifts=[];
try {const current=progressStorage.getItem('nursedoku-journey-v2');const x=JSON.parse(current||progressStorage.getItem('nursedoku-journey'));if(Array.isArray(x))completedShifts=[...new Set(x.filter(v=>Number.isInteger(v)&&v>=0&&v<LEVELS.length).map(v=>current?v:migrateLevel(v)))];}catch{}
let level = 0, state, history = [], elapsed = 0, runningSince = null, finished = false, strikes=0, lost=false;
let inGame=false,winTimeout=null,winSequence=0,bonusIndex=null,bonusChoice=null,bonusSubmitted=false;
let gesture = null, lastTap = null, pendingTap = null, hintCell = null;
const puzzle = () => customPuzzle || LEVELS[level];
const size = () => puzzle().regions.length;
const blank = () => Array.from({length:size()}, () => Array(size()).fill(''));
const copy = value => JSON.parse(JSON.stringify(value));
const time = () => elapsed + (runningSince === null ? 0 : Date.now() - runningSince);
const format = ms => `${String(Math.floor(ms / 60000)).padStart(2,'0')}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}`;
function persist() {
  try { progressStorage.setItem(SAVE_KEY, JSON.stringify({level,state,elapsed:time(),finished,gameKind,customPuzzle,dailyDate,strikes,lost,journeyVersion:2,bonusIndex,bonusChoice,bonusSubmitted})); } catch {}
  window.NurseDokuCloud?.changed();
}
function pause() { elapsed = time(); runningSince = null; persist(); }
function resume() { if (!finished && !document.hidden && runningSince===null && inGame && !['howToDialog','accountDialog','archiveDialog','changelogDialog'].some(id=>$(id)?.open)) runningSince = Date.now(); }
function positions() { return state.flatMap((row,r) => row.flatMap((v,c) => v === 'rn' ? [[r,c]] : [])); }
function conflicts() {
  const ps = positions(), bad = new Set(), zones = puzzle().regions;
  ps.forEach(([r,c],i) => ps.slice(i+1).forEach(([rr,cc]) => {
    if(r===rr || c===cc || zones[r][c]===zones[rr][cc] || (Math.abs(r-rr)<=1 && Math.abs(c-cc)<=1)) {
      bad.add(`${r},${c}`); bad.add(`${rr},${cc}`);
    }
  }));
  return bad;
}
function tell(text,kind='') { $('message').textContent=text; $('message').className=`message ${kind}`; }
function remember() { history.push(copy(state)); if(history.length>100) history.shift(); }
function render() {
  board.innerHTML=''; board.style.gridTemplateColumns=`repeat(${size()},1fr)`;board.dataset.size=size();
  board.setAttribute('aria-rowcount',size()); board.setAttribute('aria-colcount',size());
  for(let r=0;r<size();r++) for(let c=0;c<size();c++) {
    const cell=document.createElement('button'); cell.type='button';
    cell.className=`cell region-${puzzle().regions[r][c]}`;
    cell.dataset.row=r; cell.dataset.col=c;
    cell.addEventListener('keydown',e=>{
      if(finished)return;
      if(e.key.toLowerCase()==='r') { e.preventDefault(); toggle(r,c,'rn'); }
      else if(e.key==='Enter'||e.key===' ') { e.preventDefault(); toggle(r,c,'x'); }
      else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
        e.preventDefault(); const dr=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0;
        const dc=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0;
        board.children[Math.max(0,Math.min(size()-1,r+dr))*size()+Math.max(0,Math.min(size()-1,c+dc))].focus();
      }
    });
    board.append(cell);
  }
  $('levelLabel').textContent=gameKind==='daily'?'Daily':gameKind==='practice'?'Practice':`Shift ${String(level+1).padStart(3,'0')}`;
  $('targetCount').textContent=size();
  let progress=$('zoneProgress');
  if(!progress) {progress=document.createElement('div');progress.id='zoneProgress';progress.className='zone-progress';board.before(progress);}
  progress.innerHTML='';
  for(let z=0;z<size();z++) { const dot=document.createElement('span');dot.className='zone-dot';dot.style.background=`var(--r${z})`;dot.dataset.zone=z;progress.append(dot); }
  updatePuzzleInfo();paint();
}
function paint() {
  const bad=conflicts();
  [...board.children].forEach(cell=>{
    const r=+cell.dataset.row,c=+cell.dataset.col,v=state[r][c],zone=puzzle().regions[r][c];
    if(cell.dataset.mark!==v) {
      cell.dataset.mark=v;
      cell.innerHTML=v?`<span class="${v==='rn'?'rn':'x'}-marker">${v==='rn'?'RN':'×'}</span>${v==='rn'?'<span class="rn-sparkles" aria-hidden="true"></span>':''}`:'';
    }
    cell.classList.toggle('conflict',bad.has(`${r},${c}`));
    cell.classList.toggle('hint',hintCell===`${r},${c}`);
    cell.setAttribute('aria-label',`Row ${r+1}, column ${c+1}, care zone ${zone+1}, ${v==='rn'?'RN placed':v==='x'?'marked X':'empty'}${bad.has(`${r},${c}`)?', conflict':''}`);
  });
  const ps=positions(); $('rnCount').textContent=ps.length;
  $('strikeCount').textContent=strikes;
  document.querySelectorAll('.zone-dot').forEach(dot=>{
    const count=ps.filter(([r,c])=>puzzle().regions[r][c]===+dot.dataset.zone).length;
    dot.textContent=count===1?'✓':count>1?'!':'';
    dot.setAttribute('aria-label',`Care zone ${+dot.dataset.zone+1}: ${count} RNs`);
  });
  $('undoBtn').disabled=!history.length||finished;
  if(!finished&&strikes===0&&gameKind==='journey'&&level===0&&!ps.length) {
    const col=puzzle().solution[0];
    board.children[col].classList.add('hint');
    tell('Start with the single gold square. Double-tap it to place your first RN.');
  }
}
function afterMove() {
  hintCell=null; paint();
  if(finished){persist();return;}
  if(positions().length===size() && !conflicts().size) {
    finished=true; elapsed=time();runningSince=null;
    recordWin();bonusIndex=(stats.wins-1+BONUS.length)%BONUS.length;bonusChoice=null;bonusSubmitted=false;showBonus();
    $('timer').textContent=format(elapsed);$('finalTime').textContent=format(elapsed);
    tell('Shift complete. Every care zone is staffed!','success');
    $('playAgainBtn').textContent=gameKind==='daily'?'Play a practice shift':gameKind==='practice'?'New practice shift':level===LEVELS.length-1?'Replay from shift 001':'Next shift';
    celebrate('boardCelebration');sound('win');paint();
    const sequence=++winSequence;clearTimeout(winTimeout);
    winTimeout=setTimeout(()=>{if(sequence===winSequence&&inGame&&finished&&!lost){$('winDialog').showModal();celebrate();}},2000);
  } else if(conflicts().size) tell('Outlined RNs conflict. Check rows, columns, colors, and touching cells.','error');
  else if(gameKind==='journey'&&level===0 && positions().length) tell('Great! Mark cells in that RN’s row, column, and neighboring squares with Xs.');
  else tell('One RN per row, column, and color. RNs cannot touch.');
  persist();
}
function toggle(r,c,mark) {
  if(finished)return;
  const previous=state[r][c];
  remember();state[r][c]=previous===mark?'':mark;
  if(state[r][c]==='rn' && (puzzle().solution[r]!==c || conflicts().size)) {
    state[r][c]=previous;history.pop();strikes++;sound('strike');hintCell=null;
    if(strikes>=3) {
      lost=true;finished=true;elapsed=time();runningSince=null;
      $('lossDialog').showModal();
    }
    paint();tell(lost?'Three strikes. This shift is over.':`Strike ${strikes}/3. That RN belongs in a different square.`,'error');persist();return;
  }
  sound(state[r][c]==='rn'?'rn':state[r][c]==='x'?'x':'erase');afterMove();
}

function cellAt(x,y) {
  const cell=document.elementFromPoint(x,y)?.closest('.cell');
  return cell&&board.contains(cell)?[+cell.dataset.row,+cell.dataset.col]:null;
}
function clearTap() { clearTimeout(pendingTap);pendingTap=null;lastTap=null; }
function flushTap() {
  if(lastTap) { const {r,c}=lastTap; clearTap(); toggle(r,c,'x'); }
}
function startDrag() {
  flushTap();remember();gesture.drag=true;gesture.seen=new Set();
  gesture.erase=state[gesture.start[0]][gesture.start[1]]==='x';
  markDrag(gesture.start);
}
function markDrag(pos) {
  if(!pos)return;
  const [r,c]=pos,key=`${r},${c}`;
  if(gesture.seen.has(key))return;
  gesture.seen.add(key);
  // A stroke chooses add or erase from its starting cell and always protects RNs.
  if(gesture.erase){if(state[r][c]==='x'){state[r][c]='';sound('erase');}}
  else if(state[r][c]===''){state[r][c]='x';sound('x');}
  paint();
}
board.addEventListener('pointerdown',e=>{
  if(finished||gesture||!e.isPrimary||e.button!==0)return;
  const pos=cellAt(e.clientX,e.clientY);if(!pos)return;
  e.preventDefault();board.setPointerCapture(e.pointerId);
  gesture={id:e.pointerId,start:pos,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,drag:false,before:copy(state)};
});
board.addEventListener('pointermove',e=>{
  if(!gesture||e.pointerId!==gesture.id)return;
  e.preventDefault();
  if(!gesture.drag&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>9)startDrag();
  if(gesture.drag) {
    // Interpolate fast swipes so cells between pointer events are included.
    const steps=Math.max(1,Math.ceil(Math.hypot(e.clientX-gesture.lastX,e.clientY-gesture.lastY)/8));
    for(let i=1;i<=steps;i++)markDrag(cellAt(gesture.lastX+(e.clientX-gesture.lastX)*i/steps,gesture.lastY+(e.clientY-gesture.lastY)*i/steps));
  }
  gesture.lastX=e.clientX;gesture.lastY=e.clientY;
});
function endPointer(e,canceled=false) {
  if(!gesture||e.pointerId!==gesture.id)return;
  const g=gesture;gesture=null;
  if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);
  if(g.drag) { afterMove();return; }
  if(canceled)return;
  const release=cellAt(e.clientX,e.clientY);
  if(!release||release[0]!==g.start[0]||release[1]!==g.start[1])return;
  const [r,c]=g.start;
  if(lastTap&&lastTap.r===r&&lastTap.c===c&&Date.now()-lastTap.at<360) {
    clearTap();toggle(r,c,'rn');
  } else {
    flushTap();lastTap={r,c,at:Date.now()};
    pendingTap=setTimeout(flushTap,360);
  }
}
board.addEventListener('pointerup',e=>endPointer(e));
board.addEventListener('pointercancel',e=>endPointer(e,true));
board.addEventListener('lostpointercapture',e=>endPointer(e,true));
board.addEventListener('contextmenu',e=>e.preventDefault());
board.addEventListener('click',e=>{if(e.detail===0 && e.target.closest('.cell')){const cell=e.target.closest('.cell');toggle(+cell.dataset.row,+cell.dataset.col,'x');}});
$('undoBtn').addEventListener('click',()=>{flushTap();if(finished||!history.length)return;state=history.pop();sound('undo');afterMove();});
// Deduction hints use the visible RNs, never the player's Xs as proof.
function explainHint(p,marks) {
 const n=p.regions.length,cells=Array.from({length:n*n},(_,i)=>({r:Math.floor(i/n),c:i%n,z:p.regions[Math.floor(i/n)][i%n]}));
 const placed=cells.filter(x=>marks[x.r][x.c]==='rn');
 const wrong=placed.find(x=>p.solution[x.r]!==x.c);
 if(wrong)return {...wrong,kind:'review',text:`Review the RN at row ${wrong.r+1}, column ${wrong.c+1}. It does not fit this board's complete solution.`};
 const candidates=cells.filter(x=>!placed.some(y=>x.r===y.r||x.c===y.c||x.z===y.z||(Math.abs(x.r-y.r)<=1&&Math.abs(x.c-y.c)<=1)));
 const label=(type,k)=>type==='r'?`row ${k+1}`:type==='c'?`column ${k+1}`:`care zone ${k+1}`;
 const groups=[];
 for(const type of ['z','r','c'])for(let k=0;k<n;k++)if(!placed.some(x=>x[type]===k))groups.push({type,k,ids:candidates.filter(x=>x[type]===k)});
 for(const g of groups)if(g.ids.length===1){const x=g.ids[0];return {...x,kind:'rn',text:`Only row ${x.r+1}, column ${x.c+1} can staff ${label(g.type,g.k)}. The other squares are ruled out by placed RNs in their row, column, care zone, or neighboring cells. ${marks[x.r][x.c]==='x'?'Erase that X, then double-tap':'Double-tap'} the outlined square to place an RN.`};}
 for(const g of groups)if(g.ids.length)for(const type of ['r','c','z']){
  if(type===g.type||new Set(g.ids.map(x=>x[type])).size!==1)continue;
  const k=g.ids[0][type],x=candidates.find(x=>x[type]===k&&x[g.type]!==g.k&&marks[x.r][x.c]==='');
  if(x)return {...x,kind:'x',text:`Every possible RN in ${label(g.type,g.k)} lies in ${label(type,k)}. That ${label(type,k)} can have only one RN, so row ${x.r+1}, column ${x.c+1} outside ${label(g.type,g.k)} must be X. Tap the outlined square once.`};
 }
 const r=p.solution.findIndex((c,r)=>marks[r][c]!=='rn');
 if(r<0)return null;
 const c=p.solution[r];return {r,c,kind:'reveal',text:`Solution reveal: row ${r+1}, column ${c+1} contains an RN. This position needs deeper reasoning than the current deduction hints can explain. ${marks[r][c]==='x'?'Erase that X, then double-tap':'Double-tap'} the outlined square.`};
}
$('hintBtn').addEventListener('click',()=>{
 flushTap();if(finished)return;const hint=explainHint(puzzle(),state);if(!hint)return;
 sound('hint');hintCell=`${hint.r},${hint.c}`;paint();tell(hint.text,hint.kind==='review'?'error':'');
});

function reset(next=false) {
  if(requireNursingAnswer())return;
  clearTap();clearTimeout(winTimeout);winSequence++;if(next) {
    if(gameKind==='daily') {gameKind='practice';dailyDate=null;customPuzzle=practicePuzzle($('difficulty').value,Date.now());}
    else if(gameKind==='practice')customPuzzle=practicePuzzle($('difficulty').value,Date.now());
    else level=(level+1)%LEVELS.length;
  }
  state=blank();history=[];finished=false;strikes=0;lost=false;hintCell=null;elapsed=0;runningSince=null;bonusIndex=null;bonusChoice=null;bonusSubmitted=false;
  resume();render();sound('new');tell(gameKind==='journey'&&level===0?'Start with the single gold square. Double-tap it to place your first RN.':'New shift. One RN per row, column, and color.');persist();
}
$('resetBtn').addEventListener('click',()=>{
  flushTap();if(positions().length||state.flat().includes('x')){if(!confirm('Reset this shift? Your placements will be cleared.'))return;}
  reset();
});
$('howToBtn').addEventListener('click',()=>{flushTap();pause();$('howToDialog').showModal();});
$('closeHowToBtn').addEventListener('click',()=>$('howToDialog').close());
$('startBtn').addEventListener('click',()=>$('howToDialog').close());
$('howToDialog').addEventListener('close',resume);
$('playAgainBtn').addEventListener('click',()=>{$('winDialog').close();reset(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){flushTap();pause();}else if(!$('howToDialog').open)resume();});
window.addEventListener('pagehide',()=>{flushTap();pause();});
window.addEventListener('pageshow',()=>{if(runningSince===null&&!$('howToDialog').open)resume();});
try {
  const saved=JSON.parse(progressStorage.getItem(SAVE_KEY));
  if(saved && Number.isInteger(saved.level)&&saved.level>=0&&saved.level<LEVELS.length) {
    level=saved.gameKind==='journey'&&saved.journeyVersion!==2?migrateLevel(saved.level):saved.level;
    if(['daily','practice'].includes(saved.gameKind)&&validPuzzle(saved.customPuzzle)) {
      gameKind=saved.gameKind;customPuzzle=saved.customPuzzle;dailyDate=saved.dailyDate;
    }
    if(Array.isArray(saved.state)&&saved.state.length===size()&&saved.state.every(row=>Array.isArray(row)&&row.length===size()&&row.every(v=>['','rn','x'].includes(v)))) {
      state=saved.state;elapsed=Number.isFinite(saved.elapsed)?Math.max(0,saved.elapsed):0;
      strikes=Number.isInteger(saved.strikes)?Math.max(0,Math.min(3,saved.strikes)):0;
      lost=saved.lost===true&&strikes===3;
      bonusIndex=Number.isInteger(saved.bonusIndex)?saved.bonusIndex:null;bonusChoice=Number.isInteger(saved.bonusChoice)?saved.bonusChoice:null;bonusSubmitted=saved.bonusSubmitted===true;
      finished=lost||(saved.finished===true && positions().length===size() && !conflicts().size);
    }
  }
} catch {}
if(!state)state=blank();
render();resume();updateStats();
$('timer').textContent=format(time());setInterval(()=>{$('timer').textContent=format(time());},500);

function validPuzzle(p) {
  return p&&[4,5,6,8,10].includes(p.regions?.length)&&p.regions.every(row=>Array.isArray(row)&&row.length===p.regions.length&&row.every(z=>Number.isInteger(z)&&z>=0&&z<p.regions.length))&&Array.isArray(p.solution)&&p.solution.length===p.regions.length&&p.solution.every(c=>Number.isInteger(c)&&c>=0&&c<p.regions.length);
}
function localDate(d=new Date()) {return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function updateStats() {
  let streak=0,d=new Date();
  if(!stats.dailyDates.includes(localDate(d)))d.setDate(d.getDate()-1);
  while(stats.dailyDates.includes(localDate(d))) {streak++;d.setDate(d.getDate()-1);}
  $('statsLine').textContent=`${stats.wins} shifts solved · ${streak} day daily streak${stats.best!==null?' · Best '+format(stats.best):''}`;
}
function recordWin() {
  if(gameKind==='journey'&&!completedShifts.includes(level)){completedShifts.push(level);try{progressStorage.setItem('nursedoku-journey-v2',JSON.stringify(completedShifts));}catch{}}
  stats.wins++;stats.best=stats.best===null?elapsed:Math.min(stats.best,elapsed);
  if(gameKind==='daily'&&dailyDate&&!stats.dailyDates.includes(dailyDate))stats.dailyDates.push(dailyDate);
  try {progressStorage.setItem('nursedoku-stats',JSON.stringify(stats));}catch {}
  updateStats();updatePuzzleInfo();
}
function switchGame(kind) {
  if(requireNursingAnswer())return false;
  flushTap();
  if(!finished&&state.flat().some(Boolean)&&!confirm('Start a new puzzle? Your current placements will be cleared.'))return false;
  gameKind=kind;dailyDate=kind==='daily'?localDate():null;
  let seed=Date.now();if(dailyDate)seed=Number(dailyDate.replaceAll('-',''));
  customPuzzle=kind==='journey'?null:kind==='daily'?generatePuzzle(6,seed):practicePuzzle($('difficulty').value,seed);
  if(kind==='journey'){level=Array.from({length:LEVELS.length},(_,i)=>i).find(i=>!completedShifts.includes(i))??0;}
  reset();return true;
}
$('dailyBtn').addEventListener('click',()=>switchGame('daily'));
$('practiceBtn').addEventListener('click',()=>switchGame('practice'));
$('journeyBtn').addEventListener('click',()=>switchGame('journey'));
const palettes={general:['#e9bd43','#9b7ad5','#acd68d','#d87579','#f5abc9','#53b7b5','#6481be','#ffa66f'],peds:['#ffbe55','#a293e1','#85d5ad','#ff918f','#ef9fc9','#77cbdc','#8ca6e7','#edbe92'],ed:['#e4b441','#9a88d7','#97c785','#d66d7e','#e69abb','#49b2ae','#627dbc','#f49a61']};
function theme(name) { (palettes[name]||palettes.general).forEach((v,i)=>document.documentElement.style.setProperty('--r'+i,v));$('theme').value=palettes[name]?name:'general';try{localStorage.setItem('nursedoku-theme',$('theme').value);}catch{}}
$('theme').addEventListener('change',()=>theme($('theme').value));
try {theme(localStorage.getItem('nursedoku-theme'));}catch{}
const BONUS=[
 {q:'After patient care, the nurse’s hands are visibly soiled. Which action is best?',a:['Wash with soap and water','Use a dry towel only','Put on clean gloves without cleaning hands','Rinse with water only'],correct:0,why:'Visible soil requires handwashing with soap and water. Gloves do not replace hand hygiene.',source:'https://www.cdc.gov/clean-hands/hcp/clinical-safety/index.html'},
 {q:'The nurse removes gloves after patient care. What should happen next?',a:['Begin care of the next patient','Perform hand hygiene','Reuse the gloves if they look clean','Clean hands only after the shift'],correct:1,why:'Hand hygiene is needed after glove removal because hands may become contaminated.',source:'https://www.cdc.gov/clean-hands/hcp/clinical-safety/index.html'},
 {q:'For most routine clinical care when hands are not visibly soiled, which method does CDC prefer?',a:['Water alone','A dry paper towel','Alcohol-based hand sanitizer','Gloves instead of hand hygiene'],correct:2,why:'Alcohol-based hand sanitizer is preferred in most clinical situations when hands are not visibly soiled.',source:'https://www.cdc.gov/clean-hands/hcp/clinical-safety/index.html'},
 {q:'Which patients require Standard Precautions?',a:['Only patients with a positive culture','Only patients in isolation','Only hospitalized patients','All patients in all care settings'],correct:3,why:'Standard Precautions apply regardless of known infection status.',source:'https://www.cdc.gov/infection-control/hcp/core-practices/index.html'},
 {q:'A nurse expects blood to splash during a procedure. What protection should be included for the eyes, nose, and mouth?',a:['Gloves alone','Eye protection and a mask, or a face shield','A gown alone','No PPE if infection is unconfirmed'],correct:1,why:'Select face protection when splashes could expose mucous membranes.',source:'https://www.cdc.gov/infection-control/hcp/core-practices/index.html'},
 {q:'A syringe was used for one patient. Is changing the needle enough to use that syringe for another patient?',a:['Yes, if the needle is sterile','Yes, if no blood is visible','No; use a new syringe and needle','Yes, if both patients have the same diagnosis'],correct:2,why:'Needles and syringes are for one patient only.',source:'https://www.cdc.gov/infection-control/hcp/core-practices/index.html'},
 {q:'A reusable blood-pressure cuff will be used on another patient. What should the nurse do?',a:['Clean and disinfect it according to its instructions','Wipe it with a dry cloth only','Wait until the end of the shift','Assume it is clean if no dirt is visible'],correct:0,why:'Reusable equipment needs appropriate reprocessing between patients.',source:'https://www.cdc.gov/infection-control/hcp/core-practices/index.html'}
];
function showBonus() {
 const index=Number.isInteger(bonusIndex)&&bonusIndex>=0&&bonusIndex<BONUS.length?bonusIndex:(stats.wins-1+BONUS.length)%BONUS.length;
 bonusIndex=index;const item=BONUS[index];
 if(!Number.isInteger(bonusChoice)||bonusChoice<0||bonusChoice>=item.a.length){bonusChoice=null;bonusSubmitted=false;}
 $('bonusQuestion').textContent=item.q;$('bonusAnswers').innerHTML='';$('bonusFeedback').textContent='';
 $('bonusFeedback').className='';$('shareStatus').textContent='';$('bonusSource').href=item.source;
 $('bonusSource').hidden=!bonusSubmitted;$('bonusSource').textContent='Read the CDC rationale';
 const choices=item.a.map((answer,i)=>({answer,i}));
 for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 function updateSelection(){
  [...$('bonusAnswers').children].forEach(b=>{const chosen=+b.dataset.choice===bonusChoice;b.setAttribute('aria-pressed',String(chosen));b.classList.toggle('answer-selected',chosen);});
  $('confirmBonusBtn').disabled=bonusChoice===null||bonusSubmitted;
  $('confirmBonusBtn').textContent=bonusSubmitted?'Answer submitted':'Confirm answer';
  $('playAgainBtn').disabled=!bonusSubmitted;
 }
 function feedback(){
  [...$('bonusAnswers').children].forEach(b=>{b.disabled=true;if(+b.dataset.choice===item.correct)b.classList.add('answer-correct');else if(+b.dataset.choice===bonusChoice)b.classList.add('answer-wrong');});
  const correct=bonusChoice===item.correct;
  $('bonusFeedback').className=correct?'feedback-correct':'feedback-review';
  $('bonusFeedback').textContent=(correct?'Correct. ':'Review: '+item.a[item.correct]+'. ')+item.why;
  $('bonusSource').hidden=false;
 }
 choices.forEach(({answer,i})=>{
  const button=document.createElement('button');button.type='button';button.className='secondary-btn bonus-answer';button.textContent=answer;button.dataset.choice=i;
  button.onclick=()=>{if(bonusSubmitted)return;bonusChoice=i;updateSelection();$('bonusFeedback').textContent='Ready? Confirm your answer to see the explanation.';persist();};
  $('bonusAnswers').append(button);
 });
 $('confirmBonusBtn').onclick=()=>{if(bonusChoice===null||bonusSubmitted)return;bonusSubmitted=true;updateSelection();feedback();persist();};
 updateSelection();if(bonusSubmitted)feedback();updateResultLinks();
}



function practicePuzzle(difficulty,seed) {
 const bank=$('boardSize').value==='10'?LARGE_PUZZLE_BANK:PUZZLE_BANK;
 const pool=bank[difficulty]||bank.medium;
 const base=copy(pool[(seed>>>0)%pool.length]);
 // Reflect/rotate each puzzle without altering its logical rating or uniqueness.
 let regions=base.regions;
 for(let turn=0;turn<((seed>>>4)%4);turn++)regions=regions[0].map((_,c)=>regions.map(row=>row[c]).reverse());
 if((seed>>>6)%2)regions=regions.map(row=>[...row].reverse());
 const solution=Array(regions.length);
 for(let r=0;r<base.regions.length;r++){
  let rr=r,cc=base.solution[r];
  for(let turn=0;turn<((seed>>>4)%4);turn++){[rr,cc]=[cc,regions.length-1-rr];}
  if((seed>>>6)%2)cc=regions.length-1-cc;
  solution[rr]=cc;
 }
 return {regions,solution,rating:analyzePuzzle({regions})};
}
function updatePuzzleInfo() {
 const rating=analyzePuzzle(puzzle());
 const descriptions={easy:'Direct deductions',medium:'Care-zone elimination',hard:'Deeper reasoning'};
 $('puzzleInfo').textContent=gameKind==='journey'?`Training ${level+1} of ${LEVELS.length} · ${size()}×${size()} · ${rating.difficulty} · ${completedShifts.length} completed`:`${rating.difficulty[0].toUpperCase()+rating.difficulty.slice(1)} · ${descriptions[rating.difficulty]} · ${size()}×${size()}${gameKind==='daily'?' · '+dailyDate:''}`;
 $('milestone').textContent=stats.wins>=25?'Milestone: 25 shifts completed':stats.wins>=10?'Milestone: 10 shifts completed':stats.wins>=1?'Milestone: first shift completed':'';
}
let archiveMonth=localDate().slice(0,7);
function calendarDays(month,today,completed,selected) {
 const [year,m]=month.split('-').map(Number),first=new Date(year,m-1,1),count=new Date(year,m,0).getDate();
 return {offset:first.getDay(),days:Array.from({length:count},(_,i)=>{
  const date=month+'-'+String(i+1).padStart(2,'0');return {date,day:i+1,disabled:date<'2026-09-29'||date>today,completed:completed.includes(date),selected:date===selected,today:date===today};
 })};
}
function renderCalendar(){
 const model=calendarDays(archiveMonth,localDate(),stats.dailyDates,$('archiveDate').value);
 const [year,m]=archiveMonth.split('-').map(Number);
 $('archiveMonthLabel').textContent=new Date(year,m-1,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
 $('archivePrevBtn').disabled=archiveMonth<='2026-09';$('archiveNextBtn').disabled=archiveMonth>=localDate().slice(0,7);
 $('archiveCalendar').innerHTML='';
 for(let i=0;i<model.offset;i++){const gap=document.createElement('span');gap.setAttribute('aria-hidden','true');$('archiveCalendar').append(gap);}
 for(const day of model.days){const button=document.createElement('button');button.type='button';button.className='calendar-day'+(day.completed?' completed':'')+(day.selected?' selected':'');button.disabled=day.disabled;button.textContent=day.day+(day.completed?' ✓':'');button.setAttribute('aria-label',day.date+(day.completed?', completed':day.disabled?', unavailable':', not completed'));button.setAttribute('aria-pressed',String(day.selected));if(day.today)button.setAttribute('aria-current','date');button.onclick=()=>{$('archiveDate').value=day.date;renderCalendar();};$('archiveCalendar').append(button);}
 const selected=$('archiveDate').value;
 $('archiveStatus').textContent=`${stats.dailyDates.length} daily puzzles completed. ${selected}: ${stats.dailyDates.includes(selected)?'completed — replay anytime':'not completed'}.`;
}
for(const [id,step] of [['archivePrevBtn',-1],['archiveNextBtn',1]])$(id).addEventListener('click',()=>{
 const [y,m]=archiveMonth.split('-').map(Number),next=localDate(new Date(y,m-1+step,1)).slice(0,7);
 if(next<'2026-09'||next>localDate().slice(0,7))return;archiveMonth=next;renderCalendar();
});
$('archiveDate').addEventListener('change',()=>{const date=$('archiveDate').value;if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&date>='2026-09-29'&&date<=localDate()){archiveMonth=date.slice(0,7);renderCalendar();}});
$('menuArchiveBtn').addEventListener('click',()=>openArchive());
function openArchive() {
 if(requireNursingAnswer())return;
 $('archiveDate').max=localDate();$('archiveDate').value=localDate();
 archiveMonth=localDate().slice(0,7);renderCalendar();
 pause();$('archiveDialog').showModal();
}
$('archiveBtn').addEventListener('click',openArchive);
$('closeArchiveBtn').addEventListener('click',()=>$('archiveDialog').close());
$('archiveDialog').addEventListener('close',resume);
$('loadArchiveBtn').addEventListener('click',()=>{
 const date=$('archiveDate').value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>localDate()||date<'2026-09-29'){ $('archiveStatus').textContent='Choose a date between September 29, 2026 and today.';return; }
 flushTap();if(!finished&&state.flat().some(Boolean)&&!confirm('Open this daily puzzle and clear your current placements?'))return;
 gameKind='daily';dailyDate=date;customPuzzle=generatePuzzle(6,Number(date.replaceAll('-','')));
 $('archiveDialog').close();reset();enterGame();
});
const SHARE_URL='https://siahverse.cc/nursedoku/';
function resultText(){return 'NurseDoku '+(gameKind==='daily'?dailyDate:gameKind==='journey'?'Shift '+(level+1):'Practice')+'\nSolved in '+format(elapsed)+' · '+size()+'×'+size()+' · '+strikes+'/3 strikes';}
function socialLinks(prefix,text){
 $(prefix+'X').href='https://twitter.com/intent/tweet?text='+encodeURIComponent(text)+'&url='+encodeURIComponent(SHARE_URL);
 $(prefix+'Whatsapp').href='https://wa.me/?text='+encodeURIComponent(text+'\n'+SHARE_URL);
}
function updateResultLinks(){socialLinks('resultShare',resultText());}
async function copyShare(text,status){
 try{await navigator.clipboard.writeText(text);$(status).textContent='Copied. Paste it in your post or message.';}
 catch{$(status).textContent=text;}
}
async function nativeShare(text,status){
 if(navigator.share){try{await navigator.share({title:'NurseDoku',text,url:SHARE_URL});$(status).textContent='Share sheet opened.';return;}catch(error){if(error.name==='AbortError')return;}}
 await copyShare(text+'\n'+SHARE_URL,status);
}
$('shareBtn').addEventListener('click',()=>nativeShare(resultText(),'shareStatus'));
$('copyResultBtn').addEventListener('click',()=>copyShare(resultText()+'\n'+SHARE_URL,'shareStatus'));
$('menuShareBtn').addEventListener('click',()=>nativeShare('A little logic. A little nursing. Play NurseDoku with me.','menuShareStatus'));
$('menuCopyBtn').addEventListener('click',()=>copyShare(SHARE_URL,'menuShareStatus'));
socialLinks('menuShare','A little logic. A little nursing. Play NurseDoku with me.');
$('menuShareFacebook').href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(SHARE_URL);
if('serviceWorker' in navigator && location.protocol==='https:')navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(()=>{});

$('retryBtn').addEventListener('click',()=>{$('lossDialog').close();reset();});
$('newAfterLossBtn').addEventListener('click',()=>{$('lossDialog').close();reset(true);});

// Narrow bridge used by the account controller. Cloud data never contains credentials.
window.NurseDokuProgress={
 owner(){return progressOwner;},
 snapshot(){return copy({version:2,game:{level,state,elapsed:time(),finished,gameKind,customPuzzle,dailyDate,strikes,lost,journeyVersion:2,bonusIndex,bonusChoice,bonusSubmitted},stats,completed:completedShifts});},
 readOwner(owner){
  const read=key=>{try{return JSON.parse(localStorage.getItem(owner?'nursedoku-user-'+owner+':'+key:key));}catch{return null;}};
  return {version:2,game:read(SAVE_KEY),stats:read('nursedoku-stats'),completed:read('nursedoku-journey-v2')||[]};
 },
 apply(value,owner){
  const v=value||{},g=v.game||{};
  const nextLevel=Number.isInteger(g.level)&&g.level>=0&&g.level<LEVELS.length?g.level:0;
  const nextKind=['journey','daily','practice'].includes(g.gameKind)?g.gameKind:'journey';
  const nextCustom=nextKind!=='journey'&&validPuzzle(g.customPuzzle)?copy(g.customPuzzle):null;
  const n=(nextCustom||LEVELS[nextLevel]).regions.length;
  const nextState=Array.isArray(g.state)&&g.state.length===n&&g.state.every(row=>Array.isArray(row)&&row.length===n&&row.every(x=>['','rn','x'].includes(x)))?copy(g.state):Array.from({length:n},()=>Array(n).fill(''));
  flushTap();pause();
  progressOwner=owner||null;
  try {if(progressOwner)localStorage.setItem('nursedoku-owner',progressOwner);else localStorage.removeItem('nursedoku-owner');}catch{}
  level=nextLevel;customPuzzle=nextCustom;gameKind=nextCustom?nextKind:'journey';dailyDate=gameKind==='daily'&&/^\d{4}-\d{2}-\d{2}$/.test(g.dailyDate)?g.dailyDate:null;
  state=nextState;elapsed=Number.isFinite(g.elapsed)?Math.max(0,g.elapsed):0;runningSince=null;
  strikes=Number.isInteger(g.strikes)?Math.max(0,Math.min(3,g.strikes)):0;
  bonusIndex=Number.isInteger(g.bonusIndex)?g.bonusIndex:null;bonusChoice=Number.isInteger(g.bonusChoice)?g.bonusChoice:null;bonusSubmitted=g.bonusSubmitted===true;
  clearTimeout(winTimeout);winSequence++;
  lost=g.lost===true&&strikes===3;finished=lost||(g.finished===true&&positions().length===n&&!conflicts().size);
  history=[];hintCell=null;
  completedShifts=Array.isArray(v.completed)?[...new Set(v.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<LEVELS.length))]:[];
  const st=v.stats||{};
  stats={wins:Number.isInteger(st.wins)&&st.wins>=0?st.wins:0,best:Number.isFinite(st.best)&&st.best>=0?st.best:null,dailyDates:Array.isArray(st.dailyDates)?[...new Set(st.dailyDates.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)))]:[]};
  for(const id of ['winDialog','lossDialog'])if($(id).open)$(id).close();
  progressStorage.setItem('nursedoku-stats',JSON.stringify(stats));
  progressStorage.setItem('nursedoku-journey-v2',JSON.stringify(completedShifts));
  render();updateStats();resume();persist();
  if(lost&&inGame)$('lossDialog').showModal();
  else if(finished&&!lost){$('finalTime').textContent=format(elapsed);$('playAgainBtn').textContent=gameKind==='journey'?'Next shift':'New practice shift';showBonus();if(inGame)$('winDialog').showModal();}
  updateMenu();
  tell(lost?'Three strikes. Retry this shift to continue.':finished?'Saved shift complete. Start another shift to continue.':'Your saved shift is ready.');
 },
 pause,resume
};

// The menu owns starting/resuming a shift; loading the app never starts the clock.
function updateMenu(){
 $('menuStats').textContent=$('statsLine').textContent;
 $('continueBtn').textContent=finished&&!lost&&!bonusSubmitted?'Finish your nursing question':lost?'Review ended shift':finished?'Review completed shift':state.flat().some(Boolean)||elapsed>0?'Continue your shift':'Start your shift';
}
function enterGame(){
 inGame=true;$('mainMenu').hidden=true;$('gameView').hidden=false;$('menuBtn').hidden=false;
 resume();
 if(lost)$('lossDialog').showModal();
 else if(finished){$('finalTime').textContent=format(elapsed);showBonus();$('winDialog').showModal();}
 $('levelLabel').focus?.();
}
function returnToMenu(){
 flushTap();pause();inGame=false;clearTimeout(winTimeout);winSequence++;
 for(const id of ['winDialog','lossDialog'])if($(id).open)$(id).close();
 $('mainMenu').hidden=false;$('gameView').hidden=true;$('menuBtn').hidden=true;updateMenu();$('continueBtn').focus();
}
function requireNursingAnswer(){
 if(finished&&!lost&&!bonusSubmitted){enterGame();return true;}return false;
}
$('continueBtn').addEventListener('click',enterGame);
$('menuBtn').addEventListener('click',returnToMenu);
for(const [id,kind] of [['menuLearnBtn','journey'],['menuDailyBtn','daily'],['menuPracticeBtn','practice']])$(id).addEventListener('click',()=>{if(switchGame(kind)!==false)enterGame();});
$('winDialog').addEventListener('cancel',event=>{if(!bonusSubmitted)event.preventDefault();});
$('menuPreferences').append(document.querySelector('.preferences'));
const UPDATE_VERSION='2026-09-29-hints-calendar';
let changelogShown=false;
function markChangelogSeen(){try{localStorage.setItem('nursedoku-changelog',UPDATE_VERSION);}catch{}changelogShown=true;}
function openChangelog(){pause();$('changelogDialog').showModal();}
$('changelogBtn').addEventListener('click',openChangelog);
$('closeChangelogBtn').addEventListener('click',()=>$('changelogDialog').close());
$('changelogDialog').addEventListener('close',()=>{markChangelogSeen();resume();});
try{changelogShown=localStorage.getItem('nursedoku-changelog')===UPDATE_VERSION;}catch{}
if(finished&&!lost)showBonus();
updateMenu();
if(!changelogShown)openChangelog();
