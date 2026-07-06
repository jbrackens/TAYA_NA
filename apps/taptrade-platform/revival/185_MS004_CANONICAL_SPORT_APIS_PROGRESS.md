# MS-004 Canonical Sport APIs Progress

Date: 2026-03-06  
Scope: Phase 9 multi-sport expansion item 4 (`/api/v1/sports/*` canonical read APIs + esports compatibility wrappers) in Go gateway.

## Delivered

1. Added canonical sport API handlers in gateway:
   - `GET /api/v1/sports`
   - `GET /api/v1/sports/{sportKey}/leagues`
   - `GET /api/v1/sports/{sportKey}/events`
   - `GET /api/v1/sports/{sportKey}/events/{eventKey}`
   - `GET /api/v1/sports/{sportKey}/events/{eventKey}/markets`
2. Added esports compatibility wrappers:
   - `GET /api/v1/esports/events`
   - `GET /api/v1/esports/events/{eventKey}`
   - `GET /api/v1/esports/events/{eventKey}/markets`
3. Added canonical sport resolver and fallback catalog in HTTP layer:
   - canonical keys: `esports`, `mlb`, `nfl`, `ncaa_baseball`, `nba`, `ufc`
   - alias normalization for path compatibility
4. Added additive domain fields for phase-2 compatibility (`omitempty`/non-breaking in legacy payloads):
   - `Fixture`: `sportKey`, `leagueKey`, `seasonKey`, `eventKey`, `status`
   - `Market`: `sportKey`, `leagueKey`, `eventKey`
5. Wired route registration into gateway bootstrap.
6. Added endpoint coverage tests in HTTP suite for catalog, league listing, event listing/detail/markets, wrapper parity, and unknown-sport behavior.

## Files Changed

1. `go-platform/services/gateway/internal/http/sports_handlers.go`
2. `go-platform/services/gateway/internal/http/handlers.go`
3. `go-platform/services/gateway/internal/http/handlers_test.go`
4. `go-platform/services/gateway/internal/domain/types.go`

## Validation

1. Focused new-route tests + regression spot check:

```bash
cd go-platform/services/gateway
go test ./internal/http -run 'TestSportsCatalogReturnsAggregatedSports|TestSportLeaguesBySportKeyReturnsLeagues|TestSportEventsFiltersByLeagueAndPaginates|TestSportEventByKeyAndMarketsEndpoints|TestEsportsCompatibilityEventMarketsRoute|TestSportRouteUnknownSportReturnsNotFound|TestMarketsListSupportsFiltersPaginationAndSorting' -v
```

Result: pass.

2. Package compile sanity:

```bash
cd go-platform/services/gateway
go test ./internal/http -run '^$'
```

Result: pass.

## Notes

1. Full `go test ./internal/http/...` currently includes pre-existing time-sensitive bet placement failures where fixture `m:local:001` is treated as in-play based on current date/time, causing expected-open tests to fail (`market is not open`).
2. That test-timestamp stabilization is outside the scope of this MS-004 slice and should be handled as a dedicated deterministic-time hardening task.
