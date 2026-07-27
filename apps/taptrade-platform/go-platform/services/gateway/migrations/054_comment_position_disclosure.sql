-- +goose Up
-- Step 11: per-comment position disclosure (opt-in, author decides per
-- comment). The value is a SNAPSHOT of the author's position(s) on the
-- market at post time — [{"side","quantity","costPoints"}] — captured
-- once and never updated: a live position changes, and a comment
-- claiming one the author has since exited is worse than no disclosure.
-- An exited position therefore STAYS disclosed; nothing rewrites or
-- clears this column.
ALTER TABLE prediction_market_comments
  ADD COLUMN IF NOT EXISTS position_disclosure JSONB NULL;

-- +goose Down
ALTER TABLE prediction_market_comments
  DROP COLUMN IF EXISTS position_disclosure;
