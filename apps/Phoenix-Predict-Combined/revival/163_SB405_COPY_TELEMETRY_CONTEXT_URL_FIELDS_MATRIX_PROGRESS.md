# 163 - SB-405 Scoped Copy Telemetry Context URL-Field Matrix Assertions

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 97 by tightening context-matrix assertions for URL-derived telemetry fields per scenario.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### Matrix assertion hardening
Extended `buildScopedCopyTelemetryContext` table-driven test cases with explicit expected values for:
- `scopedQueryKeyCount`
- `scopedQueryKeySignature`

Scenarios now verify URL-derived telemetry context deterministically across:
- preset-only
- explicit override
- no-filter
- open-action-style context

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Context matrix tests now assert URL-derived telemetry values explicitly rather than loosely, increasing regression detection quality.

## Next
Queue item 98:
- Add focused assertions for telemetry context matrix URL-length bucket expectations per scenario.
