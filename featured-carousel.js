(() => {
  const root = document.querySelector('#featured-apps');
  if (!root) return;
  const slides = [
    {name:'NurseDoku', category:'Nursing games', description:'Place one RN in each row, column, and care zone. Finish the puzzle, then answer a nursing question.', action:'Play NurseDoku', href:'/nursedoku/', symbol:'RN', tiles:['×','RN','×','×','×','×','×','RN','RN','×','×','×','×','×','RN','×']},
    {name:'Tasks', category:'Productivity', description:'Make room for what matters. Organize your to-do list with due dates, priorities, and routines.', action:'Open Tasks', href:'https://todo.siahverse.cc', symbol:'✓', tiles:['✓','○','✓','○','○','✓','○','✓','✓','○','✓','○','○','✓','○','✓']},
    {name:'NextSet', category:'Workouts', description:'Your next workout starts here. Follow PPL workouts, log your sets, and track your progress.', action:'Open NextSet', href:'https://nextset.siahverse.cc', symbol:'↗', tiles:['P','P','L','↗','3','×','10','✓','P','P','L','↗','5','×','5','✓']},
    {name:'Nursing', category:'Study', description:'Find your nursing practice exams, study tools, and games together in one place.', action:'Open Nursing', href:'/nursing/', symbol:'+', tiles:['RN','+','RN','+','+','RN','+','RN','RN','+','RN','+','+','RN','+','RN']},
    {name:'DeskHop', category:'Remote desktop', description:'Your desktop, one hop away. Start setting up browser access to your personal Windows computer.', action:'Open DeskHop', href:'/deskhop/', symbol:'↗', tiles:['▣','↗','▣','↗','↗','▣','↗','▣','▣','↗','▣','↗','↗','▣','↗','▣']}
  ];
  const title=root.querySelector('h2'), category=root.querySelector('.eyebrow'), description=root.querySelector('.featured-description'), link=root.querySelector('.game-play'), art=root.querySelector('.game-art'), dots=root.querySelector('.featured-dots'), status=root.querySelector('.featured-status');
  let current=0;
  const controls=slides.map((slide,index)=>{
    const button=document.createElement('button');
    button.type='button'; button.className='featured-dot';
    button.setAttribute('aria-label',`Show ${slide.name}, ${index+1} of ${slides.length}`);
    button.addEventListener('click',()=>show(index));
    dots.append(button); return button;
  });
  function show(index){
    current=(index+slides.length)%slides.length;
    const slide=slides[current];
    title.textContent=slide.name;
    category.textContent=`Featured · ${slide.category}`;
    description.textContent=slide.description;
    link.textContent=`${slide.action} →`; link.href=slide.href;
    art.replaceChildren(...slide.tiles.map(text=>{const tile=document.createElement('span');tile.textContent=text;return tile;}));
    controls.forEach((button,i)=>button.setAttribute('aria-current',i===current?'true':'false'));
    status.textContent=`Featured app ${current+1} of ${slides.length}: ${slide.name}`;
  }
  root.querySelector('[data-featured="previous"]').addEventListener('click',()=>show(current-1));
  root.querySelector('[data-featured="next"]').addEventListener('click',()=>show(current+1));
  root.querySelector('.featured-controls').addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();show(current+(event.key==='ArrowRight'?1:-1));
    }
  });
  show(0);
})();
