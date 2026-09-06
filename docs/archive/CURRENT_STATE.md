> **ARCHIVED 2026-09-06.** Frozen record of the July 2026 TapTrade rebrand
> loop (final state: iteration 8, GOAL MET; the cron it references is long
> gone). Not current project state — for the state at the 2026-09 hold, read
> the closing entry in WORKLOG.md at the repository root.

# TapTrade Rebrand — CURRENT_STATE

Loop iteration: 8 — GOAL MET; loop stopped. Branch ready for owner merge (25 commits). · Branch: chore/rebrand-taptrade
Cron: 0dadff9f (*/15) · Exit condition: see GOAL in WORKLOG header.

## Canonical naming scheme (FROZEN — do not drift)
| Legacy | TapTrade | Context |
|---|---|---|
| Tiangge | TapTrade | display/PascalCase |
| tiangge | taptrade | slugs/packages/hosts |
| TIANGGE | TAPTRADE | SCREAMING_CASE |
| tiangge (snake) | tap_trade | snake_case |
| tianggeX (camel) | tapTradeX | camelCase |
| Phoenix/phoenix/PHOENIX (legacy codename) | TapTrade/taptrade/TAPTRADE (case-preserving) | all legacy usages |
| Talon/talon (legacy codename) | TapTrade/taptrade — EXCEPT dir `talon-backoffice` → `frontend` (neutral; avoids collision with phoenix→taptrade renames) | pending Phase-2 collision check |
| phoenix-revival/gateway (Go module) | taptrade/gateway | HIGH-RISK: full Go import rewrite |
| @phoenix-ui/* (npm scope) | @taptrade-ui/* | HIGH-RISK: workspace + lockfile regen |

## Surfaces (active)
- Player app: apps/Phoenix-Predict-Combined/talon-backoffice/packages/app (108 files w/ hits)
- Backoffice:  .../packages/office (89) + api-client (5)
- Backend:     apps/Phoenix-Predict-Combined/go-platform (186)
- Repo-level:  .github (10), docs (45), root docs/compose

## Inventory snapshot (case-insensitive, tracked files)
- Files w/ content hits: tiangge 409 · phoenix 2,923 · talon 716
- Files w/ legacy term in PATH: 6,397 — dominated by dir names:
  Phoenix-Predict-Combined (root of everything), talon-backoffice (1,453),
  phoenix-backend (1,732), revival (1,495), phoenix-frontend-brand-viegg (1,128)
- Lockfiles: only self-referential names (phoenix-ui) — NO third-party
  phoenix/talon deps found yet; ALLOWLIST currently empty pending deep pass.

## Open decisions (resolve next iteration, Phase 2)
1. RESOLVED (iteration 2): the four legacy trees are ALLOWLISTED preservation-contract
   archives (see ALLOWLIST.md). Not renamed, not deleted.
2. Dir renames (HIGH-RISK, phase last): Phoenix-Predict-Combined → taptrade-platform;
   talon-backoffice → frontend. Both touch CI workflows, deploy rsync paths, Dockerfiles.
3. HIGH-RISK cross-boundary list (compat shims required): docker images
   (phoenix-gateway/phoenix-auth/predict-frontend), compose service/container names,
   Go module path, npm scope, deploy-demo.yml paths, seed emails (*@taptrade.local),
   NEXT_PUBLIC_* unchanged (no legacy tokens found in env keys yet — verify).

## Phase status
- [x] Phase 0: branch, guardrails, scheme frozen
- [x] Phase 1: gross inventory (counts above); fine-grained classification CONTINUES next iteration
- [ ] Phase 2: rename map per match; risk sequencing
- [ ] Phase 3: execution batches
- [ ] Phase 4: verify (grep zero + 5 gates + rendered)
- [ ] Phase 5: record/loop


## Post-rebrand integration (2026-07-07)
All unmerged branch work audited and resolved: 5 integrated (scrubbed-markets backend, gateway rate limiting, social-oauth deploy wiring, sentiment i18n, agent-policy docs), 16 superseded branches deleted local+remote with evidence in WORKLOG. Remaining branches: main, feat/hula-na-cashier (owner compliance decision pending), pam/p0-modernization (active loop).
