package prediction

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"
)

// TestMakerFillGuardRejectsStaleWrite is the COR-02 regression guard at the
// repository layer: updateMakerFillStateGuardedWithTx must apply the write only
// when the maker's filled_quantity still equals the value the plan was built
// against, and return ErrBookChanged (leaving the row untouched) otherwise.
// This is the mechanism that stops a concurrent taker's stale plan from
// regressing a maker that another taker already advanced.
//
// Run with: GATEWAY_DB_DSN=... go test ./internal/prediction/ -run TestMakerFillGuard -v
func TestMakerFillGuardRejectsStaleWrite(t *testing.T) {
	db := raceTestDB(t)
	repo := NewSQLRepository(db)
	ctx := context.Background()

	marketID := seedClosedMarketWithPositions(t, db, "makerguard")
	// The seed market is 'closed'; the guard test only touches prediction_orders,
	// which has no status dependency, so reuse its market/punters.
	userID := fmt.Sprintf("race-yes-%s", "x") // any FK-valid punter
	// Use a punter the seeder created for this market.
	if err := db.QueryRow(
		`SELECT user_id FROM prediction_positions WHERE market_id=$1 LIMIT 1`, marketID,
	).Scan(&userID); err != nil {
		t.Fatalf("find seeded punter: %v", err)
	}

	// Insert a resting maker order at filled_quantity=0, remaining=10.
	var makerID string
	if err := db.QueryRow(
		`INSERT INTO prediction_orders
		   (user_id, market_id, side, action, order_type, price_points,
		    quantity, filled_quantity, remaining_quantity, total_cost_points, status)
		 VALUES ($1,$2,'yes','sell','limit',60,10,0,10,0,'open')
		 RETURNING id`,
		userID, marketID,
	).Scan(&makerID); err != nil {
		t.Fatalf("seed maker order: %v", err)
	}

	now := time.Now().UTC()
	makerAfter := &Order{
		ID:                makerID,
		FilledQuantity:    4,
		RemainingQuantity: 6,
		Status:            OrderStatusPartial,
		UpdatedAt:         now,
	}

	// Case 1: expectedPrev matches the on-disk value (0) → applies.
	tx1, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx1: %v", err)
	}
	if err := repo.updateMakerFillStateGuardedWithTx(ctx, tx1, makerAfter, 0); err != nil {
		_ = tx1.Rollback()
		t.Fatalf("guarded update with correct prev should apply, got %v", err)
	}
	if err := tx1.Commit(); err != nil {
		t.Fatalf("commit tx1: %v", err)
	}
	var filled int
	if err := db.QueryRow(`SELECT filled_quantity FROM prediction_orders WHERE id=$1`, makerID).Scan(&filled); err != nil {
		t.Fatalf("read filled: %v", err)
	}
	if filled != 4 {
		t.Fatalf("expected filled_quantity=4 after guarded apply, got %d", filled)
	}

	// Case 2: a stale plan still believes filled_quantity==0, but it's now 4.
	// The guard must reject (ErrBookChanged) and NOT regress the row.
	stalePlanWrite := &Order{
		ID:                makerID,
		FilledQuantity:    2, // stale absolute that would REGRESS 4 -> 2
		RemainingQuantity: 8,
		Status:            OrderStatusPartial,
		UpdatedAt:         now,
	}
	tx2, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx2: %v", err)
	}
	err = repo.updateMakerFillStateGuardedWithTx(ctx, tx2, stalePlanWrite, 0)
	_ = tx2.Rollback()
	if !errors.Is(err, ErrBookChanged) {
		t.Fatalf("stale guarded update should return ErrBookChanged, got %v", err)
	}
	if err := db.QueryRow(`SELECT filled_quantity FROM prediction_orders WHERE id=$1`, makerID).Scan(&filled); err != nil {
		t.Fatalf("re-read filled: %v", err)
	}
	if filled != 4 {
		t.Fatalf("maker fill must not regress on a rejected stale write; got %d, want 4", filled)
	}
}
