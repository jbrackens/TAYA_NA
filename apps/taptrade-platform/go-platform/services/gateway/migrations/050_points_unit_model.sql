-- +goose Up
-- 050: Points unit-model correction (2026-07-07, owner-directed).
--
-- THE FLAWED MODEL THIS FIXES: columns were named *_cents as if Points had
-- a nested cent subdivision ("point-cents"), and the UI divided by 100 at
-- display. The audited reality: every stored integer was ALREADY cent-scale
-- — a market price of 8 stores 8, a winning contract credits 100, fees
-- floor on the same units. Under the corrected model (1 Point = 1 cent of
-- in-platform play value; a contract priced at 8¢ costs 8 Points; correct
-- contracts settle at 100 Points) those integers ARE whole Points.
--
-- THEREFORE: this migration renames columns only. It does not touch a
-- single stored value — no multiplication, no division. Application code
-- ships in the same release reading the new names and displaying integers
-- directly (no /100).
--
-- Scope: the ACTIVE points economy (prediction_*, wallet*, bonuses/
-- campaigns/wagering/limits, activity log). Deliberately NOT renamed:
--   alpha_deposit_intents / alpha_withdrawal_requests — launch-prohibited
--     real-money cashier tables; their _cents were genuinely cash cents.
--   ledger_entries — orphaned legacy table (zero live code references).
-- Renaming those would falsify money-era history.
--
-- reserved_cash_cents / captured_cash_cents / released_cash_cents also drop
-- the "cash" vocabulary — these hold Points and always did.

-- prediction_markets
ALTER TABLE prediction_markets RENAME COLUMN yes_price_cents TO yes_price_points;
ALTER TABLE prediction_markets RENAME COLUMN no_price_cents TO no_price_points;
ALTER TABLE prediction_markets RENAME COLUMN last_trade_price_cents TO last_trade_price_points;
ALTER TABLE prediction_markets RENAME COLUMN volume_cents TO volume_points;
ALTER TABLE prediction_markets RENAME COLUMN open_interest_cents TO open_interest_points;
ALTER TABLE prediction_markets RENAME COLUMN liquidity_cents TO liquidity_points;
ALTER TABLE prediction_markets RENAME COLUMN amm_subsidy_cents TO amm_subsidy_points;
ALTER TABLE prediction_markets RENAME COLUMN collateral_pool_cents TO collateral_pool_points;
ALTER TABLE prediction_markets RENAME COLUMN settled_payout_pool_cents TO settled_payout_pool_points;
ALTER TABLE prediction_markets RENAME COLUMN best_yes_bid_cents TO best_yes_bid_points;
ALTER TABLE prediction_markets RENAME COLUMN best_yes_ask_cents TO best_yes_ask_points;
ALTER TABLE prediction_markets RENAME COLUMN best_no_bid_cents TO best_no_bid_points;
ALTER TABLE prediction_markets RENAME COLUMN best_no_ask_cents TO best_no_ask_points;

-- prediction_orders
ALTER TABLE prediction_orders RENAME COLUMN price_cents TO price_points;
ALTER TABLE prediction_orders RENAME COLUMN total_cost_cents TO total_cost_points;
ALTER TABLE prediction_orders RENAME COLUMN reserved_cash_cents TO reserved_points;
ALTER TABLE prediction_orders RENAME COLUMN captured_cash_cents TO captured_points;
ALTER TABLE prediction_orders RENAME COLUMN released_cash_cents TO released_points;
ALTER TABLE prediction_orders RENAME COLUMN average_fill_price_cents TO average_fill_price_points;
ALTER TABLE prediction_orders RENAME COLUMN filled_cost_cents TO filled_cost_points;
ALTER TABLE prediction_orders RENAME COLUMN notional_cap_cents TO notional_cap_points;

-- prediction_trades
ALTER TABLE prediction_trades RENAME COLUMN price_cents TO price_points;
ALTER TABLE prediction_trades RENAME COLUMN fee_cents TO fee_points;

-- prediction_positions
ALTER TABLE prediction_positions RENAME COLUMN avg_price_cents TO avg_price_points;
ALTER TABLE prediction_positions RENAME COLUMN total_cost_cents TO total_cost_points;
ALTER TABLE prediction_positions RENAME COLUMN realized_pnl_cents TO realized_pnl_points;

-- prediction_payouts (settlement credits; table name retained, values are Points)
ALTER TABLE prediction_payouts RENAME COLUMN entry_price_cents TO entry_price_points;
ALTER TABLE prediction_payouts RENAME COLUMN exit_price_cents TO exit_price_points;
ALTER TABLE prediction_payouts RENAME COLUMN pnl_cents TO pnl_points;
ALTER TABLE prediction_payouts RENAME COLUMN payout_cents TO payout_points;

-- prediction_settlements
ALTER TABLE prediction_settlements RENAME COLUMN total_payout_cents TO total_payout_points;

-- prediction_collateral_ledger
ALTER TABLE prediction_collateral_ledger RENAME COLUMN amount_cents TO amount_points;
ALTER TABLE prediction_collateral_ledger RENAME COLUMN balance_after_cents TO balance_after_points;

-- prediction_disputes
ALTER TABLE prediction_disputes RENAME COLUMN bond_cents TO bond_points;

-- wallets / wallet_balances / wallet_ledger / wallet_reservations
ALTER TABLE wallets RENAME COLUMN balance_cents TO balance_points;
ALTER TABLE wallets RENAME COLUMN bonus_balance_cents TO bonus_balance_points;
ALTER TABLE wallet_balances RENAME COLUMN balance_cents TO balance_points;
ALTER TABLE wallet_balances RENAME COLUMN bonus_balance_cents TO bonus_balance_points;
ALTER TABLE wallet_ledger RENAME COLUMN amount_cents TO amount_points;
ALTER TABLE wallet_ledger RENAME COLUMN balance_cents TO balance_points;
ALTER TABLE wallet_reservations RENAME COLUMN amount_cents TO amount_points;
ALTER TABLE wallet_reservations RENAME COLUMN captured_amount_cents TO captured_amount_points;

-- player_activity_log
ALTER TABLE player_activity_log RENAME COLUMN amount_cents TO amount_points;

-- rewards / bonuses / campaigns / wagering (points grants live here)
ALTER TABLE player_bonuses RENAME COLUMN granted_amount_cents TO granted_amount_points;
ALTER TABLE player_bonuses RENAME COLUMN remaining_amount_cents TO remaining_amount_points;
ALTER TABLE player_bonuses RENAME COLUMN wagering_required_cents TO wagering_required_points;
ALTER TABLE player_bonuses RENAME COLUMN wagering_completed_cents TO wagering_completed_points;
ALTER TABLE campaigns RENAME COLUMN budget_cents TO budget_points;
ALTER TABLE campaigns RENAME COLUMN spent_cents TO spent_points;
ALTER TABLE wagering_contributions RENAME COLUMN stake_cents TO stake_points;
ALTER TABLE wagering_contributions RENAME COLUMN contribution_cents TO contribution_points;

-- play-limit tooling (points caps)
ALTER TABLE player_bet_limits RENAME COLUMN limit_cents TO limit_points;
ALTER TABLE player_deposit_limits RENAME COLUMN limit_cents TO limit_points;

-- +goose Down
-- Reverse renames (values untouched in both directions).
ALTER TABLE prediction_markets RENAME COLUMN yes_price_points TO yes_price_cents;
ALTER TABLE prediction_markets RENAME COLUMN no_price_points TO no_price_cents;
ALTER TABLE prediction_markets RENAME COLUMN last_trade_price_points TO last_trade_price_cents;
ALTER TABLE prediction_markets RENAME COLUMN volume_points TO volume_cents;
ALTER TABLE prediction_markets RENAME COLUMN open_interest_points TO open_interest_cents;
ALTER TABLE prediction_markets RENAME COLUMN liquidity_points TO liquidity_cents;
ALTER TABLE prediction_markets RENAME COLUMN amm_subsidy_points TO amm_subsidy_cents;
ALTER TABLE prediction_markets RENAME COLUMN collateral_pool_points TO collateral_pool_cents;
ALTER TABLE prediction_markets RENAME COLUMN settled_payout_pool_points TO settled_payout_pool_cents;
ALTER TABLE prediction_markets RENAME COLUMN best_yes_bid_points TO best_yes_bid_cents;
ALTER TABLE prediction_markets RENAME COLUMN best_yes_ask_points TO best_yes_ask_cents;
ALTER TABLE prediction_markets RENAME COLUMN best_no_bid_points TO best_no_bid_cents;
ALTER TABLE prediction_markets RENAME COLUMN best_no_ask_points TO best_no_ask_cents;
ALTER TABLE prediction_orders RENAME COLUMN price_points TO price_cents;
ALTER TABLE prediction_orders RENAME COLUMN total_cost_points TO total_cost_cents;
ALTER TABLE prediction_orders RENAME COLUMN reserved_points TO reserved_cash_cents;
ALTER TABLE prediction_orders RENAME COLUMN captured_points TO captured_cash_cents;
ALTER TABLE prediction_orders RENAME COLUMN released_points TO released_cash_cents;
ALTER TABLE prediction_orders RENAME COLUMN average_fill_price_points TO average_fill_price_cents;
ALTER TABLE prediction_orders RENAME COLUMN filled_cost_points TO filled_cost_cents;
ALTER TABLE prediction_orders RENAME COLUMN notional_cap_points TO notional_cap_cents;
ALTER TABLE prediction_trades RENAME COLUMN price_points TO price_cents;
ALTER TABLE prediction_trades RENAME COLUMN fee_points TO fee_cents;
ALTER TABLE prediction_positions RENAME COLUMN avg_price_points TO avg_price_cents;
ALTER TABLE prediction_positions RENAME COLUMN total_cost_points TO total_cost_cents;
ALTER TABLE prediction_positions RENAME COLUMN realized_pnl_points TO realized_pnl_cents;
ALTER TABLE prediction_payouts RENAME COLUMN entry_price_points TO entry_price_cents;
ALTER TABLE prediction_payouts RENAME COLUMN exit_price_points TO exit_price_cents;
ALTER TABLE prediction_payouts RENAME COLUMN pnl_points TO pnl_cents;
ALTER TABLE prediction_payouts RENAME COLUMN payout_points TO payout_cents;
ALTER TABLE prediction_settlements RENAME COLUMN total_payout_points TO total_payout_cents;
ALTER TABLE prediction_collateral_ledger RENAME COLUMN amount_points TO amount_cents;
ALTER TABLE prediction_collateral_ledger RENAME COLUMN balance_after_points TO balance_after_cents;
ALTER TABLE prediction_disputes RENAME COLUMN bond_points TO bond_cents;
ALTER TABLE wallets RENAME COLUMN balance_points TO balance_cents;
ALTER TABLE wallets RENAME COLUMN bonus_balance_points TO bonus_balance_cents;
ALTER TABLE wallet_balances RENAME COLUMN balance_points TO balance_cents;
ALTER TABLE wallet_balances RENAME COLUMN bonus_balance_points TO bonus_balance_cents;
ALTER TABLE wallet_ledger RENAME COLUMN amount_points TO amount_cents;
ALTER TABLE wallet_ledger RENAME COLUMN balance_points TO balance_cents;
ALTER TABLE wallet_reservations RENAME COLUMN amount_points TO amount_cents;
ALTER TABLE wallet_reservations RENAME COLUMN captured_amount_points TO captured_amount_cents;
ALTER TABLE player_activity_log RENAME COLUMN amount_points TO amount_cents;
ALTER TABLE player_bonuses RENAME COLUMN granted_amount_points TO granted_amount_cents;
ALTER TABLE player_bonuses RENAME COLUMN remaining_amount_points TO remaining_amount_cents;
ALTER TABLE player_bonuses RENAME COLUMN wagering_required_points TO wagering_required_cents;
ALTER TABLE player_bonuses RENAME COLUMN wagering_completed_points TO wagering_completed_cents;
ALTER TABLE campaigns RENAME COLUMN budget_points TO budget_cents;
ALTER TABLE campaigns RENAME COLUMN spent_points TO spent_cents;
ALTER TABLE wagering_contributions RENAME COLUMN stake_points TO stake_cents;
ALTER TABLE wagering_contributions RENAME COLUMN contribution_points TO contribution_cents;
ALTER TABLE player_bet_limits RENAME COLUMN limit_points TO limit_cents;
ALTER TABLE player_deposit_limits RENAME COLUMN limit_points TO limit_cents;
