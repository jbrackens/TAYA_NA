# Office Retired Bet Cancel Endpoint Cleanup Artifact

- Generated: `2026-06-29T10:19:31Z`
- Loop: 391
- Scope: Dormant Office user bet-cancel component

## Changed Files

- `talon-backoffice/packages/office/components/users/bets/cancel/index.tsx`
- `talon-backoffice/packages/office/tests/app-router-legacy-routes.test.ts`
- `revival/75_OFFICE_RETIRED_BET_CANCEL_ENDPOINT_CLEANUP.md`

## Contract Change

The retired component path remains, but its implementation is a null
compatibility stub and no longer contains:

- `admin/bets/:id/cancel`
- `page-bets`
- `useApi`
- `cancellationReason`

## Preservation Decision

Preserve the inherited file path for compatibility review. Remove only the
dormant launch-risk operation string and API wiring from the component body.

## Focused Verification

- Office route/source regression: passed, 23 tests.
- `git diff --check`: passed.
- Focused source scan: `admin/bets` remained only in the negative regression
  assertion.
- Preservation modification gate: passed,
  `revival/artifacts/preservation_modification_map_20260629_102037.md`.
- RC completion audit: failed as intended,
  `revival/artifacts/rc_completion_audit_gate_20260629_102037.md`, with
  scenarios 4, 6, 7, 9, 10, 11, and 12 still Partial.
