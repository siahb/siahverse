const LEVELS = [{"regions": [[2, 0, 1, 1], [2, 2, 1, 1], [2, 2, 1, 1], [3, 3, 3, 3]], "solution": [1, 3, 0, 2]}, {"regions": [[0, 0, 0, 0], [2, 0, 0, 1], [2, 0, 3, 3], [2, 2, 3, 3]], "solution": [1, 3, 0, 2]}, {"regions": [[0, 0, 0, 0, 2], [1, 1, 0, 0, 2], [1, 3, 0, 0, 2], [1, 3, 3, 3, 4], [3, 3, 3, 4, 4]], "solution": [2, 0, 4, 1, 3]}, {"regions": [[2, 0, 0, 1, 1], [2, 2, 2, 1, 1], [2, 2, 2, 1, 1], [2, 2, 3, 3, 3], [2, 2, 3, 3, 4]], "solution": [1, 3, 0, 2, 4]}, {"regions": [[3, 0, 1, 1, 1, 1], [3, 3, 2, 1, 1, 1], [3, 3, 2, 2, 1, 1], [3, 3, 2, 2, 1, 1], [3, 3, 2, 4, 4, 4], [3, 3, 4, 4, 4, 5]], "solution": [1, 4, 2, 0, 3, 5]}, {"regions": [[2, 0, 0, 0, 1, 1], [2, 0, 1, 1, 1, 1], [2, 2, 2, 1, 3, 1], [2, 2, 2, 1, 3, 5], [4, 4, 4, 4, 4, 5], [4, 4, 4, 4, 5, 5]], "solution": [1, 3, 0, 4, 2, 5]}, {"regions": [[1, 1, 1, 0, 0, 0], [1, 1, 1, 0, 0, 0], [1, 1, 1, 1, 1, 2], [3, 3, 3, 4, 1, 2], [3, 3, 3, 4, 1, 2], [5, 3, 4, 4, 4, 4]], "solution": [4, 2, 5, 1, 3, 0]}, {"regions": [[2, 2, 0, 0, 0, 1], [2, 2, 3, 3, 3, 1], [2, 2, 2, 2, 3, 3], [5, 5, 2, 2, 3, 3], [5, 4, 4, 3, 3, 3], [5, 5, 5, 3, 3, 3]], "solution": [3, 5, 1, 4, 2, 0]}];
LEVELS.push(...PUZZLE_BANK.easy.slice(0,12),...PUZZLE_BANK.medium.slice(0,12),...PUZZLE_BANK.hard.slice(0,12));
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
  $('soundBtn').textContent=soundEnabled?'Sound on':'Sound off';
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
    else if(kind==='undo')tone(520,0,.08,.025,330);
    else if(kind==='new') {tone(392,0,.10,.025);tone(523,.08,.13,.025);}
  }catch{}
}
function celebrate() {
  const layer=$('celebration');layer.innerHTML='';
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

let gameKind='journey', customPuzzle=null, dailyDate=null;
let stats={wins:0,best:null,dailyDates:[]};
try { const x=JSON.parse(localStorage.getItem('nursedoku-stats'));if(x&&Number.isInteger(x.wins)&&x.wins>=0&&Array.isArray(x.dailyDates))stats=x; } catch {}
let completedShifts=[];
try {const x=JSON.parse(localStorage.getItem('nursedoku-journey'));if(Array.isArray(x))completedShifts=x.filter(v=>Number.isInteger(v)&&v>=0&&v<LEVELS.length);}catch{}
let level = 0, state, history = [], elapsed = 0, runningSince = null, finished = false;
let gesture = null, lastTap = null, pendingTap = null, hintCell = null;
const puzzle = () => customPuzzle || LEVELS[level];
const size = () => puzzle().regions.length;
const blank = () => Array.from({length:size()}, () => Array(size()).fill(''));
const copy = value => JSON.parse(JSON.stringify(value));
const time = () => elapsed + (runningSince === null ? 0 : Date.now() - runningSince);
const format = ms => `${String(Math.floor(ms / 60000)).padStart(2,'0')}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}`;
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({level,state,elapsed:time(),finished,gameKind,customPuzzle,dailyDate})); } catch {}
}
function pause() { elapsed = time(); runningSince = null; persist(); }
function resume() { if (!finished && !document.hidden && runningSince===null) runningSince = Date.now(); }
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
  board.innerHTML=''; board.style.gridTemplateColumns=`repeat(${size()},1fr)`;
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
  document.querySelectorAll('.zone-dot').forEach(dot=>{
    const count=ps.filter(([r,c])=>puzzle().regions[r][c]===+dot.dataset.zone).length;
    dot.textContent=count===1?'✓':count>1?'!':'';
    dot.setAttribute('aria-label',`Care zone ${+dot.dataset.zone+1}: ${count} RNs`);
  });
  $('undoBtn').disabled=!history.length||finished;
  if(gameKind==='journey'&&level===0&&!ps.length) {
    const col=puzzle().solution[0];
    board.children[col].classList.add('hint');
    tell('Start with the single gold square. Double-tap it to place your first RN.');
  }
}
function afterMove() {
  hintCell=null; paint();
  if(positions().length===size() && !conflicts().size) {
    finished=true; elapsed=time();runningSince=null;
    recordWin(); showBonus();
    $('timer').textContent=format(elapsed);$('finalTime').textContent=format(elapsed);
    tell('Shift complete. Every care zone is staffed!','success');
    $('playAgainBtn').textContent=gameKind==='daily'?'Play a practice shift':gameKind==='practice'?'New practice shift':level===LEVELS.length-1?'Replay from shift 001':'Next shift';
    $('winDialog').showModal(); celebrate(); sound('win'); paint();
  } else if(conflicts().size) tell('Outlined RNs conflict. Check rows, columns, colors, and touching cells.','error');
  else if(gameKind==='journey'&&level===0 && positions().length) tell('Great! Mark cells in that RN’s row, column, and neighboring squares with Xs.');
  else tell('One RN per row, column, and color. RNs cannot touch.');
  persist();
}
function toggle(r,c,mark) {
  if(finished)return;
  remember();state[r][c]=state[r][c]===mark?'':mark;
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
  markDrag(gesture.start);
}
function markDrag(pos) {
  if(!pos)return;
  const [r,c]=pos,key=`${r},${c}`;
  if(gesture.seen.has(key))return;
  gesture.seen.add(key);
  // Dragging only adds Xs; it never erases an RN or toggles a cell twice.
  if(state[r][c]!=='rn'&&state[r][c]!=='x'){state[r][c]='x';sound('x');}
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
$('hintBtn').addEventListener('click',()=>{
  flushTap();if(finished)return;sound('hint');
  const wrong=positions().find(([r,c])=>puzzle().solution[r]!==c);
  if(wrong) {hintCell=wrong.join(',');paint();tell('Reconsider this RN. It blocks the solution.','error');return;}
  const r=puzzle().solution.findIndex((c,r)=>state[r][c]!=='rn');
  if(r>=0){hintCell=`${r},${puzzle().solution[r]}`;paint();tell('Double-tap the outlined square to place an RN.');}
});
function reset(next=false) {
  clearTap();if(next) {
    if(gameKind==='daily') {gameKind='practice';dailyDate=null;customPuzzle=practicePuzzle($('difficulty').value,Date.now());}
    else if(gameKind==='practice')customPuzzle=practicePuzzle($('difficulty').value,Date.now());
    else level=(level+1)%LEVELS.length;
  }
  state=blank();history=[];finished=false;hintCell=null;elapsed=0;runningSince=null;
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
  const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
  if(saved && Number.isInteger(saved.level)&&saved.level>=0&&saved.level<LEVELS.length) {
    level=saved.level;
    if(['daily','practice'].includes(saved.gameKind)&&validPuzzle(saved.customPuzzle)) {
      gameKind=saved.gameKind;customPuzzle=saved.customPuzzle;dailyDate=saved.dailyDate;
    }
    if(Array.isArray(saved.state)&&saved.state.length===size()&&saved.state.every(row=>Array.isArray(row)&&row.length===size()&&row.every(v=>['','rn','x'].includes(v)))) {
      state=saved.state;elapsed=Number.isFinite(saved.elapsed)?Math.max(0,saved.elapsed):0;
      finished=saved.finished===true && positions().length===size() && !conflicts().size;
    }
  }
} catch {}
if(!state)state=blank();
render();resume();updateStats();
if(finished) {
  $('finalTime').textContent=format(elapsed);$('playAgainBtn').textContent=gameKind==='daily'?'Play a practice shift':gameKind==='practice'?'New practice shift':level===LEVELS.length-1?'Replay from shift 001':'Next shift';$('winDialog').showModal();
}
$('timer').textContent=format(time());setInterval(()=>{$('timer').textContent=format(time());},500);

function validPuzzle(p) {
  return p&&[4,6,8].includes(p.regions?.length)&&p.regions.every(row=>Array.isArray(row)&&row.length===p.regions.length&&row.every(z=>Number.isInteger(z)&&z>=0&&z<p.regions.length))&&Array.isArray(p.solution)&&p.solution.length===p.regions.length&&p.solution.every(c=>Number.isInteger(c)&&c>=0&&c<p.regions.length);
}
function localDate(d=new Date()) {return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function updateStats() {
  let streak=0,d=new Date();
  if(!stats.dailyDates.includes(localDate(d)))d.setDate(d.getDate()-1);
  while(stats.dailyDates.includes(localDate(d))) {streak++;d.setDate(d.getDate()-1);}
  $('statsLine').textContent=`${stats.wins} shifts solved · ${streak} day daily streak${stats.best!==null?' · Best '+format(stats.best):''}`;
}
function recordWin() {
  if(gameKind==='journey'&&!completedShifts.includes(level)){completedShifts.push(level);try{localStorage.setItem('nursedoku-journey',JSON.stringify(completedShifts));}catch{}}
  stats.wins++;stats.best=stats.best===null?elapsed:Math.min(stats.best,elapsed);
  if(gameKind==='daily'&&dailyDate&&!stats.dailyDates.includes(dailyDate))stats.dailyDates.push(dailyDate);
  try {localStorage.setItem('nursedoku-stats',JSON.stringify(stats));}catch {}
  updateStats();updatePuzzleInfo();
}
function switchGame(kind) {
  flushTap();
  if(!finished&&state.flat().some(Boolean)&&!confirm('Start a new puzzle? Your current placements will be cleared.'))return;
  gameKind=kind;dailyDate=kind==='daily'?localDate():null;
  let seed=Date.now();if(dailyDate)seed=Number(dailyDate.replaceAll('-',''));
  customPuzzle=kind==='journey'?null:kind==='daily'?generatePuzzle(6,seed):practicePuzzle($('difficulty').value,seed);
  if(kind==='journey'){level=Array.from({length:LEVELS.length},(_,i)=>i).find(i=>!completedShifts.includes(i))??0;}
  reset();
}
$('dailyBtn').addEventListener('click',()=>switchGame('daily'));
$('practiceBtn').addEventListener('click',()=>switchGame('practice'));
$('journeyBtn').addEventListener('click',()=>switchGame('journey'));
const palettes={general:['#e9bd43','#9b7ad5','#acd68d','#d87579','#f5abc9','#53b7b5','#6481be','#ffa66f'],peds:['#ffbe55','#a293e1','#85d5ad','#ff918f','#ef9fc9','#77cbdc','#8ca6e7','#edbe92'],ed:['#e4b441','#9a88d7','#97c785','#d66d7e','#e69abb','#49b2ae','#627dbc','#f49a61']};
function theme(name) { (palettes[name]||palettes.general).forEach((v,i)=>document.documentElement.style.setProperty('--r'+i,v));$('theme').value=palettes[name]?name:'general';try{localStorage.setItem('nursedoku-theme',$('theme').value);}catch{}}
$('theme').addEventListener('change',()=>theme($('theme').value));
try {theme(localStorage.getItem('nursedoku-theme'));}catch{}
const BONUS=[
 {q:'A nurse’s hands are visibly soiled after care. Which hand hygiene method is appropriate?',a:['Wash with soap and water','Use gloves without cleaning hands','Wipe hands with a dry towel'],correct:0,why:'Visible soil requires soap and water. Gloves do not replace hand hygiene.'},
 {q:'After removing gloves, what should the nurse do?',a:['Clean hands','Skip hand hygiene if gloves were intact','Put on a second pair without cleaning'],correct:0,why:'Perform hand hygiene after glove removal to reduce the spread of germs.'},
 {q:'In most routine clinical situations when hands are not visibly soiled, which method does CDC prefer?',a:['Water alone','Alcohol-based hand sanitizer','A dry paper towel'],correct:1,why:'Alcohol-based hand sanitizer is preferred in most clinical situations when hands are not visibly soiled.'}
];
function showBonus() {
 const item=BONUS[(stats.wins-1+BONUS.length)%BONUS.length];$('bonusQuestion').textContent=item.q;$('bonusAnswers').innerHTML='';$('bonusFeedback').textContent='';
 item.a.forEach((answer,i)=>{const b=document.createElement('button');b.type='button';b.className='secondary-btn';b.textContent=answer;b.onclick=()=>{$('bonusFeedback').textContent=(i===item.correct?'Correct. ':'Try again. ')+item.why;};$('bonusAnswers').append(b);});
}
if(finished)showBonus();

function practicePuzzle(difficulty,seed) {
 const pool=PUZZLE_BANK[difficulty]||PUZZLE_BANK.medium;
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
 $('puzzleInfo').textContent=gameKind==='journey'?`Training ${level+1} of ${LEVELS.length} · ${completedShifts.length} completed`:`${rating.difficulty[0].toUpperCase()+rating.difficulty.slice(1)} · ${descriptions[rating.difficulty]} · ${size()}×${size()}${gameKind==='daily'?' · '+dailyDate:''}`;
 $('milestone').textContent=stats.wins>=25?'Milestone: 25 shifts completed':stats.wins>=10?'Milestone: 10 shifts completed':stats.wins>=1?'Milestone: first shift completed':'';
}
function openArchive() {
 $('archiveDate').max=localDate();$('archiveDate').value=localDate();
 $('archiveStatus').textContent=`${stats.dailyDates.length} daily puzzles completed. Choose today or an earlier date.`;
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
 $('archiveDialog').close();reset();
});
$('shareBtn').addEventListener('click',async()=>{
 const text=`NurseDoku ${gameKind==='daily'?dailyDate:gameKind==='journey'?'Shift '+(level+1):'Practice'}\nSolved in ${format(elapsed)} · ${size()}×${size()}\nhttps://siahverse.cc/nursedoku/`;
 try {await navigator.clipboard.writeText(text);$('shareStatus').textContent='Result copied. Paste it anywhere.';}
 catch {$('shareStatus').textContent=text;}
});
if('serviceWorker' in navigator && location.protocol==='https:')navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(()=>{});
