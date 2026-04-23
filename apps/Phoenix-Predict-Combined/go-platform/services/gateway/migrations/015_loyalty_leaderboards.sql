-- +goose Up
-- 015_loyalty_leaderboards.sql
-- Predict-native loyalty + leaderboard schema.
-- Replaces the in-memory sync.RWMutex stubs in internal/loyalty and internal/leaderboards.
-- See PLAN-loyalty-leaderboards.md §8 for the architectural rationale.

-- ─────────────────────────────────────────────────────────────────────────────
-- Loyalty — per-user tier + points
-- ─────────────────────────────────────────────────────────────────────────────

-- loyalty_accounts: one row per user, current tier + lifetime points
CREATE TABLE loyalty_accounts (
    user_id         VARCHAR(255) PRIMARY KEY REFERENCES punters(id) ON DELETE CASCADE,
    points_balance  BIGINT NOT NULL DEFAULT 0,
    tier            SMALLINT NOT NULL DEFAULT 0
        CHECK (tier BETWEEN 0 AND 5),
    last_activity   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast tier queries (rare but useful for admin/dashboards)
CREATE INDEX idx_loyalty_accounts_tier
    ON loyalty_accounts(tier, points_balance DESC);

-- loyalty_ledger: append-only accrual history, idempotency-keyed
CREATE TABLE loyalty_ledger (
    id               BIGSERIAL PRIMARY KEY,
    user_id          VARCHAR(255) NOT NULL REFERENCES punters(id) ON DELETE CASCADE,
    event_type       TEXT NOT NULL
        CHECK (event_type IN ('accrual','promotion','adjustment','migration')),
    delta_points     BIGINT NOT NULL,
    balance_after    BIGINT NOT NULL,
    reason           TEXT NOT NULL,
    market_id        UUID REFERENCES prediction_markets(id),
    trade_id         UUID REFERENCES prediction_trades(id),
    idempotency_key  TEXT NOT NULL UNIQUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ledger reads are "show me a user's recent activity" — user + time index
CREATE INDEX idx_loyalty_ledger_user_time
    ON loyalty_ledger(user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Leaderboards — precomputed rank snapshots
-- ─────────────────────────────────────────────────────────────────────────────

-- leaderboard_snapshots: one row per (board × user × window)
-- Board IDs are strings so we can add new boards without schema changes.
-- Examples:
--   'accuracy'           (rolling 30d)
--   'pnl_weekly'         (calendar week)
--   'category:crypto'    (calendar week, per category)
--   'sharpness'          (rolling 30d)
CREATE TABLE leaderboard_snapshots (
    board_id        TEXT NOT NULL,
    user_id         VARCHAR(255) NOT NULL REFERENCES punters(id) ON DELETE CASCADE,
    metric_value    NUMERIC(18,6) NOT NULL,
    rank            INT NOT NULL,
    window_start    TIMESTAMPTZ NOT NULL,
    window_end      TIMESTAMPTZ NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (board_id, user_id, window_start)
);

-- Board queries: "give me the top 25 for board X in the current window" — needs
-- board + rank index. Covering index so the query doesn't have to touch the heap
-- for common columns.
CREATE INDEX idx_lb_snap_board_rank
    ON leaderboard_snapshots(board_id, window_start, rank)
    INCLUDE (user_id, metric_value);

-- User queries: "where does alice rank across all boards" — user-scoped index.
CREATE INDEX idx_lb_snap_user
    ON leaderboard_snapshots(user_id, computed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Supporting indexes on existing tables (for recompute performance)
-- ─────────────────────────────────────────────────────────────────────────────

-- Accuracy board + Sharpness board scan prediction_payouts for settled outcomes.
-- Composite index covers (user, time) filtering + group-by user.
CREATE INDEX IF NOT EXISTS idx_pred_payouts_user_paid
    ON prediction_payouts(user_id, paid_at DESC);

-- P&L board + Sharpness board also need market → event → category chain for
-- Category Champions. Speed up the event lookup.
CREATE INDEX IF NOT EXISTS idx_pred_markets_event
    ON prediction_markets(event_id);

-- Volume-based metrics (Sharpness baseline) scan prediction_trades.
CREATE INDEX IF NOT EXISTS idx_pred_trades_buyer_time
    ON prediction_trades(buyer_id, traded_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_pred_trades_buyer_time;
DROP INDEX IF EXISTS idx_pred_markets_event;
DROP INDEX IF EXISTS idx_pred_payouts_user_paid;
DROP INDEX IF EXISTS idx_lb_snap_user;
DROP INDEX IF EXISTS idx_lb_snap_board_rank;
DROP TABLE IF EXISTS leaderboard_snapshots;
DROP INDEX IF EXISTS idx_loyalty_ledger_user_time;
DROP TABLE IF EXISTS loyalty_ledger;
DROP INDEX IF EXISTS idx_loyalty_accounts_tier;
DROP TABLE IF EXISTS loyalty_accounts;
