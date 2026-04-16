# SB-304/SB-305 Talon Audit Promo Filters Progress

Date: 2026-03-05  
Backlog reference: item 35 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Extended Talon audit-log query wiring to include promo dimensions:
   - `userId`
   - `freebetId`
   - `oddsBoostId`.
2. Added operator filter controls to audit logs screen with URL-query persistence:
   - action
   - actorId
   - userId
   - freebetId
   - oddsBoostId.
3. Updated table columns to surface first-class promo dimensions returned by gateway audit entries:
   - user
   - freebet
   - odds boost.
4. Added focused container tests for:
   - API request query shape including promo filters.
   - filter-apply router query updates.
5. Updated locale resources for the new filter and column labels.

## Key Files

1. UI wiring:
   - `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
2. Tests:
   - `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
3. Translations:
   - `talon-backoffice/packages/office/translations/en/page-audit-logs.js`
   - `talon-backoffice/packages/office/public/static/locales/en/page-audit-logs.json`

## Validation

1. `cd talon-backoffice/packages/office && yarn bootstrap:locales`
   - pass
2. `cd talon-backoffice/packages/office && yarn test audit-logs`
   - pass
3. Regression recheck:
   - `cd talon-backoffice/packages/office && yarn test risk-management-summary`
   - pass
4. `cd talon-backoffice/packages/office && npx tsc --noEmit`
   - fails only on pre-existing unrelated test typing issues in:
     - `components/auth/protected/__tests__/protected.test.tsx`
     - `components/auth/session-guard/__tests__/session-guard.test.tsx`
     - `components/markets/lifecycle/settle/__tests__/lifecycle-settle.test.tsx`

## Remaining

1. Backlog item 36 is now completed in:
   - `revival/102_SB304_SB305_TALON_AUDIT_LABEL_RESOLVER_PROGRESS.md`.
2. Continue with backlog item 37:
   - align Talon audit-log DTO typing with gateway payload shape and remove legacy assumptions.
