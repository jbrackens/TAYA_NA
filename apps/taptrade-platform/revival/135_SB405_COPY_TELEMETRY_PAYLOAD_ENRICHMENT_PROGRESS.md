# 135 - SB-405 Scoped Copy Telemetry Payload Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 69 by enriching scoped-copy telemetry payloads with operator-intent filter flags and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Extended scoped-copy telemetry event detail with:
- `hasTargetId`
- `hasActionOverride`

### 2) UX wiring for enriched payload
Propagated enriched context across all scoped-copy events:
1. copy success
2. fallback unavailable
3. fallback write failure
4. retry success
5. open action

### 3) Regression assertions
Added test assertions validating enriched payload values for both:
- preset-only scoped copy (`hasActionOverride=false`)
- explicit override scoped copy (`hasActionOverride=true`, `hasTargetId=true`)

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
Scoped-copy telemetry now captures whether operators are sharing default preset context or explicit override intent, improving downstream triage observability quality.

## Next
Queue item 70:
- Add `/logs` scoped-copy telemetry payload enrichment for pagination scope (`page`, `pageSize`) with regression assertions.
