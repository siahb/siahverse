import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3002;
const DB_FILE = './db.json';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // set in .env

app.use(cors());
app.use(express.json());

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.redirect('/todo.html');
});

// Load todos from db.json
const loadTodos = async () => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

// Save todos to db.json
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
  const { text, ...rest } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing text' });
  }

  const todos = await loadTodos();
  const newTodo = {
    text: text.trim(),
    done: false,
    ...rest // optional fields: due, repeat, priority, tags, etc.
  };

  todos.push(newTodo);
  await saveTodos(todos);
  res.json({ status: 'added', todo: newTodo });
});

// PATCH update todo
app.patch('/todos/:index', async (req, res) => {
  const index = parseInt(req.params.index);
  const updates = req.body;
  const todos = await loadTodos();

  if (index < 0 || index >= todos.length) {
    return res.status(404).json({ error: 'Invalid index' });
  }

  todos[index] = { ...todos[index], ...updates };
  await saveTodos(todos);
  res.json({ status: 'updated', todo: todos[index] });
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

// POST reorder todos (admin only)
app.post('/todos/reorder', async (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const reorderedTodos = req.body;
  if (!Array.isArray(reorderedTodos)) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  await saveTodos(reorderedTodos);
  res.json({ status: 'reordered' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ TODO API running at http://localhost:${PORT}`);
});
