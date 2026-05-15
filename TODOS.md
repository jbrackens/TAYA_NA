# TODOs

Design and product debt tracked across planning cycles. Items here are intentionally deferred — each has a "why not now" reason and a trigger for revisit.

## Open

### Header — mark vs. wordmark optical balance (POLISH, design) — deferred 2026-05-15

- Source: /design-review header audit, finding H05.
- Mark renders 56×58 in soft mint gradient; wordmark renders 143×34 in solid black bold. Wordmark visually dominates the brand zone; mark reads as ornament rather than the primary identifier.
- Two paths when revisited: (1) export a designed lockup (mark + wordmark as one SVG/PNG with the spacing baked in by the designer) and render that; (2) cheap interim — bump mark to 64-68px + drop wordmark to 28-30px so optical weights even out.
- Not blocking the investor demo; treat as design-direction call rather than a bug.

### Header — BAL pill abbreviated to "$5.2K" on mobile (POLISH, content) — deferred 2026-05-15

- Source: /design-review header audit, finding H06.
- At 375px viewport the BAL pill renders "$5.2K" instead of the full "$5068.81". The abbreviation loses precision and may make users second-guess their balance ("am I missing money?").
- Not an a11y issue — the value is readable, just rounded. Revisit if usability testing surfaces concern.

### ~~Header — no mobile hamburger nav (MEDIUM, navigation)~~ — INVALID, closed 2026-05-16

- Source: /design-review header audit, finding H07. **This finding was wrong.**
- The audit saw `@media (max-width: 900px)` hide `.tb-nav` and concluded Portfolio/Leaderboards/Rewards were unreachable on mobile. It missed a separate mobile bottom tab-bar component (`.mtb-item`) that renders below the breakpoint.
- UAT smoke (F-2) verified on a 375×812 viewport: a 5-item bottom nav renders with real links — Markets→/predict/, Portfolio→/portfolio/, Boards→/leaderboards/, Rewards→/rewards/, Account→/account/. Tapping "Portfolio" navigated to /portfolio/ and rendered correctly. Mobile nav is present and functional; nothing to fix.
- Lesson: design-review mobile checks must look for any mobile nav component, not only assert the desktop nav is hidden.

## Shipped

### Predict fee model — 100 bps default shipped per 2026-04-24 decision — shipped 2026-05-15

- The fee-model design call settled on a flat 100 bps taker fee + retention-vs-fees instrumentation rather than committing to a Kalshi-style price curve or Polymarket-style category tiers before the growth mechanic was understood. That decision was recorded in design memory but never landed in code.
- New `DefaultTakerFeeBps = 100` constant in `accounting.go`. `Service.CreateMarket` now applies the default when `req.FeeRateBps == 0`; negative values clamp to 0 as the explicit fee-free escape hatch. Docstring on `CalculateTakerFeeCents` corrected (was claiming 500 bps default).
- Existing 152 markets keep `fee_rate_bps=0` to avoid mid-demo surprise; new markets get the default. Backfill SQL is a follow-up if needed.
- Contract test `TestDefaultTakerFeeBps` locks the value so future changes go through the runbook + metrics gate.

### Backoffice antd 4 → 5 migration — executable plan ready — planned 2026-05-15

- Not a code commit; a `PLAN-antd-5-office-upgrade.md` document. The investigation surfaced that the migration is much smaller than the 115 call sites suggested: 0 `dropdownClassName` usages, 0 `Form.Item noStyle`, 0 LESS theme imports — the main breaking-change surface is one PageHeader wrapper, 6 DatePicker/TimePicker sites (moment → dayjs), 10 `antd/lib/*` subpath imports.
- Plan is 4 phases (~3-5 h total): yarn bump → mechanical rewrites (sed-scriptable for most) → manual click-through on prediction-admin pages → optional theme polish.
- Ready to execute when product OKs starting; risk surface bounded and verification gate defined.

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
