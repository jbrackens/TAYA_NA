-- +goose Up
-- Server-side cache for machine-generated market translations.
--
-- prediction_markets.translations remains the public API field consumed by the
-- player app. This table records generation provenance and freshness so the
-- importer/backfill job can regenerate only when the canonical English copy
-- changes, while manual translations without a cache row are left untouched.

CREATE TABLE IF NOT EXISTS prediction_market_translation_cache (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id         UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
    locale            TEXT NOT NULL,
    source_hash       TEXT NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT NOT NULL DEFAULT '',
    provider          TEXT NOT NULL DEFAULT '',
    model             TEXT NOT NULL DEFAULT '',
    prompt_version    TEXT NOT NULL,
    machine_generated BOOLEAN NOT NULL DEFAULT TRUE,
    reviewed          BOOLEAN NOT NULL DEFAULT FALSE,
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (market_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_prediction_market_translation_cache_locale
    ON prediction_market_translation_cache (locale);

CREATE INDEX IF NOT EXISTS idx_prediction_market_translation_cache_freshness
    ON prediction_market_translation_cache (market_id, locale, source_hash);

-- +goose Down
DROP TABLE IF EXISTS prediction_market_translation_cache;
