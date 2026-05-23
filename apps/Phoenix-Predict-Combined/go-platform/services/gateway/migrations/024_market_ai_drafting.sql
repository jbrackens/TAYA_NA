-- +goose Up
-- 024_market_ai_drafting.sql
-- AI Market Drafting (see docs/ai-market-drafting/IMPLEMENTATION-PLAN.md).
-- Provenance for AI-assisted market creation: the source article (deduped on a
-- SHA-256 of the article text; excerpt + summary only, never the full
-- copyrighted body) and a per-call AI generation log. Markets gain a nullable
-- link to the source article. Append-only; does not edit prior migrations.

CREATE TABLE prediction_article_sources (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url    TEXT,
    source_name   TEXT,
    title         TEXT,
    author        TEXT,
    published_at  TIMESTAMPTZ,
    language      TEXT NOT NULL DEFAULT 'en',
    jurisdiction  JSONB,
    excerpt       TEXT,                 -- short fair-use snippet only
    summary       TEXT,                 -- AI-generated summary
    text_hash     TEXT NOT NULL UNIQUE, -- sha256(article text); dedupe key
    created_by    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prediction_ai_generation_logs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_source_id  UUID REFERENCES prediction_article_sources(id) ON DELETE SET NULL,
    market_id          UUID REFERENCES prediction_markets(id) ON DELETE SET NULL,
    stage              TEXT NOT NULL,        -- 'ingest'|'extract'|'draft'|'risk'|'validate'
    tier               TEXT,                 -- 'routine'|'hard'
    model_provider     TEXT,
    model_name         TEXT,
    inference_endpoint TEXT,
    prompt_version     TEXT,
    input_json         JSONB,                -- redacted/truncated; never the full article body
    output_json        JSONB,
    risk_level         TEXT,
    validator_result   JSONB,
    blocked            BOOLEAN NOT NULL DEFAULT FALSE,
    latency_ms         INTEGER,
    input_tokens       INTEGER,
    output_tokens      INTEGER,
    cost_micros        BIGINT,
    created_by         TEXT,
    request_id         TEXT,
    error_message      TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Postgres does not auto-index foreign keys; these support log lookups by
-- source/market and keep the ON DELETE SET NULL cleanup from scanning.
CREATE INDEX idx_ai_generation_logs_article ON prediction_ai_generation_logs(article_source_id);
CREATE INDEX idx_ai_generation_logs_market ON prediction_ai_generation_logs(market_id);

ALTER TABLE prediction_markets
    ADD COLUMN article_source_id UUID REFERENCES prediction_article_sources(id);

-- +goose Down
ALTER TABLE prediction_markets DROP COLUMN IF EXISTS article_source_id;
DROP TABLE IF EXISTS prediction_ai_generation_logs;
DROP TABLE IF EXISTS prediction_article_sources;
