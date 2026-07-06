# 121 - SB-405 Audit Preset-Origin UX

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 55 by adding preset-origin visibility and reset controls to Talon `/logs`, so operators can clearly identify inherited Provider Ops context and clear preset-driven filters in one click.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/translations/en/page-audit-logs.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-audit-logs.json`

### 1) Active preset context banner
Added an informational banner when `preset` is present in query:
1. Shows active preset label (translated preset name).
2. Indicates inherited context is active.
3. Uses existing preset key resolution for consistency with chip behavior.

### 2) One-click preset clear
Added `Clear preset` action that:
1. Removes `preset` from router query.
2. Retains only explicit query filters (drops inherited defaults).
3. Resets page to `p=1` with existing `limit`.

### 3) Query hydration cleanup
Refactored audit filter hydration into:
1. `explicitFilters` (raw query values)
2. `presetFilters` (preset defaults)
3. `appliedFilters` (explicit-overrides-preset merge)

This preserves manual override precedence while making preset clearing deterministic.

## Validation
1. Locale generation:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn bootstrap:locales`
- Result: PASS

2. Focused Talon suites:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx components/audit-logs/utils/__tests__/resolvers.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts --passWithNoTests`
- Result: PASS

3. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Operators now get explicit visibility of inherited Provider Ops audit presets and can clear that context safely without losing explicit ad-hoc filter intent.

## Next
Queue item 56:
- Add provider-ops acknowledgement lifecycle deep-link UI test coverage for all preset variants (`acknowledged/reassigned/resolved/reopened`) to prevent query contract regressions.
