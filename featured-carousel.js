(() => {
  const root = document.querySelector('#featured-apps');
  if (!root) return;
  const apps = [
    {name:'NurseDoku', icon:'/nursedoku/icon.svg', category:'Nursing games', description:'Place RNs, solve the puzzle, then answer a nursing question.', action:'Play NurseDoku', href:'/nursedoku/'},
    {name:'ToDo', icon:'/icons/todo.svg', category:'Productivity', description:'Tasks, due dates, priorities, and repeating routines.', action:'Open ToDo', href:'https://todo.siahverse.cc'},
    {name:'NextSet', icon:'/icons/nextset.svg', category:'Workouts', description:'Follow PPL workouts, log your sets, and track your progress.', action:'Open NextSet', href:'https://nextset.siahverse.cc'},
    {name:'NimbusVault', icon:'/icons/vault.svg', category:'Cloud storage', description:'Personal cloud storage. This app is still planned.', href:null},
    {name:'NCLEXapro', icon:'/icons/nclexapro.svg', category:'Discord study bot', description:'Daily nursing practice for Discord study groups. Bot setup is in progress.', action:'About NCLEXapro', href:'/nclexapro/'},
    {name:'QBanco', icon:'/icons/qbanco.svg', category:'Question bank', description:'Practice original NCLEX-style questions, review mistakes, and save bookmarks.', action:'Open QBanco', href:'/qbanco/'},
    {name:'DeskHop', icon:'/deskhop/favicon.svg', category:'Remote desktop', description:'Open your personal desktop from a browser. Gateway setup is required.', action:'Open DeskHop', href:'/deskhop/'},
    {name:'Siahverse', icon:'/favicon.svg', category:'App hub', description:'Browse the apps and nursing resources in Siahverse.', action:'Explore apps', href:'#app-directory'}
  ];
  // A shared Monday-to-Monday UTC schedule: three apps, stable throughout the week.
  const week=Math.floor((Date.now()-Date.UTC(2026,9,5))/(7*24*60*60*1000));
  const start=((week*3)%apps.length+apps.length)%apps.length;
  const slides=Array.from({length:3},(_,i)=>apps[(start+i)%apps.length]);
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
    category.textContent=`This week · ${slide.category}`;
    description.textContent=slide.description;
    link.hidden=!slide.href; if(slide.href){link.textContent=slide.action; link.href=slide.href;} root.querySelector('.featured-unavailable').hidden=!!slide.href;
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
