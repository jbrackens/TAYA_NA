# TapTrade Rebrand — WORKLOG

GOAL: zero non-allowlisted case-insensitive hits for tiangge|phoenix|talon across
player app, backend, backoffice; TapTrade everywhere per CURRENT_STATE scheme; five
gates green (Unit/Integration/E2E/Performance/Security); rendered UI clean; docs current.

## Iteration 1 — 2026-07-06 (~15:4x)
- VERIFIED: branch chore/rebrand-taptrade created off main (64d84941).
- VERIFIED (git grep -il): content-hit file counts tiangge=409 phoenix=2923 talon=716;
  path-hit files 6,397; per-surface counts in CURRENT_STATE.md.
- VERIFIED (lockfile grep): no third-party phoenix/talon packages in yarn.lock /
  package-lock.json beyond our own phoenix-ui scope → ALLOWLIST starts empty.
- ASSUMED (needs verification next iteration): phoenix-backend/, phoenix-frontend/,
  phoenix-frontend-brand-viegg/, revival/ are dead vendored trees — no active build/CI
  references. Verification method: grep .github/workflows + compose + Makefiles for refs.
- Seeded CURRENT_STATE.md, WORKLOG.md, RENAME_MAP.md, ALLOWLIST.md.
- Note: /predict award-pass deploy (main 64d84941) was in flight during this iteration;
  rebrand work is isolated on this branch.
- VERIFIED (grep): legacy trees have ZERO references from .github workflows, compose
  files, Caddyfiles, or talon-backoffice/docker, and ZERO imports from active surfaces.
  BUT the Makefile + ~12 scripts/ entries (local-stack.sh, dev-start.sh, health-check.sh,
  seed/migration validators, qa/*) still reference them — those scripts must be classified
  (active dev tooling vs. themselves legacy) before the git rm decision. → Iteration 2.

## Iteration 2 — 2026-07-06 (user-triggered, ahead of cron)
- INCIDENT (verified via reflog): at 19:01:40+0200 this worktree was checked out to main
  by an actor outside the loop (HEAD@{0} "moving from chore/rebrand-taptrade to main"),
  between loop turns. Batch A edits briefly sat uncommitted on main's tree; NOTHING was
  committed to main (guardrail held). Recovered: strays removed, branch re-checked-out,
  edits carried over. Mitigation: every future iteration re-verifies branch before edits.
- VERIFIED: legacy trees are load-bearing for a preservation/governance apparatus
  (scripts/qa/preservation-*, reconciliation, jvm security baselines; Makefile sbt
  checks; revival/ holds deletion maps). Decision: ALLOWLIST all four trees —
  drop-vs-archive resolved as ARCHIVE/ALLOWLIST. ~4,300 path hits reclassified out of
  scrub scope; active scope = frontend packages, go-platform, .github, docs, infra,
  and the two directory names.
- EXECUTED Batch A (tiangge tokens, frontend packages): 76 files, case-preserving
  Tiangge→TapTrade / tiangge→taptrade / TIANGGE→TAPTRADE across packages/app + office +
  api-client, incl. brand.ts defaults, 7-locale strings, legal pages,
  TapTradeApiClient alias (was TianggeApiClient) + its test assertions.
  VERIFIED: git grep -il tiangge over the three packages = 0.

## Iteration 3 — 2026-07-06 (user-triggered after "why isn't the loop firing")
- ROOT CAUSE of both the quiet loop and the 19:01 incident VERIFIED: background task
  task_633e7ad3 (backend scrubbed-markets fix) shares the primary checkout at
  Taya_Na_Predict/ — its 26 uncommitted gateway files appeared on our branch. Resolution:
  primary checkout returned to main (its edits intact, zero overlap with our diff,
  verified via comm(status, diff main...HEAD)); loop relocated to dedicated worktree
  Taya_Na_Predict-rebrand/; cron re-pointed (job 2d4534ec, */10).
- CONSTRAINT recorded: go-platform/** deferred until task_633e7ad3 lands; then rebase.
- EXECUTED Batch B (tiangge, living docs + infra titles): 40 files across DESIGN.md,
  PRODUCT-USER-JOURNEYS.md, docs/ (cashier, adr, cms-bonus-augmentation, ...),
  contracts/, services/cashier-api, apps README/Makefile/compose-demo/ops. VERIFIED:
  zero case-insensitive tiangge residuals in batch scope.
- CLASSIFIED: docs/audit/* = dated historical records → ALLOWLIST. scripts/** +
  scripts/release/profiles/runtime-gate.env deferred to a dedicated pass (mixture of
  preservation-gate references and cross-boundary env values).
- Remaining tiangge (active scope): go-platform (deferred), scripts/**, migrations
  (forward-only — new migration in cross-boundary phase).

## Iteration 4 — 2026-07-06 (user-triggered: "keep going")
- EXECUTED Batch C (tiangge in scripts/**, 20 files + spec.md): banners, log/artifact
  names (generator+consumer renamed together: tiangge_player_yarn_audit →
  taptrade_player_yarn_audit), ephemeral docker container names, yarn mutexes,
  local-stack service labels. bash -n syntax-verified on the shimmed release scripts.
- FIXED regression Batch A introduced: preservation-production-dossier.sh asserted the
  old 'TianggeApiClient' alias; expectations now match the shipped
  'export { PhoenixApiClient, TapTradeApiClient }' (VERIFIED against api-client/src/index.ts).
- CROSS-BOUNDARY handled with shims: TAPTRADE_* env keys with TIANGGE_* legacy fallbacks
  (allowlisted, scheduled removal) — mirrors the scripts' existing MULTI_SPORT alias pattern.
- DEFERRED: scripts/qa/go-regression-pack.sh (references Go test name
  TestDescribeTianggeMarketLifecycleMapsLaunchStages inside frozen go-platform; renames
  together with the Go batch after task_633e7ad3 lands).
- Remaining tiangge (active scope): go-platform (frozen), go-regression-pack.sh (coupled),
  migrations (forward-only phase). Frontend, docs, infra, scripts: CLEAN.

## Iteration 5 — 2026-07-06 (user-triggered: "continue")
- EXECUTED Batch D (tiangge, the Batch-A gap + tail): 9 files — talon-backoffice
  non-packages areas (e2e specs incl. UI assertions now expecting "TapTrade", E2E
  summary, tailwind-migration tooling, live-no-money-boundary qa script), repo-root
  packages/cashier-sdk README, scripts/check-cashier-guards.sh.
- ALLOWLISTED: the four loop ledger docs (they define the mapping; they must name the
  legacy tokens).
- STATUS: tiangge is now eliminated from every ACTIVE surface except: go-platform
  (~31 files, FROZEN behind task_633e7ad3), 5 applied migrations (forward-only phase),
  go-regression-pack.sh (coupled to a frozen Go test name), and intentional compat
  shims (allowlisted). The tiangge token phase is COMPLETE-PENDING-UNFREEZE.
- NEXT: Phase 2 concrete planning for phoenix/talon (npm scope @phoenix-ui, Go module
  path, docker image names, seed emails @phoenix.local, PhoenixApiClient class,
  Phoenix-Predict-Combined + talon-backoffice directory renames LAST).
