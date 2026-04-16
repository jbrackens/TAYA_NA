package prediction

import (
	"context"
	"fmt"
	"testing"
	"time"
)

// fakeWallet is a test-only WalletAdapter that records calls and tracks balances.
type fakeWallet struct {
	balances     map[string]int64
	debitCalls   []walletCall
	creditCalls  []walletCall
	debitErr     error
}

type walletCall struct {
	userID      string
	amountCents int64
	idempKey    string
	reason      string
}

func newFakeWallet(initialBalance int64) *fakeWallet {
	return &fakeWallet{balances: map[string]int64{"user1": initialBalance}}
}

func (f *fakeWallet) Debit(userID string, amountCents int64, idempotencyKey, reason string) error {
	if f.debitErr != nil {
		return f.debitErr
	}
	if f.balances[userID] < amountCents {
		return fmt.Errorf("insufficient balance")
	}
	f.balances[userID] -= amountCents
	f.debitCalls = append(f.debitCalls, walletCall{userID, amountCents, idempotencyKey, reason})
	return nil
}

func (f *fakeWallet) Credit(userID string, amountCents int64, idempotencyKey, reason string) error {
	f.balances[userID] += amountCents
	f.creditCalls = append(f.creditCalls, walletCall{userID, amountCents, idempotencyKey, reason})
	return nil
}

func (f *fakeWallet) Balance(userID string) int64 { return f.balances[userID] }

// memRepo is a minimal in-memory Repository for wiring tests. It only supports
// the subset of methods exercised by the tests below.
type memRepo struct {
	markets    map[string]*Market
	orders     map[string]*Order
	positions  map[string]*Position
	trades     []Trade
	settlement map[string]*Settlement
	payouts    []Payout
	lifecycle  []LifecycleEvent
}

func newMemRepo() *memRepo {
	return &memRepo{
		markets:    make(map[string]*Market),
		orders:     make(map[string]*Order),
		positions:  make(map[string]*Position),
		settlement: make(map[string]*Settlement),
	}
}

// Repository methods — only the ones PlaceOrder + ResolveMarket actually use.
func (r *memRepo) GetMarket(ctx context.Context, id string) (*Market, error) {
	m, ok := r.markets[id]
	if !ok {
		return nil, fmt.Errorf("market not found")
	}
	return m, nil
}
func (r *memRepo) GetOrderByIdempotencyKey(ctx context.Context, k string) (*Order, error) {
	for _, o := range r.orders {
		if o.IdempotencyKey != nil && *o.IdempotencyKey == k {
			return o, nil
		}
	}
	return nil, fmt.Errorf("not found")
}
func (r *memRepo) CreateOrder(ctx context.Context, o *Order) error {
	o.ID = fmt.Sprintf("ord-%d", len(r.orders)+1)
	r.orders[o.ID] = o
	return nil
}
func (r *memRepo) CreateTrade(ctx context.Context, t *Trade) error {
	t.ID = fmt.Sprintf("trd-%d", len(r.trades)+1)
	r.trades = append(r.trades, *t)
	return nil
}
func (r *memRepo) GetPosition(ctx context.Context, userID, marketID string, side OrderSide) (*Position, error) {
	key := userID + ":" + marketID + ":" + string(side)
	if p, ok := r.positions[key]; ok {
		return p, nil
	}
	return nil, fmt.Errorf("not found")
}
func (r *memRepo) UpsertPosition(ctx context.Context, p *Position) error {
	key := p.UserID + ":" + p.MarketID + ":" + string(p.Side)
	if p.ID == "" {
		p.ID = fmt.Sprintf("pos-%d", len(r.positions)+1)
	}
	r.positions[key] = p
	return nil
}
func (r *memRepo) UpdateMarket(ctx context.Context, m *Market) error {
	r.markets[m.ID] = m
	return nil
}
func (r *memRepo) ListPositionsByMarket(ctx context.Context, marketID string) ([]Position, error) {
	var out []Position
	for _, p := range r.positions {
		if p.MarketID == marketID {
			out = append(out, *p)
		}
	}
	return out, nil
}
func (r *memRepo) CreateSettlement(ctx context.Context, s *Settlement) error {
	s.ID = fmt.Sprintf("stl-%d", len(r.settlement)+1)
	r.settlement[s.MarketID] = s
	return nil
}
func (r *memRepo) CreatePayout(ctx context.Context, p *Payout) error {
	p.ID = fmt.Sprintf("pay-%d", len(r.payouts)+1)
	r.payouts = append(r.payouts, *p)
	return nil
}
func (r *memRepo) CreateLifecycleEvent(ctx context.Context, e *LifecycleEvent) error {
	r.lifecycle = append(r.lifecycle, *e)
	return nil
}

// Unused but required to satisfy Repository interface — return empty/nil.
func (r *memRepo) ListCategories(context.Context, bool) ([]Category, error)                 { return nil, nil }
func (r *memRepo) GetCategory(context.Context, string) (*Category, error)                   { return nil, nil }
func (r *memRepo) CreateCategory(context.Context, *Category) error                          { return nil }
func (r *memRepo) ListSeries(context.Context, *string) ([]Series, error)                    { return nil, nil }
func (r *memRepo) GetSeries(context.Context, string) (*Series, error)                       { return nil, nil }
func (r *memRepo) CreateSeries(context.Context, *Series) error                              { return nil }
func (r *memRepo) ListEvents(context.Context, EventFilter) ([]Event, int, error)            { return nil, 0, nil }
func (r *memRepo) GetEvent(context.Context, string) (*Event, error)                         { return nil, nil }
func (r *memRepo) CreateEvent(context.Context, *Event) error                                { return nil }
func (r *memRepo) UpdateEventStatus(context.Context, string, EventStatus) error             { return nil }
func (r *memRepo) ListMarkets(context.Context, MarketFilter) ([]Market, int, error)         { return nil, 0, nil }
func (r *memRepo) GetMarketByTicker(context.Context, string) (*Market, error)               { return nil, nil }
func (r *memRepo) CreateMarket(context.Context, *Market) error                              { return nil }
func (r *memRepo) UpdateMarketStatus(context.Context, string, MarketStatus) error           { return nil }
func (r *memRepo) ListMarketsToClose(context.Context) ([]Market, error)                     { return nil, nil }
func (r *memRepo) ListMarketsToSettle(context.Context) ([]Market, error)                    { return nil, nil }
func (r *memRepo) ListOrders(context.Context, OrderFilter) ([]Order, int, error)            { return nil, 0, nil }
func (r *memRepo) GetOrder(context.Context, string) (*Order, error)                         { return nil, nil }
func (r *memRepo) UpdateOrder(context.Context, *Order) error                                { return nil }
func (r *memRepo) ListPositions(context.Context, string) ([]Position, error)                { return nil, nil }
func (r *memRepo) ListTrades(context.Context, string, int) ([]Trade, error)                 { return nil, nil }
func (r *memRepo) GetSettlement(context.Context, string) (*Settlement, error)               { return nil, nil }
func (r *memRepo) ListLifecycleEvents(context.Context, string) ([]LifecycleEvent, error)    { return nil, nil }
func (r *memRepo) ListAPIKeys(context.Context, string) ([]APIKey, error)                    { return nil, nil }
func (r *memRepo) GetAPIKeyByPrefix(context.Context, string) (*APIKey, error)               { return nil, nil }
func (r *memRepo) CreateAPIKey(context.Context, *APIKey) error                              { return nil }
func (r *memRepo) DeactivateAPIKey(context.Context, string) error                           { return nil }
func (r *memRepo) TouchAPIKeyLastUsed(context.Context, string) error                        { return nil }
func (r *memRepo) GetPortfolioSummary(context.Context, string) (*PortfolioSummary, error)   { return nil, nil }
func (r *memRepo) ListSettledPositions(context.Context, string, int, int) ([]Payout, int, error) {
	return nil, 0, nil
}
func (r *memRepo) GetDiscovery(context.Context) (*DiscoveryResponse, error) { return nil, nil }

// --- Tests ---

func seedMarket(t *testing.T, repo *memRepo) *Market {
	t.Helper()
	m := &Market{
		ID:                "mkt-1",
		Ticker:            "TEST-YES",
		Status:            MarketStatusOpen,
		YesPriceCents:     50,
		NoPriceCents:      50,
		AMMYesShares:      0,
		AMMNoShares:       0,
		AMMLiquidityParam: 100,
		FeeRateBps:        0,
		CloseAt:           time.Now().Add(24 * time.Hour),
	}
	repo.markets[m.ID] = m
	return m
}

func TestPlaceOrder_DebitsWallet(t *testing.T) {
	repo := newMemRepo()
	seedMarket(t, repo)
	wallet := newFakeWallet(10000) // $100.00
	svc := NewService(repo, wallet)

	order, trade, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  10,
	}, "user1")
	if err != nil {
		t.Fatalf("PlaceOrder failed: %v", err)
	}
	if order == nil || trade == nil {
		t.Fatal("expected order and trade to be non-nil")
	}
	if len(wallet.debitCalls) != 1 {
		t.Fatalf("expected 1 debit call, got %d", len(wallet.debitCalls))
	}
	if wallet.debitCalls[0].userID != "user1" {
		t.Errorf("wrong user: %s", wallet.debitCalls[0].userID)
	}
	if wallet.debitCalls[0].amountCents != order.TotalCostCents {
		t.Errorf("debit amount mismatch: wallet=%d order=%d",
			wallet.debitCalls[0].amountCents, order.TotalCostCents)
	}
	if wallet.balances["user1"] != 10000-order.TotalCostCents {
		t.Errorf("balance not reduced: %d", wallet.balances["user1"])
	}
}

func TestPlaceOrder_InsufficientBalance_Rejected(t *testing.T) {
	repo := newMemRepo()
	seedMarket(t, repo)
	wallet := newFakeWallet(10) // $0.10 — too little
	svc := NewService(repo, wallet)

	_, _, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  10,
	}, "user1")
	if err == nil {
		t.Fatal("expected insufficient balance error")
	}
	if len(wallet.debitCalls) != 0 {
		t.Errorf("expected 0 debit calls on rejection, got %d", len(wallet.debitCalls))
	}
	if len(repo.orders) != 0 {
		t.Errorf("no order should have been created on rejection")
	}
}

// TestPlaceOrder_ZeroBalance_Rejected guards against a regression where the
// balance check was skipped when balance == 0, letting users with empty
// wallets place orders that would only fail later at debit time.
func TestPlaceOrder_ZeroBalance_Rejected(t *testing.T) {
	repo := newMemRepo()
	seedMarket(t, repo)
	wallet := &fakeWallet{balances: map[string]int64{"user1": 0}}
	svc := NewService(repo, wallet)

	_, _, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  10,
	}, "user1")
	if err == nil {
		t.Fatal("expected rejection for zero balance")
	}
	if len(wallet.debitCalls) != 0 {
		t.Errorf("wallet.Debit must not be called when pre-check rejects; got %d calls", len(wallet.debitCalls))
	}
	if len(repo.orders) != 0 {
		t.Errorf("no order should be created on rejection")
	}
}

// TestPlaceOrder_NoopWallet_AllowsAnyBalance ensures the NoopWallet sentinel
// (math.MaxInt64 from Balance) short-circuits the pre-check, so tests that
// don't care about wallet behavior can still exercise trading paths.
func TestPlaceOrder_NoopWallet_AllowsAnyBalance(t *testing.T) {
	repo := newMemRepo()
	seedMarket(t, repo)
	svc := NewService(repo, nil) // nil → NoopWallet

	_, _, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  10,
	}, "anyone")
	if err != nil {
		t.Fatalf("NoopWallet should allow order; got error: %v", err)
	}
	if len(repo.orders) != 1 {
		t.Errorf("expected 1 order created under NoopWallet, got %d", len(repo.orders))
	}
}

func TestResolveMarket_CreditsWinnersOnly(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed // must be closed to settle

	// Two users: alice bet YES (winner), bob bet NO (loser)
	repo.positions["alice:mkt-1:yes"] = &Position{
		ID: "pos-alice", UserID: "alice", MarketID: "mkt-1", Side: OrderSideYes,
		Quantity: 20, AvgPriceCents: 50, TotalCostCents: 1000,
	}
	repo.positions["bob:mkt-1:no"] = &Position{
		ID: "pos-bob", UserID: "bob", MarketID: "mkt-1", Side: OrderSideNo,
		Quantity: 15, AvgPriceCents: 50, TotalCostCents: 750,
	}

	wallet := &fakeWallet{balances: map[string]int64{"alice": 0, "bob": 0}}
	svc := NewService(repo, wallet)

	_, payouts, err := svc.ResolveMarket(context.Background(), "mkt-1", ResolveMarketRequest{
		Result:            MarketResultYes,
		AttestationSource: "admin",
	}, nil)
	if err != nil {
		t.Fatalf("ResolveMarket failed: %v", err)
	}
	if len(payouts) != 2 {
		t.Fatalf("expected 2 payouts, got %d", len(payouts))
	}

	// Only the winner (alice) should get a credit
	if len(wallet.creditCalls) != 1 {
		t.Fatalf("expected 1 credit (winner only), got %d", len(wallet.creditCalls))
	}
	if wallet.creditCalls[0].userID != "alice" {
		t.Errorf("expected alice to be credited, got %s", wallet.creditCalls[0].userID)
	}
	// Alice had 20 YES contracts, each pays 100¢ = 2000 cents
	if wallet.creditCalls[0].amountCents != 2000 {
		t.Errorf("expected 2000¢ payout, got %d", wallet.creditCalls[0].amountCents)
	}
	if wallet.balances["alice"] != 2000 {
		t.Errorf("alice balance: expected 2000, got %d", wallet.balances["alice"])
	}
	if wallet.balances["bob"] != 0 {
		t.Errorf("bob (loser) balance should be 0, got %d", wallet.balances["bob"])
	}
}

func TestVoidMarket_RefundsAllPositions(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusOpen

	repo.positions["alice:mkt-1:yes"] = &Position{
		ID: "pos-alice", UserID: "alice", MarketID: "mkt-1", Side: OrderSideYes,
		Quantity: 20, AvgPriceCents: 50, TotalCostCents: 1000,
	}
	repo.positions["bob:mkt-1:no"] = &Position{
		ID: "pos-bob", UserID: "bob", MarketID: "mkt-1", Side: OrderSideNo,
		Quantity: 15, AvgPriceCents: 50, TotalCostCents: 750,
	}

	wallet := &fakeWallet{balances: map[string]int64{"alice": 0, "bob": 0}}
	svc := NewService(repo, wallet)

	payouts, err := svc.VoidMarket(context.Background(), "mkt-1", "source unavailable", nil)
	if err != nil {
		t.Fatalf("VoidMarket failed: %v", err)
	}
	if len(payouts) != 2 {
		t.Fatalf("expected 2 refund payouts, got %d", len(payouts))
	}
	if len(wallet.creditCalls) != 2 {
		t.Fatalf("expected 2 refund credits (both users), got %d", len(wallet.creditCalls))
	}
	if wallet.balances["alice"] != 1000 {
		t.Errorf("alice refund: expected 1000, got %d", wallet.balances["alice"])
	}
	if wallet.balances["bob"] != 750 {
		t.Errorf("bob refund: expected 750, got %d", wallet.balances["bob"])
	}
}
