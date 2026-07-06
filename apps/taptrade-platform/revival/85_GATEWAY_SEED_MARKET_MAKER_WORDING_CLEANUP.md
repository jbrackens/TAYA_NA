# Loop 401 - Gateway Seed Market-Maker Wording Cleanup

## Summary

The active gateway demo market-maker seed file now uses point-native wording in
comments and operator error output. This preserves order placement, wallet
reservation, matching, and settlement behavior.

## Changes

- Replaced dollar/cash/stake market-maker comments with point balance,
  point-cents, and resting point-bid language.
- Changed phase 1 order-placement error output from cent-symbol formatting to
  `point-cents`.
- Reworded the orphan-reservation cleanup comment from an insufficient-funds
  failure to an insufficient-points failure.
- Added focused seed regressions for market-maker seed wording.

## Verification

- `go test ./cmd/seed -run 'TestSeedCleanupVisibleCommentsStayPointNative|TestSeedMarketMakerVisibleWordingUsesPointCents|TestSeedCLIVisibleAmountsUsePoints|TestStalePendingCutoff'` passed.
- `go test ./cmd/seed -run Test` passed.
- `git diff --check` passed.
- Focused scan found no `resting cash`, `stakes`, `insufficient funds`,
  dollar sign, or cent symbol in `demo_phase1_book.go`.
- `make qa-preservation-modifications` passed with 410 classified modified
  artifacts and zero unclassified modified artifacts. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_161156.md`.
- `make qa-rc-completion-audit` failed as intended with scenarios 4, 6, 7, 9,
  10, 11, and 12 still Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_161156.md`.

## Preservation Note

No production-derived business logic was rewritten. This loop changes
launch-adjacent seed comments, seed error output labels, and source-scan
regressions only.
