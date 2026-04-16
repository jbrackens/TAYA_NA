-- 014_prediction_schema.sql
-- Prediction platform schema: Categories > Series > Events > Markets
-- Replaces sportsbook sports/tournaments/fixtures/markets/selections/bets

BEGIN;

-- Categories replace sports
CREATE TABLE prediction_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    icon        TEXT,
    sort_order  INT DEFAULT 0,
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Series = recurring event template (Kalshi-style)
CREATE TABLE prediction_series (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES prediction_categories(id),
    frequency   TEXT,
    tags        TEXT[] DEFAULT '{}',
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Events = specific occurrence within a series
CREATE TABLE prediction_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id       UUID REFERENCES prediction_series(id),
    title           TEXT NOT NULL,
    description     TEXT,
    category_id     UUID REFERENCES prediction_categories(id),
    status          TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','open','trading_halt','closed','settling','settled','voided')),
    featured        BOOLEAN DEFAULT false,
    open_at         TIMESTAMPTZ,
    close_at        TIMESTAMPTZ NOT NULL,
    settle_at       TIMESTAMPTZ,
    settled_at      TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}',
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Markets = individual binary contract within an event
CREATE TABLE prediction_markets (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                UUID NOT NULL REFERENCES prediction_events(id),
    ticker                  TEXT UNIQUE NOT NULL,
    title                   TEXT NOT NULL,
    description             TEXT,
    status                  TEXT NOT NULL DEFAULT 'unopened'
        CHECK (status IN ('unopened','open','halted','closed','settled','voided')),
    result                  TEXT CHECK (result IN ('yes','no')),
    -- Pricing
    yes_price_cents         INT NOT NULL DEFAULT 50 CHECK (yes_price_cents BETWEEN 1 AND 99),
    no_price_cents          INT NOT NULL DEFAULT 50 CHECK (no_price_cents BETWEEN 1 AND 99),
    last_trade_price_cents  INT,
    volume_cents            BIGINT NOT NULL DEFAULT 0,
    open_interest_cents     BIGINT NOT NULL DEFAULT 0,
    liquidity_cents         BIGINT NOT NULL DEFAULT 0,
    -- AMM state
    amm_yes_shares          NUMERIC(20,8) NOT NULL DEFAULT 0,
    amm_no_shares           NUMERIC(20,8) NOT NULL DEFAULT 0,
    amm_liquidity_param     NUMERIC(20,8) NOT NULL DEFAULT 100,
    amm_subsidy_cents       BIGINT NOT NULL DEFAULT 0,
    -- Settlement source (pre-declared at creation)
    settlement_source_key   TEXT NOT NULL,
    settlement_cutoff_at    TIMESTAMPTZ,
    settlement_rule         TEXT NOT NULL,
    settlement_params       JSONB DEFAULT '{}',
    fallback_source_key     TEXT,
    -- Fee config (per-market, zero-default)
    fee_rate_bps            INT NOT NULL DEFAULT 0,
    maker_rebate_bps        INT NOT NULL DEFAULT 0,
    -- Timestamps
    open_at                 TIMESTAMPTZ,
    close_at                TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now(),
    -- Invariant: yes + no = 100
    CONSTRAINT chk_price_sum CHECK (yes_price_cents + no_price_cents = 100)
);

-- Orders (unified book: YES and NO in one table)
CREATE TABLE prediction_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES punters(id),
    market_id           UUID NOT NULL REFERENCES prediction_markets(id),
    side                TEXT NOT NULL CHECK (side IN ('yes','no')),
    action              TEXT NOT NULL CHECK (action IN ('buy','sell')),
    order_type          TEXT NOT NULL DEFAULT 'market' CHECK (order_type IN ('market','limit')),
    price_cents         INT CHECK (price_cents BETWEEN 1 AND 99),
    quantity            INT NOT NULL CHECK (quantity > 0),
    filled_quantity     INT NOT NULL DEFAULT 0,
    remaining_quantity  INT NOT NULL CHECK (remaining_quantity >= 0),
    total_cost_cents    BIGINT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','open','partial','filled','cancelled','expired')),
    wallet_reservation_id UUID,
    idempotency_key     TEXT UNIQUE,
    expires_at          TIMESTAMPTZ,
    filled_at           TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Positions (net holdings per user per market per side)
CREATE TABLE prediction_positions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES punters(id),
    market_id       UUID NOT NULL REFERENCES prediction_markets(id),
    side            TEXT NOT NULL CHECK (side IN ('yes','no')),
    quantity        INT NOT NULL DEFAULT 0,
    avg_price_cents INT NOT NULL,
    total_cost_cents BIGINT NOT NULL,
    realized_pnl_cents BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, market_id, side)
);

-- Trades (fill log — immutable)
CREATE TABLE prediction_trades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id       UUID NOT NULL REFERENCES prediction_markets(id),
    buy_order_id    UUID REFERENCES prediction_orders(id),
    sell_order_id   UUID REFERENCES prediction_orders(id),
    buyer_id        UUID NOT NULL REFERENCES punters(id),
    seller_id       UUID,
    side            TEXT NOT NULL CHECK (side IN ('yes','no')),
    price_cents     INT NOT NULL,
    quantity        INT NOT NULL,
    fee_cents       INT NOT NULL DEFAULT 0,
    is_amm_trade    BOOLEAN NOT NULL DEFAULT false,
    traded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settlements (resolution records)
CREATE TABLE prediction_settlements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id           UUID NOT NULL REFERENCES prediction_markets(id) UNIQUE,
    result              TEXT NOT NULL CHECK (result IN ('yes','no')),
    attestation_source  TEXT NOT NULL,
    attestation_id      TEXT,
    attestation_digest  TEXT,
    attestation_data    JSONB,
    settled_by          UUID,
    settled_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_payout_cents  BIGINT NOT NULL DEFAULT 0,
    positions_settled   INT NOT NULL DEFAULT 0
);

-- Settlement payouts (per-position)
CREATE TABLE prediction_payouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id   UUID NOT NULL REFERENCES prediction_settlements(id),
    position_id     UUID NOT NULL REFERENCES prediction_positions(id),
    user_id         UUID NOT NULL REFERENCES punters(id),
    market_id       UUID NOT NULL REFERENCES prediction_markets(id),
    side            TEXT NOT NULL,
    quantity        INT NOT NULL,
    entry_price_cents INT NOT NULL,
    exit_price_cents  INT NOT NULL,
    pnl_cents       BIGINT NOT NULL,
    payout_cents    BIGINT NOT NULL,
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Market lifecycle audit log
CREATE TABLE prediction_lifecycle_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id   UUID NOT NULL REFERENCES prediction_markets(id),
    event_type  TEXT NOT NULL,
    actor_id    UUID,
    actor_type  TEXT NOT NULL DEFAULT 'system',
    reason      TEXT,
    metadata    JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bot API keys
CREATE TABLE prediction_api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES punters(id),
    name        TEXT NOT NULL,
    key_hash    TEXT NOT NULL,
    key_prefix  TEXT NOT NULL,
    scopes      TEXT[] NOT NULL DEFAULT '{read}',
    active      BOOLEAN NOT NULL DEFAULT true,
    expires_at  TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pred_series_category ON prediction_series(category_id);
CREATE INDEX idx_pred_events_series ON prediction_events(series_id);
CREATE INDEX idx_pred_events_category ON prediction_events(category_id);
CREATE INDEX idx_pred_events_status ON prediction_events(status);
CREATE INDEX idx_pred_markets_event ON prediction_markets(event_id);
CREATE INDEX idx_pred_markets_status ON prediction_markets(status);
CREATE INDEX idx_pred_markets_ticker ON prediction_markets(ticker);
CREATE INDEX idx_pred_markets_close ON prediction_markets(close_at) WHERE status IN ('open','halted');
CREATE INDEX idx_pred_orders_user ON prediction_orders(user_id);
CREATE INDEX idx_pred_orders_market ON prediction_orders(market_id);
CREATE INDEX idx_pred_orders_status ON prediction_orders(status) WHERE status IN ('pending','open','partial');
CREATE INDEX idx_pred_orders_idempotency ON prediction_orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_pred_positions_user ON prediction_positions(user_id);
CREATE INDEX idx_pred_positions_market ON prediction_positions(market_id);
CREATE INDEX idx_pred_trades_market ON prediction_trades(market_id);
CREATE INDEX idx_pred_trades_time ON prediction_trades(traded_at DESC);
CREATE INDEX idx_pred_settlements_market ON prediction_settlements(market_id);
CREATE INDEX idx_pred_lifecycle_market ON prediction_lifecycle_events(market_id);
CREATE INDEX idx_pred_api_keys_user ON prediction_api_keys(user_id);
CREATE INDEX idx_pred_api_keys_prefix ON prediction_api_keys(key_prefix) WHERE active = true;

-- Seed default categories
INSERT INTO prediction_categories (slug, name, icon, sort_order) VALUES
    ('politics', 'Politics', 'landmark', 1),
    ('crypto', 'Crypto', 'bitcoin', 2),
    ('sports', 'Sports', 'trophy', 3),
    ('entertainment', 'Entertainment', 'film', 4),
    ('tech', 'Technology', 'cpu', 5),
    ('economics', 'Economics', 'trending-up', 6);

COMMIT;
