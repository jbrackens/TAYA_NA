# Cashout Foundation Progress (SB-201)

Date: 2026-03-04  
Backlog reference: `SB-201` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Implemented cashout quote and accept foundations in gateway bet lifecycle:
   - quote creation with TTL
   - quote retrieval
   - quote accept with wallet-safe settlement transition
2. Added cashout quote model and state machine:
   - `open`, `accepted`, `expired`.
3. Added idempotent quote generation keyed by `userId:requestId`.
4. Added quote expiry enforcement for accept path.
5. Added cashout settlement transition on bet:
   - bet status `cashed_out`
   - settlement reference = quoteId
   - settlement ledger entry linked to wallet credit
6. Added `bet.cashed_out` audit event emission.
7. Added API routes:
   - `POST /api/v1/bets/cashout/quote`
   - `POST /api/v1/bets/cashout/accept`
   - `GET /api/v1/bets/cashout/quotes/{quoteId}`
8. Added reason-code taxonomy + HTTP mapping for cashout errors.

## Key Files

1. Cashout domain and transitions:
   - `go-platform/services/gateway/internal/bets/cashout.go`
2. Bet lifecycle constants/state persistence:
   - `go-platform/services/gateway/internal/bets/service.go`
3. HTTP routes:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
4. Coverage:
   - `go-platform/services/gateway/internal/bets/cashout_test.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`

## Tests Added

1. `TestCashoutQuoteAndAcceptLifecycle`
2. `TestCashoutQuoteExpires`
3. `TestCashoutQuoteRequiresPlacedBet`
4. `TestCashoutQuoteAndAcceptRoutes`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Notes

1. Quote amount strategy is deterministic and conservative (stake + partial profit).
2. Foundation includes in-memory quote lifecycle with persisted local state support.

## Next

1. Add provider-priced quote stream and reconciliation against provider revision/TTL.
2. Add full quote idempotency and replay handling in distributed runtime mode.
3. Add cashout performance/latency metrics and alerting thresholds.
