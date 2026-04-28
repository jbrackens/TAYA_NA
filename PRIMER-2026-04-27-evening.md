# Primer — Taya NA Predict, 2026-04-27 evening session handoff

You're picking up after a long autonomous session. **8 PRs are open, 2 remote agents are scheduled to fire tomorrow, working tree is clean on `main`.** This primer is self-contained — read it and you can pick up without backreading the previous transcript.

## Where everything lives

- Workspace root: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/`
- Player app (Next.js 16 App Router, port 3000): `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/`
  - Source: `app/` (App Router) — this is the live surface
  - `app/lib/websocket/predict-ws.ts` — shared WS client (subscribe/unsubscribe pattern)
  - `app/components/prediction/*.tsx` — MarketCard, MarketChart, MarketHead, OrderBook, RecentTrades, TradeTicket, TopBar, AllMarketsSection, etc.
- Back office (Next.js Pages Router, port 3001 or 3002 if 3001 is taken): `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/`
- Shared workspace package: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/utils/` (unblocked by PR #7)
- Shared API client: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/`
- Go gateway (port 18080, Docker): `apps/Phoenix-Predict-Combined/go-platform/services/gateway/`
- Go auth (port 18081, Docker): `apps/Phoenix-Predict-Combined/go-platform/services/auth/`
- DESIGN.md at repo root, `CLAUDE.md` at repo root + per-package

## Infra

| Service | Port | Where | Notes |
|---|---|---|---|
| Player Next.js dev | 3000 | Claude Preview manages it (autoPort: false) | hardcoded `-p 3000` in `.claude/launch.json` |
| Office Next.js dev | 3001 (3002) | not running by default | `yarn run-local:dev:office` to start; or `npx next dev --webpack -p 3002` |
| Go gateway | 18080 | Docker `predict_gateway` | rebuild with `docker compose build gateway && docker compose up -d --force-recreate gateway` |
| Go auth | 18081 | Docker `predict_auth` | |
| Postgres | 5434 | Docker `predict_postgres` | DSN `postgres://predict:localdev@localhost:5434/predict?sslmode=disable` |
| Redis | 6380 | Docker `predict_redis` | |

Test creds (all auto-seeded): `demo@phoenix.local` / `demo123` (player), `admin@phoenix.local` / `admin123` (office). Login API field is `username` (not `usernameOrEmail`).

## 8 open PRs — all clean, awaiting review/merge

Suggested merge order: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**. PRs #3, #4, #6, #7, #8 are independent of #1/#2/#5.

| # | Branch | Title | Notes |
|---|---|---|---|
| [1](https://github.com/jbrackens/TAYA_NA/pull/1) | `p7-secondary-surfaces` | feat(p7): secondary-surface robinhood polish | Agent-built. Codex found one [P2] focus regression on `/profile` — already fixed in commit `4724d6e4` on the same branch. Visual review needed (no browser in agent sandbox). |
| [2](https://github.com/jbrackens/TAYA_NA/pull/2) | `p7-cleanup-tokens` | chore(p7): retire 10 unused glass-era CSS tokens | Stacked on #1. Rebased clean. Codex: "static searches did not find application references to the removed tokens." |
| [3](https://github.com/jbrackens/TAYA_NA/pull/3) | `cleanup/remove-dead-pages-router` | chore: remove dead sportsbook pages-router files | 6 files / -74. Independent. Codex: "did not find active App Router links or imports." |
| [4](https://github.com/jbrackens/TAYA_NA/pull/4) | `cleanup/dead-pages-router-infra` | chore: remove dead pages-router infrastructure | 27 files / -3,240. Independent. Manual audit clean. |
| [5](https://github.com/jbrackens/TAYA_NA/pull/5) | `cleanup/legacy-carcass-deeper` | chore: remove deeper legacy carcass (wave 2) | 18 files / -1,813. Stacked on #4. Manual audit clean. |
| [6](https://github.com/jbrackens/TAYA_NA/pull/6) | `spec/p8-light-pivot` | docs(design): p8 spec — light pivot and new market-card composition | Spec only — DESIGN.md changes only, no code. Can merge any time. |
| [7](https://github.com/jbrackens/TAYA_NA/pull/7) | `fix/office-bootable` | fix(utils): unblock dist build, restoring back-office boot | TS 4.3.2 → ^5.3.3 in `packages/utils`, `useRef<T>()` → `useRef<T \| undefined>(undefined)` in `spy/index.ts`, leftover sportsbook copy in office login replaced. Verified office boots clean after this. |
| [8](https://github.com/jbrackens/TAYA_NA/pull/8) | `feat/ws-market-updates` | feat(ws): wire market price updates into market detail page | Gateway broadcasts on `market:<id>` after every order; market detail page subscribes and merges. **Lights up only after the WS auth gap (below) closes.** |

## 2 remote agents scheduled

Both have hard pre-flight gates that bail cleanly with a comment on PR #6 if PRs #1–#5 aren't merged. You can bring them forward or disable from https://claude.ai/code/routines.

| Routine | Fires (UTC / Malta) | Trigger ID |
|---|---|---|
| P8 light-pivot implementation | 2026-04-28T19:00Z / 21:00 CEST | `trig_016c6tLtoeRSkutnUEMFeNuW` |
| Legacy carcass bulk-delete | 2026-04-28T20:10Z / 22:10 CEST | `trig_01ESPjcaJ6DmkXVJJQb31Pmb` |

The full prompts are saved as artifacts:
- `~/.gstack/projects/jbrackens-TAYA_NA/designs/p8-light-pivot-20260427/agent-prompt.md` — P8
- `~/.gstack/projects/jbrackens-TAYA_NA/designs/p8-light-pivot-20260427/carcass-agent-prompt.md` — carcass

## Active design direction

**P8 light pivot** is the current spec (PR #6). Same Robinhood "stock-detail-page" mood, surface inverted dark→light:

- Page: cream `#F7F3ED` + faint chart-paper grid (32px, 3.5% opacity)
- Cards: white `#FFFFFF` + hairline beige border `#E5DFD2`, no glass
- Trade palette **unchanged** — `--accent` mint, `--yes` seafoam, `--no` coral all kept
- New tokens added: `--yes-text` `#2C9C70`, `--no-text` `#C75A3D` (AA contrast on white), `--yes-bar` `#8FE5C4`, `--no-bar` `#F4A990`
- New MarketCard composition: corner image (≤15% area, every card) + 3 stat rows + horizontal probability bar (% on segments) + clear pills (YES ¢ / NO ¢)

**Visual preview** (rendered HTML, all tokens applied to a real `/predict`-style screen):
```
~/.gstack/projects/jbrackens-TAYA_NA/designs/p8-light-pivot-20260427/preview.html
```

Open with `open <path>` or serve via `python3 -m http.server` from the design dir.

The PR #6 spec replaces the warm-dark Robinhood spec (which was active 2026-04-26 → 2026-04-27, ~24 hours of life). The P8 implementation agent will swap tokens, rewrite MarketCard, and add the deterministic monogram-disc image fallback for native markets — exact same PR pattern as the P7 agent that opened PR #1.

## Carry-forward — needs your direction

### WS cross-origin auth gap (NEW — surfaced by PR #8 verification)

`ws.NewHandler` (gateway) reads the `access_token` HttpOnly cookie. The browser at `:3000` cannot send it cross-origin to `:18080`. So the WS connection fails with "HTTP Authentication failed; no valid credentials available." **The TierPill subscription has been silently broken for the same reason** since the prediction transform.

PR #8's wiring is correct on both sides; it lights up immediately when this auth gap closes. Three viable paths:

1. **Custom Next.js server to reverse-proxy `/ws`** (same-origin → cookies cross). Adds a `server.js` and changes how the player app boots. Architectural change.
2. **Drop HttpOnly on `access_token`** so JS can read it from `document.cookie` and append as `?token=…` (gateway already supports this query-param fallback). Security regression — XSS exfiltration risk.
3. **Add WebSocket subprotocol auth** to the gateway + return the token in a JS-accessible session endpoint. Both sides change, new auth path to maintain.

In production, all three collapse to "same origin behind nginx" so the issue evaporates. The choice matters mainly for dev convenience and prod posture.

### Other carry-forward (parked)

- **Real generated images for native markets** — P8 spec proposes deterministic monogram disc as the fallback. A future PR could integrate with DALL-E or Stable Diffusion keyed off the market title for poster-style images.
- **Theme toggle for dual light/dark mode** — P8 is light-only by your call. If you want both, it's a `[data-theme]` attribute override on the dark token values, ~1.5x the implementation work.

## What was deliberately not done

- Did not push any of the agent-built or scheduled-agent work to `main` directly. Everything goes via PR for human review.
- Did not bring the agents forward — they're set for ~24h out so PRs #1–#5 have time to land.
- Did not fix the WS auth gap autonomously — three paths each have implications you should pick.
- Did not touch `packages/office/` or `packages/utils/` outside what PR #7 fixed — both are sibling packages, both have pre-existing toolchain issues outside the player app's scope.

## Tsc baseline (as of `main`)

`npx tsc --noEmit` from `packages/app/` reports **341 errors**, all in legacy carcass code (root `components/`, `services/`, `containers/`, etc.). Per `CLAUDE.md`, the app ships with `typescript: { ignoreBuildErrors: true }` in `next.config.js` so these don't block production builds. The legacy carcass bulk-delete agent (scheduled) eliminates most of these.

## Quick verification recipes

```bash
# state
git status --short                                # working tree status
git log --oneline -5                              # recent commits on current branch
gh pr list --repo jbrackens/TAYA_NA --state open  # all 8 open PRs

# infra health
curl -sS http://localhost:18080/healthz           # gateway ok?
curl -sS http://localhost:18081/healthz           # auth ok?
docker ps --filter name=predict_                  # which docker services running

# rebuild gateway after Go changes
cd apps/Phoenix-Predict-Combined
docker compose build gateway && docker compose up -d --force-recreate gateway
until curl -sf http://localhost:18080/healthz >/dev/null; do sleep 2; done

# rebuild utils dist (post PR #7 — needed for office to boot)
cd apps/Phoenix-Predict-Combined/talon-backoffice/packages/utils
../../node_modules/.bin/tsc                       # workspace TS 5.3.3

# tsc check on player app
cd apps/Phoenix-Predict-Combined/talon-backoffice/packages/app
npx tsc --noEmit 2>&1 | grep -c "error TS"       # expect ~341 (baseline)
```

## Open Claude Code routines (remote agents)

```bash
# list scheduled agents (use RemoteTrigger tool with action=list)
# https://claude.ai/code/routines is the web UI
```

## Decision log (last 36 hours)

- **2026-04-26** — Pivoted from Liquid Glass cool-glass to Robinhood-inspired warm-dark. Six phases (P1–P6) shipped that day.
- **2026-04-27 morning** — P5/P6 finished, then P5 self-corrected (single-column → 2-col on /market/[ticker] after live design review found 41% horizontal dead space).
- **2026-04-27 afternoon** — User pivoted again: warm-dark → warm-light. Same Robinhood mood, just inverted. P8 spec drafted (PR #6). Two remote agents scheduled (P8 implementation + legacy carcass bulk-delete).
- **2026-04-27 evening** — Closed three carry-forward items via PRs #7 (utils unblock + office copy fix) and #8 (WS market updates wiring). Surfaced the WS cross-origin auth gap as a new carry-forward.

## What I'd do first when picking up

1. Walk `/predict`, `/market/[ticker]`, `/account`, `/auth/login` in the browser to visually review PR #1 (the only one that genuinely needs your eyes).
2. Merge PRs #1 → #2 → #3 → #4 → #5 → #6 → #7 → #8 in order.
3. Check the routines page tomorrow afternoon — both agents should have fired, opened more PRs.
4. Pick a path for the WS auth gap (#1, #2, or #3 above) — that's the next genuinely interesting decision.

## Branch hygiene reminder

Local branches that exist (all also on remote):
```
main
fix/office-bootable
fix/utils-build               (left over, abandoned in favor of fix/office-bootable)
spec/p8-light-pivot
cleanup/remove-dead-pages-router
cleanup/dead-pages-router-infra
cleanup/legacy-carcass-deeper
p7-cleanup-tokens             (note: tracks origin/p7-cleanup-tokens)
p7-secondary-surfaces         (note: tracks origin/p7-secondary-surfaces)
feat/ws-market-updates
```

Working tree is clean. Each PR's branch is current with what's on origin.

## Pre-existing things to know about

- **`gate.sh`** in `packages/app/` is the project's own quality gate (TypeScript + phantom imports + mock-class detection + manifest coverage + `next build`). PRs are expected to pass this before declaring complete; legacy carcass cleanup is partly motivated by getting it green.
- **`FEATURE_MANIFEST.json`** — the project's hand-curated migration tracking. CLAUDE.md says it's "generated from disk scanning" but no actual generator exists; it's hand-maintained. Schema is `phoenix-feature-manifest-v1` with `legacy_path` / `app_equivalent` / `status` fields. PR #4 didn't update it because removing entries loses history and the schema has no `legacy_deleted` flag.
- **Pre-commit hook** runs `yarn test && lint-staged` (prettier + eslint). Commits with sentence-case subjects fail commitlint — use lowercase imperative.
- **Pre-push hook** runs commitlint again on the latest commit.
- **Husky** is wired; never use `--no-verify` without explicit user direction.
