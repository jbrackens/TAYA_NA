# Cashout Provider Revision Hardening Progress (SB-201)

Date: 2026-03-04  
Backlog reference: `SB-201` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added provider-priced quote input support to cashout quote API/service:
   - optional `providerAmountCents`
   - optional `providerRevision`
   - optional `providerSource`
2. Added quote revision model on cashout quotes:
   - `revision`
   - `source`
3. Added latest-revision tracking per bet and stale revision protection.
4. Added revision-aware acceptance guard:
   - optional `quoteRevision` on accept request
   - stale/out-of-date quotes now rejected deterministically.
5. Added stable stale-quote reason taxonomy:
   - `ErrCashoutQuoteStale`
   - `reasonCode = cashout_quote_stale`
6. Extended cashout event details with revision/source metadata for auditability.

## Key Files

1. Cashout revision and provider quote logic:
   - `go-platform/services/gateway/internal/bets/cashout.go`
2. Persisted quote revision state:
   - `go-platform/services/gateway/internal/bets/service.go`
3. HTTP request/response integration and error mapping:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
4. Coverage:
   - `go-platform/services/gateway/internal/bets/cashout_test.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`

## Tests Added

1. `TestCashoutQuoteRejectsStaleProviderRevision`
2. `TestCashoutAcceptRejectsStaleRevision`
3. `TestCashoutAcceptRouteRejectsStaleRevision`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Notes

1. This is provider-stream ready at the API contract layer while preserving local deterministic quote fallback.
2. Accept now enforces quote freshness, reducing stale-price cashout execution risk.

## Next

1. Wire runtime provider feed events to quote generation/update path.
2. Add quote-latency and stale-reject SLO metrics/alerts.
