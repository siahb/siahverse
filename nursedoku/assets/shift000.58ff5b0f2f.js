/* Shift 000 is a coached board; ordinary puzzle IDs and completion records stay stable. */
(() => {
 const $=id=>document.getElementById(id),zones=[2,0,1,1,2,2,1,1,2,2,1,1,3,3,3,3];
 const moves=[
  [1,'rn','Place your first RN','Each color needs exactly one RN. Gold has just one square, so its RN must go in the outlined square.'],
  [0,'x','Clear the RN’s row','A row runs across. The top row already has its RN, so this blue square cannot have another. Mark it X.'],
  [2,'x','One RN per row','This pink square is in the same row as the RN. Mark it X too.'],
  [3,'x','Finish clearing the row','The last square in that row is also ruled out. Mark it X.'],
  [5,'x','Clear the RN’s column','A column runs up and down. This square is directly below the RN, in its column. Mark it X.'],
  [9,'x','One RN per column','This square is farther down the same column. It cannot hold another RN. Mark it X.'],
  [13,'x','Finish clearing the column','The bottom square of that column is ruled out too. Mark it X.'],
  [4,'x','RNs cannot touch corners','This square touches the RN diagonally. Even though it is a different row and column, another RN cannot go here. Mark it X.'],
  [6,'x','Leave space on both sides','This square also touches the RN diagonally. Mark it X. All squares touching an RN are ruled out.'],
  [8,'rn','Find the last square of a color','Look at blue: every other blue square is X. A color needs one RN, so the only remaining blue square must hold it.'],
  [10,'x','Use your new RN','The blue RN is in the third row. This pink square shares its row, so mark it X.'],
  [11,'x','Clear that row','This pink square is in the blue RN’s row too. Mark it X.'],
  [12,'x','Clear that column','This green square is below the blue RN in the same column. Mark it X.'],
  [7,'rn','Solve the pink care zone','Every other pink square is X. The remaining pink square must hold its RN.'],
  [15,'x','Follow the pink RN’s column','This green square is in the pink RN’s column. Mark it X.'],
  [14,'rn','Place the last RN','Only one green square is still empty. Place its RN. Each row, column, and color will then have exactly one RN.']
 ];
 let step=0,marks=Array(16).fill(''),last=null,continuation=null;
 function render(focus=false){
  const renderedStep=step,complete=step===moves.length,m=moves[step];last=null;
  $('shift000Progress').textContent=complete?'Tutorial complete':'Move '+(step+1)+' of '+moves.length;
  $('shift000Title').textContent=complete?'You solved Shift 000':m[2];
  $('shift000Copy').textContent=complete?'Every row, column, and care zone has one RN, and no RNs touch. In normal shifts, Xs are optional notes; the RNs solve the board. After solving a normal shift, answer the NCLEX question and confirm your answer to read the rationale.':m[3];
  $('shift000Control').textContent=complete?'Next: try a shift with the same rules.':m[1]==='rn'?'Double-tap the outlined square to place RN. Keyboard: R.':'Tap the outlined square once to mark X. Keyboard: Enter or Space.';
  $('shift000Finish').hidden=!complete;
  const board=$('shift000Board');board.replaceChildren();
  for(let i=0;i<16;i++){
   const cell=document.createElement('button');cell.type='button';cell.className='tutorial-cell tutorial-zone-'+zones[i];cell.textContent=marks[i]==='rn'?'RN':marks[i]==='x'?'X':'';
   const target=!complete&&i===m[0];if(target)cell.classList.add('tutorial-target');
   cell.setAttribute('aria-label','Row '+(Math.floor(i/4)+1)+', column '+(i%4+1)+', '+['gold','pink','blue','green'][zones[i]]+' care zone'+(marks[i]?', '+marks[i].toUpperCase():'')+(target?', next move':''));
   cell.disabled=complete;
   function act(kind){
    if(complete||step!==renderedStep)return;
    if(!target){last=null;$('shift000Feedback').textContent='Follow the outlined square for this move. '+m[3];return;}
    if(kind!==m[1]){if(m[1]==='rn'){cell.textContent='X';$('shift000Feedback').textContent='One tap makes X. Tap twice quickly to place RN, or press R.';}else{$('shift000Feedback').textContent='This square is ruled out. Tap once to mark X.';}return;}
    marks[i]=kind;step++;$('shift000Feedback').textContent=kind==='rn'?'Correct RN placement.':'Correct. That square is ruled out.';render(true);
    if(step===moves.length)window.NurseDokuShiftGuide.complete();
   }
   cell.addEventListener('click',()=>{const now=Date.now(),double=last&&last.i===i&&now-last.time<360;last=double?null:{i,time:now};act(double?'rn':'x');});
   cell.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'){e.preventDefault();last=null;act('rn');}});
   board.append(cell);
  }
  if(focus)$('shift000Title').focus();
 }
 window.NurseDokuShift000={open(next){window.NurseDokuShiftGuide.pause();step=0;marks=Array(16).fill('');continuation=next; $('shift000Feedback').textContent='Practice has no timer or strikes.';render();$('shift000Dialog').showModal();}};
 $('shift000Btn').addEventListener('click',()=>window.NurseDokuShift000.open(()=>window.NurseDokuShiftGuide.startTraining()));
 $('closeShift000').addEventListener('click',()=>$('shift000Dialog').close());
 $('shift000Dialog').addEventListener('close',()=>{continuation=null;window.NurseDokuShiftGuide.resume();});
 $('shift000Finish').addEventListener('click',()=>{if(step!==moves.length)return;const next=continuation;continuation=null;$('shift000Dialog').close();next?.();});
 window.NurseDokuShiftGuide.refreshMenu();
})();
