# Alternative Odds Commit Progress (SB-106)

Date: 2026-03-04  
Backlog reference: `SB-106` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Implemented accepted-offer commit path to atomically finalize alternative-odds offers into placed bets.
2. Added new offer commit API route:
   - `POST /api/v1/bets/alternative-odds/offers/{offerId}/commit`
3. Added commit idempotency and replay safety:
   - deterministic commit idempotency key (`alt-offer-commit:{offerId}` fallback)
   - re-commit returns the same committed bet.
4. Added commit metadata on offer records:
   - `committedBetId`
   - `committedAt`
   - `commitRequestId`
   - `commitIdempotencyKey`
5. Added commit lifecycle state transitions:
   - `open -> accepted -> committed`
   - `lastAction=commit_requested|committed`
6. Added policy-safe placement behavior for commits:
   - commit path forces requested odds so accepted offer price is honored during placement.

## Key Files

1. Offer commit model + workflow:
   - `go-platform/services/gateway/internal/bets/alternative_offers.go`
2. Placement policy override hook:
   - `go-platform/services/gateway/internal/bets/service.go`
3. HTTP route wiring:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
4. Coverage:
   - `go-platform/services/gateway/internal/bets/alternative_offers_test.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`

## Tests Added

1. `TestAlternativeOddsOfferCommitPlacesBetIdempotently`
2. `TestAlternativeOddsOfferCommitRoute`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Notes

1. Commit now closes the functional gap between "offer accepted" and "bet actually placed".
2. Commit is resilient to duplicate operator/client submissions.

## Next

1. Add sportsbook frontend hook for commit flow after precheck wiring.
2. Add dashboard/alert rules for offer lifecycle ratios (`commit`, `expire`, `decline`).
