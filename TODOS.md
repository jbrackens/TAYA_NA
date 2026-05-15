# TODOs

Design and product debt tracked across planning cycles. Items here are intentionally deferred — each has a "why not now" reason and a trigger for revisit.

## Open

### Backoffice Ant Design 4 / React 19 compatibility — needs product decision

- **What:** Office app (`packages/office`) imports antd 4.16.12 across 115 call sites (top usage: Button ×33, Form ×24, Input ×18, Row ×13, Tag ×12, Modal ×11). React 19 removed `ReactDOM.render` and `unmountComponentAtNode` which antd 4 internals still reference, emitting "Attempted import error" warnings on `/prediction-admin/markets` and `/prediction-admin/settlements`.
- **Investigation done 2026-05-15:** The compat warnings are antd-4-internal, not a workspace leak. The matching player-app concern (ISSUE-006) turned out to be a dead `antd` line in `packages/app/package.json` that was already removed in that issue's fix; the office is the genuine consumer.
- **Three paths, each requires the user's call:**
  - **A) Upgrade office to antd 5.** Antd 5 supports React 19 natively. ~100 files touched. Breaking changes are mostly cosmetic (popupClassName rename, DatePicker→dayjs, CSS-in-JS theming replaces less variables, Form.Item subtle semantics). 1-2 day refactor with CC+gstack assistance.
  - **B) Pin office to React 18.** Smaller change, but the player app uses React 19 features and they share `react-dom` via workspaces. Would require de-hoisting or full pin-down across the monorepo. Probably more painful than it sounds.
  - **C) Suppress warnings, accept the risk.** Wraps the offending antd imports with shims that ignore the missing exports. Cosmetic only; doesn't address the underlying breakage risk if React 19.x tightens further. Buy time for option A.
- **Recommendation:** A. The office app is the prediction-admin surface, growing not shrinking; locking in antd 4 is technical debt that compounds. The migration touches a lot of files but each one is straightforward.
- **Depends on / blocked by:** User decision on which path to take.
- **Revisit when:** Before any new prediction-admin feature work, or when React 19.x drops a release that breaks antd 4 hard.

### Predict fee model decision — signals conflict, needs reconciliation

- **What:** Decide how Predict handles trading fees. The fee infrastructure exists (`prediction.CalculateTakerFeeCents` computes a price-curve fee `bps × P × (100-P) × qty / 1e6`, peaks at p=50), but no market actually uses it.
- **Investigation done 2026-05-15:**
  - `accounting.go:33` docstring says "Default in Hula Na is 500 (5%)" — but this is just doc, not a default in code.
  - `prediction_markets.fee_rate_bps` column has SQL default `0`. All 152 markets are at 0.
  - Service.CreateMarket passes `req.FeeRateBps` through unchanged — no default applied at the Go layer.
  - Memory from a 2026-04-24 design session: "User agreed to ship minimal flat 100 bps fee + instrument retention-vs-fees rather than commit to Kalshi/Polymarket/flat+tier model before growth mechanic is known. Week-6 decision gate with sample-size threshold."
  - That decision **never landed** — no commit changed the default. Sample-size threshold can't trigger because there's nothing to measure.
- **Three numbers in play:** 500 bps (docstring), 100 bps (decision memory), 0 bps (actual data). One of these is wrong; the user knows which.
- **Recommendation:** Confirm the 100 bps decision is still live, then ship it: add `DefaultMarketFeeBps = 100` constant in accounting.go, fall back to default when `req.FeeRateBps == 0` in Service.CreateMarket. Update the docstring to match. Optionally migrate existing markets via a SQL update — though if the demo's running now, charging fees retroactively may surprise testers.
- **Depends on / blocked by:** User confirmation of the 100 bps decision.
- **Revisit when:** User confirms, OR Week-6 review happens, OR a new revenue/loyalty initiative needs fees as a foundation.

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

### Backend — auto-settler WARN spam silenced for manual-source markets — fixed 2026-05-14

- Commit silences ~17 `auto-settler: no adapter for source` WARN lines per minute by registering `ManualAdapter` under both `admin-manual` (canonical) and `manual` (legacy seed-data key). 137 base-seed markets carry `source=manual` and now route to the same non-auto skip path the 12 `admin-manual` markets already used.
- Live-verified: 0 WARNs over 5-minute window (was ~85). Auto-settler still ticks on 1m interval.
- ISSUE-005 from `.gstack/qa-reports/qa-report-player-app-2026-05-14.md`.

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
