// Elements
const input = document.getElementById("todo-input");
const todoListElem = document.getElementById("todo-list");
const doneListElem = document.getElementById("done-list");

// Retrieve stored todos from localStorage or initialize an empty array
let todos = JSON.parse(localStorage.getItem("todos")) || [];

// Save todos to localStorage
function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
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

// Add new todo
function addTodo(text) {
  todos.push({ text: text, done: false });
  saveTodos();
  renderTodos();
}

// Delete a todo item
function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();
  renderTodos();
}

// Toggle todo's "done" status
function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  saveTodos();
  renderTodos();
}

// Event listener for Enter key in the input field
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && input.value.trim() !== "") {
    addTodo(input.value.trim());
    input.value = "";
  }
});

// Event delegation for delete buttons
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const idx = parseInt(e.target.getAttribute("data-index"));
    deleteTodo(idx);
  }
});

// Initial render
renderTodos();
