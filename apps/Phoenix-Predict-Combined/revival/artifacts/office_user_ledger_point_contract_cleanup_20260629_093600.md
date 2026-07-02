# Office User Ledger Point Contract Cleanup

- Generated: `2026-06-29T09:36:00Z`
- Scope: office user detail point-ledger mapper and route/source regression.
- Decision: evidence only; no scenario status is promoted by this slice.

## Change

The office user detail page now consumes only point-native admin ledger fields
when mapping `/api/v1/admin/punters/{id}/wallet` rows:

- `amountPointsCents`
- `balancePointsCents`

The route no longer falls back to retired `amountCents` or `balanceCents`
fields in the active admin user-detail mapper.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
- Result: 22 tests passed.
- Focused source scan found retired ledger aliases only inside negative test
  expectations, not in the office user-detail route implementation.
- `make qa-preservation-modifications` passed with 395 modified artifacts, 90
  high-risk contract files, 36 large-change files, tracked line churn
  `+31541 / -6385`, and zero unclassified modified artifacts.
- `make qa-rc-completion-audit` still failed with scenarios 4, 6, 7, 9, 10,
  11, and 12 Partial.

## Scenario Impact

- Scenario 10 remains Partial.
- Scenario 11 remains Partial.
- Scenario 12 remains Partial.

This closes one launch-adjacent office consumer of retired admin point-ledger
aliases, but broader backend terminology cleanup, full RC audit, and remaining
scenario evidence are still incomplete.
