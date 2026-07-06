# 123 - SB-405 Preset-Aware Scoped URL Copy

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 57 by adding a preset-aware “Copy scoped URL” action in Talon `/logs` so operators can share exact audit context during incident handoff.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/translations/en/page-audit-logs.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-audit-logs.json`

### 1) Scoped URL copy action
Added a preset-banner action button that:
1. Serializes current router query (including preset/action/target/pagination).
2. Builds absolute `/logs` URL.
3. Copies URL through `navigator.clipboard.writeText`.
4. Shows temporary copied state (`URL copied`) for operator confirmation.

### 2) Preset banner action group
Expanded active preset banner controls to include:
1. `Copy scoped URL`
2. `Clear preset`

This supports both handoff and local context reset from the same origin indicator.

### 3) Test coverage
Added audit container test verifying:
1. Copy action invokes clipboard write once.
2. Copied URL includes expected preset/pagination query params.

## Validation
1. Locale generation:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn bootstrap:locales`
- Result: PASS

2. Focused suites:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts --passWithNoTests`
- Result: PASS

3. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Operators can now share exact, preset-aware audit scopes directly from `/logs`, improving cross-operator incident handoff speed and reducing filter reconstruction errors.

## Next
Queue item 58:
- Add provider-ops stale acknowledgement audit CTA UI coverage to assert preset + target handoff for warning/critical rows in table interaction tests.
