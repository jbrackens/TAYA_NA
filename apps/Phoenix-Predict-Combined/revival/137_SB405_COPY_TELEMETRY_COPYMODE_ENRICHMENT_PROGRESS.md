# 137 - SB-405 Scoped Copy Telemetry Copy-Mode Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 71 by enriching scoped-copy telemetry payloads with explicit copy mode context (`clipboard` vs `manualFallback`) and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Added `copyMode` to scoped-copy telemetry detail:
- `clipboard`
- `manualFallback`

### 2) UX event mapping
Mapped copy-mode semantics by flow:
1. `copy_success` -> `clipboard`
2. `retry_success` -> `clipboard`
3. `fallback_unavailable` -> `manualFallback`
4. `fallback_write_failed` -> `manualFallback`
5. `open_action` -> `manualFallback`

### 3) Regression assertions
Expanded tests to assert `copyMode` payload values in:
- scoped copy success (preset and override scenarios)
- fallback unavailable/open action
- retry success
- fallback write failure
- telemetry unit contract payloads

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
Scoped-copy telemetry now clearly distinguishes clipboard-path shares from fallback/manual-share workflows, improving downstream operator UX observability and funnel analysis.

## Next
Queue item 72:
- Add `/logs` scoped-copy telemetry payload enrichment for preset-origin state (`isPresetActive`) with regression assertions.
