# Office Legacy Sports Feed Copy Cleanup Artifact

- Generated: `2026-06-29T10:13:20Z`
- Loop: 390
- Scope: Office English translation values

## Changed Files

- `talon-backoffice/packages/office/translations/en/page-users-details.js`
- `talon-backoffice/packages/office/translations/en/page-transactions.js`
- `talon-backoffice/packages/office/tests/app-router-legacy-routes.test.ts`
- `revival/74_OFFICE_LEGACY_SPORTS_FEED_COPY_CLEANUP.md`

## Contract Change

The active Office rendered labels now use legacy-compatibility wording instead
of inherited sportsbook wording:

- `CELL_PRODUCT_SPORTSBOOK: "Legacy sports feed"`
- `HEADER_CARD_FINANCIAL_SUMMARY_LEGACY_SPORTS_FEED_EXPOSURE:
  "Legacy Sports Feed Open Exposure"`

## Preservation Decision

Preserve inherited product identifiers and compatibility enum names. Change
only the rendered Office translation values and active display-key name for the
financial-summary exposure label.

## Focused Verification

- Office route/source regression: passed, 23 tests.
- `git diff --check`: passed.
- Focused source scan: retired `Sportsbook` rendered values removed from the
  checked Office translation modules.
- Preservation modification gate: passed,
  `revival/artifacts/preservation_modification_map_20260629_101426.md`.
- RC completion audit: failed as intended,
  `revival/artifacts/rc_completion_audit_gate_20260629_101426.md`, with
  scenarios 4, 6, 7, 9, 10, 11, and 12 still Partial.
