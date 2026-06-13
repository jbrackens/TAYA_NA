# phoenix-compliance

`phoenix-compliance` implements responsible gaming limits, self-exclusion, AML checks, and compliance alert intake for the Go rebuild.

## Implemented API
- `POST /api/v1/users/{user_id}/limits`
- `GET /api/v1/users/{user_id}/limits`
- `GET /api/v1/users/{user_id}/limits/history`
- `POST /api/v1/users/{user_id}/self-exclude`
- `GET /api/v1/users/{user_id}/cool-offs/history`
- `POST /punters/self-exclude`
- `GET /punters/limits-history`
- `GET /punters/cool-offs-history`
- `GET /admin/users/{user_id}/limits-history`
- `GET /admin/punters/{user_id}/limits-history`
- `PUT /admin/users/{user_id}/limits/deposit`
- `PUT /admin/punters/{user_id}/limits/deposit`
- `PUT /admin/users/{user_id}/limits/stake`
- `PUT /admin/punters/{user_id}/limits/stake`
- `PUT /admin/users/{user_id}/limits/session`
- `PUT /admin/punters/{user_id}/limits/session`
- `GET /admin/users/{user_id}/cool-offs-history`
- `GET /admin/punters/{user_id}/cool-offs-history`
- `PUT /admin/users/{user_id}/lifecycle/cool-off`
- `PUT /admin/punters/{user_id}/lifecycle/cool-off`
- `GET /api/v1/users/{user_id}/restrictions`
- `POST /api/v1/aml-check`
- `GET /api/v1/aml-check/{check_id}`
- `POST /api/v1/compliance-alerts`

## Storage
- `compliance_limits`
- `self_exclusions`
- `aml_checks`
- `compliance_alerts`
- `event_store`
- `event_outbox`

## Notes
- limit utilization is computed from live `bets`, `wallet_transactions`, and `user_sessions` data for loss, stake, deposit, and session limits.
- admin limit/cool-off history aliases now return Talon-compatible field names and root pagination for operator review flows.
- self-exclusion currently suspends the user directly in the shared `users` table because `phoenix-user` does not yet expose a dedicated suspend endpoint.
- AML checks return an async-style `202` response but are completed synchronously in the current scaffold so admin reads are deterministic.
- admin lifecycle `cool-off` aliases now support both `enable=true` (create temporary exclusion) and `enable=false` (cancel active temporary exclusion); `enable=false` returns `404` when no active temporary cool-off exists.
- admin limit-update aliases now accept both Talon's `{daily, weekly, monthly}` body and the legacy player-style `{daily_limit, weekly_limit, monthly_limit}` body for deposit, stake, and session updates, and persist them using the real enum-backed keys `daily_deposit`, `weekly_deposit`, `monthly_deposit`, `daily_stake`, `weekly_stake`, `monthly_stake`, `daily_session`, `weekly_session`, and `monthly_session`.
- legacy `POST /punters/*-limits` now uses the same compatibility parser and returns a stable `{success: true}` response envelope with the applied limit rows for supported limit kinds.
- session-limit utilization is computed from `user_sessions` as overlapping session hours within the current daily, weekly, or monthly period.
- admin limit history normalization now correctly maps stored values like `daily_deposit` and `weekly_stake` back to Talon-style period/type labels.
