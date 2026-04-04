# SB-304/SB-305 Promo Surfaces Frontend Integration Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 26 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added sportsbook frontend API helpers for promo endpoints:
   - freebets:
     - `GET /api/v1/freebets?userId={id}[&status=...]`
     - `GET /api/v1/freebets/{freebetId}`
   - odds boosts:
     - `GET /api/v1/odds-boosts?userId={id}[&status=...]`
     - `GET /api/v1/odds-boosts/{oddsBoostId}`
2. Added dedicated API helper tests for freebet and odds-boost path/hook wiring.
3. Extended contract fixture coverage:
   - added freebets and odds-boosts list fixtures
   - validated new response-shape guards against valid and malformed payloads.
4. Wired sportsbook betslip summary flow to consume promo availability:
   - reads active freebet count and available odds-boost count for current user
   - surfaces counts in betslip summary block.
5. Wired sportsbook account page flow to consume promo availability:
   - displays active freebet count
   - displays available odds-boost count
   - shows next promo expiry hint and remaining freebet cents summary.
6. Added translation keys for new account and betslip promo labels.

## Key Files

1. API helpers:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/freebets-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/odds-boost-service.ts`
2. API helper tests:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/freebets-service.test.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/odds-boost-service.test.ts`
3. Response-shape fixtures/tests:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/fixtures/freebets-page.json`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/fixtures/odds-boosts-page.json`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/response-shapes.test.ts`
4. Sportsbook UI surfaces:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/summary/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/account/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/account/index.styled.ts`
5. i18n additions:
   - `phoenix-frontend-brand-viegg/packages/app-core/translations/en/betslip.js`
   - `phoenix-frontend-brand-viegg/packages/app-core/translations/en/account.js`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/response-shapes.test.ts services/api/__tests__/match-tracker-service.test.ts services/api/__tests__/stats-center-service.test.ts services/api/__tests__/freebets-service.test.ts services/api/__tests__/odds-boost-service.test.ts --passWithNoTests`
   - pass
2. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath components/layout/betslip/__tests__/betslice.test.tsx --passWithNoTests`
   - pass

## Remaining

1. Promotional lifecycle execution is still read-only in sportsbook UI:
   - no sportsbook accept/apply interaction for odds boosts/freebet selection at placement time yet.
2. Continue with queue item 27:
   - start SB-008/SB-306 runtime integration-mode and widgetized module foundation.
