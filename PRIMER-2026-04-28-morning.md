# Primer — Taya NA Predict, 2026-04-28 morning handoff

You're picking up after an autonomous overnight session. **All 8 PRs in the previous queue (plus 5 follow-ups) are merged. CI is fixed. Working tree is clean on `main`.** This primer is self-contained — read it and you can pick up without backreading the previous transcript.

## What landed overnight (in merge order)

13 PRs landed, all squash-merged with --delete-branch. Each was rebased onto current main and ran a fresh CI pass before merge.

| # | Commit | Title |
|---|---|---|
| [9](https://github.com/jbrackens/TAYA_NA/pull/9) | `1f44d322` | fix(ci): repoint workflow at predict paths and unblock unit tests |
| [1](https://github.com/jbrackens/TAYA_NA/pull/1) | `e7580b54` | feat(p7): secondary-surface robinhood polish |
| [2](https://github.com/jbrackens/TAYA_NA/pull/2) | `c4bedd03` | chore(p7): retire 10 unused glass-era CSS tokens |
| [3](https://github.com/jbrackens/TAYA_NA/pull/3) | `3c876b2c` | chore: remove dead sportsbook pages-router files |
| [4](https://github.com/jbrackens/TAYA_NA/pull/4) | `c1d4573d` | chore: remove dead pages-router infrastructure |
| [10](https://github.com/jbrackens/TAYA_NA/pull/10) | `78a17bca` | chore: remove deeper legacy carcass (wave 2) — replaces auto-closed #5 |
| [6](https://github.com/jbrackens/TAYA_NA/pull/6) | `4d5349ea` | docs(design): p8 spec — light pivot + market-card composition |
| [7](https://github.com/jbrackens/TAYA_NA/pull/7) | `811e2f9a` | fix(utils): unblock dist build, restoring back-office boot |
| [8](https://github.com/jbrackens/TAYA_NA/pull/8) | `31aeae50` | feat(ws): wire market price updates into market detail page |
| [11](https://github.com/jbrackens/TAYA_NA/pull/11) | `d0b718be` | chore(copy): retire sportsbook leftovers in 4 secondary surfaces |
| [12](https://github.com/jbrackens/TAYA_NA/pull/12) | `bcb75617` | fix(market): guard WS merge against stale frames using ts watermark |
| [13](https://github.com/jbrackens/TAYA_NA/pull/13) | `276e747d` | fix(topbar): hydrate cashier-slice balance on auth resolve |

`PR #5` shows as CLOSED on GitHub — auto-closed when its base branch was deleted by PR #4 merge. Its content was re-opened as PR #10, which merged. That's the only quirk in the merge history.

## Why CI works now (PR #9)

The workflow at `.github/workflows/test.yml` had been broken since the predict fork (2026-04-16) — it pointed at `Phoenix-Sportsbook-Combined/` which doesn't exist. Every PR's CI crashed in the first second with "no such directory" before doing any actual testing.

PR #9 fixed it:
- Repointed all 7 `working-directory:` paths to `Phoenix-Predict-Combined/`
- Bumped Go 1.24 → 1.25 (gateway and auth go.mod already declare 1.25.0)
- Bumped Node 18 → 20 (Node 18 is past EOL)
- Switched frontend install from `npm install --legacy-peer-deps` to `yarn install --frozen-lockfile` at the workspace root (`talon-backoffice/`). The npm install at the package sub-directory was hanging for 6+ hours because the workspace declares yarn workspaces. Yarn install completes in ~6 seconds.
- Moved `app/__tests__/stack-smoke.test.ts` to `app/__tests__/integration/stack-smoke.test.ts` so the unit-test glob skips it (those 5 tests need a running gateway)
- Skipped the obsolete `MarketCard renders a live pricing bar (post-Phase-4)` describe block in `qa-regressions-2026-04-18.test.ts` (P3 redesign reversed those invariants; P8 will reintroduce different ones)
- Deleted ~30 sportsbook test files in `gateway/internal/http/`: bet_handlers_test.go, contract_test.go, handlers_test.go, provider_stream_sink_test.go (TestPlaceBet*, TestBetBuilder*, TestCashout*, TestAdminSettle*, TestSports*, TestFixture*, etc. — all referencing types removed at the predict fork)
- Fixed one borderline test in loyalty_handlers_test.go where a request was missing the X-User-ID auth header

Final state per CI: **frontend-tests 128/128, gateway 22 packages green, auth green, platform green.**

## Beyond the original queue: 4 fixes from the PR #1 visual review

PR #1 was visually reviewed in the browser; the review surfaced four issues that landed as their own follow-up PRs:

1. **PR #11 — sportsbook copy leftovers in 4 surfaces.** `/account/transactions` had "Bet Placement"/"Bet Settlement" filter buttons that were unreachable (the wallet API only returns deposit/withdrawal); subtitle said "deposits, withdrawals, and bets". `/account/self-exclude` said "place bets". `/privacy` and `/privacy-policy` said "betting history". All retired to predict vocabulary.

2. **PR #12 — WS merge stale-frame guard.** PR #8's WS handler did an unconditional `setMarket(prev => {...prev, ...payload})` merge with no ts comparison. Out-of-order or post-refetch stale frames could clobber newer state. Fix: useRef ts watermark, skip frames where `payload.ts <= watermark` (RFC3339 strings compare lexicographically in time order).

3. **PR #13 — TopBar balance hydration.** The BAL pill in TopBar showed $0.00 on every page except /cashier. Root cause: only /cashier dispatched `setCurrentBalance(...)` to the cashierSlice. TopBar mounts on every page, so the fix is a useEffect there that fetches `getBalance(user.id)` on auth resolve.

4. **DESIGN.md amendment to PR #6 (P8 spec) — contrast math correction.** Independent review caught the spec overstating WCAG ratios by ~1.3-2.0×. The original `--yes-text #2C9C70` and `--no-text #C75A3D` both fail AA 4.5:1 on white AND cream. Darkened to `#1A6849` (6.7:1 on white, 6.1:1 on cream) and `#A8472D` (5.8/5.3). Plus 3 contradictions resolved (TopBar `backdrop-filter` removed since §9 says "no backdrop-filter anywhere") and 5 missing pieces added (focus ring `#0E7A53`, min-segment-width on probability bar extremes, legacy token disposition policy carrying forward from P6).

## Two scheduled remote agents — both updated tonight

Both fire today. Both have hard pre-flight gates that bail cleanly if the queue isn't ready. Manage at https://claude.ai/code/routines.

| Routine | ID | Fires (UTC) | Status |
|---|---|---|---|
| P8 light-pivot implementation | `trig_016c6tLtoeRSkutnUEMFeNuW` | 2026-04-28T19:00Z | **Updated 2026-04-28 ~05:11Z** with corrected `#1A6849`/`#A8472D` token values, opaque-TopBar-no-blur directive, focus-ring `#0E7A53` rule, min-segment-width rule, and "do not bulk-delete legacy tokens" safety rail. Pre-flight now also accepts PR #5 OR PR #10 as the wave-2 carcass indicator. |
| Legacy carcass bulk-delete | `trig_01ESPjcaJ6DmkXVJJQb31Pmb` | 2026-04-28T20:10Z | **Updated 2026-04-28 ~05:13Z** to accept PR #5/#10 substitution in pre-flight. Tier-1 directive notes that PRs #4/#10 already deleted some files so `git rm -r` may find directories partially gone. |

The original prompt artifacts at `~/.gstack/projects/jbrackens-TAYA_NA/designs/p8-light-pivot-20260427/{agent-prompt.md,carcass-agent-prompt.md}` are NOT updated — only the trigger snapshots are. If you re-fire either agent from the artifact prompt, you'll re-introduce the bugs. Always update via the trigger.

## Repo state

- On `main`, fully synced with origin
- 0 open PRs
- Local branches pruned to just `main`
- Working tree clean except: `next-env.d.ts` modified (auto-generated by Next dev server, harmless), and `PRIMER-2026-04-27-evening.md` + this file untracked
- `gate.sh` (project's own quality gate at `packages/app/gate.sh`) — **all 8 gates pass**, including TypeScript, phantom imports, mock classes, feature-manifest coverage (105/105 REAL), pages/app router conflicts, and Next.js build

## Carry-forward (parked, awaits decision)

### WS cross-origin auth gap

PR #8's wiring is correct on both sides; it lights up immediately when the gap closes. Three viable paths, none picked yet:

1. **Custom Next.js server reverse-proxying `/ws`** to gateway:18080. Same-origin → cookies cross. Adds a `server.js` and changes how the player app boots (loses Turbopack-via-`next dev` until that composes cleanly with custom servers).
2. **Drop HttpOnly on `access_token`** so JS can read it from `document.cookie` and append as `?token=…` (gateway already supports this query-param fallback). Security regression — XSS exfiltration risk.
3. **WebSocket subprotocol auth** on the gateway + JS-readable session endpoint. Both sides change, new auth path to maintain.

In production all three collapse to "same origin behind nginx" so the gap evaporates. The choice matters mainly for dev convenience and prod posture. Recommendation last night was path #1 but no decision was made — that's still a user call.

### Other

- **TierPill subscription** has been silently broken for the same WS auth reason since the prediction transform. Fixes when the auth gap closes.
- **Real generated images for native markets** — P8 spec proposes deterministic monogram disc as the fallback. A future PR could integrate with DALL-E or SD keyed off the market title.
- **Theme toggle for dual light/dark mode** — P8 is light-only. If you want both, it's a `[data-theme]` attribute override on the dark token values, ~1.5x the implementation work.
- **Periodic balance refresh** (PR #13 follow-up) — TopBar fetches balance once on auth resolve. Pages that mutate balance (e.g. `/market/[ticker]` post-trade) could `dispatch(setBalanceUpdateNeeded(true))` to trigger a fresh fetch.
- **PR #5's stale imports** — a few unreachable carcass files still `import` the deleted `betSlice` (`store.config.ts`, `bet-button/`, `fixture-list/`). Not on any live build path; explicitly excluded from `typecheck-scoped.sh` and `jest.config.js`. The legacy carcass bulk-delete agent should clean these up.
- **mailto in privacy pages** — `privacy@tayanasportsbook.com`. The new domain wasn't picked. Real domain decision needed.
- **CLAUDE.md drift** — the player app's CLAUDE.md still says "Use npm install --legacy-peer-deps". The workspace IS yarn-based (yarn.lock + workspaces declaration in `talon-backoffice/package.json`). The npm guidance was sportsbook-era; CI now uses yarn. Worth updating.

## What I'd do first when picking up

1. Check the routines page (https://claude.ai/code/routines) around 19:30 UTC to see whether P8 implementation fired and opened a PR. Review whatever it produced.
2. Same again ~20:30 UTC for the carcass bulk-delete PR.
3. Pick a path for the WS auth gap if you want it lit up before the agents land more PRs that need WS.
4. Decide what to do about the mailto domain (`privacy@tayanasportsbook.com`).

## Quick verification recipes

```bash
# state
git status --short                                # working tree status
git log --oneline -10                             # recent commits on main
gh pr list --repo jbrackens/TAYA_NA --state open  # 0 expected

# infra health
curl -sS http://localhost:18080/healthz           # gateway
curl -sS http://localhost:18081/healthz           # auth
docker ps --filter name=predict_                  # docker services

# project quality gate
cd apps/Phoenix-Predict-Combined/talon-backoffice/packages/app
./gate.sh                                         # all 8 gates should pass

# unit tests (this is what CI runs)
cd apps/Phoenix-Predict-Combined/talon-backoffice
yarn install --frozen-lockfile                    # ~6s
cd packages/app
npx tsx --test --test-reporter=tap app/__tests__/*.test.ts   # 128/128

# go tests
cd apps/Phoenix-Predict-Combined/go-platform/services/gateway
go test -race -count=1 ./...                       # all green
```

## Remote agent management

```bash
# list scheduled triggers
# (use RemoteTrigger tool with action=list)
# https://claude.ai/code/routines is the web UI

# update a trigger's prompt — see the night's update for shape
# RemoteTrigger update trigger_id=trig_016c6tLtoeRSkutnUEMFeNuW body={...}
```

## Decision log (last 24 hours)

- **2026-04-27 evening** — primer written; 8 PRs queued; 2 remote agents scheduled.
- **2026-04-27 21:00 CEST** — visual review of PR #1 in browser, 16 surfaces walked clean. Independent code review of PRs #2-#8 via 6 parallel agents. All approve except PR #6 needed contrast math fix. PR #6 amended.
- **2026-04-28 04:00 UTC** — autonomous merge train start. CI was broken; PR #9 fixed it. PRs landed in order #9 → #1 → #2 → #3 → #4 → #10 (replaces #5) → #6 → #7 → #8.
- **2026-04-28 04:50 UTC** — 4 follow-up PRs landed: #11 sportsbook copy, #12 WS guard, #13 balance hydration. P8 trigger updated with corrected spec. Carcass trigger updated for PR #5→#10 substitution.

## Pre-existing things to know about (from previous primer, still true)

- **`gate.sh`** in `packages/app/` is the project's own quality gate. **All 8 gates pass as of this primer.**
- **`FEATURE_MANIFEST.json`** — hand-curated migration tracking. 105/105 features REAL.
- **Pre-commit hook** runs `yarn test && lint-staged`. Commits with sentence-case subjects fail commitlint — use lowercase imperative.
- **Pre-push hook** runs commitlint again on the latest commit.
- **Husky** is wired; never use `--no-verify` without explicit user direction.
