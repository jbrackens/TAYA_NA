# Bet Builder Quote Lifecycle and Accept Flow Progress (SB-202)

Date: 2026-03-04  
Backlog reference: `SB-202` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Extended bet-builder quote model with lifecycle fields:
   - `status`, `createdAt`, `updatedAt`, `acceptedAt`
   - accept metadata (`acceptedBetId`, `acceptRequestId`, `acceptIdempotencyKey`)
2. Added bet-builder quote persistence state in gateway bet store:
   - `betBuilderQuotesById`
   - `betBuilderQuotesByKey`
   - `betBuilderQuoteSequence`
3. Added quote TTL handling + retrieval service contract:
   - `GetBetBuilderQuote(quoteId)`
   - quote expiry transitions to `expired`
4. Added quote-accept placement path:
   - `AcceptBetBuilderQuote(...)`
   - wallet-safe debit path with idempotent accept behavior
   - accepted quote links to a placed builder bet (`acceptedBetId`)
5. Added new canonical API routes:
   - `GET /api/v1/bets/builder/quotes/{quoteId}`
   - `POST /api/v1/bets/builder/accept`
6. Added reason taxonomy for builder quote lifecycle errors:
   - `builder_quote_not_found`
   - `builder_quote_expired`
   - `builder_quote_conflict`

## Behavior Notes

1. Quote creation is idempotent by `(userId, requestId)` and returns the existing quote when payload matches.
2. Accept is idempotent and returns the already-placed builder bet when the quote is already accepted.
3. Accept enforces stake bounds (`BET_MIN_STAKE_CENTS` / `BET_MAX_STAKE_CENTS`).
4. Quote expiry is enforced on retrieval and acceptance.
5. Builder accept currently places a synthetic combo bet record (`bb:fixture:*` / `bb:combo:*`) as the canonical bridge toward full multi-leg placement settlement.

## Key Files

1. Builder lifecycle service logic:
   - `go-platform/services/gateway/internal/bets/bet_builder.go`
2. Bet service persistence wiring + reason codes:
   - `go-platform/services/gateway/internal/bets/service.go`
3. Builder lifecycle HTTP routes/error mapping:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
4. Builder service tests:
   - `go-platform/services/gateway/internal/bets/bet_builder_test.go`
5. Builder HTTP route tests:
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass
3. Note on stability:
   - one transient `internal/http` test race (`TestAdminFeedHealthWithProviderRuntimeEnabled`) appeared during the first full run and passed on immediate rerun without code changes.

## Remaining for SB-202

1. Replace synthetic combo placement bridge with full native multi-leg bet entity and settlement model.
2. Add combinability graph/rule engine beyond same-fixture + duplicate-leg baseline.
3. Wire sportsbook frontend builder UX to quote + accept routes.
