package prediction

import (
	"context"
	"errors"
	"testing"
	"time"
)

type previewExchangeRepo struct {
	*memRepo
	secondary []Order
	issuance  []Order
}

func (r *previewExchangeRepo) GetOrderBook(context.Context, string, int) (*OrderBook, error) {
	return &OrderBook{}, nil
}

func (r *previewExchangeRepo) PersistMatchAtomic(context.Context, ExchangeWalletAdapter, *MatchPlan) error {
	panic("preview must not persist match plans")
}

func (r *previewExchangeRepo) LoadMakersForSecondary(context.Context, string, OrderSide, OrderAction, *int, int) ([]Order, error) {
	return append([]Order(nil), r.secondary...), nil
}

func (r *previewExchangeRepo) LoadMakersForIssuance(context.Context, string, OrderSide, int, int) ([]Order, error) {
	return append([]Order(nil), r.issuance...), nil
}

func (r *previewExchangeRepo) RefreshMarketBestQuotes(context.Context, string) error {
	return nil
}

func (r *previewExchangeRepo) ReconcileMarket(context.Context, string) (*CollateralDriftReport, error) {
	return &CollateralDriftReport{}, nil
}

func (r *previewExchangeRepo) ListRecentDriftAlerts(context.Context, time.Time) ([]CollateralDriftAlert, error) {
	return []CollateralDriftAlert{}, nil
}

func previewMaker(id string, userID string, side OrderSide, action OrderAction, priceCents int, qty int) Order {
	return Order{
		ID:                id,
		UserID:            userID,
		MarketID:          "mkt-1",
		Side:              side,
		Action:            action,
		OrderType:         OrderTypeLimit,
		PriceCents:        &priceCents,
		Quantity:          qty,
		RemainingQuantity: qty,
		Status:            OrderStatusOpen,
		TimeInForce:       TIFGTC,
		CreatedAt:         time.Now().Add(-time.Minute),
		UpdatedAt:         time.Now().Add(-time.Minute),
	}
}

func TestPreviewOrder_OrderBookUsesExchangeEngine(t *testing.T) {
	repo := &previewExchangeRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.ExecutionMode = ExecutionModeOrderBook
	repo.secondary = []Order{
		previewMaker("sell-yes-1", "maker-secondary", OrderSideYes, OrderActionSell, 60, 4),
	}
	repo.issuance = []Order{
		previewMaker("buy-no-1", "maker-issuance", OrderSideNo, OrderActionBuy, 35, 6),
	}

	svc := NewService(repo, newFakeWallet(0))
	preview, err := svc.PreviewOrderForUser(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  10,
	}, "user1")
	if err != nil {
		t.Fatalf("PreviewOrderForUser failed: %v", err)
	}

	if preview.ExecutionMode != ExecutionModeOrderBook {
		t.Fatalf("execution mode = %q, want %q", preview.ExecutionMode, ExecutionModeOrderBook)
	}
	if preview.FilledQuantity != 10 || preview.UnfilledQuantity != 0 {
		t.Fatalf("fill summary = %d filled / %d unfilled, want 10/0", preview.FilledQuantity, preview.UnfilledQuantity)
	}
	// 4 secondary shares at 60 + 6 complementary issuance shares at (100-35).
	if preview.TotalCost != 630 {
		t.Fatalf("total cost = %d, want 630", preview.TotalCost)
	}
	if preview.AverageFillPriceCents != 63 || preview.PriceCents != 63 {
		t.Fatalf("avg/price = %d/%d, want 63/63", preview.AverageFillPriceCents, preview.PriceCents)
	}
	if preview.MaxProfit != 370 || preview.MaxLoss != 630 {
		t.Fatalf("profit/loss = %d/%d, want 370/630", preview.MaxProfit, preview.MaxLoss)
	}
	if preview.QuoteStatus != OrderStatusFilled {
		t.Fatalf("quote status = %q, want filled", preview.QuoteStatus)
	}
}

func TestPreviewOrder_OrderBookNoLiquidityReturnsZeroFillQuote(t *testing.T) {
	repo := &previewExchangeRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.ExecutionMode = ExecutionModeOrderBook

	svc := NewService(repo, newFakeWallet(0))
	preview, err := svc.PreviewOrderForUser(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  5,
	}, "user1")
	if err != nil {
		t.Fatalf("PreviewOrderForUser failed: %v", err)
	}

	if preview.FilledQuantity != 0 || preview.UnfilledQuantity != 5 {
		t.Fatalf("fill summary = %d filled / %d unfilled, want 0/5", preview.FilledQuantity, preview.UnfilledQuantity)
	}
	if preview.TotalCost != 0 || preview.TotalCostWithFeesCents != 0 {
		t.Fatalf("cost = %d with fees %d, want 0/0", preview.TotalCost, preview.TotalCostWithFeesCents)
	}
	if preview.QuoteStatus != OrderStatusCancelled {
		t.Fatalf("quote status = %q, want cancelled", preview.QuoteStatus)
	}
}

func TestPreviewOrder_OrderBookPartialMarketBuyReportsPartialFill(t *testing.T) {
	repo := &previewExchangeRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.ExecutionMode = ExecutionModeOrderBook
	repo.secondary = []Order{
		previewMaker("sell-yes-1", "maker-secondary", OrderSideYes, OrderActionSell, 60, 3),
	}

	svc := NewService(repo, newFakeWallet(0))
	preview, err := svc.PreviewOrderForUser(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  5,
	}, "user1")
	if err != nil {
		t.Fatalf("PreviewOrderForUser failed: %v", err)
	}

	if preview.FilledQuantity != 3 || preview.UnfilledQuantity != 2 {
		t.Fatalf("fill summary = %d filled / %d unfilled, want 3/2", preview.FilledQuantity, preview.UnfilledQuantity)
	}
	if preview.TotalCost != 180 || preview.AverageFillPriceCents != 60 {
		t.Fatalf("cost/avg = %d/%d, want 180/60", preview.TotalCost, preview.AverageFillPriceCents)
	}
	if preview.MaxProfit != 120 || preview.MaxLoss != 180 {
		t.Fatalf("profit/loss = %d/%d, want 120/180", preview.MaxProfit, preview.MaxLoss)
	}
	if preview.QuoteStatus != OrderStatusCancelled {
		t.Fatalf("quote status = %q, want cancelled for market-order remainder", preview.QuoteStatus)
	}
}

func TestPreviewOrder_OrderBookSelfMatchRejected(t *testing.T) {
	repo := &previewExchangeRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.ExecutionMode = ExecutionModeOrderBook
	repo.secondary = []Order{
		previewMaker("sell-yes-1", "user1", OrderSideYes, OrderActionSell, 60, 5),
	}

	svc := NewService(repo, newFakeWallet(0))
	_, err := svc.PreviewOrderForUser(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  5,
	}, "user1")
	if !errors.Is(err, ErrSelfMatchRejected) {
		t.Fatalf("error = %v, want ErrSelfMatchRejected", err)
	}
}
