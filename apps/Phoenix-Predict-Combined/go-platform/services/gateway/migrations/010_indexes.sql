-- +goose Up
-- Additional composite indexes for better query performance

CREATE INDEX idx_bets_punter_settled ON bets(punter_id, settled_at DESC);
CREATE INDEX idx_bets_punter_status ON bets(punter_id, status);
CREATE INDEX idx_fixtures_starts_at_status ON fixtures(starts_at DESC, status);
CREATE INDEX idx_markets_fixture_status ON markets(fixture_id, status);
CREATE INDEX idx_selections_market_active ON selections(market_id, active);
CREATE INDEX idx_ledger_wallet_type ON ledger_entries(wallet_id, transaction_type);
CREATE INDEX idx_freebets_punter_status ON freebets(punter_id, status);
CREATE INDEX idx_odds_boosts_market_status ON odds_boosts(market_id, status);

-- Partial indexes for common queries
CREATE INDEX idx_bets_pending ON bets(punter_id) WHERE status = 'pending';
CREATE INDEX idx_bets_settled_recent ON bets(punter_id, settled_at) WHERE status IN ('won', 'lost', 'void');
CREATE INDEX idx_fixtures_upcoming ON fixtures(starts_at) WHERE status IN ('pending', 'scheduled');
CREATE INDEX idx_markets_open ON markets(fixture_id) WHERE status = 'open';
CREATE INDEX idx_freebets_available ON freebets(punter_id) WHERE status = 'active' AND expires_at > CURRENT_TIMESTAMP;

-- +goose Down
DROP INDEX IF EXISTS idx_bets_punter_settled;
DROP INDEX IF EXISTS idx_bets_punter_status;
DROP INDEX IF EXISTS idx_fixtures_starts_at_status;
DROP INDEX IF EXISTS idx_markets_fixture_status;
DROP INDEX IF EXISTS idx_selections_market_active;
DROP INDEX IF EXISTS idx_ledger_wallet_type;
DROP INDEX IF EXISTS idx_freebets_punter_status;
DROP INDEX IF EXISTS idx_odds_boosts_market_status;
DROP INDEX IF EXISTS idx_bets_pending;
DROP INDEX IF EXISTS idx_bets_settled_recent;
DROP INDEX IF EXISTS idx_fixtures_upcoming;
DROP INDEX IF EXISTS idx_markets_open;
DROP INDEX IF EXISTS idx_freebets_available;
