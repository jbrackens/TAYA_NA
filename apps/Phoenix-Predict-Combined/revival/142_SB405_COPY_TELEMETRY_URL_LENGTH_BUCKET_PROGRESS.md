# 142 - SB-405 Scoped Copy Telemetry URL-Length Bucket Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 76 by enriching scoped-copy telemetry payloads with scoped URL length bucketing (`scopedUrlLengthBucket`) and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Added `scopedUrlLengthBucket` payload field with normalized values:
- `short`
- `medium`
- `long`

### 2) Runtime mapping
Added URL-length bucket resolver in the audit logs container and mapped scoped URLs into deterministic length buckets before event emission.

### 3) Regression assertions
Expanded telemetry and audit container tests to assert `scopedUrlLengthBucket` across:
- copy success
- fallback unavailable
- fallback write failure
- retry success
- fallback open-action telemetry

## Validation
1. Focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry now captures normalized URL-size complexity, enabling downstream analysis of sharing behavior against URL scope breadth.

## Next
Queue item 77:
- Add `/logs` scoped-copy telemetry payload enrichment for scoped query key count (`scopedQueryKeyCount`) with regression assertions.
