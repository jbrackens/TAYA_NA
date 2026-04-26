-- +goose Up
-- 017_imported_markets.sql
-- Phase 1 demo catalog. Markets pulled from external feeds and re-served
-- under our own UUIDs and image paths. Powers GET /api/v1/discover.
--
-- Internal table — never exposed by name in any API response. The unified
-- shape (title/description/image_path/end_time/volume/outcomes/prices) is the
-- only contract clients see. Source identity stays inside `external_hash`,
-- which is a SHA-256 digest, not a readable string.

CREATE TABLE imported_markets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_hash   TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    description     TEXT,
    image_path      TEXT,
    end_time        TIMESTAMPTZ,
    volume          NUMERIC(20,4) NOT NULL DEFAULT 0,
    outcomes        JSONB NOT NULL DEFAULT '[]'::jsonb,
    prices          JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_imported_markets_volume_desc ON imported_markets (volume DESC, id DESC);

-- +goose Down
DROP TABLE IF EXISTS imported_markets;
