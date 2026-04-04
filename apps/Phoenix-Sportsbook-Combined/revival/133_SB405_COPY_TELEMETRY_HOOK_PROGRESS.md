# 133 - SB-405 Scoped URL Copy Telemetry Hook

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 67 by introducing non-blocking scoped-copy telemetry emission for `/logs` copy/fallback/retry/open workflows.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`

### 1) Telemetry event-emitter contract
Added shared telemetry utility with:
- event namespace: `phoenix.office.auditLogs.scopedCopy`
- event variants: `copy_success`, `fallback_unavailable`, `fallback_write_failed`, `retry_success`, `open_action`
- non-blocking dispatch semantics (guarded by browser capability checks and `try/catch`)

### 2) UX event wiring
Integrated telemetry emits into `/logs` scoped-copy paths:
1. Clipboard unavailable fallback.
2. Clipboard write failure fallback.
3. Initial copy success.
4. Retry success from fallback mode.
5. Fallback open-action click.

### 3) Regression coverage
Expanded audit container tests to assert telemetry event variants are emitted on corresponding UX paths.

## Validation
1. Focused audit suite:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx --passWithNoTests`
- Result: PASS

2. SB-405 focused suite:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts --passWithNoTests`
- Result: PASS

3. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Provider Ops scoped audit handoff UX now emits structured, non-blocking telemetry signals that can be consumed by future observability pipelines without risking operator workflow stability.

## Next
Queue item 68:
- Add unit-level telemetry emitter guard coverage for environments without `window.dispatchEvent`.
