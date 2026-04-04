# 128 - SB-405 Scoped URL Copy Fallback Hardening

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 62 by hardening `/logs` scoped URL copy fallback handling for clipboard write rejection and stale fallback-state reset.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`

### 1) Clipboard write rejection fallback
`copyScopedUrl` now catches clipboard write errors and falls back to the same manual-copy warning/input path used for clipboard-unavailable environments.

### 2) Stale fallback-state reset
Added scope-change reset behavior so fallback/copy state clears when `/logs` query scope changes (preset/filter/page/limit), preventing stale URL display.

### 3) Coverage for failure + reset path
Added/expanded tests to verify:
1. fallback UI appears when `navigator.clipboard.writeText` rejects.
2. fallback UI clears when route query scope changes after fallback activation.
3. failure-path logging is asserted without polluting test output.

## Validation
1. Focused test suite:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx --passWithNoTests`
- Result: PASS

2. SB-405 focused suite:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts --passWithNoTests`
- Result: PASS

3. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy UX is now resilient to both capability absence and runtime clipboard failures, while avoiding stale fallback context after operator scope changes.

## Next
Queue item 63:
- Add `/logs` scoped-copy UX polish with explicit retry behavior after fallback/manual-copy mode.
