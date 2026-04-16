# SB-601/SB-602 Personalization Hooks Progress

Date: 2026-03-05  
Backlog reference: `SB-601`, `SB-602` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added risk-intelligence service foundation for personalization hooks:
   - user-event affinity extraction from bet events
   - market ranking score model with explainable reasons.
2. Added SB-601 ranking endpoint:
   - `GET /api/v1/personalization/ranking`
   - supports `userId`, `fixtureId`, `limit`.
3. Added SB-602 combo suggestion endpoint:
   - `GET /api/v1/personalization/combo-suggestions`
   - emits `featureFlags`, `confidence`, `explanation`, and leg composition.

## Key Files

1. Personalization service:
   - `go-platform/services/gateway/internal/riskintel/service.go`
   - `go-platform/services/gateway/internal/riskintel/service_test.go`
2. HTTP route wiring:
   - `go-platform/services/gateway/internal/http/risk_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/riskintel ./internal/http -run 'TestRankMarketsReturnsOrderedScores|TestSuggestCombosReturnsEligibleSuggestions|TestPersonalizationRankingAndComboSuggestionsEndpoints'`
   - pass

## Remaining

1. None for SB-601/SB-602 hook scope in this execution slice.
