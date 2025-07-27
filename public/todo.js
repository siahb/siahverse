const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");

const API = "https://todo.siahverse.cc/todos";

async function fetchTodos() {
  const res = await fetch(API);
  const todos = await res.json();
  render(todos);
}

function render(todos) {
  list.innerHTML = "";
  todos.forEach((todo, index) => {
    const li = document.createElement("li");
    li.innerHTML = `${todo} <button onclick="removeTodo(${index})">✖</button>`;
    list.appendChild(li);
  });
}

async function addTodo(text) {
  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ todo: text }),
  });
  fetchTodos();
}

async function removeTodo(index) {
  const password = prompt("Enter admin password to delete:");
  if (!password) return;

  const res = await fetch(`${API}/${index}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${password}`,
    },
  });

  const data = await res.json();
  if (data.error) {
    alert(`❌ ${data.error}`);
  } else {
    fetchTodos();
  }
}

input.addEventListener("keypress", function (e) {
  if (e.key === "Enter" && input.value.trim() !== "") {
    addTodo(input.value.trim());
    input.value = "";
  }
});

fetchTodos();
