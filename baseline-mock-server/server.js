'use strict';

/**
 * Baseline mock server for the Task Manager API (mock-server-test.yaml).
 * Hand-written from scratch, without using the `create-mock-server` skill,
 * for A/B comparison purposes.
 *
 * NOTE on auth: the contract declares `bearerAuth` (bearer JWT) as a global
 * security scheme, but provides no login/token-issuing endpoint. There is no
 * way to obtain or validate a real token, so this mock does NOT enforce
 * authentication by default - every route is served normally regardless of
 * the Authorization header. 401 responses remain reachable explicitly via
 * the `_status=401` / `X-Mock-Status: 401` override described below.
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Malformed JSON bodies must return 400, not crash the process.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json(buildError(400, 'Malformed JSON in request body'));
  }
  next(err);
});

// --- Request logging -------------------------------------------------------
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// --- Mock control parameters: _delay / X-Mock-Delay ------------------------
app.use((req, res, next) => {
  const delay = parseInt(req.query._delay || req.headers['x-mock-delay'] || 0, 10);
  if (delay > 0) {
    setTimeout(next, delay);
  } else {
    next();
  }
});

// --- Mock control parameters: _status / X-Mock-Status -----------------------
app.use((req, res, next) => {
  const statusOverride = parseInt(req.query._status || req.headers['x-mock-status'] || 0, 10);
  if (statusOverride >= 400 && statusOverride < 600) {
    return res.status(statusOverride).json(buildError(statusOverride));
  }
  next();
});

// --- Helpers -----------------------------------------------------------------
function buildError(status, message) {
  return {
    error: true,
    status,
    message: message || `Simulated Mock Error for status code ${status}`,
    timestamp: new Date().toISOString(),
  };
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomIsoDate(daysBack = 120) {
  const d = new Date(Date.now() - Math.floor(Math.random() * daysBack) * 86400000);
  return d.toISOString();
}

const FIRST_NAMES = ['Jane', 'John', 'Alex', 'Maria', 'Chen', 'Fatima', 'Liam', 'Olga'];
const LAST_NAMES = ['Doe', 'Smith', 'Petrov', 'Garcia', 'Wang', 'Khan', 'Novak'];
const ROLES = ['admin', 'member', 'viewer'];
const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const TASK_TITLES = [
  'Prepare Q3 roadmap presentation',
  'Fix login page validation bug',
  'Write onboarding documentation',
  'Review pull request #482',
  'Set up staging environment',
  'Investigate memory leak in worker',
];

function makeUser() {
  const first = randomItem(FIRST_NAMES);
  const last = randomItem(LAST_NAMES);
  const username = `${first}.${last}`.toLowerCase();
  const createdAt = randomIsoDate();
  return {
    id: crypto.randomUUID(),
    email: `${username}@example.com`,
    username,
    fullName: `${first} ${last}`,
    role: randomItem(ROLES),
    isActive: Math.random() > 0.15,
    createdAt,
    updatedAt: createdAt,
  };
}

function makeTask(users) {
  const createdAt = randomIsoDate();
  return {
    id: crypto.randomUUID(),
    title: randomItem(TASK_TITLES),
    description: 'Auto-generated mock task description.',
    status: randomItem(TASK_STATUSES),
    priority: randomItem(PRIORITIES),
    assigneeId: Math.random() > 0.2 ? randomItem(users).id : null,
    dueDate: new Date(Date.now() + Math.floor(Math.random() * 30) * 86400000).toISOString().slice(0, 10),
    tags: ['roadmap', 'q3', 'bug', 'docs'].filter(() => Math.random() > 0.6),
    createdAt,
    updatedAt: createdAt,
  };
}

function seedCollection(factory, count) {
  const n = count || 3 + Math.floor(Math.random() * 8); // 3-10 items
  return Array.from({ length: n }, () => factory());
}

// In-memory data store, reseeded on process start.
let users = seedCollection(makeUser);
let tasks = seedCollection(() => makeTask(users));

function paginate(collection, req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const start = (page - 1) * limit;
  const data = collection.slice(start, start + limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total: collection.length,
      totalPages: Math.max(1, Math.ceil(collection.length / limit)),
    },
  };
}

// --- Health check ------------------------------------------------------------
app.get('/_health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// --- Users ---------------------------------------------------------------
app.get('/users', (req, res) => {
  res.status(200).json(paginate(users, req));
});

app.post('/users', (req, res) => {
  const { email, username, password } = req.body || {};
  const details = [];
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) details.push({ field: 'email', message: 'must be a valid email address' });
  if (!username) details.push({ field: 'username', message: 'is required' });
  if (!password || password.length < 8) details.push({ field: 'password', message: 'must be at least 8 characters' });
  if (details.length) {
    return res.status(400).json({ ...buildError(400, 'Validation failed for one or more fields'), details });
  }
  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    email,
    username,
    fullName: req.body.fullName || '',
    role: req.body.role || 'member',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  res.status(201).json(user);
});

app.get('/users/:userId', (req, res) => {
  const user = users.find((u) => u.id === req.params.userId);
  if (!user) return res.status(404).json(buildError(404));
  res.status(200).json(user);
});

app.put('/users/:userId', (req, res) => {
  const user = users.find((u) => u.id === req.params.userId);
  if (!user) return res.status(404).json(buildError(404));
  Object.assign(user, req.body, { updatedAt: new Date().toISOString() });
  res.status(200).json(user);
});

app.delete('/users/:userId', (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.userId);
  if (idx === -1) return res.status(404).json(buildError(404));
  users.splice(idx, 1);
  res.status(204).send();
});

// --- Tasks ---------------------------------------------------------------
app.get('/tasks', (req, res) => {
  let filtered = tasks;
  if (req.query.status) filtered = filtered.filter((t) => t.status === req.query.status);
  if (req.query.assigneeId) filtered = filtered.filter((t) => t.assigneeId === req.query.assigneeId);
  res.status(200).json(paginate(filtered, req));
});

app.post('/tasks', (req, res) => {
  const { title } = req.body || {};
  if (!title) {
    return res.status(400).json({
      ...buildError(400, 'Validation failed for one or more fields'),
      details: [{ field: 'title', message: 'is required' }],
    });
  }
  const now = new Date().toISOString();
  const task = {
    id: crypto.randomUUID(),
    title,
    description: req.body.description || '',
    status: 'todo',
    priority: req.body.priority || 'medium',
    assigneeId: req.body.assigneeId || null,
    dueDate: req.body.dueDate || null,
    tags: req.body.tags || [],
    createdAt: now,
    updatedAt: now,
  };
  tasks.push(task);
  res.status(201).json(task);
});

app.get('/tasks/:taskId', (req, res) => {
  const task = tasks.find((t) => t.id === req.params.taskId);
  if (!task) return res.status(404).json(buildError(404));
  res.status(200).json(task);
});

app.patch('/tasks/:taskId', (req, res) => {
  const task = tasks.find((t) => t.id === req.params.taskId);
  if (!task) return res.status(404).json(buildError(404));
  Object.assign(task, req.body, { updatedAt: new Date().toISOString() });
  res.status(200).json(task);
});

app.delete('/tasks/:taskId', (req, res) => {
  const idx = tasks.findIndex((t) => t.id === req.params.taskId);
  if (idx === -1) return res.status(404).json(buildError(404));
  tasks.splice(idx, 1);
  res.status(204).send();
});

// --- 404 fallback for unknown routes ---------------------------------------
app.use((req, res) => {
  res.status(404).json(buildError(404, `No route matches ${req.method} ${req.originalUrl}`));
});

app.listen(PORT, () => {
  console.log(`Baseline mock server listening on port ${PORT}`);
  console.log(`Seeded ${users.length} users, ${tasks.length} tasks`);
});
