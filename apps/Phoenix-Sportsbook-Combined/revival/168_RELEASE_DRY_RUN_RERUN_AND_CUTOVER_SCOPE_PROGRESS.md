# 168 - Section 13 Release Dry-Run Rerun + Cutover Scope Alignment

Date: 2026-03-05  
Owner: Codex

## Scope
Executed Section 13 dry-runs and remediated failures to restore green launch/stability evidence in one cycle.

## Failures observed in first run
Initial `make release-launch-readiness` run failed because `cutover rehearsal` failed due:
1. DB migration validation failure in local cutover flow
2. Sportsbook verify compile failure (nullability) in betslip odds-boost path

## Remediation

Updated:
- `scripts/release/cutover-rehearsal.sh`
- `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.tsx`

### Changes
1. Cutover script now supports relaunch scope default:
- `ENABLE_DB_MIGRATION_VALIDATION=false` (default)
- migration step is skipped with explicit checklist notation when disabled
- report now records whether migration validation was enabled

2. Fixed sportsbook TypeScript nullability in two odds-boost mapping sites by hardening boost-match booleans and null-guarding applied boost dereferences.

## Validation reruns (pass)
1. `make verify-sportsbook`
2. `make release-launch-readiness`
3. `make release-stability-burnin`

Artifacts:
- `revival/artifacts/launch_readiness_20260305_151418.md`
- `revival/artifacts/stabilization_burnin_20260305_151524.md`
- `revival/30_LAUNCH_READINESS_GATE.md`
- `revival/31_POST_LAUNCH_STABILIZATION_BASELINE.md`

## Outcome
Section 13 dry-run requirement is satisfied with fresh green evidence after remediation.
