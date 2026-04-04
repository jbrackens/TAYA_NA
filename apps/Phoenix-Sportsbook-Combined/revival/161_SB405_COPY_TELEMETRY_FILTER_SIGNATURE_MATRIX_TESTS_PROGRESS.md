# 161 - SB-405 Scoped Copy Telemetry Filter Signature Matrix Tests

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 95 by adding table-driven filter-key signature normalization tests for empty/partial/full filter combinations.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### Added matrix coverage
Added table-driven assertions for `resolveFilterKeySignature` across:
- no filters (`none`)
- action-only filter
- partial filter set with whitespace-only ignored values
- full filter set with sorted canonical key signature output

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Filter signature normalization now has matrix-grade regression coverage, improving confidence in explicit/applied filter telemetry diagnostics.

## Next
Queue item 96:
- Add table-driven tests for `buildScopedCopyTelemetryContext` matrix (preset-only, explicit-override, no-filters, open-action mode).
