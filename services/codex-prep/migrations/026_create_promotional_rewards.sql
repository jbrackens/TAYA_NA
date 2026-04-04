CREATE TABLE IF NOT EXISTS freebets (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents > 0),
    remaining_amount_cents INTEGER NOT NULL CHECK (remaining_amount_cents >= 0 AND remaining_amount_cents <= total_amount_cents),
    min_odds_decimal NUMERIC(10,2),
    applies_to_sport_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    applies_to_tournament_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_freebets_user_status ON freebets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_freebets_expires_at ON freebets(expires_at);

CREATE TABLE IF NOT EXISTS odds_boosts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT,
    market_id VARCHAR(128) NOT NULL,
    selection_id VARCHAR(128) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    original_odds NUMERIC(10,3) NOT NULL,
    boosted_odds NUMERIC(10,3) NOT NULL,
    max_stake_cents INTEGER,
    min_odds_decimal NUMERIC(10,2),
    status VARCHAR(32) NOT NULL DEFAULT 'available',
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accept_request_id VARCHAR(128),
    accept_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_odds_boosts_user_status ON odds_boosts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_odds_boosts_market_status ON odds_boosts(market_id, status);
CREATE INDEX IF NOT EXISTS idx_odds_boosts_expires_at ON odds_boosts(expires_at);
