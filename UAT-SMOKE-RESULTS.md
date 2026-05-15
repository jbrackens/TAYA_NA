# UAT Smoke Run — Results (§11 subset)

**Date:** 2026-05-15 (evening) · **Build:** branch `feat/binary-exchange-engine` @ `6109f0d7` · **Env:** BASE=`http://localhost:3010`, desktop 1280×800, demo@phoenix.local
**Executed by:** automated (Claude Preview browser) · **Plan:** [UAT-TEST-PLAN.md](UAT-TEST-PLAN.md) §11

## Verdict

**9 PASS · 1 FAIL · 1 PARTIAL/FAIL · 1 process-blocker found & cleared.** Not ship-clean. Two real defects (one S2, one S2) plus one S2 process gap and one S3. None are regressions of this cycle's shipped fixes — every ⚠️-guarded fix held. The two failures are a seed-reliability defect and a cashier balance-refresh defect.

| # | Test | Result | Severity | Note |
|---|---|---|---|---|
| 1 | TC-A02 login | ✅ PASS | — | →/predict/, BAL $5095.87, survives reload |
| 2 | TC-B01 discovery loads | ✅ PASS | — | Top movers, 7 cats, 3 windows, 12 cards, featured |
| 3 | TC-B05 nav active state ⚠️ | ✅ PASS | — | Markets active on /predict/, Portfolio on /portfolio/; H01 holds. **Discrepancy → see F-2** |
| 4 | TC-B07 cold deep-link logged out | ✅ PASS | — | Full context + SETTLED badge, no auth wall |
| 5 | TC-C01 open market renders | ✅ PASS | — | All sections; **zero console errors** (clean build confirmed) |
| 6 | TC-C02 settled market state ⚠️ | ✅ PASS | — | SETTLED·YES wins badge, Closed (no fake countdown), outcome explainer |
| 7 | TC-D01 market BUY + truthful toast | ✅ PASS\* | — | POST /orders 201, BAL −$24.92, portfolio updated. *\*toast auto-dismissed before automated capture — harness limitation, fill verified via network+balance* |
| 8 | TC-B06 BAL pill refresh after trade ⚠️ | ✅ PASS | — | $5095.87→$5070.95 in-tab, wallet refetch in network trace |
| 9 | TC-D12 settled market blocks trading ⚠️ | ✅ PASS | — | No Place-trade button, no amount input on settled market |
| 10 | TC-E03 portfolio History populated ⚠️ | ✅ PASS | — | 4 settled rows, mixed P&L, Accuracy 2/4. **+ S3 → F-4** |
| 11a | TC-F01 Weekly P&L | ✅ PASS | — | 5 ranked, viewer #1 |
| 11b | TC-F02 Accuracy ⚠️ | ❌ **FAIL** | **S2** | "Nobody has qualified." 0 rows. Root cause = F-1 (seed nondeterminism), not leaderboard code |
| 12 | TC-G03 withdrawal | ⚠️ **PARTIAL/FAIL** | **S2** | Fee disclosed pre-submit ✅, POST 201 ✅; **no timing disclosure ❌, header BAL doesn't update post-withdrawal ❌** → F-3 |

## Defects

### F-1 — Demo seed is nondeterministic across same-session reseeds (S2)
Identical `make wipe-demo && make demo-data` produced **101 payouts / max 18 settled-per-user** earlier today vs **26 payouts / max 5 settled-per-user** on this run. Root cause: Phase 1's bot order book gets exhausted on repeated reseeds within one gateway lifetime → Phase 2 synthetic taker volume doesn't fill (only 189 phase2 orders filled this run) → too few traders hold positions in the 25 Phase-5-settled markets → nobody clears Accuracy's `MinSettled=10`.
**Impact:** Directly causes TC-F02 FAIL. A QA tester or demo presenter following the runbook gets empty Accuracy/Sharpness boards on a "successful" seed with no error. Non-obvious, reproducible, high blast radius for demo prep.
**Fix direction:** make Phase 1 book replenishment idempotent across reseeds (reset bot reservations/inventory at wipe), OR have demo-data restart the gateway+flush before Phase 1, OR assert a post-seed invariant (`≥1 user with ≥10 settled-30d`) and fail loudly if unmet.
**Repro:** run §1.1 twice in one gateway lifetime; compare `SELECT user_id, COUNT(DISTINCT market_id) FROM prediction_payouts p JOIN prediction_settlements s ON s.id=p.settlement_id WHERE s.settled_at > NOW()-INTERVAL '30 days' GROUP BY 1`.

### F-3 — Cashier withdrawal: balance not reflected in UI, no timing disclosed (S2)
`POST /api/v1/payments/withdraw/ → 201` succeeds and `/api/v1/wallet/u-1/` is refetched, but the header BAL pill stays unchanged ($5070.95 → $5070.95) after a $10 withdrawal. Fee IS disclosed pre-submit (2%, correct math, Total shown) — the core trust element — but (a) no processing-time/ETA shown before submit, (b) the user sees no balance movement confirming the withdrawal took.
**Impact:** Journey 49 (the master trust gate) — "I withdrew and my balance didn't change" is a trust failure even though the server processed it. Same bug *class* as the pre-fix TC-B06, but the wallet-refresh fix shipped this cycle only covered the market `handleSubmit`, not the cashier path.
**Fix direction:** dispatch `setCurrentBalance` (or invalidate the wallet query) on the cashier withdraw/deposit success path, mirroring the market-page fix; add a processing-time line to the withdrawal summary.

### F-2 — Mobile nav exists; H07 was a false finding (S3 / doc-accuracy) — RESOLVED 2026-05-16
A mobile bottom-tab nav (`.mtb-item`) renders below the 900px breakpoint. Verified on 375×812: 5 real links — Markets→/predict/, Portfolio→/portfolio/, Boards→/leaderboards/, Rewards→/rewards/, Account→/account/. Tapping "Portfolio" navigated to /portfolio/ and rendered. Mobile nav is present and functional.
**Resolution:** design-review finding H07 ("no mobile hamburger — pages unreachable on mobile") was **wrong** — the audit asserted the desktop `.tb-nav` was hidden and didn't detect the separate mobile tab-bar component. TODOS.md H07 reclassified INVALID/closed; nothing to build. Lesson recorded in TODOS: mobile checks must look for any mobile nav component, not only that the desktop nav is hidden.

### F-4 — Portfolio History ENTRY column shows impossible >100¢ values (S3)
History tab shows `ETH-5K-MAY26 ENTRY 358¢` (and earlier observed `SENATE-DEM 1031¢`). Binary contracts are 0–99¢; an entry price >100¢ is impossible per-share. Column likely renders aggregate cost or total, mislabeled as per-share "ENTRY". Pre-existing (seen in both dress rehearsals), not introduced this cycle. User-visible correctness/credibility issue on the History view.
**Fix direction:** clarify whether the column is per-share avg or total cost; relabel or recompute.

## Process blocker found & cleared (report-worthy)

**The :3010 dev server was wedged.** A `next-server` process running continuously since Thu 10PM was replaying *resolved* TradeTicket/TopBar compile errors (`renderSettledTicket is not defined`, TopBar:639 syntax) against current clean source. Committed code at `6109f0d7` was verified syntactically valid; the errors were a stale webpack-HMR cache from mid-edit syntax errors earlier this session that HMR never recovered from.
**Resolution:** `preview_stop` (killed the wedged chain cleanly), cleared `.next/cache` + `.next/dev`, `preview_start` fresh → zero console errors, all subsequent tests valid.
**Action for UAT-TEST-PLAN §1:** add a precondition — *restart the player dev server (don't reuse a multi-hour-old process) before a UAT pass; verify console is clean on /market/[ticker] before trusting any trading test.* A long-lived dev server that has seen mid-edit syntax errors will report false failures.

## What this run proved about this cycle's shipped fixes

All ⚠️-guarded regression tests **held** on a clean build:
- H01 nav active-state on `/predict/` — PASS (TC-B05)
- Settled-market hero/badge/no-countdown + outcome ticket — PASS (TC-C02)
- Settled market blocks trading — PASS (TC-D12)
- Wallet BAL pill refresh after trade — PASS (TC-B06)
- Portfolio History populated — PASS (TC-E03, this run's seed depth was enough for History even though not for the Accuracy board)

No regression of shipped work. The two real failures (F-1 seed nondeterminism, F-3 cashier balance refresh) are pre-existing/adjacent defects this smoke run surfaced — exactly its job.

## Ship recommendation

**Do not treat as demo-clean until F-1 and F-3 are addressed.** F-1 makes the leaderboards demo a coin-flip per reseed; F-3 makes the withdrawal trust-gate look broken. F-2/F-4 are documentation/cosmetic and can follow. The core trade → settle → portfolio path and all this-cycle fixes are solid.
