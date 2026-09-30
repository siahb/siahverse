(() => {
  'use strict';
  const root=document.documentElement, key='nursedoku-appearance';
  const system=window.matchMedia('(prefers-color-scheme: dark)');
  let choice;
  try {choice=localStorage.getItem(key);} catch {}
  if(!['light','dark'].includes(choice))choice=null;
  function apply(){
    const dark=(choice|| (system.matches?'dark':'light'))==='dark';
    root.dataset.appearance=dark?'dark':'light';
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=dark?'#101e24':'#eef6f5';
    const button=document.getElementById('appearanceBtn');
    if(button){
      button.setAttribute('aria-pressed',String(dark));
      button.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');
      button.title=dark?'Switch to light mode':'Switch to dark mode';
    }
  }
  apply();
  system.addEventListener('change',()=>{if(!choice)apply();});
  document.addEventListener('DOMContentLoaded',()=>{
    apply();
    document.getElementById('appearanceBtn').addEventListener('click',()=>{
      choice=root.dataset.appearance==='dark'?'light':'dark';
      try {localStorage.setItem(key,choice);} catch {}
      apply();
    });
  });
})();
