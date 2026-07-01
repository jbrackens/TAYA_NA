# Office Bet Translation-Key Cleanup

- Loop: 392
- Date: 2026-06-29
- Scope: Office English translation keys
- Status: implemented and focused-tested

## Summary

Several Office translation keys still used inherited bet-shaped names even
though their rendered labels were already prediction-safe. This slice renames
those active keys to prediction/order/position names while preserving rendered
values:

- `HEADER_PREDICTION_TRADES_HISTORY: "Prediction Trades"`
- `HEADER_CARD_FINANCIAL_SUMMARY_OPEN_POSITIONS: "Open Positions"`
- `ACTION_CANCEL_ORDER: "Cancel Order"`
- `CELL_TYPE_PREDICTION: "Prediction"`

## Preservation Notes

This slice changes Office translation key names and source regression coverage
only. It does not change rendered labels, backend serialized values, gateway
routes, wallet logic, settlement behavior, player flows, or economy behavior.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
  passed with 23 tests.
- `git diff --check` passed.
- Focused source scans found the retired key names only inside negative
  regression assertions.
- `make qa-preservation-modifications` passed with 397 modified artifacts, 90
  high-risk contract files, 36 large-change files, tracked line churn
  `+31685 / -6513`, and zero unclassified modified artifacts.
- `make qa-rc-completion-audit` failed as intended because scenarios 4, 6, 7,
  9, 10, 11, and 12 remain Partial.

## Scenario Status

Scenarios 10, 11, and 12 remain Partial. This is a narrow Office translation
key cleanup, not final admin/API/safety-boundary evidence.
