# SB-404 Talon Settlement Intervention Panel Progress

Date: 2026-03-05  
Backlog reference: item 42 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Extended the Talon Provider Ops cockpit with a dedicated bet settlement intervention panel.
2. Added manual intervention action support over existing admin lifecycle endpoints:
   - `settle`
   - `cancel`
   - `refund`
3. Added operator guardrails:
   - explicit reason required for all interventions
   - winning selection required for `settle`
   - action-specific payload shaping and validation before submit.
4. Added action-specific audit drill-down link wiring from intervention panel to `/logs`.
5. Added contract coverage for intervention validation/payload/query mapping.

## Key Files

1. Provider ops cockpit extension:
   - `talon-backoffice/packages/office/containers/provider-ops/index.tsx`
2. Intervention contract logic:
   - `talon-backoffice/packages/office/containers/provider-ops/contracts.ts`
3. Tests:
   - `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`
   - `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`
4. Translation assets:
   - `talon-backoffice/packages/office/translations/en/page-provider-ops.js`
   - `talon-backoffice/packages/office/public/static/locales/en/page-provider-ops.json`

## Validation

1. `cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts`
   - pass
2. `cd talon-backoffice/packages/office && yarn bootstrap:locales`
   - pass
3. `cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
   - pass

## Follow-up

1. Continue with provider-ops triage UX improvements (item 43): unhealthy-only stream focus and breach badges.
