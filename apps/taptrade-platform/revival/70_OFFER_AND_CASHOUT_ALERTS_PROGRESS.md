# Offer Commit/Expire and Cashout Stale-Reject Alerts Progress

Date: 2026-03-04  
Backlog reference: immediate queue item in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added cashout lifecycle telemetry required for stale-reject alerting:
   - `phoenix_cashout_quote_created_total`
   - `phoenix_cashout_quote_accepted_total`
   - `phoenix_cashout_quote_expired_total`
   - `phoenix_cashout_quote_stale_reject_total`
   - `phoenix_cashout_quote_conflict_total`
2. Added internal cashout metrics counters in bet service state and persisted snapshot support.
3. Added stale-reject counter increments on stale quote rejection paths.
4. Added Prometheus alert rules for trading quality monitoring:
   - `PhoenixAlternativeOfferCommitExpiryRatioLow`
   - `PhoenixCashoutStaleRejectSpike`
5. Updated feed metrics endpoint test assertions to cover stale-reject metric exposure.

## Alert Rules Added

1. Commit/expire degradation alert:
   - ratio: `increase(committed[30m]) / clamp_min(increase(expired[30m]),1)`
   - threshold: `< 0.50`
   - guardrail: at least `10` expiries in 30m
   - hold: `15m`
2. Stale reject spike alert:
   - threshold: `increase(stale_reject_total[10m]) >= 5`
   - hold: `5m`

## Key Files

1. Cashout metrics model + persistence:
   - `go-platform/services/gateway/internal/bets/service.go`
2. Cashout metrics mutations + snapshot API:
   - `go-platform/services/gateway/internal/bets/cashout.go`
   - `go-platform/services/gateway/internal/bets/cashout_test.go`
3. Prometheus metrics exposure:
   - `go-platform/services/gateway/internal/http/metrics_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`
4. Alert rules:
   - `go-platform/services/gateway/ops/prometheus/provider_feed_alerts.yml`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Remaining

1. Add Grafana dashboard panel JSON overlays for commit/expire ratio and stale-reject trend lines.
2. Tune thresholds using staging traffic baselines once live shadow data is available.
