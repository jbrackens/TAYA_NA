# Go Markets/Fixtures Read API Progress (B014)

Date: 2026-03-02

## Delivered

Implemented read-only gateway endpoints with legacy Phoenix contract mapping:
- `GET /api/v1/status`
- `GET /api/v1/fixtures`
- `GET /api/v1/fixtures/{fixtureId}`
- `GET /api/v1/markets`
- `GET /api/v1/markets/{marketId}`

Query and contract features now supported:
- `GET /api/v1/markets?fixtureId=<id>&status=<open|suspended|...>`
- `GET /api/v1/fixtures?tournament=<substring>`
- pagination aliases: `page`/`pageSize` and legacy `pagination.currentPage`/`pagination.itemsPerPage`
- sorting aliases: `sortBy`/`sortDir` and legacy `sorting.field`/`sorting.order`
- legacy pagination envelope in list responses:
  - `currentPage`
  - `itemsPerPage`
  - `totalCount`
  - `hasNextPage`
- request validation with structured `bad_request` errors for invalid filters/sort/pagination
- optional file-backed read model source via:
  - `GATEWAY_READ_MODEL_FILE=/abs/path/read-model.json`
- optional SQL-backed read repository mode via:
  - `GATEWAY_READ_REPO_MODE=db`
  - `GATEWAY_DB_DRIVER=postgres` (or another registered `database/sql` driver)
  - `GATEWAY_DB_DSN=<dsn>`

## Files
- `go-platform/services/gateway/internal/domain/types.go`
- `go-platform/services/gateway/internal/domain/repository.go`
- `go-platform/services/gateway/internal/domain/inmemory_repository.go`
- `go-platform/services/gateway/internal/domain/inmemory_repository_test.go`
- `go-platform/services/gateway/internal/domain/file_repository.go`
- `go-platform/services/gateway/internal/domain/file_repository_test.go`
- `go-platform/services/gateway/internal/domain/sql_repository.go`
- `go-platform/services/gateway/internal/domain/sql_repository_test.go`
- `go-platform/services/gateway/internal/http/handlers.go`
- `go-platform/services/gateway/internal/http/market_handlers.go`
- `go-platform/services/gateway/internal/http/handlers_test.go`

## Current Scope
- Repository abstraction is in place for fixtures/markets list and get-by-id.
- Gateway supports both in-memory seed data and file-backed read-model snapshots.
- Gateway now supports SQL-backed repository mode through env selection.
- Public endpoint responses are mapped to legacy Phoenix schema (`fixtureId`, `fixtureName`, `marketStatus`, `selectionOdds`, `sport`, `tournament`, legacy pagination fields).
- Endpoint shapes, filtering, pagination, sorting, and validation behavior are deterministic and contract-test-backed.
- Public contract fixtures are in place for legacy fixtures/markets list responses.
- Error responses use shared `httpx` envelope (from B012).

## Remaining to Complete B014
- None. B014 is complete.

## Validation
```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined
make go-test
```
