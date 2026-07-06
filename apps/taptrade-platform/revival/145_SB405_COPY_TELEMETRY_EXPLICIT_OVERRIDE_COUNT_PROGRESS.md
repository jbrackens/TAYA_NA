# 145 - SB-405 Scoped Copy Telemetry Explicit-Override Count Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 79 by enriching scoped-copy telemetry payloads with explicit override breadth (`explicitOverrideCount`) and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Added `explicitOverrideCount` payload field to capture how many explicit filter overrides are present in the current scoped URL context.

### 2) Runtime mapping
Mapped override breadth from trimmed explicit filter inputs (`action`, `actorId`, `targetId`, `userId`, `freebetId`, `oddsBoostId`) and propagated it through copy/fallback/retry/open telemetry emission paths.

### 3) Regression assertions
Expanded telemetry and audit-container tests to assert `explicitOverrideCount` across:
- preset-only scoped copy (0 overrides)
- explicit action+target override copy (2 overrides)
- fallback/retry/open preset contexts (0 overrides)
- write-failure path with single explicit override (1 override)

## Validation
1. Focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry now quantifies explicit override breadth, giving operators and analytics clearer visibility into how much manual scope customization is used during handoff.

## Next
Queue item 80:
- Add `/logs` scoped-copy telemetry payload enrichment for explicit override key signature (`explicitOverrideKeySignature`) with regression assertions.
