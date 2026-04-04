# Bet Builder Composition/Pricing Foundation Progress (SB-202)

Date: 2026-03-04  
Backlog reference: `SB-202` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added initial bet-builder quote domain contract in gateway bets service:
   - multi-leg composition input (`legs[]`),
   - combinability validation,
   - deterministic quote payload with combined odds and implied probability.
2. Added canonical quote endpoint:
   - `POST /api/v1/bets/builder/quote`
3. Added stable builder reason taxonomy support:
   - `invalid_builder_request`
   - `builder_not_combinable`
4. Added HTTP error mapping for builder validation/conflict outcomes.
5. Added service + route coverage tests for happy path and rejection path.

## Behavior Notes

1. Foundation enforces minimum two legs, unique leg identity, open market status, active selections, and same-fixture combinability baseline.
2. Requested odds can be supplied per leg; mismatches are rejected with stable `odds_changed` reason taxonomy.
3. Quote output includes:
   - `quoteId`
   - `combinedOdds`
   - `impliedProbability`
   - `expiresAt`
   - resolved leg details (`fixtureId`, `currentOdds`, requested odds echo)

## Key Files

1. Builder service contracts/logic:
   - `go-platform/services/gateway/internal/bets/bet_builder.go`
2. Builder service tests:
   - `go-platform/services/gateway/internal/bets/bet_builder_test.go`
3. Builder route + error mapping:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
4. Builder route tests:
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`
5. Reason-code taxonomy extension:
   - `go-platform/services/gateway/internal/bets/service.go`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Why this satisfies SB-202 foundation start

1. Builder composition/pricing now exists as executable API surface and service logic.
2. Combinability decisions are explicit and reason-coded, creating a stable base for sportsbook UX integration.
3. This provides the first canonical builder contract to extend into placement + settlement phases.

## Next

1. Add bet-builder quote persistence/TTL lifecycle and quote acceptance path into placement.
2. Extend combinability graph rules beyond same-fixture baseline.
3. Wire sportsbook frontend betslip builder UX on top of `POST /api/v1/bets/builder/quote`.
