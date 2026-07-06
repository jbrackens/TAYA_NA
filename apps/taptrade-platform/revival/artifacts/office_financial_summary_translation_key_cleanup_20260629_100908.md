# Office Financial Summary Translation-Key Cleanup Artifact

- Generated: `2026-06-29T10:09:08Z`
- Loop: 389
- Scope: Office account-review translation keys

## Changed Files

- `talon-backoffice/packages/office/translations/en/page-users-details.js`
- `talon-backoffice/packages/office/tests/app-router-legacy-routes.test.ts`
- `revival/73_OFFICE_FINANCIAL_SUMMARY_TRANSLATION_KEY_CLEANUP.md`

## Contract Change

The active Office financial-summary translation keys now use point-native
names:

- `HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_POINTS_ADDED`
- `HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_POINTS_USED`
- `HEADER_CARD_FINANCIAL_SUMMARY_PENDING_POINT_USE`

Retired key names are rejected by regression assertions:

- `HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_DEPOSITS`
- `HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_WITHDRAWALS`
- `HEADER_CARD_FINANCIAL_SUMMARY_PENDING_WITHDRAWALS`

## Preservation Decision

Preserve inherited runtime behavior and rendered text. Change only the active
Office display-key names so launch-adjacent source no longer carries
deposit/withdrawal wording for point-summary labels.

## Focused Verification

- Office route/source regression: passed, 22 tests.
- `git diff --check`: passed.
- Focused source scan: old keys found only in negative test assertions.
- Preservation modification gate: passed,
  `revival/artifacts/preservation_modification_map_20260629_101042.md`.
- RC completion audit: failed as intended,
  `revival/artifacts/rc_completion_audit_gate_20260629_101042.md`, with
  scenarios 4, 6, 7, 9, 10, 11, and 12 still Partial.
