# 127 - SB-405 Scoped URL Copy Fallback UX

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 61 by implementing a real fallback UX for `/logs` scoped URL sharing when Clipboard API support is unavailable.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/translations/en/page-audit-logs.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-audit-logs.json`

### 1) Manual-copy fallback surfaced in `/logs`
When clipboard write support is unavailable, scoped URL copy now renders a warning fallback with a read-only input containing the fully scoped URL.

### 2) Shared URL construction helper
Added a dedicated scoped URL builder to ensure consistent query serialization between copy-success and fallback paths.

### 3) Regression coverage
Expanded `audit-logs` tests to assert fallback message and scoped URL input behavior when `navigator.clipboard` is not present.

## Validation
1. Locales generation:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn bootstrap:locales`
- Result: PASS

2. Focused test suite:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx --passWithNoTests`
- Result: PASS

3. SB-405 focused suite:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts --passWithNoTests`
- Result: PASS

4. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped URL sharing now remains usable in non-clipboard environments, reducing operator handoff failure risk during incident triage.

## Next
Queue item 62:
- Harden `/logs` scoped-copy fallback behavior for clipboard write failures and stale fallback state reset across scope changes.
