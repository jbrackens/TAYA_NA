# SB-203 Same Game Combo Validation Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 10 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added explicit Same Game Combo validation errors in gateway bet-builder flow:
   - `ErrSameGameComboFixtureMismatch`
   - `ErrSameGameComboDuplicateMarket`
2. Strengthened builder combinability rules:
   - all legs must belong to the same fixture
   - each leg must target a distinct market (prevents contradictory same-market leg combinations).
3. Enriched builder quote payload with `comboType: "same_game_combo"` so clients can render explicit combo semantics.
4. Added stable reason-code mappings and HTTP conflict responses for new Same Game Combo rule violations:
   - `same_game_combo_fixture_mismatch`
   - `same_game_combo_duplicate_market`
5. Added sportsbook betslip pre-validation for `MULTI` flow:
   - blocks invalid same-game combinations before quote calls
   - shows clear list-level error messages for fixture mismatch and duplicate market legs.
6. Added new localized API error strings for the new Same Game Combo reason codes.

## Key Files

1. Gateway builder validation + combo typing:
   - `go-platform/services/gateway/internal/bets/bet_builder.go`
   - `go-platform/services/gateway/internal/bets/service.go`
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
2. Gateway tests:
   - `go-platform/services/gateway/internal/bets/bet_builder_test.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`
3. Sportsbook UI validation:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/same-game-combo.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/__tests__/same-game-combo.test.ts`
   - `phoenix-frontend-brand-viegg/packages/app/public/static/locales/en/api-errors.json`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/contracts.ts`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/bets/... ./internal/http/...`
   - pass
2. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath components/layout/betslip/__tests__/same-game-combo.test.ts components/layout/betslip/__tests__/betslice.test.tsx services/api/__tests__/response-shapes.test.ts services/api/__tests__/bet-builder-service.test.ts --passWithNoTests`
   - pass

## Remaining

1. SB-203 deeper slice: add explicit frontend affordance for same-game eligibility (e.g., disable invalid cross-fixture multi composition pre-selection).
2. SB-204 next: introduce fixed-exotics canonical schema and lifecycle scaffolding.
