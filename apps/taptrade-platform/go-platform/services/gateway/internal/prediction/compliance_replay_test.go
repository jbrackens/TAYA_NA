package prediction

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"
)

// idemRaceExchangeRepo embeds the memRepo (full Repository) and adds the
// ExchangeRepository surface so PlaceOrder takes the order-book branch. It
// models the *concurrent* idempotency race that D-5 codex P1 #3 is about:
// the pre-gate GetOrderByIdempotencyKey check sees nothing (the winning
// request hasn't committed yet), then this losing request's CreateOrder
// fails with a unique-violation while the winner's row becomes visible —
// so placeExchangeOrder falls through to GetOrderByIdempotencyKey and
// returns the pre-existing order. The exchange methods panic: a replay
// returns before any matching, so reaching them is a regression.
type idemRaceExchangeRepo struct {
	*memRepo
	createCalls int
}

func (r *idemRaceExchangeRepo) CreateOrder(ctx context.Context, o *Order) error {
	r.createCalls++
	// The concurrent winner committed its row between our pre-gate check and
	// this insert. Make it visible now so the fallthrough lookup resolves it,
	// then fail this (losing) insert like a real unique-key violation.
	if o.IdempotencyKey != nil {
		winner := cloneOrder(o)
		winner.ID = "winner-1"
		winner.Status = OrderStatusFilled
		winner.FilledQuantity = o.Quantity
		winner.CapturedCashPoints = 190
		r.memRepo.orders["winner-1"] = winner
	}
	return fmt.Errorf(`pq: duplicate key value violates unique constraint "orders_idempotency_key_key"`)
}

func (r *idemRaceExchangeRepo) GetOrderBook(context.Context, string, int) (*OrderBook, error) {
	panic("unreachable: idempotency replay returns before matching")
}
func (r *idemRaceExchangeRepo) PersistMatchAtomic(context.Context, ExchangeWalletAdapter, *MatchPlan) error {
	panic("unreachable: idempotency replay returns before matching")
}
func (r *idemRaceExchangeRepo) LoadMakersForSecondary(context.Context, string, OrderSide, OrderAction, *int, int) ([]Order, error) {
	panic("unreachable: idempotency replay returns before matching")
}
func (r *idemRaceExchangeRepo) LoadMakersForIssuance(context.Context, string, OrderSide, int, int) ([]Order, error) {
	panic("unreachable: idempotency replay returns before matching")
}
func (r *idemRaceExchangeRepo) RefreshMarketBestQuotes(context.Context, string) error {
	panic("unreachable: idempotency replay returns before matching")
}
func (r *idemRaceExchangeRepo) ReconcileMarket(context.Context, string) (*CollateralDriftReport, error) {
	panic("unreachable: idempotency replay returns before matching")
}
func (r *idemRaceExchangeRepo) ListRecentDriftAlerts(context.Context, time.Time) ([]CollateralDriftAlert, error) {
	panic("unreachable: idempotency replay returns before matching")
}

// stubExchangeWallet satisfies ExchangeWalletAdapter. Only the type assertion
// in placeExchangeOrder needs it; no method is called before the conflict
// return, so the tx/reservation primitives panic if exercised.
type stubExchangeWallet struct {
	*fakeWallet
}

func (s *stubExchangeWallet) BeginTx(context.Context) (*sql.Tx, error)         { panic("unreachable") }
func (s *stubExchangeWallet) BeginExchangeTx(context.Context) (*sql.Tx, error) { panic("unreachable") }
func (s *stubExchangeWallet) DebitWithTx(context.Context, *sql.Tx, string, int64, string, string) error {
	panic("unreachable")
}
func (s *stubExchangeWallet) CreditWithTx(context.Context, *sql.Tx, string, int64, string, string) error {
	panic("unreachable")
}
func (s *stubExchangeWallet) HoldWithTx(context.Context, *sql.Tx, string, int64, string, string, time.Duration) error {
	panic("unreachable")
}
func (s *stubExchangeWallet) CaptureReservationWithTx(context.Context, *sql.Tx, string, string, int64, string) error {
	panic("unreachable")
}
func (s *stubExchangeWallet) ReleaseReservationWithTx(context.Context, *sql.Tx, string, string) error {
	panic("unreachable")
}

// D-5 codex review P1 #3: a concurrent idempotent replay on the order-book
// path must NOT re-run RG RecordBet. The original (winning) request already
// recorded this order's stake; re-recording from the losing duplicate
// double-counts the user toward their period limit. Fails on pre-fix code
// (PlaceOrder recorded whenever placeExchangeOrder returned perr==nil, with
// no way to tell a fresh placement from a conflict-return).
func TestPlaceOrder_ConcurrentIdempotentReplay_DoesNotDoubleRecord(t *testing.T) {
	repo := &idemRaceExchangeRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.ExecutionMode = ExecutionModeOrderBook
	wallet := &stubExchangeWallet{fakeWallet: newFakeWallet(1_000_000)}
	svc := NewService(repo, wallet)

	rg := &fakeCompliance{deny: false}
	svc.SetComplianceChecker(rg)

	idem := "race-key-1"
	cap := int64(5000)
	order, _, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:          "mkt-1",
		Side:              OrderSideYes,
		Action:            OrderActionBuy,
		OrderType:         OrderTypeMarket,
		Quantity:          10,
		NotionalCapPoints: &cap,
		IdempotencyKey:    &idem,
	}, "user1")

	if err != nil {
		t.Fatalf("a concurrent idempotent replay must be retry-safe (return the existing order), got error: %v", err)
	}
	if order == nil || order.ID != "winner-1" {
		t.Fatalf("expected the pre-existing winning order returned, got %+v", order)
	}
	if repo.createCalls != 1 {
		t.Fatalf("expected exactly one CreateOrder attempt (the losing race), got %d", repo.createCalls)
	}
	// The crux: the winner already recorded this stake. The losing duplicate
	// must record zero — otherwise the user is double-counted toward the limit.
	if len(rg.recordCalls) != 0 {
		t.Fatalf("concurrent replay must NOT re-record stake (double-count); got RecordBet calls %v", rg.recordCalls)
	}
}
