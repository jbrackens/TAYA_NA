# Office Admin README Point-Native Cleanup

- Loop: 393
- Date: 2026-06-29
- Scope: Office admin documentation and preservation classification
- Status: implemented and focused-tested

## Summary

The Office README's current admin-surface section still described loyalty and
leaderboard administration as `sportsbook-native`. This slice changes that
launch-adjacent project documentation to describe the current Tiangge behavior
as point-native loyalty and leaderboard administration, with point-ledger and
XP/rank wording.

## Preservation Notes

This slice changes Office documentation, one Office regression, and the
preservation modification classifier. It does not change routes, APIs,
serialized values, wallet/ledger logic, settlement behavior, player flows, or
admin business logic. The classifier now explicitly treats the Office README as
an Office admin and operations surface so future documentation edits are
included in preservation review.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
  passed with 24 tests.
- `make qa-preservation-modifications` passed with 398 modified artifacts, 90
  high-risk contract files, 36 large-change files, tracked line churn
  `+31703 / -6517`, and zero unclassified modified artifacts.
- `make qa-rc-completion-audit` failed as intended because scenarios 4, 6, 7,
  9, 10, 11, and 12 remain Partial.

## Scenario Status

Scenarios 10, 11, and 12 remain Partial. This is a narrow Office
documentation/verification cleanup, not final admin/API/safety-boundary
evidence.
