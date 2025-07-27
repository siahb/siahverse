const API = '/todos';
const input = document.getElementById("todo-input");
const todoListElem = document.getElementById("todo-list");
const doneListElem = document.getElementById("done-list");

// Store todos in memory
let todos = [];

// Fetch todos from server
async function fetchTodos() {
  const res = await fetch(API, {
    headers: { "Authorization": `Bearer ${getAdminPassword()}` }
  });
  todos = await res.json();
  renderTodos();
}

// Save todos to server (PUT replaces all)
async function saveTodos() {
  await fetch(API, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getAdminPassword()}` },
    body: JSON.stringify(todos)
  });
  fetchTodos();
}

// Render both To Do and Marked As Done lists
function renderTodos() {
  todoListElem.innerHTML = "";
  doneListElem.innerHTML = "";
  todos.forEach((todo, index) => {
    const li = document.createElement("li");
    li.setAttribute("data-index", index);
    li.innerHTML = `
      <input type="checkbox" class="toggle-checkbox" ${todo.done ? "checked" : ""}>
      <span style="text-decoration: ${todo.done ? "line-through" : "none"}">
        ${todo.text}
      </span>
      <button class="delete-btn" data-index="${index}">✖</button>
    `;
    // Listen for toggle changes on the checkbox
    li.querySelector(".toggle-checkbox").addEventListener("change", () => {
      toggleTodo(index);
    });
    if (todo.done) {
      doneListElem.appendChild(li);
    } else {
      todoListElem.appendChild(li);
    }
  });
}

// Add new todo (POST to server)
async function addTodo(text) {
  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getAdminPassword()}` },
    body: JSON.stringify({ text, done: false })
  });
  fetchTodos();
}

// Delete a todo item (DELETE by index)
async function deleteTodo(index) {
  await fetch(`${API}/${index}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${getAdminPassword()}` }
  });
  fetchTodos();
}

// Toggle todo's "done" status and update server
async function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  await saveTodos();
}

// Event listener for Enter key in the input field
input.addEventListener("keypress", async (e) => {
  if (e.key === "Enter" && input.value.trim() !== "") {
    if (!getAdminPassword()) {
      alert("Only admin can add tasks. Please log in.");
      return;
    }
    await addTodo(input.value.trim());
    input.value = "";
  }
});

// Event delegation for delete buttons
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-btn")) {
    if (!getAdminPassword()) {
      alert("Only admin can delete tasks. Please log in.");
      return;
    }
    const idx = parseInt(e.target.getAttribute("data-index"));
    await deleteTodo(idx);
  }
});

// --- Admin Login/Logout Logic (Password Only) ---
// Key for storing admin password
const ADMIN_PASSWORD_KEY = 'adminPassword';

// Helper function: get stored admin password
const getAdminPassword = () => localStorage.getItem(ADMIN_PASSWORD_KEY);

// Show or hide the admin modal based solely on password login
const showModal = (isLoggedIn) => {
  adminModal.style.display = 'flex'; // center modal with flex
  if (isLoggedIn) {
    modalTitle.textContent = 'Admin Options';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('logout-form').style.display = 'block';
  } else {
    modalTitle.textContent = 'Admin Login';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('logout-form').style.display = 'none';
    passwordInput.value = '';
  }
};

const hideModal = () => { adminModal.style.display = 'none'; };

// When admin clicks Login, check only the password (e.g. "password123")
loginBtn.addEventListener('click', () => {
  const password = passwordInput.value.trim();
  if (password === 'password123') {  // check against your chosen password
    localStorage.setItem(ADMIN_PASSWORD_KEY, password);
    alert("Login successful!");
    hideModal();
    // Enable task input and deletion features for admin
    todoInput.disabled = false;
  } else {
    alert("Invalid password.");
  }
});

// Logout option
logoutModalBtn.addEventListener('click', () => {
  localStorage.removeItem(ADMIN_PASSWORD_KEY);
  alert("Logged out successfully.");
  hideModal();
  // Disable task input and deletion features when not admin
  todoInput.disabled = true;
});

// Open modal when clicking the admin logo
adminLogo.addEventListener('click', () => {
  showModal(!!getAdminPassword());
});

// Initially, if admin isn’t logged in, disable the task input field
if (!getAdminPassword()) {
  todoInput.disabled = true;
}

// --- End Admin Login/Logout Logic ---

// Example: Check for admin (password) before allowing a task to be added
todoInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && todoInput.value.trim()) {
    if (!getAdminPassword()) {
      alert("Only admin can add tasks. Please log in.");
      return;
    }
    // Add new task – for example, via a backend call
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todo: todoInput.value.trim(), done: false })
    });
    todoInput.value = '';
    fetchTodos();
  }
});

// And similarly, before deletion or updates, check for an admin:
// ...
