# 110 - SB-405 Talon Provider Ops Risk Ordering and Triage Counters

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 44 by adding risk-prioritized stream triage and risk-summary counters to Talon Provider Ops.

## Implementation

### 1) Risk contracts and helpers
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/contracts.ts`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`

Added:
1. `computeStreamRiskScore(stream, thresholds)` for deterministic risk ranking.
2. `sortStreamsByRisk(streams, thresholds)` for descending risk ordering.
3. `computeStreamRiskSummary(streams, thresholds)` for breach/unhealthy aggregate counters.
4. `StreamRiskSummary` type.

Contract tests now cover:
- risk ordering precedence (`error` stream ranks above degraded/healthy),
- computed summary totals for lag/gap/duplicate/error + healthy/unhealthy counts.

### 2) Provider Ops UI risk triage
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/index.tsx`

Changes:
1. Stream table now uses risk-sorted data source.
2. Added `HEADER_RISK_SCORE` table column.
3. Added `TRIAGE_SUMMARY_TITLE` card with counters:
   - unhealthy
   - healthy
   - lag breaches
   - gap breaches
   - duplicate breaches
   - error breaches

### 3) Translation coverage
Updated:
- `talon-backoffice/packages/office/translations/en/page-provider-ops.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-provider-ops.json`

Added keys:
- `HEADER_RISK_SCORE`
- `TRIAGE_SUMMARY_TITLE`
- `TRIAGE_UNHEALTHY`
- `TRIAGE_HEALTHY`
- `TRIAGE_LAG`
- `TRIAGE_GAP`
- `TRIAGE_DUPLICATE`
- `TRIAGE_ERROR`

### 4) Container behavior tests
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

Assertions extended for:
- triage summary presence,
- unhealthy toggle behavior retained under new sorting/counter logic.

## Validation
Executed with Node 20 active (`nvm use 20`):

1. Provider Ops tests:
- `cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts --passWithNoTests`
- Result: PASS

2. Locale generation:
- `cd talon-backoffice && yarn bootstrap:locales`
- Result: PASS

3. TypeScript check:
- `cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Provider Ops now surfaces the highest-risk stream issues first and gives operators immediate aggregate signal on breach classes, improving incident triage speed.

## Next
Backlog item 45:
- Add stream-row quick actions to prefill intervention/cancel workflows and jump to scoped audit trails from highest-risk entries.
