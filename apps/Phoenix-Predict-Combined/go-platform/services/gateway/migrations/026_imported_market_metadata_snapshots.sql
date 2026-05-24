-- +goose Up
-- Keep source provenance and hourly price snapshots private to the importer.
-- Public APIs continue to expose only our own market IDs, image paths, and
-- normalized market copy.

ALTER TABLE imported_markets
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS upstream_status TEXT,
    ADD COLUMN IF NOT EXISTS upstream_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rules_text TEXT,
    ADD COLUMN IF NOT EXISTS event_group TEXT,
    ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS volume_24h NUMERIC(20,4) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS liquidity NUMERIC(20,4) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS imported_market_price_snapshots (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imported_market_id UUID NOT NULL REFERENCES imported_markets(id) ON DELETE CASCADE,
    external_hash      TEXT NOT NULL,
    prices             JSONB NOT NULL DEFAULT '[]'::jsonb,
    volume             NUMERIC(20,4) NOT NULL DEFAULT 0,
    volume_24h         NUMERIC(20,4) NOT NULL DEFAULT 0,
    liquidity          NUMERIC(20,4) NOT NULL DEFAULT 0,
    upstream_status    TEXT,
    observed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imported_market_snapshots_market_time
    ON imported_market_price_snapshots (imported_market_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_imported_market_snapshots_hash_time
    ON imported_market_price_snapshots (external_hash, observed_at DESC);

-- +goose Down
DROP TABLE IF EXISTS imported_market_price_snapshots;

ALTER TABLE imported_markets
    DROP COLUMN IF EXISTS liquidity,
    DROP COLUMN IF EXISTS volume_24h,
    DROP COLUMN IF EXISTS tags,
    DROP COLUMN IF EXISTS event_group,
    DROP COLUMN IF EXISTS rules_text,
    DROP COLUMN IF EXISTS upstream_updated_at,
    DROP COLUMN IF EXISTS upstream_status,
    DROP COLUMN IF EXISTS source_url;
