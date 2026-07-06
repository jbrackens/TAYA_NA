# 153 - SB-405 Scoped Copy Telemetry Query Edge-Case Utility Tests

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 87 by adding scoped-copy telemetry utility edge-case tests for empty/fragment-only query shapes.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### Added edge-case assertions
1. `resolveScopedQueryKeyCount`:
- `/logs?#fragment` -> `0`
- `/logs?&&#fragment` -> `0`
- `/logs?` -> `0`

2. `resolveScopedQueryKeySignature`:
- `/logs?#fragment` -> `none`
- `/logs?&&#fragment` -> `none`
- `/logs?` -> `none`

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry query parsing now has explicit regression protection for empty and fragment-only query boundary cases.

## Next
Queue item 88:
- Add scoped-copy telemetry utility edge-case tests for query parameters with empty keys/values to harden signature normalization.
