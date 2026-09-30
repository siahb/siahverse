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
const QUIZ_VERSION='nclex-2026-09-29';
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
    else if(kind==='zone'){tone(659,0,.10,.025);tone(784,.07,.14,.025);tone(1047,.14,.18,.02);}
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
stats.questionHistory=normalizeQuestionHistory(stats.questionHistory);
let completedShifts=[];
try {const current=progressStorage.getItem('nursedoku-journey-v2');const x=JSON.parse(current||progressStorage.getItem('nursedoku-journey'));if(Array.isArray(x))completedShifts=[...new Set(x.filter(v=>Number.isInteger(v)&&v>=0&&v<LEVELS.length).map(v=>current?v:migrateLevel(v)))];}catch{}
let level = 0, state, history = [], elapsed = 0, runningSince = null, finished = false, strikes=0, lost=false;
let inGame=false,winTimeout=null,winSequence=0,bonusIndex=null,bonusChoice=null,bonusSubmitted=false;
let gesture = null, lastTap = null, pendingTap = null, hintCell = null;
let clearedZones=new Set(),zoneClearTimeout=null;
const puzzle = () => customPuzzle || LEVELS[level];
const size = () => puzzle().regions.length;
const blank = () => Array.from({length:size()}, () => Array(size()).fill(''));
const copy = value => JSON.parse(JSON.stringify(value));
const time = () => elapsed + (runningSince === null ? 0 : Date.now() - runningSince);
const format = ms => `${String(Math.floor(ms / 60000)).padStart(2,'0')}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}`;
function persist() {
  try { progressStorage.setItem(SAVE_KEY, JSON.stringify({level,state,elapsed:time(),finished,gameKind,customPuzzle,dailyDate,strikes,lost,journeyVersion:2,bonusIndex,bonusChoice,bonusSubmitted,bonusVersion:QUIZ_VERSION})); } catch {}
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
  clearedZones=completedCareZones();clearTimeout(zoneClearTimeout);$('zoneClearMessage').hidden=true;
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
  updateZoneClears();
  if(!finished&&strikes===0&&gameKind==='journey'&&level===0&&!ps.length) {
    const col=puzzle().solution[0];
    board.children[col].classList.add('hint');
    tell('Start with the single gold square. Double-tap it to place your first RN.');
  }
}
function completedCareZones(){
 const result=new Set();
 for(let z=0;z<size();z++){
  const cells=[];puzzle().regions.forEach((row,r)=>row.forEach((v,c)=>{if(v===z)cells.push({r,c,mark:state[r][c]});}));
  const rns=cells.filter(x=>x.mark==='rn');
  if(rns.length===1&&puzzle().solution[rns[0].r]===rns[0].c&&cells.every(x=>x.mark==='rn'||x.mark==='x'))result.add(z);
 }
 return result;
}
function updateZoneClears(){
 const now=completedCareZones(),fresh=[...now].filter(z=>!clearedZones.has(z));clearedZones=now;
 if(!fresh.length)return;
 for(const cell of board.children)if(fresh.includes(puzzle().regions[+cell.dataset.row][+cell.dataset.col])){
  cell.classList.add('zone-cleared');setTimeout(()=>cell.classList.remove?.('zone-cleared'),700);
 }
 const message=$('zoneClearMessage');message.textContent=fresh.length===1?`Care zone ${fresh[0]+1} cleared!`:`${fresh.length} care zones cleared!`;
 message.hidden=false;clearTimeout(zoneClearTimeout);sound('zone');
 zoneClearTimeout=setTimeout(()=>{message.hidden=true;},1800);
}
function afterMove() {
  hintCell=null; paint();
  if(finished){persist();return;}
  if(positions().length===size() && !conflicts().size) {
    finished=true; elapsed=time();runningSince=null;
    recordWin();bonusIndex=chooseQuestion();bonusChoice=null;bonusSubmitted=false;showBonus();
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
function flushTap() { clearTap(); }
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
    const first=lastTap;clearTap();state=first.before;history.length=first.historyLength;
    toggle(r,c,'rn');
  } else {
    flushTap();const before=copy(state),historyLength=history.length;toggle(r,c,'x');
    lastTap={r,c,at:Date.now(),before,historyLength};
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
 for(const g of groups)if(g.ids.length===1){const x=g.ids[0];return {...x,kind:'rn',text:`Only row ${x.r+1}, column ${x.c+1} can staff ${label(g.type,g.k)}. ${cells.filter(y=>y[g.type]===g.k).length===1?'This care zone contains just one square, and every care zone needs an RN.':'The other squares are ruled out by placed RNs in their row, column, care zone, or neighboring cells.'} ${marks[x.r][x.c]==='x'?'Erase that X, then double-tap':'Double-tap'} the outlined square to place an RN.`};}
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
      if(saved.bonusVersion!==QUIZ_VERSION){bonusIndex=null;bonusChoice=null;bonusSubmitted=false;}
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
const palettes={general:['#e9bd43','#9b7ad5','#acd68d','#d87579','#f5abc9','#53b7b5','#6481be','#ffa66f','#a7c9ef','#bfca6d'],peds:['#ffbe55','#a293e1','#85d5ad','#ff918f','#ef9fc9','#77cbdc','#8ca6e7','#edbe92','#b8dce8','#d6d98a'],ed:['#e4b441','#9a88d7','#97c785','#d66d7e','#e69abb','#49b2ae','#627dbc','#f49a61','#a0cce7','#b2be65']};
function theme(name) { (palettes[name]||palettes.general).forEach((v,i)=>document.documentElement.style.setProperty('--r'+i,v));$('theme').value=palettes[name]?name:'general';try{localStorage.setItem('nursedoku-theme',$('theme').value);}catch{}}
$('theme').addEventListener('change',()=>theme($('theme').value));
try {theme(localStorage.getItem('nursedoku-theme'));}catch{}
// Original NCLEX-style practice items; clinical sources reviewed September 29, 2026.
const BONUS=[
 {

  "id": "nclex-00001",  "topic": "Adult health · Take action",
  "q": "An adult client who takes insulin is shaky and diaphoretic. Blood glucose is 54 mg/dL. The client is alert and can swallow safely. Which action should the nurse take first?",
  "a": [
   "Give 15–20 g of fast-acting carbohydrate",
   "Administer the scheduled rapid-acting insulin",
   "Wait for the next meal tray",
   "Give a protein-only snack"
  ],
  "correct": 0,
  "why": "Treat confirmed hypoglycemia promptly with fast-acting carbohydrate when swallowing is safe. Insulin would lower glucose further; waiting delays treatment, and protein alone does not raise glucose quickly.",
  "source": "https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/low-blood-glucose-hypoglycemia",
  "sourceLabel": "Read clinical source"
 },
 {

  "id": "nclex-00002",  "topic": "Adult health · Evaluate outcomes",
  "q": "A client received glucose tablets for hypoglycemia 15 minutes ago. Repeat blood glucose is 62 mg/dL, and the client remains alert and can swallow. What is the best next action?",
  "a": [
   "Document that treatment was successful",
   "Give another 15–20 g of fast-acting carbohydrate and recheck in 15 minutes",
   "Give the next insulin dose early",
   "Wait one hour before repeating the glucose test"
  ],
  "correct": 1,
  "why": "A glucose of 62 mg/dL remains low. Repeat the fast-acting carbohydrate treatment and reassess after 15 minutes. The first treatment did not yet correct the low glucose.",
  "source": "https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/low-blood-glucose-hypoglycemia",
  "sourceLabel": "Read clinical source"
 },
 {

  "id": "nclex-00003",  "topic": "Emergency · Prioritize care",
  "q": "The triage nurse receives four clients. Which client needs immediate evaluation?",
  "a": [
   "A client with a healed incision requesting dressing supplies",
   "A client with unchanged knee pain for three months",
   "A client with sudden facial droop and difficulty speaking that began 20 minutes ago",
   "A client requesting a routine prescription renewal"
  ],
  "correct": 2,
  "why": "Sudden facial weakness and speech changes suggest a stroke, a time-sensitive emergency. Activate the facility stroke response. The other presentations described do not show an acute threat.",
  "source": "https://www.nhlbi.nih.gov/health/stroke",
  "sourceLabel": "Read clinical source"
 },
 {

  "id": "nclex-00004",  "topic": "Pharmacology · Recognize cues",
  "q": "A client who received an opioid is difficult to awaken and has slow, shallow breathing. Which complication should the nurse suspect?",
  "a": [
   "Expected pain relief without a safety concern",
   "Opioid-related respiratory depression",
   "A harmless medication taste change",
   "A therapeutic increase in alertness"
  ],
  "correct": 1,
  "why": "Reduced responsiveness and slow breathing raise concern for opioid toxicity. The nurse should urgently assess and support breathing and activate emergency assistance rather than dismissing these findings.",
  "source": "https://www.fda.gov/drugs/drug-safety-communications/fda-recommends-health-care-professionals-discuss-naloxone-all-patients-when-prescribing-opioid-pain",
  "sourceLabel": "Read clinical source"
 },
 {

  "id": "nclex-00005",  "topic": "Pharmacology · Antidotes",
  "q": "Emergency help has been activated for a client with suspected opioid overdose. Which medication should the nurse anticipate administering per protocol to reverse opioid effects?",
  "a": [
   "Insulin",
   "Naloxone",
   "Acetaminophen",
   "Furosemide"
  ],
  "correct": 1,
  "why": "Naloxone reverses opioid overdose. It supports emergency treatment; emergency assistance and monitoring are still needed. The other listed medications do not reverse opioid effects.",
  "source": "https://www.fda.gov/consumers/consumer-updates/access-naloxone-can-save-life-during-opioid-overdose",
  "sourceLabel": "Read clinical source"
 },
 {

  "id": "nclex-00006",  "topic": "Pediatrics · Prioritize care",
  "q": "A child with asthma continues to have severe breathing difficulty after the prescribed reliever medicine. What should the nurse advise the caregiver to do?",
  "a": [
   "Wait until the next routine appointment",
   "Stop all asthma medicines permanently",
   "Seek emergency care now",
   "Give cough syrup and reassess tomorrow"
  ],
  "correct": 2,
  "why": "Severe symptoms or symptoms that persist after reliever treatment require urgent medical care. Waiting or substituting cough medicine delays assessment and treatment of compromised breathing.",
  "source": "https://www.nhlbi.nih.gov/health/asthma/attacks",
  "sourceLabel": "Read clinical source"
 },
 {

  "id": "nclex-00007",  "topic": "Pediatrics · Teaching",
  "q": "A toddler with diarrhea from food poisoning is alert and has been prescribed oral rehydration. Which caregiver statement shows understanding?",
  "a": [
   "I will use the oral rehydration solution as directed",
   "I will withhold all liquids until diarrhea stops",
   "I will start an adult antidiarrheal without asking the clinician",
   "I will replace all fluids with soda"
  ],
  "correct": 0,
  "why": "Oral rehydration solution helps replace fluid and electrolytes. Withholding fluids increases dehydration risk. Over-the-counter antidiarrheals can be unsafe for young children and require clinician guidance.",
  "source": "https://www.niddk.nih.gov/health-information/digestive-diseases/food-poisoning/treatment",
  "sourceLabel": "Read clinical source"
 },
 {

  "id": "nclex-00008",  "topic": "Mental health · Assess safety",
  "q": "A client says, “Everyone would be better off without me.” Which response best begins a suicide-risk assessment?",
  "a": [
   "You should not feel that way",
   "Are you thinking about killing yourself?",
   "Let us talk about something happier",
   "You would never actually do that, right?"
  ],
  "correct": 1,
  "why": "Ask directly and nonjudgmentally about suicide. Direct questioning helps identify risk and does not increase suicidal thoughts. Reassurance, changing the subject, or a leading question can prevent disclosure.",
  "source": "https://www.nimh.nih.gov/health/publications/suicide-faq",
  "sourceLabel": "Read clinical source"
 },
 {

  "id": "nclex-00009",  "topic": "Oncology · Recognize risk",
  "q": "A client receiving chemotherapy calls with a temperature of 101°F (38.3°C). Which instruction is most appropriate?",
  "a": [
   "Wait until the next clinic visit",
   "Take a fever reducer and do not report it",
   "Contact the oncology team immediately for urgent evaluation",
   "Assume this is expected and continue usual activities"
  ],
  "correct": 2,
  "why": "Fever during chemotherapy can signal an infection, especially when neutrophils are low. The client needs prompt evaluation. Suppressing or ignoring fever can delay identification of a serious infection.",
  "source": "https://www.cancer.gov/about-cancer/treatment/side-effects/infection",
  "sourceLabel": "Read clinical source"
 },
 {

  "id": "nclex-00010",  "topic": "Emergency · Teaching",
  "q": "During a follow-up call, a client reports new chest pressure, shortness of breath, and sweating at rest. Which instruction should the nurse give first?",
  "a": [
   "Drive to the clinic tomorrow",
   "Call 911 now for emergency medical care",
   "Wait to see whether symptoms resolve overnight",
   "Schedule a routine laboratory appointment"
  ],
  "correct": 1,
  "why": "This symptom combination can indicate a heart attack. Emergency medical services can begin evaluation and treatment. Do not delay care or advise the symptomatic client to drive.",
  "source": "https://www.nhlbi.nih.gov/health/heart-attack/symptoms",
  "sourceLabel": "Read clinical source"
 },
 {

  "id": "nclex-00011",  "topic": "Dosage calculation · IV fluids",
  "q": "The prescription is to infuse 1,000 mL of IV fluid over 8 hours. At what rate should the nurse set the infusion pump?",
  "a": [
   "80 mL/hr",
   "100 mL/hr",
   "125 mL/hr",
   "250 mL/hr"
  ],
  "correct": 2,
  "why": "Rate = volume ÷ time: 1,000 mL ÷ 8 hr = 125 mL/hr. Check that the pump unit is mL/hr.",
  "source": null,
  "sourceLabel": "Read clinical source"
 },
 {

  "id": "nclex-00012",  "topic": "Pediatrics · Dosage calculation",
  "q": "A child weighs 20 kg. The prescription is acetaminophen 15 mg/kg PO for one dose. The bottle contains 160 mg/5 mL. How many mL should the nurse give? Round only the final answer to the nearest tenth.",
  "a": [
   "3.0 mL",
   "6.3 mL",
   "9.4 mL",
   "15.0 mL"
  ],
  "correct": 2,
  "why": "Ordered dose: 20 kg × 15 mg/kg = 300 mg. Volume: 300 mg × 5 mL ÷ 160 mg = 9.375 mL. Rounded to the nearest tenth: 9.4 mL. The dose is supplied by this question’s prescription.",
  "source": null,
  "sourceLabel": "Read clinical source"
 }
];
function normalizeQuestionHistory(value){
 const result={};
 if(value&&typeof value==='object'&&!Array.isArray(value))for(const [id,status] of Object.entries(value)){
  if(/^nclex-\d{5}$/.test(id)&&['seen','missed','correct'].includes(status))result[id]=status;
 }
 return result;
}
function saveQuestionHistory(){
 progressStorage.setItem('nursedoku-stats',JSON.stringify(stats));persist();
}
function chooseQuestion(){
 const unseen=BONUS.findIndex(item=>!stats.questionHistory[item.id]);
 if(unseen>=0)return unseen;
 const missed=BONUS.map((item,index)=>({item,index})).filter(({item})=>stats.questionHistory[item.id]==='missed');
 return missed.length?missed[Math.floor(Math.random()*missed.length)].index:-1;
}
function showBonus() {
 const index=Number.isInteger(bonusIndex)&&bonusIndex>=0&&bonusIndex<BONUS.length?bonusIndex:chooseQuestion();
 bonusIndex=index;
 if(index<0){
  bonusChoice=null;bonusSubmitted=true;
  $('bonusTopic').textContent='Question bank complete';$('bonusQuestion').textContent='You’re caught up!';
  $('bonusAnswers').innerHTML='';$('bonusSource').hidden=true;$('bonusFeedback').className='feedback-correct';
  $('bonusFeedback').textContent='You have no new questions or missed questions to review. New questions will appear here as the bank grows.';
  $('confirmBonusBtn').hidden=true;$('playAgainBtn').disabled=false;updateResultLinks();persist();return;
 }
 $('confirmBonusBtn').hidden=false;
 const item=BONUS[index];
 if(!stats.questionHistory[item.id]){stats.questionHistory[item.id]='seen';saveQuestionHistory();}
 if(!Number.isInteger(bonusChoice)||bonusChoice<0||bonusChoice>=item.a.length){bonusChoice=null;bonusSubmitted=false;}
 if(bonusSubmitted&&stats.questionHistory[item.id]!=='correct'){stats.questionHistory[item.id]=bonusChoice===item.correct?'correct':'missed';saveQuestionHistory();}
 $('bonusTopic').textContent=item.topic;$('bonusQuestion').textContent=item.q;$('bonusAnswers').innerHTML='';$('bonusFeedback').textContent='';
 $('bonusFeedback').className='';$('shareStatus').textContent='';$('bonusSource').href=item.source;
 $('bonusSource').hidden=!bonusSubmitted||!item.source;$('bonusSource').textContent=item.sourceLabel||'Read clinical source';
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
  $('bonusSource').hidden=!item.source;
 }
 choices.forEach(({answer,i})=>{
  const button=document.createElement('button');button.type='button';button.className='secondary-btn bonus-answer';button.textContent=answer;button.dataset.choice=i;
  button.onclick=()=>{if(bonusSubmitted)return;bonusChoice=i;updateSelection();$('bonusFeedback').textContent='Ready? Confirm your answer to see the explanation.';persist();};
  $('bonusAnswers').append(button);
 });
 $('confirmBonusBtn').onclick=()=>{if(bonusChoice===null||bonusSubmitted)return;bonusSubmitted=true;stats.questionHistory[item.id]=bonusChoice===item.correct?'correct':'missed';updateSelection();feedback();saveQuestionHistory();};
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
function updateResultLinks(){socialLinks('resultShare',resultText());$('resultShareFacebook').href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(SHARE_URL);}
async function copyShare(text,status){
 try{await navigator.clipboard.writeText(text);$(status).textContent='Copied. Paste it in your post or message.';}
 catch{$(status).textContent=text;}
}
async function nativeShare(text,status){
 if(navigator.share){try{await navigator.share({title:'NurseDoku',text,url:SHARE_URL});$(status).textContent='Share sheet opened.';return;}catch(error){if(error.name==='AbortError')return;}}
 await copyShare(text+'\n'+SHARE_URL,status);
}
async function shareInstagram(isResult){
 const status=isResult?'shareStatus':'menuShareStatus',button=$(isResult?'resultShareInstagram':'menuShareInstagram');
 button.disabled=true;
 try{
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#edf5f2';ctx.fillRect(0,0,1080,1350);ctx.textAlign='center';ctx.fillStyle='#0b6b78';
  ctx.font='bold 72px system-ui';ctx.fillText('NurseDoku',540,140);
  ctx.font='32px system-ui';ctx.fillText(isResult?'Shift complete!':'A little logic. A little nursing.',540,206);
  if(isResult){
   const n=size(),span=880,step=span/n,left=100,top=305,colors=palettes[$('theme').value]||palettes.general;
   puzzle().regions.forEach((row,r)=>row.forEach((z,c)=>{
    ctx.fillStyle=colors[z];ctx.fillRect(left+c*step+3,top+r*step+3,step-6,step-6);
    if(state[r][c]==='rn'){ctx.fillStyle='#17212b';ctx.font=`bold ${Math.floor(step*.35)}px system-ui`;ctx.fillText('RN',left+(c+.5)*step,top+(r+.62)*step);}
   }));
   ctx.fillStyle='#0b6b78';ctx.font='bold 32px system-ui';ctx.fillText(format(elapsed)+' · '+n+'×'+n+' · '+strikes+'/3 strikes',540,1260);
  }else{
   const colors=palettes.general;ctx.font='bold 64px system-ui';
   for(let r=0;r<3;r++)for(let c=0;c<3;c++){const x=205+c*230,y=400+r*230;ctx.fillStyle=colors[(r*3+c)%colors.length];ctx.fillRect(x,y,210,210);ctx.fillStyle='#17212b';ctx.fillText(['RN','×',''][((r*3+c)*7)%3],x+105,y+130);}
   ctx.fillStyle='#0b6b78';ctx.font='32px system-ui';ctx.fillText('Your next little victory.',540,1190);
  }
  ctx.fillStyle='#48666b';ctx.font='26px system-ui';ctx.fillText('siahverse.cc/nursedoku',540,1310);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('No image');
  const file=new File([blob],'nursedoku-'+(isResult?'results':'play')+'.png',{type:'image/png'});
  if(navigator.share&&navigator.canShare?.({files:[file]})){
   try{await navigator.share({files:[file],title:'NurseDoku'});$(status).textContent='Choose Instagram from your share options.';return;}catch(error){if(error.name==='AbortError')return;}
  }
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  $(status).textContent='Image saved. Add it to your Instagram story or post.';
 }catch{$(status).textContent='Could not create the image. Try the Share button.';}finally{button.disabled=false;}
}
$('resultShareInstagram').addEventListener('click',()=>shareInstagram(true));
$('menuShareInstagram').addEventListener('click',()=>shareInstagram(false));
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
 snapshot(){return copy({version:2,game:{level,state,elapsed:time(),finished,gameKind,customPuzzle,dailyDate,strikes,lost,journeyVersion:2,bonusIndex,bonusChoice,bonusSubmitted,bonusVersion:QUIZ_VERSION},stats,completed:completedShifts});},
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
  if(g.bonusVersion!==QUIZ_VERSION){bonusIndex=null;bonusChoice=null;bonusSubmitted=false;}
  clearTimeout(winTimeout);winSequence++;
  lost=g.lost===true&&strikes===3;finished=lost||(g.finished===true&&positions().length===n&&!conflicts().size);
  history=[];hintCell=null;
  completedShifts=Array.isArray(v.completed)?[...new Set(v.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<LEVELS.length))]:[];
  const st=v.stats||{};
  stats={questionHistory:normalizeQuestionHistory(st.questionHistory),wins:Number.isInteger(st.wins)&&st.wins>=0?st.wins:0,best:Number.isFinite(st.best)&&st.best>=0?st.best:null,dailyDates:Array.isArray(st.dailyDates)?[...new Set(st.dailyDates.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)))]:[]};
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
const DAILY_TIPS=[
 {
  "text": "Low glucose, safe swallow: for an alert adult with hypoglycemia who can swallow safely, give 15–20 g of fast-acting carbohydrate.",
  "source": "https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/low-blood-glucose-hypoglycemia",
  "sourceLabel": "NIDDK"
 },
 {
  "text": "Recheck after treating hypoglycemia: repeat the glucose check in 15 minutes. If it is still low and swallowing remains safe, repeat the fast-acting carbohydrate.",
  "source": "https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/low-blood-glucose-hypoglycemia",
  "sourceLabel": "NIDDK"
 },
 {
  "text": "Exercise can lower blood glucose during activity and for hours afterward. Teach insulin users to plan glucose checks and carry fast-acting carbohydrate.",
  "source": "https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/low-blood-glucose-hypoglycemia",
  "sourceLabel": "NIDDK"
 },
 {
  "text": "Ask directly about suicidal thoughts. Asking does not cause or increase suicidal thinking, and it can help identify someone who needs support.",
  "source": "https://www.nimh.nih.gov/health/publications/suicide-faq",
  "sourceLabel": "NIMH"
 },
 {
  "text": "If someone says they intend to kill themselves, stay with them and get help. Do not promise secrecy; immediate danger requires emergency assistance.",
  "source": "https://www.nimh.nih.gov/health/publications/suicide-faq",
  "sourceLabel": "NIMH"
 },
 {
  "text": "Fever during chemotherapy deserves urgent attention. Contact the oncology team promptly; fever-reducing medicines can mask signs of infection.",
  "source": "https://www.cancer.gov/about-cancer/treatment/side-effects/infection",
  "sourceLabel": "National Cancer Institute"
 },
 {
  "text": "Think FAST: facial droop, arm weakness, and speech changes can signal stroke. Call 911 immediately in the community; early treatment matters.",
  "source": "https://www.nhlbi.nih.gov/health/stroke/symptoms",
  "sourceLabel": "NHLBI"
 }
];
let dismissedTipDate='';
try{dismissedTipDate=localStorage.getItem('nursedoku-tip-dismissed')||'';}catch{}
function tipForDate(date){
 const [year,month,day]=date.split('-').map(Number);
 const index=Math.floor(Date.UTC(year,month-1,day)/86400000);
 return DAILY_TIPS[((index%DAILY_TIPS.length)+DAILY_TIPS.length)%DAILY_TIPS.length];
}
function renderDailyTip(date=localDate()){
 const tip=tipForDate(date);
 $('dailyTipCard').hidden=dismissedTipDate===date;
 $('dailyTipText').textContent=tip.text;$('dailyTipSource').href=tip.source;
 $('dailyTipSource').textContent='Source: '+tip.sourceLabel;
}
$('dismissTipBtn').addEventListener('click',()=>{
 dismissedTipDate=localDate();try{localStorage.setItem('nursedoku-tip-dismissed',dismissedTipDate);}catch{}
 renderDailyTip();$('continueBtn').focus();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderDailyTip();});
function updateMenu(){
 renderDailyTip();
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
const UPDATE_VERSION='2026-09-29-v1.1.0';
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
