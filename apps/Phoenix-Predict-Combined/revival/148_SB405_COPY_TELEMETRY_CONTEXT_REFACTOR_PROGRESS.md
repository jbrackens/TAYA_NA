# 148 - SB-405 Scoped Copy Telemetry Context Refactor

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 82 by refactoring `/logs` scoped-copy telemetry payload construction into a shared helper to remove duplicate mapping logic between copy and open-action flows.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`

### 1) Shared telemetry context builder
Introduced `buildScopedCopyTelemetryContext(scopedUrl, options)` inside the audit logs container to centralize construction of shared telemetry payload fields.

### 2) De-duplication
Replaced duplicated payload mapping in:
- `copyScopedUrl` flow
- `openScopedUrl` flow

Both now consume the shared context builder and only provide event-specific fields (`event`, `copyMode`) plus flow-specific options (`copyButtonLabel`, `canOpenScopedUrl`).

### 3) Behavior preservation
Refactor preserved all existing telemetry fields and semantics (including new URL/query/override/applied-filter enrichments) while reducing maintenance risk from future payload drift.

## Validation
1. Focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry payload construction is now centralized, reducing duplication and lowering regression risk when future telemetry fields are added.

## Next
Queue item 83:
- Extract scoped-copy telemetry context/key-signature resolvers into a dedicated utility module with direct unit coverage.
