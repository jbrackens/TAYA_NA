-- +goose Up
-- Persist reward abuse-control cluster evidence for schema-managed DBs.
--
-- wallet.Service.ensureSchema() also creates this table for runtime-created
-- wallet schemas. This migration makes the same hashed device/IP cluster store
-- explicit for normal goose-managed environments, while keeping it outside the
-- point ledger because cluster membership is abuse-control evidence, not a
-- point movement.

CREATE TABLE IF NOT EXISTS wallet_reward_clusters (
    window_date TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    signal_hash TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (window_date, signal_type, signal_hash, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_reward_clusters_signal
    ON wallet_reward_clusters (window_date, signal_type, signal_hash);

-- +goose Down
DROP INDEX IF EXISTS idx_wallet_reward_clusters_signal;
DROP TABLE IF EXISTS wallet_reward_clusters;
