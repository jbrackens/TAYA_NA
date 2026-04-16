# SB-202 Frontend Bet-Builder Contract Foundation Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 8 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added typed sportsbook API contracts for bet-builder quote/accept flows in app-core:
   - quote request leg model
   - quote response model
   - accept request/response model
2. Added runtime response-shape guards for:
   - `BetBuilderQuoteResponse`
   - `BetBuilderAcceptResponse`
3. Added response-shape tests validating valid builder quote and accept payload fixtures.
4. Added dedicated typed API helper hooks for canonical builder endpoints:
   - `useBetBuilderQuoteApi`
   - `useBetBuilderQuoteByIdApi`
   - `useBetBuilderAcceptApi`
5. Added unit tests for endpoint path/method contract correctness and safe quote-id path encoding.

## Key Files

1. Frontend API contract surface:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/contracts.ts`
2. Contract fixture/guard tests:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/response-shapes.test.ts`
3. Builder endpoint helper hooks:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/bet-builder-service.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/bet-builder-service.test.ts`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/response-shapes.test.ts services/api/__tests__/bet-builder-service.test.ts --passWithNoTests`
   - pass

## Remaining

1. Wire betslip/builder UI state machine to consume those hooks and show reason-code aware errors.
2. Add component-level tests for builder quote/accept UX paths.
