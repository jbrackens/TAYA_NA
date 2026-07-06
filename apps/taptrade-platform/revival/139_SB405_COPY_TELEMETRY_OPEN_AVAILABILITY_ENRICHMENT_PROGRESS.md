# 139 - SB-405 Scoped Copy Telemetry Open-Availability Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 73 by enriching scoped-copy telemetry payloads with fallback-open capability context (`canOpenScopedUrl`) and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Added `canOpenScopedUrl` boolean to telemetry payload.

### 2) Runtime capability mapping
Wired capability context for all scoped-copy telemetry events based on `window.open` availability, with `open_action` explicitly emitted only on guarded open path.

### 3) Regression assertions
Extended tests to assert:
- `canOpenScopedUrl=true` for normal browser-capable copy/fallback/retry/open flows.
- `canOpenScopedUrl=false` on fallback event when `window.open` is unavailable.

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
Scoped-copy telemetry now captures whether fallback open-action capability was available, enabling clearer diagnostics for environment-constrained operator sessions.

## Next
Queue item 74:
- Add `/logs` scoped-copy telemetry payload enrichment for filter cardinality (`nonEmptyFilterCount`) with regression assertions.
