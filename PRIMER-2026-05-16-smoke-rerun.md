# PRIMER — Re-run the UAT smoke test (fresh context)

Purpose: a self-contained brief so a new session can re-run the §11 smoke subset and diff results, without re-deriving the environment or rediscovering this session's gotchas.

**State:** branch `feat/binary-exchange-engine` @ `fd7f4fcc`, clean tree, all pushed to `origin/jbrackens/TAYA_NA`. Repo root is the **inner** dir: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/` (the outer `/Users/john/Sandbox/Taya_NA_Predict/` is NOT the git repo — `git` there returns "not a repository").

**Authoritative docs (read these, don't re-derive):**
- `UAT-TEST-PLAN.md` — §1 environment/test-data, §11 the 12-test smoke subset, §12 traceability. The test scripts live here.
- `UAT-SMOKE-RESULTS.md` — last run (2026-05-15) + the "process blocker" writeup.
- `PRODUCT-USER-JOURNEYS.md` — the 50 journeys behind the tests (context only).

## What changed since the last smoke run (so you can diff results)

Last run was 9 PASS / 1 FAIL / 1 PARTIAL / 1 process-blocker. All four findings were fixed this session (commits `7a9f1780`, `0d604baf`, `9f5f9907`, `3c4fb1ef`):

| Finding | Was | Now expected |
|---|---|---|
| F-1 seed nondeterminism | TC-F02 Accuracy empty (coin-flip per reseed) | **TC-F02 PASS** — ~25 settled, ~100-128 payouts, 5 Accuracy qualifiers, stable across repeated same-lifetime reseeds |
| F-3 withdrawal balance invisible | TC-G03 PARTIAL (BAL didn't move) | **TC-G03 PASS** — withdrawal moves header BAL down + cashier RESERVED up, in-tab |
| F-4 History entry >100¢ | S3 cosmetic (49 corrupt) | u-1 History shows only 0-99¢. Residual: ~1 non-u-1 straggler possible on a 2nd same-lifetime reseed — documented, NOT a regression, not in the smoke path |
| F-2 mobile nav / H07 | flagged S3 doc | Closed — H07 was a false finding; mobile bottom nav works. Nothing to test |

A clean re-run on a freshly-restarted stack should be **~12/12 PASS**.

## Preconditions — the gotchas that cost time last run

Do these BEFORE executing any test or you will chase ghosts:

1. **Restart the player dev server. Do not trust a long-running one.**
   The Next webpack dev server wedges: after mid-edit syntax errors it caches a failed module and HMR never recovers, so it *replays resolved compile errors against clean committed source* (last run: phantom `renderSettledTicket`/TopBar errors that did not exist in `fd7f4fcc`). A page rendering fine while the console screams stale errors is the tell.
   ```bash
   # via Claude Preview MCP: preview_stop then preview_start "Player App (Next.js)"
   # then clear the webpack cache so it can't reload the wedged module:
   rm -rf /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/.next/cache \
          /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/.next/dev
   ```
   After restart, load `/predict/` and confirm `preview_console_logs level=error` is **empty** before trusting any result. This precondition belongs in UAT-TEST-PLAN §1; it's here until folded in.

2. **Reseed, then restart the gateway (mandatory).** The leaderboard recomputer ticks every 5 min; its first tick fires at gateway startup. Skip the restart and Accuracy/Sharpness read empty for up to 5 min even though the data is correct (this is a test-setup error, not a bug — don't log it as F-2 redux).
   ```bash
   cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/go-platform/services/gateway
   export GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable"
   export WALLET_DB_DSN="$GATEWAY_DB_DSN" WALLET_STORE_MODE=db
   make wipe-demo && make demo-data
   cd ../../.. && docker compose restart gateway   # ~8s; first tick recomputes boards
   ```
   Post-seed sanity (optional but fast): expect `markets settled: 25`, `payouts created` ~100-128, and:
   ```bash
   docker exec predict_postgres psql -U predict -d predict -tA -c \
   "SELECT 'qualifiers_ge10='||SUM(CASE WHEN c>=10 THEN 1 END) FROM (SELECT COUNT(DISTINCT s.market_id) c FROM prediction_payouts p JOIN prediction_settlements s ON s.id=p.settlement_id WHERE s.settled_at>NOW()-INTERVAL '30 days' GROUP BY p.user_id) z;"
   # expect qualifiers_ge10 = 5  (was the F-1 failure point)
   ```

3. **Login form needs the native value-setter (automated drivers only).** The login inputs are React-controlled; `preview_fill` / setting `.value` does NOT trigger React's onChange, so the form submits empty. A human in a real browser is fine. For an agent:
   ```js
   const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
   const u=document.querySelector('input[name=username]'), p=document.querySelector('input[type=password]');
   set.call(u,'demo@phoenix.local'); u.dispatchEvent(new Event('input',{bubbles:true}));
   set.call(p,'demo123');            p.dispatchEvent(new Event('input',{bubbles:true}));
   document.querySelector('form').requestSubmit();
   ```
   Login route is `/auth/login/` (`/login` is a 404). Creds: `demo@phoenix.local` / `demo123` → user `u-1`.

4. **Verify trades by network + balance delta, not by scraping the toast.** Success toasts auto-dismiss in ~3s; an automated DOM scrape will miss them and false-FAIL TC-D01. Confirm `POST /api/v1/orders/ → 201` in `preview_network` plus the BAL pill delta instead.

5. **Trade only on a deep-book market for fill tests.** Use **`UCL-BARCA-2526`** (open, ~$5K vol). `IMP-9C2875EF` and most `IMP-*` are thin and correctly reject with 0-fill — that's TC-D03's job, not TC-D01's.

6. **Known-good test data after a fresh seed** (re-check `UAT-TEST-PLAN.md §1.2` if state looks off — stale state means the seed didn't run): settled markets include `SENATE-DEM-2026` (YES), `GPT5-JUL26` (NO), `UCL-CITY-2526` (NO). Deep open market: `UCL-BARCA-2526`.

## Execute

Run `UAT-TEST-PLAN.md §11` (the 12-test P0 subset) in order. The ⚠️-marked tests guard this cycle's fixes — they are the highest-value regressions to watch:
TC-A02, TC-B01, TC-B05⚠️, TC-B07, TC-C01, TC-C02⚠️, TC-D01, TC-B06⚠️, TC-D12⚠️, TC-E03⚠️, TC-F01+TC-F02⚠️, TC-G03.

Reorder note: do **TC-B07 (logged-out deep-link) before TC-A02 (login)** — B07 needs a logged-out state; clearing cookies then logging in is cleaner than the reverse.

Write results to a new `UAT-SMOKE-RESULTS-<date>.md` (don't overwrite the 2026-05-15 one — keep the history to diff). Use the §13 defect template for any new failure. If TC-F02 is empty: first confirm you did precondition #2 (gateway restart) before logging it as a regression.

## If you have time after the smoke subset

Full suite is `UAT-TEST-PLAN.md` §2–§10 (~55 cases, 8 suites). §12 maps all 50 journeys → covering test IDs, so "did we cover everything" is answerable from the matrix. Backoffice cases (§10, TC-I01-03) gate some consumer settlement tests and need `admin@phoenix.local` / `admin123` at `http://localhost:3001`.
