# SB-301 Match Tracker Provider Mapping Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 20 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added a shared in-memory gateway `matchtracker` service used by both:
   - provider stream sink ingestion path
   - `GET /api/v1/match-tracker/fixtures/{fixtureId}` read endpoint
2. Extended provider event sink to map canonical match-tracker events:
   - handles `EntityMatchTracker` payloads as either timeline snapshots or incident updates
   - supports delete semantics by fixture id
3. Updated gateway match-tracker HTTP route to prefer provider-ingested timeline state when available, with existing synthetic timeline fallback preserved.
4. Extended demo provider stream payloads with match-tracker incidents so runtime ingestion can exercise the new path.
5. Added deterministic replay coverage for incident ingestion order and duplicate checkpoint skipping.

## Key Files

1. New match-tracker domain service:
   - `go-platform/services/gateway/internal/matchtracker/service.go`
   - `go-platform/services/gateway/internal/matchtracker/service_test.go`
2. Provider sink mapping:
   - `go-platform/services/gateway/internal/http/provider_stream_sink.go`
   - `go-platform/services/gateway/internal/http/provider_stream_sink_test.go`
3. Route wiring and handler behavior:
   - `go-platform/services/gateway/internal/http/handlers.go`
   - `go-platform/services/gateway/internal/http/match_tracker_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`
4. Demo adapter incident feed samples:
   - `go-platform/services/gateway/internal/provider/demo_adapter.go`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/matchtracker/... ./internal/http/... ./internal/provider/...`
   - pass
2. `cd go-platform/modules/platform && go test ./canonical/v1/... ./canonical/replay/...`
   - pass

## Remaining

1. Wire SB-302 sportsbook fixture-page stats panel so incidents and stats render together from gateway endpoints.
