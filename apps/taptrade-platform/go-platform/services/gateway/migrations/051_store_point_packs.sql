-- +goose Up
-- Point Store (STORE_AND_PAYMENTS.md §2/§4): purchasable point-pack catalogue,
-- purchase state machine, and append-only provider-event evidence. New tables,
-- goose-owned (unlike the app-owned wallet tables) — no app schema conflicts.
--
-- price_usd_cents deliberately keeps the cash-honest column naming from the
-- migration-050 precedent for genuine purchase-price columns; point amounts
-- stay in *_points columns and are never mixed with the price column.

CREATE TABLE store_point_packs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_usd_cents BIGINT NOT NULL CHECK (price_usd_cents > 0),
    base_points BIGINT NOT NULL CHECK (base_points > 0),
    bonus_points BIGINT NOT NULL DEFAULT 0 CHECK (bonus_points >= 0),
    display_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    badge TEXT,
    intro_only BOOLEAN NOT NULL DEFAULT FALSE,
    promo_starts_at TIMESTAMPTZ,
    promo_ends_at TIMESTAMPTZ,
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE store_purchases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pack_id TEXT NOT NULL REFERENCES store_point_packs(id),
    -- Immutable server-resolved snapshot of the pack at checkout time. The
    -- client supplies only packId; these columns are the amounts that settle.
    price_usd_cents BIGINT NOT NULL CHECK (price_usd_cents > 0),
    base_points BIGINT NOT NULL CHECK (base_points > 0),
    bonus_points BIGINT NOT NULL CHECK (bonus_points >= 0),
    -- pending_payment -> completed | failed | canceled; terminal states final.
    status TEXT NOT NULL DEFAULT 'pending_payment'
        CHECK (status IN ('pending_payment', 'completed', 'failed', 'canceled')),
    provider TEXT NOT NULL,
    provider_session_id TEXT,
    client_idempotency_key TEXT NOT NULL,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    -- Double-submitted checkout POSTs return the same purchase row.
    CONSTRAINT store_purchases_client_key_unique UNIQUE (user_id, client_idempotency_key)
);

CREATE INDEX idx_store_purchases_user ON store_purchases (user_id, created_at DESC);
CREATE INDEX idx_store_purchases_status ON store_purchases (status);

-- Append-only provider-event evidence: confirmation calls, provider callbacks,
-- and replays. provider_event_id is unique when present so a replayed provider
-- event inserts at most one evidence row.
CREATE TABLE store_payment_events (
    id BIGSERIAL PRIMARY KEY,
    purchase_id TEXT NOT NULL REFERENCES store_purchases(id),
    event_type TEXT NOT NULL,
    provider_event_id TEXT,
    signature_valid BOOLEAN NOT NULL DEFAULT TRUE,
    payload TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_store_payment_events_provider_event
    ON store_payment_events (provider_event_id)
    WHERE provider_event_id IS NOT NULL;
CREATE INDEX idx_store_payment_events_purchase ON store_payment_events (purchase_id);

-- Seed catalogue (STORE_AND_PAYMENTS.md §3). Prices are integer cents.
-- Operators change the catalogue with plain UPDATE/INSERT rows.
INSERT INTO store_point_packs
    (id, name, price_usd_cents, base_points, bonus_points, display_order, active, badge, intro_only)
VALUES
    ('starter',     'Starter',     500,   500,   0,    1, TRUE, 'Starter',    FALSE),
    ('player',      'Player',      1000,  1000,  50,   2, TRUE, NULL,         FALSE),
    ('popular',     'Popular',     2500,  2500,  250,  3, TRUE, 'Popular',    FALSE),
    ('pro',         'Pro',         5000,  5000,  750,  4, TRUE, 'Best Value', FALSE),
    ('high_roller', 'High Roller', 10000, 10000, 2000, 5, TRUE, NULL,         FALSE)
ON CONFLICT (id) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS store_payment_events;
DROP TABLE IF EXISTS store_purchases;
DROP TABLE IF EXISTS store_point_packs;
