# SB-403 Wallet Correction Workflow Progress

Date: 2026-03-05  
Backlog reference: `SB-403` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added correction-task domain model to wallet service:
   - task lifecycle: `open` -> `resolved`
   - task types: `negative_balance`, `ledger_drift`, `manual_review`
   - scanner generation + manual create + operator resolve.
2. Added admin correction-task APIs (legacy + `/api/v1` paths):
   - `GET /api/v1/admin/wallet/corrections/tasks`
   - `POST /api/v1/admin/wallet/corrections/tasks`
   - `POST /api/v1/admin/wallet/corrections/tasks/{taskId}/resolve`
3. Added optional correction mutation during resolve:
   - `adjustmentType=credit|debit` with idempotency support.
4. Added correction-task summary payload for backoffice consumption:
   - open/resolved/type counters + suggested adjustment aggregate.

## Key Files

1. Wallet correction model and scanner:
   - `go-platform/services/gateway/internal/wallet/service.go`
   - `go-platform/services/gateway/internal/wallet/service_test.go`
2. Admin correction handlers:
   - `go-platform/services/gateway/internal/http/admin_wallet_corrections.go`
   - `go-platform/services/gateway/internal/http/admin_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/wallet ./internal/http -run 'TestManualCorrectionTaskLifecycle|TestAdminWalletCorrectionTaskWorkflow'`
   - pass

## Remaining

1. None for SB-403 scope in this execution slice.
