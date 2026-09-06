# Taya NA Predict — CLAUDE.md

## Project Overview

**Taya NA Predict** is a prediction event market platform competing with Polymarket and Kalshi. Users trade binary YES/NO contracts (priced 0–100 cents, where price = implied probability) on real-world outcomes: politics, crypto, sports, entertainment, tech, economics.

The project was **forked from Taya Na Sportsbook on 2026-04-16** and transformed: the sports-betting domain (sports/fixtures/markets/selections/bets) was replaced with a prediction-market domain (categories/series/events/markets/orders/positions). Shared infrastructure — auth, wallet/ledger, WebSocket hub, CSRF, OpenTelemetry — was preserved. (Note: Redis backs auth sessions + the auth rate limiter only; the prediction **gateway has no read cache** despite older docs claiming "Redis wraps reads".)

The app has three surfaces:
- **Player app** (Next.js 16 App Router) — discovery, market detail, trade ticket, portfolio
- **Backoffice** (Next.js Pages Router + Ant Design) — market creation, settlement queue, risk, analytics
- **Gateway API + Auth service** (Go) — HTTP+WebSocket API backed by PostgreSQL and Redis

## Repository Structure

Workspace root on this Mac: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/`

```
Taya_Na_Predict/
├── apps/taptrade-platform/
│   ├── frontend/packages/
│   │   ├── app/                           ← Player app (Next.js 16 App Router, local dev port 3010)
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
├── PRODUCT-USER-JOURNEYS.md               ← product spec: implemented user journeys
└── DESIGN.md                              ← prediction design system (1C "lime skin, terminal bones", locked 2026-08-06: paper #F7F7F3 + ink + lime-on-actions-only, Switzer UI + Geist Mono numerals, terminal density, hairlines not shadows). Governs the player app; office migrates in a follow-up sweep. Composition source: Figma "TapTrade Design" (John's private project). READ BEFORE ANY UI CHANGE.
```

## GitHub Repo

- Remote: `https://github.com/jbrackens/TAYA_NA` (branch `main`)
- GitHub user: `jbrackens`
- The sister repo `jbrackens/Taya_Na_Sportsbook` is the on-hold sportsbook. Don't touch it unless the user explicitly asks.

## Agent Branch / Deploy Policy

Active development and demo deployment happen from the primary checkout
(P2-06 consolidated everything onto `main`; the old `-cashier` worktree and
`feat/binary-exchange-engine` deploy branch are retired):

- Checkout: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict`
- Branch: `main` (pushing to it IS the production deploy)
- Deploy workflow: `.github/workflows/deploy-demo.yml`

Before any agent starts edits, and again before any `commit/push/deploy`, run
`scripts/agent-preflight.sh` from the checkout root (verifies checkout, branch,
clean tree, and sync with `origin/main`).

Treat the user phrase `commit/push/deploy` as a strict procedure:

1. Stay in `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict`.
2. Confirm the branch is `main`.
3. Fetch `origin` and refuse if the branch is behind or diverged.
4. Review `git status` and commit only intended files.
5. Run the relevant local validation before committing.
6. Push only `main`.
7. Monitor the GitHub Actions deploy run and smoke-check the demo URLs after success.

Feature work happens on short-lived branches merged into `main`; do not push a
non-`main` branch for deploy purposes unless the user explicitly names that
branch. Do not include unrelated untracked files without explicit user approval.

## Critical Rules

### Never Do These

1. **Never give placeholder paths.** Use real, full paths. The workspace is `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/` — not `~/...` or `your-project/...`.
2. **Never reintroduce sportsbook concepts.** No new code referencing `fixtures`, `selections`, `betslip`, `sport_key`, `punter_bets`, `freebets`, `odds_boosts`, `match_tracker`. This is a prediction market — markets have `yesPriceCents`/`noPriceCents`, not odds; users have positions, not bets.
3. **Never use `@taptrade-ui/design-system` imports in `app/`** — it uses styled-components and causes webpack hangs. Use inline components or Tailwind.
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

**Path:** `apps/taptrade-platform/frontend/packages/app/`

- **Framework:** Next.js 16 with App Router (`app/` directory)
- **React:** 19 — `React.FC` does NOT include `children` prop; add explicitly
- **State:** Redux Toolkit v1 (NOT v2) — use `TypedUseSelectorHook`, NOT `.withTypes()`
- **Store types:** `app/lib/store/hooks.ts` for `useAppDispatch` / `useAppSelector`
- **Server state:** React Query
- **Styling:** Tailwind CSS + inline styles (NO styled-components in app/)
- **Logging:** `app/lib/logger.ts` — structured logger (dev: console with `[context]` prefix, prod: no-op)
- **WebSocket:** `app/lib/websocket/` — real-time market prices and portfolio updates (subscribe to `market:<id>`, `portfolio:<userId>`, `trades:<marketId>`)
- **API client:** `@taptrade-ui/api-client/src/prediction-client.ts` — `PredictionApiClient`
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

**Path:** `apps/taptrade-platform/frontend/packages/office/`

- **Framework:** Next.js with Pages Router (NOT App Router) — but a parallel App Router tree under `app/` exists for newer admin pages (dashboard, audit-logs, trading, users). Both routers coexist.
- **UI:** Ant Design 5.x (`^5.29`) + styled-components, both wired to the **legacy P8-named design tokens** (values P9-swapped 2026-07-07; the 1C sweep per DESIGN.md §0 scope note is pending for office). Stylesheet stack: `antd/dist/antd.css` → `styles/p8-tokens.css` (declares `--bg-deep` / `--surface-1/2` / `--border-1/2` / `--t1..4` / `--yes-text` / `--no-text` / `--focus-ring` / `--accent[*]` / `--r-rh-*`) → `styles/p8-antd.css` (overrides AntD component classes against the tokens). New styling work MUST reference these CSS custom properties — DO NOT introduce hex literals.
- **API:** shared `useApi` hook via `services/api/api-service`
- **Auth:** securedPage wrapper with PunterRoleEnum (ADMIN, TRADER, OPERATOR)

### Prediction admin pages

- `pages/prediction-admin/markets.tsx` — market list, create, lifecycle transitions (open/halt/close)
- `pages/prediction-admin/settlements.tsx` — settlement queue, manual resolve with attestation
- Containers: `containers/prediction-markets/` and `containers/prediction-settlements/`

## Back-office RBAC (Access Control)

Staff authorization for the back-office, distinct from `punters` (customers) and
the auth service's `auth_users` (player login). Schema in migration
`027_rbac_admin.sql`: `admin_users` (gateway-owned staff directory, bcrypt
password), `roles`, `permissions`, and the `user_roles` / `role_permissions`
join tables. Seeded roles: Super Admin, Operations Manager, Customer Support;
granular permissions like `users:read/write`, `roles:read/write`,
`markets:read/edit`, `settlements:resolve`, `finances:view`.

- **UI:** `office/app/(dashboard)/access-control/` → `office/app/components/access-control/`
  (User Management tab: table, Create User, Edit Roles, suspend/activate,
  reset password, delete; Role Matrix tab: roles × permissions checkbox grid).
- **API:** `/api/v1/admin/users` (GET/POST), `/api/v1/admin/users/{id}/{roles,status,password}` (PUT),
  `/api/v1/admin/users/{id}` (DELETE), `/api/v1/admin/roles` (GET),
  `/api/v1/admin/roles/{id}/permissions` (PUT). Code: `internal/rbac/` +
  `internal/http/rbac_admin_handlers.go`.
- **Enforcement:** every endpoint runs `requireAdminRole` (session role==admin)
  then `requireRBACPermission`, which resolves the caller's email →
  `admin_users` → roles → permissions (active users only; suspended/unknown get
  none). Dev bypass: `GATEWAY_ALLOW_ADMIN_ANON=true` (refused at boot in
  prod/staging).
- **Login:** the auth service `Login` falls back to authenticating against
  `admin_users` (active, role=admin), so a staff member created via Create User
  signs in with their temporary password — no separate `auth_users` row needed
  (`services/auth/.../handlers.go` `lookupAdminUser`).
- **Safety invariants:** the `super-admin` role is immutable via the API; an
  actor can only assign roles / grant permissions within their own set; the last
  active super-admin cannot be role-stripped, suspended, or deleted; an actor
  cannot suspend or delete their own account.
- **Dev bootstrap staff** (dev-only, via `cmd/seed` → `seed_prediction.sql`):
  `admin@taptrade.local` (Super Admin), `ops@taptrade.local` (Operations Manager),
  `support@taptrade.local` (Customer Support) — all password `admin123`.
- **Prod bootstrap** (prod is fail-closed: the migration seeds no staff): run
  `gateway rbac-bootstrap` once with `RBAC_BOOTSTRAP_EMAIL` +
  `RBAC_BOOTSTRAP_PASSWORD` (+ `GATEWAY_DB_DSN`) to create the first super-admin.

## Tech Stack — Go Backend

**Path:** `apps/taptrade-platform/go-platform/services/gateway/`

- **Language:** Go 1.25 (module `taptrade/gateway`)
- **HTTP:** stdlib `net/http` + custom `httpx` middleware
- **DB:** PostgreSQL 16 via `lib/pq`, migrations via `pressly/goose/v3`
- **Cache:** none in the gateway (no read cache; Redis is auth-only). The gateway's `REDIS_URL`/`Redis` references are vestigial from the sportsbook fork.
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
- `internal/compliance/kyc_postgres.go` + `idv.go` — DB-backed KYC + pluggable IDV provider (manual review default; vendor seam)
- `internal/compliance/rg_postgres.go` — DB-backed responsible-gambling limits + atomic bet-limit gate
- `internal/payments/crypto_rail.go` — on-chain (USDC) deposit/withdrawal adapter (fails closed until configured)
- `internal/notify/notify.go` — out-of-band notification channel (SMTP + log fallback)

## Local Development

### One-time setup

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/taptrade-platform

# Start Postgres (port 5434 to avoid colliding with any sportsbook container)
docker compose up -d postgres

# Run migrations
cd go-platform/services/gateway
export GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable"
export MIGRATIONS_DIR="$(pwd)/migrations"
go run ./cmd/migrate up

# Seed test data (7 categories, 18 events, 152 markets, 4 test users)
go run ./cmd/seed
```

Three seed modes:

- `go run ./cmd/seed` (default `-mode base`) — categories, events, markets, users, wallets only. Empty order books on `execution_mode=order_book` markets.
- `make demo-data` (`-mode demo`) — base seed + Phase 0-5 demo state for clickable demos. Phases:
  1. **Phase 0** — cancels stale `pending` orders, removes any prior demo rows
  2. **Wallet top-up** — u-1 / alice / bob / charlie to $5,000 each, bot to $50,000
  3. **Phase 1** — market-maker book: 5-level YES + NO bids on every order_book market via `user-bot`. Fixes "no matching liquidity" for taker market orders.
  4. **Phase 2** — synthetic taker volume: ~870 market BUYs from alice/bob/charlie across 30 markets, backdated 30 days
  5. **Phase 3** — skipped (charts are client-side synthetic walks, no backend history needed)
  6. **Phase 4** — demo user (u-1) opens 12 positions across categories with varied PnL
  7. **Phase 5** — settles 3 markets (SENATE-DEM-2026 YES, GPT5-JUL26 NO, UCL-CITY-2526 NO) so History + Leaderboards are populated
- `make wipe-demo` (`-mode wipe`) — removes only the rows demo phases wrote (idempotency_key LIKE 'demo:%', attestation_source='demo', trade_kind='demo_history'). Base seed rows untouched. Re-runnable.

All demo writes go through `Service.PlaceOrder` and `Service.ResolveMarket` — same path as live HTTP requests — so the ledger stays consistent and the reconciler reads clean.

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

# Player app (local dev port 3010 — 3000 is taken by an unrelated project)
cd ../../../frontend/packages/app
NEXT_PUBLIC_API_URL=http://localhost:18080 npx next dev --webpack -p 3010

# Backoffice (port 3001)
cd ../office
npm run dev
```

### Ports

| Service | Port | Notes |
|---------|------|-------|
| Player app (Next.js) | 3010 | 3000 is occupied by an unrelated local project; root `.claude/launch.json` pins 3010 |
| Backoffice (Next.js) | 3001 | |
| Go Gateway | 18080 | |
| Go Auth Service | 18081 | |
| PostgreSQL (Docker) | 5434 | 5432 is the sportsbook container, 5433 is swarmqa |
| Redis (Docker) | 6380 | 6379 is the sportsbook container |

### Test credentials

**Active login:** `demo@taptrade.local` / `demo123`

> **Local drift notes (observed 2026-07, unresolved at the 2026-09 hold):** if
> `demo@taptrade.local` is rejected against your local DB, use
> `alice@predict.dev` / `predict123`. Separately, the dockerized gateway image
> can go stale (market buys return 400): rebuild it, or run the gateway from
> source (`go run ./cmd/gateway`) when trading locally.

The auth service (port 18081) auto-seeds `demo@taptrade.local` / `demo123` (player role) and `admin@taptrade.local` / `admin123` (admin role) into the `auth_users` table on startup. These are the only credentials the player app can log in with out of the box.

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

The `frontend/` directory is a yarn-workspaces monorepo (`workspaces: ["packages/**/*"]` in `package.json`, `engines: { yarn: ">=1.22.22 <2" }`). Run `yarn install --frozen-lockfile` from `frontend/`, not from any sub-package. CI does the same — see `.github/workflows/test.yml`.

Older notes recommended `npm install --legacy-peer-deps` from the app sub-directory; that path hangs in CI for hours because npm doesn't detect the workspace declaration up-tree. Yarn install at the workspace root completes in ~6 seconds.

## Environment Variables

```
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:18080
NEXT_PUBLIC_AUTH_URL=http://localhost:18081
NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws

# Frontend feature flags (see app/lib/features.ts) — default off, set "true" to enable
NEXT_PUBLIC_FEATURE_RG=        # responsible-gambling pages (rg-history, self-exclude, /responsible-gaming/)
NEXT_PUBLIC_FEATURE_KYC=       # KYC / identity verification surface on /profile/
NEXT_PUBLIC_FEATURE_LIMITS=    # user-set deposit/stake/session limits — Limits tab on /profile/
NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS= # demo boxes ONLY: synthetic-walk chart fallback while loading/error/flat; real deploys show honest states

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

# Gateway — build-out activation knobs (all default OFF / fail-closed; the
# commented block in docker-compose.demo.yml is the canonical reference)
SMM_ENABLED=true                # synthetic market maker: dynamic two-sided liquidity
STARTER_GRANT_CENTS=            # >0 enables the play-money faucet (one grant/user); MUST be 0 for real money
KYC_IDV_PROVIDER=               # ''/'manual' = back-office review; else a vendor (needs KYC_IDV_API_KEY)
KYC_ENFORCEMENT=                # 'true' gates withdrawals above KYC_WITHDRAWAL_THRESHOLD_CENTS
KYC_REQUIRED_FOR_TRADING=       # 'true' requires verified identity to trade
# Deny-by-default boot policy (ENVIRONMENT=production/staging, not acked-permissive):
# boot REQUIRES GEO_GATE_ENABLED=true + non-empty GEO_ALLOWED_COUNTRIES (allowlist
# mode mandatory) and each KYC flag above either 'true' or explicitly acked off:
KYC_ENFORCEMENT_ACK_DISABLED=          # 'true' = deliberately run without the withdrawal KYC gate
KYC_REQUIRED_FOR_TRADING_ACK_DISABLED= # 'true' = deliberately run without trading KYC
# BETA_COMPLIANCE_MODE=permissive is INVALID in production (boot error); staging/demo
# only, with COMPLIANCE_STARTUP_ACK=true.
CRYPTO_RPC_URL=                 # crypto rail stays fail-closed until RPC + contract + address source are set
CRYPTO_ASSET_CONTRACT=
CRYPTO_DEPOSIT_ADDRESS_SOURCE=
GEO_GATE_ENABLED=               # 'true' enforces jurisdiction on trade + deposit + withdraw (needs an edge country header, e.g. CF-IPCountry)
GEO_ALLOWED_COUNTRIES=          # comma-separated ISO-3166 allowlist; required in prod/staging
GEO_TRUSTED_PROXY_MODE=         # 'require' = edge always sets the header; missing-signal denials log Error + counter
EDGE_SHARED_SECRET=             # anti-spoof (SEC-03): with TRUSTED_PROXY_MODE=require, money-path requests must carry this secret (stamped by Caddy as X-Edge-Auth) or be denied — blocks direct-to-origin geo bypass. REQUIRED in prod/staging when require-mode is on (boot fails otherwise). Bind gateway :18080 to loopback so only the edge can reach it.
SMTP_HOST=                      # set to send resolution emails; otherwise notifications log

# Auth service — Social OAuth (full reference: go-platform/services/auth/.env.example).
# Each provider is OFF until its CLIENT_ID (TikTok: CLIENT_KEY) is set. Google /
# Discord assert a verified email (auto-link enabled); Facebook returns an email but
# no verified claim, so it is treated as unverified (isolated account, no auto-link);
# X / TikTok / Reddit return no email (isolated identity accounts). Each *_REDIRECT_URI must be
# registered in the provider console and be same-origin with the player app so the
# session cookies land on the right origin.
AUTH_FRONTEND_URL=http://localhost:3000   # where OAuth callbacks send the user post-login
GOOGLE_OAUTH_CLIENT_ID=         # + GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REDIRECT_URI
FACEBOOK_OAUTH_CLIENT_ID=       # + FACEBOOK_OAUTH_CLIENT_SECRET / FACEBOOK_OAUTH_REDIRECT_URI
DISCORD_OAUTH_CLIENT_ID=        # + DISCORD_OAUTH_CLIENT_SECRET / DISCORD_OAUTH_REDIRECT_URI
TWITTER_OAUTH_CLIENT_ID=        # X (Twitter), PKCE: + TWITTER_OAUTH_CLIENT_SECRET / TWITTER_OAUTH_REDIRECT_URI
TIKTOK_OAUTH_CLIENT_KEY=        # TikTok: + TIKTOK_OAUTH_CLIENT_SECRET / TIKTOK_OAUTH_REDIRECT_URI
REDDIT_OAUTH_CLIENT_ID=         # + REDDIT_OAUTH_CLIENT_SECRET / REDDIT_OAUTH_REDIRECT_URI
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
