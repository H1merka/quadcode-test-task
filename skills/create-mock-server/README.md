# create-mock-server

Generates a fully functional, containerized **Node.js/Express** mock server — with delay simulation, HTTP error simulation, and dynamic mock data — from an OpenAPI/Swagger spec, a Markdown endpoint table, or raw JSON payload examples.

- Type: `tools: developer`
- Subtype: `backend`
- Context: `fork`
- Invocation: `user-invocable: true`, `disable-model-invocation: true` (see [Invocation](#invocation))

## Table of Contents
- [Quick Start](#quick-start)
- [Invocation](#invocation)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Step-by-Step Usage](#step-by-step-usage)
- [Mock Control Parameters](#mock-control-parameters)
- [Testing Checklist](#testing-checklist)
- [Caveats](#caveats)
- [File Map](#file-map)
- [Troubleshooting](#troubleshooting)

## Quick Start

```bash
# 1. Provide an OpenAPI/Swagger YAML|JSON file (or a Markdown endpoint table,
#    or raw JSON response examples) — e.g. mock-server-test.yaml in the project root.

# 2. Invoke the skill (see Invocation below), pointing it at the contract file.

# 3. Skill generates ./mock-sandbox/ with:
#    package.json, Dockerfile, .dockerignore, .gitignore, server.js, run-sandbox.sh

# 4a. Run with Docker (recommended):
cd mock-sandbox
docker build -t mock-api-sandbox .
docker run -d --name mock-api-container -p 8080:8080 mock-api-sandbox

# 4b. Run locally without Docker:
cd mock-sandbox
npm install
npm start

# 4c. Or use the bundled helper (Linux/macOS/Git Bash/WSL only — see Caveats):
cd mock-sandbox
chmod +x run-sandbox.sh
./run-sandbox.sh

curl http://localhost:8080/_health
```

## Invocation

The skill has `disable-model-invocation: true` — the agent will **not** auto-trigger it just because a task mentions "mock" or "API". Invoke it explicitly, using any of:

1. **Slash command / alias** — `create-mock-server`
2. **Explicit natural-language request** — e.g. "Use create-mock-server on this OpenAPI file" or "Generate a mock server from this contract"
3. **Web template alias** — `ToolGetTemplateContent(alias="create-mock-server")` if invoked programmatically by another agent

Simply handing over an OpenAPI file without naming/aliasing the skill will **not** reliably trigger it — be explicit.

## Inputs

One of:
1. **OpenAPI/Swagger specification** (YAML or JSON) — paths, methods, path/query parameters, request/response schemas, status codes. See `mock-server-test.yaml` (project root) for a full canonical example (Task Manager API: Users + Tasks CRUD, `_delay`/`_status` control params documented as OpenAPI parameters).
2. **Markdown endpoint table** — a human-written table of method/path/request/response.
3. **Raw JSON response payload examples** — one or more example responses per endpoint.

## Outputs

All output is written to `./mock-sandbox/` (relative to wherever the skill is invoked from):

| File | Purpose |
|---|---|
| `package.json` | `express` + `cors` dependencies (from `assets/package.json.template`), package name normalized to lowercase kebab-case |
| `Dockerfile` | `node:22-alpine` base, `HEALTHCHECK` against `GET /_health` (from `assets/Dockerfile.template`) |
| `.dockerignore` | Excludes `node_modules`, logs, `.git`, docs from the Docker build context (from `assets/dockerignore.template`) |
| `.gitignore` | Excludes `node_modules/` and common Node artifacts |
| `server.js` | Full Express implementation: all contract endpoints, request logging middleware, `_delay`/`_status` control-parameter middleware, dynamic mock data generation, `GET /_health` |
| `run-sandbox.sh` | Startup helper — auto-detects Docker, falls back to local `npm start` |

## Step-by-Step Usage

1. **Contract analysis** — parses endpoints, methods, path/query parameters, request bodies, and response schemas (success + error codes such as 200/201/400/401/404/500).
2. **Infrastructure generation** — creates `./mock-sandbox/`, writes `package.json` (name normalized/falls back to `mock-sandbox` if unsafe), `Dockerfile`, `.dockerignore`, `.gitignore`.
3. **`server.js` generation**:
   - `express` + `cors` only — body parsing uses Express's built-in `express.json()`/`express.urlencoded()` (no deprecated standalone `body-parser`).
   - Request-logging middleware (method, path, status).
   - `_delay` / `_status` control-parameter middleware (see [Mock Control Parameters](#mock-control-parameters)).
   - Dynamic data generation (UUIDs, ISO dates, names) instead of static hardcoded strings — 3 to 10 items per collection response by default.
   - Contract-defined field names/status codes preserved; only values are randomized.
   - `GET /_health` endpoint.
   - Malformed JSON bodies return a proper `400 Bad Request`, not a crash.
4. **Startup script placement** — copies `run-sandbox.sh`, with explicit `chmod +x` instructions and a native-Windows fallback (see [Caveats](#caveats)).
5. **Output summary** — a clean summary of what was generated and exact commands to run it locally or via Docker, including any assumptions made about ambiguous/incomplete contract data.

## Mock Control Parameters

Every generated server supports two override mechanisms, as query params or headers, on every endpoint:

| Feature | Query param | Header | Example |
|---|---|---|---|
| Artificial delay | `_delay=<ms>` | `X-Mock-Delay: <ms>` | `?_delay=2000` → 2s delay |
| Forced error status | `_status=<code>` | `X-Mock-Status: <code>` | `?_status=500` → standardized error JSON |

Error response shape:
```json
{
  "error": true,
  "status": 500,
  "message": "Simulated Mock Error for status code 500",
  "timestamp": "2025-03-10T10:12:33.512Z"
}
```

**Auth note:** if the contract declares a security scheme (e.g. `bearerAuth`) with 401 responses but provides **no login/token-issuing endpoint**, the generated server does **not** enforce authentication by default (there's no way to obtain/validate a real token). `401` remains testable via `_status=401` / `X-Mock-Status: 401`. This assumption is documented both as a code comment near the top of `server.js` and in the final summary — never silent.

## Testing Checklist

Pre-test (clean directory):
- [ ] `mock-sandbox/` does not exist yet
- [ ] Contract file (e.g. `mock-server-test.yaml`) is present

Generated code verification:
- [ ] Every contract endpoint is implemented — no `// TODO: implement other endpoints` placeholders
- [ ] `GET /_health` returns `200`
- [ ] `?_delay=2000` measurably delays the response (~2s)
- [ ] `?_status=500` (and 400/401/404) returns the forced status + standardized error JSON
- [ ] Malformed JSON request body → `400`, not a 500/crash
- [ ] Collection responses contain 3-10 dynamically generated items; schema/field names match the contract, only values are randomized
- [ ] `package.json` does **not** list `body-parser` as a dependency
- [ ] `server.js` uses `express.json()`/`express.urlencoded()` for body parsing

Infra verification:
- [ ] `Dockerfile` is based on `node:22-alpine` and defines a `HEALTHCHECK`
- [ ] `.dockerignore` exists and excludes `node_modules`
- [ ] `.gitignore` excludes `node_modules/`
- [ ] `docker build -t mock-api-sandbox .` succeeds
- [ ] `docker run -d -p 8080:8080 mock-api-sandbox` — container reports healthy (`docker ps` shows `healthy`)
- [ ] `npm install && npm start` works without Docker too

Windows-specific:
- [ ] On native Windows without Git Bash/WSL, the summary gives the manual fallback commands instead of relying on `run-sandbox.sh`

## Caveats

1. **No `body-parser` dependency.** Deprecated as a standalone package since Express 4.16 bundled it — generated servers use `express.json()`/`express.urlencoded()` instead. If you see `body-parser` in a generated `package.json`, the skill/template is stale.
2. **`run-sandbox.sh` doesn't run natively on Windows** (PowerShell/cmd) without Git Bash or WSL. Fallback: run commands manually —
   ```
   cd mock-sandbox
   npm install && npm start
   # or, with Docker Desktop:
   docker build -t mock-api-sandbox . && docker run -d --name mock-api-container -p 8080:8080 mock-api-sandbox
   ```
   or invoke the script via Git Bash/WSL: `bash run-sandbox.sh`.
3. **No authentication enforcement by default**, even if the contract declares `bearerAuth` — see the Auth note above. This is intentional (no token-issuing endpoint means no way to validate a real token) and always documented in-code + in the summary.
4. **Ambiguous/incomplete contracts get conservative fallbacks** — the skill keeps only the listed endpoints, derives response shapes from the closest example payload, and does not invent unrelated routes. Any such assumption is called out in the final summary.
5. **`.dockerignore` matters** — without it, a locally-installed `node_modules/` would be sent into the Docker build context, slowing builds and risking platform-mismatch native modules leaking into the image.
6. **`mock-server-test.yaml` at the repo root is a test fixture**, not skill output — keep it as the canonical repeatable input for comparison testing (with-skill vs. without-skill, before/after skill edits).

## File Map

```
skills/create-mock-server/
├── SKILL.md                          # agent-facing execution instructions
├── README.md                         # this file
├── LICENSE.txt
├── assets/
│   ├── package.json.template         # {{project_name}} placeholder, express+cors deps
│   ├── Dockerfile.template            # node:22-alpine + HEALTHCHECK
│   └── dockerignore.template          # excludes node_modules/.git/docs from build context
├── references/
│   └── mock-rules.md                 # _delay/_status middleware spec, dynamic data rules, auth-without-login-endpoint rule
└── scripts/
    └── run-sandbox.sh                # Docker-first startup helper, falls back to local npm start
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `run-sandbox.sh` does nothing / "command not found" on Windows | No Git Bash/WSL, PowerShell can't run `.sh` directly | Run the manual `npm install && npm start` / `docker build && docker run` commands instead |
| Every request returns `401` unexpectedly | Not expected behavior — auth is not enforced by default | Check `server.js` top-of-file comment; if enforcement was added, it's a deviation from the documented default |
| Docker build sends huge context / picks up `node_modules` | Missing or stale `.dockerignore` | Regenerate from `assets/dockerignore.template` |
| `docker run` container never shows healthy | `GET /_health` not implemented or Dockerfile missing `HEALTHCHECK` | Verify both exist; check `docker logs mock-api-container` |
| Malformed JSON body crashes the server (500 instead of 400) | Missing JSON parse error handler | Ensure an Express error-handling middleware catches `express.json()` parse errors and returns 400 |
| `npm install` fails on `body-parser` peer conflicts | Stale generated `package.json` still listing `body-parser` | Regenerate from the current `assets/package.json.template` (no `body-parser`) |
