# Taya NA Predict — CLAUDE.md

## Project Overview

**Taya NA Predict** is a prediction event market platform competing with Polymarket and Kalshi. Users trade binary YES/NO contracts (priced 0–100 cents, where price = implied probability) on real-world outcomes: politics, crypto, sports, entertainment, tech, economics.

The project was **forked from Taya Na Sportsbook on 2026-04-16** and transformed: the sports-betting domain (sports/fixtures/markets/selections/bets) was replaced with a prediction-market domain (categories/series/events/markets/orders/positions). Shared infrastructure — auth, wallet/ledger, WebSocket hub, CSRF, Redis cache, OpenTelemetry — was preserved.

The app has three surfaces:
- **Player app** (Next.js 16 App Router) — discovery, market detail, trade ticket, portfolio
- **Backoffice** (Next.js Pages Router + Ant Design) — market creation, settlement queue, risk, analytics
- **Gateway API + Auth service** (Go) — HTTP+WebSocket API backed by PostgreSQL and Redis

## Repository Structure

Workspace root on this Mac: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/`

```
Taya_Na_Predict/
├── apps/Phoenix-Predict-Combined/
│   ├── talon-backoffice/packages/
│   │   ├── app/                           ← Player app (Next.js 16 App Router, port 3000)
│   │   ├── office/                        ← Admin backoffice (Next.js Pages Router, port 3001)
│   │   └── api-client/                    ← Shared TS API client
│   ├── go-platform/
│   │   ├── services/gateway/              ← API gateway (Go, port 18080)
│   │   │   ├── cmd/gateway/               ← gateway binary
│   │   │   ├── cmd/migrate/               ← goose migration runner
│   │   │   ├── cmd/seed/                  ← seed loader
│   │   │   ├── internal/prediction/       ← prediction domain (types, AMM, lifecycle, settlement, repo, workers, feeds)
│   │   │   ├── internal/wallet/           ← wallet + ledger (kept from sportsbook, adapted)
│   │   │   ├── internal/ws/               ← WebSocket hub
│   │   │   ├── internal/http/             ← HTTP handlers
│   │   │   ├── migrations/                ← 014_prediction_schema.sql is the key one
│   │   │   └── seed-data/seed_prediction.sql
│   │   ├── services/auth/                 ← Auth service (Go, port 18081)
│   │   └── modules/platform/              ← Shared Go libraries (canonical, httpx, runtime, tracing)
│   └── docker-compose.yml                 ← PostgreSQL (5434) + Redis (6380) + services
├── reference/v2-prediction/               ← Old v2 prediction prototype kept for reference
├── CLAUDE.md                              ← this file
├── DESIGN.md                              ← prediction design system (dark broadcast, Outfit + IBM Plex Mono, neon phoenix green #39ff14 accent + two-greens discipline) — READ BEFORE ANY UI CHANGE
├── DESIGN-SPORTSBOOK.md                   ← archived sportsbook spec (backoffice still uses this)
└── PRIMER.md                              ← session primer (older — parts are out of date)
```

## GitHub Repo

- Remote: `https://github.com/jbrackens/TAYA_NA` (branch `main`)
- GitHub user: `jbrackens`
- The sister repo `jbrackens/Taya_Na_Sportsbook` is the on-hold sportsbook. Don't touch it unless the user explicitly asks.

## Critical Rules

### Never Do These

1. **Never give placeholder paths.** Use real, full paths. The workspace is `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/` — not `~/...` or `your-project/...`.
2. **Never reintroduce sportsbook concepts.** No new code referencing `fixtures`, `selections`, `betslip`, `sport_key`, `punter_bets`, `freebets`, `odds_boosts`, `match_tracker`. This is a prediction market — markets have `yesPriceCents`/`noPriceCents`, not odds; users have positions, not bets.
3. **Never use `@phoenix-ui/design-system` imports in `app/`** — it uses styled-components and causes webpack hangs. Use inline components or Tailwind.
4. **Never introduce `console.log/warn/error` in production code.** Use the structured `logger` from `app/lib/logger.ts`.
5. **Never use `any` type.** Use `unknown`, proper interfaces, or `Record<string, unknown>`.
6. **Never suppress TypeScript errors** with `@ts-nocheck`, `@ts-ignore`, or `as any`.
7. **Never declare something "done" if it uses mock/hardcoded data.** Either wire it to the real API or explicitly mark it STUB in the commit message.

### Always Do These

1. **Use real paths** when giving the user instructions. The Mac workspace is `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/`.
2. **Fix errors at the root, don't work around them.** Zero bug policy.
3. **Keep the `prediction` Go package decoupled from `wallet`.** It uses the `prediction.WalletAdapter` interface — the concrete bridge lives in `internal/http/prediction_wallet_adapter.go`. Don't import `wallet` from `prediction/`.
4. **New tables/columns** go through a new goose migration file (`015_*.sql`, etc.) — don't edit 014 in place once it's shipped.

## Domain Model

The prediction hierarchy (inspired by Kalshi):

```
Category        (politics, crypto, sports, entertainment, tech, economics)
  └── Series    (recurring template, e.g. "Fed Rate Decisions")
        └── Event    (specific occurrence, e.g. "May 2026 FOMC")
              └── Market   (binary contract, e.g. "Fed cuts at May FOMC")
                    └── Orders / Positions / Trades / Settlement
```

Multi-outcome events (e.g. "UCL 2025/26 Winner") decompose into **N binary markets** (one per candidate outcome) rather than introducing combinatorial matching.

Prices are **cents, 0–99** — always enforced by CHECK constraints and the invariant `yes_price_cents + no_price_cents = 100`. Winners pay 100¢ per contract at settlement; losers pay 0.

## Tech Stack — Player App

**Path:** `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/`

- **Framework:** Next.js 16 with App Router (`app/` directory)
- **React:** 19 — `React.FC` does NOT include `children` prop; add explicitly
- **State:** Redux Toolkit v1 (NOT v2) — use `TypedUseSelectorHook`, NOT `.withTypes()`
- **Store types:** `app/lib/store/hooks.ts` for `useAppDispatch` / `useAppSelector`
- **Server state:** React Query
- **Styling:** Tailwind CSS + inline styles (NO styled-components in app/)
- **Logging:** `app/lib/logger.ts` — structured logger (dev: console with `[context]` prefix, prod: no-op)
- **WebSocket:** `app/lib/websocket/` — real-time market prices and portfolio updates (subscribe to `market:<id>`, `portfolio:<userId>`, `trades:<marketId>`)
- **API client:** `@phoenix-ui/api-client/src/prediction-client.ts` — `PredictionApiClient`
- **Testing:** Node.js built-in test runner (`node:test`)

### Prediction pages (active)

- `app/predict/page.tsx` — discovery (featured, trending, closing soon, recent)
- `app/market/[ticker]/page.tsx` — market detail + trade ticket
- `app/portfolio/page.tsx` — positions, orders, history, accuracy %
- `app/category/[slug]/page.tsx` — markets filtered by category
- `app/components/prediction/MarketCard.tsx`, `TradeTicket.tsx`, `CategoryPills.tsx`

### Prediction Redux slices

- `lib/store/predictionMarketSlice.ts` — markets + price movement indicators
- `lib/store/orderSlice.ts` — orders, positions, portfolio summary
- `lib/store/categorySlice.ts` — categories and active filter

## Tech Stack — Backoffice

**Path:** `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/`

- **Framework:** Next.js with Pages Router (NOT App Router)
- **UI:** Ant Design + styled-components
- **API:** shared `useApi` hook via `services/api/api-service`
- **Auth:** securedPage wrapper with PunterRoleEnum (ADMIN, TRADER, OPERATOR)

### Prediction admin pages

- `pages/prediction-admin/markets.tsx` — market list, create, lifecycle transitions (open/halt/close)
- `pages/prediction-admin/settlements.tsx` — settlement queue, manual resolve with attestation
- Containers: `containers/prediction-markets/` and `containers/prediction-settlements/`

## Tech Stack — Go Backend

**Path:** `apps/Phoenix-Predict-Combined/go-platform/services/gateway/`

- **Language:** Go 1.25 (module `phoenix-revival/gateway`)
- **HTTP:** stdlib `net/http` + custom `httpx` middleware
- **DB:** PostgreSQL 16 via `lib/pq`, migrations via `pressly/goose/v3`
- **Cache:** Redis (optional, wraps reads)
- **WebSocket:** hub with typed notifiers (see `internal/ws/notifier.go` and `internal/ws/hub.go`)
- **Auth:** JWT cookies via auth service proxy; `httpx.Auth` middleware checks the `publicPrefixes` list in `cmd/gateway/main.go`
- **AMM:** LMSR in `internal/prediction/amm.go` — cost function `C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))`, unified book from day 1 (market+limit order types in schema)
- **Background workers:** `MarketCloser` (30s tick, closes markets past `close_at`) and `AutoSettler` (60s tick, auto-settles with feed adapters)

### Key files to know

- `internal/prediction/types.go` — all domain types and API request/response shapes
- `internal/prediction/service.go` — business logic entrypoint; `PlaceOrder` + `ResolveMarket` flows
- `internal/prediction/amm.go` — pricing engine
- `internal/prediction/settlement.go` — settlement + void + payout
- `internal/prediction/sql_repository.go` — PostgreSQL implementation of `Repository`
- `internal/prediction/wallet_adapter.go` — interface that keeps prediction decoupled from wallet
- `internal/http/handlers.go` — top-level route registration
- `internal/http/prediction_handlers.go` — public + authenticated prediction routes
- `internal/http/bot_handlers.go` — bot API with API-key auth
- `internal/http/prediction_wallet_adapter.go` — bridges `wallet.Service` → `prediction.WalletAdapter`

## Local Development

### One-time setup

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined

# Start Postgres (port 5434 to avoid colliding with any sportsbook container)
docker compose up -d postgres

# Run migrations
cd go-platform/services/gateway
export GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable"
export MIGRATIONS_DIR="$(pwd)/migrations"
go run ./cmd/migrate up

# Seed test data (6 categories, 11 events, 15 markets, 4 test users)
go run ./cmd/seed
```

### Running services

```bash
# Gateway (port 18080)
GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable" \
WALLET_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable" \
WALLET_STORE_MODE=db \
GATEWAY_PORT=18080 \
GATEWAY_READ_REPO_MODE=db \
PAYMENTS_WEBHOOK_SECRET=whsec_local \
go run ./cmd/gateway

# Auth service (port 18081) — needed for authenticated endpoints
cd ../auth
AUTH_STORE_MODE=db \
AUTH_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable" \
AUTH_COOKIE_SECURE=false \
go run ./cmd/auth

# Player app (port 3000)
cd ../../../talon-backoffice/packages/app
NEXT_PUBLIC_API_URL=http://localhost:18080 npm run dev

# Backoffice (port 3001)
cd ../office
npm run dev
```

### Ports

| Service | Port | Notes |
|---------|------|-------|
| Player app (Next.js) | 3000 | |
| Backoffice (Next.js) | 3001 | |
| Go Gateway | 18080 | |
| Go Auth Service | 18081 | |
| PostgreSQL (Docker) | 5434 | 5432 is the sportsbook container, 5433 is swarmqa |
| Redis (Docker) | 6380 | 6379 is the sportsbook container |

### Test credentials

**Active login:** `demo@phoenix.local` / `demo123`

The auth service (port 18081) auto-seeds `demo@phoenix.local` / `demo123` (player role) and `admin@phoenix.local` / `admin123` (admin role) into the `auth_users` table on startup. These are the only credentials the player app can log in with out of the box.

The `punters`/`wallets` test users below are seeded by `go run ./cmd/seed` for prediction-side data (positions, orders, wallet balances) but **are not yet wired into the auth service's `auth_users` table**. To log in as them, register via `POST /api/v1/auth/register` with the matching email, or add them to the auth service's seed helper (see `services/auth/internal/http/handlers.go` `seedDBUsers`).

| User | Role | Wallet balance (prediction seed) |
|------|------|---------------------------------:|
| `alice@predict.dev` / `predict123` | player | $1,000.00 |
| `bob@predict.dev` / `predict123` | player | $500.00 |
| `charlie@predict.dev` / `predict123` | player | $2,500.00 |
| `bot@predict.dev` / `predict123` | bot | $10,000.00 |

### Known macOS Issue — Brotli

If `npm install` crashes with `libbrotlicommon.1.dylib` code signature error:
```bash
codesign --force --sign - /opt/homebrew/lib/libbrotlicommon.1.dylib
codesign --force --sign - /opt/homebrew/lib/libbrotlidec.1.dylib
codesign --force --sign - /opt/homebrew/lib/libbrotlienc.1.dylib
```
On Intel Macs: check `/usr/local/lib/` instead of `/opt/homebrew/lib/`.

### Use yarn at the workspace root

The `talon-backoffice/` directory is a yarn-workspaces monorepo (`workspaces: ["packages/**/*"]` in `package.json`, `engines: { yarn: ">=1.22.22 <2" }`). Run `yarn install --frozen-lockfile` from `talon-backoffice/`, not from any sub-package. CI does the same — see `.github/workflows/test.yml`.

Older notes recommended `npm install --legacy-peer-deps` from the app sub-directory; that path hangs in CI for hours because npm doesn't detect the workspace declaration up-tree. Yarn install at the workspace root completes in ~6 seconds.

## Environment Variables

```
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:18080
NEXT_PUBLIC_AUTH_URL=http://localhost:18081
NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws

# Gateway
GATEWAY_DB_DSN=postgres://...
WALLET_DB_DSN=postgres://...    # same DB, separate env (wallet service reads its own)
WALLET_STORE_MODE=db            # 'db' | 'memory' (default: memory)
GATEWAY_READ_REPO_MODE=db       # 'db' | 'memory'
PAYMENTS_WEBHOOK_SECRET=whsec_local
GATEWAY_DB_DRIVER=postgres
REDIS_URL=redis://localhost:6380/0
AUTH_SERVICE_URL=http://localhost:18081
AUTH_COOKIE_SECURE=false        # required for localhost HTTP
```

## Public API Prefixes

Unauthenticated read-only endpoints — kept in sync with `cmd/gateway/main.go` `publicPrefixes`:

- `/healthz`, `/readyz`, `/metrics`, `/api/v1/status`
- `/api/v1/auth/`, `/auth/` (login/register/refresh proxy)
- `/ws` (WebSocket has its own auth)
- `/api/v1/content/`, `/api/v1/banners` (CMS)
- `/api/v1/discovery`, `/api/v1/categories`, `/api/v1/events`, `/api/v1/markets`
- `/api/v1/bot/` (bot API has its own API-key auth via `prediction.BotAuthMiddleware`)

Everything else requires a valid session cookie.

## Key Patterns

### Error Handling (TypeScript)

```typescript
// CORRECT — catch with unknown, type-check before use
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error('Context', 'What failed', message);
}

// WRONG — never use any in catch blocks
catch (err: any) { ... }
```

### Logger Usage (TypeScript)

```typescript
import { logger } from '../lib/logger';
logger.error('Auth', 'Session check failed', err);
logger.info('WebSocket', 'Subscribed to channel', channelId);
```

### WalletAdapter pattern (Go)

The `prediction` package never imports `wallet` directly. Instead it depends on the `WalletAdapter` interface:

```go
type WalletAdapter interface {
    Debit(userID string, amountCents int64, idempotencyKey, reason string) error
    Credit(userID string, amountCents int64, idempotencyKey, reason string) error
    Balance(userID string) int64
}
```

The concrete bridge lives in `internal/http/prediction_wallet_adapter.go`. Tests use `fakeWallet` (see `wallet_wiring_test.go`). This keeps the prediction domain replaceable.

### Idempotency keys for wallet ops

Every wallet mutation uses a scoped idempotency key:
- Order debit: `prediction_order:<idempotencyKey>`
- Order refund on AMM reject: `prediction_order:<idempotencyKey>:refund`
- Settlement credit: `prediction_payout:<settlementID>:<positionID>`
- Void refund: `prediction_void:<marketID>:<positionID>`

This makes re-running a settle operation (or retrying a failed order) safe.

### Market lifecycle state machine

`internal/prediction/lifecycle.go` enforces valid transitions:

```
unopened → open | voided
open     → halted | closed | voided
halted   → open | closed | voided
closed   → settled | voided
settled  → (terminal)
voided   → (terminal)
```

Event status has a parallel FSM. Use `prediction.TransitionMarket()` / `CanTransition()`.

### Deterministic seed UUIDs

Seed data uses `md5(slug)::uuid` so `'series-btc-daily'` always maps to the same UUID. This makes re-running seeds safe (`ON CONFLICT DO NOTHING`) and lets integration tests reference markets by slug.

## Quality Standards

- 0 `any` types — use `unknown` or proper interfaces
- 0 `console.*` statements in TS production code — use `logger`
- 0 hardcoded user-facing strings — extract to i18n locale files (when the player app is internationalized)
- All catch blocks use `(err: unknown)` with `instanceof Error` checks
- All Go packages that touch the DB are testable via `Repository` interfaces + fakes
- Full build (`go build ./...` in gateway) and full tests (`go test ./...`) must pass before committing

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
