-- +goose Up
-- Track source freshness for imported markets. These fields stay private to
-- the importer; public market APIs continue to expose only Hula Na market data.

ALTER TABLE imported_markets
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS missing_since TIMESTAMPTZ;

UPDATE imported_markets
   SET last_seen_at = COALESCE(last_seen_at, updated_at, created_at)
 WHERE last_seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_imported_markets_missing_since
    ON imported_markets (missing_since)
    WHERE missing_since IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_imported_markets_end_time
    ON imported_markets (end_time)
    WHERE end_time IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_imported_markets_end_time;
DROP INDEX IF EXISTS idx_imported_markets_missing_since;

ALTER TABLE imported_markets
    DROP COLUMN IF EXISTS missing_since,
    DROP COLUMN IF EXISTS last_seen_at;
