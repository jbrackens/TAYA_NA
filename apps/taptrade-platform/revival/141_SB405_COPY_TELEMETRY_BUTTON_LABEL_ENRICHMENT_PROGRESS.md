# 141 - SB-405 Scoped Copy Telemetry Button-Label Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 75 by enriching scoped-copy telemetry payloads with source-action context (`copyButtonLabel`) and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Added `copyButtonLabel` payload field:
- `copy`
- `retry`

### 2) Runtime mapping
Mapped button-label context from scoped-copy state:
1. first-attempt copy paths emit `copy`.
2. retry-button paths emit `retry`.
3. fallback open-action telemetry carries `retry` to reflect active fallback mode context.

### 3) Regression assertions
Expanded tests to assert `copyButtonLabel` values in:
- copy success (preset and override)
- fallback unavailable/open action
- retry success
- fallback write failure
- constrained `window.open` fallback scenario

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
Scoped-copy telemetry now captures whether operators initiated first-attempt copy or retry flow, improving behavioral analysis of fallback friction.

## Next
Queue item 76:
- Add `/logs` scoped-copy telemetry payload enrichment for scoped URL length bucket (`scopedUrlLengthBucket`) with regression assertions.
