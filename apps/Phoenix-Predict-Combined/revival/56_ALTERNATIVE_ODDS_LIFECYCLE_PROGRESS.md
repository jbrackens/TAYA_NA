# Alternative Odds Lifecycle Progress (SB-106)

Date: 2026-03-04  
Backlog reference: `SB-106` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Implemented alternative-odds offer lifecycle domain in gateway bets service:
   - create
   - get
   - list/filter
   - reprice
   - accept
   - decline
   - expire
2. Added stable offer state machine:
   - `open`, `accepted`, `declined`, `expired`.
3. Added offer versioning + audit-friendly metadata:
   - `version`
   - `lastAction`
   - timestamps (`createdAt`, `updatedAt`, `expiresAt`, `repricedAt`, `acceptedAt`, `declinedAt`, `expiredAt`)
   - `decisionReason`
4. Added idempotency behavior on create by `userId:requestId`.
5. Added API routes for lifecycle operations:
   - `POST /api/v1/bets/alternative-odds/offers`
   - `GET /api/v1/bets/alternative-odds/offers`
   - `GET /api/v1/bets/alternative-odds/offers/{offerId}`
   - `POST /api/v1/bets/alternative-odds/offers/{offerId}/accept`
   - `POST /api/v1/bets/alternative-odds/offers/{offerId}/decline`
   - `POST /api/v1/bets/alternative-odds/offers/{offerId}/reprice`
6. Added reason-code taxonomy + HTTP mapping for offer lifecycle failures.

## Key Files

1. Offer lifecycle implementation:
   - `go-platform/services/gateway/internal/bets/alternative_offers.go`
2. Offer lifecycle API routes:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
3. Reason taxonomy:
   - `go-platform/services/gateway/internal/bets/service.go`
4. Coverage:
   - `go-platform/services/gateway/internal/bets/alternative_offers_test.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`

## Tests Added

1. `TestAlternativeOddsOfferLifecycleCreateRepriceAccept`
2. `TestAlternativeOddsOfferExpiresAndRejectsDecision`
3. `TestAlternativeOddsOfferListFiltersAndLimit`
4. `TestAlternativeOddsOfferLifecycleRoutes`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Notes

1. This completes the lifecycle orchestration foundation.
2. Offer acceptance currently updates offer state; direct placement coupling to accepted offers is the next integration step.

## Next

1. Wire accepted offers into final placement flow with explicit expiry-guarded commit path.
2. Add offer lifecycle metrics (created/repriced/accepted/declined/expired).
3. Add frontend betslip UX hooks to consume offer endpoints.
