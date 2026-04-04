# Go Error/Middleware + Auth Progress (B012/B013)

Date: 2026-03-02

## B012 Delivered

Shared transport primitives implemented in:
- `go-platform/modules/platform/transport/httpx`

### Error Model
- Standard API error envelope:
  - `error.code`
  - `error.message`
  - `error.requestId`
  - `error.details`
- Typed application errors with status + code mapping:
  - bad request
  - unauthorized
  - forbidden
  - not found
  - method not allowed
  - internal error

### Middleware
- `RequestID()`:
  - Uses incoming `X-Request-Id` when provided.
  - Generates one when missing.
- `Recovery()`:
  - Catches panics and returns structured internal error JSON.
- `AccessLog()`:
  - Logs request_id, method, path, status, duration, bytes.
- `Chain()` helper for middleware composition.

### Validation
- `go-platform/modules/platform/transport/httpx` tests pass.

## B013 Delivered (Auth/Session APIs)

Implemented in:
- `go-platform/services/auth/internal/http/handlers.go`
- `go-platform/services/auth/internal/http/session_store.go`
- `go-platform/services/auth/internal/http/session_store_test.go`

### Endpoints
- `GET /healthz`
- `GET /readyz`
- `GET /api/v1/status`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/session`
- `GET /api/v1/auth/metrics`

### Current Behavior
- Demo user comes from env:
  - `AUTH_DEMO_USERNAME` (default `demo@phoenix.local`)
  - `AUTH_DEMO_PASSWORD` (default `change-me-local`)
- Session store now supports file-backed persistence via:
  - `AUTH_SESSION_STORE_FILE=<path>`
- Token strategy now stores only token digests (SHA-256) in the session store.
- Token flow behavior:
  - login returns access + refresh tokens
  - refresh rotates tokens and revokes old refresh token
  - session validates bearer access token
  - expired access tokens are pruned while valid refresh token remains refreshable
- Auth audit + metrics hooks:
  - audit events emitted for login/refresh/session success/failure
  - counters exposed through `GET /api/v1/auth/metrics`

### Remaining Follow-Ups (Post-B013)
- Add persistent user/account source (DB-backed users).
- Add password policy and account lockout controls.
- Evaluate JWT signing/introspection strategy for multi-service token validation.

## Gateway Wiring
- `go-platform/services/gateway` now also uses shared middleware and exposes:
  - `GET /healthz`
  - `GET /readyz`
  - `GET /api/v1/status`

## Verification Command
```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined
make go-test
```
