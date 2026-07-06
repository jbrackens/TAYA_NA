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
- NEXT: Phase 2 concrete planning for phoenix/talon (npm scope @taptrade-ui, Go module
  path, docker image names, seed emails @phoenix.local, PhoenixApiClient class,
  Phoenix-Predict-Combined + talon-backoffice directory renames LAST).

## Iteration 6 — 2026-07-06 (EXECUTION MODE engaged; job b56e063b)
- EXECUTED Batch E: phoenix/talon prose in 37 living .md docs, with masked protection
  for path/scope/module/image/class/archive tokens (each has its own later batch) —
  VERIFIED zero accidental protected-token rewrites in the diff.
- DECISION: @phoenix.local seed emails move to Batch H (atomic with the frozen Go
  seeder) — renaming doc/test references before the seeder would break login flows
  that use demo@phoenix.local against local auth.
- EXECUTED Batch F (identifiers): TapTradeApiClient is now the class,
  PhoenixApiClient a @deprecated alias (assertion sites — wallet-paths test +
  preservation dossier — flipped atomically); TALON_* env family →
  TAPTRADE_OFFICE_* plain rename (VERIFIED internal-only: no refs outside scripts/
  except the allowlisted archive); make verify-office replaces verify-talon with a
  compat alias target. bash -n on shimmed scripts, make -n on the alias, tsc clean.
- EXECUTED Batch G (npm scope, atomic): @phoenix-ui/* → @taptrade-ui/* across 135 files
  (6 package names + root monorepo name phoenix-ui→taptrade-ui + imports + tsconfig/
  jest/next configs + guards + CI workflow comment + docs); gate.sh design-system ban
  now blocks BOTH old and new scope; yarn.lock regenerated (6.2s), package-lock
  workspace names updated. VERIFIED: tsc clean, gate.sh ALL GATES PASSED (7/8,
  pre-existing TODO warning).
- CORRECTION (same iteration): batch G's blanket replace also touched
  .github/workflows/{e2e,frontend-build}.yml (legit — CI builds the renamed workspaces;
  amended into the batch) and .codex-reviews/lc38-review-raw.txt (historical review log —
  reverted + .codex-reviews/ allowlisted).
- CORRECTION 2 (same iteration): batch G's blanket pass corrupted the LEGACY column of
  the ledger docs (mapping lines read taptrade→taptrade) — repaired; guardrail updated:
  ledger docs are now always excluded from replace passes. Spillover content staged
  (CHANGELOG, DEMO_DEPLOYMENT_PLAN, verify scripts, local-stack, docs, spec.md,
  check-conventions.sh — the last now double-bans old+new scope like gate.sh).
- FILE RENAMES (history-preserving git mv, referrers updated same commit):
  scripts/frontend/verify-talon.sh → verify-office.sh (Makefile updated);
  docs/tiangge-economy-rules.md → taptrade-economy-rules.md (spec.md updated).
- EXECUTED Batch I (docker images, cross-boundary): taptrade-gateway/taptrade-auth
  tags in deploy workflow; compose demo overlay gains explicit image: entries
  (decouples image names from the box's compose project name — VERIFIED that compose
  derives default image names from the /opt/phoenix dir, which is why explicit names
  are required before retagging); COMPOSE_PROJECT_NAME=phoenix pinned into the
  box .env by the workflow to preserve volumes; /opt/phoenix path + the pin
  allowlisted with a written cutover runbook (ops/RUNBOOK.md). dev-start.sh local
  binary names renamed. YAML validated. FIRST POST-MERGE DEPLOY MUST BE WATCHED.
- BATCH I FOLLOW-UP: removed 2 stale .gitignore entries for the nonexistent
  Phoenix-Sportsbook-Combined tree (VERIFIED absent); classified parity-run-log.md +
  prototype-audit.md as dated records (ADMISSION: batches B/E renamed some prose inside
  them before this classification existed — recorded, not reverted, as the renames were
  brand tokens in summaries rather than measured data); remaining PhoenixApiClient doc
  mentions are true references to the live deprecated alias.
- STATE: pre-unfreeze batches EXHAUSTED. Active scope is grep-clean except deferred
  patterns (paths→J, phoenix.local+module+Go→H, allowlisted pins/shims/records).
  Loop iterations until task_633e7ad3 lands: re-verify residuals only, then H→J→final.
- RENDERED CHECK (mid-run, player app on :3013 against demo API): wordmark
  "TapTrade.", document titles "TapTrade", ZERO legacy strings
  (Tiangge|Phoenix|Talon|Hula Na) in rendered text on / and /predict — VERIFIED.
  Backoffice rendered check pending final sweep (needs office dev server).

## Iteration 7 — 2026-07-06 (EXECUTION MODE continued; owner: "don't stop")
- FREEZE BOUNDARY RECOMPUTED precisely: backend task touches 26 gateway files; 35 of
  38 tiangge-bearing go-platform files (excl. migrations) are OUTSIDE its set.
- EXECUTED Batch H-pre: scrubbed tiangge tokens in those 35 safe Go files with masks
  protecting the cross-file identifier TianggeMarketLifecycle/DescribeTiangge (it spans
  two files INSIDE the frozen set — the identifier, its test, and the coupled QA script
  rename together after unfreeze). VERIFIED: go build clean, notify/feed/auth suites
  green, full ./services/gateway/... suite green (exit 0).
- Discovery: TWO Go modules carry the codename (phoenix-revival/gateway AND
  phoenix-revival/auth) — Batch H covers both.
- RENDERED CHECK (backoffice, :3014): title "TapTrade Backoffice | Admin Panel",
  sign-in page shows TapTrade branding, ZERO legacy strings — VERIFIED after fixing a
  real batch-G gap the check exposed: fresh worktrees need workspace dist builds
  (packages/utils tsc) + a clean office .next cache; office resolves @taptrade-ui/*
  correctly once built. (gate.sh covers only the app package — office verification is
  rendered/e2e territory; noted for the final sweep.)
- GATE EVIDENCE: security secrets scan ran clean (baseline artifacts regenerated into
  revival/ by the preservation tooling — reverted from MY branch: the archive updates
  belong to governance runs on main, not the rebrand branch). Manifest/OG/meta and
  public asset FILENAMES verified free of legacy tokens across app+office (GOAL #4
  asset criteria).
