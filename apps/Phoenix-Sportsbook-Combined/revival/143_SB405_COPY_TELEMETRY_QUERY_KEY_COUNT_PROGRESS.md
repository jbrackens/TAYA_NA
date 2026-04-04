# 143 - SB-405 Scoped Copy Telemetry Query-Key Count Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 77 by enriching scoped-copy telemetry payloads with scoped query-key count (`scopedQueryKeyCount`) and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Added `scopedQueryKeyCount` payload field as integer query cardinality for scoped URL context.

### 2) Runtime mapping
Added deterministic query-key counting resolver in the audit logs container, and propagated count across:
- copy success
- fallback unavailable
- fallback write failure
- retry success
- fallback open-action telemetry

### 3) Regression assertions
Expanded telemetry and audit-container tests to assert `scopedQueryKeyCount` aligns with actual emitted scoped URLs in all copy/fallback/retry/open paths.

## Validation
1. Focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry now captures query-key cardinality directly, improving operator-behavior analysis for broad vs focused audit scopes.

## Next
Queue item 78:
- Add `/logs` scoped-copy telemetry payload enrichment for scoped query key signature (`scopedQueryKeySignature`) with regression assertions.
