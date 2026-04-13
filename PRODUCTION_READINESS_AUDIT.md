# Phoenix Sportsbook Go Platform - Production Readiness Audit

**Date:** 2026-04-13
**Auditor:** Principal Engineer / Platform Auditor
**Platform Under Audit:** `/Users/john/Sandbox/TAYA_NA`
**Legacy Reference:** `/Users/john/Sandbox/EEG_Legacy_Repo` (Phoenix backend)

---

## 1. Executive Verdict

### Production Ready: NO

**Confidence Level:** HIGH - based on source code analysis of all Go services, frontend apps, legacy comparison, and infrastructure review.

| Deployment Stage | Ready? | Rationale |
|---|---|---|
| Internal QA only | YES with caveats | Functional happy paths work, but no auth means anyone with network access can manipulate data |
| Staging/UAT | NO | Missing auth middleware, mock compliance, mock payments disqualify it |
| Limited real-money beta | **NO** | 11 critical blockers (see below) |
| Controlled production | **NO** | Compliance, auth, money safety all non-functional |
| Full production | **NO** | Estimated 8-12 weeks of remediation required |

### Top Blockers (Critical Severity)

1. **ZERO auth middleware on gateway** - All betting, wallet, admin, and settlement routes are completely unprotected
2. **All compliance services are mocks wired in production** - Geo, KYC, Responsible Gaming
3. **Payment service is a mock** - `NewMockPaymentService()` wired directly
4. **No per-player cumulative stake limits** - Legacy had daily/weekly/monthly; Go only has per-market min/max
5. **No wallet reservation/hold model** - Direct debit with "best effort" refund on failure
6. **Auth service has no real user store** - 2 hardcoded users, plaintext passwords, in-memory
7. **Settlement is not atomic with wallet operations** - Partial failure leaves money/state inconsistent
8. **CI/CD does not run Go tests** - 85+ test files exist but pipeline only runs `go build`

### Top Business-Risk Areas

- **Money movement** - Wallet debit/credit is not transactionally bound to bet state changes in memory mode
- **Unauthorized access** - Any network client can place bets, settle bets, credit wallets, and access admin endpoints
- **Regulatory compliance** - Zero real KYC, geo-gating, or responsible gaming enforcement
- **Data loss** - In-memory/file-backed mode loses all state on process crash between auto-saves

### Top Sportsbook-Specific Concerns

- No cumulative stake limit enforcement (regulatory requirement)
- No deposit limit enforcement (regulatory requirement)
- No self-exclusion enforcement beyond mock (regulatory requirement)
- Settlement not tied to market lifecycle events (manual-only trigger)
- No automated feed-driven grading pipeline
- No exposure/liability tracking enforced at bet acceptance time

---

## 2. Go Platform System Assessment

### Architecture Overview

The Go platform consists of **two services**:

| Service | Port | Role |
|---|---|---|
| Gateway | 18080 | Monolithic API: bets, wallet, markets, admin, feeds, compliance, loyalty, leaderboards, WebSocket |
| Auth | 18081 | Authentication: login, refresh, session, logout, OAuth |

#### Internal Package Structure (Gateway)

```
gateway/internal/
  bets/          - Bet placement, settlement, cashout, alternatives, bet builder, fixed exotics
  wallet/        - Balance, ledger, reconciliation, correction tasks
  compliance/    - INTERFACES + MOCKS ONLY (geo, KYC, responsible gaming)
  domain/        - Fixtures, markets, punters, repository interfaces
  provider/      - Feed runtime, health monitoring, stream status
  freebets/      - Free bet management
  oddsboosts/    - Odds boost management
  loyalty/       - Loyalty program, tiers, points
  leaderboards/  - Leaderboard scoring
  matchtracker/  - Live match data
  riskintel/     - Risk intelligence, player segments
  payments/      - MOCK payment processor
  http/          - All HTTP handlers (no middleware)
  ws/            - WebSocket hub
  cache/         - Redis cache layer with metrics
```

### Issue: Monolithic Gateway

| Issue | Evidence | Risk | Severity |
|---|---|---|---|
| Single process handles all domains | `RegisterRoutes()` in `handlers.go:30` wires everything into one mux | Single point of failure; cannot scale domains independently | Medium |
| No auth middleware chain | Routes registered directly on mux with no middleware wrapper | All endpoints unprotected | **Critical** |
| Mixed mock and real services | `NewMockPaymentService`, `NewMockGeoComplianceService`, etc. wired alongside real bet/wallet services | Creates false confidence; mock behavior masks missing integration | **Critical** |

### Issue: Dual Storage Modes

Both the bet service and wallet service support two storage backends:

1. **In-memory with file persistence** - JSON serialized to disk periodically
2. **PostgreSQL** - Real database with transactions

**Evidence:** `service.go:442-464` (bets), `service.go:103-125` (wallet)

| Risk | Detail | Severity |
|---|---|---|
| File mode loses data | Process crash between auto-saves loses all mutations since last write | **Critical** for production |
| File mode has no transaction boundaries | Bet placement debit + bet record not atomic | **Critical** |
| DB mode uses proper transactions | Wallet DB uses `sql.LevelSerializable` isolation | Good |
| Configuration confusion | `BET_STORE_MODE=db` vs default file mode. Silent fallback on DB failure | **High** |

**Remediation:** Remove file-backed mode for production. Require DB mode. Fail loudly if DB unavailable.

### Issue: Health and Readiness

- `/healthz` returns 200 OK unconditionally (no dependency checks)
- `/readyz` returns `{"status": "ready"}` unconditionally
- No DB connectivity check in readiness
- No feed health check in readiness

**Remediation:** Health/readiness must check: DB connection, auth service reachability, feed health.

### Issue: Service Lifecycle

- `loyaltyService.StartAutoSave(5 * time.Second)` - background goroutine, no graceful shutdown
- `go wsHub.Run(context.Background())` - background goroutine, no shutdown signal
- No graceful drain on SIGTERM
- No connection pool limits on DB

**Remediation:** Implement context cancellation, graceful shutdown with drain timeout.

---

## 3. Legacy Parity and Regression Check

**Legacy reference:** Phoenix backend (Scala/Akka, event-sourced)

### CRITICAL Regressions

| Area | Legacy (Phoenix) | Go Platform | Gap | Severity |
|---|---|---|---|---|
| **Per-player stake limits** | Daily/weekly/monthly with outcome-aware accounting (won bets subtract winnings; voided/cancelled count zero). Complex period boundary logic (min of month-start or week-start). `StakeLimitsLogic.scala` | Only per-market `minStakeCents`/`maxStakeCents`. No cumulative player limits. | **Complete regression** - regulatory requirement missing | **Critical** |
| **Wallet reservations** | Distinct reservation maps for bets and withdrawals. `Reserve for bet` holds stake; settlement releases. Prevents double-spending via ID-based holds. | Direct `Debit()` call. If bet placement fails after debit, `refundPlacementDebitBestEffort()` is a best-effort credit. | **Architectural regression** - no hold/release pattern | **Critical** |
| **Real money vs bonus funds** | Explicit `RealMoney` + `BonusFunds` types. Settlement calculates based on fund type. | Single `int64` balance. No fund type distinction. | **Missing feature** - regulatory/accounting requirement | **Critical** |
| **KYC/Identity verification** | IDComply integration. SSN hashing for duplicate detection. KYC/KBA question flow. Age verification. | `MockKYCService` - auto-approves everything. No real verification. | **Complete regression** | **Critical** |
| **Geo-compliance** | GeoComply integration. Location verification at bet time. | `MockGeoComplianceService` - approves all locations in sandbox mode. | **Complete regression** | **Critical** |
| **Deposit limit enforcement** | Real enforcement with `DepositHistory` tracking and period calculations. | `MockResponsibleGamblingService` - no enforcement. Interface exists but unused. | **Complete regression** | **Critical** |
| **Self-exclusion** | Duration-based (30d/6m/permanent). Published to SFTP for DGE. Cool-off state machine. | Mock only. No real enforcement, no external feed. | **Complete regression** | **Critical** |
| **User store** | Keycloak OIDC/OAuth2 with JWT tokens. Full user lifecycle. | 2 hardcoded users in-memory map. OAuth auto-creates users that vanish on restart. | **Complete regression** | **Critical** |
| **Responsibility checks** | Scheduled `ConsumeResponsibilityCheckTasksJob`. Can block betting until player acknowledges. | Not implemented. | **Missing feature** | High |
| **Market lifecycle state machine** | Explicit states (Bettable, NotBettable, Settled, Resettled, Cancelled) with transition blocking rules. Backoffice-suspended markets cannot be reopened by feed. | Market has `status` string field. `open` check only. No transition rules. No backoffice override protection. | **Significant regression** | High |
| **Audit trail** | Dedicated `audit_log_entries` table. All admin actions logged with reasons and actor IDs. | Bet events logged. No dedicated admin audit trail. Wallet mutations have no actor tracking. | **Partial regression** | High |
| **Event sourcing** | All state changes are events in journal table. Full replay capability. Snapshots for performance. | Mutable state in maps/DB rows. No event journal. No replay. | **Architectural regression** | High |

### Areas Where Go Achieves Parity or Exceeds Legacy

| Area | Assessment |
|---|---|
| Settlement with dead heat factor | Go supports `DeadHeatFactor` in settlement - **parity** |
| Delta-based resettlement | Go computes `adjustmentCents = targetPayout - previousPayout` and applies wallet delta - **parity** |
| Idempotency on bet placement | Go uses `UserID:IdempotencyKey` index with conflict detection - **parity** |
| Idempotency on wallet mutations | Go wallet uses `kind:userId:idempotencyKey` unique index - **parity** |
| Odds change policies | Go has 4 policies (accept_requested, accept_latest, reject_on_change, only_better) - **exceeds legacy** |
| Feed health monitoring | Go has SLO-based feed health with lag/gap/duplicate breach detection - **exceeds legacy** |
| Cashout system | Go has full cashout quote lifecycle (create, accept, expire) - **new feature** |
| Alternative offers | Go has alternative odds offer system - **new feature** |
| Bet builder | Go has bet builder quote system - **new feature** |
| Fixed exotics | Go has fixed exotic quotes - **new feature** |

---

## 4. Feature Readiness Matrix

### Classification Key

| Level | Meaning |
|---|---|
| Production Ready | Complete end-to-end: logic, validation, auth, persistence, observability, tests, edge cases |
| Mostly Ready | Working with minor gaps that don't affect money/safety |
| Functional but Fragile | Works on happy path but missing failure handling, auth, or edge cases |
| Partial Implementation | Core logic exists but missing critical components |
| Shell / Scaffolding | Interface or route exists but no real business logic |
| Non-Operational / Misleading | Appears implemented but creates false confidence |

### Feature Matrix

| Feature | Classification | Evidence | Major Gaps |
|---|---|---|---|
| **Bet Placement (Singles)** | Functional but Fragile | `bets/service.go` - full placement flow with validation, odds policies, idempotency | No auth on endpoint. No cumulative stake limits. No reservation model. `time.Sleep` for LTD blocks goroutine. |
| **Bet Precheck** | Functional but Fragile | `service.go:559-633` - validates market, odds, stake range, balance | No auth. No cumulative limit check. |
| **Bet Settlement** | Functional but Fragile | `service.go:1477-1610` - supports win/loss/dead-heat/resettlement with delta wallet adjustment | Not atomic with wallet in memory mode. No auth on admin endpoint. Settlement only manual (no automated feed-driven grading). |
| **Bet Cancellation** | Functional but Fragile | `service.go:1612-1638` - refunds stake via wallet credit | No auth. Only from `placed` state. |
| **Bet Refund** | Functional but Fragile | `service.go:1640-1666` - refunds from `placed` or `settled_lost` | No auth. |
| **Cashout** | Mostly Ready | `bets/cashout.go` - full quote lifecycle with revision tracking, staleness detection, metrics | No auth. Good business logic. |
| **Alternative Offers** | Mostly Ready | `bets/alternative_offers.go` - offer creation, repricing, acceptance with metrics | No auth. |
| **Bet Builder** | Mostly Ready | `bets/bet_builder.go` - quote creation, acceptance, expiry | No auth. |
| **Fixed Exotics** | Mostly Ready | `bets/fixed_exotics.go` - exotic quote management | No auth. |
| **Bet History** | Mostly Ready | `service.go:650-670` - paginated, filterable by status | No auth - any user can query any user's bets. |
| **Bet Analytics** | Functional but Fragile | `service.go:728-950` - comprehensive analytics with daily/monthly/heatmap/buckets | In-memory only (no DB version). Scans all bets for user. |
| **Wallet - Debit/Credit** | Functional but Fragile | `wallet/service.go` - idempotent mutations, serializable isolation in DB mode | No auth on endpoints. No hold/reservation model. Direct debit is non-reversible on partial failure. |
| **Wallet - Balance** | Mostly Ready | `service.go:184-202` - DB or memory balance lookup | No auth - any user can query any user's balance. |
| **Wallet - Ledger** | Mostly Ready | `service.go:204-227` - transaction history with pagination | No auth scoping. |
| **Wallet - Reconciliation** | Mostly Ready | `service.go:229-272` - credit/debit summaries by time range | Good - DB and memory implementations. No auth. |
| **Wallet - Correction Tasks** | Mostly Ready | `service.go:274-391` - automated scan for negative balances and ledger drift, manual task creation | Good operational tooling. No auth. |
| **Authentication** | Partial Implementation | `auth/handlers.go` - login, refresh, session, logout, CSRF, OAuth | Only 2 hardcoded users. Plaintext passwords. In-memory user store. OAuth users lost on restart. No registration. No MFA. |
| **CSRF Protection** | Partial Implementation | Auth service has CSRF on logout. Gateway has ZERO CSRF. | Only protects auth/logout. All gateway mutations unprotected. |
| **Market/Fixture Data** | Mostly Ready | `domain/` + `http/market_handlers.go` + `http/sports_handlers.go` | Read-only from repository. Multiple repository backends (in-memory, file, SQL). |
| **Feed Ingestion** | Mostly Ready | `provider/` - full runtime with stream health, lag/gap/duplicate monitoring, SLO thresholds | Real feed integration exists. Good health monitoring. |
| **Feed Health Monitoring** | Production Ready | `provider/health.go` - SLO-based health with per-stream and per-sport summaries | Well-tested (`health_test.go`). Configurable thresholds. |
| **Settlement Grading Resolvers** | Mostly Ready | `platform/canonical/v1/settlement.go` - sport-specific resolvers (Football 1X2/BTTS/O-U/Handicap, NFL, NBA, MLB, NHL, Tennis, Combat, Esports) with factory pattern | Good coverage of market types. Dead heat and void handling. No multi-leg parlay grading. |
| **Canonical Event Schema** | Mostly Ready | `platform/canonical/v1/envelope.go` - strict validation, schema versioning, correlation IDs | Good foundation. `canonical/replay/` supports event replay from revision. |
| **WebSocket** | Mostly Ready | `ws/hub.go` - channel subscription, broadcast, heartbeat | No authentication on WS connections. |
| **Geo-Compliance** | Non-Operational / Misleading | `compliance/mock_compliance.go` wired in `handlers.go:114` | **MOCK ONLY**. Auto-approves in sandbox mode. Interface exists but no real implementation. |
| **KYC/Identity** | Non-Operational / Misleading | `compliance/mock_compliance.go` - `MockKYCService` | **MOCK ONLY**. Auto-approves all documents. |
| **Responsible Gaming** | Non-Operational / Misleading | `compliance/mock_compliance.go` - `MockResponsibleGamblingService` | **MOCK ONLY**. Stores limits in memory but doesn't enforce at bet/deposit time. Not wired to bet placement. |
| **Deposit/Stake Limits** | Shell / Scaffolding | Interface defined in `compliance/services.go:48-82`. Mock implementation only. | Interface complete. Zero real enforcement. Not connected to bet or wallet flows. |
| **Self-Exclusion** | Shell / Scaffolding | Interface in `compliance/services.go:72`. Mock sets a flag but doesn't block anything. | No enforcement gate on any endpoint. |
| **Payments (Deposit/Withdraw)** | Non-Operational / Misleading | `payments.NewMockPaymentService(walletService)` at `handlers.go:108` | **MOCK ONLY**. Wraps wallet service directly. No real payment processor. |
| **Free Bets** | Mostly Ready | `freebets/` - full lifecycle with eligibility checks, min odds validation, apply/release | Validated at bet placement time. Good integration. |
| **Odds Boosts** | Mostly Ready | `oddsboosts/` - validation for bet eligibility, application | Validated at bet placement time. |
| **Loyalty Program** | Functional but Fragile | `loyalty/` - tiers, points accrual on settlement, file-backed persistence | Auto-save every 5s. No auth. Loses data between saves on crash. |
| **Leaderboards** | Functional but Fragile | `leaderboards/` - scoring on settlement, file-backed persistence | Same persistence concerns as loyalty. |
| **Risk Intelligence** | Functional but Fragile | `riskintel/` - player segmentation, exposure analysis | No auth on admin risk endpoints. |
| **Match Tracker** | Partial Implementation | `matchtracker/` - live match data | Unclear data source. |
| **Backoffice App** | Functional but Fragile | 16 real pages: dashboard, trading, users, risk, loyalty, leaderboards, audit-logs, reports | X-Admin-Role header set client-side (spoofable). 24% of features STUBBED. No void/rollback. No KYC workflow. |
| **Admin - Trading** | Functional but Fragile | `admin_handlers.go:166` - fixture/market CRUD, market status updates | No admin auth. No audit trail for market changes. |
| **Admin - Punter Management** | Functional but Fragile | `admin_handlers.go:284` - list/view/status update punters | No admin auth. Status update has no reason tracking. |
| **Admin - Bet Lifecycle** | Functional but Fragile | `bet_handlers.go:696` - settle/cancel/refund bets | No admin auth. No confirmation for dangerous ops. |
| **Admin - Wallet Operations** | Functional but Fragile | `admin_handlers.go:1254` - reconciliation, manual credit/debit | No admin auth. Manual credit with no limits is a money-creation vector. |
| **Admin - Wallet Corrections** | Mostly Ready | `admin_wallet_corrections.go` - scan, create, resolve correction tasks | Good operational tooling. No auth. |
| **i18n** | Partial Implementation | 60+ namespace files in `en/` and `de/` | Missing language detection, RTL support, fallback mechanism. |
| **Session Management** | Functional but Fragile | Auth service + frontend `SessionTimer` | Hardcoded timeout (14 min). No server-expiry-driven timeout. |
| **OAuth (Google/Apple)** | Partial Implementation | Auth `handlers.go:347+` - Google OAuth with state verification | Users created in-memory, lost on restart. No persistent user store. |

---

## 5. Shell or Shallow Feature Findings

### 5.1 Compliance Suite (Geo, KYC, Responsible Gaming)

**Why it appears shallow:** Well-defined interfaces in `compliance/services.go` with comprehensive method signatures. Routes registered and responding. Frontend wired to these endpoints.

**Missing components:**
- No real geo-location provider integration (GeoComply or equivalent)
- No real identity verification provider (IDComply or equivalent)
- No real limit enforcement at bet/deposit time
- No DGE exclusion list synchronization
- No SFTP feed for self-exclusion
- Not wired into bet placement flow (`bets/service.go` never calls compliance)

**User/business risk:** Players appear to have working responsible gaming controls but they don't actually restrict anything.

**Sportsbook-specific risk:** **Regulatory non-compliance**. Every licensed jurisdiction requires real KYC, geo-gating, and responsible gaming controls. Operating without them is a license violation.

### 5.2 Payment Processing

**Why it appears shallow:** `payments.RegisterPaymentRoutes()` creates working deposit/withdraw endpoints.

**Missing components:**
- `NewMockPaymentService(walletService)` directly credits/debits wallet with no real payment processor
- No payment gateway integration (Stripe, PayPal, bank transfer, etc.)
- No payment status tracking (pending, completed, failed)
- No fraud detection
- No chargeback handling

**User/business risk:** Deposits and withdrawals appear functional but have no connection to real money movement.

### 5.3 Auth/User Management

**Why it appears shallow:** Login works, sessions work, CSRF works on auth service, OAuth flows complete.

**Missing components:**
- Only 2 hardcoded user accounts
- No user registration endpoint
- No password hashing (plaintext in `user` struct)
- No password reset flow
- No email verification
- OAuth users stored in-memory (lost on restart)
- No user database table
- No role-based access control
- No MFA

**User/business risk:** Auth appears functional but cannot support real users.

---

## 6. Production Blockers

### Critical Severity

| # | Title | Area | Evidence | Failure Mode | Impact |
|---|---|---|---|---|---|
| 1 | **No auth middleware on gateway** | Security | `handlers.go:30-118` - routes registered with no middleware | Anyone with network access can place bets, settle bets, credit wallets, access admin | Total platform compromise |
| 2 | **Compliance services are all mocks** | Compliance | `handlers.go:114-117` - `NewMock*Service()` calls | No KYC, no geo-gating, no RG enforcement | Regulatory violation, license loss |
| 3 | **Payment service is a mock** | Payments | `handlers.go:108` - `NewMockPaymentService` | No real money movement for deposits/withdrawals | Cannot process real transactions |
| 4 | **No cumulative stake limits** | Betting | `bets/service.go` - only per-market min/max, no player-level limits | Players can bet unlimited amounts per day/week/month | Regulatory violation, exposure risk |
| 5 | **No wallet reservation model** | Money | `wallet/service.go` - direct debit, no hold/release | Failed bet after debit relies on best-effort refund | Money loss on partial failure |
| 6 | **Auth has no real user store** | Auth | `auth/handlers.go:106-137` - 2 hardcoded users, plaintext passwords | Cannot register users, OAuth users lost on restart | Cannot operate with real players |
| 7 | **Settlement not atomic with wallet** | Money | `bets/service.go:1235-1262` (settleDB) - wallet credit then bet update as separate operations | Wallet credited but bet status unchanged if DB update fails | Balance inconsistency, double payouts |
| 8 | **CI/CD skips Go tests** | Quality | `test.yml` - only `go build ./...`, not `go test` | 85+ test files never run in pipeline | Regressions shipped undetected |

### High Severity

| # | Title | Area | Evidence | Impact |
|---|---|---|---|---|
| 9 | No admin route authorization | Security | Admin endpoints at `/admin/*` and `/api/v1/admin/*` with no role check | Any user can settle bets, credit wallets, manage markets |
| 10 | No CSRF on gateway mutations | Security | No CSRF middleware on gateway | Cross-site requests can mutate state |
| 11 | File-backed persistence in production path | Data | Wallet and bet services default to file mode | Data loss on crash |
| 12 | No automated feed-driven settlement | Betting | Settlement is manual-only via admin API | Bets remain unsettled unless admin acts |
| 13 | WebSocket token in URL | Security | Frontend sends `?token=` in WS URL | Token exposed in logs, history, referrer |
| 14 | Real money vs bonus fund separation missing | Money | Wallet has single balance type | Accounting/regulatory non-compliance |
| 15 | No market lifecycle state machine | Betting | Market status is a plain string, no transition rules | Invalid state transitions possible, backoffice overrides not protected |

### Medium Severity

| # | Title | Area | Impact |
|---|---|---|---|
| 16 | Unbounded idempotency maps | Memory | In-memory maps for bet/wallet idempotency have no TTL or eviction — memory leak in long-running processes |
| 17 | No graceful shutdown | Operations | Connections dropped, state potentially lost |
| 18 | Health check doesn't verify dependencies | Operations | Unhealthy service appears healthy |
| 19 | LTD uses `time.Sleep` blocking goroutine | Performance | Under load, sleeping goroutines consume threads |
| 20 | Bet analytics in-memory only (no DB path) | Feature | Analytics unavailable in DB mode |
| 21 | Frontend has ~15% test coverage | Quality | UI regressions undetected |
| 22 | 33 of 135 features STUBBED in manifest | Feature | 26% of backoffice features use fake data |
| 23 | No structured logging in Go services | Operations | Uses `log.Printf` not structured logger |
| 24 | WebSocket CheckOrigin always returns true | Security | No CORS enforcement on WebSocket upgrade |
| 25 | WebSocket TODO: token validation unimplemented | Security | `authenticateWebSocket()` accepts any non-empty token (`handler.go:80`) |
| 26 | No per-channel authorization on WebSocket | Security | Any user can subscribe to any user's bet/wallet channels |

---

## 7. Testing and Verification Assessment

### What Is Well-Tested

| Area | Test Files | Quality |
|---|---|---|
| Feed health monitoring | `provider/health_test.go` | Comprehensive - SLO breaches, stream errors, edge cases |
| WebSocket hub | `ws/hub_test.go` | Good - subscription, broadcast, disconnect |
| Redis cache | `cache/redis_test.go`, `cache/cached_repo_test.go`, `cache/metrics_test.go` | Good |
| Bet placement basics | `bets/service_test.go` | Present but scope unclear |
| Cashout logic | `bets/cashout_test.go` | Present |
| Wallet mutations | `wallet/service_test.go` | Present |
| Auth handlers | `auth/handlers_test.go` | Present |
| Session store | `auth/session_store_test.go` | Present |
| Repository backends | `domain/file_repository_test.go`, `sql_repository_test.go`, `inmemory_repository_test.go` | Present |
| Mock compliance | `compliance/mock_compliance_test.go` | Tests the mock, not real compliance |

### What Is Untested or Superficially Tested

| Critical Flow | Test Status | Risk |
|---|---|---|
| **End-to-end bet placement through settlement** | No integration test | High - partial failures untested |
| **Concurrent bet placement (race conditions)** | No concurrency test | High - double-debit possible |
| **Settlement atomicity failures** | No failure-path test | Critical - money inconsistency |
| **Idempotency under concurrent replay** | No test | High |
| **Resettlement edge cases** | No test for won->lost or dead heat changes | Medium |
| **Wallet debit + refund on partial failure** | No test | Critical |
| **Auth session expiry and refresh** | No integration test | Medium |
| **Feed disconnection and recovery** | No test | Medium |
| **Multi-user wallet isolation** | No test verifying user A can't access user B | Critical (no auth) |
| **Admin endpoint authorization** | No test (because auth doesn't exist) | Critical |
| **Frontend bet placement flow** | No test | High |
| **Frontend auth flow end-to-end** | No test | Medium |

### False Confidence

- **85+ Go test files exist but CI doesn't run them** - Creates illusion of test coverage
- **Compliance mock tests** validate the mock, not compliance behavior
- **Feature manifest shows 95 REAL features** but many "real" features have no auth, making them operationally unsafe
- **E2E test files exist** (`e2e/player-app/`, `e2e/backoffice/`) but are not in CI pipeline

---

## 8. Security, Account Control, and Auditability

### Authentication

| Issue | Evidence | Severity |
|---|---|---|
| **Plaintext passwords** | `auth/handlers.go:41-46` - `user` struct stores `Password string` with no hashing | Critical |
| **No user registration** | Only hardcoded demo and admin accounts | Critical |
| **OAuth users ephemeral** | Google OAuth auto-creates users in `usersByUsername` map - lost on restart | High |
| **No MFA** | Not implemented | High |
| **No password complexity** | No validation on password strength | Medium |
| **No account lockout** | No brute-force protection on login | Medium |
| **No rate limiting** | No rate limiter on any endpoint | Medium |

### Authorization

| Issue | Evidence | Severity |
|---|---|---|
| **Gateway has ZERO auth middleware** | `handlers.go:30-118` - all routes registered directly on mux | **Critical** |
| **Admin endpoints unprotected** | `/admin/*` and `/api/v1/admin/*` accessible to anyone | **Critical** |
| **Backoffice X-Admin-Role header is client-side** | All admin API calls set `'X-Admin-Role': 'admin'` in frontend code (users/[id]/page.tsx, audit-logs/page.tsx, risk pages, loyalty pages, dashboard) — trivially spoofable | **Critical** |
| **No user-scoping on queries** | Bet history, wallet balance, ledger - userID taken from query params, not auth token | **Critical** |
| **Manual wallet credit unprotected** | Admin can credit unlimited amounts to any wallet | **Critical** |
| **Bet settlement unprotected** | Anyone can settle any bet as won or lost | **Critical** |

### Account Isolation

**NONE.** There is no mechanism to ensure user A cannot access user B's data. The `userID` is taken from request parameters, not extracted from an authenticated session.

### Audit Trails

| What | Audited? | Detail |
|---|---|---|
| Bet placement | Yes | `BetEvent` with action, actor, timestamp |
| Bet settlement | Yes | `BetEvent` with settlement details |
| Wallet mutations | Partial | Ledger entries have reason and idempotency key, but no actor ID |
| Admin actions | No | No admin audit log |
| Market changes | No | No audit trail for market status updates |
| User management | No | No audit for punter status changes |
| Auth events | Yes | Auth service has `audit.Event()` calls |

### Sensitive Data

| Risk | Evidence | Severity |
|---|---|---|
| Plaintext passwords in memory | Auth `user` struct | Critical |
| Token in WebSocket URL | Frontend `?token=` parameter | High |
| No secret rotation | Static tokens, no rotation mechanism | Medium |
| Demo credentials in env defaults | `demo123`, `admin123` hardcoded as defaults | Medium |

---

## 9. Data, State, and Money Integrity

### Wallet/Balance Correctness

**DB Mode (PostgreSQL):**
- Uses `sql.LevelSerializable` isolation for mutations - **GOOD**
- `SELECT ... FOR UPDATE` on balance row before debit - **GOOD**
- Idempotency via `UNIQUE (entry_type, user_id, idempotency_key)` constraint - **GOOD**
- `CHECK (amount_cents > 0)` prevents zero/negative mutations - **GOOD**

**Memory Mode (File-backed):**
- Mutex-protected map operations - adequate for single-process
- No transaction boundaries across bet + wallet
- File persistence via atomic rename (`write temp, rename`) - **GOOD pattern**
- **5-second auto-save gap** means up to 5 seconds of mutations lost on crash - **BAD**

### Bet State Correctness

| Aspect | Assessment |
|---|---|
| Bet states: placed, settled_won, settled_lost, cashed_out, cancelled, refunded | Complete lifecycle |
| Cancel only from `placed` | Correct |
| Refund from `placed` or `settled_lost` | Correct |
| Settlement from `placed`, `settled_won`, `settled_lost` (resettlement) | Correct |
| Idempotent settlement replay | Checks reference + payout match before skipping | Good |

### Critical Integrity Gap: Non-Atomic Settlement

**Memory mode:**
```
1. applySettlementTransition() -> wallet.Credit()  // money moves
2. s.betsByID[updated.BetID] = updated              // bet state updates
3. s.saveToDiskLocked()                             // persist to file
```
If process crashes between step 1 and step 3: money paid out, bet still shows as `placed`.

**DB mode:**
```
1. getBetByIDDB()                    // read bet
2. applySettlementTransition()        // wallet credit (committed in wallet's own tx)
3. updateBetLifecycleDB()            // update bet status (separate tx)
```
If step 3 fails after step 2: money paid out, bet status unchanged. **Double payout on retry.**

**Remediation:** Settlement must be a single transaction: `BEGIN -> credit wallet -> update bet -> COMMIT`.

### Duplicate Prevention

| Mechanism | Implementation | Status |
|---|---|---|
| Bet placement idempotency | `userId:idempotencyKey` index with conflict detection | Good |
| Wallet mutation idempotency | `kind:userId:idempotencyKey` unique constraint (DB) | Good |
| Settlement idempotency | Reference + payout comparison for same-outcome skip | Good |
| Cashout quote revision tracking | `quoteLatestRevisionByBet` map | Good |

### Reconciliation Support

- `wallet.ReconciliationSummary()` provides time-ranged credit/debit totals - **Good**
- `wallet.ScanCorrectionTasks()` auto-detects negative balances and ledger drift - **Good**
- `wallet.CreateManualCorrectionTask()` allows operator intervention - **Good**

---

## 10. Operability and Observability

### Logging

| Assessment | Detail |
|---|---|
| Format | `log.Printf` (unstructured) throughout Go services |
| Context | Some calls include context (`warning: failed to persist...`) |
| Structured | **NO** - no JSON logging, no log levels, no correlation IDs |
| Frontend | Uses structured `logger` from `app/lib/logger.ts` - **Better** |

### Metrics

| Assessment | Detail |
|---|---|
| Auth metrics | Login/refresh/session success/failure counters - **Good** |
| Cache metrics | Hit/miss/error counters with rate calculation - **Good** |
| Feed metrics | Comprehensive stream health with SLO thresholds - **Good** |
| Bet metrics | Alternative offer and cashout metrics tracked - **Good** |
| Wallet metrics | **NONE** - no debit/credit/failure counters |
| HTTP metrics | **NONE** - no request rate, latency, error rate |
| Prometheus | **NOT CONFIGURED** - metrics are in-memory counters exposed via custom endpoints |

### Tracing

**NONE.** No distributed tracing (OpenTelemetry, Jaeger, etc.). No request correlation IDs.

### Health Checks

| Endpoint | Behavior | Gap |
|---|---|---|
| Gateway `/healthz` | Always returns 200 | Should check DB, Redis, feed |
| Gateway `/readyz` | Always returns ready | Should verify dependencies |
| Auth `/healthz` | Always returns 200 | Should check session store |
| Auth `/readyz` | Always returns ready | No dependency check |

### Production Debuggability

| Capability | Status |
|---|---|
| Bet acceptance/rejection visibility | Partial - precheck returns reason codes |
| Settlement visibility | Bet events logged with details |
| Feed health visibility | Good - `/api/v1/provider/health` endpoint with SLO data |
| Wallet operation visibility | Poor - no structured logging, no metrics |
| Admin action visibility | Poor - no audit log |
| Job/background task visibility | Poor - auto-save goroutines with no monitoring |

---

## 11. Readiness Scorecard

| Dimension | Score | Rationale |
|---|---|---|
| Feature Completeness | **YELLOW** | Core bet/wallet flows work. Compliance, payments, auth are mocks/shells. |
| Sportsbook Business Logic | **RED** | Missing cumulative limits, no reservation model, no automated settlement, no real compliance |
| Reliability | **RED** | Non-atomic settlement, file-backed persistence, no graceful shutdown |
| Security | **RED** | Zero auth on gateway, plaintext passwords, no CSRF, no user scoping |
| Observability | **RED** | Unstructured logging, no tracing, partial metrics, health checks don't check dependencies |
| Operability | **YELLOW** | Good reconciliation/correction tooling, but missing audit trails, structured logs, alerting |
| Data/Money Integrity | **RED** | Non-atomic settlement, no reservation model, file-backed mode loses data |
| Deployment Readiness | **RED** | No DB-mode enforcement, no secret management, no migration runner |
| Test Depth | **RED** | Tests exist but CI doesn't run them. Critical flows untested. |
| Maintainability | **YELLOW** | Clean Go code, good package structure, but monolithic gateway is a scaling concern |

---

## 12. Critical Transaction Matrix

| Transaction | Trigger | Invariants | Atomicity | Idempotency | Failure Modes | Recovery | Current Gaps |
|---|---|---|---|---|---|---|---|
| **Bet Placement** | Player API call | Balance >= stake; market open; odds valid; stake in range | Debit + bet record NOT atomic in memory mode | Yes (userId:key) | Debit succeeds, bet record fails -> money lost | Best-effort refund | No reservation/hold; not transactional |
| **Balance Debit** | Bet placement, admin | Balance >= amount | Atomic in DB mode (serializable) | Yes (unique constraint) | Insufficient funds -> rejected | Clean | Good in DB mode |
| **Balance Credit** | Settlement win, cancel, refund, admin | Amount > 0 | Atomic in DB mode | Yes (unique constraint) | DB failure -> retry safe | Idempotent replay | Good in DB mode |
| **Settlement (Win)** | Admin API call | Bet in placeable state; winning selection valid | Wallet credit + bet status update NOT atomic | Yes (reference-based) | Credit succeeds, bet update fails -> double payout on retry | Manual reconciliation | **Critical gap** - must be single transaction |
| **Settlement (Loss)** | Admin API call | Bet in placeable state | Bet status update only (no wallet movement for loss) | Yes | Clean | - | OK |
| **Resettlement** | Admin API call | Previous settlement exists | Delta credit/debit + bet update NOT atomic | Yes (revision-based key) | Same as settlement | Manual | Same critical gap |
| **Cancellation** | Admin API call | Bet in `placed` state | Wallet credit + bet update NOT atomic | Yes (cancel:betId key) | Same pattern | Manual | Same gap |
| **Refund** | Admin API call | Bet in `placed` or `settled_lost` | Wallet credit + bet update NOT atomic | Yes (refund:betId key) | Same pattern | Manual | Same gap |
| **Cashout** | Player API call | Active quote, bet in `placed` state | Quote acceptance + wallet credit + bet update | Yes (quote ID) | Partial failure possible | Quote expiry is safety net | Better than settlement but same non-atomic pattern |
| **Feed Market Update** | Provider stream | Valid market state transition | Market state update only | Sequence-based | Feed error -> stream health degradation | Stream restart with backoff | OK |

---

## 13. Remediation Plan

### Phase 1: Critical Production Blockers (Must fix before ANY real traffic)

#### 1.1 Add Auth Middleware to Gateway
- **Problem:** All gateway routes completely unprotected
- **Modules:** `gateway/internal/http/`
- **Steps:**
  1. Create `authMiddleware` that validates `access_token` cookie against auth service `/api/v1/auth/session`
  2. Create `adminMiddleware` that additionally checks for admin role
  3. Wrap all bet, wallet, and user routes with `authMiddleware`
  4. Wrap all `/admin/*` routes with `adminMiddleware`
  5. Extract `userID` from validated session, not from request params
  6. Add CSRF middleware for all POST/PUT/DELETE gateway routes
- **Priority:** P0
- **Complexity:** Medium (2-3 days)

#### 1.2 Build Real User Store
- **Problem:** 2 hardcoded users, plaintext passwords, no registration
- **Modules:** `auth/internal/`
- **Steps:**
  1. Create `users` table in PostgreSQL (id, email, password_hash, role, status, created_at)
  2. Implement bcrypt password hashing
  3. Add `/api/v1/auth/register` endpoint
  4. Migrate from in-memory `usersByUsername` map to DB queries
  5. Persist OAuth-created users to DB
  6. Add email verification flow
- **Priority:** P0
- **Complexity:** Medium (3-4 days)

#### 1.3 Implement Real Compliance Services
- **Problem:** All compliance services are mocks
- **Modules:** `gateway/internal/compliance/`
- **Steps:**
  1. Implement real `ResponsibleGamblingService` with PostgreSQL-backed limit storage
  2. Wire `CheckBetAllowed()` into bet placement flow
  3. Wire `CheckDepositAllowed()` into deposit flow
  4. Implement self-exclusion with enforcement gate on bet/deposit endpoints
  5. Implement cool-off with enforcement gate
  6. Add KYC verification status check as bet placement gate
  7. Geo-compliance can remain configurable (real provider in prod, mock in dev)
- **Priority:** P0
- **Complexity:** High (5-7 days)

#### 1.4 Make Settlement Atomic
- **Problem:** Wallet credit and bet status update are separate operations
- **Modules:** `bets/service.go`, `wallet/service.go`
- **Steps:**
  1. Add `CreditInTx(tx *sql.Tx, request)` method to wallet service
  2. Modify `settleDB()` to run bet update + wallet credit in single transaction
  3. Same for `cancelDB()` and `refundDB()`
  4. Add integration test for settlement failure scenarios
- **Priority:** P0
- **Complexity:** Medium (2-3 days)

#### 1.5 Enforce DB-Only Mode for Production
- **Problem:** File-backed mode loses data, is not transactional
- **Modules:** `bets/service.go`, `wallet/service.go`, `loyalty/`, `leaderboards/`
- **Steps:**
  1. Add `ENVIRONMENT=production` check that requires DB mode
  2. Fail startup if DB DSN not configured in production
  3. Remove silent fallback to file mode
  4. Create DB schemas for loyalty and leaderboards
- **Priority:** P0
- **Complexity:** Low (1-2 days)

#### 1.6 Enable Go Tests in CI
- **Problem:** 85+ test files never run in CI pipeline
- **Modules:** `.github/workflows/test.yml`
- **Steps:**
  1. Add `go test ./...` to CI pipeline for both gateway and auth
  2. Add E2E tests to pipeline
  3. Set up test database for integration tests
  4. Make CI fail on test failures
- **Priority:** P0
- **Complexity:** Low (1 day)

### Phase 2: Business Logic Parity (Required for beta)

#### 2.1 Implement Per-Player Cumulative Stake Limits
- **Problem:** No daily/weekly/monthly stake limits (regulatory requirement)
- **Steps:**
  1. Create `player_bet_limits` table (user_id, period, amount_cents)
  2. Create `player_bet_history` index optimized for period lookups
  3. Implement outcome-aware accounting (match Phoenix logic)
  4. Wire limit check into `validatePlacementRequest()`
  5. Add admin endpoint for setting player limits
- **Priority:** P1
- **Complexity:** High (4-5 days)

#### 2.2 Implement Wallet Reservation Model
- **Problem:** No hold/release pattern for in-flight bets
- **Steps:**
  1. Add `wallet_reservations` table
  2. Change bet placement to: reserve -> place bet -> confirm reservation
  3. Add reservation timeout and cleanup
  4. Add reservation release on bet cancellation/settlement
- **Priority:** P1
- **Complexity:** High (4-5 days)

#### 2.3 Add Real Money vs Bonus Fund Separation
- **Problem:** Single balance type
- **Steps:**
  1. Add `balance_type` to wallet (real_money, bonus)
  2. Implement fund-type-aware debit priority
  3. Implement fund-type-aware settlement (bonus winnings vs real winnings)
- **Priority:** P1
- **Complexity:** High (3-4 days)

#### 2.4 Implement Market Lifecycle State Machine
- **Problem:** Market status is a string with no transition rules
- **Steps:**
  1. Define market states enum (open, suspended, settled, cancelled, etc.)
  2. Implement transition validation (e.g., can't reopen a settled market)
  3. Add backoffice override protection (feed can't reopen backoffice-suspended market)
  4. Add reason tracking for state changes
- **Priority:** P1
- **Complexity:** Medium (2-3 days)

### Phase 3: Shell Feature Completion

#### 3.1 Real Payment Processing
- Replace `MockPaymentService` with real payment gateway integration
- **Complexity:** High (5-7 days)

#### 3.2 Real KYC Integration
- Integrate with identity verification provider
- **Complexity:** Medium (3-4 days)

#### 3.3 Real Geo-Compliance Integration
- Integrate with GeoComply or equivalent
- **Complexity:** Medium (3-4 days)

### Phase 4: Reliability and Data Integrity Hardening

#### 4.1 Structured Logging
- Replace `log.Printf` with structured JSON logger (zerolog or slog)
- Add request correlation IDs
- **Complexity:** Medium (2 days)

#### 4.2 Graceful Shutdown
- Implement SIGTERM handler with connection drain
- Stop auto-save goroutines cleanly
- Flush pending state before exit
- **Complexity:** Low (1 day)

#### 4.3 Health Check Improvements
- `/healthz` checks DB, Redis, feed health
- `/readyz` verifies all dependencies ready
- **Complexity:** Low (1 day)

### Phase 5: Observability and Operability

#### 5.1 Prometheus Metrics
- HTTP request rate, latency, errors
- Wallet debit/credit counters
- Bet placement/settlement counters
- **Complexity:** Medium (2-3 days)

#### 5.2 Admin Audit Trail
- Dedicated `admin_audit_log` table
- Log all admin actions with actor, target, reason, timestamp
- **Complexity:** Medium (2 days)

#### 5.3 Distributed Tracing
- OpenTelemetry integration
- Request tracing across gateway <-> auth
- **Complexity:** Medium (2-3 days)

### Phase 6: Test and Verification

#### 6.1 Integration Tests for Critical Flows
- End-to-end bet placement through settlement
- Concurrent bet placement race conditions
- Settlement atomicity failure scenarios
- **Complexity:** Medium (3-4 days)

#### 6.2 Frontend Test Coverage
- Auth flow tests
- Bet placement flow tests
- Wallet display tests
- **Complexity:** Medium (3-4 days)

### Phase 7: Limited Rollout Readiness

#### 7.1 Automated Feed-Driven Settlement
- Wire feed provider events to bet settlement
- **Complexity:** High (4-5 days)

#### 7.2 Rate Limiting
- Add rate limiter middleware
- Per-IP and per-user limits
- **Complexity:** Low (1-2 days)

#### 7.3 Account Lockout
- Brute-force protection on login
- **Complexity:** Low (1 day)

### Phase 8: Post-Launch

- Password reset flow
- MFA support
- Horizontal scaling (move from monolith)
- Real-time odds streaming optimization
- Advanced reporting dashboards

---

## 14. Feature-by-Feature Implementation Plan

### Bet Placement - Currently: Functional but Fragile

**Missing pieces:**
- Auth middleware to validate user and extract userID
- CSRF protection on POST
- Cumulative stake limit check
- Wallet reservation instead of direct debit
- Atomic bet record + wallet mutation

**Backend work:**
1. Add auth middleware extracting userID from session
2. Add CSRF verification
3. Implement `checkCumulativeStakeLimits(userID, stakeCents)` in bet service
4. Change `wallet.Debit()` to `wallet.Reserve()` with confirmation on bet success
5. Wrap placement in single DB transaction

**Test work:**
1. Auth rejection test
2. Cumulative limit enforcement test
3. Concurrent placement test
4. Partial failure and rollback test

**Acceptance criteria:** Bet placement requires valid auth, checks cumulative limits, uses reservations, and is atomic.

### Wallet - Currently: Functional but Fragile

**Missing pieces:**
- Auth middleware
- User scoping (prevent cross-user access)
- Reservation model
- Fund type separation
- Admin action audit logging
- Rate limiting on credit operations

**Backend work:**
1. Auth middleware on all wallet endpoints
2. Extract userID from auth, not params
3. Add reservation table and API
4. Add balance_type column
5. Add actor_id to admin mutations

**Acceptance criteria:** Wallet operations require auth, are user-scoped, support reservations, and admin operations are audited.

### Compliance (Geo, KYC, RG) - Currently: Non-Operational

**Missing pieces:** Everything. Only interfaces and mocks exist.

**Backend work:**
1. Implement PostgreSQL-backed `ResponsibleGamblingService`
2. Create `player_limits`, `player_exclusions`, `player_cooloffs` tables
3. Wire `CheckBetAllowed()` into bet precheck and placement
4. Wire `CheckDepositAllowed()` into deposit flow
5. Add self-exclusion enforcement gate on all player endpoints
6. Implement KYC status gate (block betting until verified)
7. Implement configurable geo-compliance (real provider in prod)

**Test work:**
1. Limit enforcement tests (daily, weekly, monthly)
2. Self-exclusion blocking tests
3. Cool-off period tests
4. KYC gate tests

**Acceptance criteria:** Real enforcement gates on bet placement and deposits. Self-exclusion blocks all player actions. Limits cannot be exceeded.

### Authentication - Currently: Partial Implementation

**Missing pieces:**
- Real user store
- Password hashing
- Registration
- OAuth persistence
- Role-based access
- MFA

**Backend work:**
1. Create `users` table
2. Implement bcrypt hashing
3. Add registration endpoint
4. Persist OAuth users
5. Add `role` field (player, admin, trader)
6. Return role in session response
7. Gateway middleware checks role for admin routes

**Acceptance criteria:** Users can register, login with hashed passwords, OAuth users persist across restarts, admin routes require admin role.

---

## 15. Final Go/No-Go Recommendation

### Release Posture: NOT READY FOR ANY REAL-MONEY TRAFFIC

### What Must Be Fixed Before ANY Real-Money Production Traffic

1. Auth middleware on all gateway routes (P0)
2. Real user store with password hashing (P0)
3. Settlement atomicity with wallet (P0)
4. DB-only mode enforcement (P0)
5. Cumulative stake limit enforcement (P0)
6. Real responsible gaming enforcement (at minimum: deposit limits, self-exclusion) (P0)
7. CI running all tests (P0)
8. CSRF on gateway mutations (P0)

### What Must Be Fixed Before Limited Beta

All of the above, PLUS:
9. Wallet reservation model (P1)
10. Market lifecycle state machine (P1)
11. Admin route authorization with role checks (P1)
12. Admin audit trail (P1)
13. Structured logging (P1)
14. Real health checks (P1)
15. Integration tests for money flows (P1)

### What Can Wait Until After Controlled Rollout

16. Real payment processor integration
17. Real KYC provider integration
18. Automated feed-driven settlement
19. Real money vs bonus fund separation
20. Distributed tracing
21. Prometheus metrics
22. Graceful shutdown
23. Rate limiting
24. MFA

### What Is Optional Polish

25. Horizontal scaling / service decomposition
26. Advanced reporting dashboards
27. RTL language support
28. Password reset flow
29. Email verification

### Rationale

The Go platform has **strong foundational code** in its core betting and wallet services. The idempotency patterns, odds policies, settlement logic (including dead heat and resettlement), cashout system, and feed health monitoring are well-implemented and in some areas exceed the legacy Phoenix platform.

However, **everything above the business logic layer is missing or mocked**. There is no authentication on the gateway, no authorization, no real compliance, no real payments, no real user management. This isn't a "we need polish" situation — it's a "the doors don't have locks" situation.

The platform is approximately **40% of the way to production readiness** by effort. The hardest 40% (core business logic) is done well. The remaining 60% is security, compliance, data integrity, operability, and testing infrastructure — all of which are table stakes for a regulated sportsbook.

**Estimated time to minimum viable production:** 8-12 weeks with a focused team of 2-3 engineers.

**Estimated time to full production parity with Phoenix:** 16-20 weeks.

---

*End of Audit*
