import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Absolute path so PM2/systemd cwd can't break it
const DB_FILE = path.resolve(__dirname, 'db.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

app.use(cors({
  origin: true,         // reflect the request origin
  credentials: true
}));

app.use(express.json());

// serve frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// health check
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// persistence helpers
const loadTodos = async () => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    try { return JSON.parse(data); }
    catch {
      await fs.writeFile(DB_FILE + '.bad', data);
      await fs.writeFile(DB_FILE, '[]');
      return [];
    }
  } catch (e) {
    if (e.code === 'ENOENT') { await fs.writeFile(DB_FILE, '[]'); return []; }
    console.error('read error:', e);
    return [];
  }
};
const saveTodos = async (todos) =>
  fs.writeFile(DB_FILE, JSON.stringify(todos, null, 2));

// routes
app.get('/todos', async (_req, res) => res.json(await loadTodos()));

app.post('/todos', async (req, res) => {
  const { text, ...rest } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim())
    return res.status(400).json({ error: 'Missing text' });

  const todos = await loadTodos();
  const newTodo = { text: text.trim(), done: false, ...rest };
  todos.push(newTodo);
  await saveTodos(todos);
  res.json({ status: 'added', todo: newTodo });
});

app.patch('/todos/:index', async (req, res) => {
  const index = Number(req.params.index);
  const todos = await loadTodos();
  if (!Number.isInteger(index) || index < 0 || index >= todos.length)
    return res.status(404).json({ error: 'Invalid index' });

  todos[index] = { ...todos[index], ...(req.body || {}) };
  await saveTodos(todos);
  res.json({ status: 'updated', todo: todos[index] });
});

function isAdmin(req, res) {
  const auth = req.headers.authorization;
  if (!ADMIN_PASSWORD || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

app.delete('/todos/:index', async (req, res) => {
  if (!isAdmin(req, res)) return;
  const index = Number(req.params.index);
  const todos = await loadTodos();
  if (!Number.isInteger(index) || index < 0 || index >= todos.length)
    return res.status(404).json({ error: 'Invalid index' });

  const removed = todos.splice(index, 1);
  await saveTodos(todos);
  res.json({ status: 'deleted', removed });
});

app.post('/todos/reorder', async (req, res) => {
  if (!isAdmin(req, res)) return;
  if (!Array.isArray(req.body))
    return res.status(400).json({ error: 'Invalid data' });

  await saveTodos(req.body);
  res.json({ status: 'reordered' });
});

app.listen(PORT, () =>
  console.log(`✅ TODO API running at http://localhost:${PORT}`)
);
