-- Tiangge prediction-native social layer.
-- Points-only gameplay social data: market comments, reactions, reports, and follows.

-- +goose Up
CREATE TABLE IF NOT EXISTS prediction_market_comments (
  id TEXT PRIMARY KEY DEFAULT 'mc_' || md5(random()::text || clock_timestamp()::text),
  market_id TEXT NOT NULL,
  parent_id TEXT NULL REFERENCES prediction_market_comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prediction_market_comments_market_created
  ON prediction_market_comments (market_id, created_at DESC);

CREATE TABLE IF NOT EXISTS prediction_market_comment_reactions (
  comment_id TEXT NOT NULL REFERENCES prediction_market_comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS prediction_market_comment_reports (
  comment_id TEXT NOT NULL REFERENCES prediction_market_comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by TEXT NULL,
  review_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE prediction_market_comment_reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

ALTER TABLE prediction_market_comment_reports
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL;

ALTER TABLE prediction_market_comment_reports
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT NULL;

ALTER TABLE prediction_market_comment_reports
  ADD COLUMN IF NOT EXISTS review_note TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_prediction_market_comment_reports_status_created
  ON prediction_market_comment_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS prediction_user_follows (
  target_user_id TEXT NOT NULL,
  follower_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (target_user_id, follower_user_id)
);

CREATE INDEX IF NOT EXISTS idx_prediction_user_follows_follower
  ON prediction_user_follows (follower_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_user_follows_target
  ON prediction_user_follows (target_user_id, created_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_prediction_user_follows_target;
DROP INDEX IF EXISTS idx_prediction_user_follows_follower;
DROP TABLE IF EXISTS prediction_user_follows;
DROP INDEX IF EXISTS idx_prediction_market_comment_reports_status_created;
DROP TABLE IF EXISTS prediction_market_comment_reports;
DROP TABLE IF EXISTS prediction_market_comment_reactions;
DROP INDEX IF EXISTS idx_prediction_market_comments_market_created;
DROP TABLE IF EXISTS prediction_market_comments;
