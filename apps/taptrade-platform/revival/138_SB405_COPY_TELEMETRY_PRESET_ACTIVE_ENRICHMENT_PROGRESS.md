# 138 - SB-405 Scoped Copy Telemetry Preset-Active Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 72 by enriching scoped-copy telemetry payloads with preset-origin state (`isPresetActive`) and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Added `isPresetActive` boolean to scoped-copy telemetry details.

### 2) Event payload mapping
`/logs` scoped-copy telemetry now includes preset-state context across copy/fallback/retry/open events.

### 3) Regression assertions
Extended tests to assert `isPresetActive` values in:
- copy success scenarios
- fallback unavailable + open action
- retry success
- fallback write failure
- telemetry unit payload contract

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
Scoped-copy telemetry now captures whether shared audit context was preset-derived, improving traceability for Provider Ops drill-down usage patterns.

## Next
Queue item 73:
- Add `/logs` scoped-copy telemetry payload enrichment for fallback-open availability (`canOpenScopedUrl`) with regression assertions.
