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
| — | **NEW D-1 (S2)** market SELL 0-fill — not previously exercised this way |
| — | **NEW D-2 (S3)** accuracy SETTLED column "—" |

**Bottom line:** §11 ship-clean (12/12, all guarded fixes held). §14 surfaces one real S2 (sell-side market-order matching) and one S3 (leaderboard settled column). Neither is a regression of this cycle's fixes; D-1 is the highest-value follow-up.
