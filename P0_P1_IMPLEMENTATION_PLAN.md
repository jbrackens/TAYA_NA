# P0/P1 Implementation Plan — Production Blockers

**Executor:** Claude Code
**Estimated effort:** 3-5 days
**Prerequisite:** All Go tests must pass after each fix (except the 2 contract tests being fixed in P1-1)

---

## P0-1: Redis-Backed Rate Limiting (Auth Service)

**Problem:** Rate limiter and lockout tracker use in-memory maps. Won't work when auth service scales to multiple instances — each instance has its own counter, so an attacker can distribute login attempts across instances to bypass limits.

**Files to modify:**
- `services/auth/go.mod` — add `github.com/redis/go-redis/v9`
- `services/auth/internal/http/handlers.go` — lines 192-194, 1272-1341

**Current code (lines 1272-1275):**
```go
type rateLimiter struct {
    mu      sync.Mutex
    windows map[string][]time.Time
}
```

**Implementation steps:**

1. Add `github.com/redis/go-redis/v9` to `services/auth/go.mod` and run `go mod tidy`.

2. Create a new file `services/auth/internal/http/redis_rate_limiter.go` with:
   ```go
   package http

   type redisRateLimiter struct {
       client *redis.Client
       prefix string
   }

   func newRedisRateLimiter(client *redis.Client, prefix string) *redisRateLimiter
   func (r *redisRateLimiter) allow(key string, limit int, window time.Duration) bool
   ```
   Use Redis `INCR` + `EXPIRE` pattern (simpler than sorted sets, sufficient for rate limiting):
   - Key: `{prefix}:{key}` with TTL = window duration
   - `INCR` the key, then `EXPIRE` if the count is 1 (first hit in window)
   - If count > limit, return false

3. Create `services/auth/internal/http/redis_lockout.go` with:
   ```go
   type redisLockoutTracker struct {
       client *redis.Client
   }

   func newRedisLockoutTracker(client *redis.Client) *redisLockoutTracker
   func (r *redisLockoutTracker) recordFailure(username string) bool  // returns true if now locked
   func (r *redisLockoutTracker) isLocked(username string) bool
   func (r *redisLockoutTracker) clearFailures(username string)
   ```
   Use Redis keys: `lockout:failures:{username}` (list of timestamps), `lockout:locked:{username}` (key with TTL = lockout duration).

4. In `handlers.go`, modify `NewAuthService()` (around line 160):
   - Read `AUTH_REDIS_URL` env var
   - If set: create Redis client, use `newRedisRateLimiter` and `newRedisLockoutTracker`
   - If not set: fall back to existing in-memory implementations (for dev/test)
   - Log which mode is active: `slog.Info("auth: rate limiting mode", "backend", "redis")`

5. Define a common interface that both in-memory and Redis implementations satisfy:
   ```go
   type RateLimiterBackend interface {
       Allow(key string, limit int, window time.Duration) bool
   }
   type LockoutBackend interface {
       RecordFailure(username string) bool
       IsLocked(username string) bool
       ClearFailures(username string)
   }
   ```
   Update `authService` struct fields from concrete types to interfaces.

6. Write tests in `services/auth/internal/http/redis_rate_limiter_test.go`:
   - Test `allow()` permits up to limit, blocks after
   - Test window expiry resets count
   - Use `miniredis` (github.com/alicebob/miniredis/v2) for in-process Redis testing

**Verification:**
```bash
cd services/auth && go test ./...
```
All existing auth tests must still pass. New tests must cover Redis path.

---

## P0-2: Auth Session Store Production Guard

**Problem:** Auth session store defaults to file-backed (or pure in-memory if path is empty). In production, sessions would be lost on restart or not shared across instances. The gateway's wallet and bets services have `log.Fatalf` guards for this — auth does not.

**Files to modify:**
- `services/auth/internal/http/handlers.go` — around lines 161, 188
- `services/auth/internal/http/session_store.go` — add DB-backed or Redis-backed variant

**Implementation steps:**

1. In `handlers.go` `NewAuthService()`, after line 161, add a production guard:
   ```go
   env := strings.ToLower(os.Getenv("ENVIRONMENT"))
   isProduction := env == "production" || env == "staging"

   storeMode := os.Getenv("AUTH_SESSION_STORE_MODE")
   if isProduction && storeMode != "redis" && storeMode != "db" {
       log.Fatalf("FATAL: AUTH_SESSION_STORE_MODE must be 'redis' or 'db' in production (got %q)", storeMode)
   }
   ```

2. Add a Redis-backed session store in `session_store.go` (or a new file `redis_session_store.go`):
   ```go
   type RedisSessionStore struct {
       client *redis.Client
   }
   func NewRedisSessionStore(client *redis.Client) *RedisSessionStore
   ```
   Implement the existing `SessionStore` methods using Redis hashes:
   - `Create(session)` → `HSET session:{token_digest} ...` + `EXPIRE`
   - `Get(tokenDigest)` → `HGETALL session:{token_digest}`
   - `Delete(tokenDigest)` → `DEL session:{token_digest}`
   - `ListByUser(userID)` → Use a secondary index: `SADD user_sessions:{userID} {tokenDigest}`
   - `Prune()` → Redis TTL handles expiry automatically

3. In `NewAuthService()`, route to the correct store:
   ```go
   var store SessionStore
   switch storeMode {
   case "redis":
       store = NewRedisSessionStore(redisClient) // reuse client from P0-1
   default:
       store = NewFileBackedSessionStore(sessionStorePath)
   }
   ```

4. Write tests for `RedisSessionStore` using `miniredis`.

**Verification:**
```bash
cd services/auth && go test ./...
# Also manually test: ENVIRONMENT=production AUTH_SESSION_STORE_MODE="" ./auth → should fatalf
```

---

## P0-3: Request Body Size Limits

**Problem:** All 42 `json.NewDecoder(r.Body).Decode(...)` calls in the gateway (and 3+ in auth) read unbounded request bodies. A malicious client could send a multi-GB payload to exhaust server memory.

**Files to modify:**
- `modules/platform/transport/httpx/middleware.go` — add `MaxBodySize` middleware
- `services/gateway/cmd/gateway/main.go` — wire it into the middleware chain
- `services/auth/internal/http/handlers.go` — add per-handler limits

**Implementation steps:**

1. Add a new middleware in `modules/platform/transport/httpx/middleware.go`:
   ```go
   // MaxBodySize limits request body to maxBytes. Returns 413 if exceeded.
   func MaxBodySize(maxBytes int64) func(http.Handler) http.Handler {
       return func(next http.Handler) http.Handler {
           return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
               if r.Body != nil {
                   r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
               }
               next.ServeHTTP(w, r)
           })
       }
   }
   ```
   `http.MaxBytesReader` is the standard Go approach — it returns a `413 Request Entity Too Large` automatically when exceeded.

2. Wire it into the gateway middleware chain in `cmd/gateway/main.go`:
   ```go
   handler := httpx.Chain(mux,
       httpx.MaxBodySize(1 << 20), // 1MB default
       httpx.Recovery(nil),
       httpx.RequestID(),
       // ... rest of chain
   )
   ```
   Place it first in the chain so it applies before any parsing.

3. For the auth service, add a smaller limit in `handlers.go` at the start of each POST handler:
   ```go
   r.Body = http.MaxBytesReader(w, r.Body, 64*1024) // 64KB for auth payloads
   ```
   Add this to: `handleLogin` (line ~301), `handleRegister` (line ~350), `handleRefresh` (line ~378), and all other POST handlers.

4. Write a test in `modules/platform/transport/httpx/middleware_test.go`:
   ```go
   func TestMaxBodySizeRejectsOversizedPayload(t *testing.T) {
       handler := MaxBodySize(100)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
           _, err := io.ReadAll(r.Body)
           if err != nil {
               http.Error(w, "too large", http.StatusRequestEntityTooLarge)
               return
           }
           w.WriteHeader(200)
       }))
       // Send 200-byte body, expect 413
   }
   ```

**Verification:**
```bash
cd modules/platform && go test ./...
cd services/gateway && go test ./...
cd services/auth && go test ./...
# Manual: curl -X POST -d "$(python3 -c 'print("x"*2000000)')" http://localhost:18080/api/v1/bets → expect 413
```

---

## P1-1: Fix 2 Failing Contract Tests

**Problem:** `TestAdminContractFixtures/public_fixtures` and `TestAdminContractFixtures/public_markets` fail due to golden file JSON mismatch after recent data changes.

**Files to modify:**
- `services/gateway/internal/http/testdata/contracts/public_fixtures.json`
- `services/gateway/internal/http/testdata/contracts/public_markets.json`

**Implementation steps:**

1. Run the failing tests with verbose output to capture the actual response:
   ```bash
   cd services/gateway
   go test ./internal/http/... -run "TestAdminContractFixtures/public_fixtures" -v 2>&1 | tee /tmp/contract_diff.txt
   ```

2. Extract the "got" JSON from the test output. The test likely logs both expected and actual.

3. Update the golden files with the actual response:
   ```bash
   # Option A: If the test has an -update flag
   go test ./internal/http/... -run "TestAdminContractFixtures" -update

   # Option B: Manually copy the actual JSON to the golden files
   ```

4. Review the diff between old and new golden files to confirm the changes are intentional (e.g., new fields added, format changes) and not regressions.

5. Consider making the comparison less brittle: instead of `reflect.DeepEqual`, use a structural comparison that ignores field ordering and timestamps. This is optional but prevents future breakage.

**Verification:**
```bash
cd services/gateway && go test ./internal/http/... -run "TestAdminContractFixtures" -v
# All 5 subtests should PASS
```

---

## P1-2: Persist OAuth Users to Database

**Problem:** Google and Apple OAuth callbacks create users only in the in-memory `usersByUsername` map, not in the database. Users created via OAuth are lost on restart when DB mode is enabled.

**Files to modify:**
- `services/auth/internal/http/handlers.go` — lines 644-654 (Google), 740-750 (Apple)

**Implementation steps:**

1. In the Google OAuth callback (around line 644), after creating the user in memory, add DB persistence:
   ```go
   if !exists {
       auth.mu.Lock()
       newID := fmt.Sprintf("u-google-%s", hex.EncodeToString([]byte(email))[:12])
       newUser := user{
           ID:       newID,
           Username: email,
           Password: "",
           Role:     rolePlayer,
       }
       auth.usersByUsername[email] = newUser
       auth.mu.Unlock()

       // Persist to DB if available
       if auth.db != nil {
           ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
           defer cancel()
           _, err := auth.db.ExecContext(ctx,
               `INSERT INTO auth_users (id, username, password_hash, role, oauth_provider, oauth_subject, created_at)
                VALUES ($1, $2, '', $3, 'google', $4, NOW())
                ON CONFLICT (username) DO NOTHING`,
               newID, email, rolePlayer, googleUserID,
           )
           if err != nil {
               slog.Error("failed to persist OAuth user to DB", "provider", "google", "email", email, "error", err)
           }
       }

       account = newUser
   }
   ```

2. Apply the identical pattern to the Apple OAuth callback (around line 740), changing `'google'` to `'apple'`.

3. Also set `Role: rolePlayer` on the user struct in both callbacks (currently missing — the role defaults to empty string).

4. Write a test that verifies OAuth user creation persists to DB when `auth.db` is non-nil. Use a test-scoped SQLite or mock DB.

**Verification:**
```bash
cd services/auth && go test ./...
# Manual: log in via Google OAuth, restart auth service, verify user still exists
```

---

## P1-3: Add Payments Package Tests

**Problem:** The `internal/payments/` package has zero test files. It contains a mock service (273 lines), a DB service (352 lines), and HTTP handlers (195 lines) — all untested.

**Files to create:**
- `services/gateway/internal/payments/service_test.go`
- `services/gateway/internal/payments/handlers_test.go`

**Implementation steps:**

1. Create `service_test.go` testing `MockPaymentService`:
   ```go
   func TestMockDepositCreditsWallet(t *testing.T)
   func TestMockWithdrawalChecksBalance(t *testing.T)
   func TestMockWithdrawalInsufficientFunds(t *testing.T)
   func TestMockWebhookIdempotent(t *testing.T)
   func TestMockDepositStatusTransitions(t *testing.T)
   func TestMockWithdrawalStatusTransitions(t *testing.T)
   ```

2. Create `handlers_test.go` testing HTTP handlers:
   ```go
   func TestDepositRouteValidatesAmount(t *testing.T)
   func TestDepositRouteRequiresAuth(t *testing.T)
   func TestWithdrawRouteChecksBalance(t *testing.T)
   func TestWebhookRouteProcessesCallback(t *testing.T)
   func TestPaymentMethodsRouteReturnsOptions(t *testing.T)
   ```

3. Follow the same test patterns used in `bets/service_test.go` — create a test service instance, exercise the public API, assert state changes.

4. For the DB service, test with a real PostgreSQL (use build tag `//go:build integration`) or mock the `*sql.DB` with `sqlmock`.

**Verification:**
```bash
cd services/gateway && go test ./internal/payments/... -v
# All new tests should PASS
```

---

## P1-4: Add Tracing Package Tests

**Problem:** The `internal/tracing/` package (133 lines) has no tests.

**File to create:**
- `services/gateway/internal/tracing/tracing_test.go`

**Implementation steps:**

1. Create `tracing_test.go`:
   ```go
   func TestInitReturnsNoopWithoutConfig(t *testing.T)
   // Call Init() with no OTEL env vars → returns non-nil shutdown func, no error

   func TestInitReturnsStdoutExporter(t *testing.T)
   // Set OTEL_TRACES_EXPORTER=stdout → Init() succeeds

   func TestMiddlewareCreatesSpan(t *testing.T)
   // Wrap a test handler with Middleware(), make a request, verify span context is propagated

   func TestTraceIDFromContextReturnsEmpty(t *testing.T)
   // Call with background context → returns empty string

   func TestStartSpanCreatesChildSpan(t *testing.T)
   // Create parent span, call StartSpan → verify child span exists
   ```

2. Use `go.opentelemetry.io/otel/sdk/trace/tracetest` for in-memory span recording.

**Verification:**
```bash
cd services/gateway && go test ./internal/tracing/... -v
```

---

## P1-5: Harden In-Memory Wallet Negative Balance Guard

**Problem:** The in-memory wallet path checks `balance < request.AmountCents` before debiting, which is correct under a mutex. But the balance can go negative in crash-recovery scenarios (debit persisted, balance update lost). The DB path is safe via `SELECT ... FOR UPDATE`.

**File to modify:**
- `services/gateway/internal/wallet/service.go` — around line 898

**Implementation steps:**

1. Add a post-mutation assertion in `applyMutationMemory()` after the debit (around line 898):
   ```go
   s.balances[request.UserID] = balance
   if balance < 0 {
       slog.Error("wallet: negative balance detected in memory mode",
           "userId", request.UserID,
           "balance", balance,
           "mutation", kind,
           "amount", request.AmountCents,
       )
       // Restore previous balance to prevent negative state from persisting
       s.balances[request.UserID] = balance + request.AmountCents
       return LedgerEntry{}, ErrInsufficientFunds
   }
   ```

2. In the `loadFromSnapshot()` or startup path, add a balance integrity check:
   ```go
   for userID, balance := range s.balances {
       if balance < 0 {
           slog.Warn("wallet: correcting negative balance from snapshot",
               "userId", userID, "balance", balance)
           s.balances[userID] = 0
       }
   }
   ```

3. Write a test:
   ```go
   func TestMemoryWalletRejectsNegativeBalance(t *testing.T)
   // Attempt to debit more than available (bypassing the check somehow) → assert balance never goes negative
   ```

**Verification:**
```bash
cd services/gateway && go test ./internal/wallet/... -v
```

---

## Execution Order

```
Day 1:  P0-3 (body limits — smallest change, immediate security value)
        P0-2 (session store guard — fast, prevents silent data loss)
Day 2:  P0-1 (Redis rate limiting — largest P0, requires new dependency)
Day 3:  P1-1 (contract tests — quick golden file update)
        P1-2 (OAuth persistence — bounded change, 2 handlers)
        P1-5 (wallet guard — small hardening)
Day 4:  P1-3 (payments tests — new test file, follows existing patterns)
        P1-4 (tracing tests — small test file)
Day 5:  Integration testing, verify all `go test ./...` passes across all 3 modules
```

## Success Criteria

All items are complete when:
1. `cd services/gateway && go test ./...` — ALL PASS (including the 2 previously-failing contract tests)
2. `cd services/auth && go test ./...` — ALL PASS
3. `cd modules/platform && go test ./...` — ALL PASS
4. `ENVIRONMENT=production AUTH_SESSION_STORE_MODE="" ./auth` — fatally exits with clear error message
5. `curl -X POST -d "$(head -c 2000000 /dev/urandom | base64)" http://localhost:18080/api/v1/bets` — returns 413
6. No new TODO/FIXME markers introduced
7. Zero `any` types in new Go code (use concrete types or interfaces)
