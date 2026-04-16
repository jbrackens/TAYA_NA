# Go Backoffice Admin Read API Progress (B015)

Date: 2026-03-02

## Delivered

Implemented initial backoffice admin read endpoints in gateway with both legacy-style and `/api/v1` prefixed paths.

### Admin Trading Endpoints
- `GET /admin/trading/fixtures`
- `GET /admin/trading/fixtures/{fixtureId}`
- `GET /admin/trading/markets`
- `GET /admin/trading/markets/{marketId}`
- `GET /api/v1/admin/trading/fixtures`
- `GET /api/v1/admin/trading/fixtures/{fixtureId}`
- `GET /api/v1/admin/trading/markets`
- `GET /api/v1/admin/trading/markets/{marketId}`

### Admin Punter Endpoints
- `GET /admin/punters`
- `GET /admin/punters/{punterId}`
- `GET /api/v1/admin/punters`
- `GET /api/v1/admin/punters/{punterId}`

### Admin Utility Endpoints
- `GET /admin/audit-logs`
- `GET /api/v1/admin/audit-logs`
- `GET /admin/config`
- `GET /api/v1/admin/config`
- `GET /admin/wallet/reconciliation`
- `GET /api/v1/admin/wallet/reconciliation`
- `POST /admin/wallet/credit`
- `POST /api/v1/admin/wallet/credit`
- `POST /admin/wallet/debit`
- `POST /api/v1/admin/wallet/debit`

### Behavior
- Reuses shared repository abstraction from B014.
- Admin guard enforced by default:
  - request must include `X-Admin-Role: admin`
  - optional local bypass: `GATEWAY_ALLOW_ADMIN_ANON=true`
- Supports the same list-query features as public read APIs:
  - filtering (`fixtureId`, `status`, `tournament`)
  - pagination (`page`, `pageSize`)
  - sorting (`sortBy`, `sortDir`)
- Punter list adds `search` and `status` filters.
- Audit-log list adds `action` and `actorId` filters.
- Wallet reconciliation endpoint supports optional `from`/`to` RFC3339 filters.
- Uses shared `httpx` error envelope and method validation.

## Files
- `go-platform/services/gateway/internal/http/admin_handlers.go`
- `go-platform/services/gateway/internal/domain/types.go`
- `go-platform/services/gateway/internal/domain/repository.go`
- `go-platform/services/gateway/internal/domain/inmemory_repository.go`
- `go-platform/services/gateway/internal/domain/file_repository.go`
- `go-platform/services/gateway/internal/http/handlers.go`
- `go-platform/services/gateway/internal/http/handlers_test.go`

## Follow-Ups
- Expand endpoint coverage to additional backoffice domains as needed (notes, reports, fraud workflows).
- Continue refining response schema parity with real Talon payload examples.

## Validation
```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined
make go-test
```
