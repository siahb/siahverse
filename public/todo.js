  // Global variable to track what we're about to delete
  let pendingDeletion = null;
  let repeatUndos = [];
  const todoInput = document.getElementById('todo-input');
  const todoList = document.getElementById('todo-list');
  const doneList = document.getElementById('done-list');
  const undoBtn = document.getElementById('undo-btn');
  const selectAll = document.getElementById('select-all');
  const themeCheckbox = document.getElementById('toggle-theme-checkbox');
  const selectModeBtn = document.getElementById('select-mode-btn');
  const deleteSelectedBtn = document.getElementById('delete-btn'); // Your existing delete button
  selectModeBtn?.addEventListener('click', toggleSelectMode);
let selectMode = false;
  const dueInput = document.getElementById('due-input');
  const dueTodayBtn = document.getElementById('due-today');
  if (dueTodayBtn) {
  dueTodayBtn.addEventListener('click', () => {
    const today = localISODate();
    dueInput.value = today;
    dueInput.dispatchEvent(new Event('change')); // if you react to changes elsewhere
  });
}
  const repeatSelect = document.getElementById('repeat-select');
  const intervalWrap = document.getElementById('interval-wrap');
  const intervalInput = document.getElementById('interval-input');
  const intervalUnit = document.querySelector('.interval-unit');
  const weeklyWrap = document.getElementById('weekly-wrap');
  const saveOrderBtn = document.getElementById('save-order');
  // Get modal elements
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const closeHelp = document.querySelector('.close-help');
  // toolbar controls
  const searchToggle = document.getElementById('search-toggle');
  const searchInput = document.getElementById('search-input');   // Search…
  const sortSelect  = document.getElementById('sort-select');    // Sort: …
  // Force default sort on startup
  if (sortSelect) {
  sortSelect.value = 'dueAsc';
  sortSelect.dispatchEvent(new Event('change'));
  }
  const tagInput    = document.getElementById('tag-input');      // Tags
  const prioSelect  = document.getElementById('priority-select');// Priority: …
  const exportBtn   = document.getElementById('export-btn');     // Export
  const importFile  = document.getElementById('import-file');    // Import (file input)
  searchInput?.addEventListener('input', () => { 
  renderTodos(); 
  renderDone(); 
  updateButtonVisibility();
});

// Admin check helper
function requireAdmin(operation = "perform this action") {
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
    alert(`❌ Admin login required to ${operation}`);
    return false;
  }
  return true;
}

function updateInputStates() {
  const isLoggedIn = !!localStorage.getItem(ADMIN_PASSWORD_KEY);

  // Disable/enable related input fields
const relatedInputs = [tagInput, dueInput, prioSelect, repeatSelect, intervalInput];
relatedInputs.forEach(input => {
  if (input) {
    input.disabled = !isLoggedIn;
    input.style.opacity = isLoggedIn ? '1' : '0.5';
  }
});

// Disable/enable checkboxes
const weekdayCheckboxes = document.querySelectorAll('.byweekday');
weekdayCheckboxes.forEach(cb => {
  cb.disabled = !isLoggedIn;
  cb.style.opacity = isLoggedIn ? '1' : '0.5';
});

// Disable/enable buttons
const relatedButtons = [dueTodayBtn];
relatedButtons.forEach(btn => {
  if (btn) {
    btn.disabled = !isLoggedIn;
    btn.style.opacity = isLoggedIn ? '1' : '0.5';
    btn.style.cursor = isLoggedIn ? 'pointer' : 'not-allowed';
  }
});
  // Disable/enable Select Mode button
  if (selectModeBtn) {
  selectModeBtn.disabled = !isLoggedIn;
  selectModeBtn.style.opacity = isLoggedIn ? '1' : '0.5';
  selectModeBtn.style.cursor = isLoggedIn ? 'pointer' : 'not-allowed';
}
  // Disable/enable search input
  if (searchInput) {
    searchInput.disabled = !isLoggedIn;
    searchInput.placeholder = isLoggedIn ? "Search…" : "Login required to search";
  }
  
  // Disable/enable search toggle button
  if (searchToggle) {
    searchToggle.disabled = !isLoggedIn;
    searchToggle.style.opacity = isLoggedIn ? '1' : '0.5';
    searchToggle.style.cursor = isLoggedIn ? 'pointer' : 'not-allowed';
  }
  
  // Disable/enable task input
  if (todoInput) {
    todoInput.disabled = !isLoggedIn;
    todoInput.placeholder = isLoggedIn ? "Type a task and hit Enter..." : "Login required to add tasks";
    todoInput.style.opacity = isLoggedIn ? '1' : '0.5';
    todoInput.style.cursor = isLoggedIn ? 'text' : 'not-allowed';
  }
  
  // If logged out and search is open, close it
  if (!isLoggedIn && searchInput && searchInput.classList.contains('active')) {
    hideSearch();
  }
}

//Emoji helper
function getTagEmoji(tagName) {
  if (!tagName) return '';
  
  const tag = tagName.toLowerCase().trim();
  
  const tagEmojis = {
    'projects': '📋',
    'errands': '🏃',
    'health': '⚕️',
    'chores': '🧹',
    'school': '🎓',
    'work': '💼',
    'car': '🚗',
    'website': '🌐'
  };
  
  return tagEmojis[tag] || '';
}
// Time Helper
function localISODate() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

// Return the primary tag key for sorting
function tagKey(t) {
  const tags = (t.tags || [])
    .map(s => (s || '').toLowerCase().trim())
    .filter(Boolean)
    .sort();            // alphabetical
  // Put no-tag items at the end by returning a high sentinel
  return tags[0] || '\uffff';
}

// Due Today Helper
function isDueToday(todo) {
  if (!todo.due) return false;
  return toISO(todo.due) === todayISO();
}

  sortSelect?.addEventListener('change', () => { renderTodos(); });
  repeatSelect.addEventListener('change', () => {
  const v = repeatSelect.value;
  intervalWrap.style.display = v ? '' : 'none';
  intervalUnit.textContent = v === 'weekly' ? 'week(s)' : 'day(s)';
  weeklyWrap.style.display = v === 'weekly' ? 'flex' : 'none';
});

function isDueTomorrow(todo) {
  if (!todo.due) return false;
  const tomorrow = addDays(todayISO(), 1);
  return toISO(todo.due) === tomorrow;
}

  function updateSelectAllState() {
    const all = document.querySelectorAll('.select-todo');
    const checked = document.querySelectorAll('.select-todo:checked');
    if (selectAll) {
      selectAll.checked = all.length > 0 && checked.length === all.length;
    }
  }

  const enterPwBtn = document.getElementById('enter-password');
  const logoutBtn = document.getElementById('logout');
  const adminModal = document.getElementById('admin-modal');
  const loginBtn = document.getElementById('login-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const passwordInput = document.getElementById('password-input');
// DOMContentloaded listener
document.addEventListener("DOMContentLoaded", () => {
  const doneHeader = document.querySelector(".card-container h2");
  const doneList = document.getElementById("done-list");

  if (doneHeader && doneList) {
    // Start collapsed
    doneHeader.classList.add("collapsed");
    doneList.classList.add("collapsed");

    doneHeader.addEventListener("click", () => {
      doneHeader.classList.toggle("collapsed");
      doneList.classList.toggle("collapsed");
    });
  }
});

  let todosData = [];
  let deletedTodos = [];
  const ADMIN_PASSWORD_KEY = 'adminPassword';

// Clean search functions - no searchWrap dependency
function showSearch() {
  // Check if user is logged in before allowing search
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
    alert("❌ Admin login required to search tasks");
    return;
  }
  
  searchInput.classList.add('active');
  document.body.classList.add('search-open');
  searchInput.focus();
  searchInput.select();
  updateButtonVisibility();
}

function hideSearch() {
  searchInput.value = ''; // Clear the input
  searchInput.classList.remove('active');
  document.body.classList.remove('search-open');
  searchInput.blur();
  updateButtonVisibility();
  // Re-run filters to show all todos again
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
}

// Open help modal
helpBtn?.addEventListener('click', () => {
  helpModal.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
});

// Close help modal
closeHelp?.addEventListener('click', () => {
  helpModal.style.display = 'none';
  document.body.style.overflow = 'auto'; // Restore scrolling
});

// Close modal when clicking outside of it
helpModal?.addEventListener('click', (e) => {
  if (e.target === helpModal) {
    helpModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
});

// Close modal with Escape key (but only if search isn't open)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && helpModal.style.display === 'flex' && !searchInput.classList.contains('active')) {
    helpModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
});

// Add the Select Mode toggle function
function toggleSelectMode() {
   if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
    alert("❌ Admin login required to select tasks");
    return;
  }
  
  selectMode = !selectMode;
  
  if (selectMode) {
    selectModeBtn.textContent = '☑️ Exit Select';
    document.body.classList.add('select-mode-active');
  } else {
    selectModeBtn.textContent = '☐ Select';
    document.body.classList.remove('select-mode-active');
    
    // Clear all selections when exiting select mode
    const allCheckboxes = document.querySelectorAll('.select-todo');
    allCheckboxes.forEach(cb => cb.checked = false);
    if (selectAll) selectAll.checked = false;
  }
  
  updateSelectModeVisibility();
}

// Function to show/hide select-related elements
function updateSelectModeVisibility() {
  // Show/hide individual task checkboxes
  const allCheckboxes = document.querySelectorAll('.select-todo');
  allCheckboxes.forEach(cb => {
    cb.style.display = selectMode ? 'inline-block' : 'none';
  });
  
  // Show/hide select all checkbox
  if (selectAll) {
    selectAll.style.display = selectMode ? 'inline-block' : 'none';
  }
  
  // Show/hide select all label
  const selectAllLabel = document.querySelector('label[for="select-all"]');
  if (selectAllLabel) {
    selectAllLabel.style.display = selectMode ? 'inline-block' : 'none';
  }
  
  // Show/hide delete selected button
  if (deleteSelectedBtn) {
    deleteSelectedBtn.style.display = selectMode ? 'inline-block' : 'none';
  }
  
  // Update cursor style for task items
  const allTaskItems = document.querySelectorAll('li[data-trueindex]');
  allTaskItems.forEach(item => {
    if (selectMode) {
      item.style.cursor = 'pointer';
      item.style.userSelect = 'none'; // Prevent text selection
    } else {
      item.style.cursor = '';
      item.style.userSelect = '';
    }
  });

   // Hide/show ALL action buttons (✅, ✏️, ❌) on individual tasks
  const allActionButtons = document.querySelectorAll('li[data-trueindex] > div:last-child button');
  allActionButtons.forEach(btn => {
    btn.style.display = selectMode ? 'none' : 'inline-block';
  });
}

// Also update your updateButtonVisibility function to include select mode elements:
function updateButtonVisibility() {
  const q = (searchInput?.value || '').trim();
  
  // Hide Save Order button when searching
  if (saveOrderBtn) {
    saveOrderBtn.style.display = q ? 'none' : 'inline-block';
  }
  
  // Hide Reorder button when searching
  const toggleDragBtn = document.getElementById('toggle-drag');
  if (toggleDragBtn) {
    toggleDragBtn.style.display = q ? 'none' : 'inline-block';
  }

  // Hide Select Mode button when searching
  if (selectModeBtn) {
    selectModeBtn.style.display = q ? 'none' : 'inline-block';
  }
  
  // Update select mode visibility (this ensures proper state)
  updateSelectModeVisibility();
}

// Search toggle button - shows/hides and clears input
searchToggle?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // Check if user is logged in
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
    alert("❌ Admin login required to search tasks");
    return;
  }
  
  const open = searchInput.classList.contains('active');
  open ? hideSearch() : showSearch();
});

// Ctrl/Cmd + F opens search
document.addEventListener('keydown', (e) => {
  const isFind = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f';
  if (!isFind) return;
  e.preventDefault();
  
  // Check if user is logged in
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
    alert("❌ Admin login required to search tasks");
    return;
  }
  
  showSearch();
});

// Add this event listener to handle clicks on task items
document.addEventListener('click', (e) => {
  // Only handle clicks when in select mode
  if (!selectMode) return;
  
  // Find the closest li element (task item)
  const taskItem = e.target.closest('li[data-trueindex]');
  if (!taskItem) return;
  
  // Don't interfere with button clicks or checkbox clicks
  if (e.target.matches('button, input[type="checkbox"], .btn-save, .btn-cancel, .edit-text, .edit-due, .edit-tags, .edit-priority, .edit-repeat, .edit-interval, select, input')) {
    return;
  }
  
  // Don't interfere with editing mode
  if (taskItem.querySelector('.edit-container')) {
    return;
  }
  
  // Find the checkbox for this task
  const checkbox = taskItem.querySelector('.select-todo');
  if (checkbox) {
    // Toggle the checkbox
    checkbox.checked = !checkbox.checked;
    
    // Trigger the change event to update select all state
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Add visual feedback
    taskItem.style.transform = 'scale(0.98)';
    setTimeout(() => {
      taskItem.style.transform = '';
    }, 150);
  }
});

// Escape hides search and clears input
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchInput.classList.contains('active')) {
    hideSearch();
  }
});

// "/" opens search (unless typing in an input)
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.closest('input, textarea, [contenteditable]')) {
    e.preventDefault();
    
    // Check if user is logged in
    if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
      alert("❌ Admin login required to search tasks");
      return;
    }
    
    showSearch();
  }
});

  // Hide action buttons for non-admin users in the UI
function updateAdminUI() {
  const pw = localStorage.getItem(ADMIN_PASSWORD_KEY);
  const isLoggedIn = !!pw;

  // Existing code
  document.getElementById('enter-password').style.display = isLoggedIn ? 'none' : 'inline-block';
  document.getElementById('logout').style.display = isLoggedIn ? 'inline-block' : 'none';
  
  // New: Hide action buttons from non-admin users
  const actionButtons = document.querySelectorAll('.controls button:not(#help-btn)');
  actionButtons.forEach(btn => {
    btn.style.display = isLoggedIn ? 'inline-block' : 'none';
  });
  
  // Hide the task action buttons (✅, ✏️, ❌) by adding CSS class
  document.body.classList.toggle('admin-logged-in', isLoggedIn);
  
  // NEW: Update search state
  updateInputStates();
}

  // Theme
  const savedTheme = localStorage.getItem('theme') || 'dark';

  if (savedTheme === 'light') {
    document.body.classList.add('light-mode'); // light variables
    themeCheckbox.checked = false;             // unchecked = light
  } else {
    themeCheckbox.checked = true;              // checked = dark
  }

  themeCheckbox.addEventListener('change', () => {
    const darkOn = themeCheckbox.checked;      // checked means dark
    document.body.classList.toggle('light-mode', !darkOn);
    localStorage.setItem('theme', darkOn ? 'dark' : 'light');
  });

  // Admin
  enterPwBtn.addEventListener('click', () => adminModal.style.display = 'block');
  cancelBtn.addEventListener('click', () => adminModal.style.display = 'none');
  loginBtn.addEventListener('click', async () => {
  const pw = passwordInput.value.trim();
  if (!pw) return alert("Password cannot be empty.");

  // Send a harmless request to test the password
  const res = await fetch('/todos/0', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${pw}`
    }
  });

  if (res.status === 401) {
    alert("❌ Incorrect password.");
  } else {
    localStorage.setItem(ADMIN_PASSWORD_KEY, pw);
    alert("✅ Admin logged in!");
    adminModal.style.display = 'none';
    updateAdminUI();
  }
});

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
    alert("Logged out.");
    updateAdminUI();
  });
 if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
  updateInputStates(); // This now handles both task input and search
}

  // Load Todos from server
async function loadTodosFromServer() {
  try {
    const res = await fetch('/todos');
    todosData = await res.json();

    // Normalize any overdue repeating tasks client-side
    let changed = false;
    for (let i = 0; i < todosData.length; i++) {
      const t = todosData[i];
      if (t && t.repeat) {
        if (rollForwardIfMissed(t)) {
          // persist normalization
          changed = true;
          await fetch(`/todos/${i}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ due: t.due, nextDue: t.nextDue })
          });
        }
      }
    }

    renderTodos();
    renderDone();
    updateButtonVisibility();
  } catch {
    alert("Failed to load todos.");
  }
}

  // ==== Repeats Helpers ====
function todayISO() { return localISODate(); }

function forceCustomSort() {
  if (sortSelect && sortSelect.value !== 'default') {
    sortSelect.value = 'default';
  }
}
function toISO(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0,10);
  return new Date(d).toISOString().slice(0,10);
}
function addDays(iso, n){
  const d = new Date(iso || todayISO());
  d.setDate(d.getDate()+n);
  return toISO(d);
}
function isOverdue(todo){
  if (!todo.due) return false;
  return toISO(todo.due) < todayISO() && !todo.done;
}

function filteredTodos(list){
  const q = (searchInput?.value || '').toLowerCase().trim();
  if (!q) return list;
  
  // Special search terms
  if (q === 'untagged' || q === 'no-tags' || q === 'notags') {
    return list.filter(t => !t.tags || t.tags.length === 0);
  }
  
  if (q === 'high' || q === 'priority-high' || q === 'p:high') {
    return list.filter(t => t.priority === 'H');
  }
  
  if (q === 'medium' || q === 'priority-medium' || q === 'p:medium') {
    return list.filter(t => t.priority === 'M');
  }
  
  if (q === 'low' || q === 'priority-low' || q === 'p:low') {
    return list.filter(t => t.priority === 'L');
  }
  
  if (q === 'no-priority' || q === 'p:none') {
    return list.filter(t => !t.priority);
  }
  
  // Regular text/tag search
  return list.filter(t =>
    (t.text || '').toLowerCase().includes(q) ||
    (t.tags || []).some(tag => (tag || '').toLowerCase().includes(q))
  );
}

function priRank(p) {
  return p === 'H' ? 3 : p === 'M' ? 2 : p === 'L' ? 1 : 0; // None = 0
}

function sortTodos(list){
  const mode = sortSelect?.value || 'default';
  const copy = [...list];

  if (mode === 'dueAsc') {
    copy.sort((a,b)=> (a.due||'9999').localeCompare(b.due||'9999'));
  } else if (mode === 'dueDesc') {
    copy.sort((a,b)=> (b.due||'0000').localeCompare(a.due||'0000'));
  } else if (mode === 'alpha') {
    copy.sort((a,b)=> (a.text||'').localeCompare(b.text||''));
  } else if (mode === 'created') {
    copy.sort((a,b)=> (b.createdAt||0) - (a.createdAt||0));
  } else if (mode === 'priority') {
    copy.sort((a,b)=>{
      const r = priRank(b.priority) - priRank(a.priority);
      if (r !== 0) return r;
      const d = (a.due||'').localeCompare(b.due||'');
      if (d !== 0) return d;
      return (a.text||'').localeCompare(b.text||'');
    });
  } else if (mode === 'tagsAZ') {
    // First tag A→Z; items without tags last
    copy.sort((a,b)=>{
      const ka = tagKey(a), kb = tagKey(b);
      const t = ka.localeCompare(kb);
      if (t !== 0) return t;
      return (a.text||'').localeCompare(b.text||''); // tie-breaker
    });
  } else if (mode === 'tagsZA') {
    // First tag Z→A; items without tags last
    copy.sort((a,b)=>{
      const ka = tagKey(a), kb = tagKey(b);
      const t = kb.localeCompare(ka);
      if (t !== 0) return t;
      return (a.text||'').localeCompare(b.text||'');
    });
  }

  return copy;
}

function updateProgress(){
  const total = todosData.length;
  const done  = todosData.filter(t=>t.done).length;
  const overdue = todosData.filter(t=>!t.done && t.due && toISO(t.due) < todayISO()).length;
  const pct = total ? Math.round((done/total)*100) : 0;

  const bar = document.getElementById('progress-bar');
  const label = document.getElementById('progress-label');
  if (!bar || !label) return;

  bar.style.width = `${pct}%`;
  label.textContent = total
    ? `${done}/${total} tasks • ${pct}% complete${overdue ? ` • ${overdue} overdue` : ''}`
    : 'No tasks yet';
}

// Compute the next scheduled date from a given 'from' date
function computeNextDue(task, fromISO) {
  const rep = task.repeat;
  if (!rep) return task.due || null;

  const base = new Date(fromISO || (task.nextDue || task.due || todayISO()));
  if (rep.freq === 'daily') {
    const interval = Math.max(1, rep.interval || 1);
    base.setDate(base.getDate() + interval);
    return toISO(base);
  }
  if (rep.freq === 'weekly') {
    const interval = Math.max(1, rep.interval || 1);
    const days = Array.isArray(rep.byWeekday) && rep.byWeekday.length ? [...rep.byWeekday].sort() : [base.getDay()];
    const todayIdx = base.getDay();

    // find next listed weekday strictly after 'base'
    for (const wd of days) {
      const diff = (wd - todayIdx + 7) % 7;
      if (diff > 0) { base.setDate(base.getDate() + diff); return toISO(base); }
    }
    // none left this week → jump to first day in the next interval block
    const first = days[0];
    const toNextBlock = (7 * interval) - ((todayIdx - first + 7) % 7);
    base.setDate(base.getDate() + toNextBlock);
    return toISO(base);
  }
  return task.due || null;
}

// Bring overdue repeating tasks forward to today-or-future
function rollForwardIfMissed(task) {
  if (!task.repeat) return false;
  const next = toISO(task.nextDue || task.due);
  if (!next) return false;

  let cur = next;
  const t = todayISO();
  let moved = false;
  while (cur < t) {
    cur = computeNextDue(task, cur);
    moved = true;
  }
  if (moved) {
    task.nextDue = cur;
    task.due = cur;
  }
  return moved;
}

// Pretty pills for UI
function repeatLabel(task) {
  if (!task.repeat) return '';
  
  if (task.repeat.freq === 'daily') {
    const interval = task.repeat.interval || 1;
    if (interval === 1) return '🔄 Daily';
    return `🔄 ${interval}d`;
  }
  
  if (task.repeat.freq === 'weekly') {
    const interval = task.repeat.interval || 1;
    const byWeekday = task.repeat.byWeekday || [];
    
    // Show specific days if selected
    if (byWeekday.length > 0) {
      const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = byWeekday.map(d => dayMap[d]).join(',');
      
      if (interval === 1) {
        return `📅 ${days}`;
      } else {
        return `📅 ${days} (${interval}w)`;
      }
    }
    
    // Generic weekly
    if (interval === 1) return '📅 Weekly';
    return `📅 ${interval}w`;
  }
  
  return '';
}

// Also update the inline editor weekday display for consistency
function weekdayBoxes(selected = []) {
  const map = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  return map.map((lbl,i)=>`
    <label style="margin-right:.5rem;">
      <input type="checkbox" class="edit-byweekday" value="${i}" ${selected.includes(i)?'checked':''}>
      ${lbl}
    </label>
  `).join('');
}

// Updated renderTodos function - reordered pills (repeat first, then due)
  const renderTodos = () => {
  todoList.innerHTML = '';
  const base = todosData.filter(t => !t.done);
  const view = sortTodos(filteredTodos(base));

  view.forEach((todo) => {
    const i = todosData.indexOf(todo); // true index in the data array
    const li = document.createElement('li');
    li.setAttribute('data-trueindex', i);
    
    // Add due-today data attribute
    if (isDueToday(todo)) {
      li.setAttribute('data-due-today', 'true');
    }
    
    li.style.animationDelay = `${Math.random() * 0.5}s`;

    const overduePill = isOverdue(todo) ? `<span class="pill overdue">Overdue</span>` : '';
    
    // Create repeat pill
    const repeatPill = todo.repeat ? `<span class="pill repeat">${repeatLabel(todo)}</span>` : '';
    
    // Create due pills (today, tomorrow, or regular)
    const duePill = isDueToday(todo) 
      ? `<span class="pill due" style="border:1px solid #a855f7; color:#a855f7; background:rgba(168,85,247,.12);">Due Today!</span>`
      : (isDueTomorrow(todo)
          ? `<span class="pill due" style="border:1px solid #3b82f6; color:#3b82f6; background:rgba(59,130,246,.15);">Due Tomorrow</span>`
          : (todo.due 
              ? `<span class="pill due" style="border:1px solid #f97316; color:#f97316; background:rgba(249,115,22,.12);">Due: ${toISO(todo.due)}</span>` 
              : ''));

    // Map priority to !, !!, !!! with colors
    let prioSymbol = '';
    let prioClass = '';
    if (todo.priority === 'L') {
      prioSymbol = '!';
      prioClass = 'priority-low';
    } else if (todo.priority === 'M') {
      prioSymbol = '!!';
      prioClass = 'priority-medium';
    } else if (todo.priority === 'H') {
      prioSymbol = '!!!';
      prioClass = 'priority-high';
    }

    const prioPill = todo.priority ? `<span class="pill ${prioClass}">${prioSymbol}</span>` : '';
    const tagPills = (todo.tags || []).map(t => {
  const emoji = getTagEmoji(t);
  return `<span class="pill">${emoji || t}</span>`;
}).join(' ');

    li.innerHTML = `
      <input type="checkbox" class="select-todo" data-trueindex="${i}" />
      <span class="todo-text">${todo.text}</span>
      <div class="todo-meta">
        ${repeatPill}
        ${duePill}
        ${overduePill} ${prioPill} ${tagPills}
      </div>
      <div>
        <button onclick="markAsDone(this.closest('li').getAttribute('data-trueindex'))">✅</button>
        <button onclick="editTodo(this.closest('li').getAttribute('data-trueindex'))">✏️</button>
        <button onclick="removeTodo(this.closest('li').getAttribute('data-trueindex'))">❌</button>
      </div>`;
    
    todoList.appendChild(li);
  });

  updateProgress();
  // Reset and sync Select All
  updateSelectAllState();
  updateSelectModeVisibility();
};

// Updated renderDone function - reordered pills (repeat first, then due)
const renderDone = () => {
  doneList.innerHTML = '';

  // keep search filter behavior
  const view = filteredTodos(todosData.filter(t => t.done));

  view.forEach((todo) => {
    const i = todosData.indexOf(todo);

    const li = document.createElement('li');
    li.classList.add('done');
    li.setAttribute('data-trueindex', i);
    li.style.animationDelay = `${Math.random() * 0.5}s`;

    li.innerHTML = `
      <input type="checkbox" class="select-todo" data-trueindex="${i}" />
      <span class="todo-text">${todo.text}</span>
      <div class="todo-meta">
        ${todo.repeat ? `<span class="pill pill-repeat">${repeatLabel(todo)}</span>` : ''}
        ${todo.due 
          ? (isDueToday(todo)
              ? `<span class="pill due" style="border:1px solid #a855f7; color:#a855f7; background:rgba(168,85,247,.12);">Due Today!</span>`
              : (isDueTomorrow(todo)
                  ? `<span class="pill due" style="border:1px solid #3b82f6; color:#3b82f6; background:rgba(59,130,246,.15);">Due Tomorrow</span>`
                  : `<span class="pill due" style="border:1px solid #f97316; color:#f97316; background:rgba(249,115,22,.12);">Due: ${toISO(todo.due)}</span>`))
          : ''}
        ${(todo.tags || []).map(t => {
  const emoji = getTagEmoji(t);
  return `<span class="pill pill-tag">${emoji || t}</span>`;
}).join(' ')}
      </div>
      <div>
        <button onclick="unmarkDone(${i})">↩️</button>
        <button onclick="removeTodo(${i})">❌</button>
      </div>
    `;

    doneList.appendChild(li);
  });

  updateProgress();
  updateSelectAllState();
  updateSelectModeVisibility();
};

selectAll?.addEventListener('change', (e) => {
  const boxes = document.querySelectorAll('#todo-list .select-todo, #done-list .select-todo');
  boxes.forEach(cb => { cb.checked = e.target.checked; });
  updateSelectAllState();
});

document.addEventListener('change', (e) => {
  if (e.target.matches('.select-todo')) updateSelectAllState();
});

// Inline editor for text + due + repeat + tags + priority
window.editTodo = function(index) {
  if (!requireAdmin("edit tasks")) return;
  
  const li = document.querySelector(`li[data-trueindex="${index}"]`);
  if (!li) return;
  const todo = todosData[index] || {};

  const text = todo.text ?? '';
  const due = (todo.due || '').toString().slice(0,10);
  const rep = todo.repeat || null;
  const freq = rep?.freq || '';
  const interval = rep?.interval || 1;
  const byWeekday = Array.isArray(rep?.byWeekday) ? rep.byWeekday : [];
  const tagsCSV = (todo.tags || []).join(', ');

  // 🔻 build editor UI
  li.innerHTML = `
    <div class="edit-container">
      <input type="text" class="edit-text" value="${text}" />

      <label>Due:
        <input type="date" class="edit-due" value="${due}">
      </label>
      <button type="button" class="mini-btn btn-today">Today</button>

      <label>Repeat:
        <select class="edit-repeat">
          <option value="" ${!freq?'selected':''}>None</option>
          <option value="daily" ${freq==='daily'?'selected':''}>Daily</option>
          <option value="weekly" ${freq==='weekly'?'selected':''}>Weekly</option>
        </select>
      </label>

      <label class="edit-interval-wrap" style="${freq?'':'display:none;'}">
        Every
        <input type="number" class="edit-interval" min="1" value="${interval}" style="width:4rem;">
        <span class="edit-interval-unit">${freq==='weekly'?'week(s)':'day(s)'}</span>
      </label>

      <div class="edit-weekly-wrap" style="display:${freq==='weekly'?'flex':'none'};align-items:center;">
        <span style="margin-right:.25rem;">Days:</span>
        ${weekdayBoxes(byWeekday)}
      </div>

      <label>Tags:
        <input type="text" class="edit-tags" placeholder="chores, projects, etc..." value="${tagsCSV}">
      </label>

      <label>Priority:
        <select class="edit-priority">
          <option value="" ${!todo.priority ? 'selected' : ''}>None</option>
          <option value="H" ${todo.priority === 'H' ? 'selected' : ''}>High 🔥</option>
          <option value="M" ${todo.priority === 'M' ? 'selected' : ''}>Medium ⚡</option>
          <option value="L" ${todo.priority === 'L' ? 'selected' : ''}>Low 🌿</option>
        </select>
      </label>

      <button class="btn-save">Save</button>
      <button class="btn-cancel">Cancel</button>
    </div>
  `; // ✅ close template string

  // ✅ Wire "Today" (must be AFTER innerHTML)
  const todayBtn = li.querySelector('.btn-today');
  const editDue  = li.querySelector('.edit-due');
  todayBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const today = localISODate();
    editDue.value = today;
    editDue.dispatchEvent(new Event('input',  { bubbles: true }));
    editDue.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // toggles
  const sel = li.querySelector('.edit-repeat');
  const intWrap = li.querySelector('.edit-interval-wrap');
  const intUnit = li.querySelector('.edit-interval-unit');
  const weeklyWrap = li.querySelector('.edit-weekly-wrap');

  sel.addEventListener('change', () => {
    const v = sel.value;
    intWrap.style.display = v ? '' : 'none';
    intUnit.textContent = v==='weekly' ? 'week(s)' : 'day(s)';
    weeklyWrap.style.display = v==='weekly' ? 'flex' : 'none';
  });

  // cancel -> re-render
  li.querySelector('.btn-cancel').onclick = () => { renderTodos(); };

  // save -> PATCH
  li.querySelector('.btn-save').onclick = async () => {
    const newText = li.querySelector('.edit-text').value.trim();
    const newDue = editDue.value || null;
    const newFreq = sel.value;
    const newInterval = parseInt(li.querySelector('.edit-interval')?.value || '1',10);
    const newPriority = li.querySelector('.edit-priority')?.value || '';

    const tagsVal = li.querySelector('.edit-tags').value || '';
    const tags = tagsVal.split(',').map(s => s.trim()).filter(Boolean);

    let repeat = null;
    if (newFreq) {
      repeat = { freq: newFreq, interval: Math.max(1,newInterval) };
      if (newFreq === 'weekly') {
        repeat.byWeekday = [...li.querySelectorAll('.edit-byweekday:checked')].map(cb => parseInt(cb.value,10));
      }
    }

    const patch = { text: newText || todo.text, due: newDue, tags, priority: newPriority || null };
    if (repeat) {
      patch.repeat = repeat;
      const temp = { ...todo, repeat, due: newDue || (todo.due || todayISO()) };
      patch.nextDue = computeNextDue(temp, temp.due);
    } else {
      patch.repeat = null;
      patch.nextDue = null;
    }

    try {
      const res = await fetch(`/todos/${index}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) return alert(`Failed to save (${res.status}).`);
      await loadTodosFromServer();
    } catch {
      alert('Failed to save changes.');
    }
  };
};

// === Add New Todo (reusable) ===
async function addNewTodo() {
  // Better admin check with early return
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
    alert("❌ Admin login required to add tasks");
    return;
  }
  
  // Check if input is disabled or empty
  if (todoInput.disabled || !todoInput.value.trim()) {
    return;
  }

  const text = todoInput.value.trim();
  const due = dueInput.value ? dueInput.value : null;

  // Build repeat object if selected
  let repeat = null;
  if (repeatSelect.value) {
    repeat = {
      freq: repeatSelect.value, // 'daily' | 'weekly'
      interval: Math.max(1, parseInt(intervalInput.value || '1', 10))
    };
    if (repeatSelect.value === 'weekly') {
      repeat.byWeekday = [...document.querySelectorAll('.byweekday:checked')]
        .map(cb => parseInt(cb.value, 10));
    }
  }

  // Priority and tags
  const priority = prioSelect.value || null;
  const tags = tagInput.value
    ? tagInput.value.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const payload = {
    text,
    done: false,
    due: due || (repeat ? todayISO() : null),
    repeat,
    lastDone: null,
    tags,
    priority,
    createdAt: Date.now(),
  };

  if (repeat) {
    payload.nextDue = computeNextDue(payload, payload.due);
    payload.due = payload.due || payload.nextDue;
  }

  try {
    await fetch('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Reset inputs
    todoInput.value = '';
    dueInput.value = '';
    repeatSelect.value = '';
    intervalInput.value = '1';
    document.querySelectorAll('.byweekday').forEach(cb => cb.checked = false);
    intervalWrap.style.display = 'none';
    weeklyWrap.style.display = 'none';
    prioSelect.value = '';
    tagInput.value = '';

    await loadTodosFromServer();
  } catch {
    alert("Failed to add todo.");
  }
}

// === Step 2: Enter on main text field ===
todoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    
    // Check if user is logged in
    if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
      alert("❌ Admin login required to add tasks");
      return;
    }
    
    addNewTodo();
  }
});

// === Step 3: Bind Enter to other inputs (not search) ===
function bindEnterToAdd(el) {
  if (!el) return;
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Don't add while searching
      if (document.activeElement === searchInput) return;
      
      // Check if user is logged in
      if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
        alert("❌ Admin login required to add tasks");
        return;
      }
      
      addNewTodo();
    }
  });
}
bindEnterToAdd(tagInput);
bindEnterToAdd(dueInput);
bindEnterToAdd(prioSelect);
bindEnterToAdd(repeatSelect);
bindEnterToAdd(intervalInput);

  // Fixed markAsDone function with safeguards
window.markAsDone = async (index) => {
  if (!requireAdmin("mark tasks as done")) return;
  
  const task = todosData[index];
  if (!task) return;

  // If it's a repeating task, advance dates instead of moving to Done
 if (task.repeat) {
  const nowISO = todayISO();

  // 🔹 Save previous state for UNDO
  repeatUndos.push({
    index: Number(index),
    prevDue: task.due ?? null,
    prevNextDue: task.nextDue ?? null,
    prevLastDone: task.lastDone ?? null
  });

  const updates = { lastDone: nowISO };
    
    // Use the current due date as the starting point, or today if no due date
    const currentDue = toISO(task.nextDue || task.due || nowISO);
    
    // Compute the next occurrence from the current due date
    let nextDue = computeNextDue(task, currentDue);
    
    // Safety check: if nextDue is null or invalid, fallback
    if (!nextDue) {
      console.error("computeNextDue returned invalid result, using fallback");
      // Fallback: add interval to current due date
      if (task.repeat.freq === 'daily') {
        const interval = Math.max(1, task.repeat.interval || 1);
        nextDue = addDays(currentDue, interval);
      } else if (task.repeat.freq === 'weekly') {
        const interval = Math.max(1, task.repeat.interval || 1);
        nextDue = addDays(currentDue, interval * 7);
      } else {
        nextDue = addDays(currentDue, 1); // ultimate fallback
      }
    }
    
    // Safety check: prevent infinite loops by limiting iterations
    let iterations = 0;
    const maxIterations = 100; // Safety limit
    
    // If the next due date is still in the past (timezone issues), advance it
    while (nextDue <= nowISO && iterations < maxIterations) {
      iterations++;
      const previousNext = nextDue;
      nextDue = computeNextDue(task, nextDue);
      
      // If computeNextDue isn't advancing the date, force advancement
      if (nextDue <= previousNext) {
        console.warn("computeNextDue not advancing properly, forcing advancement");
        if (task.repeat.freq === 'daily') {
          const interval = Math.max(1, task.repeat.interval || 1);
          nextDue = addDays(previousNext, interval);
        } else if (task.repeat.freq === 'weekly') {
          const interval = Math.max(1, task.repeat.interval || 1);
          nextDue = addDays(previousNext, interval * 7);
        } else {
          nextDue = addDays(previousNext, 1);
        }
      }
    }
    
    // Final safety check
    if (iterations >= maxIterations) {
      console.error("Hit maximum iterations in markAsDone, using emergency fallback");
      nextDue = addDays(nowISO, 1); // Emergency fallback: tomorrow
    }
    
    // Ensure the next due date is at least tomorrow
    if (nextDue <= nowISO) {
      nextDue = addDays(nowISO, 1);
    }

    updates.nextDue = nextDue;
    updates.due = nextDue;

    console.log(`Marking repeating task as done. Current due: ${currentDue}, Next due: ${nextDue}, Today: ${nowISO}`);

    try {
      const response = await fetch(`/todos/${index}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem(ADMIN_PASSWORD_KEY)}`
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      await loadTodosFromServer();
    } catch (error) {
      console.error("Failed to advance repeating task:", error);
      alert("Failed to advance repeating task. Please try again.");
    }
    return;
  }

  // Non-repeating: behave as before
  try {
    const response = await fetch(`/todos/${index}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem(ADMIN_PASSWORD_KEY)}`
      },
      body: JSON.stringify({ done: true })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    await loadTodosFromServer();
  } catch (error) {
    console.error("Failed to mark task as done:", error);
    alert("Failed to mark as done. Please try again.");
  }
};

// Fix unmarkDone function - add admin check
window.unmarkDone = async (index) => {
  if (!requireAdmin("unmark tasks as done")) return;
  
  try {
    await fetch(`/todos/${index}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem(ADMIN_PASSWORD_KEY)}`
      },
      body: JSON.stringify({ done: false })
    });
    await loadTodosFromServer();
  } catch {
    alert("Failed to move back to To Do.");
  }
};

  // Remove todo
  window.removeTodo = function(index) {
  showDeleteConfirmation(index);
};

  // Fix undo button - add admin check
undoBtn.addEventListener('click', async () => {
  if (!requireAdmin("undo actions")) return;

  // 🔹 First: try to undo a repeating-task advance
  if (repeatUndos.length) {
    const u = repeatUndos.pop();
    try {
      await fetch(`/todos/${u.index}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem(ADMIN_PASSWORD_KEY)}`
        },
        body: JSON.stringify({
          due: u.prevDue,
          nextDue: u.prevNextDue,
          lastDone: u.prevLastDone
        })
      });
      await loadTodosFromServer();
      return; // done—don’t also try deletion undo
    } catch (e) {
      console.error("Failed to undo repeating advance:", e);
      alert("Failed to undo the repeating task. Please try again.");
      return;
    }
  }
  
 if (!deletedTodos.length) return;

  const restoring = [...deletedTodos];
  deletedTodos = [];

  for (const obj of restoring) {
    await fetch('/todos', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem(ADMIN_PASSWORD_KEY)}`
      },
      body: JSON.stringify(obj)
    });
  }

  loadTodosFromServer();
});

 window.deleteSelected = function() {
  showBulkDeleteConfirmation();
};

//Toggle button visibility during search
function updateButtonVisibility() {
  const q = (searchInput?.value || '').trim();
  
  // Hide Save Order button when searching
  if (saveOrderBtn) {
    saveOrderBtn.style.display = q ? 'none' : 'inline-block';
  }
  
  // Hide Reorder button when searching
  const toggleDragBtn = document.getElementById('toggle-drag');
  if (toggleDragBtn) {
    toggleDragBtn.style.display = q ? 'none' : 'inline-block';
  }

  // Hide Select Mode button when searching
  if (selectModeBtn) {
    selectModeBtn.style.display = q ? 'none' : 'inline-block';
  }
   // Update select mode visibility
  updateSelectModeVisibility();
}
  //Toggle Drag mode
let dragEnabled = false;
let sortableInstance = null;

const toggleDragBtn = document.getElementById('toggle-drag');

// Also update the toggle drag button to check admin status
toggleDragBtn.addEventListener('click', () => {
  if (!dragEnabled && !requireAdmin("reorder tasks")) return;
  
  dragEnabled = !dragEnabled;

  if (dragEnabled) {
    toggleDragBtn.textContent = '↕️ Reordering...';
    document.body.classList.add('dragging-active');
    enableDrag();
  } else {
    toggleDragBtn.textContent = '↕️ Reorder';
    document.body.classList.remove('dragging-active');
    disableDrag();
  }
});

document.getElementById('save-order')?.addEventListener('click', async () => {
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) return alert("❌ Admin login required to modify tasks order");

  // Rebuild todosData from the current DOM order (not relying on previous state)
  const listItems = document.querySelectorAll('#todo-list li');
  const snapshot = [...todosData]; // snapshot BEFORE we mutate
  const newOrder = [];

  listItems.forEach(li => {
    const trueIndex = parseInt(li.getAttribute('data-trueindex'), 10);
    const item = snapshot[trueIndex];
    if (item && !item.done) newOrder.push(item);
  });

  // Keep done items at the end (unchanged)
  const doneItems = snapshot.filter(t => t.done);
  todosData = [...newOrder, ...doneItems];

  try {
    const res = await fetch('/todos/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem(ADMIN_PASSWORD_KEY)}`
      },
      body: JSON.stringify(todosData) // 👈 if your API wants IDs only, see note below
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // UI feedback + lock sort to Custom
    alert('✅ Order saved!');
    sortSelect.value = 'default';
    sortSelect.dispatchEvent(new Event('change'));

    // Reload to confirm server-side order is now authoritative
    await loadTodosFromServer();
  } catch (err) {
    alert('⚠️ Failed to save order.');
    console.error(err);
  }
});

// Fix enableDrag function - add admin check and auth header
function enableDrag() {
  if (!requireAdmin("reorder tasks")) return;
  
  sortableInstance = new Sortable(todoList, {
    animation: 150,

    onStart() {
      // switch dropdown as soon as dragging begins
      forceCustomSort();
    },

    onUpdate() {
      // keep it on custom if user continues moving items
      forceCustomSort();
    },

    onEnd: async () => {
      const listItems = document.querySelectorAll('#todo-list li');
      const newOrder = [];

      listItems.forEach(li => {
        const trueIndex = parseInt(li.getAttribute('data-trueindex'));
        const originalItem = todosData[trueIndex];
        if (originalItem && !originalItem.done) newOrder.push(originalItem);
      });

      const doneItems = todosData.filter(todo => todo.done);
      todosData = [...newOrder, ...doneItems];

      // 🔁 Save reordered list to server
      try {
        await fetch('/todos/reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem(ADMIN_PASSWORD_KEY)}`
          },
          body: JSON.stringify(todosData)
        });
      } catch (err) {
        alert('⚠️ Failed to save new order to server.');
      }

      // lock sort to custom and re-render
      forceCustomSort();
      renderTodos();
      renderDone();
    }
  });
}

function disableDrag() {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
}
  // Init
  toggleDragBtn.textContent = '↕️Reorder';
  loadTodosFromServer();

  // Stars
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");
  let w,h;
  function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    w = canvas.width;
    h = canvas.height;
  }
  resizeCanvas();
  let stars = Array.from({length: 300},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.5+0.5,d:Math.random()*0.5+0.2}));
  function draw(){
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--star-color').trim()||"#fff";
    stars.forEach(s=>{
      ctx.beginPath();
      ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fill();
    });
    move();
  }
  function move(){
    stars.forEach(s=>{
      s.y -= s.d;
      if(s.y<0){s.y=h;s.x=Math.random()*w;}
    });
  }
  function animate(){
    draw();
    requestAnimationFrame(animate);
  }
  animate();
  window.addEventListener('resize', resizeCanvas);

  updateAdminUI();

  // === DELETE CONFIRMATION SYSTEM ===
// Get or create the delete confirmation modal
function getDeleteModal() {
  let modal = document.getElementById('delete-modal');
  if (!modal) {
    console.error('Delete modal not found in HTML');
    return null;
  }
  
  // Only add event listeners once
  if (!modal.hasAttribute('data-listeners-added')) {
    modal.setAttribute('data-listeners-added', 'true');
    
    // Add event listeners
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cancelDelete();
      }
    });
    
    const cancelBtn = document.getElementById('cancel-delete-btn');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    if (cancelBtn) cancelBtn.addEventListener('click', cancelDelete);
    if (confirmBtn) confirmBtn.addEventListener('click', confirmDelete);
    
    // Handle Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        cancelDelete();
      }
    });
  }
  
  return modal;
}

// Show delete confirmation for a single task
function showDeleteConfirmation(index, taskText = null) {
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
    alert("❌ Admin login required to delete tasks");
    return;
  }
  
  const modal = getDeleteModal();
  const task = todosData[index];
  
  if (!task) {
    alert("Task not found");
    return;
  }
  
  // Store what we're about to delete
  pendingDeletion = {
    type: 'single',
    index: index,
    task: task
  };
  
  // Update modal content
  document.getElementById('delete-message').textContent = 'Are you sure you want to delete this task?';
  document.getElementById('delete-preview').innerHTML = `
    <div class="delete-task-item">
      <span class="delete-task-text">${task.text}</span>
      ${task.tags && task.tags.length ? 
        `<div class="delete-task-tags">${task.tags.map(tag => `<span class="pill">${tag}</span>`).join(' ')}</div>` 
        : ''}
      ${task.priority ? 
        `<span class="pill priority-${task.priority.toLowerCase()}">${task.priority === 'H' ? '!!! High' : task.priority === 'M' ? '!! Medium' : '! Low'}</span>` 
        : ''}
    </div>
  `;
  
  // Show modal
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  // Focus the cancel button by default (safer)
  document.getElementById('cancel-delete-btn').focus();
}

// Show delete confirmation for multiple selected tasks
function showBulkDeleteConfirmation() {
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) {
    alert("❌ Admin login required to delete tasks");
    return;
  }
  
  const selected = [...document.querySelectorAll('.select-todo:checked')]
    .map(cb => parseInt(cb.dataset.trueindex, 10));
    
  if (selected.length === 0) {
    alert("No tasks selected");
    return;
  }
  
  const modal = getDeleteModal();
  
  // Store what we're about to delete
  pendingDeletion = {
    type: 'bulk',
    indices: selected,
    tasks: selected.map(i => todosData[i]).filter(Boolean)
  };
  
  // Update modal content
  const count = selected.length;
  document.getElementById('delete-message').textContent = 
    `Are you sure you want to delete ${count} task${count > 1 ? 's' : ''}?`;
  
  // Show preview of tasks to be deleted
  const previewHtml = selected.slice(0, 5).map(index => {
    const task = todosData[index];
    if (!task) return '';
    return `
      <div class="delete-task-item">
        <span class="delete-task-text">${task.text}</span>
        ${task.tags && task.tags.length ? 
          `<div class="delete-task-tags">${task.tags.map(tag => `<span class="pill">${tag}</span>`).join(' ')}</div>` 
          : ''}
      </div>
    `;
  }).join('');
  
  document.getElementById('delete-preview').innerHTML = 
    previewHtml + (selected.length > 5 ? `<div class="delete-more">...and ${selected.length - 5} more tasks</div>` : '');
  
  // Show modal
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  // Focus the cancel button by default (safer)
  document.getElementById('cancel-delete-btn').focus();
}

// Cancel deletion
function cancelDelete() {
  const modal = document.getElementById('delete-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
  pendingDeletion = null;
}

// Confirm and execute deletion
async function confirmDelete() {
  if (!pendingDeletion) {
    cancelDelete();
    return;
  }
  
  try {
    if (pendingDeletion.type === 'single') {
      // Delete single task
      const index = pendingDeletion.index;
      deletedTodos.push(todosData[index]); // for undo
      
      const response = await fetch(`/todos/${index}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem(ADMIN_PASSWORD_KEY)}`
        }
      });
      
      // Check for actual errors (not 404 which means already deleted)
      if (!response.ok && response.status !== 404) {
        if (response.status === 401 || response.status === 403) {
          alert("❌ Authentication error. Please login again.");
          return; // Don't close modal, let user retry
        } else {
          alert(`❌ Failed to delete task (HTTP ${response.status}). Please try again.`);
          return; // Don't close modal, let user retry
        }
      }
      
    } else if (pendingDeletion.type === 'bulk') {
      // Delete multiple tasks (in reverse order to maintain indices)
      const indices = [...pendingDeletion.indices].sort((a, b) => b - a);
      let failedCount = 0;
      
      for (const index of indices) {
        deletedTodos.push(todosData[index]); // for undo
        
        const response = await fetch(`/todos/${index}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem(ADMIN_PASSWORD_KEY)}`
          }
        });
        
        // Check for actual errors (not 404 which means already deleted)
        if (!response.ok && response.status !== 404) {
          failedCount++;
          console.warn(`Failed to delete task ${index}: HTTP ${response.status}`);
        }
      }
      
      // Show error only if some deletions actually failed
      if (failedCount > 0) {
        if (failedCount === indices.length) {
          alert(`❌ Failed to delete ${failedCount} task${failedCount > 1 ? 's' : ''}. Please check your authentication and try again.`);
          return; // Don't close modal, let user retry
        } else {
          alert(`⚠️ ${failedCount} out of ${indices.length} tasks failed to delete. The rest were deleted successfully.`);
          // Continue to close modal and refresh since some succeeded
        }
      }
    }
    
    // Close modal and refresh (only reached if successful or partial success)
    const wasSelectMode = selectMode;
    cancelDelete();
    await loadTodosFromServer();
    
    // Exit select mode after ANY deletion (single or bulk)
    if (wasSelectMode) {
      toggleSelectMode();
    }
    
  } catch (error) {
    // This catches network errors, not HTTP status errors
    console.error('Network error during deletion:', error);
    alert("❌ Network error. Please check your connection and try again.");
    // Don't close the modal on network error so user can retry
  }
}

  exportBtn?.addEventListener('click', async () => {
  try {
    const data = await (await fetch('/todos')).json();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `todos-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch {
    alert('Export failed.');
  }
});

importFile?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  let arr;
  try { arr = JSON.parse(await file.text()); } catch { return alert('Invalid JSON'); }
  if (!Array.isArray(arr)) return alert('JSON must be an array of tasks');

  // minimal normalization
  arr = arr.map(t => ({ done:false, ...t }));

  try {
    await fetch('/todos/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem(ADMIN_PASSWORD_KEY) || ''}`
      },
      body: JSON.stringify(arr)
    });
    await loadTodosFromServer();
    alert('Imported ✅');
  } catch {
    alert('Import failed (need admin login?).');
  } finally {
    e.target.value = '';
  }
});
