# 160 - SB-405 Scoped Copy Telemetry Query Count Matrix Tests

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 94 by adding table-driven scoped query key count normalization matrix tests.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### Added table-driven count matrix coverage
Added matrix test cases for key count behavior across:
- empty URL query
- regular key pairs
- percent-encoded keys with duplicates
- fragment-only/empty query forms
- empty-key forms
- malformed encoded keys
- plus-space and encoded-plus scenarios

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped query key count behavior now has parity matrix coverage matching signature normalization depth, reducing edge-case regression risk.

## Next
Queue item 95:
- Add table-driven tests for filter-key signature normalization (`explicit`/`applied`) across empty/partial/full filter sets.
