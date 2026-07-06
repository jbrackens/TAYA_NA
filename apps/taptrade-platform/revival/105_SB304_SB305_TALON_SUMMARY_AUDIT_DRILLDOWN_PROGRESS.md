# SB-304/SB-305 Talon Summary->Audit Drilldown Progress

Date: 2026-03-05  
Backlog reference: item 39 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added an explicit drill-down action from Risk Management promo summary to audit logs:
   - new action button in summary filter card: `OPEN_AUDIT_LOGS`.
2. Wired drill-down query propagation contract:
   - source filters in summary route (`userId`, `freebetId`, `oddsBoostId`)
   - target logs query includes:
     - `action=bet.placed`
     - propagated promo dimensions
     - `p=1`
     - `limit=20`.
3. Added test coverage proving query handoff behavior from summary container to logs route.
4. Regenerated locale assets with new summary action copy.

## Key Files

1. Summary drill-down wiring:
   - `talon-backoffice/packages/office/containers/risk-management-summary/index.tsx`
2. Drill-down contract test:
   - `talon-backoffice/packages/office/containers/risk-management-summary/__tests__/risk-management-summary.test.tsx`
3. Translation:
   - `talon-backoffice/packages/office/translations/en/page-risk-management-summary.js`
   - `talon-backoffice/packages/office/public/static/locales/en/page-risk-management-summary.json`

## Validation

1. `cd talon-backoffice/packages/office && yarn bootstrap:locales`
   - pass
2. `cd talon-backoffice/packages/office && yarn test risk-management-summary`
   - pass
3. Regression checks:
   - `cd talon-backoffice/packages/office && yarn test audit-logs`
   - `cd talon-backoffice/packages/office && yarn test logsSlice`
   - pass
4. `cd talon-backoffice/packages/office && npx tsc --noEmit`
   - still blocked by pre-existing unrelated test typing issues:
     - `components/auth/protected/__tests__/protected.test.tsx`
     - `components/auth/session-guard/__tests__/session-guard.test.tsx`
     - `components/markets/lifecycle/settle/__tests__/lifecycle-settle.test.tsx`

## Next

1. Item 40 completed in:
   - `revival/106_TALON_TYPESCRIPT_BLOCKERS_PHASE40_PROGRESS.md`
2. Item 41 completed in:
   - `revival/107_SB404_SB405_TALON_PROVIDER_OPS_COCKPIT_PROGRESS.md`
