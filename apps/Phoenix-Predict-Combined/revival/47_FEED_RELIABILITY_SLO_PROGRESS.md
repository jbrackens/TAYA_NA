# Feed Reliability SLO Progress (SB-006)

Date: 2026-03-04  
Backlog reference: `SB-006` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added feed reliability threshold model and health evaluation:
   - `go-platform/services/gateway/internal/provider/health.go`
2. Added threshold/env support for SLO checks:
   - `GATEWAY_PROVIDER_SLO_MAX_LAG_MS` (default `30000`)
   - `GATEWAY_PROVIDER_SLO_MAX_GAPS` (default `0`)
   - `GATEWAY_PROVIDER_SLO_MAX_DUPLICATES` (default `50`)
3. Added provider health summary dimensions:
   - lag breaches, gap breaches, duplicate breaches, error-state streams, unhealthy streams.
4. Extended stream runtime status with error counters:
   - `errorCount` in `StreamStatus`.
5. Added Prometheus feed metrics renderer:
   - `go-platform/services/gateway/internal/provider/metrics.go`
6. Added scrapeable feed telemetry endpoint:
   - `GET /metrics/feed`
7. Extended admin feed health payload:
   - includes `thresholds`
   - summary now includes `totalErrors`, breach counts, `unhealthyStreams`.
8. Added/updated tests:
   - `go-platform/services/gateway/internal/provider/health_test.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Metrics Surface Added

1. Runtime and aggregate:
   - `phoenix_provider_runtime_enabled`
   - `phoenix_provider_streams_total`
   - `phoenix_provider_streams_unhealthy_total`
2. Per-stream counters/gauges:
   - `phoenix_provider_stream_applied_total`
   - `phoenix_provider_stream_skipped_total`
   - `phoenix_provider_stream_replay_total`
   - `phoenix_provider_stream_duplicates_total`
   - `phoenix_provider_stream_gaps_total`
   - `phoenix_provider_stream_errors_total`
   - `phoenix_provider_stream_last_lag_ms`
   - `phoenix_provider_stream_unhealthy`
   - `phoenix_provider_stream_slo_breach{type=lag|gap|duplicate|error}`
3. Exposed configured threshold values:
   - `phoenix_provider_slo_threshold{type=lag_ms|gap_count|duplicate_count}`

## Validation

1. `cd go-platform/modules/platform && go test ./...`
   - pass
2. `cd go-platform/services/gateway && go test ./...`
   - pass

## Why this satisfies SB-006 (foundation)

1. Feed lag/gap/duplicate/replay/error reliability is now exposed as scrapeable metrics.
2. SLO threshold breaches are machine-readable per stream (`phoenix_provider_stream_slo_breach`) for alert rules.
3. Operations visibility is available through both:
   - Prometheus (`/metrics/feed`)
   - admin API (`/api/v1/admin/feed-health`).

## Next

1. [done] Baseline alert rules + dashboard starter template delivered in `revival/48_FEED_ALERTS_AND_DASHBOARD_BASELINE.md`.
2. [done] Chaos/reorder/drop/duplicate telemetry harness delivered via `SB-503` closure:
   - `scripts/qa/go-provider-chaos-suite.sh`
   - `go-platform/services/gateway/internal/provider/runtime_chaos_test.go`
   - `revival/180_SB503_PROVIDER_CHAOS_SUITE_REPORT.md`
