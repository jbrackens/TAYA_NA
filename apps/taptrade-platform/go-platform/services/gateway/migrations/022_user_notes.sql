-- +goose Up
-- 022_user_notes.sql
-- Prediction-native admin notes (CRM) on a punter. Replaces the 501 stub for
-- the office /users/[id] "Add Note" action. This is a generic admin-notes
-- feature with no sportsbook semantics (unlike the limits / risk-segment
-- actions, which were sportsbook leftovers and have been removed from the UI).
--
-- author_id is the admin who wrote the note (httpx.UserIDFromContext); nullable
-- so a note survives if the author record is later removed.

CREATE TABLE user_notes (
    id          BIGSERIAL PRIMARY KEY,
    punter_id   VARCHAR(255) NOT NULL REFERENCES punters(id) ON DELETE CASCADE,
    author_id   VARCHAR(255),
    category    VARCHAR(50) NOT NULL DEFAULT 'general',
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_notes_punter ON user_notes (punter_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS user_notes;
