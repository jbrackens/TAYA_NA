# Office Audit Scoped URL Boundary Cleanup Artifact

- Generated: 2026-06-29 17:37:51 Europe/Malta
- Loop: 395
- Primary report: `revival/79_OFFICE_AUDIT_SCOPED_URL_BOUNDARY_CLEANUP.md`

## Changed Files

- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/utils/scoped-copy-telemetry.ts`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

## Evidence

- Copied audit-log URLs now allow only `preset`, `action`, `actorId`,
  `targetId`, `userId`, `product`, `p`, and `limit` query keys.
- Scoped-copy telemetry filter signatures now count only launch-supported audit
  filters.
- Tests prove `freebetId` and `oddsBoostId` are ignored by the active API query
  and omitted from copied scoped URLs/signatures.

## Verification

- `yarn --cwd talon-backoffice/packages/office test:jest containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`
  passed with 28 tests.
- `yarn --cwd talon-backoffice/packages/office vitest run tests/app-router-legacy-routes.test.ts`
  passed with 25 tests.
- `make qa-preservation-modifications` passed and wrote
  `revival/artifacts/preservation_modification_map_20260629_153723.md`.
- `make qa-rc-completion-audit` failed as intended and wrote
  `revival/artifacts/rc_completion_audit_gate_20260629_153723.md`.
