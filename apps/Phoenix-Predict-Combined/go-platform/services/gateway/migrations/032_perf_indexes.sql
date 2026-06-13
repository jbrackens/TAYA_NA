-- 032_perf_indexes.sql
-- Audit PERF-02: three indexes for hot read paths that currently scan.
--
-- NOTE ON CONCURRENCY: these are plain CREATE INDEX (transactional, brief
-- write lock). At current table sizes the lock is sub-second. For a large
-- live ledger, re-issue these as CREATE INDEX CONCURRENTLY in a NO TRANSACTION
-- migration instead — see the zero-downtime note in docs/audit/IMPROVEMENT_PLAN.md
-- (P1-09). Kept transactional here so the migration stays goose-standard and
-- the fresh-DB CI job (G-03) runs it in one tx.

-- +goose Up

-- (1) Expression index for the per-market LEFT JOIN LATERAL in
--     marketSelectQuery: `upper(substr(external_hash,1,8)) = upper(substr(m.ticker,5,8))`.
--     Without it, every market list / discovery / worker read re-scans
--     imported_markets once per output row (O(markets x imported_markets)).
CREATE INDEX IF NOT EXISTS idx_imported_markets_hash8
    ON imported_markets ((upper(substr(external_hash, 1, 8))));

-- (2) wallet_ledger is created in code (internal/wallet/service.go), not by a
--     goose migration, so it may not exist yet on a fresh DB at migration
--     time. The code path also creates this same index (kept in sync); here we
--     guard on table existence so existing deploys (where the gateway already
--     created wallet_ledger) get the index via migration too. The read
--     `WHERE user_id=$1 ORDER BY id DESC` otherwise seq-scans the busiest
--     append-only table on every /wallet/{id}/ledger request.
-- +goose StatementBegin
DO $$
BEGIN
    IF to_regclass('public.wallet_ledger') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_id
            ON wallet_ledger (user_id, id DESC);
    END IF;
END $$;
-- +goose StatementEnd

-- (3) Public discovery sorts open markets by volume: only a single-column
--     status index exists, so featured/trending load-all-open then top-N sort.
CREATE INDEX IF NOT EXISTS idx_pred_markets_status_volume
    ON prediction_markets (status, volume_cents DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_pred_markets_status_volume;
DROP INDEX IF EXISTS idx_wallet_ledger_user_id;
DROP INDEX IF EXISTS idx_imported_markets_hash8;
