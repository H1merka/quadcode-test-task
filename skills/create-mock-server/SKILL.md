---
name: create-mock-server
alias: create-mock-server
description: Generates a fully functional, containerized Node.js/Express mock server with advanced features (custom delays, dynamic mock data, error simulation) based on OpenAPI specifications, Swagger, or raw JSON contracts.
type: tools: developer
subtype: backend
tags: mock, api, express, docker
license: LICENSE.txt
user-invocable: true
disable-model-invocation: true
context: fork
---

# API Mock Server Generation Instructions (create-mock-server)

You are a specialized API & Prototyping Architect. Your task is to analyze the provided API contract and generate a fully functional, ready-to-run mock server in an isolated `./mock-sandbox/` directory.

## Input Data
The input can be provided as:
1. An OpenAPI/Swagger specification file (YAML/JSON).
2. An API endpoint description in Markdown tables.
3. Raw JSON response payload examples.

## Execution Steps

### Step 1: Contract Analysis & Architecture Planning
- Parse all endpoints, methods (GET, POST, PUT, DELETE, PATCH), path parameters, and request bodies.
- Extract response schemas for standard and error status codes (e.g., 200, 201, 400, 401, 404, 500).
- Plan the Express.js routing structure based on the extracted endpoints.

### Step 2: Infrastructure File Generation
1. Create a `./mock-sandbox/` directory in the root of the user's project (if it does not exist).
2. Copy and populate the templates:
  - Generate `./mock-sandbox/package.json` using `assets/package.json.template`, replacing placeholders like `{{project_name}}`.
  - Normalize the package name to lowercase kebab-case. If the project name is missing or unsafe for npm, fall back to `mock-sandbox`.
  - Generate `./mock-sandbox/Dockerfile` using `assets/Dockerfile.template`.
  - Generate `./mock-sandbox/.gitignore` with a `node_modules/` entry (plus common Node artifacts) so installed dependencies are never committed.

### Step 3: Server Executable Generation (`server.js`)
Generate the `./mock-sandbox/server.js` file. The code must strictly adhere to the following technical requirements:
- Use standard `express`, `cors`, and `body-parser` packages.
- Implement a simple console middleware for request logging (logging method, path, and response status).
- **Required (Advanced Behavior Integration):** Implement the control parameter logic defined in `references/mock-rules.md`:
  - **Delays:** If a query parameter `_delay=MILLISECONDS` or an HTTP header `X-Mock-Delay` is present, delay the response accordingly.
  - **Error Simulation:** If a query parameter `_status=CODE` or an HTTP header `X-Mock-Status` is present, return the specified HTTP status code instead of the default success code.
- **Dynamic Data (Fake/Random Logic):** Avoid returning static hardcoded strings for every request. Generate realistic mock data dynamically (e.g., random UUIDs, ISO dates, names, or random array selections using native JS math utilities).
- Expose a `GET /_health` endpoint for server health checks.
- When the source contract is incomplete or ambiguous, prefer a conservative fallback: keep the listed endpoints, derive response shapes from the closest example payload, and do not invent unrelated routes.
- For collection responses, generate between 3 and 10 items unless the contract explicitly requires a different size.
- Preserve contract-defined field names and status codes; only randomize values, not the schema.

### Step 4: Startup Script Placement
1. Copy or write the startup script from `scripts/run-sandbox.sh` to `./mock-sandbox/run-sandbox.sh`.
2. Provide clear instructions to the user on making it executable (e.g., `chmod +x`).
3. On native Windows (no Git Bash/WSL detected), `run-sandbox.sh` cannot be executed directly by PowerShell/cmd. In that case instruct the user to either:
   - run the equivalent commands manually: `cd mock-sandbox` then `npm install` and `npm start` (or `docker build -t mock-api-sandbox .` followed by `docker run -d --name mock-api-container -p 8080:8080 mock-api-sandbox` if Docker Desktop is available), or
   - execute the script via Git Bash / WSL if installed (`bash run-sandbox.sh`).

### Step 5: Output Summary
Provide a clean summary of the created sandbox structure and direct instructions on how to start it locally or using Docker.

## Constraints & Generation Rules
- DO NOT use placeholders like `// TODO: implement other endpoints`. All specified endpoints from the contract must be fully implemented in the code.
- Write modern, clean JavaScript (ES6+).
- Ensure safe error handling for malformed JSON request bodies (returning a proper 400 Bad Request response).
- Prefer Dockerfiles and startup scripts that work with and without a pre-existing lockfile.
- If a generated artifact depends on file content that may be absent in the template inputs, document the assumption in the final summary and use a safe fallback.