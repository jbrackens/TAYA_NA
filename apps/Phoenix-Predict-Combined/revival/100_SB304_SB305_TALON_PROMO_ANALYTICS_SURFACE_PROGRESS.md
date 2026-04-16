# SB-304/SB-305 Talon Promo Analytics Surface Progress

Date: 2026-03-05  
Backlog reference: item 34 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added a new Talon risk-management summary surface wired to gateway promo analytics:
   - page route: `/risk-management/summary`
   - endpoint consumed: `GET /admin/promotions/usage` (compatible with `/api/v1/admin/promotions/usage` backend registration).
2. Implemented operator filter controls for promo analytics:
   - `userId`
   - `freebetId`
   - `oddsBoostId`
   - `from` / `to` (RFC3339 inputs)
   - `breakdownLimit`.
3. Added dashboard metrics for promo usage totals:
   - total bets/stake
   - freebet and odds-boost usage counts
   - combined usage, freebet-applied totals, boosted-stake totals
   - unique users/freebets/odds-boosts.
4. Added freebet and odds-boost breakdown tables in the same screen.
5. Enabled Risk Management sidebar summary entry and changed `/risk-management` redirect target from markets to summary.
6. Added request/response contract helpers and tests for:
   - query parsing defaults
   - API query construction
   - payload normalization safety.

## Key Files

1. Talon UI implementation:
   - `talon-backoffice/packages/office/pages/risk-management/summary/index.tsx`
   - `talon-backoffice/packages/office/containers/risk-management-summary/index.tsx`
   - `talon-backoffice/packages/office/containers/risk-management-summary/contracts.ts`
   - `talon-backoffice/packages/office/providers/menu/defaults.ts`
   - `talon-backoffice/packages/office/pages/risk-management/index.tsx`
2. Tests:
   - `talon-backoffice/packages/office/containers/risk-management-summary/__tests__/contracts.test.ts`
   - `talon-backoffice/packages/office/containers/risk-management-summary/__tests__/risk-management-summary.test.tsx`
3. Locales:
   - `talon-backoffice/packages/office/translations/en/page-risk-management-summary.js`
   - `talon-backoffice/packages/office/public/static/locales/en/page-risk-management-summary.json`

## Validation

1. `cd talon-backoffice/packages/office && yarn bootstrap:locales`
   - pass
2. `cd talon-backoffice/packages/office && yarn test risk-management-summary`
   - pass
3. `cd talon-backoffice/packages/office && npx tsc --noEmit`
   - fails only on pre-existing unrelated test typing issues in:
     - `components/auth/protected/__tests__/protected.test.tsx`
     - `components/auth/session-guard/__tests__/session-guard.test.tsx`
     - `components/markets/lifecycle/settle/__tests__/lifecycle-settle.test.tsx`

## Remaining

1. Backlog item 35 is now completed in:
   - `revival/101_SB304_SB305_TALON_AUDIT_PROMO_FILTERS_PROGRESS.md`.
2. Continue with backlog item 36:
   - expand audit-log action/category resolver mapping for newer gateway admin events.
