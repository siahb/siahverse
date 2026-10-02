(() => {
  const root = document.querySelector('#featured-apps');
  if (!root) return;
  const slides = [
    {name:'NurseDoku', icon:'/nursedoku/icon.svg', category:'Nursing games', description:'Place one RN in each row, column, and care zone. Finish the puzzle, then answer a nursing question.', action:'Play NurseDoku', href:'/nursedoku/'},
    {name:'ToDo', icon:'/icons/todo.svg', category:'Productivity', description:'Tasks, due dates, priorities, and repeating routines.', action:'Open ToDo', href:'https://todo.siahverse.cc'},
    {name:'NextSet', icon:'/icons/nextset.svg', category:'Workouts', description:'Follow PPL workouts, log your sets, and track your progress.', action:'Open NextSet', href:'https://nextset.siahverse.cc'},
    {name:'Nursing', icon:'/icons/nursing.svg', category:'Study', description:'Find your nursing practice exams, study tools, and games together in one place.', action:'Open Nursing', href:'/nursing/'},
    {name:'DeskHop', icon:'/deskhop/favicon.svg', category:'Remote desktop', description:'Your desktop, one hop away. Start setting up browser access to your personal Windows computer.', action:'Open DeskHop', href:'/deskhop/'}
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
    const image=document.createElement('img'); image.src=slide.icon; image.alt=''; image.width=170; image.height=170; art.replaceChildren(image); art.dataset.app=slide.name;
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
