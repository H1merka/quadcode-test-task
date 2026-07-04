# Advanced Mock Server Behavior Specification

Every generated mock server must support advanced mechanisms to simulate real-world network and API behavior.

## 1. Network Delay Simulation

The mock server must be capable of simulating latency (e.g., slow 3G/4G connections or server load).

* **Trigger:** Query parameter `_delay` or HTTP header `X-Mock-Delay`.
* **Value:** Delay duration in milliseconds (e.g., `2000` for a 2-second delay).
* **Express Middleware Implementation:**

    ```javascript
    app.use((req, res, next) => {
        const delay = parseInt(req.query._delay || req.headers['x-mock-delay'] || 0);
        if (delay > 0) {
            setTimeout(next, delay);
        } else {
            next();
        }
    });
    ```

## 2. HTTP Error Simulation

The mock server must allow client-side developers to test how their applications handle API validation failures, authorization issues, or server errors.

* **Trigger:** Query parameter `_status` or HTTP header `X-Mock-Status`.
* **Value:** A valid HTTP status code (e.g., `400`, `401`, `403`, `404`, `500`).
* **Behavior:** If a non-success status code is requested, the server must interrupt the standard route handler and return a standardized JSON error object.
* **Express Middleware Implementation:**

    ```javascript
    app.use((req, res, next) => {
        const statusOverride = parseInt(req.query._status || req.headers['x-mock-status'] || 0);
        if (statusOverride >= 400 && statusOverride < 600) {
            return res.status(statusOverride).json({
                error: true,
                status: statusOverride,
                message: `Simulated Mock Error for status code ${statusOverride}`,
                timestamp: new Date().toISOString()
            });
        }
        next();
    });
    ```

## 3. Pseudo-Random Idempotent Data Generation

When a contract endpoint expects an array of items, the mock server must return a list with a length between 3 and 10 items.
Instead of static duplicates, each item should contain realistic simulated attributes (e.g., random UUIDs, real emails, actual timestamps, and mock usernames) generated dynamically using standard JS logic.

## 4. Security Schemes Without Auth Endpoints

If the contract declares a security scheme (e.g. `bearerAuth`) and lists 401 responses on operations, but provides **no login/token-issuing endpoint** in the contract, do NOT enforce authentication by default. There is no way to obtain or validate a real token, so hard-blocking every request would make the mock unusable out of the box.

* **Default behavior:** requests are served normally without checking for an `Authorization` header.
* **401 must still be testable:** it remains reachable explicitly via the existing error-simulation mechanism (`_status=401` or `X-Mock-Status: 401`), so client code can still verify its handling of unauthorized responses.
* **Required documentation:** this assumption must be stated both as a code comment near the top of the generated `server.js` and in the final output summary given to the user, so it's never a silent/implicit behavior.