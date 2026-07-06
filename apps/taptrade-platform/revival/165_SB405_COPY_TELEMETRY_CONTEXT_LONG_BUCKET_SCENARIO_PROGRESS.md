# 165 - SB-405 Scoped Copy Telemetry Context Long-Bucket Scenario Coverage

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 99 by extending context-matrix coverage with an explicit long-URL scenario.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### Long-bucket scenario
Added a new `buildScopedCopyTelemetryContext` matrix case that appends a long `context` query value (`"x".repeat(180)`) to force long URL classification and validate:
- `scopedUrlLengthBucket = "long"`
- `scopedQueryKeyCount = 6`
- `scopedQueryKeySignature = "action|context|limit|p|preset|targetId"`

This closes the remaining gap where context-matrix coverage previously exercised only short/medium buckets.

## Validation
1. Focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && yarn test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Context-builder telemetry tests now cover all URL-length bucket classifications (`short`, `medium`, `long`) in scenario-driven matrix assertions.

## Next
No remaining open items in `revival/42_BACKLOG_EXECUTION_PHASES.md`.
