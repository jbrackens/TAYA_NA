# 126 - SB-405 Scoped URL Copy Override Coverage

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 60 by adding `/logs` copy-workflow test coverage for manual override scenarios where a preset is active but explicit filter values are also present.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`

### 1) Preset + explicit override copy test
Added test coverage ensuring copied scoped URLs preserve operator intent when:
1. `preset` is active.
2. Explicit `action` and `targetId` overrides are present in query.

The test validates clipboard URL includes both preset context and explicit override filters.

## Validation
1. Focused suites:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts --passWithNoTests`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped URL copy now has regression coverage for the most error-prone sharing case (preset active with explicit manual override), reducing risk of sharing unintended audit context.

## Next
Queue item 61:
- Add `/logs` copy-workflow fallback UX test coverage for clipboard-unavailable environments.
