# phoenix-analytics

`phoenix-analytics` implements event ingest and reporting endpoints for the Go rebuild.

## Implemented API
- `POST /api/v1/events`
- `GET /api/v1/reports/user/{user_id}`
- `GET /api/v1/dashboards/platform`
- `GET /api/v1/reports/markets`
- `GET /api/v1/cohorts`
- `GET /admin/users/{user_id}/transactions/export`
- `GET /admin/punters/{user_id}/transactions/export`
- `POST /admin/punters/exclusions/export`
- `POST /admin/reports/daily`
- `GET /admin/reports/daily/repeat`
- `GET /admin/promotions/usage`
- `GET /admin/wallet/corrections/tasks`
- `GET /admin/risk/player-scores`
- `GET /admin/risk/segments`
- `GET /admin/feed-health`
- `GET /admin/provider/acknowledgements`
- `POST /admin/provider/acknowledgements`
- `GET /admin/provider/acknowledgement-sla`
- `POST /admin/provider/acknowledgement-sla`

## Storage
- `analytics_events`
- `users`
- `bets`
- `markets`
- `wallets`
- `wallet_transactions`
- `self_exclusions`
- `prediction_orders`
- `event_store`
- `event_outbox`
- `provider_stream_acknowledgements`
- `provider_acknowledgement_sla_settings`

## Notes
- contract says ClickHouse; current scaffold uses PostgreSQL for ingest and report generation because the prep environment does not yet provide a ClickHouse deployment.
- `POST /api/v1/events` is implemented on the analytics service directly, but there is a namespace collision with the public events catalog at the gateway. Report endpoints are gateway-safe; event ingest should still be treated as a direct internal-service call.
- `vip_status` cohorts are currently derived from existing user-role data because the prep schema does not yet provide a dedicated VIP tier model.
- admin transaction export supports `filters.category` and `filters.product`; product is derived from transaction type and prediction-order references using the current Go schema.
- transaction export is exposed through both `users/{user_id}` and `punters/{user_id}` aliases for Talon/admin compatibility.
- daily report generation currently returns an immediate JSON bundle rather than scheduling an async DGE delivery job.
- risk-summary reads now expose truthful promo-usage summaries, wallet correction task scans, player risk scores, and derived risk segments for the Talon summary surface.
- provider-ops triage now has a Go-backed read surface for feed health plus persisted stream acknowledgements and acknowledgement SLA settings.
- feed-health is currently derived from persisted provider event sync state (`events`, `markets`) and provider payment state (`wallet_transactions`, `payment_transaction_events`); duplicate/gap counters remain zero until adapters persist those metrics directly.
- promo-usage reporting now reads persisted bet-level linkage from `bets.freebet_id`, `bets.freebet_applied_cents`, and `bets.odds_boost_id`.
- compose-backed integration now validates analytics reporting through the gateway and direct internal event ingest against the analytics service.
