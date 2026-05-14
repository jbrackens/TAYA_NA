package main

import (
	"database/sql"
	"fmt"
	"time"
)

// CleanupResult is the per-phase row count summary the orchestrator
// surfaces in the seed log. Each count is the number of rows the cleanup
// SQL touched.
type CleanupResult struct {
	StalePendingCancelled int64
	DemoOrdersDeleted     int64
	DemoTradesDeleted     int64
	DemoLedgerDeleted     int64
	DemoSettlementsDeleted int64
	DemoPositionsDeleted  int64
}

// stalePendingCutoff is the age at which a 'pending' order is considered
// stuck. Orders this old that haven't progressed to filled or cancelled
// almost certainly will not — they are the residue of crashes, killed
// match runs, or pre-fix bugs. Demo state must not inherit them.
const stalePendingCutoff = time.Hour

// RunPhase0Cleanup is the first thing demo mode does and the entirety of
// wipe mode. Two responsibilities:
//
//  1. Cancel any 'pending' orders older than stalePendingCutoff. These
//     orders are stuck — the gateway's reservedCashCents on the wallet
//     is held by them and the demo flow can't place new orders for those
//     users until the cash is released. We mark them 'cancelled' and let
//     the wallet's reconciler refund the cash on its next cycle (any
//     ledger 'capture' rows tied to them are already idempotent).
//
//  2. Remove every row a prior demo seed wrote. Identified by
//     idempotency_key LIKE 'demo:%' on orders and trade_kind='demo_history'
//     on trades. Settlements with idempotency_key LIKE 'demo:%' and
//     ledger rows tied to those settlements get the same treatment.
//     Positions written by demo orders are reset by deleting and
//     letting Phase 1+ rewrite them; we cannot key positions by demo
//     prefix because they aggregate across many orders, so we delete
//     all positions for users 'user-bot' and 'u-1' (the demo-touched
//     users) where the position has no non-demo trade backing.
//
// Returns a summary of rows touched so the caller can print progress.
func RunPhase0Cleanup(db *sql.DB) (*CleanupResult, error) {
	r := &CleanupResult{}

	// Step 1: cancel stale pending orders. Older than stalePendingCutoff,
	// status='pending'. Status transitions to 'cancelled' and updated_at
	// bumps so the gateway's wallet reconciler picks them up. We do NOT
	// touch capturedCashCents or reservedCashCents directly — that's
	// the wallet ledger's job.
	res, err := db.Exec(`
		UPDATE prediction_orders
		SET status='cancelled', updated_at=NOW()
		WHERE status='pending' AND created_at < NOW() - INTERVAL '1 hour'
	`)
	if err != nil {
		return r, fmt.Errorf("cancel stale pending orders: %w", err)
	}
	r.StalePendingCancelled, _ = res.RowsAffected()

	// Step 2a: delete demo-keyed ledger entries first (FK target).
	res, err = db.Exec(`
		DELETE FROM prediction_collateral_ledger
		WHERE reason LIKE 'demo:%'
		   OR trade_id IN (SELECT id FROM prediction_trades WHERE trade_kind='demo_history')
		   OR order_id IN (SELECT id FROM prediction_orders WHERE idempotency_key LIKE 'demo:%')
	`)
	if err != nil {
		return r, fmt.Errorf("delete demo ledger entries: %w", err)
	}
	r.DemoLedgerDeleted, _ = res.RowsAffected()

	// Step 2b: delete demo-history synthetic trade rows (Phase 3 plant)
	// plus trades pointed at by demo orders.
	res, err = db.Exec(`
		DELETE FROM prediction_trades
		WHERE trade_kind = 'demo_history'
		   OR buy_order_id IN (SELECT id FROM prediction_orders WHERE idempotency_key LIKE 'demo:%')
		   OR sell_order_id IN (SELECT id FROM prediction_orders WHERE idempotency_key LIKE 'demo:%')
	`)
	if err != nil {
		return r, fmt.Errorf("delete demo trades: %w", err)
	}
	r.DemoTradesDeleted, _ = res.RowsAffected()

	// Step 2c: delete demo settlements + their payouts. Settlements have
	// no idempotency_key column, so we tag demo-created ones via
	// attestation_source='demo'. That field is part of the existing
	// attestation contract (real settlements use 'manual', 'oracle',
	// etc) — adding 'demo' is semantically truthful: this settlement
	// was attested by the demo seed.
	res, err = db.Exec(`
		DELETE FROM prediction_payouts
		WHERE settlement_id IN (
		  SELECT id FROM prediction_settlements WHERE attestation_source = 'demo'
		)
	`)
	if err != nil {
		return r, fmt.Errorf("delete demo payouts: %w", err)
	}

	res, err = db.Exec(`
		DELETE FROM prediction_settlements
		WHERE attestation_source = 'demo'
	`)
	if err != nil {
		return r, fmt.Errorf("delete demo settlements: %w", err)
	}
	r.DemoSettlementsDeleted, _ = res.RowsAffected()

	// Step 2d: delete demo-keyed orders.
	res, err = db.Exec(`
		DELETE FROM prediction_orders
		WHERE idempotency_key LIKE 'demo:%'
	`)
	if err != nil {
		return r, fmt.Errorf("delete demo orders: %w", err)
	}
	r.DemoOrdersDeleted, _ = res.RowsAffected()

	// Step 2e: positions touched by demo orders. We zero them via DELETE
	// for users user-bot and u-1 where there is no surviving non-demo
	// trade evidence. This keeps base-seed positions for alice/bob/charlie
	// intact while clearing whatever the demo flow plumped onto bot+demo.
	res, err = db.Exec(`
		DELETE FROM prediction_positions p
		WHERE p.user_id IN ('user-bot', 'u-1')
		  AND NOT EXISTS (
		    SELECT 1 FROM prediction_trades t
		    WHERE t.market_id = p.market_id
		      AND (t.buyer_id = p.user_id)
		      AND t.trade_kind IS DISTINCT FROM 'demo_history'
		  )
	`)
	if err != nil {
		return r, fmt.Errorf("delete demo positions: %w", err)
	}
	r.DemoPositionsDeleted, _ = res.RowsAffected()

	return r, nil
}
