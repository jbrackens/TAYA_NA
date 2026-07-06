-- TapTrade prediction market watchlists.
-- User-scoped favorites for discovery; no point, payout, or redemption state.

-- +goose Up
CREATE TABLE IF NOT EXISTS prediction_market_watchlist (
  user_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, market_id)
);

CREATE INDEX IF NOT EXISTS idx_prediction_market_watchlist_user_created
  ON prediction_market_watchlist (user_id, created_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_prediction_market_watchlist_user_created;
DROP TABLE IF EXISTS prediction_market_watchlist;
