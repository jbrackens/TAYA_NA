# Office Limits Point-Add Contract Cleanup

- Generated: `2026-06-29T09:42:00Z`
- Scope: office user limit editor naming and source regression.
- Decision: evidence only; no scenario status is promoted by this slice.

## Change

The active office user limit editor no longer models the point-add section with
deposit-shaped UI/form state names:

- `EditableLimitSection` now uses `pointAdd`.
- The form field is now `pointAdd`.
- The translation key is now `HEADER_CARD_LIMITS_POINT_ADD`.
- The enum member is now `TalonPunterLimitsTypesEnum.POINT_ADD`, preserving
  the inherited serialized API value `"deposits"` for compatibility.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
- Result: 22 tests passed.
- Focused source scan found old active symbols only inside negative regression
  assertions: `editables.deposits`, `values.deposits`,
  `HEADER_CARD_LIMITS_DEPOSIT`, `DEPOSITS =`, and
  `TalonPunterLimitsTypesEnum.DEPOSITS`.
- `git diff --check` passed.
- `make qa-preservation-modifications` passed with 395 modified artifacts, 90
  high-risk contract files, 36 large-change files, tracked line churn
  `+31557 / -6390`, and zero unclassified modified artifacts.
- `make qa-rc-completion-audit` still failed with scenarios 4, 6, 7, 9, 10,
  11, and 12 Partial.

## Scenario Impact

- Scenario 10 remains Partial.
- Scenario 11 remains Partial.
- Scenario 12 remains Partial.

This removes another launch-adjacent office deposit-shaped active naming path
without changing the inherited serialized API key or backend compatibility
contract.
