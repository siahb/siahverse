(() => {
  'use strict';
  const root = document.documentElement;
  const key = 'sv_theme';
  const shared = location.hostname === 'siahverse.cc' || location.hostname.endsWith('.siahverse.cc');
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let current;
  const valid = value => value === 'dark' || value === 'light';
  function read() {
    if (shared) {
      const match = document.cookie.split(';').map(x => x.trim()).find(x => x.startsWith(key + '='));
      const value = match && match.slice(key.length + 1);
      return valid(value) ? value : null;
    }
    try { const value = localStorage.getItem(key); return valid(value) ? value : null; } catch { return null; }
  }
  function apply(value) {
    current = value;
    root.dataset.theme = value;
    root.dataset.appearance = value;
    root.style.colorScheme = value;
    if (document.body) document.body.classList.toggle('light-mode', value === 'light');
    const dark = value === 'dark';
    for (const id of ['toggle-theme', 'toggle-theme-checkbox', 'themeToggle', 'appearanceBtn', 'sharedThemeToggle']) {
      const control = document.getElementById(id);
      if (!control) continue;
      control.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      if (control.type === 'checkbox') control.checked = dark;
      else { control.setAttribute('aria-pressed', String(dark)); if (id !== 'appearanceBtn') control.textContent = dark ? '☀️ Light' : '🌙 Dark'; }
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#090d17' : '#f4f7fb';
  }
  function refresh() { const value = read() || (system.matches ? 'dark' : 'light'); if (value !== current) apply(value); }
  function set(value) {
    if (!valid(value)) return;
    if (shared) document.cookie = key + '=' + value + '; Path=/; Domain=siahverse.cc; Max-Age=31536000; SameSite=Lax; Secure';
    else { try { localStorage.setItem(key, value); } catch {} }
    apply(value);
  }
  window.SiahverseTheme = {set, refresh, get: () => current};
  refresh();
  function bind() {
    apply(read() || current);
    for (const id of ['toggle-theme', 'toggle-theme-checkbox', 'themeToggle', 'appearanceBtn', 'sharedThemeToggle']) {
      const control = document.getElementById(id);
      if (control) control.addEventListener(control.type === 'checkbox' ? 'change' : 'click', () => {
        const checkboxChoice = control.checked ? 'dark' : 'light';
        refresh();
        set(control.type === 'checkbox' ? checkboxChoice : (current === 'dark' ? 'light' : 'dark'));
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('storage', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  system.addEventListener('change', refresh);
  // Cookies have no cross-origin change event. Visible tabs check for updates.
  window.setInterval(() => { if (!document.hidden) refresh(); }, 1000);
})();
