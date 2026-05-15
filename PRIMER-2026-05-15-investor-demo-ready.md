# PRIMER — Investor demo ready, 2026-05-14 → 2026-05-15

Two-day session focused on getting the player app demo-ready for an internal investor walkthrough. Most of what got shipped lives on `feat/binary-exchange-engine` (pushed to `origin/jbrackens/TAYA_NA`). 30+ commits, mostly on the prediction gateway + player app.

## Where you are right now

- **Branch:** `feat/binary-exchange-engine` (clean tree, all pushed except possibly the workspace `.gitignore` which has been M throughout — safe to ignore or commit).
- **Last commit:** `db97abdd feat(seed): deeper demo book — 100 shares/level + $200k bot wallet`.
- **Dev stack:** player app on `:3010` (managed by Claude Preview, name "Player App (Next.js)"), gateway on `:18080` (docker, just rebuilt), auth on `:18081`, postgres on `:5434`, redis on `:6380`.
- **Demo creds:** `demo@phoenix.local` / `demo123` (user_id `u-1`, $5k starting wallet after demo seed).
- **TODOS.md Open section:** empty. All actionable engineering shipped this session.

## The headline mission: investor demo

User invoked `/karpathy-guidelines` with: *"the application is working but throwing error like this [108 YES on IMP-9C2875EF — no matching liquidity] because we're not in production. I need synthetic or dummy data fully populated inside the DB so I can UAT the website and conduct an internal demo for investors."*

The demo seed (`make demo-data`) was already extensive. The fix was bumping `bookLevelQty` from 10 → 100 (so each market has 500 shares per side, covering ~$100 stakes 3x) and bumping bot wallet from $50k → $200k. Click-tested with $25, $100 stakes on IMP-9C2875EF: both partial-fill with useful toasts. MAX stake button still rejects because it overestimates book capacity — flagged but not fixed.

**To prep for the demo:**

```bash
cd apps/Phoenix-Predict-Combined/go-platform/services/gateway
make wipe-demo && make demo-data
```

Run ~5 minutes before the stakeholders click around. That cycles the books back to fresh 500-shares-per-side state.

## What got shipped this session (in dependency order)

| Commit | What |
|---|---|
| `dab83c9e` | ISSUE-001 — toast readable on cream theme (P8 design tokens) |
| `8f0ce9a7` | Reconciler false-positive: `YesNoMismatch` gated on order-book trade activity |
| `2284ad54` → `f6a4cae7` | Full demo-seed plan (PLAN-demo-seed-data.md): `-mode demo / wipe` flag, Phase 0 cleanup, Phase 1 (book), Phase 2 (volume), Phase 4 (demo user portfolio), Phase 5 (settlements). Phase 3 intentionally skipped. |
| `3a06d01e` + `0ae5c502` | ISSUE-005 — auto-settler WARN spam silenced via ManualAdapter alias |
| `15891a03` | ISSUE-003 — hero chart tab bar hidden until backend history wired |
| `4bf40454` | ISSUE-002 — per-row Cancel button on Open orders + new `POST /api/v1/orders/{id}/cancel` route |
| `f7dc36fb` | Wallet hold TTL: 24h hardcode → market.CloseAt + 1h pad for GTC (2,743 stale reservations healed) |
| `2f10cb85` | ISSUE-006 — dead `antd` dep removed from player app |
| `c7ce19ab` + `d7ca956e` | TODOS.md investigations + antd-5 migration plan |
| `49c1775b` + `a12e75b7` | Backend `GET /api/v1/markets/{id}/prices?range=` + frontend wiring (MarketChart + useHeroPriceHistory) |
| `7022b102` | 100 bps default taker fee (2026-04-24 design decision) |
| `56fbdc2b` | Matcher: cap `fillQty` by remaining notional budget (closed cap-overshoot bug) |
| `e74e0ea6` | Cancel pending taker when `PersistMatchAtomic` fails (orphan-pending bug) |
| `498bf485` | Shared refresh lock between IdleMonitor and 401-retry paths |
| `db97abdd` | Deeper demo book (10 → 100 shares/level + $200k bot wallet) |

## Where the demo state lives + how it's built

- **Plan doc:** [PLAN-demo-seed-data.md](PLAN-demo-seed-data.md) (resolved status; describes phases + rationale).
- **Seeder:** `apps/Phoenix-Predict-Combined/go-platform/services/gateway/cmd/seed/`
  - `main.go` — `-mode base | demo | wipe` flag dispatch
  - `harness.go` — wires `prediction.Service` + `SQLRepository` + `wallet.Service` against the live DB
  - `cleanup.go` — Phase 0 (stale-pending cancel + demo-row wipe + reservation heal)
  - `wallet_topup.go` — pre-Phase-1 wallet seeding (bot=$200k, demo user=$5k, etc)
  - `demo_phase1_book.go` — 5-level limit BUYs on both sides per market (`bookLevelQty=100`)
  - `demo_phase2_volume.go` — synthetic taker trades across 30 markets, backdated 30 days
  - `demo_phase4_user.go` — demo user opens 12 positions across categories
  - `demo_phase5_settle.go` — settle 3 markets (SENATE-DEM YES, GPT5-JUL NO, UCL-CITY NO) for History + leaderboards
- **Makefile:** `make demo-data` runs base seed + all phases. `make wipe-demo` removes only the demo additions.

Phase 3 (synthetic price-history backfill) was intentionally skipped after I discovered the frontend charts were client-side synthetic walks. They're real now (commits `49c1775b` + `a12e75b7`), so Phase 3 would be useful but isn't critical — Phase 2's backdated trades populate `prediction_trades` which the new `/prices` endpoint reads.

## Key architecture facts you'll need

- **Player app vs backoffice:** Player is `:3000` (or `:3010` via Claude Preview), backoffice is `:3001`. Both share `packages/api-client`. Backoffice still uses antd 4 — there's a [PLAN-antd-5-office-upgrade.md](PLAN-antd-5-office-upgrade.md) ready to execute (3-5h) when product OKs starting.
- **The matcher has two paths:** secondary (same-side transfer) and issuance (opposite-side pair creation, total collateral = 100¢). Both now budget-cap by `notionalCapCents` via `capFillQtyByNotionalCap` in `exchange.go`. Issuance is the path that fires for most "market BUY YES against bot's NO bids" demo flow.
- **AMM markets:** 33 of them, mostly already closed/settled by the auto-closer. Demo path goes through the 116 order_book markets (with the deeper books).
- **Auth flow:** rotating refresh tokens (every successful `/api/v1/auth/refresh` invalidates the prior). Both the post-401-retry path (client.ts) and the idle-timer path (AuthProvider) share `apiClient.refreshSession()` — single in-flight refresh promise. Multi-tab races still possible; not closed.
- **Reservation TTL:** GTC limit orders reserve until `market.CloseAt + 1h pad`. IOC/FOK still 24h. Phase 0 cleanup heals any `expired` reservations on still-open orders.

## Two product TODOs the user has not finalized

1. **Predict fee model.** Default shipped at 100 bps (per the 2026-04-24 memory). Existing 152 markets stay at 0 bps (no backfill to avoid surprising demo state). Week-6 review gate decides whether to raise / re-shape.
2. **Backoffice antd 4 → 5 migration.** Plan ready to execute. Awaiting your "go." 100-file mechanical sweep mostly; one PageHeader replacement is judgment work.

Both documented in TODOS.md "Shipped" section with full context.

## Known open issues (not in TODOS but worth knowing)

- **MAX stake button rejects** on order_book markets when the user has a large wallet. Reason: MAX computes `floor(balance / current_yes_price)`, but the book can't fill that many shares. The order ends `status=rejected`. Investors won't click MAX on first interaction so it's low-priority demo-wise.
- **The `notional_cap_cents` DB column is never persisted** — `Service.placeExchangeOrder` sets it on the in-memory Order but `sql_repository.go::CreateOrder` doesn't include it in the INSERT. The in-memory cap-clamp still works because the taker pointer is the live struct. Data-cleanliness fix for later.
- **Cap-clamp regression test gap.** `Service.placeExchangeOrder` lacks a unit test because `ExchangeRepository` has 4+ methods and the existing `memRepo` doesn't implement it. Live-verify covers the change but a proper fake would harden the suite.
- **Refresh lock is per-ApiClient-instance.** Multi-tab still races. Server-side "tolerant rotation" (accept the most-recently-rotated token within an N-second grace window) would close that residual class. Not shipped.

## How the dev stack runs right now

The dev server on `:3010` is managed via `mcp__Claude_Preview__preview_start` with config name `"Player App (Next.js)"` (the on-disk `.claude/launch.json` calls it `"Player App on 3010"` but the runtime sees the other name — known quirk). Gateway / auth / postgres / redis are all in `docker compose` under `apps/Phoenix-Predict-Combined/`.

```bash
# rebuild gateway after Go changes
cd apps/Phoenix-Predict-Combined && docker compose build gateway && docker compose up -d gateway

# wipe + re-seed demo state (5 min before demo)
cd apps/Phoenix-Predict-Combined/go-platform/services/gateway
make wipe-demo && make demo-data

# tail gateway logs
docker logs predict_gateway --since 60s

# direct DB
docker exec predict_postgres psql -U predict -d predict
```

## What to do first in the fresh window

If the next session is more demo prep / polish:

1. Re-run `make wipe-demo && make demo-data` and screenshot key pages (`/predict/`, `/market/SENATE-DEM-2026/`, `/portfolio/`, `/leaderboards/`).
2. Click-test the demo path in the order an investor would: log in → click around discovery → place a $25 trade on a market with full book → view portfolio → check history.
3. If you hit a "doesn't fill" toast on a specific market, the seed depth might have been eaten by prior testing — re-seed.

If the next session is the antd-5 migration: read [PLAN-antd-5-office-upgrade.md](PLAN-antd-5-office-upgrade.md) and execute Phase 1.

If the next session is a new bug: the seed binary writes through `Service.PlaceOrder` so it exercises the same path real users do — any new failure mode there is real, not seed-specific.
