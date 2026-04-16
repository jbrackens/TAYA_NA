# Feed Alerts and Dashboard Baseline (SB-006)

Date: 2026-03-04  
Backlog reference: `SB-006` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Alert Rules

Prometheus alert pack added:

- `go-platform/services/gateway/ops/prometheus/provider_feed_alerts.yml`

Rules included:

1. `PhoenixProviderRuntimeDown`
2. `PhoenixProviderStreamUnhealthy`
3. `PhoenixProviderLagSLOBreach`
4. `PhoenixProviderGapSLOBreach`
5. `PhoenixProviderDuplicateSLOBreach`
6. `PhoenixProviderStreamError`

## Dashboard Starter Spec (Grafana)

Use datasource: Prometheus.  
Recommended dashboard title: `Phoenix Provider Feed Health`.

Suggested panels:

1. **Runtime Enabled (stat)**
   - Query: `phoenix_provider_runtime_enabled{service="gateway"}`
2. **Unhealthy Streams (stat)**
   - Query: `phoenix_provider_streams_unhealthy_total{service="gateway"}`
3. **Lag by Stream (table)**
   - Query: `phoenix_provider_stream_last_lag_ms{service="gateway"}`
4. **Lag Breaches by Stream (table)**
   - Query: `phoenix_provider_stream_slo_breach{service="gateway",type="lag"}`
5. **Gap Breaches by Stream (table)**
   - Query: `phoenix_provider_stream_slo_breach{service="gateway",type="gap"}`
6. **Duplicate Breaches by Stream (table)**
   - Query: `phoenix_provider_stream_slo_breach{service="gateway",type="duplicate"}`
7. **Error Breaches by Stream (table)**
   - Query: `phoenix_provider_stream_slo_breach{service="gateway",type="error"}`
8. **Applied vs Skipped (time series)**
   - Query A: `rate(phoenix_provider_stream_applied_total{service="gateway"}[5m])`
   - Query B: `rate(phoenix_provider_stream_skipped_total{service="gateway"}[5m])`
9. **Gaps and Duplicates Rate (time series)**
   - Query A: `rate(phoenix_provider_stream_gaps_total{service="gateway"}[5m])`
   - Query B: `rate(phoenix_provider_stream_duplicates_total{service="gateway"}[5m])`
10. **Throttle Pressure (time series)**
   - Query A: `rate(phoenix_provider_stream_throttle_events_total{service="gateway"}[5m])`
   - Query B: `rate(phoenix_provider_stream_throttle_delay_ms_total{service="gateway"}[5m])`

## Runbook Notes

1. Scrape endpoint:
   - `GET /metrics/feed` on gateway service.
2. Validate quickly:
   - `curl -s http://127.0.0.1:<gateway-port>/metrics/feed | rg phoenix_provider_stream`
3. Tune thresholds per environment:
   - `GATEWAY_PROVIDER_SLO_MAX_LAG_MS`
   - `GATEWAY_PROVIDER_SLO_MAX_GAPS`
   - `GATEWAY_PROVIDER_SLO_MAX_DUPLICATES`

## Next

1. Commit dashboard JSON export under `go-platform/services/gateway/ops/grafana/` once first production tuning pass is complete.
2. [done] Added CI/pre-release chaos threshold gate wiring as `SB-503` closure (`make qa-provider-chaos`, included in `make verify-go`).
