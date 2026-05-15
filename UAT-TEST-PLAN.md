# Hula Na — UAT Test Plan

Step-by-step QA scripts covering every testable workflow. Derived from the 50 consumer journeys in [PRODUCT-USER-JOURNEYS.md](PRODUCT-USER-JOURNEYS.md); the personas there are the *why*, this is the executable *how*.

**Design note (read first):** QA tests workflows, not personas. Many of the 50 journeys exercise the same workflow (12 personas all "place a market buy"). This plan defines the distinct workflows, scripts each one step-by-step, and ends with a **traceability matrix** mapping all 50 journeys → covering test IDs, so "test all workflows" demonstrably covers every journey. No redundant 50 near-identical scripts.

---

## 1. Environment & Setup

| Item | Value |
|---|---|
| Player app | `http://localhost:3010` (Claude Preview) or `:3000` (`npm run dev`) — set **BASE** to whichever you run |
| Backoffice | `http://localhost:3001` |
| Gateway API | `http://localhost:18080` |
| Auth service | `http://localhost:18081` |
| Postgres / Redis | `:5434` / `:6380` (docker) |
| Primary test user | `demo@phoenix.local` / `demo123` → user `u-1`, ~$5,000 wallet after a fresh seed |
| Admin (backoffice) | `admin@phoenix.local` / `admin123` |
| Login route | `BASE/auth/login/` (note: `/login` is a 404 — known) |

**Note:** `alice@predict.dev` / `bob@` / `charlie@` exist in the prediction seed but are NOT wired into the auth service out of the box (per CLAUDE.md). Only `demo@` and `admin@` log in without registering. Use TC-A01 (register) to create additional users.

### 1.1 Seed reset runbook (run before every full UAT pass)

```bash
cd apps/Phoenix-Predict-Combined/go-platform/services/gateway
export GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable"
export WALLET_DB_DSN="$GATEWAY_DB_DSN" WALLET_STORE_MODE=db
make wipe-demo && make demo-data
cd ../../.. && docker compose restart gateway   # MANDATORY — leaderboards stay empty up to 5 min without this
```

After reset, wait ~10s for gateway health, then begin. A fresh seed gives: 152 markets, 25 settled, demo books on order_book markets, u-1 with ~10 open positions + settled history.

### 1.2 Known-good test data (post-fresh-seed)

| Purpose | Ticker | State | Notes |
|---|---|---|---|
| Deep-book live trade (fills) | `UCL-BARCA-2526` | open, ~$5K vol | **Use this for any "successful fill" test** |
| Thin-book reject | `IMP-9C2875EF` | open, low depth | Market BUY here returns status=cancelled, 0 fill |
| Settled YES | `SENATE-DEM-2026` | settled, YES | SETTLED badge + outcome ticket |
| Settled NO | `GPT5-JUL26` | settled, NO | — |
| Settled NO | `UCL-CITY-2526` | settled, NO | u-1 holds a winning NO here |
| High-volume open | `SENATE-GOP-2026` | settled after seed | (it's in the 25 — pick another open one if needed) |

If a market's state differs from this table, the seed is stale — re-run §1.1.

### 1.3 Device / viewport matrix

Run TS-B, TS-C, TS-D at all three: **Desktop 1440×900**, **Desktop 1280×720**, **Mobile 375×812**. Everything else: desktop 1280 unless the test says otherwise.

### 1.4 Conventions

- **PASS** = every step's expected result observed. **FAIL** = any deviation; log step #, expected, actual, screenshot.
- **Severity:** S1 blocks demo/core flow · S2 degrades a workflow · S3 cosmetic/polish.
- Each test lists **Priority** (P0 smoke / P1 core / P2 extended) and **Known issues** (pre-existing — a documented known issue is a conditional pass, flag don't re-file).
- Smoke subset (P0 only) is the 12-test pre-demo regression run — see §11.

---

## 2. TS-A — Authentication & Session

### TC-A01 — Register a new account (P1)
**Journeys:** 34, 35, 36, 37 (referral, incentive farmer, impulse, app-store)
**Preconditions:** Logged out. Fresh email not in `auth_users`.
1. Go to `BASE/auth/login/` → **expect** login card with "Create an account" link.
2. Click "Create an account" → **expect** registration form (or register route).
3. Enter a new email + password, submit → **expect** redirect to `/predict/` authenticated, BAL pill visible.
4. Open `/portfolio/` → **expect** empty positions, $0 (or signup bonus if configured) balance.
**Pass:** New session established, no console errors, balance state correct.
**Known issues:** OAuth ("Google"/"Apple") buttons present — verify they either work or are clearly non-functional; do not fail the suite on stubbed OAuth, log as S3.

### TC-A02 — Log in, existing user (P0)
**Journeys:** 2, 3, 6, 46 + every authed journey
1. `BASE/auth/login/` → enter `demo@phoenix.local` / `demo123` → submit.
2. **Expect** redirect to `/predict/` within ~3s; header shows BAL pill (~$5,000 fresh) + avatar.
3. Reload page → **expect** still authenticated (session persisted).
**Pass:** Authenticated, balance correct, survives reload.

### TC-A03 — Log out (P1)
1. While logged in, open the avatar menu → click Log out.
2. **Expect** redirect to logged-out state; nav shows "Log in"/"Sign up"; Portfolio/Leaderboards/Rewards hidden.
3. Hit `/portfolio/` directly → **expect** redirect to login (not a blank authed page).
**Pass:** Session cleared, gated routes protected.

### TC-A04 — Deep-link → login → return (returnUrl) (P1)
**Journeys:** 36 (impulse from X), 3 (macro tourist)
1. Logged out. Navigate directly to `BASE/market/UCL-BARCA-2526/?side=yes`.
2. **Expect** market page renders read-only (price, chart, order book visible WITHOUT auth).
3. Click the trade CTA → **expect** redirect to login with `returnUrl` in the URL.
4. Log in as demo → **expect** redirect BACK to `/market/UCL-BARCA-2526/` with side=yes preserved.
**Pass:** Public read works logged-out; post-login returns to the exact market+side.
**Severity if fail:** S1 (this is the core acquisition path for journeys 36/22/3).

### TC-A05 — Session expiry & refresh (P1)
**Journeys:** 4 (news-reactor), 24 (live-trader), 46 (lapsed returner)
1. Log in. Leave the tab idle long enough to trigger a token refresh (or force via devtools clearing the access cookie, keeping refresh).
2. Perform an authed action (open /portfolio) → **expect** silent refresh, action succeeds, no forced re-login.
3. Now invalidate the refresh token (clear all cookies) and act → **expect** clean redirect to login, NOT a broken/blank state.
**Pass:** Valid refresh is silent; dead refresh degrades gracefully to login.

### TC-A06 — Multi-tab session (P2)
**Journeys:** primer flagged multi-tab refresh race
1. Log in. Open the app in two tabs.
2. In tab 1, trigger a refresh (idle/act). In tab 2, immediately act.
3. **Expect** both tabs remain usable; no infinite logout loop.
**Pass:** No multi-tab logout cascade.
**Known issues:** Per-ApiClient refresh lock; residual race possible — if tab 2 logs out once but recovers on reload, log S3 not S1.

---

## 3. TS-B — Discovery & Navigation

### TC-B01 — /predict discovery loads (P0)
**Journeys:** 37, 9, 25, 1
1. Logged in, go to `/predict/`.
2. **Expect** within 3s: featured market, "Top movers" rail, category pills (All/Politics/Crypto/Sports/Entertainment/Technology/Economics/General), closing-window pills (All/1D/1W/1M).
3. **Expect** no console errors; market cards show price, volume, close date, image.
**Pass:** Full discovery surface renders, no errors.

### TC-B02 — Category filter (P1)
1. On `/predict/`, click "Politics" → **expect** grid filters to politics markets only, URL/state reflects it.
2. Click "Crypto" → **expect** grid updates. Click "All" → **expect** full grid restored.
**Pass:** Each category filters correctly and reversibly.

### TC-B03 — Closing-window filter (P2)
1. Click "1D" → **expect** only markets closing within 1 day. "1W", "1M", "All" similarly.
**Pass:** Window filter narrows the set correctly.

### TC-B04 — Search (P1)
**Journeys:** 2, 3, 18, 20
1. Type "senate" in the header search → **expect** matching markets within ~1s, keyboard ↑/↓ navigable, Enter opens the market.
2. Search gibberish "zzzzzz" → **expect** graceful empty result, no error.
**Pass:** Relevant results, keyboard nav, clean empty state.

### TC-B05 — Nav active state, every page (P0) ⚠️ regression
**Journeys:** all (wayfinding) — this is the H01 fix
1. Go to `/predict/` → **expect** "Markets" pill is the active (mint-green) one.
2. Go to `/portfolio/` → **expect** "Portfolio" active, "Markets" inactive.
3. `/leaderboards/`, `/discover`, `/rewards` → **expect** the matching nav item active each time, exactly one active.
**Pass:** Exactly one nav item active and it matches the current page on ALL pages including `/predict/` (the trailing-slash bug — must not regress).
**Severity if fail:** S2.

### TC-B06 — Header BAL pill refresh after trade (P0) ⚠️ regression
**Journeys:** 1, 49, all traders — this is the wallet-refresh fix
1. Note the header BAL value.
2. Place a fillable trade (see TC-D01 on `UCL-BARCA-2526`).
3. **Expect** the header BAL pill updates **in the same tab without reload** to the post-trade balance.
**Pass:** BAL pill reflects the debit immediately, no manual refresh.
**Severity if fail:** S2 (was a fixed bug — guard against regression).

### TC-B07 — Cold deep-link, logged out (P0)
**Journeys:** 22, 36, 3
1. Logged out, open `BASE/market/SENATE-DEM-2026/` directly (no homepage).
2. **Expect** full market context renders in <3s WITHOUT auth: question, price/outcome, resolution criteria, chart.
**Pass:** Self-contained, fast, no auth wall to view.

### TC-B08 — Responsive header & nav (P1)
**Journeys:** 40 (mobile-only)
1. At 1440×900: **expect** header content aligned with page content (both within 1280px centered).
2. At 1280×720: **expect** same alignment, no horizontal scroll.
3. At 375×812: **expect** brand mark+wordmark shrink (≤32px tall), BAL pill not truncated to "$5.2K" if space allows, no horizontal scroll.
**Pass:** No misalignment, no horizontal scroll at any of the 3 viewports.
**Known issues:** **No mobile hamburger nav** (H07, TODOS) — Portfolio/Leaderboards/Rewards are NOT reachable on mobile by tap. Log this as **S2 KNOWN** per test pass; do not re-file. Flag if it's *worse* than "links simply hidden."

---

## 4. TS-C — Market Detail States

### TC-C01 — Open market renders fully (P0)
**Journeys:** 17, 24, 4, all traders
1. Open `/market/UCL-BARCA-2526/`.
2. **Expect:** LIVE pill, category, volume/traders/ticker pills, countdown ("Closes in …"), question, resolution blurb, price, range tabs (1H/6H/1D/1W/ALL), chart, order book (≥1 level), recent trades, trade ticket, related markets.
**Pass:** All sections present, no console errors.

### TC-C02 — Settled market state (P0) ⚠️ regression
**Journeys:** 50, 45, 3, 18 — this is the MarketHead/TradeTicket settled fix
1. Open `/market/SENATE-DEM-2026/` (settled YES).
2. **Expect hero:** a `SETTLED · YES wins` badge (NOT a LIVE pill), and `Closed · <date>` (NOT a live "Closes in 172d" countdown).
3. **Expect trade card:** header reads `Settled · YES wins` and body explains the outcome ("This market resolved YES. Winners paid 100¢…"). **Expect NO** pre-filled $25 amount, share count, or payout projection.
4. Repeat on `GPT5-JUL26` (settled NO) → badge says `SETTLED · NO wins`.
**Pass:** No mixed signals — header, badge, and ticket all consistently say settled, no fake countdown, no tradeable-looking ticket.
**Severity if fail:** S2.

### TC-C03 — Price chart range toggle (P2)
1. On an open market, click 1H/6H/1D/1W/ALL in turn.
2. **Expect** chart re-fetches and redraws per range; no error; ALL shows the longest history.
**Pass:** Each range renders distinct, plausible data.

### TC-C04 — Order book display (P1)
**Journeys:** 7, 8, 42
1. On `UCL-BARCA-2526`, inspect the order book.
2. **Expect** bid/ask levels with price + size + cumulative total; "Aggregated · N levels"; updates after a trade (TC-D01).
**Pass:** Book shows real depth, updates post-trade.

### TC-C05 — Halted/closed/voided states (P2)
**Preconditions:** Identify a non-open, non-settled market (admin can halt one via backoffice, or query DB for status='voided').
1. Open such a market → **expect** the ticket is disabled with a status-appropriate message, no tradeable ticket.
**Pass:** Each non-open state blocks trading with a clear message.

---

## 5. TS-D — Trading (Core)

> Always start from a fresh seed (§1.1) if books are depleted from prior runs. Use `UCL-BARCA-2526` for fills, `IMP-9C2875EF` for the thin-book reject.

### TC-D01 — Market BUY YES, fills (P0)
**Journeys:** 1, 2, 3, 4, 12, 31 (the core trade)
**Preconditions:** Logged in as demo, fresh seed, note BAL.
1. Open `/market/UCL-BARCA-2526/?side=yes`.
2. Ticket defaults: Market mode, Buy, YES, $25 → **expect** share count + payout projected.
3. Click `$25` chip (or leave default) → click **Place trade**.
4. **Expect** a success toast: either "Bought N YES shares" (full) or "Partially filled: N of M …" (partial) — NOT a generic "submitted".
5. **Expect** BAL pill decreases by the captured amount (TC-B06).
6. Open `/portfolio/` → **expect** a new/updated UCL-BARCA-2526 YES position with the filled qty.
**Pass:** Order fills, truthful toast, balance + position reflect it.

### TC-D02 — Market BUY NO (P1)
1. Same market, toggle to NO side, $25, Place trade.
2. **Expect** NO-side fill, toast, NO position in portfolio.
**Pass:** NO side behaves symmetrically to YES.

### TC-D03 — Thin-book zero-fill reject (P1)
**Journeys:** primer "no matching liquidity"; 4, 9
1. Open `/market/IMP-9C2875EF/`, Market BUY YES $25, Place trade.
2. **Expect** an honest error/cancel toast: "Order cancelled — no matching liquidity" (or similar) — NOT a false "Bought" toast.
3. **Expect** BAL unchanged; no phantom position in portfolio.
**Pass:** Zero-fill is truthfully reported and wallet/portfolio untouched.
**Severity if fail:** S1 (false success toast is the original bug class).

### TC-D04 — Partial fill then cancel remainder (P1)
1. On a moderately-deep market, place a Market BUY larger than top-of-book depth (e.g. $200).
2. **Expect** "Partially filled: N of M YES — remainder cancelled (no more liquidity)".
3. **Expect** BAL debited only for the filled portion; portfolio shows the partial qty.
**Pass:** Partial accounting is exact; toast states the remainder's fate.

### TC-D05 — Limit BUY rests on book (P2)
**Journeys:** 8 (market maker), 5
1. On `UCL-BARCA-2526`, switch ticket to **Limit**, set a price well below current (won't cross), qty 10, Place.
2. **Expect** "Order resting on the book" info toast; BAL reserves the cost.
3. `/portfolio/` → **Open orders** tab → **expect** the resting order listed.
**Pass:** Limit order rests, cash reserved, visible in Open orders.

### TC-D06 — Cancel an open limit order (P1)
**Journeys:** 8, 43 — ISSUE-002 per-row Cancel
**Preconditions:** TC-D05 completed (a resting order exists).
1. `/portfolio/` → Open orders → click the per-row **Cancel** on the resting order.
2. **Expect** order disappears from Open orders; reserved cash returns to BAL.
3. (API check, optional) `POST /api/v1/orders/{id}/cancel` returned 200.
**Pass:** Order cancelled, reservation released, BAL restored.

### TC-D07 — Sell an existing position (P1)
**Journeys:** 7, 43, 44
**Preconditions:** demo holds a YES position (from seed or TC-D01).
1. Open that market, switch ticket to **Sell**.
2. **Expect** available-shares count reflects the held position (not 0).
3. Sell a partial quantity → **expect** fill toast, position qty decreases, BAL increases.
**Pass:** Sell works, available shares accurate, balance credited.

### TC-D08 — MAX stake button (P2)
**Journeys:** 1, 42 — KNOWN ISSUE
1. On an order_book market with a large wallet, click **MAX**.
2. Place trade.
3. **Expect (current/known):** order likely rejects/cancels because MAX overestimates fillable depth.
**Pass criteria:** Behavior matches the known issue (graceful reject, truthful toast, no balance corruption). **Do NOT** fail the suite for the rejection itself — fail only if it corrupts balance or shows a false success.
**Known issues:** MAX over-estimates book capacity (primer + TODOS). S2 KNOWN.

### TC-D09 — Insufficient funds (P1)
**Journeys:** 39, 47
1. As a low/zero-balance user (fresh registered user, TC-A01), open a market, set an amount above balance.
2. **Expect** the CTA becomes "Add funds" (links to cashier) with a clear "balance below this order" note — NOT a silent failure or confusing reject.
**Pass:** Insufficient funds is caught pre-submit with a constructive path.

### TC-D10 — Insufficient shares on Sell (P2)
1. On Sell tab, set quantity above the held position.
2. **Expect** "Not enough shares" disabled state with the available count shown.
**Pass:** Over-sell blocked pre-submit with the real available number.

### TC-D11 — Quick-amount chips (P2)
1. Click `$5`, `$25`, `$100` in turn → **expect** amount + projected shares/payout update each time.
**Pass:** Each chip sets the amount and recomputes the quote.

### TC-D12 — Trade blocked on settled market (P0) ⚠️ regression
**Journeys:** 50, 45
1. Open `/market/SENATE-DEM-2026/` (settled).
2. **Expect** no functional trade ticket — only the settled outcome panel (per TC-C02). There is no way to submit an order.
**Pass:** Trading is impossible on a settled market; no pre-filled ticket to mislead.

### TC-D13 — Truthful toast matrix (P1)
**Journeys:** 47 (churn-by-loss reframe), 4, 9
Run these and verify the toast text matches the actual order outcome:
| Action | Expected toast class |
|---|---|
| Full fill | success "Bought N YES shares" |
| Partial (IOC market) | success "Partially filled: N of M … remainder cancelled" |
| Zero fill (thin book) | error "Order cancelled — no matching liquidity" |
| Limit rests | info "Order resting on the book" |
**Pass:** Every outcome's toast tells the truth — no "Bought" on a 0-fill.
**Severity if fail:** S1.

---

## 6. TS-E — Portfolio

### TC-E01 — Positions tab (P0)
**Journeys:** 43, 31, 11
1. `/portfolio/` → Positions tab.
2. **Expect** open positions table: market, side, qty, available, avg price, cost. Counts match the seed (~10 for demo on fresh seed) plus any from this session's trades.
**Pass:** Positions accurate vs trades made.

### TC-E02 — Open orders tab (P1)
1. Positions → Open orders tab (after TC-D05).
2. **Expect** resting orders listed with per-row Cancel; empty state ("No open orders") when none.
**Pass:** Resting orders shown; clean empty state.

### TC-E03 — History tab (P0) ⚠️ regression
**Journeys:** 45, 19, 6 — this is the Phase 5 seed fix
1. Positions → History tab.
2. **Expect** ≥3 settled rows for demo on a fresh seed (e.g. UCL-CITY-2526 NO win +$, APPLE-LLM loss, GPT5-JUL loss): market, side, qty, entry, exit, P&L, settled date.
3. **Expect NOT** the empty "Settled positions will appear here…" state.
**Pass:** History populated with mixed-P&L settled entries.
**Severity if fail:** S2 (regression of the Phase 5 expansion).

### TC-E04 — Summary stats (P1)
1. On `/portfolio/` header: Invested, Realized P&L, Open positions, Accuracy (e.g. "1/3"), Weekly P&L rank.
2. **Expect** numbers internally consistent (Accuracy denominator = settled count; rank matches Leaderboards).
**Pass:** Summary tiles consistent with positions/history/leaderboard.

### TC-E05 — Wallet/BAL consistency (P0)
**Journeys:** 49, 44
1. Note BAL. Place a known-cost trade. Note new BAL.
2. **Expect** delta = captured cost (within rounding). Cross-check `/api/v1/wallet/u-1/` if API access available.
**Pass:** UI balance matches ledger after a trade.

---

## 7. TS-F — Leaderboards

> Requires the gateway restart from §1.1 — the recomputer ticks every 5 min; a fresh seed without restart shows empty/stale boards. That is a SETUP step, not a bug.

### TC-F01 — Weekly P&L board (P0)
**Journeys:** 27, 11
1. `/leaderboards/` → Weekly P&L.
2. **Expect** ≥3 ranked traders with P&L values; viewer (demo/u-1) row highlighted if ranked ("#N You").
**Pass:** Board populated, viewer highlight correct.

### TC-F02 — Accuracy board (P0) ⚠️ regression
**Journeys:** 19, 11 — the Phase 5 → 25-settlement fix
1. Accuracy board.
2. **Expect** ≥3 qualified traders with accuracy % (e.g. ~50-55%) — NOT "Nobody has qualified for this board yet."
**Pass:** Accuracy populated post-fresh-seed-and-restart.
**Severity if fail:** S2 if empty AFTER the §1.1 gateway restart (genuine regression); if empty because restart was skipped, that's a test-setup error not a bug.

### TC-F03 — Sharpness board (P1)
1. Sharpness board → **expect** ≥2 qualified traders with ROI values.
**Pass:** Populated (MinSettled=5 + volume floor met by seed).

### TC-F04 — Category Champions (P1)
1. Category Champions → select Politics → **expect** ≥1 ranked trader.
2. Switch to Sports, Crypto → **expect** each category recomputes (some may legitimately be empty if no settled markets in that category — verify against seed, not assumed).
**Pass:** Selector works; populated categories show ranks; empty categories show the empty state cleanly.

### TC-F05 — Empty-state correctness (P2)
**Journeys:** the morning's HIGH finding
1. On a board/category with genuinely no qualifiers → **expect** "Settle N markets … to qualify. Nobody has qualified yet." rendered cleanly (no broken layout, no error).
**Pass:** Empty state is intentional and informative, not a glitch.

### TC-F06 — Tab focus does not stick (P3)
**Journeys:** cosmetic
1. Click through boards via the left list/tabs.
2. **Expect** only the selected board shows active styling after focus moves away (no lingering :focus highlight on a deselected tab).
**Pass:** One active board indicator at a time.

---

## 8. TS-G — Wallet / Cashier

### TC-G01 — View balance & ledger (P1)
**Journeys:** 44, 49
1. Go to the cashier/wallet surface.
2. **Expect** current balance, and a transaction/ledger list (deposits, trades, settlements) that reconciles with portfolio activity.
**Pass:** Balance + ledger consistent and readable.

### TC-G02 — Deposit / fund (P0)
**Journeys:** 34, 39, 16
1. Initiate a deposit of a test amount via the available method.
2. **Expect** balance increases by the deposited amount; a ledger entry appears; BAL pill updates.
**Pass:** Funds credited, reflected everywhere.
**Known issues:** If KYC is required pre-deposit, verify it is progressive/just-in-time (journey 39) — heavy upfront KYC blocking a $20 deposit is at least S2; log it.

### TC-G03 — Withdraw (P0)
**Journeys:** 49 (the master trust gate), 7, 42
1. With a positive balance, request a small withdrawal.
2. **Expect** clear confirmation of amount, fees (if any), and timing BEFORE submit.
3. Submit → **expect** balance decremented, a pending/processed withdrawal record, no surprise fees vs what was shown.
**Pass:** Withdrawal is transparent (fees/timing shown up front) and the balance/ledger update correctly.
**Severity if fail:** S1 — per journey 49 this single experience gates all serious-user deposits.

---

## 9. TS-H — Settlement & Lifecycle

### TC-H01 — Winning position pays out (P0)
**Journeys:** 51, 6, 13, 45
**Preconditions:** demo holds a winning settled position from seed (e.g. UCL-CITY-2526 NO).
1. `/portfolio/` History → locate the winning row.
2. **Expect** P&L positive, exit 100¢, and the payout reflected in wallet balance/ledger (TC-E05/G01).
**Pass:** Winner credited at 100¢/share, ledger shows the payout.

### TC-H02 — Losing position settles to zero (P1)
1. History → a losing row (e.g. GPT5-JUL26 YES).
2. **Expect** P&L negative, exit 0¢, no payout credited, no negative balance.
**Pass:** Loser correctly zeroed, no balance corruption.

### TC-H03 — Resolution criteria visible & sourced (P1)
**Journeys:** 50 (disputer), 21 (skeptic), 3, 12
1. On any market (open or settled), locate the resolution rule + settlement source.
2. **Expect** plain-language criteria and a named source visible on the market page BEFORE and AFTER settlement.
**Pass:** Criteria + source are present and unambiguous (this is the anti-dispute control).
**Severity if fail:** S1 — per journeys 21/50 ambiguous resolution is existential.

### TC-H04 — Settled state end-to-end (P0)
**Journeys:** 45, 50
1. Trade an open market (TC-D01), then (admin path or wait for a seeded settled one) view a market you hold through resolution.
2. **Expect** the position moves Positions → History, P&L computed, market detail flips to settled UI (TC-C02), no trading possible (TC-D12).
**Pass:** Full open→settled lifecycle is consistent across portfolio + market detail.

### TC-H05 — Dormant returner re-entry (P2)
**Journeys:** 46
1. Log in, log out, clear cookies (simulate dormancy), return via `BASE/predict/`.
2. Log back in → **expect** balance + positions intact and obvious, no data loss, painless re-auth.
**Pass:** Returning user's money/positions are preserved and visible immediately.

---

## 10. TS-I — Backoffice (admin-side workflows that gate consumer UAT)

### TC-I01 — Admin login (P1)
1. `http://localhost:3001` → log in `admin@phoenix.local` / `admin123`.
**Pass:** Admin authenticated.

### TC-I02 — Market lifecycle transition (P1)
**Journeys:** enables TC-C05, TC-H04
1. prediction-admin → markets → pick an open market → halt it.
2. Cross-check on the player app (TC-C05) → **expect** the consumer sees the halted state.
3. Resume it → **expect** consumer can trade again.
**Pass:** Admin lifecycle actions propagate to the consumer surface.

### TC-I03 — Manual settlement with attestation (P1)
**Journeys:** 50, 51
1. prediction-admin → settlements → resolve a closed market with an attestation/source.
2. Cross-check consumer side: market flips to settled (TC-C02), winners paid (TC-H01).
**Pass:** Admin settlement drives consumer payout + UI, attestation recorded.

---

## 11. Smoke subset (P0) — pre-demo / pre-release 12-test regression

Run in order after §1.1 reset. If any FAIL at S1, do not demo/ship.

1. TC-A02 — login
2. TC-B01 — discovery loads
3. TC-B05 — nav active state (incl. /predict/) ⚠️
4. TC-B07 — cold deep-link logged out
5. TC-C01 — open market renders
6. TC-C02 — settled market state ⚠️
7. TC-D01 — market BUY fills + truthful toast
8. TC-B06 — BAL pill refreshes after trade ⚠️
9. TC-D12 — settled market blocks trading ⚠️
10. TC-E03 — portfolio History populated ⚠️
11. TC-F01 + TC-F02 — Weekly P&L + Accuracy boards populated ⚠️
12. TC-G03 — withdrawal transparent + correct

The ⚠️ tests guard fixes shipped this development cycle — they are the highest-value regression catches.

---

## 12. Traceability — all 50 journeys → covering tests

Proves "test all workflows" covers every journey in PRODUCT-USER-JOURNEYS.md.

| # Journey | Covering test cases |
|---|---|
| 1 DeFi yield-chaser | A02, B01, D01, B06, G03 |
| 2 Sportsbook crossover | A02, B04, C01, D01, D13 |
| 3 Macro tourist | B07, C02, H03, D01 |
| 4 News-reactor | A05, C01, D01, D03, D13 |
| 5 Scheduled-data scalper | D01, D05, C03 |
| 6 Election-cycle specialist | A02, B02, E01, F01, H01 |
| 7 Cross-platform arbitrageur | D01, D07, C04, G03 |
| 8 Market maker / LP | D05, D06, C04, E02 |
| 9 Longshot lottery player | B01, D01, D03, D13 |
| 10 Favorite-grinder | B03, D01, D13, H02 |
| 11 Copy-trader | F01, F02, E01, E04 |
| 12 Insider-edge believer | C01, H03, D01 |
| 13 Election hedger | A04, D01, H01 |
| 14 Business regulatory hedger | B04, C01, H03, G03 |
| 15 Fan hedger | D01, D02, H01 |
| 16 Crypto-holder hedger | B02, G02, D01 |
| 17 Event-organizer hedger | B04 (unmet-need probe), C01 |
| 18 Journalist / analyst | B07, C02, H03 |
| 19 Reputation forecaster | F02, E03, H03 |
| 20 Crowd-poller | B04, C01, H03 |
| 21 Skeptic stress-tester | D01, H03, C02 |
| 22 Embedded-widget reader | B07 (deep-link landing) |
| 23 Group-chat gambler | (UNMET — no private markets; documents the gap, no positive test) |
| 24 Watch-party live-trader | C01, D01, C03, B06 |
| 25 Meme-market participant | B01, D01, D13 |
| 26 Streamer / creator | B01, D01 (cohort/burst — load test out of UAT scope) |
| 27 Leaderboard climber | F01, F02, F06, E04 |
| 28 Seasonal ritualist | A02, B02, H05 |
| 29 Trash-talk bettor | (UNMET — no head-to-head; documents the gap) |
| 30 Ideologue | A02, D01, C01 |
| 31 Superfan loyalist | B04, D01, E01 |
| 32 Contrarian | B01, C04, D01 |
| 33 Reputation-staker | C01, D01, H03 |
| 34 Referral arrival | A01, G02, D01 |
| 35 Incentive farmer | A01, D01 |
| 36 "Saw it on X" impulse | B07, A04, D01 |
| 37 App-store browser | B01, A01 |
| 38 Confused first-timer | D01 (ticket comprehension — UX heuristic check), D11 |
| 39 KYC/funding bouncer | A01, G02, D09 |
| 40 Mobile-only casual | B08, C01, D01 @ 375px |
| 41 Quant / algo trader | (API suite — TC-D01/D05 via API; full API harness out of UI-UAT scope) |
| 42 Whale | C04, D01, D08, G03 |
| 43 Portfolio manager | E01, E02, E04, D06 |
| 44 Tax-aware closer | E04, G01, D07 |
| 45 One-event tourist | C02, E03, H04 |
| 46 Lapsed returner | A05, H05 |
| 47 Churned-by-loss quitter | D01, D13 (post-loss messaging heuristic) |
| 48 Slow-burn habituator | A01, D11, D01 (micro-stake) |
| 49 Withdrawal-tester | G03, E05, G01 |
| 50 Settlement disputer | C02, H03, H01, H02 |

**Coverage gaps that are product gaps, not test gaps:** journeys 23, 29 (private/group + head-to-head markets) have no positive test because the workflow does not exist — they are tracked as the top roadmap item, not a QA miss. Journeys 26 (creator burst load) and 41 (algo/API) need a load harness and an API test suite respectively, both outside browser-UAT scope — flagged for separate test plans.

---

## 13. Defect logging template

```
[TC-ID] <title>
Severity: S1 | S2 | S3      Priority: P0 | P1 | P2
Env: BASE=__  build/commit=__  viewport=__  seed-run=YYYY-MM-DD
Step #: <which numbered step>
Expected: <from the script>
Actual: <observed>
Repro: always | intermittent (N/M)
Evidence: <screenshot/console/network ref>
Known-issue?: yes(ref) | no
```
