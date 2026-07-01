-- Tiangge prediction-native social write limiter.
-- Shared token buckets for social write throttles across gateway instances.

-- +goose Up
CREATE TABLE IF NOT EXISTS prediction_social_write_limits (
  limiter_key TEXT PRIMARY KEY,
  tokens DOUBLE PRECISION NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prediction_social_write_limits_updated
  ON prediction_social_write_limits (updated_at);

-- +goose Down
DROP INDEX IF EXISTS idx_prediction_social_write_limits_updated;
DROP TABLE IF EXISTS prediction_social_write_limits;
