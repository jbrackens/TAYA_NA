# Office Audit Diff Display Boundary Cleanup

## Summary

Loop 396 closes one launch-adjacent Office audit-log display boundary. The
audit-log details table still accepts inherited compatibility rows, but the
expanded before/after diff JSON now maps unsupported inherited promo keys to
point-native display keys before rendering.

## Preservation Decision

- Preserved raw audit-log row shape and compatibility fields in
  `types/logs.ts`.
- Preserved audit-log API query behavior, filtering, pagination, copied URL
  behavior, and telemetry behavior.
- Changed only the rendered diff JSON path in the Office audit-log component.

## Implementation

- Added `sanitizeAuditDetailsForDisplay` for recursive display-only key
  normalization.
- Mapped `freebetId` to `pointGrantId`.
- Mapped `oddsBoostId` to `pointRuleId`.
- Mapped `freebetAppliedCents` to `pointGrantAppliedPointsCents`.
- Kept existing point-native keys authoritative when both compatibility and
  point-native keys are present.
- Added a focused Vitest regression proving nested objects and arrays are
  sanitized without mutating the raw details object.

## Verification

- `yarn --cwd talon-backoffice/packages/office vitest run tests/audit-log-display-sanitizer.test.ts`
  passed with 2 tests.
- `yarn --cwd talon-backoffice/packages/office test:jest containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`
  passed with 28 tests.
- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
  passed with 25 tests.
- `git diff --check` passed.
- `make qa-preservation-modifications` passed with 406 modified artifacts,
  90 high-risk contract files, 36 large-change files, tracked line churn
  `+31784 / -6551`, and zero unclassified modified artifacts.
- `make qa-rc-completion-audit` failed as expected because scenarios 4, 6, 7,
  9, 10, 11, and 12 remain Partial.

## Remaining Gap

Scenarios 10, 11, and 12 remain Partial. This closes one Office audit-log
display path, not the broader backend/API terminology cleanup, remaining
admin-contract cleanup, or final RC completion evidence.
