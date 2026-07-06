# Loop 400 - Gateway Seed Operator Wording Cleanup

## Summary

The active gateway demo seed operator output and cleanup comments now use
point-native wording for settlement credits and reserved points. The change is
limited to launch-adjacent seed/cleanup text and tests; it does not alter
settlement, wallet, prediction, audit-log, or schema behavior.

## Changes

- Changed the phase 5 demo seed summary from `payouts created` to
  `settlement credits created`.
- Changed the per-market phase 5 line from `payouts=` to
  `settlementCredits=`.
- Reworded phase 0 cleanup comments from stuck/reserved/refunded cash to
  reserved points and point releases.
- Reworded demo cleanup error context from demo payout rows/wallet entries to
  demo settlement credit rows/wallet entries.
- Added focused seed regressions that reject the retired operator-facing
  phrases in the active seed files.

## Verification

- `go test . -run 'TestSeedCLIVisibleAmountsUsePoints|TestSeedCleanupVisibleCommentsStayPointNative|TestDemoSeedLaunchVisiblePlansStayPointNative|TestStalePendingCutoff'` passed in `cmd/seed`.
- `go test ./cmd/seed -run Test` passed.
- `git diff --check` passed.
- Focused runtime-file scan found no `stuck cash`, `reserved cash`,
  `refund the cash`, `payouts created`, `payouts=`, `delete demo payouts`,
  `purge demo payout`, or `reset payout pool` in `demo.go`,
  `demo_phase5_settle.go`, or `cleanup.go`.
- `make qa-preservation-modifications` passed with 409 classified modified
  artifacts and zero unclassified modified artifacts. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_160638.md`.
- `make qa-rc-completion-audit` failed as intended with scenarios 4, 6, 7, 9,
  10, 11, and 12 still Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_160638.md`.

## Preservation Note

The underlying `prediction_payouts` table and `prediction_payout:*`
idempotency-key prefix remain intact as inherited settlement compatibility
contracts. This loop changes only operator-facing seed wording and explanatory
comments around those preserved internals.
