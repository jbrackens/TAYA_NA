# SB-302 Stats Centre Foundation Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 21 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Extended canonical v1 contract with fixture-stats support:
   - new entity type: `fixture_stats`
   - new models: `FixtureStatPair`, `FixtureStats`
2. Added canonical contract tests for fixture-stats JSON roundtrip and entity constant stability.
3. Added gateway fixture-stats endpoint skeleton:
   - `GET /api/v1/stats/fixtures/{fixtureId}`
   - returns deterministic stats-centre payload (`status`, `period`, `clockSeconds`, `metrics`, `updatedAt`)
4. Registered stats endpoint in gateway route bootstrap.
5. Added gateway HTTP tests for:
   - successful fixture-stats response
   - not-found behavior with structured 404 envelope.

## Key Files

1. Canonical contract updates:
   - `go-platform/modules/platform/canonical/v1/types.go`
   - `go-platform/modules/platform/canonical/v1/fixture_stats_test.go`
2. Gateway stats endpoint:
   - `go-platform/services/gateway/internal/http/stats_center_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers.go`
3. Gateway tests:
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

1. `cd go-platform/modules/platform && go test ./canonical/v1/...`
   - pass
2. `cd go-platform/services/gateway && go test ./internal/matchtracker/... ./internal/http/... ./internal/provider/...`
   - pass

## Remaining

1. Add SB-305 odds-boost foundation so promotional offer lifecycle can pair with freebet balances.
