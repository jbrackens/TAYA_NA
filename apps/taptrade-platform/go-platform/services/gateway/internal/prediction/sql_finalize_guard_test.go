package prediction

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
)

// exchangeTxWalletStub extends the settlement-race txWalletStub with the
// ExchangeWalletAdapter surface FinalizeRestingOrderAtomic needs. The tx
// opener hands out real transactions from the test DB; reservation ops are
// no-ops — the assertions target the status-guarded order UPDATE, which is
// what protects the reservation releases sharing its transaction.
type exchangeTxWalletStub struct{ txWalletStub }

func (w *exchangeTxWalletStub) BeginExchangeTx(ctx context.Context) (*sql.Tx, error) {
	return w.db.BeginTx(ctx, nil)
}
func (w *exchangeTxWalletStub) HoldWithTx(context.Context, *sql.Tx, string, int64, string, string, time.Duration) error {
	return nil
}
func (w *exchangeTxWalletStub) CaptureReservationWithTx(context.Context, *sql.Tx, string, string, int64, string) error {
	return nil
}
func (w *exchangeTxWalletStub) ReleaseReservationWithTx(context.Context, *sql.Tx, string, string) error {
	return nil
}

// seedRestingOrder inserts an order in the given status on a fresh market and
// returns it. Uses repo.CreateOrder so column defaults and punter
// auto-provisioning match production writes.
func seedRestingOrder(t *testing.T, db *sql.DB, repo *SQLRepository, status OrderStatus, tag string) *Order {
	t.Helper()
	marketID := seedClosedMarketWithPositions(t, db, tag)
	price := 40
	o := &Order{
		UserID:            fmt.Sprintf("finalize-%s-%d", tag, time.Now().UnixNano()),
		MarketID:          marketID,
		Side:              OrderSideYes,
		Action:            OrderActionBuy,
		OrderType:         OrderTypeLimit,
		PricePoints:       &price,
		Quantity:          10,
		FilledQuantity:    0,
		RemainingQuantity: 10,
		TotalCostPoints:   400,
		Status:            status,
	}
	if err := repo.CreateOrder(context.Background(), o); err != nil {
		t.Fatalf("seed %s order: %v", status, err)
	}
	return o
}

// TestFinalizeRestingOrderGuardRefusesTerminalOrder is the red/green proof for
// the cancel-vs-fill race guard: the terminal UPDATE inside
// FinalizeRestingOrderAtomic must refuse to overwrite an order that already
// reached a terminal state, and the whole tx (including reservation releases)
// must roll back.
//
// Run with: GATEWAY_DB_DSN=... go test ./internal/prediction/ -run TestFinalizeRestingOrderGuard -v
func TestFinalizeRestingOrderGuardRefusesTerminalOrder(t *testing.T) {
	db := raceTestDB(t)
	repo := NewSQLRepository(db)
	wallet := &exchangeTxWalletStub{txWalletStub{db: db}}
	ctx := context.Background()

	// A concurrently-filled order must not be flipped to cancelled.
	filled := seedRestingOrder(t, db, repo, OrderStatusFilled, "guard-filled")
	_, _, _, err := repo.FinalizeRestingOrderAtomic(ctx, wallet, filled, OrderStatusCancelled)
	if !errors.Is(err, ErrOrderAlreadyTerminal) {
		t.Fatalf("expected ErrOrderAlreadyTerminal for filled order, got %v", err)
	}
	var status string
	var cancelledAt sql.NullTime
	if err := db.QueryRow(`SELECT status, cancelled_at FROM prediction_orders WHERE id=$1`, filled.ID).Scan(&status, &cancelledAt); err != nil {
		t.Fatalf("read filled order: %v", err)
	}
	if status != string(OrderStatusFilled) || cancelledAt.Valid {
		t.Fatalf("guard must not touch a filled order; status=%s cancelledAt.Valid=%t", status, cancelledAt.Valid)
	}

	// A still-resting order finalizes normally.
	open := seedRestingOrder(t, db, repo, OrderStatusOpen, "guard-open")
	if _, _, _, err := repo.FinalizeRestingOrderAtomic(ctx, wallet, open, OrderStatusCancelled); err != nil {
		t.Fatalf("finalize open order: %v", err)
	}
	if err := db.QueryRow(`SELECT status FROM prediction_orders WHERE id=$1`, open.ID).Scan(&status); err != nil {
		t.Fatalf("read cancelled order: %v", err)
	}
	if status != string(OrderStatusCancelled) {
		t.Fatalf("open order should cancel; status=%s", status)
	}
}

// TestFinalizeRestingOrderCancelVsFillRace races a fill-style terminal CAS
// against FinalizeRestingOrderAtomic on the same open order. Exactly one side
// may win: either the order ends filled and the finalize reports
// ErrOrderAlreadyTerminal, or it ends cancelled and the fill CAS matched no
// row. A filled order silently overwritten to cancelled fails the test —
// that was the pre-guard bug.
func TestFinalizeRestingOrderCancelVsFillRace(t *testing.T) {
	db := raceTestDB(t)
	repo := NewSQLRepository(db)
	wallet := &exchangeTxWalletStub{txWalletStub{db: db}}
	ctx := context.Background()

	for i := 0; i < 8; i++ {
		order := seedRestingOrder(t, db, repo, OrderStatusOpen, fmt.Sprintf("race-%d", i))

		var (
			wg          sync.WaitGroup
			finalizeErr error
			fillRows    int64
		)
		wg.Add(2)
		go func() {
			defer wg.Done()
			// Fill-side terminal write, guarded the way the match path guards
			// maker updates (only a resting row may flip to filled).
			res, err := db.Exec(
				`UPDATE prediction_orders
				    SET status='filled', filled_quantity=quantity, remaining_quantity=0,
				        filled_at=NOW(), updated_at=NOW()
				  WHERE id=$1 AND status IN ('pending','open','partial')`,
				order.ID)
			if err != nil {
				t.Errorf("fill update: %v", err)
				return
			}
			fillRows, _ = res.RowsAffected()
		}()
		go func() {
			defer wg.Done()
			_, _, _, finalizeErr = repo.FinalizeRestingOrderAtomic(ctx, wallet, order, OrderStatusCancelled)
		}()
		wg.Wait()

		var status string
		if err := db.QueryRow(`SELECT status FROM prediction_orders WHERE id=$1`, order.ID).Scan(&status); err != nil {
			t.Fatalf("read raced order: %v", err)
		}
		switch status {
		case string(OrderStatusFilled):
			if fillRows != 1 {
				t.Fatalf("iteration %d: order filled but fill CAS reported %d rows", i, fillRows)
			}
			if !errors.Is(finalizeErr, ErrOrderAlreadyTerminal) {
				t.Fatalf("iteration %d: fill won but finalize returned %v (filled order would have been overwritten pre-guard)", i, finalizeErr)
			}
		case string(OrderStatusCancelled):
			if finalizeErr != nil {
				t.Fatalf("iteration %d: cancel won but finalize errored: %v", i, finalizeErr)
			}
			if fillRows != 0 {
				t.Fatalf("iteration %d: cancel won but fill CAS also claimed %d rows", i, fillRows)
			}
		default:
			t.Fatalf("iteration %d: unexpected terminal status %s", i, status)
		}
	}
}

// TestOrderWritesPersistFailureReason pins the audit fix: rejected orders keep
// failure_reason on the DB row through both CreateOrder (validation rejects)
// and UpdateOrder (engine/persist rejects).
func TestOrderWritesPersistFailureReason(t *testing.T) {
	db := raceTestDB(t)
	repo := NewSQLRepository(db)
	ctx := context.Background()

	// CreateOrder path (persistRejectedExchangeOrder shape).
	rejected := seedRestingOrder(t, db, repo, OrderStatusOpen, "reason-insert")
	reason := FailureInsufficientPosition
	rejected2 := *rejected
	rejected2.ID = ""
	rejected2.Status = OrderStatusRejected
	rejected2.FailureReason = &reason
	rejected2.IdempotencyKey = nil
	if err := repo.CreateOrder(ctx, &rejected2); err != nil {
		t.Fatalf("create rejected order: %v", err)
	}
	var got sql.NullString
	if err := db.QueryRow(`SELECT failure_reason FROM prediction_orders WHERE id=$1`, rejected2.ID).Scan(&got); err != nil {
		t.Fatalf("read inserted failure_reason: %v", err)
	}
	if !got.Valid || got.String != reason {
		t.Fatalf("CreateOrder failure_reason = %+v, want %q", got, reason)
	}

	// UpdateOrder path (engine reject on a persisted pending/open order).
	pending := seedRestingOrder(t, db, repo, OrderStatusPending, "reason-update")
	updReason := "persist match: hold reservation: insufficient funds"
	pending.Status = OrderStatusRejected
	pending.FailureReason = &updReason
	if err := repo.UpdateOrder(ctx, pending); err != nil {
		t.Fatalf("update order to rejected: %v", err)
	}
	if err := db.QueryRow(`SELECT failure_reason FROM prediction_orders WHERE id=$1`, pending.ID).Scan(&got); err != nil {
		t.Fatalf("read updated failure_reason: %v", err)
	}
	if !got.Valid || got.String != updReason {
		t.Fatalf("UpdateOrder failure_reason = %+v, want %q", got, updReason)
	}
}
