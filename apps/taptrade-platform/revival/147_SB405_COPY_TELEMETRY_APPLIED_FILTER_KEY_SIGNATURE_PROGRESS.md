# 147 - SB-405 Scoped Copy Telemetry Applied-Filter Key Signature Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 81 by enriching scoped-copy telemetry payloads with applied-filter key signature (`appliedFilterKeySignature`) and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Added `appliedFilterKeySignature` payload field to capture the effective filter-key shape after preset + explicit override resolution.

### 2) Runtime mapping
Generalized filter-key signature resolver and now emit:
- `explicitOverrideKeySignature` from explicit filters
- `appliedFilterKeySignature` from resolved/applied filters

### 3) Regression assertions
Expanded telemetry and audit-container tests to assert `appliedFilterKeySignature` across copy/fallback/retry/open paths, including override and write-failure scenarios.

## Validation
1. Focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry now captures both explicit override key shape and effective applied filter key shape, improving diagnostics for preset override behavior and handoff intent.

## Next
Queue item 82:
- Refactor `/logs` scoped-copy telemetry payload construction into a shared helper to remove duplicate mapping logic between copy and open-action flows.
