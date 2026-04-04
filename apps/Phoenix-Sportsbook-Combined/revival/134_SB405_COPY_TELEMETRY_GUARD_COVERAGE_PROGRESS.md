# 134 - SB-405 Scoped Copy Telemetry Guard Coverage

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 68 by adding unit-level guard coverage for scoped-copy telemetry emission under missing/throwing `window.dispatchEvent` conditions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry event contract unit coverage
Added emitter tests validating:
1. success-path custom event dispatch and detail payload.
2. safe no-op behavior when `window.dispatchEvent` is unavailable.
3. non-blocking behavior when dispatch throws.

### 2) Global state restoration
Tests restore overridden `window.dispatchEvent` behavior to prevent cross-suite pollution.

## Validation
1. Telemetry unit suite:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath lib/telemetry/__tests__/scoped-copy-events.test.ts --passWithNoTests`
- Result: PASS

2. SB-405 focused suite:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --passWithNoTests`
- Result: PASS

3. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry now has explicit guard-path reliability coverage, ensuring instrumentation cannot destabilize operator workflows under constrained runtimes.

## Next
Queue item 69:
- Add `/logs` scoped-copy telemetry payload enrichment (`hasTargetId`, `hasActionOverride`) with regression assertions.
