-- +goose Up
CREATE TABLE freebets (
    id VARCHAR(255) PRIMARY KEY,
    punter_id VARCHAR(255) NOT NULL REFERENCES punters(id) ON DELETE CASCADE,
    amount_cents BIGINT NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'GBP',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    bet_id VARCHAR(255) REFERENCES bets(id) ON DELETE SET NULL,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE odds_boosts (
    id VARCHAR(255) PRIMARY KEY,
    market_id VARCHAR(255) NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    selection_id VARCHAR(255) REFERENCES selections(id) ON DELETE SET NULL,
    boost_percentage NUMERIC(5, 2) NOT NULL,
    original_odds NUMERIC(10, 4),
    boosted_odds NUMERIC(10, 4),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    active_from TIMESTAMP WITH TIME ZONE NOT NULL,
    active_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_freebets_punter_id ON freebets(punter_id);
CREATE INDEX idx_freebets_status ON freebets(status);
CREATE INDEX idx_freebets_expires_at ON freebets(expires_at);
CREATE INDEX idx_odds_boosts_market_id ON odds_boosts(market_id);
CREATE INDEX idx_odds_boosts_status ON odds_boosts(status);
CREATE INDEX idx_odds_boosts_active_from ON odds_boosts(active_from);

-- +goose Down
DROP TABLE IF EXISTS odds_boosts;
DROP TABLE IF EXISTS freebets;
