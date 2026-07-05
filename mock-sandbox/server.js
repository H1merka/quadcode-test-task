/**
 * Auto-generated mock server (create-mock-server skill)
 * Source contract: mock-server-test.yaml — Task Manager API (Users + Tasks CRUD)
 *
 * ASSUMPTIONS (documented per skill constraints, never silent):
 * 1. The contract declares `bearerAuth` (HTTP Bearer/JWT) as a security scheme and lists
 *    401 responses on operations, but provides NO login/token-issuing endpoint. There is
 *    therefore no way to obtain or validate a real token, so this server does NOT enforce
 *    authentication by default — every request is served normally regardless of the
 *    `Authorization` header. The 401 path remains fully testable via the explicit
 *    error-simulation override: `?_status=401` or header `X-Mock-Status: 401`.
 * 2. The contract lists two server URLs — `http://localhost:8080` and
 *    `http://localhost:8080/api/v1` — pointing at the same mock instance. Both base paths
 *    are mounted here so either server URL from the contract works out of the box.
 * 3. Collections (`/users`, `/tasks`) are seeded at startup with 3-10 dynamically generated
 *    items (random UUIDs, ISO dates, names) and are then mutated in-memory by
 *    POST/PUT/PATCH/DELETE, so the mock behaves like a real (non-persistent) backend across
 *    a single server run.
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const app = express();

// ---------------------------------------------------------------------------
// Dynamic mock-data helpers (native JS only — no third-party faker deps)
// ---------------------------------------------------------------------------

const FIRST_NAMES = ['Jane', 'John', 'Alex', 'Maria', 'Chen', 'Priya', 'Omar', 'Elena', 'Lucas', 'Sofia'];
const LAST_NAMES = ['Doe', 'Smith', 'Kim', 'Garcia', 'Wang', 'Patel', 'Hassan', 'Ivanova', 'Silva', 'Rossi'];
const ROLES = ['admin', 'member', 'viewer'];
const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const TASK_TITLES = [
  'Prepare Q3 roadmap presentation',
  'Fix login page validation bug',
  'Write onboarding documentation',
  'Review pull request #482',
  'Set up staging environment',
  'Investigate memory leak in worker',
  'Design new dashboard layout',
  'Update dependency versions',
];
const TASK_TAGS = ['roadmap', 'bug', 'frontend', 'backend', 'docs', 'urgent', 'q3', 'onboarding'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomSubset(arr, maxCount) {
  const count = randomInt(0, maxCount);
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomPastIsoDate(maxDaysAgo = 120) {
  const daysAgo = randomInt(0, maxDaysAgo);
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function randomFutureIsoDate(maxDaysAhead = 60) {
  const daysAhead = randomInt(1, maxDaysAhead);
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10); // date-only, per Task.dueDate format
}

function nowIso() {
  return new Date().toISOString();
}

function generateUser() {
  const first = randomItem(FIRST_NAMES);
  const last = randomItem(LAST_NAMES);
  const username = `${first}.${last}`.toLowerCase();
  const createdAt = randomPastIsoDate();
  return {
    id: crypto.randomUUID(),
    email: `${username}@example.com`,
    username,
    fullName: `${first} ${last}`,
    role: randomItem(ROLES),
    isActive: Math.random() > 0.1,
    createdAt,
    updatedAt: createdAt,
  };
}

function generateTask(userIds) {
  const createdAt = randomPastIsoDate();
  return {
    id: crypto.randomUUID(),
    title: randomItem(TASK_TITLES),
    description: 'Auto-generated mock task description.',
    status: randomItem(TASK_STATUSES),
    priority: randomItem(TASK_PRIORITIES),
    assigneeId: userIds.length && Math.random() > 0.15 ? randomItem(userIds) : null,
    dueDate: Math.random() > 0.2 ? randomFutureIsoDate() : null,
    tags: randomSubset(TASK_TAGS, 3),
    createdAt,
    updatedAt: createdAt,
  };
}

// ---------------------------------------------------------------------------
// In-memory data store (seeded 3-10 items per collection, per skill constraint)
// ---------------------------------------------------------------------------

let users = Array.from({ length: randomInt(3, 10) }, generateUser);
let tasks = Array.from({ length: randomInt(3, 10) }, () => generateTask(users.map((u) => u.id)));

// ---------------------------------------------------------------------------
// Standard error payload + pagination helpers
// ---------------------------------------------------------------------------

function errorPayload(status, message, details) {
  const payload = {
    error: true,
    status,
    message,
    timestamp: nowIso(),
  };
  if (details) payload.details = details;
  return payload;
}

function paginate(items, page, limit) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return {
    data,
    pagination: { page, limit, total, totalPages },
  };
}

function parsePageLimit(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  return { page, limit };
}

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use(cors());

// express's built-in body parsers — NOT the deprecated standalone `body-parser` package.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Malformed JSON body -> proper 400, not a crash/500.
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json(errorPayload(400, 'Malformed JSON in request body'));
  }
  next(err);
});

// Request logging middleware (method, path, status) — logged on response finish.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// --- Mock control middleware #1: artificial delay (_delay / X-Mock-Delay) ---
app.use((req, res, next) => {
  const delay = parseInt(req.query._delay || req.headers['x-mock-delay'] || 0, 10);
  if (delay > 0) {
    setTimeout(next, delay);
  } else {
    next();
  }
});

// --- Mock control middleware #2: forced error status (_status / X-Mock-Status) ---
app.use((req, res, next) => {
  const statusOverride = parseInt(req.query._status || req.headers['x-mock-status'] || 0, 10);
  if (statusOverride >= 400 && statusOverride < 600) {
    return res.status(statusOverride).json(
      errorPayload(statusOverride, `Simulated Mock Error for status code ${statusOverride}`),
    );
  }
  next();
});

// ---------------------------------------------------------------------------
// Router (mounted at both '/' and '/api/v1' — see Assumption #2 above)
// ---------------------------------------------------------------------------

const router = express.Router();

// --- Health check ---
router.get('/_health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: nowIso() });
});

// --- Users ---

router.get('/users', (req, res) => {
  const { page, limit } = parsePageLimit(req);
  res.status(200).json(paginate(users, page, limit));
});

router.post('/users', (req, res) => {
  const body = req.body || {};
  const details = [];
  if (!body.email) details.push({ field: 'email', message: 'is required' });
  if (!body.username || body.username.length < 3) {
    details.push({ field: 'username', message: 'is required and must be at least 3 characters' });
  }
  if (!body.password || body.password.length < 8) {
    details.push({ field: 'password', message: 'is required and must be at least 8 characters' });
  }
  if (details.length) {
    return res.status(400).json(errorPayload(400, 'Validation failed for one or more fields', details));
  }

  const createdAt = nowIso();
  const user = {
    id: crypto.randomUUID(),
    email: body.email,
    username: body.username,
    fullName: body.fullName || '',
    role: body.role || 'member',
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  };
  users.push(user);
  res.status(201).json(user);
});

router.get('/users/:userId', (req, res) => {
  const user = users.find((u) => u.id === req.params.userId);
  if (!user) return res.status(404).json(errorPayload(404, `Simulated Mock Error for status code 404`));
  res.status(200).json(user);
});

router.put('/users/:userId', (req, res) => {
  const user = users.find((u) => u.id === req.params.userId);
  if (!user) return res.status(404).json(errorPayload(404, `Simulated Mock Error for status code 404`));
  const body = req.body || {};
  if (body.fullName !== undefined) user.fullName = body.fullName;
  if (body.role !== undefined) user.role = body.role;
  if (body.isActive !== undefined) user.isActive = body.isActive;
  user.updatedAt = nowIso();
  res.status(200).json(user);
});

router.delete('/users/:userId', (req, res) => {
  const index = users.findIndex((u) => u.id === req.params.userId);
  if (index === -1) return res.status(404).json(errorPayload(404, `Simulated Mock Error for status code 404`));
  users.splice(index, 1);
  res.status(204).send();
});

// --- Tasks ---

router.get('/tasks', (req, res) => {
  const { page, limit } = parsePageLimit(req);
  let filtered = tasks;
  if (req.query.status) {
    filtered = filtered.filter((t) => t.status === req.query.status);
  }
  if (req.query.assigneeId) {
    filtered = filtered.filter((t) => t.assigneeId === req.query.assigneeId);
  }
  res.status(200).json(paginate(filtered, page, limit));
});

router.post('/tasks', (req, res) => {
  const body = req.body || {};
  if (!body.title) {
    return res.status(400).json(
      errorPayload(400, 'Validation failed for one or more fields', [
        { field: 'title', message: 'is required' },
      ]),
    );
  }

  const createdAt = nowIso();
  const task = {
    id: crypto.randomUUID(),
    title: body.title,
    description: body.description || '',
    status: 'todo',
    priority: body.priority || 'medium',
    assigneeId: body.assigneeId || null,
    dueDate: body.dueDate || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    createdAt,
    updatedAt: createdAt,
  };
  tasks.push(task);
  res.status(201).json(task);
});

router.get('/tasks/:taskId', (req, res) => {
  const task = tasks.find((t) => t.id === req.params.taskId);
  if (!task) return res.status(404).json(errorPayload(404, `Simulated Mock Error for status code 404`));
  res.status(200).json(task);
});

router.patch('/tasks/:taskId', (req, res) => {
  const task = tasks.find((t) => t.id === req.params.taskId);
  if (!task) return res.status(404).json(errorPayload(404, `Simulated Mock Error for status code 404`));
  const body = req.body || {};
  const fields = ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate', 'tags'];
  for (const field of fields) {
    if (body[field] !== undefined) task[field] = body[field];
  }
  task.updatedAt = nowIso();
  res.status(200).json(task);
});

router.delete('/tasks/:taskId', (req, res) => {
  const index = tasks.findIndex((t) => t.id === req.params.taskId);
  if (index === -1) return res.status(404).json(errorPayload(404, `Simulated Mock Error for status code 404`));
  tasks.splice(index, 1);
  res.status(204).send();
});

// Mount at both contract server URLs: http://localhost:8080 and .../api/v1
app.use('/', router);
app.use('/api/v1', router);

// --- 404 fallback for unknown routes ---
app.use((req, res) => {
  res.status(404).json(errorPayload(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// --- Generic error-handling fallback (should rarely trigger) ---
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err);
  res.status(500).json(errorPayload(500, 'Simulated Mock Error for status code 500'));
});

app.listen(PORT, () => {
  console.log(`Mock server (Task Manager API) listening on http://localhost:${PORT}`);
  console.log(`Seeded ${users.length} users and ${tasks.length} tasks.`);
  console.log(`Health check: GET http://localhost:${PORT}/_health`);
});
