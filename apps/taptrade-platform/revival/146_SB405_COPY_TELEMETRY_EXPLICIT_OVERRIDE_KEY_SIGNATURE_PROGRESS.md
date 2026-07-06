# 146 - SB-405 Scoped Copy Telemetry Explicit-Override Key Signature Enrichment

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 80 by enriching scoped-copy telemetry payloads with explicit override key signature (`explicitOverrideKeySignature`) and adding regression assertions.

## Implementation

Updated:
- `talon-backoffice/packages/office/lib/telemetry/scoped-copy-events.ts`
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/lib/telemetry/__tests__/scoped-copy-events.test.ts`

### 1) Telemetry detail enrichment
Added `explicitOverrideKeySignature` payload field with sorted, key-only signature for explicitly overridden filters.

### 2) Runtime mapping
Added explicit override key-signature resolver derived from non-empty explicit filters (`action`, `actorId`, `targetId`, `userId`, `freebetId`, `oddsBoostId`), returning:
- `none` for preset-only/no explicit overrides
- sorted pipe-delimited keys when overrides are present

### 3) Regression assertions
Expanded telemetry and audit-container tests to assert `explicitOverrideKeySignature` across:
- preset-only scoped copy (`none`)
- explicit action+target override copy (`action|targetId`)
- fallback/retry/open preset flows (`none`)
- write-failure flow with single explicit action override (`action`)

## Validation
1. Focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry now captures which explicit filters were manually overridden, improving diagnostics for operator handoff patterns and preset override behavior.

## Next
Queue item 81:
- Add `/logs` scoped-copy telemetry payload enrichment for applied-filter key signature (`appliedFilterKeySignature`) with regression assertions.
