-- +goose Up
-- 016_loyalty_privacy_opt_out.sql
-- Adds the "appear anonymously on leaderboards" opt-out.
--
-- Rationale: PLAN-loyalty-leaderboards.md NOT-in-scope and TODOS.md both flag
-- this as deferred post-v1 work. Users who don't want their handle visible
-- publicly today have to change their username — there's no "hide me entirely"
-- path. Flipping this column to true swaps the leaderboard display name for
-- "Trader #<rank>" while preserving rank + stats (engagement stays intact).

ALTER TABLE punters
    ADD COLUMN display_anonymous BOOLEAN NOT NULL DEFAULT false;

-- Not indexed: this column is only read during the leaderboard display JOIN,
-- one row per user per query. Adding an index would cost more on inserts
-- than it would save on the tiny number of rows per query.

-- +goose Down
ALTER TABLE punters DROP COLUMN IF EXISTS display_anonymous;
