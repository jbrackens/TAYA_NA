# TapTrade Rename Map (old → new; every entry must trace to inventory)

## Frozen token scheme
See CURRENT_STATE.md table. Entries below are CONCRETE artifacts as they are planned/executed.

## Planned (Phase 2 — not yet executed)
- brand.ts default: "Tiangge" → "TapTrade"; support/privacy/legal emails @tiangge.com → @taptrade.com
- BrandMark/wordmark strings, layout titles, locale files (7 locales × ~30 namespaces)
- public/brand/* asset filenames containing tiangge
- @phoenix-ui/* → @taptrade-ui/* (packages: app, office, api-client, utils, design-system, mock-server)
- Go module phoenix-revival/gateway → taptrade/gateway (+ all internal imports)
- docker images phoenix-gateway → taptrade-gateway, phoenix-auth → taptrade-auth,
  predict-frontend (no legacy token — keep)
- seed users *@phoenix.local → *@taptrade.local (auth service seeds + docs + tests)
- dirs (LAST): Phoenix-Predict-Combined → taptrade-platform; talon-backoffice → frontend

## Executed
- Batch A (iteration 2): tiangge→taptrade all case variants, CONTENT ONLY, scope =
  talon-backoffice/packages/{app,office,api-client} (76 files). Includes
  TianggeApiClient→TapTradeApiClient identifier + test assertions; brand.ts defaults;
  support/privacy/legal emails @tiangge.com→@taptrade.com; 7-locale display strings.
- Batch B (iteration 3): tiangge→taptrade all case variants, CONTENT ONLY, scope = living
  docs + infra titles (40 files: root DESIGN/PRODUCT docs, docs/** minus docs/audit,
  contracts/, services/cashier-api, apps README/Makefile/docker-compose.demo.yml/ops).
- Batch C (iteration 4): tiangge→taptrade in scripts/** (20 files) + spec.md env-key
  mentions. Env keys TIANGGE_DISCOVERY_CONTRACT_ITERATIONS→TAPTRADE_… and
  RUN_TIANGGE_DISCOVERY_CONTRACT_GATE→RUN_TAPTRADE_… with legacy fallbacks retained.
  Artifact name pair tiangge_player_yarn_audit→taptrade_player_yarn_audit renamed on
  both generator (security/dependency-baseline.sh) and consumer
  (qa/frontend-residual-advisory-gate.sh) sides atomically.
- Batch D (iteration 5): tiangge→taptrade, 9 files — talon-backoffice/{E2E summary,
  e2e specs, scripts tooling}, packages/cashier-sdk/README.md, scripts/check-cashier-guards.sh.

## Phase 2 plan — phoenix/talon (recon verified, iteration 5)
Measured targets (active scope, lockfiles excluded — locks regenerate at batch G):
- @phoenix-ui/* npm scope: 111 import-site files → @taptrade-ui/* (workspace package.json
  names + every import; lockfile regen; one atomic batch: BATCH G)
- PhoenixApiClient class: 9 ref files → TapTradeApiClient becomes the class, keep
  PhoenixApiClient as deprecated alias export (mirror of today's arrangement, preserves
  the preservation-dossier contract; BATCH F)
- phoenix-revival/gateway Go module: 142 files → module taptrade/gateway + goimports
  rewrite (BATCH H, AFTER task_633e7ad3 lands + branch rebased on main)
- *@phoenix.local seed emails: 48 files (docs+tests+seeds; auth service seeds live in
  frozen go-platform) → @taptrade.local, split: docs/tests now (BATCH E), go seeds in
  BATCH H
- docker images phoenix-gateway/phoenix-auth: 4 refs (.github + compose) → taptrade-*
  with on-box image retag in deploy workflow (BATCH I, cross-boundary)
- talon tokens: 85 files (excl. the talon-backoffice dir itself): TALON_DIR/PORT/REPO/…
  env-key family in scripts (~86 occurrences) → TAPTRADE_OFFICE_* with legacy fallbacks
  (same shim pattern as batch C) (BATCH E/F); make verify-talon target alias (BATCH F)
- Directory renames LAST (BATCH J): Phoenix-Predict-Combined → taptrade-platform,
  talon-backoffice → frontend; must update .github workflows paths/filters, deploy
  rsync paths, Dockerfiles, compose contexts, preservation-gate hardcoded paths,
  CLAUDE.md, and the loop's own worktree docs in the SAME commit; deploy workflow
  path-filter change means the FIRST post-merge push must be watched manually.
Sequenced: E (docs/comments/emails-in-active-text) → F (identifiers + make targets +
env shims) → G (npm scope atomic) → H (Go module + go seeds, post-unfreeze) →
I (docker images/infra) → J (directories) → final verify sweep.
- Batch E (iteration 6): phoenix/talon prose→TapTrade in 37 living docs (masked:
  Phoenix-Predict-Combined, talon-backoffice, @phoenix-ui, phoenix-revival,
  phoenix-gateway/auth, PhoenixApiClient, archive dir names, phoenix.local, TALON_*).
- Batch F (iteration 6): PhoenixApiClient⇄TapTradeApiClient flip (class↔alias);
  TALON_*→TAPTRADE_OFFICE_* (17 scripts, no shims — internal-only, verified);
  Makefile verify-talon→verify-office + legacy alias target.
- Batch G (iteration 6): @phoenix-ui/*→@taptrade-ui/* (135 files, atomic), monorepo
  name phoenix-ui→taptrade-ui, lockfiles regenerated, double-scope ban in gate.sh.
- Batch I (iteration 6): phoenix-gateway/auth image tags → taptrade-*; explicit
  compose image: entries added; COMPOSE_PROJECT_NAME=phoenix pinned (allowlisted,
  runbook exit); /tmp dev binary names renamed.
