# SB-305 Odds Boost Foundation Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 25 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Extended canonical v1 contract with odds-boost support:
   - new entity type: `odds_boost`
   - new models: `OddsBoost`, `OddsBoostStatus`
2. Added canonical tests for odds-boost JSON contract roundtrip and entity constant stability.
3. Added initial gateway odds-boost foundation:
   - in-memory odds-boost service with seeded promotional offers
   - list/get paths:
     - `GET /api/v1/odds-boosts?userId={id}[&status=...]`
     - `GET /api/v1/odds-boosts/{oddsBoostId}`
   - accept path:
     - `POST /api/v1/odds-boosts/{oddsBoostId}/accept`
   - idempotent accept handling by request id
4. Added odds-boost error mapping for invalid/not-found/forbidden/not-acceptable/idempotency-conflict states.
5. Registered odds-boost routes in gateway bootstrap.

## Key Files

1. Canonical contract:
   - `go-platform/modules/platform/canonical/v1/types.go`
   - `go-platform/modules/platform/canonical/v1/odds_boost_test.go`
2. Gateway odds-boost service:
   - `go-platform/services/gateway/internal/oddsboosts/service.go`
   - `go-platform/services/gateway/internal/oddsboosts/service_test.go`
3. Gateway HTTP routes:
   - `go-platform/services/gateway/internal/http/odds_boost_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

1. `cd go-platform/modules/platform && go test ./canonical/v1/...`
   - pass
2. `cd go-platform/services/gateway && go test ./internal/oddsboosts/... ./internal/freebets/... ./internal/matchtracker/... ./internal/http/... ./internal/provider/...`
   - pass

## Remaining

1. Wire sportsbook frontend promo surfaces to consume freebet + odds-boost endpoints and expose basic availability/acceptance states in account and betslip contexts.
