# 150 - SB-405 Scoped Copy Telemetry Test De-duplication (Utility Reuse)

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 84 by reusing shared scoped-copy telemetry utility resolvers in audit container tests, removing duplicated local helper logic.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`

### 1) Test helper de-duplication
Removed locally duplicated resolver helpers from `audit-logs.test.tsx` and imported shared utility resolvers from:
- `containers/audit-logs/utils/scoped-copy-telemetry.ts`

### 2) Coverage continuity
All existing telemetry assertions remain intact while now depending on the same resolver implementation used by runtime code.

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Telemetry test logic is now aligned to shared runtime utility behavior, reducing duplicated resolver maintenance and drift risk.

## Next
Queue item 85:
- Add strict telemetry detail contract assertions (required key-set parity) for scoped-copy events to guard against silent payload drift.
