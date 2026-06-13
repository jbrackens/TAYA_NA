-- Migration 010: Event Store for PostgreSQL-backed Event Sourcing
-- Replaces Akka Persistence — all stateful services use this pattern
-- for wallet transactions, bet lifecycle, market state, etc.

-- ============================================================
-- EVENT STORE TABLE
-- Append-only log of domain events with optimistic concurrency
-- ============================================================
CREATE TABLE IF NOT EXISTS event_store (
    id              BIGSERIAL PRIMARY KEY,
    aggregate_type  VARCHAR(100)    NOT NULL,   -- e.g., 'wallet', 'bet', 'market'
    aggregate_id    UUID            NOT NULL,   -- the entity this event belongs to
    event_type      VARCHAR(200)    NOT NULL,   -- e.g., 'WalletCredited', 'BetPlaced', 'MarketSettled'
    version         INTEGER         NOT NULL,   -- monotonically increasing per aggregate
    payload         JSONB           NOT NULL,   -- full event data
    metadata        JSONB           DEFAULT '{}',  -- correlation_id, causation_id, user_id, etc.
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Optimistic concurrency: no two events for the same aggregate can have the same version
    CONSTRAINT uq_aggregate_version UNIQUE (aggregate_type, aggregate_id, version)
);

-- Fast lookups: replay events for a specific aggregate
CREATE INDEX idx_event_store_aggregate
    ON event_store (aggregate_type, aggregate_id, version ASC);

-- Fast lookups: find events by type (for projections/read models)
CREATE INDEX idx_event_store_event_type
    ON event_store (event_type, created_at DESC);

-- Fast lookups: time-based queries for audit/debugging
CREATE INDEX idx_event_store_created_at
    ON event_store (created_at DESC);

-- ============================================================
-- SNAPSHOTS TABLE
-- Periodic snapshots to avoid replaying entire event history
-- ============================================================
CREATE TABLE IF NOT EXISTS event_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    aggregate_type  VARCHAR(100)    NOT NULL,
    aggregate_id    UUID            NOT NULL,
    version         INTEGER         NOT NULL,   -- the event version this snapshot represents
    state           JSONB           NOT NULL,   -- serialized aggregate state at this version
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- One snapshot per aggregate per version
    CONSTRAINT uq_snapshot_version UNIQUE (aggregate_type, aggregate_id, version)
);

-- Fast lookup: find latest snapshot for an aggregate
CREATE INDEX idx_snapshot_latest
    ON event_snapshots (aggregate_type, aggregate_id, version DESC);

-- ============================================================
-- OUTBOX TABLE (Transactional Outbox Pattern)
-- Ensures events are published to Kafka exactly once
-- Write event + outbox row in same DB transaction
-- Background worker polls outbox and publishes to Kafka
-- ============================================================
CREATE TABLE IF NOT EXISTS event_outbox (
    id              BIGSERIAL PRIMARY KEY,
    aggregate_type  VARCHAR(100)    NOT NULL,
    aggregate_id    UUID            NOT NULL,
    event_type      VARCHAR(200)    NOT NULL,
    payload         JSONB           NOT NULL,
    kafka_topic     VARCHAR(200)    NOT NULL,   -- target Kafka topic
    kafka_key       VARCHAR(200),               -- partition key (usually aggregate_id)
    published       BOOLEAN         NOT NULL DEFAULT FALSE,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    retry_count     INTEGER         NOT NULL DEFAULT 0,
    last_error      TEXT
);

-- Worker polls for unpublished events ordered by creation
CREATE INDEX idx_outbox_unpublished
    ON event_outbox (published, created_at ASC)
    WHERE published = FALSE;

-- Cleanup: find old published events for archival
CREATE INDEX idx_outbox_published_at
    ON event_outbox (published_at)
    WHERE published = TRUE;

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE event_store IS 'Append-only event log for domain event sourcing. Each row is an immutable fact about something that happened.';
COMMENT ON TABLE event_snapshots IS 'Periodic state snapshots to optimize event replay performance. Created every N events per aggregate.';
COMMENT ON TABLE event_outbox IS 'Transactional outbox for reliable Kafka event publishing. Ensures at-least-once delivery with deduplication.';
COMMENT ON COLUMN event_store.version IS 'Monotonically increasing version per (aggregate_type, aggregate_id). Used for optimistic concurrency control.';
COMMENT ON COLUMN event_store.metadata IS 'Correlation and causation IDs for distributed tracing, plus actor/user context.';
