# Observability — gateway dashboards & alerts

Two Grafana 9+ dashboards plus a Prometheus alert-rule set (improvement-plan
P3-05). All series are exposed unauthenticated by the gateway:

- **`/metrics`** — HTTP request metrics **and** gateway-infrastructure counters
  (`gateway_ws_*` fan-out drops, `gateway_geo_*` gate denials).
- **`/metrics/prediction`** — prediction-domain counters and the operation
  latency histograms (`prediction_operation_duration_ms`).

| File | Covers | Endpoint(s) |
|---|---|---|
| `prediction-exchange-dashboard.json` | order/trade/settlement/reconciler domain counters | `/metrics/prediction` |
| `gateway-infra-dashboard.json` | geo denials, WS drops, PlaceOrder/settlement latency p50/p95/p99, HTTP rate & latency | `/metrics` + `/metrics/prediction` |
| `../prometheus/alert-rules.yml` | 9 alerts: geo-bypass, drift, reconciler errors, override rate, WS drops, latency SLOs | both |

## Prediction-exchange dashboard panels

| # | Panel | Source metric |
|---|-------|---------------|
| 1 | Order rate (5m) | `rate(prediction_orders_total[5m])` |
| 2 | Rejection rate (5m) | `rate(prediction_orders_total{status="rejected"}[5m]) / rate(all)` |
| 3 | Trades/sec (5m) | `rate(prediction_trades_total[5m])` |
| 4 | Drift events (24h) | `increase(prediction_drift_events_total[24h])` |
| 5 | Order rate by status | `prediction_orders_total` split by status |
| 6 | Order rate by side / action | `prediction_orders_total` split by side+action |
| 7 | Top 10 markets by order rate | `topk(10, prediction_orders_total)` |
| 8 | Trades by kind | `prediction_trades_total` split by trade_kind |
| 9 | Reconciler outcomes | `prediction_reconciler_runs_total` split by outcome |
| 10 | Settlements (1h) | `prediction_settlements_total` split by result+override |
| 11 | Drift events by market table | `topk(20, prediction_drift_events_total)` |

Thresholds: rejection-rate panel goes yellow at 5% and red at 20%; drift-events
panel goes yellow at 1 and red at 5.

## Prometheus scrape config

Two endpoints to scrape — both unauthenticated by design (allowed via
`gatewayPublicPrefixes` in `cmd/gateway/main.go`):

```yaml
scrape_configs:
  - job_name: hulana-gateway-http
    metrics_path: /metrics
    scrape_interval: 15s
    static_configs:
      - targets: ['gateway:18080']  # or whatever the in-cluster service is

  - job_name: hulana-gateway-prediction
    metrics_path: /metrics/prediction
    scrape_interval: 15s
    static_configs:
      - targets: ['gateway:18080']
```

The two endpoints are intentionally separate. `/metrics` emits HTTP request
counters plus the gateway-infrastructure counters (`gateway_ws_*`,
`gateway_geo_*`) — all low cardinality, bounded by route count and a handful of
fixed infra series. `/metrics/prediction` emits domain counters keyed on
`market_id` (cardinality scales with active market count — fine at the
hundreds-of-markets range we operate, would need capping or aggregation if we
ever ran 10k+ markets simultaneously). The latency histograms on
`/metrics/prediction` are deliberately keyed only on `op` (two series), not
`market_id`, to keep bucket cardinality flat.

The infra counters are folded onto `/metrics` via a collector registered on the
platform metrics registry (`RegisterCollector` in
`modules/platform/transport/httpx/metrics.go`; wired in `cmd/gateway/main.go`),
so a single `/metrics` scrape covers both HTTP and infra signals.

## Importing the dashboards

In Grafana: Dashboards → New → Import → upload the `.json` file
(`prediction-exchange-dashboard.json` and/or `gateway-infra-dashboard.json`).

Or via the HTTP API (run once per file):

```bash
for f in prediction-exchange-dashboard.json gateway-infra-dashboard.json; do
  curl -X POST http://grafana:3000/api/dashboards/db \
    -H "Authorization: Bearer $GRAFANA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$(jq '{dashboard: ., overwrite: true}' "$f")"
done
```

Datasource UID assumed to be `prometheus` — change in the JSON if your
Prometheus datasource UID differs. The infra dashboard's panels use the
default datasource, so importing against a single-Prometheus Grafana needs no
edits.

## Alerting rules

`../prometheus/alert-rules.yml` defines the alerts that back the SLOs above.
Load it from the Prometheus server config and validate before shipping:

```yaml
# prometheus.yml
rule_files:
  - /etc/prometheus/alert-rules.yml
```

```bash
promtool check rules ../prometheus/alert-rules.yml   # CI/pre-ship gate
```

Severities: `critical` (page) = active geo-bypass attempt or reconciler-detected
collateral drift; `warning` = degradation (missing geo signal, reconciler
errors, high override rate, WS drops, latency SLO breach). The drill that
satisfies P3-05 acceptance: force one alert (e.g. curl the origin directly with
a forged `CF-IPCountry` and no edge-auth → `GeoEdgeAuthDenialsPresent` fires).

## Distributed tracing (OTLP)

Tracing is already OTLP-ready (`internal/tracing/tracing.go`). Point it at a
collector with env — no code change:

```
OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector:4317   # set → enables the OTLP/gRPC exporter
OTEL_TRACES_EXPORTER=stdout                        # alternative: print spans to stdout (debug)
```

Selection logic (`buildExporter`): if `OTEL_EXPORTER_OTLP_ENDPOINT` is set it
wins and exports OTLP/gRPC; else `OTEL_TRACES_EXPORTER=stdout` prints spans;
else tracing is a no-op (safe default). Spans cover the HTTP middleware chain;
correlate a latency-histogram spike with traces by time window.

> **Note:** the OTLP exporter currently connects **insecure (plaintext gRPC)** —
> `WithInsecure()` is hard-coded and there is *no* TLS env knob yet (the
> `OTEL_EXPORTER_OTLP_INSECURE` comment in the code is aspirational). Keep the
> collector on a trusted network / sidecar until TLS is wired.

## Verifying the endpoint manually

```bash
curl -s http://localhost:18080/metrics/prediction
```

Empty state shows only HELP/TYPE blocks. As traffic flows, counters
appear. The smoke check is to run the load harness (`go run ./cmd/loadtest
-ticker IMP-5D61C3F4 -orders 50 -concurrency 5`) and re-curl — the
`prediction_orders_total` lines should appear with `status="open"` and
the recorded count.
