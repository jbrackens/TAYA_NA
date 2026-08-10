-- +goose Up
-- QA ISSUE-002 backfill: exchange fills never wrote open_interest_points
-- (only the retired AMM did), so every order_book market with real minted
-- pairs displayed "OPEN INTEREST 0 pts". For pure-issuance exchange
-- markets the collateral pool IS par × outstanding pairs (fees are ledger
-- entries, not pool deltas), so the pool is the honest backfill value.
-- Terminal markets are left alone — their stat is moot and their pool has
-- been paid out.
UPDATE prediction_markets
   SET open_interest_points = collateral_pool_points,
       updated_at = NOW()
 WHERE execution_mode = 'order_book'
   AND status IN ('open', 'halted', 'closed')
   AND open_interest_points = 0
   AND collateral_pool_points > 0;

-- +goose Down
-- The backfill is an idempotent data repair; there is nothing safe to
-- restore ("0" was the bug, not a prior state worth returning to).
SELECT 1;
