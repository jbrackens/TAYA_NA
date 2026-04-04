# SB-404/SB-405 Talon Provider Ops Cockpit Progress

Date: 2026-03-05  
Backlog reference: item 41 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added a new Talon Risk Management surface: `Provider Ops`.
2. Implemented provider-ops cockpit container with:
   - feed health refresh action (`admin/feed-health`)
   - runtime/stream/error KPI cards
   - threshold and cancel metrics cards
   - provider stream status table with adapter filtering
   - manual provider cancel form (`admin/provider/cancel`)
   - deep-link to provider cancel audit logs.
3. Added typed normalization/contracts layer for feed-health and cancel request payloads.
4. Added route/menu integration under Risk Management:
   - new menu entry `RISK_MANAGEMENT_PROVIDER_OPS`
   - new page `/risk-management/provider-ops`.
5. Added tests for provider-ops contracts and container behavior (render + audit deep-link).

## Key Files

1. Provider ops container/contracts/tests:
   - `talon-backoffice/packages/office/containers/provider-ops/index.tsx`
   - `talon-backoffice/packages/office/containers/provider-ops/contracts.ts`
   - `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`
   - `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`
2. Routing/menu:
   - `talon-backoffice/packages/office/pages/risk-management/provider-ops/index.tsx`
   - `talon-backoffice/packages/office/providers/menu/structure.ts`
   - `talon-backoffice/packages/office/providers/menu/defaults.ts`
3. Translation assets:
   - `talon-backoffice/packages/office/translations/en/page-provider-ops.js`
   - `talon-backoffice/packages/office/translations/en/sidebar.js`
   - generated locale JSON:
     - `talon-backoffice/packages/office/public/static/locales/en/page-provider-ops.json`
     - `talon-backoffice/packages/office/public/static/locales/en/sidebar.json`

## Validation

1. `cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts`
   - pass
2. `cd talon-backoffice/packages/office && yarn bootstrap:locales`
   - pass
3. `cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
   - pass

## Follow-up

1. Item 42 completed in:
   - `revival/108_SB404_TALON_SETTLEMENT_INTERVENTION_PANEL_PROGRESS.md`
2. Continue with item 43:
   - unhealthy-only stream focus and threshold-breach badges in provider-ops cockpit.
