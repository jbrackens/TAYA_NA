# 130 - SB-405 Scoped URL Copy Fallback Accessibility Hardening

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 64 by hardening accessibility behavior for `/logs` manual-copy fallback URL handling.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`

### 1) Auto-focus and auto-select fallback URL field
When fallback mode activates, the scoped URL field now receives focus and selects all text to streamline keyboard/manual copy workflows.

### 2) Focus selection reinforcement
Added `onFocus` select-all behavior so operators re-focusing the field continue to get full-text selection without drag/select friction.

### 3) Regression coverage
Extended fallback tests to assert:
1. fallback input becomes active element.
2. full URL text is selected (selection range spans entire value).

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
Fallback/manual-copy mode is now keyboard-friendly and faster for incident handoff, with regression checks preventing accessibility regressions.

## Next
Queue item 65:
- Add `/logs` scoped-copy fallback secondary action (open `/logs` URL in new tab/window) with guarded behavior and test coverage.
