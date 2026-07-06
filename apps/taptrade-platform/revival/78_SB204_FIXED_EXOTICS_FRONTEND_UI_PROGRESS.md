# SB-204 Fixed Exotics Sportsbook UI Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 13 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added typed fixed-exotics sportsbook API hook module:
   - quote endpoint hook
   - quote-by-id endpoint hook
   - accept endpoint hook
2. Wired sportsbook betslip multi placement flow to use fixed-exotics lifecycle for 2-leg and 3-leg slips:
   - compose fixed-exotic quote payload (ordered positions)
   - submit quote to fixed-exotics endpoint
   - accept fixed-exotics quote with idempotent request metadata
3. Preserved existing builder flow as fallback for multi slips outside fixed-exotic cardinality.
4. Added fixed-exotics flow reset safety in betslip lifecycle paths:
   - new placement attempts
   - geolocation failures
   - error recovery
   - manual betslip reset
5. Added focused tests for:
   - fixed-exotics API path/method helper contract
   - fixed-exotics payload composition and flow-selection behavior in betslip helper layer.

## Key Files

1. Sportsbook fixed-exotics hooks:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/fixed-exotics-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/fixed-exotics-service.test.ts`
2. Betslip fixed-exotics flow wiring:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/multi-leg-placement.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/__tests__/multi-leg-placement.test.ts`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/fixed-exotics-service.test.ts services/api/__tests__/bet-builder-service.test.ts components/layout/betslip/__tests__/multi-leg-placement.test.ts components/layout/betslip/__tests__/same-game-combo.test.ts --passWithNoTests`
   - pass
2. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath components/layout/betslip/__tests__/betslice.test.tsx --passWithNoTests`
   - pass

## Remaining

1. Add explicit backoffice/admin controls for fixed-exotics lifecycle observability and manual quote/bet intervention operations.
