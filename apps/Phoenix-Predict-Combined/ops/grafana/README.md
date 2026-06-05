# Grafana dashboard — Tiangge prediction exchange

`prediction-exchange-dashboard.json` is a Grafana 9+ dashboard that visualises
the prediction-domain counters exposed at `/metrics/prediction` (defined in
`go-platform/services/gateway/internal/prediction/metrics.go`).

## Panels

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

The two endpoints are intentionally separate. `/metrics` only emits HTTP
request counters (low cardinality, bounded by route count). `/metrics/prediction`
emits domain counters keyed on `market_id` (cardinality scales with active
market count — fine at the hundreds-of-markets range we operate, would need
capping or aggregation if we ever ran 10k+ markets simultaneously).

## Importing the dashboard

In Grafana: Dashboards → New → Import → upload `prediction-exchange-dashboard.json`.

Or via the HTTP API:

```bash
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq '{dashboard: ., overwrite: true}' prediction-exchange-dashboard.json)"
```

Datasource UID assumed to be `prometheus` — change in the JSON if your
Prometheus datasource UID differs.

## Verifying the endpoint manually

```bash
curl -s http://localhost:18080/metrics/prediction
```

Empty state shows only HELP/TYPE blocks. As traffic flows, counters
appear. The smoke check is to run the load harness (`go run ./cmd/loadtest
-ticker IMP-5D61C3F4 -orders 50 -concurrency 5`) and re-curl — the
`prediction_orders_total` lines should appear with `status="open"` and
the recorded count.
