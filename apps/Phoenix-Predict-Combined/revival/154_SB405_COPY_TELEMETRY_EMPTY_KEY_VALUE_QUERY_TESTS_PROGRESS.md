# 154 - SB-405 Scoped Copy Telemetry Empty-Key/Empty-Value Query Edge Cases

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 88 by adding scoped-copy telemetry utility edge-case tests for query parameters with empty keys/values.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### Added edge-case assertions
1. `resolveScopedQueryKeyCount` with empty-key / empty-value params:
- `/logs?=anon&action=bet.placed&novalue=&targetId` -> `4`
- `/logs?=anon&&` -> `1`

2. `resolveScopedQueryKeySignature` normalization:
- `/logs?=anon&action=bet.placed&novalue=&targetId` -> `action|novalue|targetId`
- `/logs?=anon&&` -> `none`

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Query parsing utilities now have explicit regression coverage for malformed/partial query parameter shapes, reducing risk of silent signature/count normalization regressions.

## Next
Queue item 89:
- Add scoped-copy telemetry utility edge-case tests for percent-encoded key names to harden signature decode normalization.
