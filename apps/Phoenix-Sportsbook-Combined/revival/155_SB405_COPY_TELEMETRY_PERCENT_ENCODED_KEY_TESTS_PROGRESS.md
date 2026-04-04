# 155 - SB-405 Scoped Copy Telemetry Percent-Encoded Key Edge Cases

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 89 by adding scoped-copy telemetry utility edge-case tests for percent-encoded query key names.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### Added decode-normalization assertions
1. Count behavior with encoded keys:
- `/logs?target%49d=1&%61ction=2&target%49d=3` -> count `3`

2. Signature normalization with encoded keys:
- `/logs?target%49d=1&%61ction=2&target%49d=3` -> `action|targetId`

3. Encoded whitespace key filtering:
- `/logs?%20=ignored&%61ction=2` -> `action`

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Query-signature decoding behavior is now explicitly protected for percent-encoded key names, reducing normalization regressions for encoded URL handoff paths.

## Next
Queue item 90:
- Add scoped-copy telemetry utility edge-case tests for invalid percent-encoding inputs and harden decode safety behavior.
