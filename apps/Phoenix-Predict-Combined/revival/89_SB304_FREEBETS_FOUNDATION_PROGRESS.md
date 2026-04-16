# SB-304 Freebets Foundation Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 24 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Extended canonical v1 contract with freebet support:
   - new entity type: `freebet`
   - new models: `Freebet`, `FreebetStatus`
2. Added canonical tests for freebet JSON contract roundtrip and entity constant stability.
3. Added initial gateway freebet read foundation:
   - in-memory freebet service with seeded promotional balances
   - `GET /api/v1/freebets?userId={id}[&status=...]`
   - `GET /api/v1/freebets/{freebetId}`
4. Registered freebet routes in gateway bootstrap.
5. Added gateway HTTP coverage for:
   - listing freebets by user
   - not-found behavior for freebet detail endpoint.

## Key Files

1. Canonical contract:
   - `go-platform/modules/platform/canonical/v1/types.go`
   - `go-platform/modules/platform/canonical/v1/freebet_test.go`
2. Gateway freebet domain service:
   - `go-platform/services/gateway/internal/freebets/service.go`
   - `go-platform/services/gateway/internal/freebets/service_test.go`
3. Gateway HTTP routes:
   - `go-platform/services/gateway/internal/http/freebet_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

1. `cd go-platform/modules/platform && go test ./canonical/v1/...`
   - pass
2. `cd go-platform/services/gateway && go test ./internal/freebets/... ./internal/matchtracker/... ./internal/http/... ./internal/provider/...`
   - pass

## Remaining

1. Wire sportsbook frontend promo surfaces to consume freebet and odds-boost availability data.
