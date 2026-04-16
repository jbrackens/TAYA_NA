# 152 - SB-405 Scoped Copy Telemetry Detail Fixture Reuse

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 86 by introducing a shared scoped-copy telemetry detail fixture builder and reusing it across emitter and container test suites.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/test-fixtures/scoped-copy-event-detail.ts` (new)
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`

### 1) Shared fixture builder
Added `createScopedCopyEventDetail(overrides)` and canonical fixture key list in a shared test-fixture module.

### 2) Emitter suite reuse
Refactored telemetry emitter tests to use `createScopedCopyEventDetail` for setup and key-parity consistency.

### 3) Container suite reuse
Updated audit container tests to derive expected telemetry detail key-set from shared fixture builder, keeping parity checks aligned across both suites.

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry test setup is now more consistent and maintainable, with shared fixture definitions reused across emitter and runtime flow suites.

## Next
Queue item 87:
- Add scoped-copy telemetry utility edge-case tests for empty/fragment-only query strings to harden signature/count behavior.
