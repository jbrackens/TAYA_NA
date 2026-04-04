# SB-202 Native Multi-Leg Bet Model Progress

Date: 2026-03-04  
Backlog reference: `SB-202` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added a native `legs` model on bet entities (`BetLeg` + `Bet.Legs`) so combo/builder placements are represented as first-class multi-leg bets instead of single synthetic selection only.
2. Updated single-bet placement to persist canonical per-line leg data.
3. Updated builder quote acceptance to map quote legs into placed bet legs.
4. Extended settlement transition logic for multi-leg bets:
   - supports normalized multi-selection settlement payloads (`home,over`, `home|over`, etc.)
   - evaluates win only when all placed legs are included in the winning selection set
   - keeps idempotent settlement replay behavior via normalized settlement references.
5. Added settlement safety rule for multi-leg bets: multi-leg settlement requests must carry an explicit multi-selection payload delimiter.
6. Added DB persistence support for multi-leg entities (`legs_json`) with schema bootstrap compatibility and round-trip decode.

## Tests Added/Updated

1. `TestAcceptBetBuilderQuotePlacesBetIdempotently`:
   - now asserts accepted builder bets carry two native legs.
2. `TestSettleBetBuilderBetWithMultiSelectionReference`:
   - validates winning settlement path for builder bet using multi-selection payload.
3. `TestSettleBetBuilderBetRequiresMultiSelectionReference`:
   - validates invalid settlement request rejection for multi-leg bets when payload is single-selection style.

## Key Files

1. Bet model, settlement, and DB persistence:
   - `go-platform/services/gateway/internal/bets/service.go`
2. Builder placement -> bet leg mapping:
   - `go-platform/services/gateway/internal/bets/bet_builder.go`
3. Multi-leg behavior tests:
   - `go-platform/services/gateway/internal/bets/bet_builder_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Remaining

1. Wire sportsbook frontend builder flow to consume quote/get/accept endpoints and submit multi-leg settlement-compatible metadata where needed.
2. Extend admin/backoffice settlement UX to explicitly support structured multi-leg result payloads (beyond delimiter-based compact input).
3. Add dedicated contract tests for DB-mode multi-leg persistence under explicit SQL integration test driver configuration.
