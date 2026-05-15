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

## Shipped

### Player app — backend price-history endpoint + real charts wired — shipped 2026-05-15

- New `GET /api/v1/markets/{id}/prices?range=1h|1d|1w|1m|all` aggregates `prediction_trades` into volume-weighted YES price buckets with server-side carry-forward (`internal/prediction/pricehistory.go`).
- Frontend wired: `MarketChart.tsx` fetches on mount + range change with synthetic fallback. New `useHeroPriceHistory` hook feeds real history into `heroChartPath` on `/predict/`. Sparklines (60×28 decorative thumbs) intentionally remain synthetic — documented in `spark.ts`.
- API client + types: `getMarketPriceHistory`, `MarketPriceHistory`, `PricePoint` in `@phoenix-ui/api-client`.
- 11 unit tests cover window sizing, carry-forward fill behavior, and bucket alignment.

### Backend — wallet hold TTL must outlive the market for GTC orders — fixed 2026-05-15

- Service.PlaceOrder used to hardcode 24h on `HoldReservation.ExpiresIn`. GTC limit orders resting on the book for >24h had reservations transition to `expired` while the order was still live, breaking `CaptureReservationWithTx` with `ErrReservationNotHeld` on the next match.
- Fix: new `reservationTTL(tif, marketCloseAt, now)` helper; GTC uses `market.CloseAt + 1h pad`, IOC/FOK stay at 24h.
- Demo-seed Phase 0 healed 2,743 stale `expired` reservations on still-open orders. Phase 2 errors dropped from 117 → 0; Phase 4 errors 3 → 0.
- 7 unit cases lock the policy.

### Player app — per-row Cancel for open limit orders + missing server route — shipped 2026-05-15

- New `POST /api/v1/orders/{id}/cancel` route delegates to existing `Service.CancelOrder` (ownership check + ledger-aware reservation release in a tx). The api-client had `cancelOrder` defined but the server route was missing — calls 404'd.
- Frontend: per-row Cancel column on `/portfolio/` Open orders tab with optimistic update + toast.
- Closes ISSUE-002.

### Player app — hero chart timeframe tabs hidden until backend history wired — shipped 2026-05-15

- The 1H/1D/1W/1M/3M/ALL bar sat permanently disabled on `/predict/`. Hidden it; the hero chart now renders a clean single line. The price-history endpoint (above) is the backbone for restoring the bar properly later.
- Closes ISSUE-003.

### Player app — dropped dead `antd` dependency — shipped 2026-05-15

- ISSUE-006 investigation: `antd` was declared in `packages/app/package.json` but never imported anywhere. The compile warnings I'd attributed to a transitive leak were actually from a concurrent office-app HMR build polluting the shared dev console.
- Removed the line + regenerated yarn.lock. 48 fewer transitive deps; ~155 MB off the install footprint. Matches CLAUDE.md's "no antd in app/" rule.
- Closes ISSUE-006.

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
