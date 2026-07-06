# Office Legacy Sports Feed Copy Cleanup

- Loop: 390
- Date: 2026-06-29
- Scope: Office English translation values and source regression
- Status: implemented and focused-tested

## Summary

Two Office translation values still rendered inherited `Sportsbook` wording in
launch-adjacent account-review and point-ledger surfaces. This slice changes
the rendered copy to legacy-compatibility language:

- `CELL_PRODUCT_SPORTSBOOK` now renders `Legacy sports feed`.
- `HEADER_CARD_FINANCIAL_SUMMARY_LEGACY_SPORTS_FEED_EXPOSURE` now renders
  `Legacy Sports Feed Open Exposure`.

The inherited `WalletProductEnum.SPORTSBOOK` resolver remains unchanged as a
compatibility key for old product rows, but the rendered label is now
launch-safe.

## Preservation Notes

This slice changes Office translation values and the source regression only. It
does not change backend enums, stored product identifiers, gateway routes,
wallet service behavior, settlement behavior, API-client method names, player
flows, or economy logic.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
  passed with 23 tests.
- `git diff --check` passed.
- Focused source scan found `Sportsbook` only in test names and negative
  regression assertions inside the checked Office translation/test scope.
- `make qa-preservation-modifications` passed with 396 modified artifacts, 90
  high-risk contract files, 36 large-change files, tracked line churn
  `+31660 / -6399`, and zero unclassified modified artifacts.
- `make qa-rc-completion-audit` failed as intended because scenarios 4, 6, 7,
  9, 10, 11, and 12 remain Partial.

## Scenario Status

Scenarios 10, 11, and 12 remain Partial. This is a narrow Office copy cleanup,
not final admin/API/safety-boundary evidence.
