(() => {
  const $ = id => document.getElementById(id);
  const auth = window.SiahverseAccount.auth;
  let session = null;
  let mode = new URLSearchParams(location.search).get('mode') === 'update' ? 'update' : 'signin';
  const status = message => { $('status').textContent = message; $('status').hidden = !message; };
  function draw(nextSession = session) {
    session = nextSession;
    const account = !!session && mode !== 'update';
    $('signedIn').hidden = !account;
    $('form').hidden = account;
    $('modes').hidden = !!session || mode === 'update';
    $('back').hidden = !session || mode !== 'update';
    $('email').textContent = session?.user.email || '';
    $('heading').textContent = account ? 'Your account' : { signin: 'Sign in', signup: 'Create account', recover: 'Reset password', update: 'New password' }[mode];
    $('description').textContent = account ? 'Your apps and account settings.' : mode === 'recover' ? 'We’ll email you a link to reset your password.' : mode === 'update' ? 'Choose a new password for your Siahverse account.' : 'Use your account for NurseDoku, Tasks, and NextSet.';
    $('emailRow').hidden = mode === 'update';
    $('emailInput').required = mode !== 'update';
    $('passwordRow').hidden = mode === 'recover';
    $('password').required = mode !== 'recover';
    $('password').minLength = mode === 'signup' || mode === 'update' ? 10 : 1;
    $('password').autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
    $('passwordHint').hidden = mode !== 'signup' && mode !== 'update';
    $('submit').textContent = { signin: 'Sign in', signup: 'Create account', recover: 'Send reset link', update: 'Save password' }[mode];
    document.querySelectorAll('#modes [data-mode]').forEach(button => { button.hidden = button.dataset.mode === mode; });
  }
  function setMode(nextMode) { mode = nextMode; status(''); $('password').value = ''; draw(); }
  auth.onAuthStateChange((event, nextSession) => {
    if (event === 'PASSWORD_RECOVERY') mode = 'update';
    if (event === 'SIGNED_OUT') mode = 'signin';
    draw(nextSession);
  });
  document.querySelectorAll('[data-mode]').forEach(button => { button.onclick = () => setMode(button.dataset.mode); });
  $('back').onclick = () => setMode('signin');
  $('form').onsubmit = async event => {
    event.preventDefault();
    const actionMode = mode;
    $('submit').disabled = true;
    status('');
    try {
      const email = $('emailInput').value.trim(), password = $('password').value;
      const result = actionMode === 'signin' ? await auth.signInWithPassword({ email, password }) : actionMode === 'signup' ? await auth.signUp({ email, password }) : actionMode === 'recover' ? await auth.resetPasswordForEmail(email) : await auth.updateUser({ password });
      if (result.error) { status(result.error.message); return; }
      if (actionMode === 'signin') { mode = 'signin'; draw(result.data.session || session); }
      else if (actionMode === 'update') { mode = 'signin'; draw(); status('Password updated.'); }
      else status(actionMode === 'signup' ? 'Check your email to confirm your account.' : 'If the address has an account, a reset link will arrive shortly.');
    } catch (error) { status(error.message || 'Please try again.'); }
    finally { $('password').value = ''; $('submit').disabled = false; }
  };
  $('signout').onclick = async () => {
    $('signout').disabled = true;
    try {
      const result = await auth.signOut();
      if (result.error) status(result.error.message);
      else { mode = 'signin'; status(''); draw(null); }
    } catch (error) { status(error.message || 'Please try again.'); }
    finally { $('signout').disabled = false; }
  };
  draw();
  window.SiahverseAccount.ready.catch(error => status(error.message));
})();
