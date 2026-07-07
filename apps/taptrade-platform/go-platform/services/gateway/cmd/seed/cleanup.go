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
	StalePendingCancelled          int64
	ExpiredReservationsHealed      int64
	DemoOrdersDeleted              int64
	DemoTradesDeleted              int64
	DemoLedgerDeleted              int64
	DemoSettlementsDeleted         int64
	DemoPositionsDeleted           int64
	DemoBonusesDeleted             int64
	DemoCampaignsDeleted           int64
	OrphanOrderReservationsDeleted int64
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
//     orders are stuck — the gateway's reserved point balance is held by
//     them and the demo flow can't place new orders for those users until
//     the points are released. We mark them 'cancelled' and let the
//     wallet reconciler release the points on its next cycle (any ledger
//     'capture' rows tied to them are already idempotent).
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
	// touch captured or reserved point balances directly — that's the
	// wallet ledger's job.
	res, err := db.Exec(`
		UPDATE prediction_orders
		SET status='cancelled', updated_at=NOW()
		WHERE status='pending' AND created_at < NOW() - INTERVAL '1 hour'
	`)
	if err != nil {
		return r, fmt.Errorf("cancel stale pending orders: %w", err)
	}
	r.StalePendingCancelled, _ = res.RowsAffected()

	// Step 1b: heal expired reservations on orders that are still open.
	// Old code reserved points for 24h regardless of TIF. GTC limit orders
	// that survived past 24h had their reservations expire while the
	// order was still live on the book. When a taker eventually matched
	// the maker's bid, the capture path errored with
	// "reservation is not in held status". The Service-level fix in
	// service.go::reservationTTL prevents this for new orders, but
	// pre-existing expired-reservation orders need a heal pass.
	//
	// Policy: for any 'expired' wallet reservation whose linked order is
	// still 'open' or 'partial', bump status back to 'held' and push
	// expires_at out to NOW() + 30 days. The order's continued open
	// status is the source of truth — the wallet reservation must
	// reflect that. captured_amount_points stays as-is (any prior
	// partial fills are still captured).
	res, err = db.Exec(`
		UPDATE wallet_reservations r
		SET status='held',
		    expires_at = NOW() + INTERVAL '30 days',
		    resolved_at = NULL
		FROM prediction_orders o
		WHERE r.reference_type='prediction_order'
		  AND r.reference_id::text = o.id::text
		  AND r.status='expired'
		  AND o.status IN ('open','partial')
	`)
	if err != nil {
		return r, fmt.Errorf("heal expired reservations: %w", err)
	}
	r.ExpiredReservationsHealed, _ = res.RowsAffected()

	// Step 1c: remove demo bonus rows before campaign rows. Campaign rules
	// cascade from campaigns, while player bonus grants reference campaigns
	// without cascade.
	res, err = db.Exec(`
		DELETE FROM player_bonuses
		WHERE campaign_id IN (
		  SELECT id FROM campaigns WHERE created_by = 'demo-seed'
		)
		   OR metadata->>'granted_by' = 'demo-seed'
	`)
	if err != nil {
		return r, fmt.Errorf("delete demo player bonuses: %w", err)
	}
	r.DemoBonusesDeleted, _ = res.RowsAffected()

	res, err = db.Exec(`
		DELETE FROM campaigns
		WHERE created_by = 'demo-seed'
	`)
	if err != nil {
		return r, fmt.Errorf("delete demo campaigns: %w", err)
	}
	r.DemoCampaignsDeleted, _ = res.RowsAffected()

	// Step 2a: delete demo-keyed ledger entries first (FK target). A ledger
	// row qualifies as 'demo' if it carries demo provenance on any of the
	// three pointers it can have:
	//   - reason LIKE 'demo:%'  — direct top-up entries
	//   - order_id ∈ demo orders — order-related collateral movements
	//   - trade_id ∈ demo trades — issuance/match collateral movements
	//
	// The third clause is the broadest: any trade either marked demo
	// history OR matched against an order we know is demo (whether the
	// trade is on the taker or maker side of the match). Without this
	// clause the FK constraint on prediction_collateral_ledger.trade_id
	// prevents deleting the trade in step 2b.
	res, err = db.Exec(`
		WITH demo_orders AS (
		  SELECT id FROM prediction_orders WHERE idempotency_key LIKE 'demo:%'
		),
		demo_trades AS (
		  SELECT id FROM prediction_trades
		  WHERE trade_kind = 'demo_history'
		     OR buy_order_id  IN (SELECT id FROM demo_orders)
		     OR sell_order_id IN (SELECT id FROM demo_orders)
		     OR match_id IN (
		       SELECT match_id FROM prediction_trades
		       WHERE buy_order_id  IN (SELECT id FROM demo_orders)
		          OR sell_order_id IN (SELECT id FROM demo_orders)
		     )
		)
		DELETE FROM prediction_collateral_ledger
		WHERE reason LIKE 'demo:%'
		   OR trade_id IN (SELECT id FROM demo_trades)
		   OR order_id IN (SELECT id FROM demo_orders)
	`)
	if err != nil {
		return r, fmt.Errorf("delete demo ledger entries: %w", err)
	}
	r.DemoLedgerDeleted, _ = res.RowsAffected()

	// Step 2b: delete demo-history synthetic trade rows (Phase 3 plant)
	// plus trades pointed at by demo orders, plus their match-paired
	// complementary trade rows. The match_id sub-clause catches the
	// maker side of issuance trades whose buy_order_id is the bot's
	// resting order (also demo, but the FK in 2a needs both sides
	// already cleared from the ledger).
	res, err = db.Exec(`
		WITH demo_orders AS (
		  SELECT id FROM prediction_orders WHERE idempotency_key LIKE 'demo:%'
		)
		DELETE FROM prediction_trades
		WHERE trade_kind = 'demo_history'
		   OR buy_order_id  IN (SELECT id FROM demo_orders)
		   OR sell_order_id IN (SELECT id FROM demo_orders)
		   OR match_id IN (
		     SELECT match_id FROM prediction_trades
		     WHERE buy_order_id  IN (SELECT id FROM demo_orders)
		        OR sell_order_id IN (SELECT id FROM demo_orders)
		   )
	`)
	if err != nil {
		return r, fmt.Errorf("delete demo trades: %w", err)
	}
	r.DemoTradesDeleted, _ = res.RowsAffected()

	// Step 2c: delete demo settlements + their settlement credit rows.
	// Settlements have
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
		return r, fmt.Errorf("delete demo settlement credit rows: %w", err)
	}

	// Step 2c.0: purge wallet_ledger settlement-credit entries for
	// demo-settled markets.
	// The settlement service uses the idempotency key
	// `prediction_payout:<marketID>:<positionID>`, where both ids are
	// stable across demo re-runs (market_id is md5(slug), position_id is
	// per (user, market)). After a wipe, re-settling the same market
	// would replay the same key — the wallet's unique constraint on
	// (entry_type, user_id, idempotency_key) then rejects with
	// "idempotency key replay payload conflict" and the settlement
	// errors out with the market stuck in 'closed'. Clear the wallet
	// entries here so the next ResolveMarket can write fresh credits.
	// Scope is the same markets the revert below touches.
	_, err = db.Exec(`
		DO $$
		BEGIN
		  IF to_regclass('public.wallet_ledger') IS NOT NULL THEN
		    DELETE FROM wallet_ledger
		    WHERE idempotency_key LIKE 'prediction_payout:%'
		      AND idempotency_key LIKE ANY (
		        SELECT 'prediction_payout:' || m.id::text || ':%'
		        FROM prediction_markets m
		        WHERE
		          (
		            m.status = 'settled'
		            AND (
		              m.id IN (SELECT DISTINCT market_id FROM prediction_settlements WHERE attestation_source = 'demo')
		              OR NOT EXISTS (SELECT 1 FROM prediction_settlements s WHERE s.market_id = m.id)
		            )
		          )
		          OR (m.status = 'closed' AND m.close_at > NOW())
		      );
		  END IF;
		END $$;
	`)
	if err != nil {
		return r, fmt.Errorf("purge demo settlement wallet entries: %w", err)
	}

	// Step 2c.1: revert markets that were settled by a demo settlement
	// back to 'open' (clear result, reset settlement point pool). Without this,
	// after the first demo run those market rows stay in status='settled'
	// permanently — Phase 4 then can't re-place u-1 positions in them
	// (it filters status='open') and Phase 5 can't re-settle them
	// (the open→closed transition refuses on already-settled markets).
	// Re-runs ended up with an empty History tab and an empty
	// Leaderboards page even though both phases reported success.
	//
	// Three cases to revert:
	//   (a) market has a current demo-attested settlement row
	//   (b) market is 'settled' but has NO settlement row at all —
	//       this happens when an older wipe-demo deleted the settlement
	//       row without reverting the market status. The only way a
	//       real (non-demo) settled market reaches us is via the
	//       auto-settler or manual resolve, both of which write a
	//       settlement row; so a settled-with-no-row market is by
	//       construction a stale-demo orphan we should unstick.
	//   (c) market is 'closed' with close_at in the future — Phase 5
	//       force-transitioned it open→closed and then the resolve
	//       errored, leaving it stuck. The auto-closer only transitions
	//       markets past their close_at, so a future-close_at + closed
	//       state is by construction a demo-stuck orphan.
	// Must run BEFORE the settlement DELETE below so case (a) still
	// matches.
	_, err = db.Exec(`
		UPDATE prediction_markets m
		SET status = 'open',
		    result = NULL,
		    settled_payout_pool_points = 0,
		    updated_at = NOW()
		WHERE
		  (
		    m.status = 'settled'
		    AND (
		      m.id IN (
		        SELECT DISTINCT market_id FROM prediction_settlements
		        WHERE attestation_source = 'demo'
		      )
		      OR NOT EXISTS (
		        SELECT 1 FROM prediction_settlements s WHERE s.market_id = m.id
		      )
		    )
		  )
		  OR (m.status = 'closed' AND m.close_at > NOW())
	`)
	if err != nil {
		return r, fmt.Errorf("revert demo-settled markets: %w", err)
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

	// Step 2e: positions touched by demo orders. DELETE for every
	// demo-touched user (bot, u-1, and the Phase 2 synthetic-volume
	// users user-001/002/003) where there is no surviving non-demo
	// trade backing. The NOT EXISTS guard still preserves any genuine
	// base-seed position (those have a non-demo trade); only demo-built
	// positions are cleared.
	//
	// user-001/002/003 were previously excluded on the assumption their
	// positions were all base-seed. They are not: Phase 2 attributes its
	// synthetic taker volume to them, so their positions survived every
	// wipe and Phase 2 re-stacked total_cost_points each reseed. service.go
	// then computed avg = (stale_total + new_cost) / qty, inflating
	// avg_price_points to 561-663¢, which settlement copied verbatim into
	// prediction_payouts.entry_price_points → the >100¢ "Entry" values in
	// portfolio History (F-4). Including them here makes each reseed start
	// their positions clean.
	res, err = db.Exec(`
		DELETE FROM prediction_positions p
		WHERE p.user_id IN ('user-bot', 'u-1', 'user-001', 'user-002', 'user-003')
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

	// Step 2f: delete orphaned prediction_order reservations. Step 2d
	// deletes demo orders but the wallet_reservations they created are
	// left behind as status='held' orphans. AvailableBalance is
	// balance - SUM(held) computed live (wallet/service.go), so every
	// reseed within one gateway lifetime stacks another large block of
	// dead point holds on user-bot until Phase 1 can no longer reserve and
	// fails with "hold reservation: insufficient points". That made the demo
	// nondeterministic (101 settlement credits on a fresh DB, 26 after several
	// reseeds). Scoped to reference_type='prediction_order'; only
	// removes reservations whose backing order no longer exists, so it
	// both heals accumulated cruft and stops future accumulation.
	res, err = db.Exec(`
		DELETE FROM wallet_reservations r
		WHERE r.reference_type = 'prediction_order'
		  AND NOT EXISTS (
		    SELECT 1 FROM prediction_orders o
		    WHERE o.id::text = r.reference_id::text
		  )
	`)
	if err != nil {
		return r, fmt.Errorf("delete orphan order reservations: %w", err)
	}
	r.OrphanOrderReservationsDeleted, _ = res.RowsAffected()

	return r, nil
}
