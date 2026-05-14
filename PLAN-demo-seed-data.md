# PLAN: Demo-Ready Seed Data

**Status:** SHIPPED 2026-05-14 (commits 8f0ce9a7 — reconciler fix prereq; 2284ad54, 8000c-ish range — demo phases 0-5)
**Branch:** `feat/binary-exchange-engine`
**Author:** /plan-eng-review session 2026-05-14
**Goal:** turn the current empty-orderbook, flat-chart, zero-settlement demo into something a stakeholder can click around for 10 minutes and see real prediction-market behavior.

---

## Problem (one paragraph)

`cmd/seed` already loads 152 markets, 4 categories of test users, and the LMSR liquidity parameters. But 119 of those markets are `execution_mode=order_book` and have empty books, 996 orders are stuck in `pending`, only 28 trades exist across all markets (16 of them on one market), there are 4 settlements total, and there is no price-history table at all — charts synthesize from trades, which means most charts are flat. The QA pass on 2026-05-14 (`.gstack/qa-reports/qa-report-player-app-2026-05-14.md`) caught this when a $5 market BUY on `APPLE-LLM-2026` returned `status: "cancelled"`, `filledQuantity: 0` because there were no sellers — that's not a bug, that's the demo state.

## What "done" looks like (the demo path)

A first-time visitor logs in as `demo@phoenix.local`. Every page tells a story:

| Page | Demo evidence |
|---|---|
| `/predict/` | Hero chart shows real price movement over 30 days, timeframe tabs work (fixes [ISSUE-003](.gstack/qa-reports/qa-report-player-app-2026-05-14.md) too if we backfill price history). Top Movers shows ±5-15% moves on real trades. Featured markets show non-zero volume and recent trade timestamps. |
| `/market/APPLE-LLM-2026/` (any market) | Order book has 5 levels of YES bids + asks + NO bids + asks. Recent trades list has 20+ entries. Chart has 30 days of hourly snapshots. Clicking "Place trade · $5" actually fills (or partially fills and rests) instead of silently cancelling. |
| `/portfolio/` | demo@phoenix.local has 8-12 positions across all 6 categories. Mix of unrealized PnL: some +20%, some -10%, some flat. 1-2 settled payouts in History tab. Realized P&L is non-zero. Accuracy % shows something other than "—". |
| `/leaderboards/` | All 4 boards (Accuracy, Weekly P&L, Sharpness, Category Champions) have entries. demo@phoenix.local ranks somewhere visible (not first — that's tacky — somewhere in the top 20). |
| `/rewards/` | Tier shows. Points balance is non-zero. Ledger has recent entries. |

## NOT in scope (explicit deferrals)

- **Fix the reconciler `collateral drift detected` ERROR.** That's [ISSUE-004](.gstack/qa-reports/qa-report-player-app-2026-05-14.md) — backend ledger bug, must be fixed before we ship demo data on top or we just amplify the corruption. **This plan blocks on ISSUE-004 being addressed first.** See "Blocking dependencies" below.
- **Wire missing `cancelOrder` UI** ([ISSUE-002](.gstack/qa-reports/qa-report-player-app-2026-05-14.md)). Tracked separately in TODOS.md.
- **Fix `auto-settler: no adapter for source` warn spam** ([ISSUE-005](.gstack/qa-reports/qa-report-player-app-2026-05-14.md)).
- **Add a price_history table proper.** This plan synthesizes price history by inserting backdated `prediction_trades` rows because the chart endpoint already reads from there. A real `prediction_market_price_history` table is a future improvement, captured as a TODO.
- **Multi-day live data simulation.** We are not running a continuous bot. One-shot deterministic seed, then re-run on demand.
- **Realistic counterparty AI.** Synthetic counterparty users place predictable orders against the demo user. Not building a market-making bot with strategy.

## What already exists (don't rebuild)

- `cmd/seed/main.go` — loads `seed_prediction.sql` via raw `db.Exec`. **Reuse:** keep it for the base shape (categories, events, markets, users). The demo seed extends, not replaces.
- `seed-data/seed_prediction.sql` — 385 lines of SQL fixtures. Already deterministic UUIDs (`md5(slug)::uuid`), idempotent via `ON CONFLICT DO NOTHING`. **Reuse as-is.**
- `internal/prediction/service.go::PlaceOrder` — the canonical order-placement path. Goes through validation, AMM/orderbook routing, wallet adapter, ledger writes. **Reuse:** demo seed calls this, not raw SQL. Means demo state can't drift from ledger.
- `internal/prediction/settlement.go::ResolveMarket` — settlement flow with payouts. **Reuse for settled-market demo data.**
- `internal/http/prediction_wallet_adapter.go` — bridges wallet to prediction. **Reuse.**
- `prediction.Repository` interface — fake exists for tests (`wallet_wiring_test.go::fakeWallet`). **Reuse pattern** to instantiate Service for seed without HTTP layer.

## Approach: extend cmd/seed with a `-demo` flag, run trades through the Service layer

A new file `cmd/seed/demo.go` adds a function that, given a connected `*sql.DB`:

1. Instantiates the real `prediction.Service`, `wallet.Service`, and `prediction.SQLRepository` against the same DB.
2. Runs a scripted sequence of trades. Each trade is a `Service.PlaceOrder()` call — same code path as production. Idempotency keys are deterministic (`demo:phase-N:trade-M`).
3. Time-shifts the writes: each phase passes a `simulatedNow` time and the seeder backdates `created_at` / `traded_at` columns by SQL update after the fact (Service doesn't expose a clock injection — see Risk 1).
4. Settles 3-5 markets via `Service.ResolveMarket()` and lets the real settlement code write payouts.

`main.go` gets a flag: `-mode base|demo|wipe`. Default `base` keeps current behavior. `demo` runs base then demo phases. `wipe` clears the demo-added rows (idempotency keys with `demo:` prefix) for a clean re-run.

### Phase breakdown

```
cmd/seed/
├── main.go              (existing — runs SQL, dispatches by flag)
├── demo.go              (new — orchestrates phases via Service)
├── demo_phase1_book.go  (market-maker seeds 5 levels of book depth per market)
├── demo_phase2_trades.go (synthetic taker flow generates historical trade volume)
├── demo_phase3_history.go (price snapshots backdated across 30 days)
├── demo_phase4_user.go  (demo user gets 8-12 positions with mixed PnL)
├── demo_phase5_settle.go (resolve 3-5 markets, replay payouts)
└── demo_test.go         (unit + golden-state integration test)
```

### Data shape per phase

**Phase 1 — Liquidity (market-maker via `bot@predict.dev`):**
For each of 119 order_book markets, place 5 limit BIDS and 5 limit ASKS on each side (YES and NO). Spread anchored on the current mid-price (`yes_price_cents`), ±5 ticks. Total: 119 × 20 = 2,380 resting limit orders. Reuses bot wallet ($10k), uses notional cap per order to bound exposure.

**Phase 2 — Volume (counterparty taker flow):**
For 30 randomly selected markets, generate 20-40 trades each between `alice@predict.dev` / `bob@predict.dev` / `charlie@predict.dev`. Each trade is a `Service.PlaceOrder` with `orderType=market`. Trades distributed across the last 30 days using deterministic RNG seeded by market_id. After Service writes the trade row, a follow-up `UPDATE prediction_trades SET traded_at = $past_time WHERE id = $trade_id` backdates it for chart history.

**Phase 3 — Price history backfill:**
For every market, walk a synthetic price path: start at current `yes_price_cents`, random-walk back 30 days × 24 hourly snapshots, anchored so the final price matches actual current state. Write as backdated `prediction_trades` rows with `quantity=1, price_cents=path[i]`, `is_amm_trade=true`, `tradedAt=hour_i`. ~152 × 720 = ~109,440 synthetic trade rows. Marked with a sentinel `trade_kind='demo_history'` so they can be wiped on re-seed.

**Phase 4 — Demo user portfolio:**
demo@phoenix.local places 12 market orders (varied buys, varied sides, varied categories) using `Service.PlaceOrder`. After each, the seeder pretends time passed and the AMM moved — applies a synthetic price tick on the market so the demo user's positions show non-zero unrealized PnL on the next read.

**Phase 5 — Settlements:**
Pick 4 markets: 1 settles YES (demo user wins), 1 settles NO (demo user loses), 1 settles YES on a market where demo user has no position (just for leaderboard variety), 1 voids (refunds everyone). Call `Service.ResolveMarket` and let `settlement.go` run — payouts hit wallets via the WalletAdapter, ledger entries written, idempotent.

## Blocking dependencies

**BLOCKER (resolved 2026-05-14): ISSUE-004 (reconciler collateral drift) is fixed first.** Currently `yes_no_mismatch=true` on APPLE-LLM-2026, SENATE-DEM-2026, GPT5-JUL26 — reconciler patches drift but the underlying write path keeps creating it.

**Decision made:** Option (a) — fix ISSUE-004 first via `/investigate` against `internal/prediction/`. Land the fix. THEN run demo seed against a clean ledger. Demo seed work blocks on the fix landing.

**Acceptance gate for ISSUE-004 fix:** `TestReconcilerCleanAfterAll5Phases` in `cmd/seed/demo_test.go` (Phase 0) AND the existing reconciler test suite both pass with zero drift events on a fresh DB after running base seed + 100 synthetic trades through `Service.PlaceOrder`.

## Architecture diagram

```
                          cmd/seed -mode demo
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │     demo.go            │
                    │ orchestrates 5 phases  │
                    └────────────┬───────────┘
                                 │
                ┌────────────────┼─────────────────┬────────────┐
                ▼                ▼                 ▼            ▼
       Phase 1 (book)    Phase 2 (volume)  Phase 3 (history)   Phase 4-5
               │                │                 │            │
               └────────────────┴────────┬────────┴────────────┘
                                         │
                                         ▼
                          prediction.Service.PlaceOrder
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  ▼                      ▼                      ▼
       WalletAdapter.Debit       prediction_orders        prediction_trades
       wallet.Service             SQLRepository            SQLRepository
                  │                                              │
                  └────────────► wallet_ledger ◄─────────────────┘
                                       │
                                       ▼
                                 reconciler reads → 0 drift expected
```

## Idempotency + re-run safety

- Every Service.PlaceOrder call passes `idempotencyKey="demo:phase{N}:user{ID}:seq{M}"`. Re-running the seed is a no-op on already-placed orders.
- Settlement IDs are also deterministic (`demo:settle:{market_ticker}`).
- `-mode wipe` deletes rows where `idempotency_key LIKE 'demo:%'` or `trade_kind = 'demo_history'`. Original `seed_prediction.sql` data is untouched.
- Wallet ledger entries created via WalletAdapter carry the same demo-prefixed idempotency, so the reconciler will not flag drift after wipe.

## Risks

| # | Risk | Mitigation | Cost if it fires |
|---|---|---|---|
| 1 | Service.PlaceOrder reads `time.Now()` for `createdAt`. Backdating via post-hoc SQL UPDATE may break invariants the Service assumes (e.g., a position's `createdAt` predating its order's `createdAt`). | Audit `service.go` and `sql_repository.go` for time invariants. If found, add a `Clock` injection (1h work). Otherwise document the limitation: charts show last 30 days but order/trade `createdAt` is "now" cluster. | Charts look wrong on the demo. |
| 2 | Synthetic trades trigger the existing reconciler drift bug ([ISSUE-004]) at scale, leaving the DB in a state where real settlement at demo time pays out wrong amounts. | Run the reconciler against a Phase 1 dry-run before committing Phase 2-5. Hard-stop on first drift > $0.01. | Demo wallet balances visibly wrong, settlement panic. |
| 3 | 109k synthetic trade rows for price history bloat `/api/v1/markets/:id/trades` queries (no `limit` enforcement?). | Verify `prediction_handlers.go::getMarketTrades` enforces `limit ≤ 100` and orders by `traded_at DESC`. Add index on `(market_id, traded_at DESC)` if missing. | Market detail page slow to load. |
| 4 | The demo user's 12 positions deplete their seeded $1k starting wallet, leaving balance $0 and unable to place a fresh test trade. | Start demo user at $5,000 (override seed). Document the demo-specific top-up. | Demo flow itself fails. |
| 5 | Deterministic RNG seeded by `market_id` produces visually similar "random walks" across markets. | Mix in a per-market salt and use Geometric Brownian Motion not uniform random walk. | Charts all look the same. |
| 6 | The 996 stuck `pending` orders already in the DB are evidence of an existing bug (orders that never resolved to filled/cancelled). Demo seed on top of that orphan state inherits the mess. | Phase 0 cleanup: cancel all `pending` orders with `idempotency_key NOT LIKE 'demo:%'` and `created_at < (NOW() - 1 hour)`. Verify zero pending before Phase 1. | Demo orderbook shows ghost orders. |

## Implementation steps + file touch list

Total: **9 files touched, 6 new, 3 modified, ~600 lines added.**

1. **Phase 0 cleanup** — `cmd/seed/cleanup.go` (new, ~40 lines). One SQL: cancel stale pending orders. Run before Phase 1.
2. **Service-layer harness** — `cmd/seed/harness.go` (new, ~80 lines). Build a `prediction.Service` against the open `*sql.DB`. Reuses `internal/prediction/sql_repository.go` and `internal/http/prediction_wallet_adapter.go`.
3. **Phase 1-5 files** — `cmd/seed/demo_phase{1..5}_*.go` (new, ~100 lines each). Each phase is a function `func RunPhaseN(ctx context.Context, h *Harness, rng *rand.Rand) error`.
4. **Orchestrator** — `cmd/seed/demo.go` (new, ~60 lines). Calls phases in order, prints progress, handles `-mode wipe`.
5. **Flag dispatch** — `cmd/seed/main.go` (modified, ~10 lines added). Add `-mode` flag.
6. **Makefile target** — `Makefile` in `services/gateway/` (modified, ~5 lines added). New `make demo-data` target.
7. **README update** — `apps/Phoenix-Predict-Combined/CLAUDE.md` (modified, ~15 lines added). Document `make demo-data`, `make wipe-demo`, and the demo expectations.
8. **Tests** — `cmd/seed/demo_test.go` (new, ~150 lines). See test plan below.

## Test plan

Tests for the demo seeder must be integration tests against a real (test) Postgres because we are exercising Service.PlaceOrder and the SQL repository. Unit-testing through mocks would prove nothing.

**Test framework:** Go's stdlib `testing` + `dockertest` (already in go.mod? — verify; if not, add). Spin up a fresh Postgres container per test, run migrations, run base seed, then run the demo phase under test.

| Test | What it asserts |
|---|---|
| `TestPhase0CancelsStalePending` | After Phase 0, zero `prediction_orders.status='pending'` rows older than 1h. |
| `TestPhase1BookDepth` | For each order_book market, `prediction_orders.status='open'` has exactly 20 rows (5 levels × YES bid/ask + NO bid/ask) keyed by bot user. |
| `TestPhase1Idempotent` | Running Phase 1 twice produces the same `prediction_orders` row count. |
| `TestPhase2VolumeDistribution` | After Phase 2, 30 markets each have 20-40 trades. Trade timestamps span the last 30 days (not clustered at NOW). |
| `TestPhase3PriceHistoryNonFlat` | For 10 random markets, the synthetic price history's max-min spread > 5 cents. |
| `TestPhase4DemoUserMixedPnL` | demo@phoenix.local has 8-12 positions, at least one with unrealized PnL > 0 AND at least one with < 0. |
| `TestPhase5SettlementPayouts` | After Phase 5, demo user's `wallet_balances.balance_cents` has changed (up or down) by the expected settled-position payouts. |
| `TestReconcilerCleanAfterAll5Phases` | Run reconciler. Zero `collateral_drift_detected` ERROR-level events. **This is the regression gate for ISSUE-004.** |
| `TestWipeMode` | Run `-mode demo`, then `-mode wipe`. All rows with `idempotency_key LIKE 'demo:%'` are gone. Base seed rows are untouched. |

**Coverage diagram:**

```
CODE PATHS
[+] cmd/seed/demo.go
  ├── RunDemo()
  │   ├── [★★★ TESTED] Happy path → TestAll5PhasesEndToEnd
  │   ├── [★★  TESTED] Resume from phase N (if interrupted) → TestResumeFromPhase3
  │   └── [GAP]         DB connection drops mid-phase → add retry test
  ├── RunWipe()
  │   ├── [★★★ TESTED] Wipe round-trips → TestWipeMode
  │   └── [GAP]         Wipe with concurrent inserts → integration nice-to-have
[+] cmd/seed/demo_phase1_book.go
  ├── seedBook(market)
  │   ├── [★★★ TESTED] 5 levels each side → TestPhase1BookDepth
  │   ├── [★★  TESTED] Order_book mode only, skip AMM → assert AMM unchanged
  │   └── [GAP]         Market with extreme price (yes=1¢): spread asymmetry → add edge case
[+] cmd/seed/demo_phase3_history.go
  └── synthHistory(market, days, hours_per_day)
      ├── [★★★ TESTED] Path endpoint matches current price → TestEndpointAnchor
      └── [★★  TESTED] Path has variance → TestPhase3PriceHistoryNonFlat
[+] cmd/seed/demo_phase5_settle.go
  └── settle(market, outcome)
      ├── [★★★ TESTED] Wallet credited → TestPhase5SettlementPayouts
      └── [GAP]         Double-settle (idempotency) → TestSettlementIdempotent

USER FLOWS (via /qa post-seed)
[+] Player demo flow
  ├── [→E2E] Login → /predict/ → market detail → place trade → fills → portfolio updates
  └── [→E2E] /portfolio/ shows mixed PnL across categories

COVERAGE: 11/14 paths tested (78%)  |  Code: 9/12  |  Flows: 2/2 [→E2E]
QUALITY: ★★★:6 ★★:4 ★:0  |  GAPS: 3 (3 edge cases, 0 critical)
```

## Failure modes (production-equivalent)

1. **Reconciler picks up demo trades and flags drift** → reconciler test in TestReconcilerCleanAfterAll5Phases catches it before merge.
2. **Trade history endpoint timeouts** → mitigated by index check (Risk #3) and limit-enforcement check.
3. **Auto-settler tries to settle a demo-flagged market with no adapter** → demo markets use `source='demo'` not `source='manual'`, auto-settler skips them.
4. **demo@phoenix.local password leaks via seed log** → seeder never logs credentials, only user IDs.

## Worktree parallelization

Mostly sequential — each phase reads state the previous phase wrote.

| Step | Modules touched | Depends on |
|---|---|---|
| Phase 0 cleanup | `cmd/seed/`, `prediction_orders` table | — |
| Phase 1 book | `cmd/seed/`, `internal/prediction/` (read-only) | Phase 0 |
| Phase 2 volume | `cmd/seed/`, `internal/prediction/` | Phase 1 |
| Phase 3 history | `cmd/seed/`, `prediction_trades` table | — (independent column) |
| Phase 4 user | `cmd/seed/`, `internal/prediction/`, `wallet_balances` | Phase 1 (needs book to fill against) |
| Phase 5 settle | `cmd/seed/`, `internal/prediction/settlement.go` | Phase 4 (settles user positions) |
| Makefile + docs | `Makefile`, `CLAUDE.md` | none |

**Parallel lanes:**
- Lane A (sequential): Phase 0 → 1 → 2 → 4 → 5
- Lane B (independent): Phase 3 — can run any time, only writes synthetic `prediction_trades` rows
- Lane C (independent): Makefile + docs — pure devex

Execution order: Lane A serial, Lane B parallel, Lane C parallel. ~3-4 hours of implementation if Phase 3 (history walk) runs concurrently with Phase 1-2-4-5 buildout.

## Open decisions for you

1. ~~**Block on fixing reconciler drift ([ISSUE-004]) first, or skip the 3 affected markets and proceed?**~~ **Resolved 2026-05-14: fix ISSUE-004 first.**
2. ~~**Top up demo@phoenix.local's wallet to $5k for demo, or keep at $1k seed default?**~~ **Resolved 2026-05-14: top up to $5k as part of demo seed.** Phase 4 spends ~$1.5-2k across 12 positions, leaves ~$3-3.5k visible. Reset to $5k on every demo-seed re-run via a wallet-adjust ledger entry with `idempotency_key='demo:topup'`.
3. ~~**Run formal review sections before implementation?**~~ **Resolved 2026-05-14: accept as-is.** Skip the 4 review sections + Codex outside-voice pass. Land ISSUE-004 fix first via `/investigate`, then implement Phase 0-5.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|---|---|---|---|---|---|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | not run |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | not run |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | LIGHT | plan drafted, 3 open decisions resolved (reconciler blocker, $5k wallet, accept-as-is). Formal sections deferred by user. |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | n/a (backend-only) |
| DX Review | `/plan-devex-review` | DX gaps | 0 | — | n/a |

**VERDICT:** PLAN ACCEPTED (light review). All 3 open decisions resolved. Next step: `/investigate` ISSUE-004 (reconciler drift) before implementation begins.
