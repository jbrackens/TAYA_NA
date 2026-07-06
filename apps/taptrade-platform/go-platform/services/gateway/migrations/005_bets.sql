-- +goose Up
CREATE TABLE bets (
    id VARCHAR(255) PRIMARY KEY,
    punter_id VARCHAR(255) NOT NULL REFERENCES punters(id) ON DELETE CASCADE,
    selection_id VARCHAR(255) NOT NULL REFERENCES selections(id) ON DELETE RESTRICT,
    market_id VARCHAR(255) NOT NULL REFERENCES markets(id) ON DELETE RESTRICT,
    fixture_id VARCHAR(255) NOT NULL REFERENCES fixtures(id) ON DELETE RESTRICT,
    stake_cents BIGINT NOT NULL,
    odds_taken NUMERIC(10, 4) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    result VARCHAR(50),
    potential_payout_cents BIGINT,
    actual_payout_cents BIGINT,
    placed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bets_punter_id ON bets(punter_id);
CREATE INDEX idx_bets_market_id ON bets(market_id);
CREATE INDEX idx_bets_fixture_id ON bets(fixture_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_placed_at ON bets(placed_at);
CREATE INDEX idx_bets_settled_at ON bets(settled_at);

-- +goose Down
DROP TABLE IF EXISTS bets;
