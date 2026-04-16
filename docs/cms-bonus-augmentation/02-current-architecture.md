# 02 — Current Architecture: How TAYA_NA Works Today

**Date:** 2026-04-16
**Branch:** main

---

## System Overview

TAYA_NA is a real-time sports betting platform with three active components:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        TAYA_NA Platform                              │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐ │
│  │  Player App   │   │  Backoffice  │   │     Go Gateway           │ │
│  │  Next.js 16   │   │  Next.js 16  │   │  (monolith on :18080)    │ │
│  │  port :3000   │   │  port :3001  │   │                          │ │
│  │               │◄──┤              │   │  ┌─────┐ ┌────────────┐  │ │
│  │  React 19     │   │  Ant Design  │   │  │Bets │ │   Wallet   │  │ │
│  │  Redux TK v1  │   │  Admin pages │   │  │     │ │ real+bonus │  │ │
│  │  React Query  │   │              │   │  ├─────┤ ├────────────┤  │ │
│  │  Tailwind CSS │   │              │   │  │Free-│ │  Loyalty   │  │ │
│  │  WebSocket    │   │              │   │  │bets │ │            │  │ │
│  │               │   │              │   │  ├─────┤ ├────────────┤  │ │
│  │               │   │              │   │  │Odds │ │ Compliance │  │ │
│  │               │   │              │   │  │Boost│ │            │  │ │
│  │               │   │              │   │  ├─────┤ ├────────────┤  │ │
│  │               │   │              │   │  │Lead-│ │  Payments  │  │ │
│  │               │   │              │   │  │board│ │            │  │ │
│  └───────┬───────┘   └──────────────┘   │  └─────┘ └────────────┘  │ │
│          │                               │  ┌─────────────────────┐ │ │
│          │  REST + WebSocket             │  │  Provider Runtime   │ │ │
│          └──────────────────────────────►│  │  (feed adapters)    │ │ │
│                                          │  └─────────────────────┘ │ │
│                                          └──────────┬───────────────┘ │
│                                                     │                 │
│  ┌──────────────┐   ┌──────────────┐               │                 │
│  │  Auth Service │   │  PostgreSQL  │◄──────────────┘                 │
│  │  port :18081  │   │  port :5432  │                                 │
│  │               │   │              │   ┌──────────────┐              │
│  │  Sessions     │   │  10 migra-   │   │    Redis     │              │
│  │  OAuth        │   │  tions       │   │  port :6379  │              │
│  │  Rate limits  │   │              │   │  (optional)  │              │
│  └──────────────┘   └──────────────┘   └──────────────┘              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Service Inventory

### Primary: Go Gateway (`services/gateway/`)

**Entry point:** `cmd/gateway/main.go` — single binary, port 18080

**Internal packages:**

| Package | Path | Responsibility | Persistence |
|---|---|---|---|
| `bets` | `internal/bets/service.go` | Bet placement, settlement, cashout, exotic types | Memory + optional DB |
| `wallet` | `internal/wallet/service.go` | Balance (real+bonus), ledger, reservations, corrections | Memory + optional DB (DB required in prod) |
| `freebets` | `internal/freebets/service.go` | Free bet lifecycle (available→reserved→consumed/expired) | Memory + DB (migration 007) |
| `oddsboosts` | `internal/oddsboosts/service.go` | Odds boost definitions, validation, application | Memory + DB (migration 007) |
| `loyalty` | `internal/loyalty/service.go` | Points, tiers, accrual rules, referrals, ledger | Memory + JSON snapshot |
| `leaderboards` | `internal/leaderboards/` | Time-windowed competitive rankings | Memory + JSON snapshot |
| `compliance` | `internal/compliance/` | RG limits, geo-checks, KYC, fail-closed in prod | PostgreSQL |
| `payments` | `internal/payments/` | Deposit/withdrawal, mock processor (dev) | DB-backed |
| `domain` | `internal/domain/` | Market/fixture read model, lifecycle management | Memory/file/DB modes |
| `cache` | `internal/cache/` | Redis wrapper with TTL, hit/miss metrics | Redis (optional) |
| `provider` | `internal/provider/` | Feed adapter registry, event replay, stream health | Memory + file snapshots |
| `ws` | `internal/ws/` | WebSocket hub, channels, client management | In-memory |
| `http` | `internal/http/` | HTTP handlers, route registration | — |

### Auth Service (`services/auth/`)

**Entry point:** `cmd/auth/main.go` — port 18081

**Capabilities:**
- Login/register with bcrypt (cost 12), 12+ char passwords
- OAuth: Google + Apple
- Access tokens (15 min) + refresh tokens (24h)
- CSRF: double-submit cookie pattern
- Rate limiting: 10 login/min per username, 3 register/min per IP
- Account lockout: 5 failures → 15 min
- File-backed session store (JSON)
- Optional Redis for distributed rate limiting
- Optional PostgreSQL for user persistence

### Codex-Prep Services (`services/codex-prep/`) — DISCONNECTED

14 microservices using a different architecture (Chi router, JWT, Kafka, pgx):

| Service | What It Does | Why It Matters |
|---|---|---|
| `phoenix-cms` | Pages, promotions, banners CRUD | Has the content model we need |
| `phoenix-betting-engine` | Bet quoting, parlays, placement | Has `PlaceParlay()` with freebet support |
| `phoenix-settlement` | Batch settlement, reconciliation | Mature settlement orchestrator |
| `phoenix-wallet` | Multi-currency wallet with Kafka | Alternative wallet, not used |
| `phoenix-events` | Event ingestion, live scores | Kafka outbox pattern |
| `phoenix-analytics` | Analytics aggregation | Not needed for augmentation |
| `phoenix-compliance` | Advanced compliance rules | Not needed (gateway has basics) |
| `phoenix-notification` | Email/SMS | Useful for bonus expiry alerts |
| `phoenix-market-engine` | Market lifecycle | Not needed (gateway has domain/) |
| `phoenix-realtime` | Real-time subscriptions | Not needed (gateway has ws/) |
| `phoenix-user` | User management | Not needed (auth service covers this) |
| `phoenix-audit` | Audit logging | Not needed (gateway has audit_logs migration) |
| `phoenix-retention` | Player retention strategies | Has `CreateCampaignRequest` struct |
| `stella-engagement` | Engagement rules engine | Gamification layer concept |

**Architecture difference:** These use Kafka + pgx + chi + JWT, while the primary gateway uses gorilla/mux + database/sql + session tokens + no message queue. Direct integration is NOT viable without significant adapter work.

---

## Database Schema (Primary Gateway)

10 migrations in `services/gateway/migrations/`:

```
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Schema                          │
│                                                              │
│  001_punters         User accounts                           │
│  002_sports_tournaments  Sport → Tournament hierarchy        │
│  003_fixtures        Events/matches with dates, status       │
│  004_markets_selections  Market types + selection outcomes   │
│  005_bets            Bet records (single + multi-leg)        │
│  006_wallets_ledger  wallet_balances (real + bonus),         │
│                      wallet_ledger (fund_type: real/bonus),  │
│                      wallet_reservations (hold/capture/      │
│                        release/expire)                       │
│  007_freebets_oddsboosts  freebets + odds_boosts tables     │
│  008_match_timelines  Live match state tracking              │
│  009_audit_logs      Compliance audit trail                  │
│  010_indexes         Performance indexes                     │
└─────────────────────────────────────────────────────────────┘
```

### Wallet Data Model (Detail)

```
wallet_balances
├── user_id TEXT (PK)
├── balance_cents BIGINT (real money)
├── bonus_balance_cents BIGINT (bonus funds)
└── updated_at TIMESTAMPTZ

wallet_ledger
├── id BIGSERIAL (PK)
├── user_id TEXT
├── entry_type TEXT (credit/debit)
├── fund_type TEXT DEFAULT 'real' (real/bonus)
├── amount_cents BIGINT (CHECK > 0)
├── balance_cents BIGINT (running balance)
├── idempotency_key TEXT
├── reason TEXT
├── transaction_time TIMESTAMPTZ
└── UNIQUE (entry_type, user_id, idempotency_key)

wallet_reservations
├── id BIGSERIAL (PK)
├── user_id TEXT
├── amount_cents BIGINT
├── reference_type TEXT (bet/withdrawal)
├── reference_id TEXT
├── status TEXT (held/captured/released/expired)
├── created_at, expires_at, resolved_at TIMESTAMPTZ
└── UNIQUE (reference_type, reference_id)
```

---

## API Topology

### Gateway Routes (port 18080)

**Public (no auth):**
- `GET /healthz`, `GET /readyz`, `GET /metrics`
- `GET /api/v1/status`
- `/api/v1/auth/*` — proxied to auth service
- `/ws` — WebSocket (own auth)

**Player-facing (auth required):**
- `GET /api/v1/sports`, `GET /api/v1/sports/{key}/leagues`
- `GET /api/v1/events`, `GET /api/v1/events/{id}`
- `GET /api/v1/markets`, `GET /api/v1/markets/{id}`
- `POST /api/v1/bets/place/`, `POST /api/v1/bets/precheck/`
- `GET /api/v1/bets`, `GET /api/v1/bets/{id}`
- `POST /api/v1/bets/cashout/quote`, `POST /api/v1/bets/cashout/accept`
- `GET /api/v1/wallet/{userId}`, `GET /api/v1/wallet/{userId}/ledger`
- `POST /api/v1/payments/deposit`, `POST /api/v1/payments/withdraw`
- `GET /api/v1/loyalty/`, `GET /api/v1/loyalty/ledger/`, `GET /api/v1/loyalty/tiers/`
- `GET /api/v1/leaderboards/`, `GET /api/v1/leaderboards/{id}`
- `GET /api/v1/freebets`, `GET /api/v1/freebets/{id}`
- `GET /api/v1/oddsboosts`, `POST /api/v1/oddsboosts/accept`
- `GET /api/v1/promotions`
- `GET /api/v1/users/{id}/profile`, `PUT /api/v1/users/{id}/profile`
- Compliance: deposit-limit, bet-limit, session-limit, cool-off, self-exclude, KYC

**Admin (role: admin):**
- Wallet: corrections, reconciliation
- Loyalty: adjustments, tiers, rules, accounts
- Users, risk, trading

### Auth Routes (port 18081)

- `POST /api/v1/auth/login`, `/register`, `/refresh`, `/logout`
- `GET /api/v1/auth/session`, `/sessions`
- `DELETE /api/v1/auth/sessions/{id}`
- OAuth: `/oauth/google/start`, `/callback`, `/oauth/apple/start`, `/callback`

---

## Middleware Stack

Request processing order in gateway (`cmd/gateway/main.go`):

```
Request
  │
  ├─ 1. MaxBodySize (1MB limit)
  ├─ 2. Recovery (panic → 500)
  ├─ 3. Metrics (Prometheus counters)
  ├─ 4. AccessLog (structured slog)
  ├─ 5. CSRF (double-submit cookie verify, skip safe methods)
  ├─ 6. Auth (token → /api/v1/auth/session, 30s cache, circuit breaker)
  ├─ 7. SecurityHeaders (CSP, HSTS, X-Frame-Options)
  ├─ 8. RequestID (UUID per request)
  └─ 9. Tracing (OpenTelemetry spans)
```

Auth middleware (`modules/platform/transport/httpx/middleware.go`):
- Extracts token from `access_token` cookie or `Authorization: Bearer` header
- Validates against auth service with 30s in-memory cache (sync.Map)
- Circuit breaker: 5 consecutive failures → open 15s
- Injects `userID`, `username`, `role` into request context

---

## Frontend Structure

### Player App (`talon-backoffice/packages/app/`)

| Layer | Technology | Key Files |
|---|---|---|
| Framework | Next.js 16 App Router | `app/` directory |
| State | Redux Toolkit v1 | `app/lib/store/` — 12 slices (auth, bet, sport, market, fixture, settings, navigation, cashier, siteSettings, channelSubscription, profile, prediction) |
| Server state | React Query | Per-API-client caching (15-60s TTL) |
| API clients | 9 domain clients | `app/lib/api/` — auth, wallet, betting, events, markets, betconstruct, user, loyalty, compliance, leaderboards |
| Real-time | WebSocket | `app/lib/websocket/` — channels for markets, fixtures, wallets, bets |
| Styling | Tailwind CSS | No styled-components (causes webpack hangs) |
| i18n | react-i18next | `public/static/locales/en/` — 60+ namespace files |
| Logging | Structured logger | `app/lib/logger.ts` — dev: console, prod: no-op |

### Backoffice (`talon-backoffice/packages/office/`)

Admin dashboard with: Users, Reports, Audit Logs, Leaderboards, Loyalty, Risk Management, Trading (SettlementPanel).

**Not present:** CMS editor, campaign management, bonus admin, content scheduling.

---

## Bet Placement and Settlement Pipeline

```
Player clicks odds → BetslipProvider.tsx adds selection
         │
         ▼
Player sets stake → [Parlay mode?] → multiply odds across legs
         │
         ▼
precheckBets() → POST /api/v1/bets/precheck/
         │                    │
         │    ┌───────────────┘
         │    ▼
         │  Gateway validates:
         │    - Market still open?
         │    - Odds still valid?
         │    - Compliance limits?
         │    - Sufficient balance?
         │
         ▼
placeBet/placeParlay() → POST /api/v1/bets/place/
         │
         ▼
   Gateway bets/service.go:
     1. Wallet.Hold(stake) — reserve funds
     2. Create Bet record (status: placed)
     3. Apply freebet if attached (FreebetService.ApplyToBet)
     4. Return bet confirmation
         │
         ▼
   Settlement (event-driven from provider feed):
     Provider adapter → StreamSettlement event
         │
         ▼
     bets/service.go Settle():
       For each bet leg:
         1. Resolve market outcome (settlement.go resolvers)
         2. Determine: win / lose / void / push / dead_heat
       Aggregate legs → final bet outcome
         │
         ├─ Win: Wallet.Credit(stake × odds)
         ├─ Lose: Wallet.Capture(reservation)
         ├─ Void: Wallet.Release(reservation)
         ├─ Push: Wallet.Credit(original stake)
         └─ Dead Heat: Wallet.Credit(reduced payout)
         │
         ▼
     WebSocket → notify player (bet status update)
     Loyalty → accrue points (SettlementAccrualRequest)
```

---

## Cashout Flow

```
Player requests cashout → POST /api/v1/bets/cashout/quote
         │
         ▼
   cashout.go QuoteCashout():
     - Provider quote if available
     - Heuristic: 60% of unrealized profit + full stake
     - Returns CashoutQuote with TTL (30s)
         │
         ▼
Player accepts → POST /api/v1/bets/cashout/accept
         │
         ▼
   cashout.go AcceptCashout():
     1. Validate quote not expired
     2. Wallet.Credit(cashout amount)
     3. Bet status → cashed_out
     4. WebSocket → notify
```

---

## Resilience Patterns

| Pattern | Where | Details |
|---|---|---|
| Circuit breaker | Auth middleware | 5 failures → open 15s, half-open probe |
| Rate limiting | Auth service | 10 login/min per username, 3 register/min per IP |
| Idempotency | Wallet mutations | 24h key TTL, DB unique constraint, background eviction |
| Fund reservation | Wallet Hold/Capture/Release | Prevents double-spend; auto-expire stale holds |
| Dead letter queue | Bet settlement | Failed settlements queued for admin retry |
| Fail-closed | Compliance (prod) | Reject all until explicitly configured |
| Negative balance guard | Wallet debit | Post-debit check with revert on memory mode |

---

## What's NOT in the Architecture Today

| Missing Capability | Impact |
|---|---|
| CMS module | No content management — promotions page exists but static |
| Campaign/bonus engine | No campaign lifecycle, no deposit match, no wagering requirements |
| Bonus drawdown logic | Wallet has bonus column but no debit-from-bonus or ordering rules |
| Parlay settlement rules | No reduced-leg handling, no parlay-specific void logic |
| Background job scheduler | Only ad-hoc goroutine tickers, no cron/scheduler framework |
| Event bus (Kafka/NATS) | Synchronous processing only, WebSocket for real-time |
| Content delivery API | No CMS delivery endpoints in gateway |
| Backoffice CMS/campaign UI | Admin has no content or campaign management pages |

---

## File Path Index

1. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/cmd/gateway/main.go`
2. `apps/Phoenix-Sportsbook-Combined/go-platform/services/auth/cmd/auth/main.go`
3. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/wallet/service.go`
4. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/bets/service.go`
5. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/bets/cashout.go`
6. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/freebets/service.go`
7. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/oddsboosts/service.go`
8. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/loyalty/service.go`
9. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/compliance/`
10. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/payments/`
11. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/ws/handler.go`
12. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/provider/runtime.go`
13. `apps/Phoenix-Sportsbook-Combined/go-platform/modules/platform/transport/httpx/middleware.go`
14. `apps/Phoenix-Sportsbook-Combined/go-platform/modules/platform/canonical/v1/types.go`
15. `apps/Phoenix-Sportsbook-Combined/go-platform/modules/platform/canonical/v1/settlement.go`
16. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/migrations/`
17. `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/app/lib/api/`
18. `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/app/lib/store/`
19. `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/app/lib/websocket/`
20. `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/app/components/BetslipProvider.tsx`
21. `services/codex-prep/phoenix-cms/cmd/server/main.go`
22. `services/codex-prep/phoenix-betting-engine/internal/service/service.go`
23. `services/codex-prep/phoenix-settlement/internal/service/service.go`
