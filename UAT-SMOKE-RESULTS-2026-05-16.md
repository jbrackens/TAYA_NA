# UAT Smoke Run — Results (§11 subset + §14 behavioral)

**Date:** 2026-05-16 · **Build:** branch `feat/binary-exchange-engine` @ `321abe91` (code @ `8e390cb1` + primer doc) · **Env:** BASE=`http://localhost:3010`, desktop 1280×800 (mobile 375×812 for BX-25), `demo@phoenix.local` → u-1
**Executed by:** automated (Claude Preview browser) · **Plan:** [UAT-TEST-PLAN.md](UAT-TEST-PLAN.md) §11 + §14 · **Predecessor:** [UAT-SMOKE-RESULTS.md](UAT-SMOKE-RESULTS.md) (2026-05-15)

## Verdict

**§11: 12/12 PASS.** Reproduces the primer baseline — every ⚠️-guarded fix (F-1..F-4) held on a freshly-restarted stack. Ship-clean for the P0 smoke path.

**§14: 23/25 PASS · 2 findings** (1 × S2, 1 × S3). Both are **new findings**, not regressions of this cycle's shipped fixes:
- **D-1 (S2)** — market **SELL** of a held position returns 0-fill/cancelled even though the YES bid book has depth. Truthful (no false success, no balance/position corruption) but breaks the take-profit / position-exit workflow. Also implicates §5 TC-D07.
- **D-2 (S3)** — Accuracy leaderboard `SETTLED` column renders "—" for every trader (the entries API returns no settled-count field). Accuracy % and ranks are present, so the copy-trader/reputation workflow still functions.

Two §14 rows pass **with a documented seed-state caveat** (BX-06, BX-07) — the canonical data instances don't exist because the F-1 seed deterministically settles the ~25 near-certain / politics markets. Same root-cause class as the documented gotcha #1 ("search senate = 0 results is correct, not a bug"); the underlying workflows are validated generically.

---

## §11 — Smoke subset (run order: B07 before A02 per primer)

| # | Test | Result | Sev | Evidence |
|---|---|---|---|---|
| 1 | TC-A02 login | ✅ PASS | — | →/predict/, BAL $4961.66 (available), survives reload. Wallet API: balance $5244.99 = available $4961.66 + reserved $283.33 (F-3 split working) |
| 2 | TC-B01 discovery loads | ✅ PASS | — | Featured, Top movers (6), 8 category pills, 4 window pills, 12 cards w/ price+vol+close+image; zero console/server errors |
| 3 | TC-B05 nav active state ⚠️ | ✅ PASS | — | Exactly one active: Markets on /predict/ (`aria-current=page`, trailing-slash guard holds), Portfolio on /portfolio/, Boards on /leaderboards/ |
| 4 | TC-B07 cold deep-link logged out | ✅ PASS | — | SENATE-DEM-2026 logged out: breadcrumb, SETTLED·YES badge, question, resolution criteria, chart, order book (10 lvls), recent trades. "Log in"/"Sign up" shown |
| 5 | TC-C01 open market renders | ✅ PASS | — | UCL-BARCA-2526: LIVE pill, countdown, question, resolution, range tabs, chart, order book, recent trades, ticket, related. No console errors |
| 6 | TC-C02 settled market state ⚠️ | ✅ PASS | — | SENATE-DEM-2026 "SETTLED·YES wins" + "This market resolved YES."; GPT5-JUL26 "SETTLED·NO wins" + "resolved NO". No LIVE pill, no fake countdown, no tradeable ticket |
| 7 | TC-D01 market BUY YES fills ⚠️ | ✅ PASS\* | — | UCL-BARCA YES $25: order req=178 **filled=162** (IOC remainder cancelled — valid partial), BAL −$24.92, position 495→657 (+162), cost +$24.92. *\*see O-2: submission driven via product React onClick prop; CDP click is a no-op in this preview harness (gotcha #3 class) — product handler verified correct via DB+wallet* |
| 8 | TC-B06 BAL pill refresh ⚠️ | ✅ PASS | — | $4961.66 → $4936.74 in-tab, no reload; equals post-trade wallet `availableCents` exactly (−$24.92) |
| 9 | TC-D12 settled blocks trading ⚠️ | ✅ PASS | — | SENATE-DEM-2026: no Place-trade button, 0 amount chips, no amount input, no trade-related buttons — only the resolved-outcome panel |
| 10 | TC-E03 portfolio History ⚠️ | ✅ PASS | — | History tab = 10 settled rows (not empty state). Columns MARKET/SIDE/QTY/ENTRY/EXIT/P&L/POINTS/SETTLED; mixed P&L (AVATAR3-200M, APPLE-LLM-2026, US-RECESSION-2026, …) |
| 11a | TC-F01 Weekly P&L | ✅ PASS | — | 5 ranked: #1 You u-1 $24.95 (viewer highlighted, matches portfolio Realized P&L), #2 tradebot $6.18, #3–5 negative |
| 11b | TC-F02 Accuracy ⚠️ | ✅ PASS | — | 5 qualified: #1 You u-1 70.0%, 54.2%, 50.0%, 47.8%, 44.8% — NOT "Nobody has qualified". F-1 fix holds (post-seed `qualifiers_ge10 = 5`) |
| 12 | TC-G03 withdrawal | ✅ PASS | — | Fee/amount/total shown **pre-submit** ($10 / 2% $0.20 / Total $9.80). $10 withdraw → header BAL $4936.74→$4926.74 in-tab, cashier AVAILABLE −$10, RESERVED $283.33→$293.33. F-3 fix working (pending-withdrawal accounting correct) |

**§11 verdict: 12/12 PASS** — matches primer baseline. All ⚠️ regression guards held.

---

## §14 — Behavioral smoke (BX-01..25)

| ID | Journey | Result | Note |
|---|---|---|---|
| BX-01 | impulse visitor | ✅ PASS | =TC-B07: logged-out deep-link, full context, "Log in" visible |
| BX-02 | sportsbook crossover | ✅ PASS | search "barcelona" → UCL-BARCA hit; opened market shows 14¢ + 14.0% implied prob |
| BX-03 | macro tourist | ✅ PASS | resolution criteria visible pre-trade; API exposes `settlementSourceKey`/`settlementRule` |
| BX-04 | news-reactor | ✅ PASS | Top movers rail (6) renders; movers link to markets that open with live price |
| BX-05 | longshot | ✅ PASS | IMP-C5A02A81 YES 1¢, open & reachable (200) |
| BX-06 | favorite-grinder | ✅ PASS\* | *Top open-market YES = 81¢ (IMP-68C2FE5C); no ≥85¢ exists — seed settles the near-certain markets (F-1). Scan→open workflow validated; strict ≥85¢ unmet by seed data, not a product defect* |
| BX-07 | election hedger | ✅ PASS\* | *Canonical politics markets (SENATE/HOUSE) all settled (gotcha #1 class). Politics-category IMP markets are openable; buy→position mechanism proven via TC-D01/BX-14/BX-17* |
| BX-08 | fan hedger | ✅ PASS | sports market (UCL-BARCA) trade → position recorded (TC-D01) |
| BX-09 | watch-party | ✅ PASS | UCL-BARCA recent trades reflect the TC-D01 fill (YES 100@15¢ + 62@16¢ = 162) |
| BX-10 | leaderboard climber | ✅ PASS | `/me/leaderboards`: accuracy rank 1, pnl_weekly rank 1 — consistent with /leaderboards "#1 You" and /portfolio "#1 70.0%" |
| BX-11 | copy-trader | ✅ PASS | Accuracy board ≥3 named entries (u-1, Trader #2, charlie, bob, tradebot) |
| BX-12 | reputation forecaster | ❌ **FAIL** | **D-2 (S3)**: accuracy % populated, but `SETTLED` column shows "—" for all rows (entries API returns no settled-count field) |
| BX-13 | crowd-poller | ✅ PASS | implied probability readable on market pages; no order placed |
| BX-14 | skeptic | ✅ PASS | contrarian YES buy on lopsided SOL-300-Q2 (15% prob): 31/33 filled, IOC remainder cancelled, BAL −$4.96 exact — truthful |
| BX-15 | category browser | ✅ PASS | UI pills All→Politics→Crypto→Sports each yield a distinct grid (client-side filter) |
| BX-16 | closing-soon hunter | ✅ PASS | All=12, 1W=4, 1D=0 (1D≤1W≤All; filtered set differs from All) |
| BX-17 | portfolio manager | ✅ PASS | 2 session trades (UCL-BARCA 657, SOL-300-Q2 31) both in Positions |
| BX-18 | take-profit seller | ❌ **FAIL** | **D-1 (S2)**: Sell tab correctly shows "Available 657", but market SELL ×2 (req 35, type=market) → filled=0, cancelled, despite YES bids 13¢×100 / 12¢×266 in book. Position/balance unchanged |
| BX-19 | limit-order canceller | ✅ PASS | limit YES 500@5¢ rests (status=open), reserves +$25, in Open orders w/ per-row Cancel; cancel → status=cancelled, reservation released, available restored. (validates TC-D05/D06) |
| BX-20 | tax-aware closer | ✅ PASS | Accuracy "7/10" (denom 10 = History settled count 10); Realized P&L +$24.95 = leaderboard metricValue 2495. Internally consistent |
| BX-21 | one-event tourist | ✅ PASS | =TC-E03: u-1 settled holdings in History with ENTRY/EXIT/P&L/SETTLED |
| BX-22 | withdrawal-tester | ✅ PASS | deposit $25 → balance $5215.11→$5240.11; withdraw $10 → available−$10/reserved+$10 (TC-G03). Both directions correct |
| BX-23 | lapsed returner | ✅ PASS | logout (session 401) → re-login → balance $5240.11 and 3 positions both exactly intact |
| BX-24 | funding bouncer | ✅ PASS | `?amount=999999` → "Add funds" CTA + "Your available balance is below…" + balance/amount shown; no "Place trade", no silent fail |
| BX-25 | mobile casual | ✅ PASS | 375px: bottom nav (Markets/Portfolio/Boards/Rewards/Account) fixed at y=740, Portfolio nav works; market ticket CTA 269px in-bounds, 4 chips, no horizontal overflow |

**§14 verdict: 23/25 PASS · BX-12 FAIL (S3) · BX-18 FAIL (S2).** BX-06/BX-07 pass with documented seed-state caveats.

---

## Defects (§13 template)

### D-1 — Market SELL of a held position returns 0-fill despite resting bids (S2)

```
[BX-18 / TC-D07] Market SELL of held position 0-fills with bid liquidity present
Severity: S2          Priority: P1
Env: BASE=:3010  build=321abe91  viewport=1280x800  seed-run=2026-05-16
Step #: BX-18 — /market/UCL-BARCA-2526/, Sell tab (u-1 holds 657 YES), $5 then $25, place
Expected: market sell crosses into the YES bid book → partial/full fill, position qty drops, wallet credited
Actual:  order created side=yes order_type=market status=cancelled filled=0 (×2: 23:45:33 & 23:46:53).
         Position stays 657, balance unchanged. Sell tab DOES correctly show "Available 657".
         Orderbook API at the time: YES bids 13¢×100, 12¢×266, 11¢×100 (≥466 depth) — liquidity existed.
Repro: always (2/2)
Evidence: prediction_orders rows (id 9f24a3ce…, market type, filled=0); orderbook API yes.bids depth
Known-issue?: no — distinct from TC-D03 thin-book (there the book is empty; here bids exist)
```
**Impact:** Journeys 7 (cross-platform arbitrageur), 43 (portfolio manager), 44 (tax-aware closer) — a user cannot exit a position via market sell. Truthful failure (0-fill correctly reported as cancelled, no false "Sold" toast, no balance/position corruption → **not S1**), but the position-exit path is non-functional. Buy-side market matching works (TC-D01 filled 162/178), so the defect is asymmetric to the SELL path.
**Fix direction:** investigate the IOC market-sell matching path — the sell of YES is not crossing into resting YES bids (engine may be matching sell-YES against YES *asks* (empty) instead of YES *bids*, or a marketable-sell slippage guard is rejecting at the best bid). Add an integration test: seed a YES bid, hold a YES position, market-sell, assert fill + position decrement + wallet credit.
**Status: FIXED — commit `2301aeea`.** Root cause was deeper than the matching gate: `BuildPlan` gated the secondary loop Buy-only, AND the exchange settlement path never credited sellers at all. Both fixed (ungate secondary for sells; add `plan.SellerCredits` consumed in `PersistMatchAtomic`). Re-verified live + 3× in §15 (SX-01/02/15).

### D-2 — Accuracy leaderboard SETTLED column unpopulated (S3)

```
[BX-12] Accuracy board "SETTLED" column shows "—" for every trader
Severity: S3          Priority: P2
Env: BASE=:3010  build=321abe91  seed-run=2026-05-16
Step #: BX-12 — /leaderboards/ → Accuracy board
Expected: each row shows accuracy % AND settled-markets count
Actual:  accuracy % populated (70.0/54.2/50.0/47.8/44.8); SETTLED column = "—" for all 5 rows.
         GET /api/v1/leaderboards/accuracy/entries/ entries have {boardId,displayName,metricValue,rank,
         userId,windowStart,windowEnd} — no settled-count field is returned.
Repro: always
Evidence: entries API payload (no settled field); UI raw "RANK TRADER ACCURACY SETTLED … #1 You u-1 70.0% —"
Known-issue?: no
```
**Impact:** Journeys 11 (copy-trader), 19 (reputation forecaster) — the accuracy % and rank (the primary signals) are present and correct, so the workflow still functions; the per-trader sample-size context is missing. Cosmetic/informational. The viewer's *own* accuracy denominator IS shown elsewhere ("7/10" on /portfolio and /account).
**Fix direction:** include `settledCount` in the leaderboard entries projection and render it in the SETTLED column (the value exists server-side — it's the accuracy denominator).
**Status: FIXED — commit `8e789950`.** ListEntries enriches accuracy entries with a grouped `COUNT` over `prediction_payouts` in the snapshot window (mirrors the RecomputeAccuracy denominator); read-only, scoped to the accuracy board, no migration. HTTP regression test added; gateway suite 24/24, app gate 8/8. Verified live: SETTLED column shows 10/20/18/19/25 (u-1=10 matches portfolio "7/10"), no "—".

---

## Observations (not defects — context for the next run)

- **O-1 — seed over-settle, benign.** Post-seed: `settled = 29` (primer expects ~25), but `payouts = 109` (in 100–128) and `qualifiers_ge10 = 5` (exact — the F-1 guard). u-1 ends with **2 open positions + 10 settled history rows**: the F-1 seed deterministically settles ~25 markets including u-1 holdings (§1.2 even names APPLE-LLM as a demo settled-loss), so History is rich and open positions are sparse. The ~4 extra settled vs 25 is the AutoSettler's 60s tick firing after the reseed. **Consequence:** §5 TC-E01 ("~10 open positions" — not in the smoke subset) would deviate to 2; this is the documented seed characteristic, not a product defect.
- **O-2 — preview-harness React-event boundary (gotcha #3 class).** A real CDP `preview_click` on `button.tt-cta` ("Place trade"), Sell, chips, and tabs is a **no-op** — no fetch, no state change. Invoking the element's React `onClick` prop directly drives the correct product behavior (buy filled, limit rested, cancel released reservation, deposit/withdraw worked). This is an automation limitation, **not a product defect** — every product handler was verified correct via DB + wallet API. Worth folding into the primer/§1 alongside the login native-setter and search-onFocus notes.
- **O-3 — fresh preview server starts at 0×0 viewport.** The new dev server's preview viewport was `innerWidth=innerHeight=0`; all clicks silently miss until `preview_resize` is called. The first ~3 TC-D01 click attempts failed for this reason alone. **Add to preconditions:** `preview_resize` to a real size immediately after `preview_start`, before any interaction.

## Regression diff vs predecessor (2026-05-15: 9P/1F/1P/1blocker)

| Prior finding | This run |
|---|---|
| F-1 seed nondeterminism → TC-F02 empty | **Closed** — TC-F02 5 qualified, `qualifiers_ge10=5` stable |
| F-3 withdrawal BAL invisible / no timing | **Closed** — TC-G03 PASS, header BAL + cashier RESERVED move in-tab |
| F-4 History >100¢ | **Closed** — u-1 History clean (0–99¢), 10 rows |
| F-2 mobile nav | **Closed** — BX-25 bottom nav works at 375px |
| — | **D-1 (S2)** market SELL 0-fill — found & **FIXED** (`2301aeea`); exposed+fixed missing seller-proceeds settlement |
| — | **D-2 (S3)** accuracy SETTLED column "—" — found & **FIXED** (`8e789950`) |

---

## §15 — Extended smoke (SX-01..20)

Second pass, same date. Reseed + gateway restart + fresh login. None duplicate §11/§14.
Weighted toward regression-guarding the D-1 sell + seller-credit fix (commit `2301aeea`),
plus untested areas (settlement, portfolio/wallet reconciliation, auth gating, backoffice).

**Verdict: 18 PASS · 2 PARTIAL (harness origin-lock, no defect) · 0 new defects.**
D-1 independently re-verified end-to-end through SX-01/02/15 (sell fills, position
decrements, wallet credited the exact proceeds, ledger "secondary fill proceeds"
entries reconcile to balance).

| ID | Scenario | Result | Evidence |
|---|---|---|---|
| SX-01 | Sell held position via UI (D-1 regression) | ✅ PASS | "Available 587", order filled 35/35, pos 587→552, wallet $5294.52→$5299.07 (+$4.55 = 35×13¢ exact), trade recorded |
| SX-02 | Large sell within holdings, exact accounting | ✅ PASS | $25 sell filled 178/178 multi-level, pos 552→374 (−178 exact, ≥0), wallet +$22.01 = exact proceeds |
| SX-03 | Oversell guard (qty > held) | ✅ PASS | $100 (~770 sh > 552 held) → CTA disabled "Not enough shares", "Available 552" shown, no order |
| SX-04 | Market BUY NO fills | ✅ PASS | order `no filled` 5, NO pos qty=5 cost $4.40, wallet −$4.40 exact (symmetric to YES) |
| SX-05 | Thin-book reject truthfulness | ✅ PASS\* | IMP-9C2875EF partial-filled 101/108 via issuance; status=cancelled, pos +101 exact, wallet −$24.85 exact. *No false success / phantom / corruption (S1 invariant holds). Note: "thin/0-fill" market designation is stale post issuance-fix* |
| SX-06 | Oversized partial accounting | ✅ PASS | Evidenced by SX-05: debited only for filled (101), IOC remainder cancelled, exact |
| SX-07 | Quick-amount chips recompute quote | ✅ PASS | $5→Shares 35.71/Payout $35.71; $100→Shares 714.29/Payout $714.29 (exact 20× scaling) |
| SX-08 | MAX button (known issue) | ✅ PASS\* | MAX→"Not enough shares" disabled, no order/corruption/false-success. *TC-D08 KNOWN — handled safely* |
| SX-09 | Truthful outcome matrix | ✅ PASS | Order status always matched actual fill: SX-01 full, SX-05 partial+IOC, BX-19 limit-rest, D-1 0-fill — no false "filled" |
| SX-10 | Winning position pays out | ✅ PASS | History exit=100¢ +pnl (+396, +648); UCL-CITY-2526 result=NO, payout $25 `paid=true`; total u-1 payouts $147 / 10 settled |
| SX-11 | Losing position settles to zero | ✅ PASS | u-1 held losing side on GPT5-JUL26 → exit 0¢, pnl −552, payout $0 |
| SX-12 | Resolution criteria + source (settled) | ✅ PASS | UCL-CITY-2526 settled: "NO wins", "Resolves YES if Manchester City wins…", source present |
| SX-13 | Positions tab accuracy | ✅ PASS | 3 positions exactly match session trades: NO/5/$4.40, YES/659 (IMP), YES/374 (UCL); fields present |
| SX-14 | Summary tiles consistency | ✅ PASS | accuracy 7/10=70% (denom = settled count 10), openPositions=3, rank matches boards |
| SX-15 | Wallet ledger reconciliation | ✅ PASS | wallet_ledger latest balance $5291.83 **MATCH** wallet_balances; recent `credit … secondary fill proceeds` $4.55/$13.56/$8.45 (independently confirms D-1 seller-credit writes ledger entries) |
| SX-16 | Logout gating | ✅ PASS | Logout (401) → `/portfolio/` → redirect `/auth/login/?returnUrl=%2Fportfolio%2F`, login form, not blank authed page |
| SX-17 | Deep-link → login → returnUrl | ✅ PASS | Logged-out `?side=no` renders public read-only + "Log in to trade"; post-login returns to exact `/market/UCL-BARCA-2526/?side=no`, NO side preserved |
| SX-18 | Sharpness + Category Champions | ✅ PASS\* | Category Champions selector recomputes (politics=5, crypto/sports=0 cleanly). *Sharpness functional but 1 qualifier vs ≥2 expected — MinSettled+volume-floor vs seed, not a code defect* |
| SX-19 | Admin login (:3001) | ⚠️ PARTIAL | Admin auth verified: auth service `POST /login` admin@phoenix.local → HTTP 200 + valid Bearer/refresh. Backoffice up (307/308, no errors). UI render not browser-verifiable — Claude Preview origin-locked to :3010, no defect observed |
| SX-20 | Backoffice market list + queue | ⚠️ PARTIAL | Data layer sound: gateway serves 152 markets (95 open/29 settled) + 29 settlements-with-attestation, all 200. UI render not browser-verifiable (same origin-lock), no defect observed |

**Notes:** SX-05/08/18 carry documented seed/threshold/known-issue caveats (not new
defects). SX-19/20 PARTIAL is a preview-harness origin limitation (the preview server
is bound to the player app :3010 and cannot cross-navigate to the backoffice :3001) —
to fully cover backoffice UI, run a dedicated preview/launch config for `office/` on
:3001. No D-1/D-2 regressions; D-1 re-verified fixed via SX-01/02/15.

**Bottom line:** §11 ship-clean (12/12, all guarded fixes held). §14 surfaces one real S2 (sell-side market-order matching) and one S3 (leaderboard settled column). Neither is a regression of this cycle's fixes; D-1 is the highest-value follow-up.

---

## §16 — Full-corpus rerun (post D-1 + D-2 fixes)

Re-ran the **entire** suite (§11 + §14 + §15 = 57 scenarios) on a fresh stack
(dev server restarted + `.next/cache` cleared, reseed + gateway restart with
both fixes built in, fresh login, clean console). Purpose: confirm D-1
(`2301aeea`) and D-2 (`8e789950`) hold and nothing regressed.

**Verdict: 55 PASS · 2 PARTIAL (SX-19/20 backoffice — preview origin-lock, no defect) · 0 failures · 0 new defects.**

| Suite | This rerun | vs prior |
|---|---|---|
| §11 (12 P0) | **12/12 PASS**, console clean | unchanged (clean) |
| §14 (BX-01..25) | **25/25 PASS** | **BX-18 FAIL→PASS**, **BX-12 FAIL→PASS** |
| §15 (SX-01..20) | **18 PASS / 2 PARTIAL / 0 defects** | unchanged |

**Headline regressions-now-fixed, re-verified live this run:**
- **BX-18 / D-1** (sell-side matching + seller proceeds): `Available 536` → market sell **filled 35**, position 536→501, wallet **+$4.55** (35×13¢), wallet_ledger `credit $4.55 secondary fill proceeds`. Was 0-fill/cancelled. **PASS.**
- **BX-12 / D-2** (accuracy SETTLED column): accuracy entries API now returns `settledCount` (u-1 70%/**10**, user-001 53.8%/26, …); UI renders the number. Was "—" for all rows. **PASS.**

**D-1 independently re-confirmed 3× more** this run: SX-02 ($25 sell filled 178, pos 501→323 no-negative, +$22.01 exact), SX-15 (wallet_ledger reconciles to balance — the apparent $1 delta was a same-timestamp `ORDER BY … LIMIT 1` tie in my probe, not a product gap; the true final ledger row = wallet_balances exactly; `secondary fill proceeds` credits present), BX-14 (contrarian sell-side mechanics truthful).

**Documented caveats (unchanged, not defects):** BX-06 (max open YES 81¢, no ≥85¢ — seed settles near-certain markets), BX-07 (politics canonical markets settled — gotcha-#1 class), SX-05 (IMP "thin" market partial-fills via issuance — truthful, S1 invariant holds), SX-08 (MAX known-issue, safely disabled), SX-18 (Sharpness 1 qualifier — MinSettled+volume-floor vs seed), SX-19/20 (preview can't reach backoffice :3001; admin auth + data layer verified via HTTP, no defect).

**Conclusion:** Both defects found this session are fixed and stay fixed across a full re-run; no regressions anywhere in the 57-scenario corpus. Suite is green modulo the documented seed/threshold/known-issue/harness caveats.

---

## §17 — SX-19/20 resolved: backoffice now browser-verified (D-3 found & fixed)

The §15/§16 "SX-19/20 PARTIAL (preview origin-lock)" was resolved by
starting the **Back-Office** preview config (it existed in `.claude/launch.json`
all along — prior runs wrongly cross-navigated the player-app preview).
Freeing :3001 from an externally-started office dev server and starting it
under Claude Preview made the backoffice browser-drivable — which
immediately surfaced a real S2.

### D-3 — Backoffice renders blank under React 19 (S2) — **FIXED `e2aff8a9`**

```
[SX-19/20, TC-I01..03] Entire admin backoffice renders blank ("HEADER" stub)
Severity: S2          Priority: P1
Env: office :3001  React 19.2.4 + react-dom 19.2.4 + antd 4.16.12 + Next 16.2.2
Root cause: antd/es/modal/confirm + antd/es/typography/util import
            render()/unmountComponentAtNode() from react-dom — removed in
            React 19. Failing import trace runs through components/app ->
            session-guard (app shell), so pages/index's redirect useEffect
            never hydrates; admins stranded on the "HEADER" placeholder.
Fix: office-only webpack alias → react-dom React-19 compat shim
     (createRoot-backed render/unmount; real RD surface via __real_react_dom
     alias to avoid the react-dom$ exact-alias loop). Player app untouched.
Verified live: admin login → /dashboard renders real data (OPEN MARKETS 95,
     SETTLEMENT QUEUE 18, 24H VOLUME $602, TOP MOVERS); 0 console/server
     errors; AntD react-dom import error gone from the build.
```

| ID | Result | Evidence |
|---|---|---|
| SX-19 Admin login (:3001) | ✅ **PASS** (was PARTIAL) | admin@phoenix.local → `/dashboard/` renders shell (Dashboard/Markets/Settlements/Sign Out) + live cards; no console errors |
| SX-20 Market list + settlement queue | ✅ **PASS** (was PARTIAL) | `/dashboard/`: OPEN MARKETS 95 (Closing-soon list), SETTLEMENT QUEUE 18 (Awaiting-resolution list), Top movers — all live gateway data. Legacy `/prediction-admin/markets` renders AntD table + "Create Market"/Actions controls |

### D-4 — Legacy Pages-Router `/prediction-admin/markets` table empty (S3, open)

`/prediction-admin/markets/` renders its AntD shell + column headers +
"Create Market" but shows "0 markets / No Data" — it issues **no** market
fetch (no failed requests; the App-Router `/dashboard` fetches and shows
markets fine). Pre-existing data-wiring gap on a superseded surface
(`pages/index.tsx` redirects admins to the App-Router `/dashboard`, not
here), unrelated to D-3 and not introduced by the D-3 fix. Logged for
separate triage; does not block SX-19/20 (canonical `/dashboard` shows the
market list + settlement queue with live data).

**Net:** all 57 scenarios now **PASS** (0 PARTIAL, 0 open failures). Session
defects: D-1 (S2, fixed), D-2 (S3, fixed), D-3 (S2, fixed). D-4 (S3) noted
for separate triage. Remaining caveats are documented seed/threshold/
known-issue, not defects.

---

## §18 — D-1 money-path hardening (no-shortcuts pass + independent review)

D-1 moves money and had been verified only by its author. Hardened it before
any merge:

**Idempotency (proven + locked):** `applyMutationTx` dedupes wallet mutations
on `(kind,userID,idempotencyKey)` with a UNIQUE constraint — a retried/
duplicated `PersistMatchAtomic` returns the existing credit, never re-credits;
amount/reason mismatch errors. Seller key is `prediction_fill_proceeds:<tradeID>`
(deterministic, per-trade, unique). New test `TestBuildPlan_SellerCreditKey
IsPerTradeAndConservesCash` (`b96d01f9`) locks: per-trade key binding, key
uniqueness across fills, and cash conservation (seller credit == buyer capture
per fill).

**Reconciliation (empirically orthogonal):** the collateral reconciler checks
`prediction_collateral_ledger` sum vs `collateral_pool_cents`. The seller credit
writes only `wallet_*` and adds zero collateral rows, so it cannot move drift.
Confirmed: untraded control markets show the same large pre-existing seed-wide
drift (99/119 order_book markets), 0 collateral rows with a proceeds reason.
Pre-existing seed data smell, **separate from D-1** — logged as a candidate
follow-up (not chased).

**Independent cross-model review (codex):**
- Pass 1 → **GATE FAIL [P1]:** D-1 making sells execute exposed a latent
  oversell race — pre-tx-only sell validation, no in-tx recheck,
  `ApplyPositionMutation` clamps over-sold to zero instead of erroring. Two
  near-simultaneous market sells of one position both credited
  (phantom-share double-payout). Author verification had missed it.
- Fix `e8de72c4`: authoritative in-tx guard in `PersistMatchAtomic` — for a
  SELL taker with fills, re-read the seller position `FOR UPDATE` under the
  per-market advisory lock and reject (`ErrInsufficientPosition`, full
  rollback, before any capture/credit/position write) when
  `SellExceedsOwned`. Plus `GetPosition` now selects `reserved_quantity`
  (pre-tx defense-in-depth). Pure predicate unit-tested
  (`TestSellExceedsOwned`, boundary cases).
- Pass 2 → **GATE PASS, no remaining [P1]/[P2]:** advisory lock serializes
  concurrent same-market persists so the second sell sees the first's
  committed decrement and is rejected; guard correctly placed before money
  movement; no regression (exact-fit allowed, only SELL takers affected,
  buy/maker-seller paths unchanged); idempotency/conservation/atomicity/
  no-naked-issuance/self-match all still intact.

Full gateway suite green (24 pkgs) at every step.

**D-1 verdict:** money path now hardened and independently cleared —
idempotent, cash-conserving, atomic, and oversell-safe under concurrency.
Commits: `2301aeea` (fix) → `b96d01f9` (idempotency test) → `e8de72c4`
([P1] oversell guard). Outstanding: pre-existing seed-wide collateral drift
(separate, logged) and the office dev-error-overlay suppression (recommended
removal, not yet done).

---

## §19 — Account-lifecycle smoke (LC-01..40)

40 new lifecycle scenarios (signup → profile → responsible gaming → search →
betting depth → session/resilience). **Honest status: 16 run with verdicts,
LC-23 run, 7 flag-blocked, 16 not run (budget).** No fabricated passes.

### Group A — Sign-up & onboarding (RUN, 7/7)
| LC | Verdict | Evidence |
|---|---|---|
| LC-01 register | ✅ PASS | 4-step wizard; valid adult → account created (`auth_users`), handle login → authed `/predict/` |
| LC-02 validation | ✅ PASS | bad email / short pw / mismatch → inline errors, stayed step 1, no account |
| LC-03 duplicate | ✅ PASS\* | dup handle → server "already registered", no 2nd account. *Caught only at final submit, not step 1 (late-feedback UX, S3)* |
| LC-04 OAuth stubs | ✅ PASS (S3) | Google/Apple present + backend-wired, but unconfigured env returns a **raw JSON error page** to the user (`"Google OAuth is not configured"`) instead of a graceful message. TC-A01 convention: S3, don't fail |
| LC-05 deep-link→signup→returnUrl | ❌ **FAIL (S3)** | signup link carries **no `returnUrl`**; post-register lands at bare `/auth/login/`. A user who deep-links a market and chooses "Sign up" loses the destination. (Login path *does* preserve it — SX-17.) |
| LC-06 terms/age gate | ✅ PASS\* | terms-unchecked blocked at step 4; underage DOB (2015) created **0** accounts → age enforced server-side. *But rejection is silent — bounces to /login with no on-screen age message (S3 UX)* |
| LC-07 brand-new empty states | ✅ PASS | $0 BAL, "No settled predictions yet", "Not ranked yet", Accuracy "—" (no divide-by-zero), no errors |

**Cross-cutting (S3):** signup collects an email and login says "USERNAME OR EMAIL", but `auth_users` keys on the **handle** only — email login fails for wizard-registered users.

### Group B — Personal details & profile (RUN, 8/8)
| LC | Verdict | Evidence |
|---|---|---|
| LC-08 display-name → board handle | ⚠️ PARTIAL | no inline name-edit on `/account/`; `/profile/` exists (200) but not exercised. Handle pipeline itself proven by LC-09. S3 — needs a focused pass |
| LC-09 anonymous toggle | ✅ PASS | flip → `/me/leaderboards` handle becomes "Trader #1", stats kept, reversible |
| LC-10 change password | ✅ PASS | `/account/security/`: requires current pw (re-auth), min-12, Confirm; not executed on demo (irreversible-risk) — verified by inspection |
| LC-11 change email | ⚠️ GAP (S3) | no change-email surface anywhere (consistent with email-not-a-credential finding) — not implemented |
| LC-12 forgot-password | ❌→⚠️ **ROOT-CAUSED + interim shipped** | Root cause: feature unimplemented backend-side (no `/api/v1/auth/forgot-password` route, no reset-token store/migration, no email delivery in stack — investigated, commit-logged). Was a dead form 404ing + false "check your email". Interim `591d645b`: honest "email support to recover" notice, no 404, gate 8/8. **Real reset feature still unbuilt** (tracked, not a regression) |
| LC-13 notification prefs persist | ❌ **FAIL/suspect (S3)** | flipped toggle + Save + reload → reverted. Caveat: Save driven via React-onClick (harness pattern reliable elsewhere this session) → likely real non-persistence/STUB; flagged for network-confirmed repro |
| LC-14 sensitive-change re-auth | ✅ PASS | password change requires current password (re-auth gate present); +2FA, +Active Sessions sections exist |
| LC-15 account closure w/ open positions | ⚠️ GAP (S3) | no close/delete-account control anywhere. No silent loss (can't close); capability absent (GDPR/lifecycle gap) |

### Group C — Responsible gaming & compliance (LC-16..23)
With `NEXT_PUBLIC_FEATURE_RG/KYC/LIMITS` **off (default)** the RG consumer surfaces are flag-gated:
| LC | Verdict | Evidence |
|---|---|---|
| LC-23 RG status / flag-off cleanliness | ✅ PASS | `/account/self-exclude/` etc. render a **clean in-app 404** ("Back to Home"), no 500/crash; backend compliance APIs present (`restrictions`→200, `deposit-limit`/`self-exclude`→405 POST-only, `kyc/status`→400) |
| LC-16 deposit limit | ⛔ BLOCKED | feature-flag gated off (UI 404). Backend endpoint exists |
| LC-17 stake limit | ⛔ BLOCKED | flag-gated off; backend exists |
| LC-18 reality-check timer | ⛔ BLOCKED | flag-gated off |
| LC-19 loosen-limit cooldown | ⛔ BLOCKED | flag-gated off |
| LC-20 cool-off | ⛔ BLOCKED | flag-gated off |
| LC-21 self-exclusion enforcement | ⛔ BLOCKED | flag-gated off (UI 404); **not verifiable without enabling flags** — high-importance, see recommendation |
| LC-22 KYC just-in-time | ⛔ BLOCKED | flag-gated off; `kyc/status` endpoint exists |

**Not defects** — backend compliance implemented; consumer UI intentionally disabled by default flags. Fully running LC-16..22 needs the flags enabled + dev-server restart.

### Group D — Search & discovery depth (PARTIAL)
| LC | Verdict | Evidence |
|---|---|---|
| LC-25 search injection/safety | ✅ PASS | `<img onerror>` + `';DROP TABLE` + 1200-char query → no XSS execution, no crash |
| LC-28 settled-only term | ✅ PASS (known) | "senate" (all settled) → 0 search results is correct, not a bug (documented gotcha #1 + BX-02) |
| LC-24 keyboard nav | ⬜ NOT RUN | budget |
| LC-26 ticker vs text relevance | ⬜ NOT RUN | probe measured grid not dropdown — inconclusive, not claimed |
| LC-27 rapid-type debounce | ⬜ NOT RUN | budget |
| LC-29 multi-outcome event view | ⬜ NOT RUN | budget |

### Group E — Betting & money lifecycle depth (LC-30..35) — ⬜ NOT RUN (budget)
### Group F — Session / resilience / outside-the-box (LC-36..40) — ⬜ NOT RUN (budget)

LC-36 (double-submit guard) and LC-38 (network-drop idempotency) are money-path
and partially de-risked already this session (D-1 hardening proved wallet
idempotency on `(kind,userID,idempotencyKey)`), but the user-facing
double-click/network-drop UX is untested.

### Net findings (this group)
- **LC-12 (S2)** forgot-password backend 404 — account recovery broken.
- **LC-05 (S3)** signup path drops returnUrl.
- **LC-13 (S3, suspect)** notification prefs don't persist.
- **LC-04 (S3)** OAuth misconfig surfaces as raw JSON to the user.
- Gaps (S3, not-implemented): change-email, account closure.
- Cross-cutting (S3): email collected at signup is not a usable login id.
- LC-16..22 blocked by default RG/KYC/LIMITS flags (config, not defects).

**Honest completion:** 16 scenarios executed with real verdicts (3 new findings:
1×S2 + 2×S3, plus 2 gaps), LC-23 passed, 7 flag-blocked, 16 not run. Not
padded. Recommended next: (1) enable RG/KYC/LIMITS flags + restart to run
LC-16..22 (responsible-gaming is high-importance and currently unverifiable);
(2) a focused pass for the 16 not-run (Groups D-rest/E/F), prioritizing
money-path LC-36/38.

---

## §20 — RG flags ON: LC-16/17/23 run + LC-17 money-path fix (no-shortcuts pass)

Enabled `NEXT_PUBLIC_FEATURE_RG/KYC/LIMITS=true` (player `.env.local`, gitignored
local test artifact + `.claude/launch.json` env) and restarted the player
preview so LC-16..23 are exercisable instead of flag-404'd.

| LC | Verdict | Evidence |
|---|---|---|
| LC-23 RG surfaces render with flags on | ✅ PASS | `/account/self-exclude/` etc. render the real wizard, no 500 |
| LC-16 deposit limit enforced | ✅ PASS | $10 daily deposit limit blocked a $50 deposit; balance unchanged (payments path already gated via `DepositComplianceChecker.CheckDepositAllowed`) |
| LC-17 bet/stake limit enforced | ❌→✅ **FIXED** | was: $1 limit let a ~$25 order fill 148 shares (~$24.88 debited). See D-5. |

### D-5 — Responsible-gambling bet limit not enforced on the prediction order path (S2)

```
[LC-17] User-set "Max Bet Amount" limit does not block prediction orders
Severity: S2          Priority: P1
Env: BASE=:3010 + gateway docker (rebuilt)  build=2d783d7f  seed-run=2026-05-16
Step #: LC-17 — Limits tab → set Max Bet $1 → trade ~$25 on an open order_book market
Expected: order rejected (bet limit exceeded), no debit, no position
Actual (pre-fix): HTTP 201, order filled 148 shares, ~$24.88 debited — limit ignored
Repro: always; reproduced live via API (login demo → set daily bet-limit 100c
       → POST /api/v1/orders notionalCap 2500 → HTTP 201 filled)
Evidence: bet-limits API showed usedCents climbing only AFTER fix wired RecordBet;
          pre-fix CheckBetAllowed was never called by prediction.Service.PlaceOrder
Known-issue?: no
```
**Impact:** Responsible-gambling control is regulatorily significant. Every
journey that trades while a self-set limit (or self-exclusion / cool-off) is
active — the limit/exclusion/cool-off was silently inert on the prediction
money path. Deposits were gated (LC-16 PASS) but orders were not.

**Root cause:** `prediction.Service` had **no compliance dependency at all**.
`compliance.CheckBetAllowed` was only ever called by the legacy sportsbook
`bets.Service`, which prediction orders never route through. The user-set
limit was stored (the wired in-memory `MockResponsibleGamblingService`) but
never consulted by `PlaceOrder` (either the AMM or order-book path).

**Fix (no-shortcuts):**
- Added decoupled `prediction.ComplianceChecker` interface (same pattern as
  `WalletAdapter`; prediction does not import `compliance`).
- `PlaceOrder` now gates through `checkComplianceForOrder` **before any wallet
  debit or market mutation**, covering BOTH execution paths (inserted before
  the execution-mode branch). Stake = `worstCaseSpend(req)` (price×qty for
  limit buys, notional cap for market buys, 0 for sells so self-exclusion /
  cool-off still block sells while per-bet stake limits don't).
- `handlers.go` wires the **same** `rgService` instance the
  `/api/v1/compliance/rg/*` routes write to, so a UI-set limit is the one the
  order path reads.
- **Self-review caught a real bug live** (codex independent review deferred —
  see below): the wired RG service returns `(allowed=false, reason,
  ErrBetLimitExceeded)` — a sentinel error *on a deliberate deny*. The first
  cut treated any non-nil error as infra failure and **failed open in dev**,
  so the live $25 order still went through. Corrected: `allowed==false` is
  authoritative and blocks regardless of the error; env-based
  fail-open(dev)/fail-closed(prod,staging) applies only to genuine infra
  ambiguity (`allowed==true && err!=nil`).
- **Second self-review finding, fixed:** `RecordBet` used
  `order.TotalCostCents`, which on the order-book path is the *reserved
  notional*, not realized spend (a 1-share fill had `totalCostCents:50` but
  `capturedCashCents:19`). Over-counting would wrongly lock a user out for the
  rest of the period after a thin/partial fill. Added `realizedStakeCents`
  (captured cash for order-book fills; realized `TotalCostCents` for AMM;
  0 when nothing filled) used at all 3 record sites. Idempotent re-POST
  returns early before the gate/record, so no double-count.

**Tests:** `compliance_gate_test.go` — gate blocks (incl. the sentinel-error
deny that reproduced the live bug), records realized stake, nil checker = no-op,
infra error fails open in dev / closed in prod+staging, and `realizedStakeCents`
boundary table (the exact live 2500/2494 and 50/19 numbers). Full gateway suite
**24/24**; pre-commit JS suite **120/0**.

**Independent cross-model review: DEFERRED.** `codex exec` hit its usage limit
(resets ~20:07 local). A rigorous skeptical **self-review** was done instead and
found+fixed the two issues above. The codex pass on commit `2d783d7f` is still
owed before this is considered fully cleared to the D-1 standard.

**Live verification (rebuilt gateway container):**
- ~$25 order vs $1 daily limit → **HTTP 400 "Bet limit exceeded for daily period"** (was: 201 filled).
- $0.50 order under the $1 limit → **HTTP 201 filled** (gate is not blanket-blocking).
- After fix, a filled order with cap 50¢ / captured 19¢ → `bet-limits used = 19c` (realized, not the 50c notional).
- Demo (u-1) limit restored to effectively unlimited after the run.

**Status: FIXED — commit `2d783d7f`.** Outstanding: (1) codex independent
review (deferred, usage limit); (2) the wired RG service is the **in-memory
mock** — limits do not persist across gateway restarts; production must wire
`rg_postgres.go`, and that impl's infra-error return shape should be checked
against the `allowed==false`-is-authoritative contract so a real DB outage
fails *closed* as intended (not silently allowed).

**Note:** `.env.local` (RG flags) is a gitignored local UAT artifact, not a
committed config change; it was intentionally left out of commit `2d783d7f`
(only `service.go`, `handlers.go`, `compliance_gate_test.go` staged).

## §21 — LC-21 self-exclusion enforcement: explicit end-to-end (no-shortcuts pass)

Followed up the §20 note that the LC-17 gate now routes self-exclusion +
cool-off through `CheckBetAllowed`, with an explicit e2e against a **throwaway**
account (not demo — self-exclusion is irreversible). Driven via authenticated
API (trade-ticket onClick is a CDP deadzone in preview). Gateway = rebuilt
docker container, build `2d783d7f`, in-memory mock RG service.

Throwaway acct: `lcok21@predict.local` (registered fresh, userId
`u-6c636f6b3231`, player role), wallet credited $50 for a true success
baseline.

| # | Step | Result |
|---|---|---|
| 1 | Baseline order pre-exclusion (10 qty market BUY, cap 500¢) | ✅ **HTTP 201 filled** — 10/10 @ 19¢, 190¢ captured. Account fully functional. |
| 2 | `POST /rg/self-exclude {permanent:false}` | HTTP 201; `/rg/restrictions` → `isExcluded:true isBlocked:true exclusionType:temporary` |
| 3 | Same order, **fresh** idem key (`lc21:postexcl:0001`) | ✅ **HTTP 400 `"User is self-excluded"`** — order-path gate blocks |
| 4 | Control: replay **baseline** idem key while excluded | ✅ **HTTP 201**, returns prior order `e1cfc4e9…` `status:filled`, `trade:null` — LC-17 pre-gate idempotent short-circuit holds, no double-count, no spurious block |
| 5 | Self-reversal A: `DELETE /rg/self-exclude` | ✅ **HTTP 405** (POST-only; no clear capability) |
| 6 | Self-reversal B: re-`POST /rg/self-exclude` (only available action) | does NOT clear — `isExcluded` still true |
| 7 | Post-attempt: `/rg/restrictions` + fresh order | still `isExcluded:true`; order still **HTTP 400** |

**LC-21 verdict: ✅ PASS.** Self-exclusion is enforced on the prediction
order path (via the LC-17 gate → `CheckBetAllowed`, `allowed==false`
authoritative) and is **irreversible via the player API**. Code confirms the
full RG/compliance route surface (geo/*, kyc/*, rg/deposit-limit[s],
rg/bet-limit[s], rg/check-*, rg/session-limit, rg/cool-off, rg/self-exclude,
rg/restrictions) has **no** clear/un-exclude endpoint, and
`MockResponsibleGamblingService` exposes no method that removes a
`selfExclusions` entry.

**Honest caveat:** verified against the in-memory mock (per §20 owed item #2).
Mock self-exclusion clears on a gateway rebuild — but that is an
ops/persistence concern, **not** player-reversibility. Production
`rg_postgres.go` wiring (still owed) does not change the LC-21 enforcement
verdict; it changes durability.

### D-6 — RG controls accept body `userId` without session-match → irreversible cross-account lockout (S2)

```
[LC-21 byproduct] /api/v1/compliance/rg/self-exclude trusts request-body userId
Severity: S2          Priority: P1
Env: BASE gateway docker (rebuilt) build=2d783d7f  2026-05-16
Step #: while authenticated as session lcok21 (userId u-6c636f6b3231),
        POST /rg/self-exclude {"userId":"u-lc21-probe-victim","permanent":false}
Expected: server self-excludes the SESSION's userId (or 403 on userId mismatch)
Actual: HTTP 201; target u-lc21-probe-victim flips isExcluded:false→true.
        Caller can self-exclude an account that is not their own.
Repro: always (used a harmless fake target id; no real account harmed)
Evidence: restrictions before {isExcluded:false} → after {isExcluded:true,
          exclusionType:temporary} for a userId the session does not own
Known-issue?: no
```
**Impact:** the `rg/self-exclude` handler (`internal/compliance/handlers.go`
~L432) reads `req.UserID` from the body and never checks it against the
authenticated session. Self-exclusion has **no reversal API** (proven above)
and userIds are deterministic from username (`u-` + `hex(username)[:12]`,
auth `Register` ~L1046) — trivially enumerable. So any authenticated user can
**permanently brick an arbitrary account** by userId. The same body-`userId`
pattern appears across the sibling RG endpoints (cool-off, bet-limit,
deposit-limit), which are similarly user-hostile if set on a non-owned id.
Regulatorily sensitive.

**Scope note:** orthogonal to LC-21. LC-21 (enforcement + irreversibility) is a
genuine PASS; D-6 is an authorization defect surfaced *by* the e2e. Not fixed
here — fixing it is a money/RG-correctness change owed the full no-shortcuts
protocol (root-cause → fix at the trust boundary → fails-without/passes-with
test → suite → live verify → **codex** → commit). Recommend batching the D-6
fix with the owed D-5 codex review after the codex usage-limit reset
(~20:07 local 2026-05-16). **Status: OPEN.**

## §22 — D-5 codex review (owed item #1) + remediation + D-6 fix (no-shortcuts)

The §20-deferred independent codex review of commit `2d783d7f` (LC-17 RG
order-path gate) was run after the usage-limit reset, then iterated through
**four adversarial codex rounds** + unit (fails-without/passes-with) + full
suite + live-verify per fix. Raw transcripts: `.codex-reviews/*.txt`
(`2d783d7f-review-raw`, `remediation-rereview{,3,4}-raw`).

### Round 1 — codex on `2d783d7f`: **5 P1, 1 P2**
Verified each against code (trust-but-verify; not blind):
- **#1 (P1, real):** AMM market-buy under-gated — `worstCaseSpend` is the
  gate's stake but the AMM path never bounded LMSR cost by it.
- **#2 (P1, real):** resting limit orders + maker fills bypassed the period
  limit — only the realized *taker* fill was recorded, so resting orders
  (realized 0) each passed the gate independently and maker fills were
  never recorded.
- **#3 (P1, real):** a concurrent idempotent replay double-recorded stake
  (`placeExchangeOrder` returned the existing order with `perr==nil`;
  `PlaceOrder` recorded again).
- **#4 (P1→tracked):** check-vs-record TOCTOU — real but bounded, legacy
  parity; **deferred** (documented residual, per user scope decision).
- **#5 (P1→folded):** `rg_postgres` false-zero on query error + swallowed
  `RecordBet` err — `rg_postgres` is **dormant** (the wired service is the
  in-memory mock); folded into the already-owed §20 item #2.
- **#6 (P2→tracked):** SMM may place orders in the startup window before
  `SetComplianceChecker` — house bot, low-sev; tracked.

User scope decision: fix #1/#2/#3 in full (no-shortcuts); document #4/#5/#6.

### Fixes (atomic commits, each fails-without/passes-with + suite 24/24)
- `7e410855` **#1**: reject on the AMM path before `ExecuteTrade` when cost
  exceeds the gate's worst-case bound.
- `41ae8d4b` **#3**: `placeExchangeOrder` returns an explicit `replayed`
  bool; `PlaceOrder` skips `RecordBet` on a concurrent replay.
- `e67360d1` **#2**: reserve+reconcile — `RecordBet` the committed
  worst-case at placement (counts while resting); release committed−realized
  when terminal; cancel releases reserved−captured. New symmetric
  `ReleaseBet` on the `ComplianceChecker`/RG interfaces + mock + postgres.

### Round 2 — codex re-review + live-verify: **2 P1, 2 P2**
Live-verify (rebuilt gateway) caught what the unit tests could not:
- **#1 still-broken:** `worstCaseSpend==0` for a capless market buy / limit
  buy w/o price; the HTTP handler rejects capless market buys but the **bot
  path** calls `PlaceOrder` directly and bypassed it.
- **#2 cancel-reconcile broken (live-confirmed):** `createOrderWithExec`
  never persisted `reserved_cash_cents`, so the cancel `RETURNING` read 0
  and the release was skipped — `used` stayed 200 after cancel (the §20
  wrongful-lockout).
- **new P1:** Postgres `ReleaseBet` unclamped → negative usage / free
  headroom.
- P2 #4: no production path expires a resting prediction order with a
  `ReleaseBet` (→ tracked residual; conservative over-count, safe-direction).

`0173d0f6` (round-2 fixes): AMM **actual-cost re-gate** when the real cost
exceeds the gated bound (no-op when no RG checker wired; covers the bot
path); **persist `reserved_cash_cents`/`captured_cash_cents`** on create;
**clamp** Postgres `usageInPeriod` at 0.

### Round 3 — codex re-review: **1 P1**
Cross-period release offset — a release from a resting order placed in a
prior period offset the *current* period's usage → free headroom. Verified
this hit the **wired mock** too (`refreshBetLimitState` zeroes `UsedCents`
at rollover). User-chosen fix: thread `committedAt` into `ReleaseBet`.

`a17721fd`: `ReleaseBet(…, committedAt)`. Mock skips the reversal when the
commit predates the limit's current period start; Postgres dates the
compensating negative row at `committedAt` so the window filter scopes it.
Cancel passes the order's `created_at` (via `RETURNING`); terminal-at-
placement passes `now`. Fails-without/passes-with cross-period no-op.

### D-6 fix — `b4432672`
`sessionBoundUserID(r, bodyUserID)` binds every RG self-service mutation
(deposit-limit, bet-limit, session-limit, cool-off, self-exclude) to the
authenticated session: no session ⇒ 403; body userID ≠ session ⇒ 403;
responses reflect the session uid. Fails-without/passes-with handler test.

### Round 4 — codex final gate (covers P1 remediation **+ D-6**): **1 P1, 1 P2**
- **All five** prior items + D-6: **FIXED** (independently confirmed, file:line).
- **NEW P1 — D-7 (OPEN, distinct from D-5/D-6):** `SetBetLimit` /
  `SetDepositLimit` in the wired mock replace the period row with
  `UsedCents:0`, so a user can consume a limit then re-POST the *same*
  limit via the (now session-bound, self-callable) route and reset their
  own usage → indefinite headroom. **Pre-existing mock flaw — not
  introduced by this work or D-6** (a user could already self-set their
  limit pre-D-6). Real RG bypass on the wired path. `mock_compliance.go`
  `SetBetLimit` ~L425-438 / `SetDepositLimit` ~L371-384;
  `CheckBetAllowed` ~L531-536; wired at `internal/http/handlers.go`
  ~L239-247. See D-7 below.
- **NEW P2 — mock monthly reset boundary:** `getResetTime("monthly")`
  returns same-day-next-month, not first-of-month → monthly usage can
  carry past the real month boundary. Tracked residual.

### Live verification (rebuilt gateway docker, demo u-1 + throwaway)
- **P1 #2 reserve+reconcile (round-2+3c):** resting limit BUY @2¢×100 →
  `used=200 remaining=100` (pre-fix: 0 — the bypass); a 2nd resting order
  exceeding the cumulative limit → **HTTP 400 "Bet limit exceeded"**;
  cancel → `used=0 remaining=300`; limit frees. Idempotent-replay control
  returns the prior filled order with no double-count.
- **D-6:** demo session POST `self-exclude {userId:u-d6-probe-victim}` →
  **HTTP 403 "cannot modify another user's responsible-gambling
  settings"**, victim `isExcluded=false` unchanged; self-bind own
  bet-limit → 201.
- **P1 #1** re-gate and **#3** and the **cross-period** scoping are
  deterministically unit-covered (no open AMM market exists in the seed to
  live-trade; a cross-period live test needs clock manipulation). Demo
  limits restored to effectively unlimited after the run.

### Status
- **D-5 / LC-17 P1 #1, #2, #3 — FIXED & cleared to the D-1 standard**
  (independent codex round-4 confirmation + live-verify). §20's "Independent
  cross-model review: DEFERRED" is hereby **resolved** (recorded here;
  §20 left intact per the append-only rule).
- **D-6 — FIXED & live-verified** (`b4432672`).
- **Tracked residuals (not fixed, by scope decision):** codex-#4 TOCTOU;
  expired-order-lifecycle RG release; GET disclosure endpoints
  (restrictions/bet-limits/deposit-limits read an arbitrary query userId);
  `rg_postgres` dormant/not production-wired (owed §20 item #2); mock
  monthly-reset boundary (new P2).

### D-7 — Setting an RG limit zeroes accumulated period usage (S2, OPEN)

```
[codex round-4 finding] SetBetLimit/SetDepositLimit reset UsedCents to 0
Severity: S2          Priority: P1
Env: wired in-memory MockResponsibleGamblingService (handlers.go ~239-247)
Repro: set daily bet-limit N → place orders consuming ~N → re-POST the
       SAME bet-limit (own session, allowed post-D-6) → usedCents back to 0
       → place another ~N of orders. Repeat indefinitely.
Root cause: mock SetBetLimit replaces the period row with UsedCents:0 /
            RemainingCents:amountCents (mock_compliance.go ~L425-438);
            SetDepositLimit same (~L371-384); CheckBetAllowed trusts the
            reset remaining (~L531-536).
Pre-existing? YES — independent of the D-5 order-path work and D-6 (a user
            could already self-set their own limit before D-6; D-6 only
            made the call ownership-correct, it did not create this).
Correct behavior (design decision needed): setting/changing a self-set
limit must NOT clear already-accumulated period usage; lowering a limit
should keep usage; an unchanged re-POST must be a no-op for usage.
Status: OPEN — distinct new defect, outside the D-5/D-6 scope that was
authorized; surfaced for scoping.
```

## §23 — D-7 FIXED (no-shortcuts)

User authorized fixing D-7 in full. **Status: FIXED — commit `54097169`;
D-7 above is RESOLVED** (recorded here per the append-only rule; §22's
"OPEN" left intact).

**Root cause:** `MockResponsibleGamblingService.SetBetLimit` /
`SetDepositLimit` rebuilt the period row with `UsedCents:0` and `upsert*`
replaced it, discarding accumulated period usage on every set.

**Fix:** on set, if a same-period limit already exists, apply
`refreshBetLimitState`/`refreshDepositLimitState` (so a *genuine* period
elapse still legitimately zeroes), then carry the existing `UsedCents`,
`ResetsAt` and `CreatedAt` forward and recompute
`RemainingCents = max(0, LimitCents − UsedCents)`. Raising a limit keeps
usage and grants only the delta; lowering below accumulated usage clamps
remaining to 0 (RG restricts, never negative); a brand-new limit starts at
0 and applies prospectively (codex classified the "bet before any limit
then set one" case as accepted prospective behavior, not a residual D-7
bypass). Added `findBetLimit`/`findDepositLimit`.

**Verification (full no-shortcuts):**
- Unit: `TestMockSetBetLimit_RePostDoesNotResetAccumulatedUsage` (+ deposit
  variant) — fails-without/passes-with (pre-fix re-POST → used 0; post-fix
  → used preserved, raise grants delta, lower clamps, post-exploit bet
  blocked). Full gateway suite **24/24**.
- Live (rebuilt gateway, demo u-1): set 300¢ daily → consumed to
  `used=300 remaining=0` → re-POST same 300¢ limit → **`used=300
  remaining=0`** (pre-fix would reset to 0) → next order **HTTP 400 "Bet
  limit exceeded"**. Demo limit restored after.
- Independent **codex** review of the fix: **VERDICT: CLEAN — FIXED** (no
  P1/P2; re-POST/raise/lower preserve usage, legit rollover correct,
  ResetsAt carry doesn't extend the window, no D-5 round-3 regression,
  `findBetLimit` aliasing safe). Raw: `.codex-reviews/d7-review-raw.txt`.

**Net RG state after this session:** D-5/LC-17 P1 #1/#2/#3, D-6, and D-7 are
all FIXED, independently codex-confirmed, and live-verified. Remaining
tracked residuals unchanged (codex-#4 TOCTOU; expired-order-lifecycle RG
release; GET disclosure endpoints; `rg_postgres` dormant/owed §20 item #2;
mock monthly-reset boundary P2).

## §24 — LC-22: KYC just-in-time gate (investigation, no fix yet)

| LC | Verdict | Evidence |
|---|---|---|
| LC-22 KYC just-in-time gate (/profile/ Verification tab) | ❌ FAIL | The JIT gate is **not implemented** — UI stub + no enforcement + hardcoded profile status. See D-8. |

Investigated to the same depth as LC-17/D-5 (code map + rigorous negative
verification + live e2e on the rebuilt gateway). Not fixed: unlike D-5 (a
built control with a wiring gap), LC-22 is an **unbuilt feature** whose
resolution is a product/compliance design+build, not a mechanical
root-cause fix — surfaced for scoping rather than unilaterally built.

### D-8 — KYC just-in-time gate not implemented; profile hardcodes "verified" (S2, OPEN)

```
[LC-22] KYC JIT gate absent on every regulated/money path; profile lies
Severity: S2          Priority: P1 (regulatorily significant; FEATURE_KYC
          is documented as "for jurisdictional deploys that legally
          require KYC e.g. regulated US")
Env: rebuilt gateway docker (all D-5/6/7 fixes in) + demo u-1, 2026-05-16
```
**Findings (code + live):**
1. **No JIT gate on any money/regulated path.** `KYCService.GetVerification
   Status` is never consulted by any gating code — grep across
   `internal/payments`, `internal/prediction`, `internal/http`,
   `internal/wallet`, `cmd/`, middleware = zero KYC enforcement. No
   "just-in-time"/JIT concept exists anywhere in the Go codebase.
   *Live:* demo `u-1`, whose **real** compliance KYC status is
   `unverified` (`GET /api/v1/compliance/kyc/status` → `"unverified"`),
   placed a prediction order successfully — **HTTP 201, status open**
   (probe order cancelled after). No gate.
2. **Profile endpoint hardcodes `kyc_status:"verified"`.**
   `internal/http/user_handlers.go:156` returns a constant `"verified"`
   for every user, ignoring the compliance KYC service entirely.
   *Live:* `GET /api/v1/users/u-1/profile` → `kyc_status:"verified"`
   while the truth source says `unverified` — the profile actively
   masks real KYC state.
3. **/profile Verification tab is a static stub.** `app/profile/page.tsx`
   renders an "Identity Verification (KYC)" badge + a "Complete
   Verification" section whose **"Start Verification" button has no
   onClick handler** — it does nothing; there is no verification /
   document-submission flow wired from the player UI. The
   `/api/v1/compliance/kyc/{verify,submit-document,...}` routes exist
   but nothing in the player app drives them.
4. **Display enum mismatch (consequence of #2).** The UI badge keys off
   `profile.kycStatus === "approved" | "pending"`; the hardcoded backend
   value is `"verified"` (never "approved"/"pending"), so the KYC badge
   renders the `else` branch ("failed") for everyone even though the
   field claims verified — the surface is internally inconsistent.

**Why not fixed here:** "Resolving" D-8 = *building* KYC JIT gating, a
feature with product/compliance design decisions (which actions to gate —
withdrawal? deposit/trade thresholds? first trade?; jurisdiction logic;
what state counts as "verified"; the document-submission UX) plus wiring
the compliance KYC status into the deposit/withdraw/order paths and
replacing the hardcoded profile field. That is a feature project, not a
root-cause bug fix; the no-shortcuts protocol applies once scope/design is
chosen. CLAUDE.md rule honored: not declaring KYC "done" while it is
mock/stub/hardcoded.

**Surgical interim candidate (analogous to the §19 LC-12 honest-notice
precedent):** stop the profile endpoint lying — either proxy the real
compliance KYC status into `kyc_status` (also fixing the enum to the
UI-expected values) or remove the hardcoded field. Small and honest, but
it changes observable /profile behavior and is entangled with the larger
build, so deferred to the scope decision.

**Status: OPEN — investigated & recorded; awaiting scope decision.**

## §25 — LC-22 / D-8: KYC just-in-time gate BUILT (no-shortcuts)

User authorized building the full gate. Policy decisions (locked with the
user): gated action = **withdrawals**; KYC required once cumulative
non-failed/cancelled withdrawals + this amount exceed
`KYC_WITHDRAWAL_THRESHOLD_CENTS` (default $2,500; 0 = always); pass states =
**approved OR pending**; enable via `KYC_ENFORCEMENT` env (OFF by default);
KYC-service error fails **closed** in prod/staging, open in dev; gate +
withdrawal bind to the authenticated session; profile reports real status;
"Start Verification" wired to the mock verify endpoint (real provider out
of scope).

**Commits:** `9ead7c60` (core withdrawal gate + `CumulativeWithdrawnCents`
+ `payments.KYCGate` + env flag/threshold + session-bind), `02d162a9`
(profile real KYC status + UI badge enum + verify-flow wiring +
`kyc/verify`/`submit-document` D-6 session-bind + `TestKYCMutations_
SessionBound`), `e4d18a80` (verifyIdentity CSRF fix + withdraw
no-session/​mismatch hardening).

**Verification (full no-shortcuts):**
- Unit: `TestWithdraw_KYCJustInTimeGate` 9 subtests (below/above threshold,
  unverified/approved/pending, enforcement off, fail-closed-prod/open-dev,
  no-session-403, body-mismatch-403) — fails-without/passes-with;
  `TestKYCMutations_SessionBound`. Full gateway suite **24/24**. Player
  `gate.sh` **8/8** (TS, next build, manifest, …) — run twice.
- API live e2e (rebuilt gateway, `KYC_ENFORCEMENT=true`, threshold $10 via
  a temporary, since-removed compose override): profile `kyc_status`
  returns **real** `unverified` (was hardcoded "verified"); unverified $15
  withdrawal (> $10) → **HTTP 403 "identity verification required…"**;
  cross-user `kyc/verify` → **403** (D-6 parity); self-verify → 200;
  profile then → `approved`; verified $15 withdrawal → **HTTP 201**.
- Preview (player /profile Verification tab): renders the real status
  badge; **live-verify caught a real bug** — `verifyIdentity` used a raw
  fetch and dropped the CSRF double-submit header, so the wired button
  always 403'd in-browser ("missing CSRF token header") despite the curl
  e2e passing. Fixed (use `apiClient.post`) and re-verified in-page:
  `POST /api/v1/compliance/kyc/verify` → **200 "approved"**. (Same class
  of lesson as LC-17: unit/API green, real client path broken — live-verify
  earned its keep.) The CDP tab-click deadzone (primer-documented) was
  worked around via a native `.click()`.

**Independent codex review (`.codex-reviews/lc22-review-raw.txt`): 1 P1, 2 P2.**
- **P2 (fixed, `e4d18a80`):** withdraw no-session fallback to body userId.
- **P2 (tracked, pre-existing, not introduced here):** `uploadKycDocument`
  posts multipart snake_case `user_id`/`document_type` while
  `kyc/submit-document` expects JSON camelCase, so that legacy upload path
  400s before session binding. The verify flow wired here uses
  `kyc/verify` (works); `submit-document` mismatch is a separate
  pre-existing defect — tracked, not in LC-22 scope.
- **P1 (OPEN — D-9):** TOCTOU threshold bypass — see below.

**Status: D-8 RESOLVED for the gate, profile honesty, verify flow, and
session-binding** (built, codex-confirmed for those, live-verified, all
suites green). Remaining: the codex P1 TOCTOU (D-9) — same class as the
codex round-1 #4 RG-gate TOCTOU that was scoped as a *tracked residual*;
surfaced for a consistent scope decision rather than unilaterally deferred
or refactored.

### D-9 — KYC withdrawal-threshold gate is check-then-act (TOCTOU) (S2, OPEN)

```
[codex LC-22 P1, conf 9/10] sum → compare → insert not atomic
Severity: S2   Priority: P1 (AML/compliance gate)
Loci: internal/payments/handlers.go (gate: CumulativeWithdrawnCents →
      compare → InitiateWithdrawal); db_service.go InitiateWithdrawal
      INSERT. The cumulative read, threshold comparison, and the
      pending-withdrawal insert are not under one tx / per-user lock.
Exploit: N concurrent unverified withdrawals each read the same prior
      cumulative, each individually pass prior+amount ≤ threshold, then
      all insert — pushing realized cumulative cash-out past the KYC
      threshold without verification. Bounded to ~one threshold-crossing
      window (subsequent withdrawals see the recorded total and gate).
Class: identical to codex round-1 RG-gate finding #4 (check-vs-record
      TOCTOU), which the user scoped as a documented tracked residual.
      KYC/AML weighting is higher than a soft RG limit, hence surfaced
      explicitly rather than auto-deferred.
Correct fix: serialize the gate+withdrawal per user — e.g. a pg advisory
      xact lock keyed by userID around (sum → decide → insert), or move
      the cumulative sum + gate decision + withdrawal insert into one
      DBPaymentService transaction with appropriate row locking. Non-
      trivial concurrency change to the payments flow.
Status: OPEN — awaiting scope decision (fix now under no-shortcuts vs.
      track like the RG-gate TOCTOU).
```

## §26 — D-9 FIXED (no-shortcuts)

User chose to fix D-9 now. **Status: FIXED — commit `725c37e5`; D-9 above
is RESOLVED** (recorded here per the append-only rule; §25's "OPEN" left
intact).

**Root cause:** the withdraw handler did `CumulativeWithdrawnCents` →
threshold compare → `InitiateWithdrawal` as three separate, unsynchronized
calls. Concurrent unverified withdrawals each read the same prior
cumulative, each passed the threshold check, then all inserted.

**Fix:** new `PaymentService.InitiateGatedWithdrawal` performs
(cumulative → gate decision → wallet hold → withdrawal record) **atomically
per user**. The KYC policy stays in the handler — it is injected as a gate
callback invoked with the *locked* cumulative — so the payments package
remains decoupled from KYC.
- **DBPaymentService:** one tx holding
  `pg_advisory_xact_lock(hashtext(userID))` across the on-tx cumulative
  SELECT, the gate callback, and the on-tx withdrawal INSERT. Cluster-wide
  correct (multi-instance safe); auto-releases on commit/rollback. Wallet
  hold is released on insert/commit failure (no leak, no new TOCTOU).
- **MockPaymentService:** a per-user `sync.Mutex` (single-process
  analogue). No lock-order inversion (verified).
- **Handler:** the gate's `httpx` error is captured in per-request closure
  state and surfaced verbatim, distinct from payment-domain errors; the
  withdraw route now also requires the auth session (no body-userId
  fallback — codex LC-22 P2, fixed in `e4d18a80`).

**Verification (full no-shortcuts):**
- Unit: `TestInitiateGatedWithdrawal_SerializesPerUser_NoTOCTOU` asserts
  the per-user gate never overlaps (deterministic via an in-gate delay) —
  **fails-without** (gate ran 6-way concurrent for one user) /
  **passes-with** (1-way); `-race` clean. The 9
  `TestWithdraw_KYCJustInTimeGate` subtests still green. Full gateway
  suite **24/24**.
- Independent **codex** re-review of the fix: **VERDICT: CLEAN — FIXED,
  no P1/P2** (atomic DB critical section confirmed, hold-release safe,
  hashtext over-serializes-only, no mock deadlock, per-request gateErr,
  handler fully switched). Raw: `.codex-reviews/d9-review-raw.txt`.

**Net LC-22 / D-8 outcome:** the KYC just-in-time gate is BUILT,
codex-confirmed, and live-verified — withdrawal threshold gate
(check-then-act-safe), real profile KYC status, functional verify flow
(incl. a CSRF client bug found in-browser and fixed), KYC mutations
session-bound, D-9 TOCTOU closed. Tracked residual: the pre-existing
`uploadKycDocument` multipart/camelCase mismatch vs `kyc/submit-document`
(separate defect, not in LC-22 scope; the wired verify flow uses
`kyc/verify`).

## §27 — LC-18 / LC-19: reality-check timer & loosen-limit cooldown (investigation)

| LC | Verdict | Evidence |
|---|---|---|
| LC-18 reality-check timer | ❌ FAIL | Not implemented — no in-session reminder anywhere; `rg/session-limit` is a stub. See D-10. |
| LC-19 loosen-limit cooldown | ❌ FAIL | Loosening an RG limit takes effect immediately (live-confirmed) — no regulatory cooldown. See D-11. |

Investigated to the LC-22 depth (code map + rigorous negative verification +
live e2e). Both are **unbuilt regulatory RG controls**, not regressions —
resolution is a product/compliance feature build, surfaced for scoping
rather than unilaterally built.

### D-10 — Reality-check timer not implemented (S2, OPEN)

```
[LC-18] No periodic in-session "reality check" reminder exists
Severity: S2   Priority: P2 (regulatory RG control; FEATURE_RG-class)
Env: rebuilt gateway + player preview, 2026-05-16
```
**Findings:** exhaustive search of the player app and gateway finds no
reality-check / session-reminder timer, no "you have been playing N
minutes" modal, no interval-driven RG reminder. The only session-related
surface is `POST /api/v1/compliance/rg/session-limit`
(`internal/compliance/handlers.go` ~L411) which is a **pure stub** — it
echoes `{user_id, session_duration_minutes, effective_date, created_at}`
with no service call, no persistence, no enforcement, and no timer.
*Live:* `POST /rg/session-limit` → 201 echo; `GET /rg/restrictions` has no
session/reality field (`userId, isBlocked, isOnCoolOff, isExcluded,
depositLimits, betLimits, lastUpdated`). The "Limits"/"Verification" UI has
no reality-check element.
**Resolution = feature build:** define the reminder cadence (e.g. every N
minutes of active play, configurable), the acknowledge-to-continue UX, and
whether it pauses play; back it with real session tracking (replace the
stub). Product/compliance design decisions required.

### D-11 — Loosening an RG limit takes effect immediately; no cooldown (S2, OPEN)

```
[LC-19] Raising a self-set RG limit applies instantly (no deferral)
Severity: S2   Priority: P1 (regulatory: limit increases MUST be delayed;
          decreases immediate — UKGC/MGA/regulated-US standard)
Env: rebuilt gateway + demo u-1, 2026-05-16
Repro: set daily bet-limit 300c → raise to 50000c → GET bet-limits
Actual: immediately limit=50000 remaining=50000 (instant loosening)
Expected: the increase is deferred (cooldown — typically 24h or until the
          next period); the tighter 300c stays in force until activation;
          a decrease would apply immediately.
```
**Relationship to D-7:** D-7 (RESOLVED) fixed the *usage-reset* bypass
(re-POSTing a limit no longer zeroes accumulated usage; raising keeps
usage and grants only the delta). D-11 is a **distinct** control: that
granted delta must not be available *immediately* on a loosen — it must be
held behind a cooldown. D-7's "grant the delta now" is exactly the surface
LC-19 flags. Fixing D-11 changes that path: a raise should schedule a
*pending* limit that activates after the cooldown while the current
(tighter) limit stays enforced; a lower stays immediate. Needs pending-
limit state + activation time + lazy/worker activation across the mock
(wired) and `rg_postgres` (dormant).
**Resolution = feature build:** cooldown duration + semantics
(per-period vs fixed 24h; what happens to in-flight pending changes;
interaction with period rollover) are product/compliance decisions.

**Status: both OPEN — investigated & recorded; awaiting scope decision**
(consistent with the LC-22/D-8 handling: regulatory feature builds with
design choices, not mechanical fixes).

## §28 — D-11 FIXED (loosen-limit cooldown); D-10 tracked (no-shortcuts)

User decisions: build D-11 now with a **fixed 24h activation**; track D-10
(reality-check timer) as a residual (no build).

**D-10 (LC-18 reality-check timer): TRACKED, not built** — recorded §27.
Larger session-tracking + acknowledge-to-continue UX feature project;
revisit as its own scoped work. (No code change.)

**D-11 (LC-19 loosen-limit cooldown): FIXED — commit `7f7397fe`; §27's
D-11 "OPEN" is RESOLVED** (recorded here per the append-only rule).

**Root cause:** `SetBetLimit`/`SetDepositLimit` applied any new amount —
including an *increase* — immediately, so a user could remove their own
protection instantly (regulator requirement: increases delayed, decreases
immediate).

**Fix:** `BetLimit`/`DepositLimit` gain `PendingLimitCents` +
`PendingActivatesAt`. On set: a **raise** queues the increase at
`now + 24h` and keeps the tighter limit effective; a **lower/equal**
applies immediately and cancels any pending increase; a **first-ever**
limit applies immediately (prospective — not a loosening). The matured
pending is **lazily activated** in `refresh{Bet,Deposit}LimitState`, which
runs on every read/enforce seam (`GetLimits`, `CheckBet/DepositAllowed`,
`RecordBet`, `ReleaseBet`) — so `CheckBet/CheckDepositAllowed` enforce the
effective (tighter) limit until activation, with no worker. D-7's
no-usage-reset invariant is preserved (the `<=` path stays the D-7 path).
Honest `Set*` handler responses (confirmed effective + pending, never the
optimistic requested echo). `GetPlayerRestrictions` returns refreshed
copies so `/rg/restrictions` is consistent without mutating shared state
under the read lock.

**Verification (full no-shortcuts):**
- Unit: the D-7 test updated to D-11 semantics (raise deferred / tighten
  cancels pending) keeping its no-reset invariant; new fails-without/
  passes-with `TestMockSetBetLimit_LoosenDeferred_TightenImmediate_D11`
  (deferred-then-activates, ~24h activation window, tighten cancels
  pending) and `TestMockGetPlayerRestrictions_RefreshesMaturedPending_D11`.
  Full gateway suite **24/24**; `go test -race ./internal/compliance`
  clean.
- Live (rebuilt gateway, demo u-1): first-set 1000c → immediate; loosen
  1000→50000 → **deferred** (honest response `deferred=true`, effective
  1000, pending 50000, activatesAt ≈24h); an order needing the looser
  limit (committed 2400 > 1000) → **HTTP 400 "Bet limit exceeded"** (the
  looser limit is NOT usable pre-cooldown — proven on the real order
  path); tighten 1000→300 → **immediate**, pending cancelled. The 24h
  activation itself is deterministically unit-covered (backdated
  `PendingActivatesAt`); a live 24h wait is impractical.
- Independent **codex**: review `0 P1` (no bypass — raise deferred,
  equal/lower cancels pending, D-7 usage preserved, Check* enforce
  effective limits) + 2 P2; both P2 fixed in the same commit; **codex
  confirm-only re-review: CLEAN** (P2(a)/(b) fixed, no introduced
  regression, no data race — copies under RLock; verified with
  `go test -race`). Raw: `.codex-reviews/d11-review-raw.txt`,
  `.codex-reviews/d11-rereview-raw.txt`.

**Tracked residual (unchanged class):** `rg_postgres` (dormant, not
wired) `SetBetLimit`/`SetDepositLimit` still apply increases immediately —
needs the same deferral when wired; folds into the existing
"`rg_postgres` dormant/owed §20 item #2" residual, consistent with how
D-5/D-7/D-11's rg_postgres parity has been handled.
