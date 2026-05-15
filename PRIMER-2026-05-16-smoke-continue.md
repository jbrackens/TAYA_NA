# PRIMER — Continue smoke testing (fresh session)

Successor to `PRIMER-2026-05-16-smoke-rerun.md`. That primer's **6 preconditions still apply verbatim** — re-read them; the most important is #1 (restart the dev server + clear `.next/cache`, the wedged-HMR trap) and #2 (gateway restart after reseed). This doc only adds: current state, the new gotchas learned, and what to run next.

**State:** branch `feat/binary-exchange-engine` @ `8e390cb1`, clean tree, all pushed.

## Baseline to diff against (everything below already PASSES on this build)

- **F-1..F-4 fixed & verified, committed** (`7a9f1780`, `0d604baf`, `9f5f9907`, `3c4fb1ef`).
- **§11 smoke (12 tests): 12/12 PASS** — last run this build. (Prior 2026-05-15 run was 9/1/1/blocker; the fixes closed the gap.)
- **§14 behavioral smoke (BX-01..25): 25/25 PASS** — after correcting BX-02/BX-24 test methods.
- Authoritative docs: `UAT-TEST-PLAN.md` (§1 env, §11 smoke subset, §12 traceability, **§14 behavioral BX-01..25**), `UAT-SMOKE-RESULTS.md` (2026-05-15 run + the wedged-server writeup), `PRODUCT-USER-JOURNEYS.md`.

A clean re-run on a properly-restarted stack should reproduce **§11 12/12 and §14 25/25**. Any deviation is a real finding — log it with §13's template into a new dated `UAT-SMOKE-RESULTS-<date>.md` (don't overwrite history).

## New gotchas learned this session (not in the prior primer)

1. **Search indexes OPEN markets only.** The header search calls `getMarkets({status:'open'})`. In the current seed, all SENATE markets are settled (Phase-5 settles SENATE-DEM/GOP), so searching "senate" returns **0 results — that is correct, not a bug.** Test search with an **open-market** term, e.g. `barcelona` (→ "Barcelona wins Champions League"). BX-02 in §14 now says this explicitly.

2. **The trade ticket has NO free-text amount field by design** — only the $5/$25/$100 chips, MAX, and the deep-link `?amount=` query param. To test the over-balance / "Add funds" path (BX-24, TC-D09), deep-link `…/market/UCL-BARCA-2526/?side=yes&amount=999999`. Do not look for an amount input to type into; there isn't one.

3. **preview_eval harness boundaries** (these are automation limits, NOT product defects — verify behavior, don't false-FAIL):
   - React `onChange` on controlled inputs: native-setter + `dispatchEvent('input')` works for login + search query, but `preview_fill` alone often doesn't.
   - React `onFocus` (search's lazy market-load) only fires from a **real** `preview_click` on the input, not synthetic `focus`/`focusin`.
   - Synthetic `.click()` on React-`onClick` result rows (search hits) does **not** trigger `router.push`. Verify search by "results render correctly"; treat result→navigate as covered by direct-nav tests (B07/C01/C02) + source.
   - Toasts auto-dismiss in ~3s — verify trades by `POST /orders → 201` + BAL delta, never by scraping the toast.
   - **`preview_network` full dump is enormous** (600+ lines, burns context). Prefer a compact DB query (`docker exec predict_postgres psql …`) or `preview_network filter=failed`. Only full-dump as a last resort.

4. **F-4 residual (expected, not a regression):** on a 2nd+ reseed within one gateway lifetime, ~1 non-u-1 payout may have `entry_price_cents>100` (base-seed-position + demo-volume overlap). Documented S3 in `9f5f9907`. It is **not in the u-1 smoke path** — u-1's History is clean. Don't log it as new.

## What to run next

Pick up from a clean stack (preconditions from the prior primer, then):

- **Re-verify §11 (12 tests)** — fast regression of the F-1..F-4 fixes + core path. Order note: TC-B07 (logged-out) before TC-A02 (login).
- **Re-verify §14 (BX-01..25)** — the journey simulations. All 25 should PASS. For BX-02 use an open-market query term; for BX-24 use the `?amount=` deep-link (both rows in §14 now state this).
- **Or extend coverage**: §12 maps all 50 journeys → tests; gaps that are product-not-test (private/group markets J23/29) are roadmap, not QA misses. The full suite §2–§10 (~55 cases) and §10 backoffice (`admin@phoenix.local`/`admin123` @ :3001) are available if you want depth beyond smoke.

Login: `/auth/login/` (not `/login`), `demo@phoenix.local` / `demo123` → `u-1`. Deep-book market for fills: `UCL-BARCA-2526`. Settled-state market: `SENATE-DEM-2026`.

Write results to a new `UAT-SMOKE-RESULTS-<date>.md`; commit per the session's atomic pattern.
