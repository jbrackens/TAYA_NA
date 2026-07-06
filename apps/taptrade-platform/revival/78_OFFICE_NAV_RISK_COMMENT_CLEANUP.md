# Office Navigation and Risk Comment Cleanup

- Loop: 394
- Date: 2026-06-29
- Scope: Office active source comments and preservation classification
- Status: implemented and focused-tested

## Summary

Active Office navigation and risk source comments still described retired
Pages Router paths with inherited sportsbook-era wording. This slice rewrites
those comments to Tiangge-native compatibility language while preserving all
behavior:

- `RISK_MANAGEMENT` remains available as a compatibility enum member.
- Retired risk-management pages still redirect to `/prediction-admin/risk`.
- The prediction risk page still reads the real gateway risk snapshot.
- No route, API call, serialized value, rendered UI, or admin business logic
  changed.

## Preservation Notes

This is a comments-only source cleanup plus regression coverage. It does not
delete inherited components, alter navigation behavior, change redirects, or
touch wallet, ledger, settlement, trading, reward, or admin operation logic.
The preservation modification gate now classifies Office provider and
`next.config.js` files as Office admin and operations surfaces.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
  passed with 25 tests.
- Focused source scan found no `sportsbook`, `freebet`, `odds-boost`,
  `bet/stake`, or `fixture exposure` wording in the touched active Office
  navigation/risk source files.
- `git diff --check` passed.
- `make qa-preservation-modifications` passed with 401 modified artifacts, 90
  high-risk contract files, 36 large-change files, tracked line churn
  `+31732 / -6535`, and zero unclassified modified artifacts.
- `make qa-rc-completion-audit` failed as intended because scenarios 4, 6, 7,
  9, 10, 11, and 12 remain Partial.

## Scenario Status

Scenarios 10, 11, and 12 remain Partial. This is a narrow Office active-source
terminology cleanup, not final admin/API/safety-boundary evidence.
