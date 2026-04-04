# 157 - SB-405 Scoped Copy Telemetry Plus-Key Normalization

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 91 by adding `+`-encoded key edge-case coverage and normalizing signature decode behavior for plus-as-space versus encoded-plus literals.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/scoped-copy-telemetry.ts`
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### 1) Decode normalization behavior
Updated decode helper flow to replace raw `+` with space before `decodeURIComponent`, while preserving literal plus behavior through `%2B` decoding.

### 2) Added regression coverage
New assertions verify:
- `/logs?target+Id=1&action=2` -> signature `action|target Id`
- `/logs?target%2BId=1&action=2` -> signature `action|target+Id`
- count behavior remains stable.

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy query-signature normalization is now robust for `+`-encoded keys, reducing ambiguity between space-normalized keys and literal-plus keys.

## Next
Queue item 92:
- Promote query-key decode normalization helper to module scope and add focused utility tests for decode fallback behavior.
