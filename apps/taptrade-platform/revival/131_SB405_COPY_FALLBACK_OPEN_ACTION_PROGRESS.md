# 131 - SB-405 Scoped URL Copy Fallback Open Action

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 65 by adding a secondary fallback action that opens the scoped `/logs` URL directly from manual-copy mode.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/translations/en/page-audit-logs.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-audit-logs.json`

### 1) Guarded open action
Added `openScopedUrl` helper that opens fallback URL in a new tab with `noopener,noreferrer` guards and no-op behavior for unavailable browser APIs.

### 2) Fallback action control
Added `Open scoped URL` action button under manual-copy fallback URL field in `/logs` preset context.

### 3) Regression coverage
Extended fallback tests to assert secondary action invokes `window.open` with expected target and security flags.

## Validation
1. Locales generation:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn bootstrap:locales`
- Result: PASS

2. Focused audit suite:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx --passWithNoTests`
- Result: PASS

3. SB-405 focused suite:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts --passWithNoTests`
- Result: PASS

4. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Fallback mode now supports both manual copy and one-click open workflows, improving operator handoff ergonomics when clipboard behavior is constrained.

## Next
Queue item 66:
- Add `/logs` scoped-copy fallback secondary action guard coverage for missing `window.open` environments.
