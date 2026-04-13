# Phoenix Sportsbook Platform — Production Readiness Audit

**Date:** 2026-04-13
**Auditor:** Principal Engineer / Sportsbook Platform Auditor
**Scope:** Go platform (`go-platform/`), Frontend (`phoenix-frontend/`, `talon-backoffice/`), Legacy comparison (`Phoenix` Scala backend)

---

## 1. Executive Verdict

**Production Ready: NO**

**Confidence Level: HIGH** — based on full code inspection of Go gateway, auth, platform middleware, wallet, bets, settlement, compliance, payments, WebSocket, all tests, CI pipeline, frontend wiring, and legacy Phoenix comparison.

| Deployment Stage | Ready? | Rationale |
|---|---|---|
| Internal QA only | **Yes** | Core flows work on happy path |
| Staging/UAT | **Conditionally** | Fix critical security vulns first (admin self-reg, hardcoded creds) |
| Limited real-money beta | **No** | Money-safety gaps (auto-approved deposits, double-payout on void, hold expiry race) |
| Controlled production | **No** | Missing rate limiting, account lockout, real payment gateway, geo/KYC checks |
| Full production | **No** | Missing legacy parity (event sourcing, blocked-funds model, outcome-based limits), missing integration tests |

### Top Blockers (Critical)
1. **Privilege escalation** — any user can register as admin
2. **Deposits auto-approved** — no external payment gateway validation
3. **Double-payout on void** — voiding a settled-won bet refunds stake on top of payout
4. **Hardcoded credentials** — `demo123` / `admin123` defaults in source
5. **Hold expiry race** — settlement after 5min hold expires leaves payout uncredited
6. **Dead heat factor unvalidated** — malformed feed data can inflate payouts

### Top Business Risks
- Money loss from settlement/void races
- Regulatory failure from mock GeoCompliance and KYC
- Account takeover from missing rate limiting + weak passwords
- Unrecoverable state from non-atomic settlement cascades

---

## 2. Go Platform System Assessment

### Architecture
The Go platform uses a clean service-per-domain layout: auth (port 18081), gateway (port 18080), with a shared platform module for middleware. Module boundaries are well-defined. The `httpx.Chain()` pattern is sound.

### Major Issues

| Issue | Evidence | Risk | Severity | Remediation |
|---|---|---|---|---|
| **Dual-mode persistence (memory + DB)** | Wallet, bets, compliance all have in-memory fallback | Memory mode has no crash recovery, no atomicity guarantees | Critical | Remove memory mode for production; require DB |
| **No circuit breaker for auth dependency** | `middleware.go:164-179` — synchronous 5s RPC to auth service on every request | Auth service outage blocks all requests | High | Add circuit breaker, cache valid sessions longer |
| **Auth/CSRF middleware not in global chain** | `main.go:31-37` — only RequestID, AccessLog, Metrics, Recovery in chain; Auth/CSRF per-route | Inconsistent protection across routes | High | Move Auth+CSRF into global chain with whitelist |
| **No graceful shutdown drains in-flight** | `signal.NotifyContext` exists but no drain period | Active bets/settlements interrupted on deploy | Medium | Add configurable drain timeout |
| **Idempotency TTL eviction (24h)** | `wallet/service.go` — background goroutine sweeps idempotency keys | After 24h, duplicate requests result in double mutation | Medium | Use DB-backed idempotency with no expiry for money ops |
| **Production enforcement requires env var** | `ENVIRONMENT=production` triggers `log.Fatalf` on missing DB | Easy to misconfigure, deploy without DB | Medium | Fail-closed: require explicit `ENVIRONMENT=development` to allow memory mode |

---

## 3. Legacy Parity and Regression Check

Using Phoenix (Scala/Play) as the behavioral reference.

| Area | Legacy (Phoenix) | Go Platform | Gap/Regression | Risk | Severity | Remediation |
|---|---|---|---|---|---|---|
| **Wallet model** | Dual-account: `available` + `blocked.forBets` + `blocked.forWithdrawals` | Single `balance_cents` + `bonus_balance_cents` + reservations table | No separation of blocked funds by purpose | Incorrect available balance | **Critical** | Implement dual-blocked model |
| **Outcome-based stake limits** | Won bets subtract returns from cumulative stake; lost/voided/cancelled zero out | Period-based summing of activity_log (raw amounts only) | Users who win frequently get artificially lower limit utilization in Phoenix but not Go | Regulatory non-compliance | **High** | Implement outcome-aware limit recalculation |
| **Resettlement constraint** | New winner must differ from original winner | No such check — resettlement accepted regardless | Idempotent replay looks like valid resettlement; spurious wallet adjustments | Money integrity | **High** | Add winner-differs check |
| **Event sourcing** | All state changes persisted as immutable events; projections from event log | Direct state mutation in DB; previous values overwritten | No audit trail of original outcomes | Auditability, regulatory | **High** | Add event log table |
| **Multi-error validation** | Returns all validation errors in `NonEmptyList` | Returns first error encountered | Poor UX; user fixes one error, hits next | Low (UX) | **Medium** | Collect all validation errors |
| **Push/Void distinction** | Separate `VoidBet` and `PushBet` operations | Only `Cancel` (refund stake) | No "push" (tie) handling | Incorrect outcomes | **High** | Add push bet state |
| **Feed change detection** | Odds comparison before update; only mutate if different | Accepts all feed updates without diffing | Unnecessary DB writes; no stale detection | Performance | **Medium** | Add change detection |
| **Geolocation enforcement** | GeoCheck at bet placement | Mock always returns true | Users outside jurisdiction can bet | Regulatory | **Critical** | Implement real geo service |
| **KYC/age verification** | IdComply integration + DGE exclusion list | Mock always returns true | Underage users accepted | Regulatory | **Critical** | Implement real KYC |
| **Session limits** | Daily/weekly/monthly session duration tracking | Not implemented | No session duration controls | Regulatory | **Medium** | Implement session limits |

---

## 4. Feature Readiness Matrix

| Feature | Classification | Major Gaps | Severity |
|---|---|---|---|
| **Auth: Login/Register** | Functional but Fragile | Admin self-registration, no rate limiting, no lockout, hardcoded creds, 6-char passwords | Critical |
| **Auth: OAuth (Google/Apple)** | Partial Implementation | Apple email placeholder collision, auto-creates any user, no domain restriction | High |
| **Auth: Sessions** | Mostly Ready | No concurrent session limits, no IP binding, logout doesn't invalidate header tokens | Medium |
| **Auth: CSRF** | Mostly Ready | SameSite=Lax instead of Strict | Low |
| **Wallet: Balance** | Functional but Fragile | No blocked-by-category model, memory mode crash risk, bonus bypasses deposit limits | Critical |
| **Wallet: Hold/Capture/Release** | Functional but Fragile | 5min hold expiry races with settlement, orphaned holds on TX failure | Critical |
| **Wallet: Idempotency** | Mostly Ready | 24h TTL eviction allows post-TTL duplicates | Medium |
| **Wallet: Metrics** | Mostly Ready | No settlement latency histogram, no audit actor tracking | Low |
| **Bet Placement** | Functional but Fragile | No duplicate bet prevention, no aggregate daily cap, compliance not re-checked | High |
| **Bet Settlement** | Functional but Fragile | Void on won bet = double payout, dead heat unvalidated, no winner-differs check | Critical |
| **Bet Cashout** | Mostly Ready | No concurrent cashout prevention, quote expiry race untested | Medium |
| **Market Lifecycle** | Mostly Ready | No dispute state, no version tracking, no auto-cancel on market void | Medium |
| **Payments: Deposit** | Shell / Scaffolding | Auto-approved without external gateway; no 3D-Secure, no fraud check | Critical |
| **Payments: Withdrawal** | Functional but Fragile | Capture doesn't re-check restrictions; no refund state | High |
| **Compliance: RG** | Mostly Ready | Daily reset at UTC midnight, cool-off fixed 24h, limit increases not retroactive | Medium |
| **Compliance: Geo** | Non-Operational / Misleading | Mock — always allows | Critical |
| **Compliance: KYC** | Non-Operational / Misleading | Mock — always allows | Critical |
| **Feed Ingestion** | Functional but Fragile | No change detection, no dedup, no out-of-order handling | High |
| **Feed Settlement** | Functional but Fragile | Settlement source not authenticated | High |
| **WebSocket** | Functional but Fragile | Query param auth, origin bypass in dev, hub data race | High |
| **Admin: User Management** | Mostly Ready | Role reads from auth context (good), mutation routes added | Low |
| **Admin: Trading** | Partial Implementation | Market status toggle only; no exposure/liability view | Medium |
| **Loyalty/Leaderboards** | Production Ready | DB-backed, properly wired end-to-end | Low |
| **Frontend: Player App** | Production Ready | All 98 features wired to real APIs | Low |
| **Frontend: Backoffice** | Mostly Ready | `ignoreBuildErrors: true` in next.config.js | Low |

---

## 5. Shell or Shallow Feature Findings

| Feature | Why Shallow | Missing | Risk | Required Work |
|---|---|---|---|---|
| **Deposit Payment** | `db_service.go:98-100`: "For now, we auto-approve" | External gateway, 3D-Secure, fraud checks, webhook confirmation | Credits wallet without payment | Integrate real payment provider |
| **GeoCompliance** | Mock always returns `true` | Real IP geolocation, jurisdiction rules, VPN detection | Regulatory violation | Implement geo service |
| **KYC/Identity** | Mock always returns `true` | Identity verification, age check, duplicate detection | Regulatory violation | Integrate KYC provider |
| **Admin Trading** | Single market status toggle | Exposure view, liability calculation, odds management | Blind risk exposure | Build trader dashboard |

---

## 6. Production Blockers

### Critical

| # | Title | Evidence | Failure Mode |
|---|---|---|---|
| 1 | **Admin self-registration** | `handlers.go:708-710` — client can set role to "admin" | Any user creates admin account |
| 2 | **Deposits auto-approved** | `db_service.go:98-100` — no external gateway | Credits wallet without payment |
| 3 | **Double-payout on void** | Void on won bet: refunds stake on top of payout | Operator money loss |
| 4 | **Hardcoded credentials** | `handlers.go:127-132` — `demo123`/`admin123` defaults | Unauthorized access |
| 5 | **Hold expiry race** | 5min hold expires before settlement | Payout uncredited |
| 6 | **Dead heat factor unvalidated** | No range check on feed input | Inflated payouts |
| 7 | **Mock GeoCompliance** | Always returns true | Regulatory violation |
| 8 | **Mock KYC** | Always returns true | Underage users |

### High

| # | Title | Evidence | Failure Mode |
|---|---|---|---|
| 9 | **No rate limiting** | All auth endpoints unprotected | Brute force, DoS |
| 10 | **No account lockout** | Unlimited failed logins | Password guessing |
| 11 | **WebSocket origin bypass** | Empty `WS_ALLOWED_ORIGINS` = accept all | CSRF over WebSocket |
| 12 | **Settlement source unauthenticated** | Any event sink submits settlement | Malicious settlement |
| 13 | **Wallet model regression** | No blocked-by-category funds | Incorrect available balance |
| 14 | **No push bet state** | All non-win = cancel/refund | Incorrect outcomes |
| 15 | **Missing winner-differs check** | Same-winner resettlement accepted | Spurious wallet adjustments |
| 16 | **Weak password policy** | 6-char minimum, no complexity | Credential compromise |
| 17 | **Session file world-readable** | 755 directory permissions | Session theft |
| 18 | **WS query param auth** | Token in URL | Token leakage |

### Medium

| # | Title | Evidence | Failure Mode |
|---|---|---|---|
| 19 | **No event sourcing** | State overwrites previous values | Lost audit trail |
| 20 | **No auto-cancel on market void** | Voided market, bets remain placed | Stale bets |
| 21 | **Idempotency TTL 24h** | Keys evicted after 24h | Late replay double mutations |
| 22 | **No feed change detection** | All updates written regardless | Unnecessary writes |
| 23 | **Withdrawal capture no re-check** | Self-exclude → withdrawal proceeds | Restricted user receives funds |
| 24 | **RG daily reset at UTC midnight** | Not user timezone | Off-by-timezone limits |
| 25 | **No concurrent session limits** | Unlimited concurrent sessions | Account sharing |
| 26 | **No MFA** | No second factor | Single-factor for financial platform |

---

## 7. Testing and Verification Assessment

### What Is Well Tested
- Bet placement validation (11 unit tests)
- Wallet basic operations (credit, debit, idempotency)
- Settlement happy path (win, loss, dead heat, resettlement)
- Cashout lifecycle (quote, expiry, acceptance)
- Frontend API contracts (135 tests, all passing)
- Auth session lifecycle
- Market state transitions (static validation)

### What Is Only Superficially Tested
- Concurrent wallet debits (test uses unique keys per goroutine — not a real race test)
- HTTP handlers (all mock dependencies)
- Settlement (unit only, no feed/wallet integration)

### Critical Flows UNTESTED
- End-to-end bet placement → settlement → wallet credit
- Concurrent bet placement on same balance with real DB
- Feed → settlement → wallet atomic chain
- Market void → auto-cancel bets
- Hold expiry race with settlement
- Double-void protection
- Withdrawal + self-exclusion race
- Database-backed wallet atomicity

### Test Coverage by Flow

| Flow | Unit | Integration | E2E | Concurrent | Database |
|---|---|---|---|---|---|
| Bet Placement | Y | N | Y | N | N |
| Settlement | Y | N | N | N | N |
| Wallet | Y | Partial | N | Partial | N |
| Cashout | Y | N | N | N | N |
| Market State | Y | N | N | N | N |
| Feed Processing | Y | N | N | N | N |
| Idempotency | Y | Y | N | N | N |
| Compliance | Y | N | N | N | N |

---

## 8. Security, Account Control, and Auditability

| Issue | Evidence | Exploit/Failure Mode | Severity |
|---|---|---|---|
| Admin self-registration | `handlers.go:708-710` | Register with `"role":"admin"` | Critical |
| Hardcoded credentials | `handlers.go:127-132` | Known passwords in source | Critical |
| No rate limiting | All auth endpoints | Brute force | High |
| No account lockout | Login handler | Password guessing | High |
| Logout doesn't invalidate Bearer | `handlers.go:450-452` | Token valid until TTL | High |
| Session file 755 permissions | `session_store.go:198` | Session theft | High |
| WS query param token | `ws/handler.go:107-112` | Token in logs/proxies | High |
| WS origin bypass (dev) | `ws/handler.go:33-35` | Cross-origin WebSocket | High |
| Unknown WS channels default public | `client.go:212` | Data exposure | Medium |
| SameSite=Lax | `handlers.go:290` | CSRF via navigation | Medium |
| Plaintext password fallback | `handlers.go:695-696` | Weak comparison | Medium |
| No security headers | Missing HSTS, CSP, X-Frame-Options | Clickjacking, XSS | Medium |

---

## 9. Data, State, and Money Integrity

| Area | Assessment | Gaps |
|---|---|---|
| **Wallet balance** | DB mode: SERIALIZABLE isolation, solid. Memory: mutex-only | No blocked-by-category |
| **Ledger/audit** | Idempotency keys prevent replays within 24h. No actor tracking | Event log missing |
| **Bet state** | State machine defined. Missing auto-cancel on void | Void on won = double payout |
| **Settlement** | Atomic single-TX. Deterministic resettlement | No winner-differs check; dead heat unvalidated |
| **Resettlement** | Adjustment = new - previous | Previous overwritten, not versioned |
| **Duplicate prevention** | Bet ID + idempotency keys | 24h TTL eviction; no duplicate bet detection |
| **Transaction boundaries** | DB: single TX for settlement | Loyalty/leaderboard outside TX |
| **Recovery** | Hold expires 5min | Orphaned holds; no reconciliation job |

---

## 10. Operability and Observability

| Area | Status | Gap | Severity |
|---|---|---|---|
| **Logging** | `slog` structured JSON | No actor tracking on wallet mutations | Medium |
| **Metrics** | Prometheus: wallet, bets, cashout | No settlement latency histogram | Medium |
| **Tracing** | RequestID middleware | No distributed tracing | Medium |
| **Health checks** | `/readyz` verifies auth | No DB/feed health check | High |
| **Startup/shutdown** | `signal.NotifyContext` | No drain period | Medium |
| **Feed health** | Provider stream status | No stale-feed alerting | High |
| **Settlement visibility** | Logged on success/skip | No queue depth, no latency tracking | Medium |
| **Background jobs** | TTL sweep, session pruning | No dead-letter, no retry visibility | Medium |

---

## 11. Readiness Scorecard

| Dimension | Score | Rationale |
|---|---|---|
| Feature completeness | YELLOW | Frontend 98/98; backend has shells (payments, geo, KYC) |
| Sportsbook business-logic | RED | Missing outcome-based limits, push state, blocked-funds, winner-differs |
| Reliability | RED | Hold expiry race, double-payout on void, memory-mode crash risk |
| Security | RED | Admin self-reg, hardcoded creds, no rate limiting, no MFA, mock KYC/geo |
| Observability | YELLOW | Structured logging + Prometheus; missing tracing, feed health, settlement metrics |
| Operability | YELLOW | Health checks partial; no reconciliation automation |
| Data/money integrity | RED | Auto-approved deposits, double-payout, orphaned holds, no event sourcing |
| Deployment readiness | YELLOW | CI with -race; gateway tests failing; no E2E in CI |
| Test depth | RED | Unit-heavy, no real DB integration, false-positive concurrent test |
| Maintainability | GREEN | Clean Go structure, typed errors, modular services |

---

## 12. Critical Transaction Matrix

| Transaction | Atomicity | Idempotency | Current Gaps |
|---|---|---|---|
| **Bet placement** | Hold + Insert (separate ops) | Bet ID + key | No aggregate cap; no duplicate bet detection |
| **Balance debit** | Single SERIALIZABLE TX (DB) | UNIQUE constraint | 24h TTL eviction |
| **Settlement** | Single TX: status + wallet | Deterministic check | Void on won = double payout; dead heat unvalidated |
| **Void/refund** | Cancel: status + credit | State-check | Void on won refunds on top of payout |
| **Cashout** | Quote + accept (separate, revision check) | Quote ID + revision | No concurrent cashout prevention |
| **Feed update** | Direct state mutation | None | No change detection, no ordering check |
| **Deposit** | Auto-approved + credit | Payment key | SHELL — no real payment |
| **Withdrawal** | Hold + pending + processing | Payment ID | No re-check at capture |

---

## 13. Remediation Plan

### Phase 1: Critical Production Blockers

| # | Title | Steps | Complexity |
|---|---|---|---|
| 1 | Fix admin self-registration | Force role to "player" in Register() | Low |
| 2 | Integrate real payment gateway | Implement provider interface, fail-closed, webhook flow | High |
| 3 | Fix void-on-settled double-payout | Guard: reverse payout before refunding stake | Medium |
| 4 | Remove hardcoded credentials | Require env vars; fail startup without them in production | Low |
| 5 | Fix hold expiry race | Extend hold TTL to 24h for bets; renew on settlement start | Medium |
| 6 | Validate dead heat factor | Range check 0 < factor <= 1.0 | Low |
| 7 | Implement real GeoCompliance | Provider interface, fail-closed, IP lookup | High |
| 8 | Implement real KYC | Provider interface, fail-closed, verification states | High |

### Phase 2: Business-Logic Parity

| # | Title | Steps | Complexity |
|---|---|---|---|
| 9 | Implement blocked-funds model | `blocked_for_bets` + `blocked_for_withdrawals` columns | Medium |
| 10 | Outcome-based stake limits | Won bets subtract returns from cumulative | Medium |
| 11 | Resettlement winner-differs check | Validate new winner != original | Low |
| 12 | Add push bet state | New state in machine; push = stake returned | Medium |
| 13 | Event sourcing for state transitions | `state_events` table; append-only | High |
| 14 | Auto-cancel on market void | Void market → cancel all unsettled bets | Medium |

### Phase 3: Security Hardening

| # | Title | Complexity |
|---|---|---|
| 15 | Rate limiting | Medium |
| 16 | Account lockout | Low |
| 17 | Strengthen password policy | Low |
| 18 | Fix WebSocket security | Low |
| 19 | Fix session file permissions | Low |
| 20 | Fix logout invalidation | Low |
| 21 | Add security headers | Low |
| 22 | Authenticate settlement source | Medium |

### Phase 4: Reliability Hardening

| # | Title | Complexity |
|---|---|---|
| 23 | Remove memory-mode for production | Low |
| 24 | Circuit breaker for auth service | Medium |
| 25 | Global middleware chain | Low |
| 26 | Feed change detection | Medium |
| 27 | Withdrawal restriction re-check | Low |
| 28 | Permanent idempotency for money ops | Medium |
| 29 | Reconciliation automation | Medium |

### Phase 5: Observability

| # | Title | Complexity |
|---|---|---|
| 30 | DB and feed health checks | Low |
| 31 | Settlement metrics | Medium |
| 32 | Distributed tracing (basic) | High |
| 33 | Audit actor tracking | Medium |
| 34 | Stale-feed alerting | Low |

### Phase 6: Tests

| # | Title | Complexity |
|---|---|---|
| 35 | Fix failing gateway tests | Low |
| 36 | DB-backed wallet concurrency tests | Medium |
| 37 | E2E settlement integration test | High |
| 38 | E2E tests in CI | Medium |
| 39 | Fix concurrent wallet test | Low |
| 40 | Void-on-settled-bet test | Low |
| 41 | Hold-expiry-race test | Medium |

---

## 14. Feature-by-Feature Implementation Plan

### Deposits (Shell -> Production)
- **Current**: Auto-approved without external validation
- **Backend**: Provider interface with fail-closed default; webhook handler; remove auto-approval
- **Data**: `payment_gateway_ref`, `gateway_status`, `webhook_received_at` columns
- **Auth**: Verify KYC status before deposit
- **Tests**: Webhook flow test, fail-closed test
- **Acceptance**: Deposit only credited after external confirmation

### GeoCompliance (Mock -> Production)
- **Current**: Always returns true
- **Backend**: Provider interface with fail-closed default; jurisdiction rules
- **Data**: `geo_checks` table
- **Tests**: Jurisdiction rule tests, fail-closed test
- **Acceptance**: Users outside jurisdictions blocked

### KYC (Mock -> Production)
- **Current**: Always returns true
- **Backend**: Provider interface with fail-closed default; verification states
- **Data**: `kyc_verifications` table
- **Tests**: Verification state tests, fail-closed test
- **Acceptance**: Unverified users blocked from financial operations

### Settlement (Fragile -> Production)
- **Current**: Works but double-payout bug, no winner-differs, dead heat unvalidated
- **Backend**: Void guard, winner-differs check, dead heat range validation
- **Tests**: Void-on-won, resettlement-same-winner, invalid-dead-heat
- **Acceptance**: Zero double-payout scenarios

### Auth (Fragile -> Production)
- **Current**: Critical security gaps
- **Backend**: Role lock, rate limiting, lockout, remove creds, fix WS/session
- **Tests**: Admin-reg blocked, lockout, rate limit responses
- **Acceptance**: Basic pen-test passes

---

## 15. Final Go/No-Go Recommendation

### Release Posture: **NO-GO for any real-money deployment**

### Before ANY real-money traffic:
1. Fix admin self-registration
2. Integrate real payment gateway (fail-closed)
3. Fix void-on-settled double-payout
4. Remove hardcoded credentials
5. Fix hold expiry race
6. Validate dead heat factor
7. Implement GeoCompliance (fail-closed)
8. Implement KYC (fail-closed)

### Before limited beta (add):
- Blocked-funds wallet model
- Outcome-based stake limits
- Rate limiting + account lockout
- Settlement source authentication
- Push bet state
- Event sourcing

### Can wait until after controlled rollout:
- Circuit breaker
- Feed change detection
- Distributed tracing
- Automated reconciliation
- Stale-feed alerting

### Rationale
The Go platform has sound architecture and clean module boundaries, but 8 critical blockers make it unsafe for real money. The most dangerous are deposit auto-approval (creates money from nothing), void double-payout (loses money on every void of a won bet), and admin self-registration (complete platform compromise). The mock compliance services are regulatory show-stoppers. Until resolved, the platform is suitable for internal QA and staging only.
