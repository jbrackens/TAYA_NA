-- Phoenix Platform Database Migrations
-- Migration: 018_create_prediction.sql
-- Purpose: Create prediction market categories, markets, outcomes, orders, and lifecycle history
-- Dependencies: 002_create_users.sql, 003_create_wallets.sql, 010_create_event_store.sql
-- Date: 2026-03-10

-- Up
CREATE TYPE prediction_market_status AS ENUM ('draft', 'open', 'live', 'suspended', 'closed', 'resolved', 'cancelled');
CREATE TYPE prediction_order_status AS ENUM ('open', 'cancelled', 'won', 'lost', 'voided');
CREATE TYPE prediction_lifecycle_action AS ENUM (
    'market_created',
    'market_suspended',
    'market_reopened',
    'market_cancelled',
    'market_resolved',
    'market_resettled'
);

CREATE TABLE prediction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(64) NOT NULL UNIQUE,
    label VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    accent VARCHAR(32) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prediction_markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES prediction_categories(id) ON DELETE RESTRICT,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    short_title VARCHAR(160) NOT NULL,
    summary TEXT NOT NULL,
    insight TEXT NOT NULL,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    resolution_source VARCHAR(255) NOT NULL,
    hero_metric_label VARCHAR(64) NOT NULL,
    hero_metric_value VARCHAR(64) NOT NULL,
    status prediction_market_status NOT NULL DEFAULT 'open',
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    live BOOLEAN NOT NULL DEFAULT FALSE,
    closes_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolves_at TIMESTAMP WITH TIME ZONE NOT NULL,
    volume_usd NUMERIC(18,2) NOT NULL DEFAULT 0,
    liquidity_usd NUMERIC(18,2) NOT NULL DEFAULT 0,
    participants INTEGER NOT NULL DEFAULT 0,
    probability_percent INTEGER NOT NULL DEFAULT 0,
    price_change_percent NUMERIC(10,2) NOT NULL DEFAULT 0,
    winning_outcome_id UUID,
    settlement_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prediction_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
    label VARCHAR(128) NOT NULL,
    price_cents INTEGER NOT NULL,
    change_1d NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(64) NOT NULL DEFAULT 'active',
    result outcome_result NOT NULL DEFAULT 'pending',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_prediction_price_cents CHECK (price_cents > 0 AND price_cents < 100)
);

ALTER TABLE prediction_markets
    ADD CONSTRAINT fk_prediction_markets_winning_outcome
    FOREIGN KEY (winning_outcome_id) REFERENCES prediction_outcomes(id) ON DELETE SET NULL;

CREATE TABLE prediction_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE RESTRICT,
    outcome_id UUID NOT NULL REFERENCES prediction_outcomes(id) ON DELETE RESTRICT,
    category_key VARCHAR(64) NOT NULL,
    stake_usd NUMERIC(18,2) NOT NULL,
    price_cents INTEGER NOT NULL,
    shares NUMERIC(18,4) NOT NULL,
    max_payout_usd NUMERIC(18,2) NOT NULL,
    max_profit_usd NUMERIC(18,2) NOT NULL,
    status prediction_order_status NOT NULL DEFAULT 'open',
    reservation_id UUID,
    placed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    settled_at TIMESTAMP WITH TIME ZONE,
    settlement_result VARCHAR(64),
    settlement_pnl NUMERIC(18,2),
    settlement_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prediction_market_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
    action prediction_lifecycle_action NOT NULL,
    market_status_before prediction_market_status NOT NULL,
    market_status_after prediction_market_status NOT NULL,
    outcome_id UUID REFERENCES prediction_outcomes(id) ON DELETE SET NULL,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prediction_categories_sort_order ON prediction_categories(sort_order);
CREATE INDEX idx_prediction_markets_category_id ON prediction_markets(category_id);
CREATE INDEX idx_prediction_markets_status ON prediction_markets(status);
CREATE INDEX idx_prediction_markets_featured ON prediction_markets(featured);
CREATE INDEX idx_prediction_markets_live ON prediction_markets(live);
CREATE INDEX idx_prediction_markets_closes_at ON prediction_markets(closes_at);
CREATE INDEX idx_prediction_outcomes_market_id ON prediction_outcomes(market_id);
CREATE INDEX idx_prediction_orders_user_id ON prediction_orders(user_id);
CREATE INDEX idx_prediction_orders_market_id ON prediction_orders(market_id);
CREATE INDEX idx_prediction_orders_status ON prediction_orders(status);
CREATE INDEX idx_prediction_orders_category_key ON prediction_orders(category_key);
CREATE INDEX idx_prediction_orders_placed_at ON prediction_orders(placed_at DESC);
CREATE INDEX idx_prediction_orders_reservation_id ON prediction_orders(reservation_id);
CREATE INDEX idx_prediction_lifecycle_market_id ON prediction_market_lifecycle_events(market_id, created_at DESC);

INSERT INTO prediction_categories (id, key, label, description, accent, sort_order) VALUES
    ('1b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec0001', 'crypto', 'Crypto', 'Bitcoin, Solana, ETFs, and crypto catalysts.', '#00d4aa', 10),
    ('1b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec0002', 'politics', 'Politics', 'Elections, legislation, and government risk.', '#4f8cff', 20),
    ('1b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec0003', 'macro', 'Macro', 'Rates, inflation, and market-moving macro calls.', '#ffb020', 30)
ON CONFLICT (key) DO NOTHING;

INSERT INTO prediction_markets (
    id, category_id, slug, title, short_title, summary, insight, rules, tags, resolution_source,
    hero_metric_label, hero_metric_value, status, featured, live, closes_at, resolves_at,
    volume_usd, liquidity_usd, participants, probability_percent, price_change_percent, created_at, updated_at
) VALUES
    (
        '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1001',
        '1b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec0001',
        'bitcoin-120k-before-2026-close',
        'Will Bitcoin trade above $120k before December 31, 2026?',
        'BTC above $120k in 2026',
        'A flagship crypto market tracking whether Bitcoin prints above the $120k threshold before year-end.',
        'Momentum accelerated after ETF inflows returned and perpetual funding normalized.',
        '["Resolves YES if a reputable reference source prints BTC/USD above 120,000.00 before market close.","If the threshold is never printed before the close timestamp, the market resolves NO."]'::jsonb,
        '["Featured","Live","Crypto"]'::jsonb,
        'Composite BTC/USD reference basket',
        'Implied YES',
        '62%',
        'live',
        TRUE,
        TRUE,
        '2026-12-31T23:00:00Z',
        '2026-12-31T23:59:00Z',
        4825000,
        965000,
        1842,
        62,
        8.40,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1002',
        '1b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec0002',
        'us-government-shutdown-before-q3-2026-end',
        'Will the U.S. government enter a shutdown before September 30, 2026?',
        'U.S. shutdown before Q3 end',
        'A live policy-risk market following congressional budget negotiations and shutdown risk.',
        'Spreads widened after the latest fiscal hawk bloc rejected the continuing resolution.',
        '["Resolves YES if a federal government shutdown begins before the close timestamp.","Temporary funding extensions without shutdown resolve NO at expiry."]'::jsonb,
        '["Live","Politics"]'::jsonb,
        'Official federal operations notices',
        'Shutdown risk',
        '47%',
        'live',
        FALSE,
        TRUE,
        '2026-09-30T23:00:00Z',
        '2026-09-30T23:59:00Z',
        2130000,
        442000,
        1114,
        47,
        5.80,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1003',
        '1b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec0003',
        'fed-cuts-rates-before-july-2026-meeting',
        'Will the Fed cut rates before the July 2026 meeting?',
        'Fed cut before July 2026',
        'A macro flagship market that prices the next pivot in Fed policy.',
        'Softening payroll revisions tightened the curve and pulled YES into the lead.',
        '["Resolves YES if the target range is lowered before the July 2026 meeting concludes.","A hold or hike resolves NO."]'::jsonb,
        '["Featured","Macro"]'::jsonb,
        'FOMC statement',
        'Cut probability',
        '58%',
        'open',
        TRUE,
        FALSE,
        '2026-07-28T18:00:00Z',
        '2026-07-29T00:00:00Z',
        3280000,
        610000,
        1368,
        58,
        2.60,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO prediction_outcomes (id, market_id, label, price_cents, change_1d, status, result, sort_order) VALUES
    ('3b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec2001', '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1001', 'Yes', 62, 4.20, 'active', 'pending', 10),
    ('3b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec2002', '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1001', 'No', 38, -4.20, 'active', 'pending', 20),
    ('3b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec2003', '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1002', 'Yes', 47, 2.90, 'active', 'pending', 10),
    ('3b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec2004', '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1002', 'No', 53, -2.90, 'active', 'pending', 20),
    ('3b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec2005', '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1003', 'Yes', 58, 1.30, 'active', 'pending', 10),
    ('3b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec2006', '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1003', 'No', 42, -1.30, 'active', 'pending', 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO prediction_market_lifecycle_events (id, market_id, action, market_status_before, market_status_after, reason, created_at) VALUES
    ('4b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec3001', '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1001', 'market_created', 'draft', 'live', 'seeded market', CURRENT_TIMESTAMP),
    ('4b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec3002', '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1002', 'market_created', 'draft', 'live', 'seeded market', CURRENT_TIMESTAMP),
    ('4b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec3003', '2b20d2f6-9d5f-4e3c-bcfe-a9d0f1ec1003', 'market_created', 'draft', 'open', 'seeded market', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Down
DROP TABLE IF EXISTS prediction_market_lifecycle_events CASCADE;
DROP TABLE IF EXISTS prediction_orders CASCADE;
ALTER TABLE prediction_markets DROP CONSTRAINT IF EXISTS fk_prediction_markets_winning_outcome;
DROP TABLE IF EXISTS prediction_outcomes CASCADE;
DROP TABLE IF EXISTS prediction_markets CASCADE;
DROP TABLE IF EXISTS prediction_categories CASCADE;
DROP TYPE IF EXISTS prediction_lifecycle_action CASCADE;
DROP TYPE IF EXISTS prediction_order_status CASCADE;
DROP TYPE IF EXISTS prediction_market_status CASCADE;
