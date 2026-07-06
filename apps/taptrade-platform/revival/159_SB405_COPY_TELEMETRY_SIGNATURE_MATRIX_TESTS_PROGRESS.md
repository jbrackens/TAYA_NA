# 159 - SB-405 Scoped Copy Telemetry Signature Matrix Tests

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 93 by adding table-driven normalization matrix tests for scoped query key signature behavior.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### Added table-driven matrix coverage
Introduced a single table-driven test that validates signature normalization across representative categories:
- regular keys
- percent-encoded keys with dedupe
- fragment-only/empty query shapes
- malformed encoded keys
- `+`-space normalized keys
- encoded literal-plus keys (`%2B`)

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Signature normalization behavior is now covered by a compact matrix harness, making future edge-case additions easier and less error-prone.

## Next
Queue item 94:
- Add table-driven test cases for scoped query key count normalization matrix to mirror signature coverage depth.
