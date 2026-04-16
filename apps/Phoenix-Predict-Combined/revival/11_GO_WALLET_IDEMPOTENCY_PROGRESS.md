# Go Wallet Idempotency API Progress (B016)

Date: 2026-03-02

## Delivered

Implemented wallet mutation APIs in gateway with idempotency-key enforcement and dual persistence modes.

### Wallet Endpoints
- `POST /api/v1/wallet/credit`
- `POST /api/v1/wallet/debit`
- `GET /api/v1/wallet/{userId}`
- `GET /api/v1/wallet/{userId}/ledger`
- `GET /api/v1/admin/wallet/reconciliation`
- `POST /api/v1/admin/wallet/credit`
- `POST /api/v1/admin/wallet/debit`

### Behavior
- Credits and debits mutate per-user wallet balance.
- Mutations require:
  - `userId`
  - `amountCents > 0`
  - `idempotencyKey`
- Idempotent replay returns the original ledger entry and does not apply mutation twice.
- Idempotent replay with mismatched payload now returns conflict semantics.
- Debit without sufficient funds returns structured `forbidden` error.
- Ledger endpoint returns recorded entries for wallet mutation history.
- Optional persisted wallet state:
  - `WALLET_LEDGER_FILE=/abs/path/wallet-state.json`
  - balances, ledger entries, idempotency map, and sequence are reloaded on startup.
- Optional DB-backed wallet store mode:
  - `WALLET_STORE_MODE=db`
  - `WALLET_DB_DRIVER=postgres` (or another registered `database/sql` driver)
  - `WALLET_DB_DSN=<dsn>`
  - transactional mutation flow with schema bootstrapping (`wallet_balances`, `wallet_ledger`)
- Reconciliation hook:
  - admin reconciliation summary endpoint aggregates credits/debits/net movement
  - supports optional RFC3339 `from` / `to` range filtering

## Files
- `go-platform/services/gateway/internal/wallet/service.go`
- `go-platform/services/gateway/internal/wallet/service_test.go`
- `go-platform/services/gateway/internal/http/wallet_handlers.go`
- `go-platform/services/gateway/internal/http/wallet_handlers_test.go`
- `go-platform/services/gateway/internal/http/admin_handlers.go`
- `go-platform/services/gateway/internal/http/handlers.go`
- `go-platform/modules/platform/transport/httpx/errors.go`

## Follow-Ups
- Add strict operational migration path from file store to DB store for local/dev data portability.
- Add exportable reconciliation report artifacts for automated B021 checks.

## Validation
```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined
make go-test
```
