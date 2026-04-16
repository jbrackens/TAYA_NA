# 136 - SB-405 Scoped Copy Telemetry Pagination Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 70 by enriching scoped-copy telemetry payloads with pagination scope context and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Added pagination fields to scoped-copy telemetry payload:
- `page`
- `pageSize`

### 2) UX wiring
Scoped-copy telemetry now emits pagination context from current `/logs` router scope across:
- copy success
- retry success
- fallback unavailable
- fallback write failure
- open action

### 3) Regression assertions
Extended tests to validate pagination values in emitted telemetry details (default `1/20` flow assertions and enriched unit payload expectations).

## Validation
1. Focused telemetry+audit suites:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx lib/telemetry/__tests__/scoped-copy-events.test.ts --passWithNoTests`
- Result: PASS

2. SB-405 focused suite:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --passWithNoTests`
- Result: PASS

3. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry now carries share-scope pagination context, improving downstream analysis for how operators hand off audit windows.

## Next
Queue item 71:
- Add `/logs` scoped-copy telemetry payload enrichment for copy mode (`manualFallback` vs `clipboard`) with regression assertions.
