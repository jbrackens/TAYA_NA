# Office Audit Scoped URL Boundary Cleanup

- Loop: 395
- Date: 2026-06-29
- Scope: Office audit-log scoped copy URLs and telemetry
- Status: implemented and focused-tested

## Summary

The Office audit-log scoped-copy helper copied every query key from the current
route into shared audit URLs. That could carry ignored inherited promo keys such
as `freebetId` or `oddsBoostId` into operator handoff URLs even though the
active audit-log API only supports launch-safe filters such as action, actor,
target, user, product, page, limit, and preset.

This slice adds an allowlist for copied audit-log URL query keys and an
allowlist for telemetry filter-key signatures. Unsupported inherited keys are
ignored at the copy/telemetry boundary while the active API query and existing
compatibility types remain unchanged.

## Preservation Notes

This slice does not change the audit-log endpoint, backend query contract,
redux slice, rendered audit-log table, stored audit rows, or inherited raw type
fields. It only prevents unsupported inherited query/filter keys from being
re-shared through scoped handoff URLs or telemetry signatures.

## Verification

- `yarn --cwd talon-backoffice/packages/office test:jest containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`
  passed with 28 tests.
- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
  passed with 25 tests.
- `git diff --check` passed.
- `make qa-preservation-modifications` passed with 405 modified artifacts, 90
  high-risk contract files, 36 large-change files, tracked line churn
  `+31782 / -6550`, and zero unclassified modified artifacts.
- `make qa-rc-completion-audit` failed as intended because scenarios 4, 6, 7,
  9, 10, 11, and 12 remain Partial.

## Scenario Status

Scenarios 10, 11, and 12 remain Partial. This is a scoped Office admin-copy and
telemetry boundary cleanup, not final admin/API/safety-boundary evidence.
