# Cashout Provider-Stream Quote Update Progress (SB-201 Deepening)

Date: 2026-03-04  
Backlog reference: `SB-201` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Wired provider runtime bootstrap to accept an injectable event sink, enabling sportsbook domain-side stream processing hooks.
2. Added a gateway provider-event sink that consumes canonical runtime events and maps `cashout_quote` updates into bet service cashout quote state.
3. Added canonical entity support for stream-level cashout quotes:
   - `EntityCashoutQuote`
   - `CashoutQuoteUpdate` payload contract.
4. Extended demo provider adapter stream data with sample `cashout_quote` events.
5. Extended cashout quote service contract to honor provider expiry (`ProviderExpiresAt`) when supplied.
6. Extended cashout quote HTTP contract to accept optional `providerExpiresAt` and validate RFC3339 format.
7. Added unit coverage proving stream-applied quote updates are reflected in gateway cashout quote retrieval behavior.

## Behavior Notes

1. Stream cashout quote updates are applied on a best-effort basis and do not hard-fail provider stream replay when a quote update cannot be applied to current local bet state.
2. Runtime stream updates can now carry provider amount/revision/source/expiry into the cashout quote lifecycle.
3. Existing manual/API quote behavior remains backward compatible when no provider expiry is supplied.

## Key Files

1. Runtime bootstrap sink injection:
   - `go-platform/services/gateway/internal/provider/bootstrap.go`
2. Runtime registration wiring:
   - `go-platform/services/gateway/internal/http/handlers.go`
3. Provider stream sink implementation:
   - `go-platform/services/gateway/internal/http/provider_stream_sink.go`
4. Provider stream sink tests:
   - `go-platform/services/gateway/internal/http/provider_stream_sink_test.go`
5. Canonical cashout quote entity/payload:
   - `go-platform/modules/platform/canonical/v1/types.go`
6. Demo adapter stream events:
   - `go-platform/services/gateway/internal/provider/demo_adapter.go`
7. Cashout service quote expiry propagation:
   - `go-platform/services/gateway/internal/bets/cashout.go`
8. Cashout HTTP provider expiry parsing:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`

## Validation

1. `cd go-platform/modules/platform && go test ./...`
   - pass
2. `cd go-platform/services/gateway && go test ./...`
   - pass

## Remaining for SB-201

1. Add dedicated observability counters for provider-stream quote-apply success/fail/ignored paths.
2. Add adapter-level production mapping from real provider quote event schemas into canonical `cashout_quote` envelopes.
3. Expand stale/revision conflict integration tests around concurrent stream update + user accept race windows.
