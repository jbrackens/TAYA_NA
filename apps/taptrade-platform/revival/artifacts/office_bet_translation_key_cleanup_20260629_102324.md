# Office Bet Translation-Key Cleanup Artifact

- Generated: `2026-06-29T10:23:24Z`
- Loop: 392
- Scope: Office English translation keys

## Changed Files

- `talon-backoffice/packages/office/translations/en/page-users-details.js`
- `talon-backoffice/packages/office/translations/en/page-transactions.js`
- `talon-backoffice/packages/office/tests/app-router-legacy-routes.test.ts`
- `revival/76_OFFICE_BET_TRANSLATION_KEY_CLEANUP.md`

## Contract Change

The active Office translation keys now use prediction/order/position names:

- `HEADER_PREDICTION_TRADES_HISTORY`
- `HEADER_CARD_FINANCIAL_SUMMARY_OPEN_POSITIONS`
- `ACTION_CANCEL_ORDER`
- `CELL_TYPE_PREDICTION`

Retired key names are rejected by regression assertions:

- `HEADER_BETS_HISTORY`
- `HEADER_CARD_FINANCIAL_SUMMARY_OPEN_BETS`
- `ACTION_CANCEL_BET`
- `CELL_TYPE_BET`

## Preservation Decision

Preserve rendered labels and inherited runtime behavior. Change only active
Office display-key names so launch-adjacent source no longer carries bet-shaped
translation keys for prediction/order/position labels.

## Focused Verification

- Office route/source regression: passed, 23 tests.
- `git diff --check`: passed.
- Focused source scan: retired key names remained only in negative regression
  assertions.
- Preservation modification gate: passed,
  `revival/artifacts/preservation_modification_map_20260629_102430.md`.
- RC completion audit: failed as intended,
  `revival/artifacts/rc_completion_audit_gate_20260629_102430.md`, with
  scenarios 4, 6, 7, 9, 10, 11, and 12 still Partial.
