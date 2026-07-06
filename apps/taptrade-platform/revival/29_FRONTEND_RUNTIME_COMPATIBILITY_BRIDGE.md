# Frontend Runtime Compatibility Bridge

Date: 2026-03-03

## Objective

Stabilize deterministic frontend verification for both Talon and Sportsbook while keeping Node 20 as the primary runtime target.

## What Was Changed

1. `make verify-sportsbook` now includes a compatibility bridge:
   - Primary path: Node 20 + Yarn 1.22.22 + frozen lockfile.
   - Fallback path: if `@phoenix-ui/utils` TypeScript dist fails under Node 20, rerun only that step under Node 16.16, then return to Node 20 for app build.
2. `scripts/local-stack.sh bootstrap` mirrors the same sportsbook fallback so local bootstrap remains consistent with CI-style verification.
3. `make verify-talon` remains on Node 20 path and verifies successfully without fallback.

## Why This Bridge Exists

The sportsbook utils package (`phoenix-frontend-brand-viegg/packages/utils-core`) intermittently receives `SIGKILL` during `tsc` when executed via workspace script on Node 20 in this legacy dependency stack. The same compile succeeds on Node 16.16.

Bridge behavior isolates the fallback to a single legacy compile step while preserving Node 20 for the app build and runtime path.

## Verification Evidence

- Sportsbook verify pass:
  - command: `make verify-sportsbook`
  - evidence: `revival/artifacts/cutover_20260303_091606_frontend_sportsbook_verify.log`
- Talon verify pass:
  - command: `make verify-talon`
  - evidence: `revival/artifacts/cutover_20260303_091606_frontend_talon_verify.log`
- Cutover rehearsal pass with both frontends included:
  - command: `make release-cutover-rehearsal`
  - evidence: `revival/artifacts/cutover_rehearsal_20260303_091606.md`

## Follow-up Work

1. Upgrade and harmonize legacy React/TypeScript dependency graph to remove Node16 fallback dependency.
2. Remove bridge once `@phoenix-ui/utils` compiles reliably on Node 20 in all environments.
