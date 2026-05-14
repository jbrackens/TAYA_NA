# TODOs

Design and product debt tracked across planning cycles. Items here are intentionally deferred — each has a "why not now" reason and a trigger for revisit.

## Open

### Backoffice Ant Design 4 / React 19 compatibility warnings

- **What:** `/prediction-admin/markets` and `/prediction-admin/settlements` still emit development console warnings/errors from Ant Design 4 internals under React 19, including `render` / `unmountComponentAtNode` import warnings and `element.ref` access errors.
- **Why:** gstack QA on 2026-05-06 restored the broken Create Market and Settle modals by switching the affected AntD 4 modal props from `open` to `visible`, but the broader dependency compatibility issue remains.
- **Pros of deciding now:** Removing the warnings would improve console health and reduce risk that other AntD modal/table/typography interactions break as React tightens compatibility.
- **Cons:** The durable fix likely requires a scoped AntD compatibility pass or dependency upgrade, not a one-line admin workflow fix.
- **Context:** Deferred from gstack QA of the player app and backoffice on branch `chore/rebrand-player-hula-na`. Evidence lives in `.gstack/qa-reports/qa-report-localhost-2026-05-06.md`.
- **Depends on / blocked by:** Decision on whether to keep the legacy Pages Router AntD admin surface or migrate those pages onto the newer backoffice app shell/components.
- **Revisit when:** Before shipping React 19 backoffice admin changes, or when touching the prediction admin markets/settlements pages again.

### Predict fee model decision

- **What:** Decide how Predict handles trading fees. Current state: `fee_rate_bps` column defaults to 0, no market sets it, no user-tier mechanism. Industry precedent: Kalshi uses a price-curve formula (`0.07 × P × (1−P)`, peaks at 50¢), Polymarket uses market-category tiers with maker rebates (2026 update); neither uses user-loyalty-tier fees.
- **Why:** Future loyalty iterations may want fee-based benefits (plan v1 explicitly dropped them), but the underlying fee model itself is undecided. Can't add tier-fee benefits on a zero-fee baseline. The decision affects revenue, competitor comparison, and the shape of any future loyalty work.
- **Pros of deciding now:** Unblocks tier-fee benefits as a future loyalty iteration. Aligns Predict with industry pricing norms users will expect. Creates a revenue lever.
- **Cons:** Introducing fees where users currently have none is a user-visible change. Needs product owner signoff + user communication strategy.
- **Context:** Surfaced during `/plan-eng-review` of the loyalty+leaderboards plan on 2026-04-23. Codex outside-voice review flagged that the plan's "0.5% → 0.1% fee tiers" were fictional because the baseline fee is 0. Three candidate approaches: (a) Kalshi-style price curve, (b) Polymarket-style category tiers + maker rebates, (c) flat percentage + tier discount. Each has different revenue, fairness, and competitive-positioning implications.
- **Depends on / blocked by:** Product owner decision on whether Predict charges fees at all in v1.
- **Revisit when:** Before any fee-based loyalty benefit is designed, OR when the revenue model gets a dedicated product review.

### Player app — no UI to cancel an open limit order

- **What:** `/portfolio/` → Open orders tab lists every open limit order but has no cancel control. Clicking a row navigates to the market detail, which also has no per-order action. The backend already supports cancellation (`api-client/src/prediction-client.ts:170` defines `cancelOrder(orderId)` → `POST /api/v1/orders/:id/cancel`); the UI just never calls it.
- **Why:** Any limit order that doesn't immediately cross becomes permanently stuck on the user. On the test account this had accumulated 27 stuck $0.01 YES orders with reserved cash locked indefinitely. Every comparable exchange (Polymarket, Kalshi, IBKR) has per-order cancel as a first-class control.
- **Pros of fixing:** Restores user agency over their open orders. Unlocks reserved cash. Brings the player app in line with prediction-market UX norms.
- **Cons:** Adds one Cancel button per row in `PortfolioOpenOrders` plus a per-market cancel chip on market-detail when the user has open orders there. Needs an optimistic-update + toast pattern and a "Cancel all" bulk action to scale to the test user's 27-order pile.
- **Context:** Surfaced during gstack `/qa` of the player app on 2026-05-14 (branch `feat/binary-exchange-engine`). Report: `.gstack/qa-reports/qa-report-player-app-2026-05-14.md` (ISSUE-002).
- **Depends on / blocked by:** Nothing — `cancelOrder` API already exists.
- **Revisit when:** Next player-app feature pass, or sooner if a real user tries to place a limit order that doesn't fill.

### Player app — hero chart timeframe tabs permanently disabled on /predict/

- **What:** All six tabs (1H, 1D, 1W, 1M, 3M, ALL) on the home-page hero chart render with `aria-disabled`. 1D simultaneously claims `[disabled] [selected]`. The same chart on `/market/[ticker]/` has working tabs.
- **Why:** The most-visited page in the app looks broken at a glance. Either the home variant of the chart needs to be wired to the same `/markets/:id/history` endpoint the market-detail chart uses, or the tab bar should be hidden entirely on the home variant.
- **Pros of fixing:** Removes a "this looks unfinished" tell from the landing page. Either makes the timeframes work or makes the tab bar disappear cleanly.
- **Cons:** Small frontend fix; needs to either wire data or delete code.
- **Context:** Surfaced during gstack `/qa` of the player app on 2026-05-14 (branch `feat/binary-exchange-engine`). Report: `.gstack/qa-reports/qa-report-player-app-2026-05-14.md` (ISSUE-003).
- **Depends on / blocked by:** None.
- **Revisit when:** Next visual polish pass on `/predict/`, or alongside any other home-page work.

### Backend — wallet edge case "reservation is not in held status" on issuance fills

- **What:** `wallet.Service.CaptureReservationWithTx` returns `"reservation is not in held status"` for a small fraction of issuance match captures during the prediction engine's match path. Observed on 3 of 12 demo user orders during PLAN-demo-seed-data.md Phase 4 (`ETH-5K-MAY26 NO`, `UCL-REAL-2526 YES`, `UCL-CITY-2526 NO`) — all under high concurrency / same-market re-entry.
- **Why:** The capture path expects the prior `HoldWithTx` row to be in `status='held'`, but on these failures the reservation was already in `captured` or had been released. Suggests a race in the issuance-pair flow where one side's capture runs twice, or the maker side already captured/released before the taker's capture got there.
- **Pros of fixing:** Removes a class of demo-state errors. Real users hitting the same edge case today would see "Order placement failed" with no clear recovery.
- **Cons:** Backend investigation needed in `internal/wallet/` + `internal/prediction/exchange.go` issuance path. Likely 3-5h.
- **Context:** Surfaced during demo seed Phase 4 implementation on 2026-05-14 (branch `feat/binary-exchange-engine`). Wallet adapter is at `internal/http/prediction_wallet_adapter.go`. Capture path: `wallet.Service.CaptureReservationWithTx`.
- **Depends on / blocked by:** None.
- **Revisit when:** Next backend stability sweep, or sooner if real users report "Order placement failed" with no toast detail.

### Player app — backend price-history endpoint + wire real charts

- **What:** Both `heroChartPath` (`components/prediction/utils/spark.ts`) and `MarketChart.tsx` render client-side deterministic random walks seeded by ticker name. There is no backend price history. The "Real historical data isn't wired yet" comment in `MarketChart.tsx:9` is the authoritative source-of-truth.
- **Why:** Demo + future production both want actual price movement on charts. Currently a savvy user could tell the chart is fake because clicking different timeframe tabs shows the same shape (and on `/predict/` the tabs are disabled entirely — [ISSUE-003](.gstack/qa-reports/qa-report-player-app-2026-05-14.md)).
- **Pros of fixing:** Real chart history. Closes both the "fake walk" and the "disabled tabs" findings. Enables proper Top Movers, sparklines, and movement % deltas.
- **Cons:** Either (a) build a `prediction_price_history` table with a denormalized aggregate of trade prices per minute/hour/day, plus an indexer that writes to it on every fill, plus an HTTP endpoint at `/api/v1/markets/:id/prices?range=…` — or (b) compute on-the-fly from `prediction_trades` with appropriate aggregation. (b) is faster to ship; (a) scales better.
- **Context:** Discovered during PLAN-demo-seed-data.md implementation on 2026-05-14 — Phase 3 (price history backfill) was originally scoped to write 109k synthetic trade rows but the frontend doesn't read them. Plan amended to skip Phase 3.
- **Depends on / blocked by:** Product decision on whether to ship demo with fake charts (current state) or pause demo until real charts ship.
- **Revisit when:** Next backend feature pass, or when product wants more realistic chart UX.

### Backend — reconciler logs `collateral drift detected` at ERROR level

- **What:** Every reconciler cycle, the gateway logs `level=ERROR msg="reconciler: collateral drift detected"` for several markets (APPLE-LLM-2026, SENATE-DEM-2026, GPT5-JUL26) with `yes_no_mismatch=true` and asymmetric `position_yes_pool` / `position_no_pool`. `adjustment_written=true` so the reconciler patches it, but the underlying imbalance keeps reappearing.
- **Why:** Strongly suggests an order or settlement path is creating YES positions without corresponding NO positions (or vice versa). Could be a data-integrity time bomb at settlement.
- **Pros of fixing:** Removes a class of error-log noise that masks real problems. Closes a possible settlement-payout bug before it costs real money.
- **Cons:** Backend investigation; needs to trace the order-placement → ledger → position flow in `internal/prediction/`.
- **Context:** Surfaced during gstack `/qa` of the player app on 2026-05-14. Report: `.gstack/qa-reports/qa-report-player-app-2026-05-14.md` (ISSUE-004).
- **Depends on / blocked by:** None — actionable now with `/investigate`.
- **Revisit when:** Before any production traffic, or next backend stability sweep.

### Backend — `auto-settler: no adapter for source` WARN spam every 60s

- **What:** Gateway logs 18+ `WARN auto-settler: no adapter for source` lines per cycle for `source=manual` markets that have no settlement adapter wired up.
- **Why:** Log noise hides real warnings. Operationally annoying when tailing gateway logs during dev.
- **Pros of fixing:** Quiet, signal-only logs.
- **Cons:** Trivial.
- **Context:** Surfaced during gstack `/qa` on 2026-05-14. ISSUE-005.
- **Revisit when:** Next gateway pass — auto-settler should skip `source=manual` markets silently or downgrade to DEBUG.

### Player app — antd 4 leaks into player-app compile, emits React-DOM API removal warnings

- **What:** Every page compile in `packages/app` emits `Attempted import error: 'render' is not exported from 'react-dom'` and `unmountComponentAtNode' is not exported` from `antd/es/modal/confirm.js` and `antd/es/typography/util.js`. Per `packages/app/CLAUDE.md` antd is not supposed to be imported into `app/` — it's leaking through a transitive workspace dep.
- **Why:** Will become a hard error when React 19 fully removes the legacy ReactDOM exports. Currently dev-console noise.
- **Pros of fixing:** Aligns with the project's stated "antd-free player app" rule. Removes a future-break risk.
- **Cons:** Investigation: `cd packages/app && yarn why antd` to trace the chain — likely `@phoenix-ui/utils` or similar shared package that the office app pulls antd through and the player app pulls along by transitive dep.
- **Context:** Surfaced during gstack `/qa` on 2026-05-14. ISSUE-006.
- **Revisit when:** Next React/antd-related task, or proactively before any React 19 minor bump.

## Shipped

### Demo-ready seed data (PLAN-demo-seed-data.md) — shipped 2026-05-14

- `cmd/seed -mode demo` runs base seed + Phase 0 cleanup + wallet top-up + Phases 1 (market-maker book), 2 (synthetic taker volume), 4 (demo user portfolio), 5 (settlements).
- Phase 3 (price history backfill) skipped — frontend charts are client-synthetic walks, no backend data needed.
- `make demo-data` and `make wipe-demo` for ergonomics; both idempotent and re-runnable.
- Drives every write through `Service.PlaceOrder` / `Service.ResolveMarket` so the ledger stays consistent. Reconciler reads clean after each run (no drift events).
- Final demo state: 152 markets, 6,200+ orders, 1,500+ trades, 370+ positions, 3 settled markets, demo user u-1 with 4 open positions + 2 settled payouts + $5,169 wallet.

### Player app — reconciler false-positive on AMM-legacy markets — fixed 2026-05-14

- Commit `8f0ce9a7` gates `YesNoMismatch` on the existence of order-book trades, suppressing the every-15-minute ERROR log on the 3 markets migrated from `amm` → `order_book` (APPLE-LLM-2026, SENATE-DEM-2026, GPT5-JUL26).
- Unblocked the demo seed plan: 100 synthetic trades through `Service.PlaceOrder` now produce zero drift events.

### Player app — trade-result toast invisible on cream theme — fixed 2026-05-14

- `ToastProvider.tsx` carried inherited dark-theme colors (`#f8fafc` title on 10%-alpha tinted background, 40% black drop shadow) from the sportsbook fork.
- On the P8 cream `--bg-deep` backdrop this rendered the entire toast effectively invisible. Every `toast.error(…)` from a cancelled IOC market order fired but the user saw nothing — looked like "Place trade" was broken.
- Fix: repoint the `colors` map to P8 tokens (`--yes-soft`/`--yes-text`, `--no-soft`/`--no-text`, `--accent-soft`/`--focus-ring`), use per-type AA-contrast title and message colors, soften drop-shadow from 40% to 12% black.
- Shipped in commit `dab83c9e` on branch `feat/binary-exchange-engine`. Report: `.gstack/qa-reports/qa-report-player-app-2026-05-14.md` (ISSUE-001). Before/after evidence in `.gstack/qa-reports/screenshots/`.

### Privacy opt-out UI for leaderboards — shipped 2026-04-23

- Migration 016 adds `punters.display_anonymous BOOLEAN NOT NULL DEFAULT false`.
- `GET/PUT /api/v1/me/privacy` reads/writes the flag with session auth.
- Leaderboard display-name query renders `Trader #<rank>` when the flag is on,
  `COALESCE(username, substring(id, 1, 10))` otherwise.
- Toggle lives on the `/account` page under "Appearance on public boards",
  server-confirmed update (no optimistic flip) so React 19 Strict Mode's
  double-effect doesn't race the mount fetch.
- Shipped in commits through 2026-04-23 after the loyalty + leaderboards
  backend + frontend lands in this same series.
