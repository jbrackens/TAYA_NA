-- +goose Up
-- Per-user notification inbox. First producer: settlement notifications —
-- when a market settles or voids, every position holder gets one row
-- ("you won +300 PTS on X" / "market voided, 120 PTS refunded") written
-- post-commit from the settlement payouts seam. The WS push covers users
-- who are connected at that moment; this table covers everyone else — the
-- bell in the top bar reads it on the next visit.
--
-- user_id matches punters/wallet ids (text, e.g. "user-001"). market_id is
-- TEXT rather than UUID so non-market producers (system notices) fit later.
-- payload carries the structured event (kind-specific fields) so the
-- frontend renders from data, not from parsing the body string.
CREATE TABLE IF NOT EXISTS user_notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    kind        TEXT NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    market_id   TEXT NULL,
    payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at     TIMESTAMPTZ NULL
);

-- The bell badge: unread count per user, newest first.
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
    ON user_notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;

-- The panel: full list per user, newest first.
CREATE INDEX IF NOT EXISTS idx_user_notifications_user
    ON user_notifications (user_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS user_notifications;
