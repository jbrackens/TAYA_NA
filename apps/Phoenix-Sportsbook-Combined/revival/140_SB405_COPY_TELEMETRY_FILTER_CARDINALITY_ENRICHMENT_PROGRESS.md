# 140 - SB-405 Scoped Copy Telemetry Filter Cardinality Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 74 by enriching scoped-copy telemetry payloads with filter cardinality context (`nonEmptyFilterCount`) and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Added `nonEmptyFilterCount` payload field to represent current scoped filter cardinality.

### 2) Runtime mapping
Computed cardinality from active `appliedFilters` and propagated across copy/fallback/retry/open telemetry events.

### 3) Regression assertions
Extended tests to assert expected filter count values in:
- copy success (preset + override scenarios)
- fallback unavailable/open action
- retry success
- fallback write failure
- constrained open-capability fallback path

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
Scoped-copy telemetry now captures breadth of active audit filters, improving visibility into how narrowly or broadly operators share investigation context.

## Next
Queue item 75:
- Add `/logs` scoped-copy telemetry payload enrichment for source action (`copyButtonLabel`: copy/retry) with regression assertions.
