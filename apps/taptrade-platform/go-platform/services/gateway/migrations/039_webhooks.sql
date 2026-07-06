-- 039_webhooks.sql
-- P3-03 (outbound webhooks): a durable registry of partner receiver endpoints
-- plus a delivery outbox. Events are enqueued post-commit (the same seam the WS
-- notifier fires on); a background dispatch worker claims due rows, POSTs the
-- HMAC-signed event, and either marks them delivered, reschedules with
-- exponential backoff (transient 5xx / 429 / timeout), or dead-letters
-- (permanent 4xx, or attempts exhausted).
--
-- Endpoints belong to a partner — a punter holding API keys — mirroring
-- prediction_api_keys.user_id. v1 audience is "subscribe by event TYPE"
-- (firehose); per-partner / per-tenant scoping is deferred to the tenancy epic
-- (P3-01) and intentionally NOT guessed here.
--
-- Additive + re-runnable (IF NOT EXISTS); no backfill.

-- +goose Up
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL REFERENCES punters(id),
    url         TEXT NOT NULL,
    secret      TEXT NOT NULL,                 -- HMAC signing secret (shared w/ partner)
    events      TEXT[] NOT NULL DEFAULT '{}',  -- subscribed event types; empty = all
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user ON webhook_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(active) WHERE active = true;

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- delivery id == X-TNA-Delivery-Id
    endpoint_id      UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event_type       TEXT NOT NULL,
    payload          JSONB NOT NULL,                              -- the event "data" object
    status           TEXT NOT NULL DEFAULT 'pending',             -- pending | delivered | failed
    attempts         INT NOT NULL DEFAULT 0,
    next_attempt_at  TIMESTAMPTZ NOT NULL DEFAULT now(),          -- worker visibility / backoff clock
    last_status_code INT,
    last_error       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at     TIMESTAMPTZ,
    CONSTRAINT webhook_deliveries_status_chk CHECK (status IN ('pending', 'delivered', 'failed'))
);

-- The dispatcher's hot path: claim pending rows whose backoff has elapsed,
-- oldest first. Partial index stays tight as delivered/failed rows accumulate.
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_due
    ON webhook_deliveries (next_attempt_at)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries (endpoint_id);

-- +goose Down
DROP TABLE IF EXISTS webhook_deliveries CASCADE;
DROP TABLE IF EXISTS webhook_endpoints CASCADE;
