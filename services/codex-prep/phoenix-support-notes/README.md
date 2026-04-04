# phoenix-support-notes

`phoenix-support-notes` provides the Go admin support-notes timeline surface for
operator and backoffice workflows.

## Implemented API

- `GET /health`
- `GET /ready`
- `GET /admin/users/{userID}/timeline`
- `GET /admin/users/{userID}/timeline/export`
- `GET /admin/users/{userID}/notes`
- `POST /admin/users/{userID}/notes`
- `GET /admin/punters/{punterID}/timeline`
- `GET /admin/punters/{punterID}/timeline/export`
- `GET /admin/punters/{punterID}/notes`
- `POST /admin/punters/{punterID}/notes`

The `users` and `punters` paths are aliases over the same underlying owner-user
identifier so Talon migration can move incrementally without preserving the old
Scala backend.

## Behavior

- list notes for a user with pagination
- list a unified operator timeline for a user with pagination
- export a unified operator timeline as CSV
- add a manual support note for a user
- write an audit-log row for manual note creation in the same transaction

The timeline aggregates:

- support notes
- wallet transactions
- bets
- verification sessions
- self-exclusions
- compliance limits
- responsibility-check acknowledgements

Supported filters:

- `type`
- `start_date`
- `end_date`

## Authorization

The service requires a valid bearer token and supports these admin roles for
note management:

- `admin`
- `operator`
- `trader`
- `moderator`

## Storage

- `support_notes`
- `users`
- `audit_log`

Schema is created by:

- `migrations/019_create_support_notes.sql`

## Validation

- service-level tests: `go test ./...`
- gateway route coverage:
  - `phoenix-gateway/internal/repository/route_repository_test.go`
- demo runtime health coverage:
  - `scripts/demo-smoke.sh`
