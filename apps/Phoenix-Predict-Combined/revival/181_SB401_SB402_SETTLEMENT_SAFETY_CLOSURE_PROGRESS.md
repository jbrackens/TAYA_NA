# SB-401 / SB-402 Settlement Safety Closure Progress

Date: 2026-03-05  
Backlog references: `SB-401`, `SB-402` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Extended admin settlement payload with optional deadheat factor:
   - `deadHeatFactor` is validated in `(0,1]`.
2. Implemented deadheat fractional settlement payout:
   - target payout computed as `potentialPayout * deadHeatFactor`.
3. Implemented deterministic resettlement conflict policy:
   - supports `settled_lost -> settled_won` and `settled_won -> settled_lost`.
   - computes wallet adjustment delta from prior effective payout to target payout.
4. Added replay-safe idempotent resettlement behavior:
   - repeated resettlement with same target/outcome/reference is no-op for wallet and audit duplication.
5. Added enriched settlement audit metadata:
   - previous status/outcome/reference/payout.
   - target payout + adjustment amount.
   - policy marker + deadheat factor when applicable.

## Key Files

1. Settlement lifecycle implementation:
   - `go-platform/services/gateway/internal/bets/service.go`
2. Admin settlement transport contract:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
3. Settlement lifecycle regression tests:
   - `go-platform/services/gateway/internal/bets/service_test.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/bets -run 'TestSettleBetWinWithDeadHeatFactorCreditsFractionalPayout|TestSettleBetResettlementFromLostToWonAdjustsWallet|TestSettleBetResettlementFromWonToLostReversesWallet|TestLifecycleIdempotentResettlementReplayDoesNotDuplicateEvents'`
   - pass
2. `cd go-platform/services/gateway && go test ./internal/http -run 'TestAdminSettleWinningBet|TestAdminSettleSupportsDeadHeatFactor|TestAdminSettleRejectsInvalidDeadHeatFactor|TestAdminSettleSupportsWinningSelectionIDsArrayForBuilderBet|TestAdminSettleRejectsMissingWinningSelectionFields'`
   - pass

## Remaining

1. None for `SB-401`/`SB-402` closure scope in this execution slice.
