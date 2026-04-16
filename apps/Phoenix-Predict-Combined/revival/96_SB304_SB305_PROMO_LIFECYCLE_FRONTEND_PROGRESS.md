# SB-304/SB-305 Promo Lifecycle Frontend Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 30 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added sportsbook odds-boost accept endpoint wiring in frontend API layer:
   - added `oddsBoostAcceptPath`
   - added `useAcceptOddsBoostApi` hook shape for canonical `POST /api/v1/odds-boosts/{id}/accept`.
2. Extended frontend contract types for promo lifecycle actions:
   - `OddsBoostAcceptRequest`
   - optional promo attachment fields on placement payload (`freebetId`, `oddsBoostId`).
3. Implemented betslip promo interaction state machine:
   - fetch and cache active freebets and available odds boosts
   - apply/remove freebet selection in betslip summary
   - accept/remove odds boost from betslip summary (with request-id + user binding)
   - reset applied promo state when betslip clears or promotions become invalid.
4. Wired applied promo state into placement/precheck payload path:
   - boosted odds are used in precheck/placement for matching market+selection
   - selected freebet/odds-boost IDs are attached to placement payload as promo metadata.
5. Added summary-level promo action controls and labels:
   - apply/remove freebet
   - apply/remove odds boost
   - in-flight odds-boost apply state feedback.
6. Added/updated tests for API endpoint wiring and summary promo interactions.

## Key Files

1. API/contracts:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/odds-boost-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/contracts.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/odds-boost-service.test.ts`
2. Betslip lifecycle wiring:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/summary/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/__tests__/betslice.test.tsx`
3. Translation updates:
   - `phoenix-frontend-brand-viegg/packages/app-core/translations/en/betslip.js`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/odds-boost-service.test.ts components/layout/betslip/__tests__/betslice.test.tsx --passWithNoTests`
   - pass
2. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath lib/__tests__/module-config-parser.test.ts components/pages/landing-page/__tests__/widget-registry.test.ts components/pages/esports-bets/__tests__/module-registry.test.ts components/pages/account/__tests__/module-registry.test.ts components/pages/promotions/__tests__/module-registry.test.ts components/pages/fixture/__tests__/overlay-registry.test.ts services/api/__tests__/odds-boost-service.test.ts components/layout/betslip/__tests__/betslice.test.tsx --passWithNoTests`
   - pass

## Remaining

1. Frontend lifecycle wiring is complete and now backed by server-side promo placement enforcement delivered in queue item 31.
2. Backend enforcement implementation + tests are tracked in:
   - `revival/97_SB304_SB305_PROMO_ENFORCEMENT_BACKEND_PROGRESS.md`.
3. Promo parity extension (precheck rejection taxonomy + admin/audit visibility) is tracked in:
   - `revival/98_SB304_SB305_PRECHECK_AUDIT_PROMO_PARITY_PROGRESS.md`.
4. Continue with queue item 33:
   - promote promo observability into filterable analytics dimensions and counters.
