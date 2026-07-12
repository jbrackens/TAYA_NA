# PERFORMANCE_AUDIT — TapTrade Player Platform

Run date: 2026-07-12 · Branch: `feat/store-and-perf-audit` (baseline at `0fc71db6`)
Local rig: Apple Silicon Mac, Postgres 16 (Docker :5434), gateway+auth from
source, player app **production build** served by `next start` on :3010,
same-origin API via Next middleware proxy (mirrors demo.99rtp.io topology).

## 1. Architecture summary

- **Player app**: Next.js 16 App Router (webpack), React 19, Tailwind v4.
  Effectively a client-rendered SPA: 86 `"use client"` files; the only real
  server component is the root layout. All server state via fetch-in-effect
  through `app/lib/api/client.ts` (cookie session + CSRF + single-flight
  refresh) and the shared `PredictionApiClient`. React Query is mounted but
  used by one hook no page calls; Redux (RTK v1, 8 slices) has exactly one
  live slice (`pointBalanceSlice`). i18next loads 11 namespace JSONs
  client-side before first paint (see finding F1). WebSocket lib with
  correct cleanup; channels `market:<id>`, `orderbook:<id>`, `loyalty:<id>`.
- **Backoffice**: Next.js App Router + AntD (not audited for perf here;
  office CLAUDE.md claims of Pages Router are stale).
- **Gateway**: Go 1.25/1.26, stdlib HTTP, Postgres via lib/pq, goose
  migrations (050 = whole-Points rename), no read cache (Redis is
  auth-only). Background workers: MarketCloser, AutoSettler, SMM synthetic
  market maker (30s tick), reconciler (15m), reservation expirer (60s).
- **Wallet/ledger**: `internal/wallet` — Postgres, SERIALIZABLE mutations,
  idempotency via `UNIQUE(entry_type, user_id, idempotency_key)`
  (lookup-first + unique-violation replay recovery), hold/capture/release
  reservations with partial capture. Order money path is one tx under a
  per-market advisory lock.
- **Launch boundary**: legacy cashier/payments route trees exist in code but
  are absent unless `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED=true`, which is a
  boot error in deployed envs; enforced by an extensive guardrail-test wall
  (boot pins, 404 probes, locale-bundle scanners, OpenAPI scans).

## 2. Feature inventory (player-facing, verified in running app)

Working: landing page; discovery (`/predict`: featured hero, movers,
category pills, series/tags, all-markets grid w/ search/sort/watchlist
filter, load-more); `/discover` feed; category pages; market detail (order
book or AMM-preview visuals, price chart, trade ticket buy/sell +
market/limit, recent trades, related markets, comments/social, watchlist);
portfolio (positions/orders/history/accuracy, market hydration); leaderboards
(+detail); rewards (daily claim, 14 missions, 6 streaks, 19 badges, free
point packs [currently zero-configured in deploys], reward limits, loyalty
rank/ledger); activity feed; account (settings, security, notifications,
transactions [full-ledger fetch], RG/KYC/limits behind feature flags);
auth (login/register/reset, social-login buttons per env config); live page
(feature-gated); profile pages; responsive layouts w/ mobile tab bar.

Notable gaps/stubs found while validating: ChatSidebar ships 15 hardcoded
mock messages behind `FEATURE_CHAT` (off) — stub in production code; free
point packs and mission rewards are configured to 0 on the demo deploy (all
mission cards show `0` reward points); **no paid store exists anywhere** —
the wallet/balance chip is display-only, and the trade ticket's
insufficient-balance state is a dead end ("Not enough points", no acquisition
path). These drive the store build (see STORE_AND_PAYMENTS.md).

## 3. Baseline measurements (2026-07-12, pre-change)

### 3.1 Quality gates at baseline

| gate | result |
|---|---|
| `yarn build` (app, prod) | ✅ pass — 33.6s, 35 routes, TS step clean |
| `yarn typecheck` (scoped) | ✅ pass (scoped gate; `typecheck:full` carries ~400 pre-existing errors in legacy `components/` trees, tolerated as baseline by the repo's own script) |
| Lint | ⚠️ no ESLint config exists in any frontend package (nothing to run; `gate.sh` + tsc act as the effective lint wall) |
| `yarn test` (app, node:test, 23 files) | ✅ pass |
| `go test ./...` gateway | ❌ **3 failures** in `cmd/prediction-reconciliation-report` (fixture/handler drift over `amountPoints` after the 050 rename) |
| `go test ./...` auth | ✅ pass |
| Playwright smoke (8 specs) | present; runs in CI vs dev server (desktop project only) |

### 3.2 Lighthouse (v12, mobile form factor, simulated throttling, prod build @ :3010)

| route | perf | a11y | best-p | seo | FCP | LCP | TBT | CLS | SI | JS transferred | requests |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` (landing) | 73 | 95 | 100 | 100 | 3.5s | 4.7s | 75ms | 0.000 | 4.8s | 230KB | 49 |
| `/predict` | 69 | 95 | 96 | 100 | 3.1s | 5.7s | 42ms | 0.000 | 5.5s | 250KB | 96 |
| `/market/SENATE-GOP-2026` | 68 | 95 | 96 | 100 | 3.5s | 6.1s | 46ms | 0.000 | 4.8s | 268KB | 95 |
| `/discover` | 74 | 95 | 100 | 100 | 3.1s | 5.2s | 81ms | 0.000 | 3.1s | 250KB | 116 |

Store/checkout routes: N/A at baseline (feature does not exist yet); they
will be measured against the same method when built.

### 3.3 Authenticated-route request profile (browser, prod build, logged in)

- `/portfolio`: 18 API calls on load — incl. **8 sequential-fan
  `/api/v1/markets/<uuid>` hydration calls (N+1)**, plus
  `starter-grant` POST fired on every session restore. 12 locale JSONs.
- `/rewards`: 13 API calls on mount (loyalty ×3, wallet ×6, bonuses,
  session, status); every claim click refetches 6 collections.

### 3.4 Backend API latency (local, 5-run median, demo dataset ~170 markets)

| endpoint | median | max | payload |
|---|---|---|---|
| `GET /markets?status=open&sort=activity&pageSize=12` | 28ms | 35ms | 18KB |
| `GET /discovery` | 18ms | 19ms | 31KB |
| `GET /markets?categoryId=…&pageSize=50` | 17ms | 19ms | 62KB |
| `GET /markets/{ticker}` | 4ms | 4ms | 1.1KB |
| `GET /categories` | 2ms | 8ms | 1.5KB |
| `GET /series` / `/tags` / `/leaderboards` | 2–3ms | 6ms | ≤3KB |

Interpretation: at demo data volume the gateway is not the user-visible
bottleneck; frontend delivery is. Backend findings below are efficiency/
scale/correctness items and are labeled as such (no inflated claims).

### 3.5 Console / failed requests at baseline

- Local prod build, logged in: no console errors on `/`, `/predict`,
  `/market/*`, `/portfolio`, `/rewards`.
- Deployed demo, anonymous: every visit fires `GET /api/v1/watchlist/markets/`
  → **401** and `POST /api/v1/auth/refresh/` → **400** (avoidable
  unauthenticated calls).
- Best-practices 96 (vs 100) on `/predict` + `/market/*` correlates with
  network noise on those routes.

### 3.6 Bundles

- `.next/static/chunks` total 1.7MB raw; largest chunks 220KB / 196KB /
  188KB (framework) / 144KB (main) / 112KB (polyfills). Per-route transfer
  230–268KB (gzip) per §3.2. No mega-dependency in the client graph; 4
  unused deps in package.json (recharts, formik, react-infinite-scroller,
  react-use-websocket) confirmed by zero-import grep.
- Blocking Google Fonts stylesheet loads 6 families incl. 3 admitted-legacy
  ones (Outfit, Space Grotesk, Schibsted Grotesk) on every page.

## 4. Prioritized findings

Frontend (user-visible):
- **F1 (high)** — First paint of every route is blocked on client i18n init:
  `I18nProvider` renders `<div/>` until 11 locale JSONs fetch
  (`app/lib/i18n/I18nProvider.tsx:63-75`, `config.ts:84-117`). Primary
  driver of FCP≥3.1s / LCP≥4.7s on a localhost prod build.
- **F2 (high)** — Conflicting point conversions: 8 files still ÷100 after
  the 2026-07-07 whole-Points migration (rewards, portfolio, account,
  leaderboards, WageringProgress, ActiveBonuses…), while TopBar renders
  `balance.toFixed(2)` ("520094.00 pts") and market surfaces render whole
  points — user-visible 100× discrepancies between surfaces
  (deployed evidence: seed CLI 158.57M pts vs frontend "15857.1M pts").
- **F3 (high)** — Discover N+1: one price-history request per market on
  mount (`discover/page.tsx:408-416`), 20–40 requests.
- **F4 (med)** — `/predict` fetches 150 markets (3×pageSize 50) to pick 3
  hero slides (`predict/page.tsx:87-136`).
- **F5 (med)** — Market page waterfall: market → event → trades →
  categories awaited sequentially + up to 4 related-market calls
  (`market/[ticker]/page.tsx:642-726`).
- **F6 (med)** — Portfolio N+1 market hydration (one `getMarket` per
  referenced market, §3.3).
- **F7 (med)** — TradeTicket fires `previewOrder` per keystroke, no
  debounce (`TradeTicket.tsx:249-290`).
- **F8 (med)** — `account/transactions` fetches ledger `limit=1000` and
  paginates client-side; wallet-client re-reverses/filters/slices per call.
- **F9 (low-med)** — Blocking 6-family Google Fonts CSS incl. 3 legacy
  families (`app/layout.tsx:24-27`).
- **F10 (low-med)** — Anonymous polling & churn: status banner 30s poll on
  all pages; watchlist/refresh calls fire for logged-out visitors (401/400
  noise, §3.5).
- **F11 (maint)** — Dead weight: 18 unimported components (~2,400 lines),
  6 of 8 Redux slices unused, `useBonusSync` orphaned, 4 unused npm deps,
  self-referential `x ?? x` rename residue across wallet-client/normalizers.
- **F12 (med, correctness)** — Wallet-client claims invalidate the balance
  cache but never update Redux, so the TopBar balance goes stale after any
  rewards claim (fixed as part of store work, which needs live balance).

Backend (efficiency/scale/correctness at load; not user-visible today):
- **B1 (high at scale)** — `GET /markets` activity ranking: 5 window
  functions + per-row 24h-volume LATERAL + regex scrub for every filtered
  row + twin COUNT (`sql_repository.go:245-255,1765-1825,2054-2056`).
- **B2 (high when SMM on)** — SMM tick storm: `ListMarkets(1000)` with the
  expensive default ranking + per-market order/position queries ≈ 700–1500
  queries/30s from one goroutine (`workers/smm.go:239-432`); reconciler
  uses the same worst-case shape every 15m.
- **B3 (med)** — `prediction_payouts` has no `user_id` index; portfolio
  summary/history/accuracy seq-scan it per request (only tenant_id indexed,
  037).
- **B4 (med)** — `GET /wallet/{id}` runs 3 queries incl. double Balance
  (`wallet_handlers.go:390-402`, `service.go:795-818`).
- **B5 (med)** — Every reward claim refetches `Ledger(500)` 3–6× per
  request (`wallet_handlers.go` claim paths).
- **B6 (med, correctness)** — WS hub: `client.channels` written by readPump
  and read by hub goroutine without lock (race); `Disconnect` can
  self-deadlock from hub fan-out when the disconnect queue is full.
- **B7 (low, contract)** — Trades tape: handler clamps limit to 200 but
  service silently resets >100 to 50.
- **B8 (baseline red)** — `cmd/prediction-reconciliation-report` tests
  failing (fixture rejects `amountPoints` as retired while the handler
  contract test requires it) — half-finished rename.
- **B9 (low, correctness)** — Cancel path may overwrite a concurrently
  filled order to `cancelled` (no status precondition in
  `FinalizeRestingOrderAtomic`); rejected orders lose `failure_reason` on
  persist.

## 5. Changes implemented

Each entry: finding → root cause → fix → validation. All changes live on
`feat/store-and-perf-audit`; every layer's full test suite is green after
each group (frontend node:test 325/325, `gate.sh` pass, gateway
`go test ./... -race` clean incl. DB-gated suites).

### Frontend

- **F1 i18n first-paint gate** — root cause: `I18nProvider` withheld the
  entire tree until 11 locale JSONs fetched client-side; SSR shipped an
  empty shell. Fix: EN namespaces statically bundled (+~9KB gz, one shared
  chunk), i18next inits synchronously on server+client
  (`initImmediate:false`, `partialBundledLanguages`), gate removed; non-EN
  locales lazy-load (documented brief-EN-flash tradeoff). Two hydration
  mismatches this unmasked were fixed properly (AuthProvider localStorage
  seeding → effect-time hydration; LanguageSelector locale seeding), plus a
  `currentLocale()` fallback bug. Validation: SSR HTML of `/` now contains
  full real markup (137 text fragments, zero raw keys); zero hydration
  warnings on `/`, `/predict`, `/discover`, logged-in `/portfolio` (worst
  case stored zh-Hans); language switching still works. A build break this
  exposed (`isomorphic-dompurify` bundling on now-prerendered content pages)
  fixed via `serverExternalPackages`.
- **F2 point-display conflicts** — root cause of the marquee 100× bug was
  **backend**: `marketSelectQuery` overlaid imported-catalog stats as
  `ROUND(im.volume * 100)` (cents-era conversion surviving migration 050),
  and the SMM read-modify-write persisted the inflation into
  `prediction_markets.volume_points`. Fixed at source + migration
  `052_imported_market_points_scale.sql` rescales laundered rows (native
  rows untouched); seed CLI unit print fixed. Frontend: all 8 ÷100
  survivors fixed (each first verified whole-Points on the live wire),
  `TopBar` `toFixed(2)` → integer format, plus grep-found extras
  (OrderBook totals, RecentTrades tape, DiscoveryHero local formatter,
  compliance-client RG limits ÷100). One shared module `app/lib/points.ts`
  now owns all point formatting (old local formatters deleted; source-scan
  regression test pins 11 surfaces to it). Three legacy tests that pinned
  the ÷100 bug were corrected. Validation: live before→after —
  header `520094.00 pts` → `523,246 pts`; rewards loyalty 424 → 42,350
  (now equals TierPill); portfolio `0.98/+51.01` → `98 pts / +5,101 pts`;
  leaderboards, bonuses, RG limits coherent; volume `15857M pts` → `137.3M`
  after gateway fix + 052.
- **F3 discover N+1** — histories are all rendered (24h-change column), so
  the fix is a 6-wide concurrency pool replacing the unbounded 24–40
  parallel burst; rendered output byte-identical.
- **F4 predict hero over-fetch** — no cheaper server sort exists
  (verified); `pageSize 50→12` + explicit `sort:activity` per category;
  hero picks empirically identical (activity is volume-dominated);
  150→36 markets fetched.
- **F5 market page waterfall** — post-market fetches (event/trades/
  categories/related/orderbook) now run as one concurrent burst; the
  related-markets chain no longer double-fires (was keyed on the event
  object landing); `loadPositions` keyed on `market?.id` so WS frames and
  post-trade refresh no longer duplicate `GET /portfolio` (2→1 observed).
- **F6 portfolio N+1** — added a minimal `ids` filter to the gateway
  markets list (comma-separated, cap 50 → 400 over cap; text-compare to
  avoid a live-repro 500 on malformed uuid input; launch-scrub + status
  gates verified to still apply, with route tests) + additive
  `getMarkets({ids})` in the shared client; hydration is now 1 batched call
  (was 8–9 per-id GETs).
- **F7 TradeTicket preview churn** — debounced ~250ms with stale-response
  guard (landed with the store work, same file owner).
- **F8 transactions over-fetch** — the page had drifted worse than audited:
  client pagination lied ("Page 1 of 1" always; rows beyond newest 10
  unreachable). Now one `limit=200` window, real client pagination
  ("Page 1 of 7"), honest "most recent 200" note only when the window is
  full; CSV export uses the server's real 500 clamp with an honest
  truncation toast.
- **F9 fonts** — Outfit + Space Grotesk dropped (verified unused; Schibsted
  kept — wordmark), preconnects added; rendered typography unchanged.
- **F10 anonymous churn** — watchlist fetch gated on auth;
  `refreshSession()` skips when no session evidence exists (cookie/token/
  stored user). Anonymous pages: zero watchlist 401s, zero refresh 400s,
  zero EN locale fetches. Starter-grant claim now sticky per user
  (fires once, not on every restore).
- **F11 dead weight** — deleted 29 files / 2,856 lines (20 zero-importer
  components incl. the 449-line IdComplyModal, 7 Redux slices + barrel,
  orphaned `useBonusSync`); `store.ts` reduced to the one live reducer;
  5 npm deps removed (recharts, formik, react-infinite-scroller + types,
  react-use-websocket); FEATURE_MANIFEST honestly flipped 25 entries to
  RETIRED (71 REAL / 0 STUBBED / 0 MISSING). All deletions re-verified
  zero-referenced before and after. Self-referential `x ?? x` rename
  residues collapsed across wallet-client and the market WS normalizer.
- **F12 stale TopBar after claims** — claims/purchases now dispatch the
  fresh balance to Redux in addition to invalidating the wallet-client
  cache (landed with the store work).
- **Bonus UI fix** — market header duplicate status ("Settled · Settled ·
  NO wins · POLITICS · Settled" → "Settled · NO wins · POLITICS").

### Found and fixed by the E2E journey pass

- **Store checkout race (functional)** — the purchase-hydration effect
  reset purchase state whenever the URL lacked `?purchase=`, which could
  fire between `setPurchase()` and `router.push()` committing — wiping the
  just-created purchase and killing the transition (server had the
  purchase; UI stayed on the pack grid with no error; deterministic under
  Playwright timing, intermittent for real users). Guarded with a
  pending-push ref; refresh-safety unchanged.
- **320px overflow (responsive)** — 109px horizontal scroll at 320px from
  the unshrinkable TopBar right cluster and fixed-width tab-bar items;
  Add Points pill now hides <420px (the balance chip remains the store
  entry), language selector hides <360px, cluster shrinks, tab items
  clamp. Verified by an automated 320px no-overflow test.
- **Anonymous 401 churn, rounds 2–3** — signed-out visitors typing in the
  trade ticket fired the authenticated preview endpoint per keystroke,
  and every anonymous market view fired the authenticated comments
  endpoint (both guaranteed 401s + console errors, deployed too). Both
  now auth-gated with signed-out UI states.
- **Ticket balance line** — last surviving `toFixed(2)` points display.
- **Stale spec drift corrected (pre-existing, not regressions)** — the
  bonus-API spec still asserted cents-hybrid aliases retired on
  2026-07-07; the market-ticket spec referenced quick-amount chips
  removed in an earlier redesign (their aria-labels also still said
  "$100"); the login spec expected a demo-credential hint the P9 redesign
  removed. Each was re-expressed against current, verified product
  behavior without weakening the regression it protects.

### Backend

- **B1 markets activity ranking** — ranking joins (5 window fns + 24h
  LATERAL) are now skipped entirely for non-activity sorts; new internal
  `id` sort. Public API behavior unchanged.
- **B2 SMM/reconciler storm** — both workers use the cheap sort:
  worker-shape query 7.674ms → 3.310ms on demo data (EXPLAIN ANALYZE, no
  WindowAgg, no per-row trades aggregate); the win grows with trade volume
  (eliminated term was O(markets × 24h-trades)). Every 30s (SMM) + 15m
  (reconciler).
- **B3 payouts index** — **no change needed**: the exact index already
  exists (`015_loyalty_leaderboards.sql:84-85`,
  `idx_pred_payouts_user_paid`); verified present + used
  (`enable_seqscan=off` shows index scan; planner rightly seq-scans a
  28-row table). Recorded per the no-speculative-index rule.
- **B4 wallet read** — `GET /wallet/{id}` 3 queries → 1
  (`BalanceSummary`, exact parity incl. memory mode, tested both modes).
- **B5 reward-claim refetch** — claims now fetch the ledger once per phase
  and pass it through: missions/streaks claim 5→2 fetches, packs 4→2,
  daily 3→2; pinned 200-row pack window preserved exactly (equivalence
  test); 3× badge evidence recompute hoisted. All ~45 pinned wallet
  handler tests green.
- **B6 WS hub** — data race on `client.channels` (readPump vs hub
  goroutine) fixed with a client-side mutex + snapshot reads; hub-internal
  disconnect no longer blocks (non-blocking enqueue + drop counter
  `gateway_ws_disconnects_dropped_total`); both defects reproduced by new
  tests before the fix, `-race -count=3` after.
- **B7 trades clamp** — service ceiling aligned to the documented
  OpenAPI max (200); boundary-tested.
- **B8 reconciliation-report tests (baseline red)** — root cause: the 050
  rename sweep mechanically converted the fixture loader's *ban list* of
  retired cents-era literals into bans on the live points vocabulary.
  Ban list restored to cents-era terms (+ kept `stakePoints` banned as a
  retired bet concept); alignment-drifted test needle fixed. Nothing the
  tests protect was weakened. All 4 green.
- **B9 cancel race + failure_reason** — terminal UPDATE now guarded by a
  status precondition (0 rows → rollback + idempotent already-terminal
  path; 8-iteration cancel-vs-fill race test proves exactly-one-winner);
  `failure_reason` now persisted on both reject paths (column existed,
  no writer).

### Store (new feature — see STORE_AND_PAYMENTS.md for full detail)

- Gateway `internal/store` package + migration 051 (packs/purchases/
  payment-events + 5-pack seed), demo provider (success/failure/cancel/
  delayed), one-tx idempotent fulfillment via wallet ledger
  (`store_purchase:<id>` keys; reasons outside the free-faucet limiter),
  HMAC webhook boundary, `STORE_ENABLED` flag + boot validation; zero
  existing guardrail tests modified; live-smoked end to end incl. replay
  and signature rejection. Frontend store UI + checkout flow per
  STORE_AND_PAYMENTS.md §8.

## 6. Before/after measurements

Same rig + methodology as §3 (Lighthouse 12, mobile form factor, simulated
throttling, prod build on :3010, local gateway).

### 6.1 Lighthouse (final build, all fixes in)

| route | perf | best-practices | simFCP | simLCP | requests |
|---|---|---|---|---|---|
| `/` | 73 → **74** | 100 → 100 | 3.5 → 3.4s | 4.7 → **4.3s** | **49 → 37** |
| `/predict` | 69 → **72** | 96 → **100** | 3.1 → 3.2s | 5.7 → **5.3s** | **96 → 83** |
| `/market/*` | 68 → **71** | 96 → **100** | 3.5 → 3.3s | 6.1 → **5.4s** | **95 → 78** |
| `/discover` | 74 → 72 | 100 → 100 | 3.1 → 3.0s | 5.2 → 5.8s | **116 → 105** |

Accessibility 95 and SEO 100 unchanged; **best-practices 96→100** on
`/predict` and `/market/*` (anonymous failed-request noise eliminated).
CLS 0.000 throughout. No regressions in a11y/BP/SEO. Run-to-run variance
on these sims is ±2-3 points / ±0.4s (discover's LCP delta is within it;
its request drop and byte drop are real). `/store` and checkout are
session-authenticated routes (Lighthouse anonymous runs measure the login
redirect), so they're profiled via the browser instead in §6.3.

**Honest interpretation.** Simulated FCP/LCP barely move because the app is
an all-client SPA: on the recorded trace every route's first paint lands
after the JS bundle executes, so Lighthouse's simulation models paint as
JS-dependent regardless of the now-real SSR HTML. The materially improved
facts that the sim can't see: SSR now delivers full visible content markup
(baseline: an empty `<div>` — nothing until 11 locale fetches + hydration;
plus the landing hero shipped `opacity-0` until a JS reveal — both fixed),
11–13 render-blocking locale fetches are gone, request counts dropped
11–24% per route, hydration warnings are zero, and on real networks (where
JS transfer dominates) visible-content paint no longer waits for it.
**Lighthouse perf ≥90 was not reached** — see §7 for the confirmed
bottleneck and recommended next action.

### 6.2 Build & bundles

- Production build time: 33.6s → **16.6s**.
- `.next/static/chunks`: 1,708KB → 1,736KB raw (+28KB = statically bundled
  EN locale chunk, ~9KB gz — the deliberate trade for killing the
  render-blocking locale fetches). Deleted components/deps were already
  tree-shaken, so their win is build time, typecheck surface, and
  maintenance, not shipped bytes.

### 6.3 Request-profile deltas (authed pages, browser-verified)

- `/portfolio`: 18 API calls → 10 (market hydration 8–9 per-id GETs →
  1 batched `ids=` call; starter-grant no longer fired per restore).
- `/market/*` post-trade: duplicate `GET /portfolio` eliminated (2→1);
  secondary loads parallelized; related-markets chain single-fire.
- `/account/transactions`: 1 × `limit=200` fetch with real pagination
  (was `limit=1000` request + client pagination that reported "Page 1 of
  1" regardless).
- Anonymous visits: watchlist 401 and refresh 400 churn — zero.
- Backend worker load: SMM/reconciler market-list query 7.674ms →
  3.310ms (EXPLAIN ANALYZE, demo data; the eliminated per-row 24h-volume
  lateral scales with trade volume).

### 6.4 Correctness deltas (user-visible)

- Header balance `520094.00 pts` → `523,246 pts` (live); rewards loyalty
  panel now matches TierPill (was 100× low); portfolio/account/leaderboard
  figures whole-point coherent; discovery volumes true-scale (`15857M pts`
  → `137.3M pts` for the same market) after the gateway ×100 overlay fix +
  migration 052.
- Go suite: 3 failing tests at baseline → 0 failing across the full
  gateway+auth suite under `-race` with live DB.

## 7. Remaining constraints & recommended future work

1. **Client-rendered SPA paint ceiling (the ≥90 blocker).** Confirmed
   bottleneck: all content-bearing routes hydrate a full client tree
   before their data paints (86 `"use client"` files; data fetched
   post-hydration). Changes attempted: synchronous i18n init + bundled EN,
   SSR-visible landing content, fewer/cheaper requests — these improved
   real first-paint conditions but cannot move simulated LCP while paint
   depends on the bundle. Recommended next action: incremental React
   Server Components adoption starting with the static landing page and
   the discovery shell (server-fetch initial market lists), which the
   build now makes feasible (SSR HTML is already real). Explicitly out of
   scope this pass per the no-broad-rewrite rule.
2. **Store admin UI** — DONE (owner decision 2026-07-12): office "Point
   Packs" page + RBAC-gated gateway admin API with validation, launch-copy
   screening, and audit logging (STORE_AND_PAYMENTS.md §13). Verified live
   (round-trip save through the office UI).
3. **RG/compliance posture for purchases** — DONE (owner decision
   2026-07-12: yes): purchases count toward responsible-play deposit
   limits and are jurisdiction-gated on the deposit surface
   (STORE_AND_PAYMENTS.md §12; six new tests incl. exactly-once recording
   and fail-closed deployed-env behavior).
4. **Deploy wiring** — DONE: `docker-compose.demo.yml` +
   `deploy-demo.yml` now carry the store env with a per-deploy generated
   webhook secret (STORE_AND_PAYMENTS.md §14). Faucets coexisting with the
   paid store remains an open economy-design decision (brief provided
   separately).
5. **Deferred small items** — TopBar search loads 100 markets per focus
   (kept: needs UX decision on server-side search); rewards page refetches
   6 collections per claim (kept: correctness-first pattern);
   `react-code-input`/`react-gtm-module`/`next-i18next` look unused but
   were outside the verified removal list; office legacy Jest trees remain
   quarantined; `WalletBreakdownInline` manifest entry is pre-existing
   staleness. E2E runs desktop+mobile Chromium locally; WebKit/Firefox
   coverage is best-effort per environment.
6. **Environment constraints noted for honesty**: mobile-viewport manual
   QA in this session's browser pane was limited; true 375px/320px
   verification is covered by the Playwright mobile project and the
   automated 320px no-overflow test. 200%-zoom review was approximated by
   the 320px reflow coverage plus the AA-audited token system (no
   dedicated zoom pass). WebKit/Firefox E2E was not achievable in this
   environment (pinned-version browser downloads stalled); coverage is
   Chromium desktop + mobile via the system Chrome channel — running
   `npx playwright install webkit firefox` on a machine with normal
   network access and adding two config projects is the follow-up.
7. **Manual QA evidence (store)**: keyboard — pack cards are native
   buttons with `aria-pressed`, Tab reaches them with the visible 2px
   focus ring, and Enter/Space select (verified via trusted Playwright
   input after this session's browser pane proved unreliable for
   synthetic keys); route protection redirects logged-out `/store` to
   login; refresh/back-forward safety is covered by the journey specs
   (purchase id in URL, server-state rehydration); simulated-checkout
   labeling is explicit on the checkout panel; no modals in the store
   flow (page-state based), so no focus-trap surface was added.
