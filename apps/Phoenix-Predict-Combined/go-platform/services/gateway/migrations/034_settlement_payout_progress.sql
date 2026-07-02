-- 034_settlement_payout_progress.sql
-- Audit COR-05 (P3-12). Groundwork for resumable, batched settlement payouts.
-- Today settlement credits every winner inside ONE transaction
-- (PersistResolvedMarketAtomic), holding thousands of wallet row locks for the
-- duration on large markets. P3-12 splits that into a fast header commit plus
-- chunked payout batches with a resume cursor. This migration adds the schema
-- this needs; the live single-transaction path keeps working unchanged because
-- the new constraint already holds and the new columns default to 0.
--
-- Resume is driven by "positions without a payout row for this settlement"
-- (NOT by the wallet idempotency key alone), so the per-position payout MUST be
-- idempotent at the schema level. The UNIQUE below makes a re-inserted payout a
-- no-op (paired with ON CONFLICT in the writer) instead of a duplicate row.

-- +goose Up

-- One payout per (settlement, position). Current data satisfies this: the
-- atomic settler writes exactly one payout per position per settlement.
ALTER TABLE prediction_payouts
  ADD CONSTRAINT uq_payout_settlement_position UNIQUE (settlement_id, position_id);

-- Disbursement progress cursor on the settlement header. payouts_total is
-- snapshotted when the settlement row is written; payouts_completed advances as
-- each batch commits (in the same tx as that batch's payouts). completed < total
-- => disbursement is incomplete and a resume pass must finish it.
ALTER TABLE prediction_settlements
  ADD COLUMN payouts_total INT NOT NULL DEFAULT 0,
  ADD COLUMN payouts_completed INT NOT NULL DEFAULT 0;

-- Find settlements that still owe payouts, cheaply, for the resume scanner.
CREATE INDEX idx_pred_settlements_incomplete
  ON prediction_settlements (id)
  WHERE payouts_completed < payouts_total;

-- +goose Down
DROP INDEX IF EXISTS idx_pred_settlements_incomplete;
ALTER TABLE prediction_settlements
  DROP COLUMN IF EXISTS payouts_completed,
  DROP COLUMN IF EXISTS payouts_total;
ALTER TABLE prediction_payouts
  DROP CONSTRAINT IF EXISTS uq_payout_settlement_position;
