# Provider Rate-Limit Governance Progress (SB-007)

Date: 2026-03-04  
Backlog reference: `SB-007` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added adaptive provider rate governor:
   - token-bucket style wait/reserve behavior per stream operation key.
   - file: `go-platform/services/gateway/internal/provider/governor.go`
2. Added env-based runtime governor controls:
   - `GATEWAY_PROVIDER_RATE_LIMIT_ENABLED` (default `true`)
   - `GATEWAY_PROVIDER_RATE_LIMIT_RPS` (default `20`)
   - `GATEWAY_PROVIDER_RATE_LIMIT_BURST` (default `5`)
3. Wired governor into runtime operations:
   - snapshot fetch operation throttling
   - stream subscribe operation throttling
4. Added throttle telemetry in stream status:
   - `throttleEvents`
   - `throttleDelayMs`
5. Extended feed summary and metrics with throttle totals/series:
   - summary:
     - `totalThrottleEvents`
     - `totalThrottleDelayMs`
   - metrics:
     - `phoenix_provider_stream_throttle_events_total`
     - `phoenix_provider_stream_throttle_delay_ms_total`

## Key Files

1. Governor implementation:
   - `go-platform/services/gateway/internal/provider/governor.go`
2. Runtime integration:
   - `go-platform/services/gateway/internal/provider/runtime.go`
3. Env option wiring:
   - `go-platform/services/gateway/internal/provider/bootstrap.go`
4. Feed summary and admin output:
   - `go-platform/services/gateway/internal/provider/health.go`
   - `go-platform/services/gateway/internal/http/admin_handlers.go`
5. Feed metrics output:
   - `go-platform/services/gateway/internal/provider/metrics.go`

## Tests Added/Updated

1. `go-platform/services/gateway/internal/provider/governor_test.go`
   - validates env parsing and throttle behavior.
2. `go-platform/services/gateway/internal/provider/bootstrap_test.go`
   - validates runtime options include governor defaults/overrides.
3. `go-platform/services/gateway/internal/provider/health_test.go`
   - validates throttle totals in feed summary.
4. `go-platform/services/gateway/internal/http/handlers_test.go`
   - validates feed-health summary and `/metrics/feed` include throttle signals.

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Why this satisfies SB-007 foundation

1. Provider runtime now applies bounded adaptive throttling instead of ungoverned request bursts.
2. Governance behavior is configurable by environment without code changes.
3. Operational visibility of throttling is available via admin feed-health and Prometheus metrics.

## Next

1. Add operation-specific profiles (snapshot/subscribe/commands) with different limits.
2. Integrate dynamic backoff/retry governance for reconnect loops and provider command workflows.
