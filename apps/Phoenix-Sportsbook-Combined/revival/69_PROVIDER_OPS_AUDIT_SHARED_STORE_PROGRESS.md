# Provider Ops Audit Shared Store Progress (SB-104/SB-404 Hardening)

Date: 2026-03-04  
Backlog reference: immediate queue item in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Introduced pluggable provider-ops audit storage backend abstraction:
   - file backend (existing behavior retained)
   - SQL backend (shared durable store mode)
2. Added environment-driven backend selection:
   - `PROVIDER_OPS_AUDIT_STORE_MODE` (`file` default, `db`/`sql`/`postgres`/`shared` for SQL mode)
   - `PROVIDER_OPS_AUDIT_DB_DRIVER` (fallback: `GATEWAY_DB_DRIVER`, default `postgres`)
   - `PROVIDER_OPS_AUDIT_DB_DSN` (fallback: `GATEWAY_DB_DSN`)
   - `PROVIDER_OPS_AUDIT_FILE` for file path override
3. Added SQL schema bootstrap for provider ops audit entries:
   - `provider_ops_audit_log` table
   - indexes on `occurred_at`, `action`, `actor_id`
4. Updated audit read/write flow to use shared backend contract:
   - append writes through selected backend
   - snapshot reads refresh from selected backend (enabling cross-instance visibility in DB mode)
5. Added admin config visibility for audit store mode:
   - `providerOpsAudit.mode`
   - `providerOpsAudit.path` (file mode only)
6. Preserved full backward compatibility with file-store fallback and existing tests.

## Behavior Notes

1. Default behavior remains file-backed local persistence when no SQL store mode is selected.
2. In SQL/shared mode, audit snapshots are loaded from the DB backend, enabling multi-instance shared visibility.
3. If SQL mode is explicitly requested and DB init fails, initialization logs a warning and falls back to file backend to avoid runtime outage.

## Key Files

1. New provider-ops audit backend implementation:
   - `go-platform/services/gateway/internal/http/provider_ops_audit_store.go`
2. Admin route audit integration updates:
   - `go-platform/services/gateway/internal/http/admin_handlers.go`
3. Handler test updates for new store state reset/metadata assertions:
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Remaining

1. Add explicit DB-backed integration test coverage once test driver policy is set for gateway module.
2. Add retention/compaction policy controls for long-lived SQL audit stores.
3. Continue next queue item: dashboard/alerts for offer commit-vs-expire ratio and stale cashout quote rejects.
