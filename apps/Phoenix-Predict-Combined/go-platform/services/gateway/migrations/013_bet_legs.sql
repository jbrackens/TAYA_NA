-- +goose Up

-- Add parlay metadata columns to existing bets table
ALTER TABLE bets ADD COLUMN IF NOT EXISTS bet_type TEXT DEFAULT 'single'
    CHECK (bet_type IN ('single', 'parlay', 'system'));
ALTER TABLE bets ADD COLUMN IF NOT EXISTS leg_count INT DEFAULT 1;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS bonus_funded_cents BIGINT DEFAULT 0;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS freebet_id TEXT;

CREATE TABLE bet_legs (
    id BIGSERIAL PRIMARY KEY,
    bet_id BIGINT NOT NULL,
    leg_index INT NOT NULL,
    fixture_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    selection_id TEXT NOT NULL,
    odds_decimal NUMERIC(10, 4) NOT NULL,
    outcome TEXT DEFAULT 'pending'
        CHECK (outcome IN ('pending', 'won', 'lost', 'void', 'push', 'dead_heat')),
    settled_at TIMESTAMP WITH TIME ZONE,
    void_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (bet_id, leg_index)
);
CREATE INDEX idx_bet_legs_bet ON bet_legs (bet_id);
CREATE INDEX idx_bet_legs_market ON bet_legs (market_id);

-- +goose Down
ALTER TABLE bets DROP COLUMN IF EXISTS freebet_id;
ALTER TABLE bets DROP COLUMN IF EXISTS bonus_funded_cents;
ALTER TABLE bets DROP COLUMN IF EXISTS leg_count;
ALTER TABLE bets DROP COLUMN IF EXISTS bet_type;
DROP TABLE IF EXISTS bet_legs;
