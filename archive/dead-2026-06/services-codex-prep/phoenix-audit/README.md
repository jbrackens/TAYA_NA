# phoenix-audit

`phoenix-audit` provides the Go admin audit-log query surface for the Phoenix
platform rebuild.

## Implemented API

- `GET /health`
- `GET /ready`
- `GET /admin/audit-logs`
- `GET /admin/audit-logs/export`
- `GET /admin/users/{userID}/logs`
- `GET /admin/punters/{userID}/logs`

## Query filters

`GET /admin/audit-logs` and `GET /admin/audit-logs/export` support:

- `action`
- `actor_id`
- `target_id`
- `product`
- `sort_by`
- `sort_dir`
- `page`
- `limit`

## Authorization behavior

- `admin` can query the full audit surface
- `operator`, `trader`, and `moderator` can query prediction-scoped audit data
  when `product=prediction`
- non-admin callers without an explicit prediction product filter are rejected
- `admin`, `operator`, and `trader` can query per-user review history through:
  - `GET /admin/users/{userID}/logs`
  - `GET /admin/punters/{userID}/logs`

## Storage

The service reads from the shared PostgreSQL `audit_log` table created by:

- `migrations/009_create_audit_log.sql`

Current producers writing audit rows into that table include:

- `phoenix-market-engine` admin mutations
- `phoenix-prediction` admin lifecycle mutations

## Notes

- This is an admin/support surface, not a public player API
- product classification is currently derived from `action` and `entity_type`
  prefixes, with `prediction` recognized explicitly and all other rows treated
  as `sportsbook`
- gateway exposure is through:
  - `GET /admin/audit-logs`
  - `GET /admin/audit-logs/export`
  - `GET /admin/users/{userID}/logs`
  - `GET /admin/punters/{userID}/logs`
- export returns filtered CSV using the same authorization and query semantics as
  the JSON list route
- per-user review history filters rows where the supplied user appears as either
  the audit actor or the audit target entity

## Validation

- service-level tests: `go test ./...`
- gateway route coverage:
  - `phoenix-gateway/internal/repository/route_repository_test.go`
- demo runtime health coverage:
  - `scripts/demo-smoke.sh`
