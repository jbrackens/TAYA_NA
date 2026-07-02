# Office Financial Summary Translation-Key Cleanup

- Loop: 389
- Date: 2026-06-29
- Scope: Office account-review translation keys
- Status: implemented and focused-tested

## Summary

The Office user-details financial summary translation module no longer uses
deposit/withdrawal-shaped key names for rendered point-summary labels. The
rendered labels were already point-safe; this cleanup changes only the active
display-key contract:

- `HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_POINTS_ADDED`
- `HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_POINTS_USED`
- `HEADER_CARD_FINANCIAL_SUMMARY_PENDING_POINT_USE`

The labels remain:

- `Lifetime Points Added`
- `Lifetime Points Used`
- `Pending Point Use`

## Preservation Notes

This slice does not change inherited backend serialized values, API routes,
wallet logic, settlement logic, player flows, or gateway contracts. It only
removes launch-adjacent deposit/withdrawal wording from active Office
translation keys and extends the existing Office route/source regression.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
  passed with 22 tests.
- `git diff --check` passed.
- Focused source scan found the retired financial-summary keys only inside
  negative regression assertions.
- `make qa-preservation-modifications` passed with 396 modified artifacts, 90
  high-risk contract files, 36 large-change files, tracked line churn
  `+31624 / -6397`, and zero unclassified modified artifacts.
- `make qa-rc-completion-audit` failed as intended because scenarios 4, 6, 7,
  9, 10, 11, and 12 remain Partial.

## Scenario Status

Scenarios 10, 11, and 12 remain Partial. This is a narrow Office
terminology/contract cleanup, not final admin/API/safety-boundary evidence.
