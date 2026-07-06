-- +goose Up
CREATE TABLE markets (
    id VARCHAR(255) PRIMARY KEY,
    fixture_id VARCHAR(255) NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
    sport_key VARCHAR(255),
    league_key VARCHAR(255),
    event_key VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    min_stake_cents BIGINT,
    max_stake_cents BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE selections (
    id VARCHAR(255) PRIMARY KEY,
    market_id VARCHAR(255) NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    odds NUMERIC(10, 4) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_markets_fixture_id ON markets(fixture_id);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_starts_at ON markets(starts_at);
CREATE INDEX idx_selections_market_id ON selections(market_id);
CREATE INDEX idx_selections_active ON selections(active);

-- +goose Down
DROP TABLE IF EXISTS selections;
DROP TABLE IF EXISTS markets;
