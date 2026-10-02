(() => {
  const form=document.querySelector('#deskhop-login');
  if(!form)return;
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button'),status=document.querySelector('#login-status');
    button.disabled=true;status.textContent='Signing in…';
    try{
      const data=new FormData(form);
      const result=await window.SiahverseAccount.auth.signInWithPassword({email:data.get('email'),password:data.get('password')});
      form.elements.password.value='';
      if(result.error)throw result.error;
      location.replace('/deskhop/');
    }catch(error){status.textContent=error.message||'Sign-in failed. Try again.';button.disabled=false;}
  });
})();
