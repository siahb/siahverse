  const todoInput = document.getElementById('todo-input');
  const todoList = document.getElementById('todo-list');
  const doneList = document.getElementById('done-list');
  const undoBtn = document.getElementById('undo-btn');
  const selectAll = document.getElementById('select-all');
  const themeCheckbox = document.getElementById('toggle-theme-checkbox');
  const dueInput = document.getElementById('due-input');
  const dueTodayBtn = document.getElementById('due-today');
  if (dueTodayBtn) {
  dueTodayBtn.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0,10);
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
  // toolbar controls
  const searchToggle = document.getElementById('search-toggle');
  const searchInput = document.getElementById('search-input');   // Search…
  const sortSelect  = document.getElementById('sort-select');    // Sort: …
  // Force default sort on startup
  if (sortSelect) {
  sortSelect.value = 'default';
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

  sortSelect?.addEventListener('change', () => { renderTodos(); });
  repeatSelect.addEventListener('change', () => {
  const v = repeatSelect.value;
  intervalWrap.style.display = v ? '' : 'none';
  intervalUnit.textContent = v === 'weekly' ? 'week(s)' : 'day(s)';
  weeklyWrap.style.display = v === 'weekly' ? 'flex' : 'none';
});
  
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

// Search toggle button - shows/hides and clears input
searchToggle?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const open = searchInput.classList.contains('active');
  open ? hideSearch() : showSearch();
});

// Ctrl/Cmd + F opens search
document.addEventListener('keydown', (e) => {
  const isFind = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f';
  if (!isFind) return;
  e.preventDefault();
  showSearch();
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
    showSearch();
  }
});

  // Button visibility
function updateAdminUI() {
  const pw = localStorage.getItem(ADMIN_PASSWORD_KEY);
  const isLoggedIn = !!pw;

  document.getElementById('enter-password').style.display = isLoggedIn ? 'none' : 'inline-block';
  document.getElementById('logout').style.display = isLoggedIn ? 'inline-block' : 'none';
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
    todoInput.disabled = false;
    adminModal.style.display = 'none';
    updateAdminUI();
  }
});

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
    alert("Logged out.");
    todoInput.disabled = true;
    updateAdminUI();
  });
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) todoInput.disabled = true;

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
function todayISO() { return new Date().toISOString().slice(0,10); }

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
    // H (3) > M (2) > L (1) > none (0)
    copy.sort((a,b)=>{
      const r = priRank(b.priority) - priRank(a.priority);
      if (r !== 0) return r;
      // tie-breakers (optional but nice):
      const d = (a.due||'').localeCompare(b.due||'');
      if (d !== 0) return d;
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
function repeatLabel(task){
  if (!task.repeat) return '';
  if (task.repeat.freq === 'daily') return `Repeats daily (every ${task.repeat.interval||1}d)`;
  if (task.repeat.freq === 'weekly') {
    const map = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const wd = (task.repeat.byWeekday||[]).map(x=>map[x]).join(',');
    return `Repeats weekly${wd?` (${wd})`:''} (every ${task.repeat.interval||1}w)`;
  }
  return '';
}
  
  // Build weekday checkboxes for the editor
function weekdayBoxes(selected = []) {
  const map = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  return map.map((lbl,i)=>`
    <label style="margin-right:.5rem;">
      <input type="checkbox" class="edit-byweekday" value="${i}" ${selected.includes(i)?'checked':''}>
      ${lbl}
    </label>
  `).join('');
}

// Render Todos
const renderTodos = () => {
  todoList.innerHTML = '';
  const base = todosData.filter(t => !t.done);
  const view = sortTodos(filteredTodos(base));

  view.forEach((todo) => {
    const i = todosData.indexOf(todo); // true index in the data array
    const li = document.createElement('li');
    li.setAttribute('data-trueindex', i);
    li.style.animationDelay = `${Math.random() * 0.5}s`;

    const overduePill = isOverdue(todo) ? `<span class="pill overdue">Overdue</span>` : '';

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
    const tagPills = (todo.tags || []).map(t => `<span class="pill">${t}</span>`).join(' ');

    li.innerHTML = `
      <input type="checkbox" class="select-todo" data-trueindex="${i}" />
      <span class="todo-text">${todo.text}</span>
      <div class="todo-meta">
        ${todo.due ? `<span class="pill due">Due: ${toISO(todo.due)}</span>` : ''}
        ${todo.repeat ? `<span class="pill repeat">${repeatLabel(todo)}</span>` : ''}
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
};
  
// Render Done
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
        ${todo.due ? `<span class="pill pill-due">Due: ${toISO(todo.due)}</span>` : ''}
        ${todo.repeat ? `<span class="pill pill-repeat">${repeatLabel(todo)}</span>` : ''}
        ${(todo.tags || []).map(t => `<span class="pill pill-tag">${t}</span>`).join(' ')}
      </div>
      <div>
        <button onclick="unmarkDone(${i})">↩️</button>
        <button onclick="removeTodo(${i})">❌</button>
      </div>
    `;

    doneList.appendChild(li);
  });

  updateProgress();
  updateSelectAllState(); // ensure header reflects state right after render
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
window.editTodo = function(index){
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
    const today = new Date().toISOString().slice(0,10);
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
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) return alert("Admin only");
  if (!todoInput.value.trim()) return;

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
    addNewTodo();
  }
});

// === Step 3: Bind Enter to other inputs (not search) ===
function bindEnterToAdd(el) {
  if (!el) return;
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (document.activeElement === searchInput) return; // don't add while searching
      addNewTodo();
    }
  });
}
bindEnterToAdd(tagInput);
bindEnterToAdd(dueInput);
bindEnterToAdd(prioSelect);
bindEnterToAdd(repeatSelect);
bindEnterToAdd(intervalInput);

// Mark as done OR advance repeating task
window.markAsDone = async (index) => {
  const task = todosData[index];
  if (!task) return;

  // If it's a repeating task, advance dates instead of moving to Done
if (task.repeat) {
  const nowISO = todayISO();
  const updates = { lastDone: nowISO };
  const startFrom = toISO(task.nextDue || task.due || nowISO);

  // always advance at least one occurrence
  let next = computeNextDue(task, startFrom);
  while (next <= nowISO) next = computeNextDue(task, next);

  updates.nextDue = next;
  updates.due = next;

  try {
    await fetch(`/todos/${index}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    await loadTodosFromServer();
  } catch {
    alert("Failed to advance repeating task.");
  }
  return;
}

  // Non-repeating: behave as before
  try {
    await fetch(`/todos/${index}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true })
    });
    await loadTodosFromServer();
  } catch {
    alert("Failed to mark as done.");
  }
};

  //Unmark done
window.unmarkDone = async (index) => {
  try {
    await fetch(`/todos/${index}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: false })
    });
    await loadTodosFromServer();
  } catch {
    alert("Failed to move back to To Do.");
  }
};

  // Remove todo
  window.removeTodo = async (i) => {
    if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) return alert("Admin only");
    deletedTodos.push(todosData[i]); // save full object
    try {
      await fetch(`/todos/${i}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem(ADMIN_PASSWORD_KEY)}`
        }
      });
      await loadTodosFromServer();
    } catch {
      alert("Failed to delete.");
    }
  };

  // Undo button
 undoBtn.addEventListener('click', async () => {
  if (!deletedTodos.length) return;

  const restoring = [...deletedTodos]; // Clone to avoid timing issues
  deletedTodos = [];

for (const obj of restoring) {
  await fetch('/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj) // send full object
  });
}

  loadTodosFromServer();
});

  window.deleteSelected = async () => {
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) return alert("Admin only");

  const selected = [...document.querySelectorAll('.select-todo:checked')]
    .map(cb => parseInt(cb.dataset.trueindex, 10))
    .sort((a,b) => b - a);

  for (const i of selected) {
    await window.removeTodo(i); // removeTodo already reloads after each delete
  }
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
}
  //Toggle Drag mode
let dragEnabled = false;
let sortableInstance = null;

const toggleDragBtn = document.getElementById('toggle-drag');

toggleDragBtn.addEventListener('click', () => {
  dragEnabled = !dragEnabled;

  if (dragEnabled) {
    toggleDragBtn.textContent = '↕️ Reordering...';
    document.body.classList.add('dragging-active'); // 👈 add this
    enableDrag();
  } else {
    toggleDragBtn.textContent = '↕️ Reorder';
    document.body.classList.remove('dragging-active'); // 👈 remove
    disableDrag();
  }
});

document.getElementById('save-order')?.addEventListener('click', async () => {
  if (!localStorage.getItem(ADMIN_PASSWORD_KEY)) return alert("Admin only");

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

function enableDrag() {
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
