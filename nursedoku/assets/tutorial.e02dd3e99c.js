/* Independent lesson board: never changes the player's shift, saves, or strikes. */
(() => {
 const $=id=>document.getElementById(id), zones=[2,0,1,1,2,2,1,1,2,2,1,1,3,3,3,3], solution=[1,7,8,14];
 const lessons=[
  ['Meet the board','Your job is to place nurses, shown as RN. Put exactly one RN in each row (across), each column (up and down), and each colored care zone. There are no numbers to fill in.','This finished example has 4 RNs. Trace each row, column, and color: each has exactly one.'],
  ['Start with the smallest color','Every color needs one RN. The gold care zone has just one square, so its RN has to go there. Double-tap the gold square to place it.','Try it here. On a keyboard, focus the gold square and press R. Practice mistakes cost no strikes.'],
  ['An X means “no RN here”','Now the top row already has its RN. No other square in that row can hold an RN. Tap the outlined pink square once to mark it with an X.','An X is your note that a square is ruled out. It is not a nurse. Tap an X again to erase it. Keyboard: Enter or Space.'],
  ['RNs need space','An RN also rules out its whole column, the rest of its color, and every square touching it, including corners. Use Xs to keep track of those squares.','The Xs shown here cannot hold another RN. Look for a row, column, or color with only one possible square left. Place its RN, then repeat.'],
  ['You’re ready for a shift','Fill every row, column, and care zone with one RN, keeping RNs apart. You win as soon as all RNs are correct; you do not need to fill every empty square with Xs.','Double-tap to place or remove an RN. Swipe from a blank square to add Xs, or from an X to erase them. Undo reverses a move. Hint explains a next move or labels a solution reveal. Three wrong RN placements end a shift; Undo does not restore strikes. After solving, answer the NCLEX question, confirm your answer, and read the rationale.']
 ];
 let step=0,done=false,last=null;
 function render(focus=false){
  last=null; done=false;
  $('tutorialMeter').value=step+1;
  $('tutorialNext').disabled=step===1||step===2;
  $('tutorialProgress').textContent='Step '+(step+1)+' of 5';
  $('tutorialTitle').textContent=lessons[step][0];$('tutorialCopy').textContent=lessons[step][1];$('tutorialCaption').textContent=lessons[step][2];$('tutorialFeedback').textContent='';
  $('tutorialBack').hidden=step===0;$('tutorialNext').hidden=step===4;$('startBtn').hidden=step!==4;
  const board=$('tutorialBoard');board.hidden=step===4;board.replaceChildren();
  for(let i=0;i<16;i++){
   const button=document.createElement('button'),rn=step===0?solution.includes(i):step>=2&&i===1;
   const blocked=step===3&&!rn&&(Math.floor(i/4)===0||i%4===1||(Math.floor(i/4)<=1&&Math.abs(i%4-1)<=1));
   button.type='button';button.className='tutorial-cell tutorial-zone-'+zones[i];button.textContent=rn?'RN':blocked?'X':'';
   button.setAttribute('aria-label','Row '+(Math.floor(i/4)+1)+', column '+(i%4+1)+', '+['gold','pink','blue','green'][zones[i]]+' care zone'+(rn?', RN':blocked?', X':''));
   const target=(step===1&&i===1)||(step===2&&i===2);if(target){button.classList.add('tutorial-target');button.setAttribute('data-gesture',step===1?'rn':'x');}
   if(step===2&&rn)button.classList.add('tutorial-reason');
   if(step===3&&blocked)button.classList.add('tutorial-linked');
   button.disabled=step!==1&&step!==2;
   function act(kind){
    if(done)return;
    if(!target){$('tutorialFeedback').textContent=step===1?'Find the gold square. It is the only square of its color.':'Try the outlined pink square in the top row.';last=null;return;}
    if(step===1&&kind!=='rn'){button.textContent='X';$('tutorialFeedback').textContent='One tap makes an X. Tap twice quickly to place an RN.';return;}
    if(step===2&&kind!=='x'){button.textContent='';$('tutorialFeedback').textContent='This row already has its RN. Use one tap to mark an X.';return;}
    done=true;$('tutorialNext').disabled=false;button.className=button.className.replace('tutorial-target','tutorial-success');button.textContent=step===1?'RN':'X';button.setAttribute('aria-label',button.getAttribute('aria-label')+(step===1?', RN':', X'));
    $('tutorialFeedback').textContent=step===1?'Correct. The gold care zone now has its RN.':'Correct. That square is ruled out because its row already has an RN.';
   }
   button.addEventListener('click',()=>{const now=Date.now(),double=last&&last.i===i&&now-last.time<360;last=double?null:{i,time:now};act(double?'rn':'x');});
   button.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'){e.preventDefault();last=null;act('rn');}});
   board.append(button);
  }
  if(focus)$('tutorialTitle').focus();
 }
 $('howToBtn').addEventListener('click',()=>{step=0;render();});
 $('tutorialBack').addEventListener('click',()=>{step=Math.max(0,step-1);render(true);});
 $('tutorialNext').addEventListener('click',()=>{if((step===1||step===2)&&!done)return;step=Math.min(4,step+1);render(true);});
 render();
})();
