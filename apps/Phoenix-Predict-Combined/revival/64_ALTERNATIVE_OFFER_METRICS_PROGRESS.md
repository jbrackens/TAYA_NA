# Alternative Offer Metrics Progress (SB-106)

Date: 2026-03-04  
Backlog reference: `SB-106` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added alternative-offer lifecycle counters in gateway bet service:
   - created
   - repriced
   - accepted
   - declined
   - expired
   - committed
2. Added alternative-offer status gauges snapshot:
   - total
   - open
   - accepted
   - declined
   - expired
   - committed
3. Persisted offer metric counters in local bet state file model.
4. Exposed offer metrics in `/metrics/feed` Prometheus surface:
   - `phoenix_bet_offer_created_total`
   - `phoenix_bet_offer_repriced_total`
   - `phoenix_bet_offer_accepted_total`
   - `phoenix_bet_offer_declined_total`
   - `phoenix_bet_offer_expired_total`
   - `phoenix_bet_offer_committed_total`
   - `phoenix_bet_offer_status_total{status=*}`
5. Added coverage for lifecycle metric increments and feed metric presence.

## Key Files

1. Offer metrics model/persistence:
   - `go-platform/services/gateway/internal/bets/service.go`
2. Offer lifecycle metric updates + snapshot:
   - `go-platform/services/gateway/internal/bets/alternative_offers.go`
3. Feed metrics integration:
   - `go-platform/services/gateway/internal/http/metrics_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers.go`
4. Coverage:
   - `go-platform/services/gateway/internal/bets/alternative_offers_test.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Tests Added

1. `TestAlternativeOfferMetricsSnapshot`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Notes

1. Offer lifecycle observability is now available without relying on provider runtime internals.
2. Metrics remain process-local unless bet state is moved to shared storage.

## Next

1. Add dashboard panels/alerts for offer expire/commit ratios.
2. Correlate offer metrics with precheck reject taxonomy for betslip UX tuning.
