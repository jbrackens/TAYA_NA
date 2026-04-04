# 158 - SB-405 Scoped Copy Telemetry Decode Helper Promotion

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 92 by promoting query-key decode normalization to a module-level helper and adding focused unit coverage.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/scoped-copy-telemetry.ts`
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### 1) Helper promotion
Introduced exported module-level helper:
- `normalizeQueryKeyComponent`

Resolver logic now reuses this helper for all signature key decoding.

### 2) Focused helper coverage
Added direct tests for helper behavior:
- valid decode (`%61ction` -> `action`)
- plus-as-space normalization (`target+Id` -> `target Id`)
- encoded-plus literal (`target%2BId` -> `target+Id`)
- malformed fallback (`bad%ZZ`)

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Decode normalization behavior is now centralized and directly testable, reducing duplication and drift risk in scoped query signature handling.

## Next
Queue item 93:
- Add table-driven test cases for scoped query signature normalization matrix (regular, encoded, malformed, plus-space).
