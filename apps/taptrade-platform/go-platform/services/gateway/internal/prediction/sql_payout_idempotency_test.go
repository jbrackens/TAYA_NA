package prediction

import (
	"context"
	"testing"
)

// TestSettlementPayoutIdempotency proves the two schema-level fixes that make
// the resumable batched settler (P3-12) safe to re-run after a crash:
//
//   - createPayoutWithExec: a second insert for the same (settlement, position)
//     is a no-op (uq_payout_settlement_position + ON CONFLICT DO NOTHING),
//     not a duplicate row and not an error.
//   - closeSettledPositionWithExec: a second close does NOT double-count PnL
//     (the `quantity > 0` guard), because realized_pnl_cents is accumulated.
//
// Without these, a resume pass that re-touched an already-paid position would
// mint a duplicate payout and double its realized PnL.
//
// Run with: GATEWAY_DB_DSN=... go test ./internal/prediction/ -run TestSettlementPayoutIdempotency -v
func TestSettlementPayoutIdempotency(t *testing.T) {
	db := raceTestDB(t)
	repo := NewSQLRepository(db)
	ctx := context.Background()

	marketID := seedClosedMarketWithPositions(t, db, "payout-idem")

	// One seeded position (qty 10, avg 50, cost 500).
	var posID, userID string
	if err := db.QueryRow(
		`SELECT id, user_id FROM prediction_positions WHERE market_id=$1 ORDER BY id LIMIT 1`,
		marketID,
	).Scan(&posID, &userID); err != nil {
		t.Fatalf("read seeded position: %v", err)
	}

	settlement := &Settlement{
		MarketID:          marketID,
		Result:            MarketResultYes,
		AttestationSource: "manual",
		TotalPayoutCents:  1000,
		PositionsSettled:  1,
	}
	if err := repo.createSettlementWithExec(ctx, db, settlement); err != nil {
		t.Fatalf("create settlement: %v", err)
	}

	payout := &Payout{
		SettlementID:    settlement.ID,
		PositionID:      posID,
		UserID:          userID,
		MarketID:        marketID,
		Side:            OrderSideYes,
		Quantity:        10,
		EntryPriceCents: 50,
		ExitPriceCents:  100,
		PnlCents:        500,
		PayoutCents:     1000,
	}

	// Insert twice — the second must be an idempotent no-op.
	if err := repo.createPayoutWithExec(ctx, db, payout); err != nil {
		t.Fatalf("first payout insert: %v", err)
	}
	dup := *payout
	if err := repo.createPayoutWithExec(ctx, db, &dup); err != nil {
		t.Fatalf("second payout insert must be idempotent, got: %v", err)
	}
	var payoutRows int
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM prediction_payouts WHERE settlement_id=$1 AND position_id=$2`,
		settlement.ID, posID,
	).Scan(&payoutRows); err != nil {
		t.Fatalf("count payouts: %v", err)
	}
	if payoutRows != 1 {
		t.Fatalf("expected exactly 1 payout row after double insert, got %d", payoutRows)
	}

	// Close twice with the same PnL — realized_pnl must increment once.
	if err := repo.closeSettledPositionWithExec(ctx, db, posID, 500); err != nil {
		t.Fatalf("first close: %v", err)
	}
	if err := repo.closeSettledPositionWithExec(ctx, db, posID, 500); err != nil {
		t.Fatalf("second close must be idempotent, got: %v", err)
	}
	var qty int
	var realizedPnl int64
	if err := db.QueryRow(
		`SELECT quantity, realized_pnl_cents FROM prediction_positions WHERE id=$1`, posID,
	).Scan(&qty, &realizedPnl); err != nil {
		t.Fatalf("read position: %v", err)
	}
	if qty != 0 {
		t.Fatalf("expected quantity 0 after close, got %d", qty)
	}
	if realizedPnl != 500 {
		t.Fatalf("expected realized_pnl_cents == 500 (incremented once), got %d (double-counted?)", realizedPnl)
	}
}
