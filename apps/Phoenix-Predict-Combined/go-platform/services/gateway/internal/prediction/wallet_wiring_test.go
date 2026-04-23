package prediction

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"
)

// fakeWallet is a test-only WalletAdapter that records calls and tracks balances.
type fakeWallet struct {
	balances    map[string]int64
	debitCalls  []walletCall
	creditCalls []walletCall
	debitErr    error
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
	markets           map[string]*Market
	orders            map[string]*Order
	positions         map[string]*Position
	trades            []Trade
	persistCalls      int
	createOrderErr    error
	createTradeErr    error
	upsertPositionErr error
	updateMarketErr   error
	settlement        map[string]*Settlement
	payouts           []Payout
	lifecycle         []LifecycleEvent
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
	return cloneMarket(m), nil
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
	if r.createOrderErr != nil {
		return r.createOrderErr
	}
	o.ID = fmt.Sprintf("ord-%d", len(r.orders)+1)
	r.orders[o.ID] = cloneOrder(o)
	return nil
}
func (r *memRepo) CreateTrade(ctx context.Context, t *Trade) error {
	if r.createTradeErr != nil {
		return r.createTradeErr
	}
	t.ID = fmt.Sprintf("trd-%d", len(r.trades)+1)
	r.trades = append(r.trades, *cloneTrade(t))
	return nil
}
func (r *memRepo) GetPosition(ctx context.Context, userID, marketID string, side OrderSide) (*Position, error) {
	key := userID + ":" + marketID + ":" + string(side)
	if p, ok := r.positions[key]; ok {
		return clonePosition(p), nil
	}
	return nil, fmt.Errorf("not found")
}
func (r *memRepo) UpsertPosition(ctx context.Context, p *Position) error {
	if r.upsertPositionErr != nil {
		return r.upsertPositionErr
	}
	key := p.UserID + ":" + p.MarketID + ":" + string(p.Side)
	if p.ID == "" {
		p.ID = fmt.Sprintf("pos-%d", len(r.positions)+1)
	}
	r.positions[key] = clonePosition(p)
	return nil
}
func (r *memRepo) UpdateMarket(ctx context.Context, m *Market) error {
	if r.updateMarketErr != nil {
		return r.updateMarketErr
	}
	r.markets[m.ID] = cloneMarket(m)
	return nil
}
func (r *memRepo) PersistFilledOrder(ctx context.Context, o *Order, t *Trade, p *Position, m *Market) error {
	r.persistCalls++
	orders := make(map[string]*Order, len(r.orders))
	for key, value := range r.orders {
		orders[key] = cloneOrder(value)
	}
	positions := make(map[string]*Position, len(r.positions))
	for key, value := range r.positions {
		positions[key] = clonePosition(value)
	}
	markets := make(map[string]*Market, len(r.markets))
	for key, value := range r.markets {
		markets[key] = cloneMarket(value)
	}
	trades := append([]Trade(nil), r.trades...)

	if r.createOrderErr != nil {
		return r.createOrderErr
	}
	order := cloneOrder(o)
	order.ID = fmt.Sprintf("ord-%d", len(r.orders)+1)
	orders[order.ID] = order

	if r.createTradeErr != nil {
		return r.createTradeErr
	}
	trade := cloneTrade(t)
	trade.ID = fmt.Sprintf("trd-%d", len(r.trades)+1)
	trades = append(trades, *trade)

	if r.upsertPositionErr != nil {
		return r.upsertPositionErr
	}
	position := clonePosition(p)
	if position.ID == "" {
		position.ID = fmt.Sprintf("pos-%d", len(r.positions)+1)
	}
	positions[position.UserID+":"+position.MarketID+":"+string(position.Side)] = position

	if r.updateMarketErr != nil {
		return r.updateMarketErr
	}
	markets[m.ID] = cloneMarket(m)

	r.orders = orders
	r.positions = positions
	r.trades = trades
	r.markets = markets

	*o = *cloneOrder(order)
	*t = *cloneTrade(trade)
	*p = *clonePosition(position)
	return nil
}

type atomicMemRepo struct {
	*memRepo
	atomicOrderCalls      int
	atomicSettlementCalls int
	atomicVoidCalls       int
	atomicAccrualCalls    int
	atomicErr             error
}

func (r *atomicMemRepo) PersistFilledOrderAtomic(
	ctx context.Context,
	wallet WalletAdapter,
	userID string,
	totalCost int64,
	debitKey string,
	debitReason string,
	order *Order,
	trade *Trade,
	position *Position,
	market *Market,
) error {
	r.atomicOrderCalls++
	if r.atomicErr != nil {
		return r.atomicErr
	}
	if err := wallet.Debit(userID, totalCost, debitKey, debitReason); err != nil {
		return err
	}
	return r.memRepo.PersistFilledOrder(ctx, order, trade, position, market)
}

func (r *atomicMemRepo) PersistResolvedMarketAtomic(
	ctx context.Context,
	wallet WalletAdapter,
	market *Market,
	settlement *Settlement,
	payouts []Payout,
	credits []WalletCreditRequest,
	loyalty LoyaltyAdapter,
	accruals []LoyaltyAccrualRequest,
	lifecycle *LifecycleEvent,
) ([]LoyaltyAccrualResult, error) {
	r.atomicSettlementCalls++
	if r.atomicErr != nil {
		return nil, r.atomicErr
	}
	if err := r.memRepo.CreateSettlement(ctx, settlement); err != nil {
		return nil, err
	}
	for i := range payouts {
		payouts[i].SettlementID = settlement.ID
		if err := r.memRepo.CreatePayout(ctx, &payouts[i]); err != nil {
			return nil, err
		}
	}
	for _, credit := range credits {
		if err := wallet.Credit(credit.UserID, credit.AmountCents, credit.IdempotencyKey, credit.Reason); err != nil {
			return nil, err
		}
	}
	// In-memory fake doesn't share a tx; the real loyalty path is exercised by
	// SQLRepository integration tests. Record the accruals count so callers can
	// assert they were forwarded.
	if loyalty != nil {
		r.atomicAccrualCalls += len(accruals)
	}
	if err := r.memRepo.UpdateMarket(ctx, market); err != nil {
		return nil, err
	}
	if lifecycle != nil {
		if err := r.memRepo.CreateLifecycleEvent(ctx, lifecycle); err != nil {
			return nil, err
		}
	}
	return nil, nil
}

func (r *atomicMemRepo) PersistVoidedMarketAtomic(
	ctx context.Context,
	wallet WalletAdapter,
	market *Market,
	payouts []Payout,
	credits []WalletCreditRequest,
	lifecycle *LifecycleEvent,
) error {
	r.atomicVoidCalls++
	if r.atomicErr != nil {
		return r.atomicErr
	}
	if err := r.memRepo.UpdateMarket(ctx, market); err != nil {
		return err
	}
	for _, credit := range credits {
		if err := wallet.Credit(credit.UserID, credit.AmountCents, credit.IdempotencyKey, credit.Reason); err != nil {
			return err
		}
	}
	if lifecycle != nil {
		if err := r.memRepo.CreateLifecycleEvent(ctx, lifecycle); err != nil {
			return err
		}
	}
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
func (r *memRepo) ListCategories(context.Context, bool) ([]Category, error)      { return nil, nil }
func (r *memRepo) GetCategory(context.Context, string) (*Category, error)        { return nil, nil }
func (r *memRepo) CreateCategory(context.Context, *Category) error               { return nil }
func (r *memRepo) ListSeries(context.Context, *string) ([]Series, error)         { return nil, nil }
func (r *memRepo) GetSeries(context.Context, string) (*Series, error)            { return nil, nil }
func (r *memRepo) CreateSeries(context.Context, *Series) error                   { return nil }
func (r *memRepo) ListEvents(context.Context, EventFilter) ([]Event, int, error) { return nil, 0, nil }
func (r *memRepo) GetEvent(context.Context, string) (*Event, error)              { return nil, nil }
func (r *memRepo) CreateEvent(context.Context, *Event) error                     { return nil }
func (r *memRepo) UpdateEventStatus(context.Context, string, EventStatus) error  { return nil }
func (r *memRepo) ListMarkets(context.Context, MarketFilter) ([]Market, int, error) {
	return nil, 0, nil
}
func (r *memRepo) GetMarketByTicker(context.Context, string) (*Market, error)     { return nil, nil }
func (r *memRepo) CreateMarket(context.Context, *Market) error                    { return nil }
func (r *memRepo) UpdateMarketStatus(context.Context, string, MarketStatus) error { return nil }
func (r *memRepo) ListMarketsToClose(context.Context) ([]Market, error)           { return nil, nil }
func (r *memRepo) ListMarketsToSettle(context.Context) ([]Market, error)          { return nil, nil }
func (r *memRepo) ListOrders(context.Context, OrderFilter) ([]Order, int, error)  { return nil, 0, nil }
func (r *memRepo) GetOrder(context.Context, string) (*Order, error)               { return nil, nil }
func (r *memRepo) UpdateOrder(context.Context, *Order) error                      { return nil }
func (r *memRepo) ListPositions(context.Context, string) ([]Position, error)      { return nil, nil }
func (r *memRepo) ListTrades(context.Context, string, int) ([]Trade, error)       { return nil, nil }
func (r *memRepo) GetSettlement(context.Context, string) (*Settlement, error)     { return nil, nil }
func (r *memRepo) ListLifecycleEvents(context.Context, string) ([]LifecycleEvent, error) {
	return nil, nil
}
func (r *memRepo) ListAPIKeys(context.Context, string) ([]APIKey, error)      { return nil, nil }
func (r *memRepo) GetAPIKeyByPrefix(context.Context, string) (*APIKey, error) { return nil, nil }
func (r *memRepo) CreateAPIKey(context.Context, *APIKey) error                { return nil }
func (r *memRepo) DeactivateAPIKey(context.Context, string) error             { return nil }
func (r *memRepo) TouchAPIKeyLastUsed(context.Context, string) error          { return nil }
func (r *memRepo) GetPortfolioSummary(context.Context, string) (*PortfolioSummary, error) {
	return nil, nil
}
func (r *memRepo) ListSettledPositions(context.Context, string, int, int) ([]Payout, int, error) {
	return nil, 0, nil
}
func (r *memRepo) GetDiscovery(context.Context) (*DiscoveryResponse, error) { return nil, nil }

func cloneOrder(o *Order) *Order {
	if o == nil {
		return nil
	}
	copy := *o
	if o.PriceCents != nil {
		value := *o.PriceCents
		copy.PriceCents = &value
	}
	if o.WalletReservationID != nil {
		value := *o.WalletReservationID
		copy.WalletReservationID = &value
	}
	if o.IdempotencyKey != nil {
		value := *o.IdempotencyKey
		copy.IdempotencyKey = &value
	}
	if o.ExpiresAt != nil {
		value := *o.ExpiresAt
		copy.ExpiresAt = &value
	}
	if o.FilledAt != nil {
		value := *o.FilledAt
		copy.FilledAt = &value
	}
	if o.CancelledAt != nil {
		value := *o.CancelledAt
		copy.CancelledAt = &value
	}
	return &copy
}

func cloneTrade(t *Trade) *Trade {
	if t == nil {
		return nil
	}
	copy := *t
	if t.BuyOrderID != nil {
		value := *t.BuyOrderID
		copy.BuyOrderID = &value
	}
	if t.SellOrderID != nil {
		value := *t.SellOrderID
		copy.SellOrderID = &value
	}
	if t.SellerID != nil {
		value := *t.SellerID
		copy.SellerID = &value
	}
	return &copy
}

func clonePosition(p *Position) *Position {
	if p == nil {
		return nil
	}
	copy := *p
	return &copy
}

func cloneMarket(m *Market) *Market {
	if m == nil {
		return nil
	}
	copy := *m
	if m.Result != nil {
		value := *m.Result
		copy.Result = &value
	}
	if m.LastTradePriceCents != nil {
		value := *m.LastTradePriceCents
		copy.LastTradePriceCents = &value
	}
	if m.SettlementCutoffAt != nil {
		value := *m.SettlementCutoffAt
		copy.SettlementCutoffAt = &value
	}
	if m.FallbackSourceKey != nil {
		value := *m.FallbackSourceKey
		copy.FallbackSourceKey = &value
	}
	if m.OpenAt != nil {
		value := *m.OpenAt
		copy.OpenAt = &value
	}
	return &copy
}

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
	if wallet.debitCalls[0].idempKey == "" {
		t.Fatal("expected wallet debit idempotency key to be auto-generated")
	}
	if order.IdempotencyKey == nil || *order.IdempotencyKey == "" {
		t.Fatal("expected stored order to carry a non-empty idempotency key")
	}
	if wallet.debitCalls[0].idempKey != "prediction_order:"+*order.IdempotencyKey {
		t.Fatalf("wallet debit key %q did not match stored order key %q", wallet.debitCalls[0].idempKey, *order.IdempotencyKey)
	}
	if wallet.balances["user1"] != 10000-order.TotalCostCents {
		t.Errorf("balance not reduced: %d", wallet.balances["user1"])
	}
	if repo.persistCalls != 1 {
		t.Fatalf("expected one persist call, got %d", repo.persistCalls)
	}
}

type fakeTxWallet struct {
	*fakeWallet
}

func (f *fakeTxWallet) BeginTx(context.Context) (*sql.Tx, error) { return nil, nil }
func (f *fakeTxWallet) DebitWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, idempotencyKey, reason string) error {
	return f.Debit(userID, amountCents, idempotencyKey, reason)
}
func (f *fakeTxWallet) CreditWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, idempotencyKey, reason string) error {
	return f.Credit(userID, amountCents, idempotencyKey, reason)
}

func TestPlaceOrder_UsesAtomicFillWhenRepoAndWalletSupportIt(t *testing.T) {
	repo := &atomicMemRepo{memRepo: newMemRepo()}
	seedMarket(t, repo.memRepo)
	wallet := &fakeTxWallet{fakeWallet: newFakeWallet(10000)}
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
		t.Fatal("expected order and trade from atomic fill path")
	}
	if repo.atomicOrderCalls != 1 {
		t.Fatalf("expected one atomic fill call, got %d", repo.atomicOrderCalls)
	}
	if repo.persistCalls != 1 {
		t.Fatalf("expected one persisted fill from atomic path, got %d", repo.persistCalls)
	}
	if len(wallet.debitCalls) != 1 {
		t.Fatalf("expected one wallet debit from atomic path, got %d", len(wallet.debitCalls))
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

func TestPlaceOrder_CreateOrderFailure_RefundsWallet(t *testing.T) {
	repo := newMemRepo()
	seedMarket(t, repo)
	repo.createOrderErr = fmt.Errorf("db unavailable")
	wallet := newFakeWallet(10000)
	svc := NewService(repo, wallet)

	_, _, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  10,
	}, "user1")
	if err == nil {
		t.Fatal("expected create order failure")
	}
	if len(wallet.debitCalls) != 1 {
		t.Fatalf("expected one debit before refund, got %d", len(wallet.debitCalls))
	}
	if len(wallet.creditCalls) != 1 {
		t.Fatalf("expected one compensating refund, got %d", len(wallet.creditCalls))
	}
	if wallet.creditCalls[0].amountCents != wallet.debitCalls[0].amountCents {
		t.Fatalf("refund amount %d should match debit amount %d", wallet.creditCalls[0].amountCents, wallet.debitCalls[0].amountCents)
	}
	if wallet.balances["user1"] != 10000 {
		t.Fatalf("expected balance restored to 10000, got %d", wallet.balances["user1"])
	}
	if len(repo.orders) != 0 {
		t.Fatalf("expected no persisted order on create failure, got %d", len(repo.orders))
	}
}

func TestPlaceOrder_UpdateMarketFailure_RefundsWalletAndRollsBackFill(t *testing.T) {
	repo := newMemRepo()
	seedMarket(t, repo)
	repo.updateMarketErr = fmt.Errorf("market write failed")
	wallet := newFakeWallet(10000)
	svc := NewService(repo, wallet)

	_, _, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  10,
	}, "user1")
	if err == nil {
		t.Fatal("expected update market failure")
	}
	if len(wallet.debitCalls) != 1 {
		t.Fatalf("expected one debit before refund, got %d", len(wallet.debitCalls))
	}
	if len(wallet.creditCalls) != 1 {
		t.Fatalf("expected one compensating refund, got %d", len(wallet.creditCalls))
	}
	if wallet.balances["user1"] != 10000 {
		t.Fatalf("expected balance restored to 10000, got %d", wallet.balances["user1"])
	}
	if len(repo.orders) != 0 {
		t.Fatalf("expected no persisted orders after rollback, got %d", len(repo.orders))
	}
	if len(repo.trades) != 0 {
		t.Fatalf("expected no persisted trades after rollback, got %d", len(repo.trades))
	}
	if len(repo.positions) != 0 {
		t.Fatalf("expected no persisted positions after rollback, got %d", len(repo.positions))
	}
	stored := repo.markets["mkt-1"]
	if stored.YesPriceCents != 50 || stored.NoPriceCents != 50 || stored.VolumeCents != 0 {
		t.Fatalf("expected original market snapshot to remain unchanged, got yes=%d no=%d volume=%d", stored.YesPriceCents, stored.NoPriceCents, stored.VolumeCents)
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

func TestResolveMarket_UsesAtomicSettlementWhenAvailable(t *testing.T) {
	repo := &atomicMemRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.Status = MarketStatusClosed

	repo.positions["alice:mkt-1:yes"] = &Position{
		ID: "pos-alice", UserID: "alice", MarketID: "mkt-1", Side: OrderSideYes,
		Quantity: 20, AvgPriceCents: 50, TotalCostCents: 1000,
	}
	repo.positions["bob:mkt-1:no"] = &Position{
		ID: "pos-bob", UserID: "bob", MarketID: "mkt-1", Side: OrderSideNo,
		Quantity: 15, AvgPriceCents: 50, TotalCostCents: 750,
	}

	wallet := &fakeTxWallet{fakeWallet: &fakeWallet{balances: map[string]int64{"alice": 0, "bob": 0}}}
	svc := NewService(repo, wallet)

	settlement, payouts, err := svc.ResolveMarket(context.Background(), "mkt-1", ResolveMarketRequest{
		Result:            MarketResultYes,
		AttestationSource: "admin",
	}, nil)
	if err != nil {
		t.Fatalf("ResolveMarket failed: %v", err)
	}
	if settlement == nil || len(payouts) != 2 {
		t.Fatalf("expected settlement and 2 payouts, got settlement=%v payouts=%d", settlement != nil, len(payouts))
	}
	if repo.atomicSettlementCalls != 1 {
		t.Fatalf("expected one atomic settlement call, got %d", repo.atomicSettlementCalls)
	}
	if len(wallet.creditCalls) != 1 || wallet.creditCalls[0].userID != "alice" {
		t.Fatalf("expected one winner credit for alice, got %+v", wallet.creditCalls)
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

func TestVoidMarket_UsesAtomicVoidWhenAvailable(t *testing.T) {
	repo := &atomicMemRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.Status = MarketStatusOpen

	repo.positions["alice:mkt-1:yes"] = &Position{
		ID: "pos-alice", UserID: "alice", MarketID: "mkt-1", Side: OrderSideYes,
		Quantity: 20, AvgPriceCents: 50, TotalCostCents: 1000,
	}
	repo.positions["bob:mkt-1:no"] = &Position{
		ID: "pos-bob", UserID: "bob", MarketID: "mkt-1", Side: OrderSideNo,
		Quantity: 15, AvgPriceCents: 50, TotalCostCents: 750,
	}

	wallet := &fakeTxWallet{fakeWallet: &fakeWallet{balances: map[string]int64{"alice": 0, "bob": 0}}}
	svc := NewService(repo, wallet)

	payouts, err := svc.VoidMarket(context.Background(), "mkt-1", "source unavailable", nil)
	if err != nil {
		t.Fatalf("VoidMarket failed: %v", err)
	}
	if len(payouts) != 2 {
		t.Fatalf("expected 2 payouts, got %d", len(payouts))
	}
	if repo.atomicVoidCalls != 1 {
		t.Fatalf("expected one atomic void call, got %d", repo.atomicVoidCalls)
	}
	if len(wallet.creditCalls) != 2 {
		t.Fatalf("expected 2 refund credits from atomic void path, got %d", len(wallet.creditCalls))
	}
}
