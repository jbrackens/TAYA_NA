# 149 - SB-405 Scoped Copy Telemetry Utility Extraction

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 83 by extracting scoped-copy telemetry resolvers/context construction into a dedicated utility module and adding direct unit coverage.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/scoped-copy-telemetry.ts` (new)
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts` (new)
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`

### 1) Utility extraction
Moved scoped-copy telemetry shaping logic out of the container into a dedicated module:
- URL length bucket resolver
- scoped query key count resolver
- scoped query key signature resolver
- filter key signature resolver
- shared `buildScopedCopyTelemetryContext` builder

### 2) Container simplification
Updated `AuditLogsContainer` to consume the utility builder directly for both copy and open-action telemetry paths.

### 3) Direct unit coverage
Added dedicated tests for utility behavior:
- boundary checks for URL-length buckets
- query key count/signature parsing
- filter key signature normalization
- full telemetry context builder output validation

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry logic is now modular, directly testable, and less coupled to container rendering concerns, improving long-term maintainability.

## Next
Queue item 84:
- Reuse shared scoped-copy telemetry utility in audit container tests to remove duplicated local resolver helpers.
