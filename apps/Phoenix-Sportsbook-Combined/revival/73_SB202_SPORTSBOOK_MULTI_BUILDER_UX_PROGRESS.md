# SB-202 Sportsbook Multi Builder UX Integration Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 8 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Implemented sportsbook betslip multi flow (`MULTI` tab) against canonical builder endpoints:
   - geolocation-gated quote request
   - builder quote handling
   - builder accept placement
   - canonical reason-code list error rendering on quote/accept failures
2. Added shared API error-code normalization helper in betslip flow so stable reason codes map into existing `api-errors` UX path.
3. Added multi-flow state handling for pending builder legs and pending builder quote context lifecycle.
4. Added reset behavior so manual betslip resets clear pending builder state and hook state.
5. Added/kept typed builder service contracts + hooks and validated with targeted tests.

## Key Files

1. Betslip multi flow wiring:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.tsx`
2. Builder API contracts/helpers:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/contracts.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/bet-builder-service.ts`
3. Tests:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/response-shapes.test.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/bet-builder-service.test.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/__tests__/betslice.test.tsx`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath components/layout/betslip/__tests__/betslice.test.tsx services/api/__tests__/response-shapes.test.ts services/api/__tests__/bet-builder-service.test.ts --passWithNoTests`
   - pass

## Remaining

1. Add explicit component interaction tests for successful/failed builder quote->accept transitions (not just baseline betslip render coverage).
2. Add user-facing UX copy for builder-specific transient states (quote pending/accept pending) if product wants explicit indicators.
