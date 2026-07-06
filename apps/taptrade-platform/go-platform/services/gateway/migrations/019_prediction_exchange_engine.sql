-- +goose Up
-- 019_prediction_exchange_engine.sql
-- Real binary exchange engine: order book, partial fills, collateral ledger,
-- self-match prevention, post-only, fee accounting, settlement audit.
-- Companion docs: ~/.gstack/projects/Taya_NA_Predict/john-main-plan-eng-review-exchange-engine-20260509-182334.md
--                 ~/.gstack/projects/Taya_NA_Predict/john-main-eng-review-test-plan-20260509-182334.md
--
-- Notes vs original plan (corrections after reading 014):
--   * prediction_markets.fee_rate_bps already exists (default 0). v1 reuses it
--     as the taker fee column. Service layer treats it as taker fee.
--   * prediction_trades.fee_cents already exists. v1 stores the *taker* fee on
--     the taker's row; maker rows always 0. No new fee columns needed.
--   * prediction_orders.remaining_quantity is in active use; do NOT drop.
--   * 'resolving' market state intentionally NOT added — settlement uses the
--     market advisory lock to serialize against PlaceOrder, which is sufficient.
--     Existing 'closed' state remains the gate; PlaceOrder rejects non-'open'.

-- ===========================================================================
-- 1. prediction_markets — exchange-mode, collateral pool, quote snapshot
-- ===========================================================================

ALTER TABLE prediction_markets
    ADD COLUMN execution_mode TEXT NOT NULL DEFAULT 'order_book'
        CHECK (execution_mode IN ('order_book','amm')),
    ADD COLUMN collateral_pool_cents BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN settled_payout_pool_cents BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN best_yes_bid_cents INT,
    ADD COLUMN best_yes_ask_cents INT,
    ADD COLUMN best_no_bid_cents INT,
    ADD COLUMN best_no_ask_cents INT,
    ADD COLUMN last_quote_at TIMESTAMPTZ;

-- Existing markets keep AMM execution; only new markets default to order_book.
UPDATE prediction_markets SET execution_mode = 'amm';

-- Service-layer default for new-market creation will set fee_rate_bps=500 (5%);
-- this migration leaves existing markets at fee_rate_bps=0 (no surprise fees).

-- ===========================================================================
-- 2. prediction_orders — TIF, reservation accounting, MM hooks, rejected state
-- ===========================================================================

ALTER TABLE prediction_orders
    ADD COLUMN time_in_force TEXT NOT NULL DEFAULT 'gtc'
        CHECK (time_in_force IN ('gtc','ioc','fok')),
    ADD COLUMN reserved_cash_cents BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN captured_cash_cents BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN released_cash_cents BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN reserved_quantity INT NOT NULL DEFAULT 0,
    ADD COLUMN average_fill_price_cents INT,
    ADD COLUMN filled_cost_cents BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN failure_reason TEXT,
    ADD COLUMN post_only BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN client_order_id TEXT,
    ADD COLUMN self_match_action TEXT NOT NULL DEFAULT 'cancel_taker'
        CHECK (self_match_action IN ('cancel_taker','cancel_maker','cancel_both')),
    ADD COLUMN notional_cap_cents BIGINT;

-- Add 'rejected' as a terminal status. Drop and recreate the status CHECK.
ALTER TABLE prediction_orders DROP CONSTRAINT IF EXISTS prediction_orders_status_check;
ALTER TABLE prediction_orders ADD CONSTRAINT prediction_orders_status_check
    CHECK (status IN ('pending','open','partial','filled','cancelled','expired','rejected'));

-- Partial unique on (user_id, client_order_id) — null client_order_ids coexist freely.
CREATE UNIQUE INDEX idx_pred_orders_client_order_id
    ON prediction_orders (user_id, client_order_id)
    WHERE client_order_id IS NOT NULL;

-- Order-book partial indexes: per side + action, price-time priority.
-- Buy sides sort price DESC (highest bid first); sell sides sort price ASC
-- (lowest ask first). Time tiebreaker uses created_at ASC (FIFO).
CREATE INDEX idx_pred_orders_book_buy_yes
    ON prediction_orders (market_id, price_cents DESC, created_at ASC)
    WHERE side = 'yes' AND action = 'buy' AND status IN ('open','partial');
CREATE INDEX idx_pred_orders_book_sell_yes
    ON prediction_orders (market_id, price_cents ASC, created_at ASC)
    WHERE side = 'yes' AND action = 'sell' AND status IN ('open','partial');
CREATE INDEX idx_pred_orders_book_buy_no
    ON prediction_orders (market_id, price_cents DESC, created_at ASC)
    WHERE side = 'no' AND action = 'buy' AND status IN ('open','partial');
CREATE INDEX idx_pred_orders_book_sell_no
    ON prediction_orders (market_id, price_cents ASC, created_at ASC)
    WHERE side = 'no' AND action = 'sell' AND status IN ('open','partial');

-- ===========================================================================
-- 3. prediction_trades — issuance pair linking, trade kind, engine kind, tape
-- ===========================================================================

ALTER TABLE prediction_trades
    ADD COLUMN match_id UUID,
    ADD COLUMN trade_kind TEXT,
    ADD COLUMN engine_kind TEXT;

-- Backfill BEFORE applying NOT NULL.
UPDATE prediction_trades
   SET match_id    = id,
       trade_kind  = 'secondary',
       engine_kind = CASE WHEN is_amm_trade THEN 'amm' ELSE 'order_book' END;

ALTER TABLE prediction_trades
    ALTER COLUMN match_id SET NOT NULL,
    ALTER COLUMN trade_kind SET NOT NULL,
    ALTER COLUMN engine_kind SET NOT NULL,
    ADD CONSTRAINT prediction_trades_trade_kind_check
        CHECK (trade_kind IN ('secondary','issuance'));

-- Trade tape index. Existing idx_pred_trades_time is (traded_at DESC) and
-- doesn't accelerate per-market queries; this one does, with id as tiebreaker
-- so cursor pagination at sub-ms resolution is correct.
CREATE INDEX idx_pred_trades_market_tape
    ON prediction_trades (market_id, traded_at DESC, id DESC);

-- ===========================================================================
-- 4. prediction_positions — reserved share lock for resting sell orders
-- ===========================================================================

ALTER TABLE prediction_positions
    ADD COLUMN reserved_quantity INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT prediction_positions_reserved_nonneg_check
        CHECK (reserved_quantity >= 0),
    ADD CONSTRAINT prediction_positions_reserved_le_quantity_check
        CHECK (reserved_quantity <= quantity);

CREATE INDEX idx_pred_positions_reserved
    ON prediction_positions (user_id, market_id)
    WHERE reserved_quantity > 0;

-- ===========================================================================
-- 5. prediction_settlements — admin override audit columns
-- ===========================================================================

ALTER TABLE prediction_settlements
    ADD COLUMN override_reason TEXT,
    ADD COLUMN overridden_by_user_id TEXT REFERENCES punters(id),
    ADD COLUMN overridden_at TIMESTAMPTZ,
    ADD CONSTRAINT prediction_settlements_override_all_or_none_check
        CHECK (
            (override_reason IS NULL AND overridden_by_user_id IS NULL AND overridden_at IS NULL)
            OR
            (override_reason IS NOT NULL AND overridden_by_user_id IS NOT NULL AND overridden_at IS NOT NULL)
        );

-- ===========================================================================
-- 6. prediction_collateral_ledger — append-only collateral movements per market
-- ===========================================================================

CREATE TABLE prediction_collateral_ledger (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id           UUID NOT NULL REFERENCES prediction_markets(id),
    trade_id            UUID REFERENCES prediction_trades(id),
    order_id            UUID REFERENCES prediction_orders(id),
    user_id             TEXT REFERENCES punters(id),
    entry_type          TEXT NOT NULL
        CHECK (entry_type IN ('issue_collateral','settlement_payout','fee','refund','adjustment','rebate')),
    amount_cents        BIGINT NOT NULL,
    balance_after_cents BIGINT NOT NULL,
    reason              TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pred_coll_ledger_market_time
    ON prediction_collateral_ledger (market_id, created_at DESC, id DESC);
CREATE INDEX idx_pred_coll_ledger_trade
    ON prediction_collateral_ledger (trade_id) WHERE trade_id IS NOT NULL;
CREATE INDEX idx_pred_coll_ledger_order
    ON prediction_collateral_ledger (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_pred_coll_ledger_user
    ON prediction_collateral_ledger (user_id) WHERE user_id IS NOT NULL;

-- +goose Down

DROP INDEX IF EXISTS idx_pred_coll_ledger_user;
DROP INDEX IF EXISTS idx_pred_coll_ledger_order;
DROP INDEX IF EXISTS idx_pred_coll_ledger_trade;
DROP INDEX IF EXISTS idx_pred_coll_ledger_market_time;
DROP TABLE IF EXISTS prediction_collateral_ledger;

ALTER TABLE prediction_settlements
    DROP CONSTRAINT IF EXISTS prediction_settlements_override_all_or_none_check,
    DROP COLUMN IF EXISTS overridden_at,
    DROP COLUMN IF EXISTS overridden_by_user_id,
    DROP COLUMN IF EXISTS override_reason;

DROP INDEX IF EXISTS idx_pred_positions_reserved;
ALTER TABLE prediction_positions
    DROP CONSTRAINT IF EXISTS prediction_positions_reserved_le_quantity_check,
    DROP CONSTRAINT IF EXISTS prediction_positions_reserved_nonneg_check,
    DROP COLUMN IF EXISTS reserved_quantity;

DROP INDEX IF EXISTS idx_pred_trades_market_tape;
ALTER TABLE prediction_trades
    DROP CONSTRAINT IF EXISTS prediction_trades_trade_kind_check,
    DROP COLUMN IF EXISTS engine_kind,
    DROP COLUMN IF EXISTS trade_kind,
    DROP COLUMN IF EXISTS match_id;

DROP INDEX IF EXISTS idx_pred_orders_book_sell_no;
DROP INDEX IF EXISTS idx_pred_orders_book_buy_no;
DROP INDEX IF EXISTS idx_pred_orders_book_sell_yes;
DROP INDEX IF EXISTS idx_pred_orders_book_buy_yes;
DROP INDEX IF EXISTS idx_pred_orders_client_order_id;

ALTER TABLE prediction_orders DROP CONSTRAINT IF EXISTS prediction_orders_status_check;
ALTER TABLE prediction_orders ADD CONSTRAINT prediction_orders_status_check
    CHECK (status IN ('pending','open','partial','filled','cancelled','expired'));

ALTER TABLE prediction_orders
    DROP COLUMN IF EXISTS notional_cap_cents,
    DROP COLUMN IF EXISTS self_match_action,
    DROP COLUMN IF EXISTS client_order_id,
    DROP COLUMN IF EXISTS post_only,
    DROP COLUMN IF EXISTS failure_reason,
    DROP COLUMN IF EXISTS filled_cost_cents,
    DROP COLUMN IF EXISTS average_fill_price_cents,
    DROP COLUMN IF EXISTS reserved_quantity,
    DROP COLUMN IF EXISTS released_cash_cents,
    DROP COLUMN IF EXISTS captured_cash_cents,
    DROP COLUMN IF EXISTS reserved_cash_cents,
    DROP COLUMN IF EXISTS time_in_force;

ALTER TABLE prediction_markets
    DROP COLUMN IF EXISTS last_quote_at,
    DROP COLUMN IF EXISTS best_no_ask_cents,
    DROP COLUMN IF EXISTS best_no_bid_cents,
    DROP COLUMN IF EXISTS best_yes_ask_cents,
    DROP COLUMN IF EXISTS best_yes_bid_cents,
    DROP COLUMN IF EXISTS settled_payout_pool_cents,
    DROP COLUMN IF EXISTS collateral_pool_cents,
    DROP COLUMN IF EXISTS execution_mode;
