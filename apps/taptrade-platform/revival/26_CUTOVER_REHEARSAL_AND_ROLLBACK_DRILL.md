# Cutover Rehearsal and Rollback Drill (2026-03-05)

Command: `make release-cutover-rehearsal`

- Result: **pass**
- Checklist artifact: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/cutover_rehearsal_20260305_151448.md`
- DB migration validation enabled: `false`

## Rollback Drill Baseline

1. Preserve latest DB snapshot before migration rehearsal.
2. Capture service image tags and config digests used in rehearsal.
3. On failure, restore DB snapshot and redeploy previous known-good image set.
4. Re-run health checks and critical E2E smoke before reopening traffic.
