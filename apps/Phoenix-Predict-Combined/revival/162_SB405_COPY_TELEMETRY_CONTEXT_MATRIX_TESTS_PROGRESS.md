# 162 - SB-405 Scoped Copy Telemetry Context Matrix Tests

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 96 by adding table-driven matrix coverage for `buildScopedCopyTelemetryContext` across key operational scenarios.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### Added context matrix coverage
Added table-driven context matrix scenarios for:
- preset-only mode
- explicit-override mode
- no-filter mode
- open-action-style mode (`copyButtonLabel=retry`)

Assertions validate key context fields including override breadth/signatures, applied signature, target/action flags, non-empty filter count, and shared pagination/path invariants.

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Context-builder behavior now has explicit scenario matrix coverage, reducing regression risk as scoped-copy telemetry context evolves.

## Next
Queue item 97:
- Add focused assertions for telemetry context matrix URL-derived fields (`scopedQueryKeyCount`, `scopedQueryKeySignature`) per scenario.
