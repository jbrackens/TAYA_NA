# Office Audit Diff Display Boundary Cleanup Artifact

Generated: 2026-06-29 17:45:15 Europe/Malta

## Changed Files

- `talon-backoffice/packages/office/components/audit-logs/index.tsx`
- `talon-backoffice/packages/office/components/audit-logs/utils/display-sanitizer.ts`
- `talon-backoffice/packages/office/tests/audit-log-display-sanitizer.test.ts`
- `revival/80_OFFICE_AUDIT_DIFF_DISPLAY_BOUNDARY_CLEANUP.md`

## Display Contract

The Office audit-log expanded diff must not display unsupported inherited promo
keys as launch-facing JSON keys. Raw compatibility rows may retain those keys,
but rendered before/after details use point-native names:

- `freebetId` -> `pointGrantId`
- `oddsBoostId` -> `pointRuleId`
- `freebetAppliedCents` -> `pointGrantAppliedPointsCents`

## Verification

- Focused sanitizer Vitest: passed, 2 tests.
- Existing audit-log Jest suite: passed, 28 tests.
- Office route/source Vitest: passed, 25 tests.
- `git diff --check`: passed.
- `make qa-preservation-modifications`: passed, 406 modified artifacts,
  0 unclassified.
- `make qa-rc-completion-audit`: failed as expected with scenarios 4, 6, 7,
  9, 10, 11, and 12 still Partial.
