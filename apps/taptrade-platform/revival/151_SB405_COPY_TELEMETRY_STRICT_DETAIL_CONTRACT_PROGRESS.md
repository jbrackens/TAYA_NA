# 151 - SB-405 Scoped Copy Telemetry Strict Detail Contract Assertions

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 85 by adding strict scoped-copy telemetry detail contract assertions that enforce required key-set parity for emitted events.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`

### 1) Canonical key-set export
Added `SCOPED_COPY_EVENT_DETAIL_KEYS` constant in telemetry contract module to define the required event-detail key set.

### 2) Emitter-level contract guard assertions
Updated telemetry emitter tests to assert emitted detail keys are an exact parity match with `SCOPED_COPY_EVENT_DETAIL_KEYS`.

### 3) Runtime-flow contract guard assertions
Updated audit container telemetry-flow tests to assert key-set parity for all asserted event variants:
- `copy_success`
- `fallback_unavailable`
- `open_action`
- `retry_success`
- `fallback_write_failed`

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry now has explicit schema-drift protection in tests, reducing risk of silent payload regressions as fields evolve.

## Next
Queue item 86:
- Add shared scoped-copy telemetry detail fixture builder for test setup reuse across emitter and container suites.
