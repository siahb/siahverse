import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3002;
const DB_FILE = './db.json';
const ADMIN_PASSWORD = 'siahadmin123'; // ⛔ Change in prod

app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.redirect('/todo.html');
});
// Load TODOs
const loadTodos = async () => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

// Save TODOs
const saveTodos = async (todos) => {
  await fs.writeFile(DB_FILE, JSON.stringify(todos, null, 2));
};

// GET all todos
app.get('/todos', async (req, res) => {
  const todos = await loadTodos();
  res.json(todos);
});

// POST new todo
app.post('/todos', async (req, res) => {
  const { todo } = req.body;
  if (!todo) return res.status(400).json({ error: 'Missing todo' });

  const todos = await loadTodos();
  todos.push(todo);
  await saveTodos(todos);
  res.json({ status: 'added', todo });
});

// DELETE todo (admin only)
app.delete('/todos/:index', async (req, res) => {
  const auth = req.headers.authorization;
if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
  return res.status(401).json({ error: 'Unauthorized' });
}

  const index = parseInt(req.params.index);
  const todos = await loadTodos();

  if (index < 0 || index >= todos.length) {
    return res.status(404).json({ error: 'Invalid index' });
  }

  const removed = todos.splice(index, 1);
  await saveTodos(todos);
  res.json({ status: 'deleted', removed });
});

app.listen(PORT, () => {
  console.log(`✅ TODO API running at http://localhost:${PORT}`);
});
