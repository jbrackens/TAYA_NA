package workers

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	"taptrade/gateway/internal/prediction"
	"taptrade/gateway/internal/prediction/feed"
)

// fakeWorkerRepo embeds prediction.Repository so it satisfies the full
// interface; only the methods a worker's tick actually calls are overridden.
// Any un-overridden method panics (nil embedded interface) — which would
// surface an unexpected call rather than passing silently.
type fakeWorkerRepo struct {
	prediction.Repository

	mu sync.Mutex

	toClose      []prediction.Market
	toSettle     []prediction.Market
	positions    map[string][]prediction.Position
	listCloseErr error

	statusUpdates  map[string]prediction.MarketStatus
	lifecycle      []string
	settlements    []*prediction.Settlement
	payouts        []*prediction.Payout
	marketStatuses map[string]prediction.MarketStatus
}

func newFakeWorkerRepo() *fakeWorkerRepo {
	return &fakeWorkerRepo{
		positions:      map[string][]prediction.Position{},
		statusUpdates:  map[string]prediction.MarketStatus{},
		marketStatuses: map[string]prediction.MarketStatus{},
	}
}

func (r *fakeWorkerRepo) ListMarketsToClose(context.Context) ([]prediction.Market, error) {
	if r.listCloseErr != nil {
		return nil, r.listCloseErr
	}
	return r.toClose, nil
}

func (r *fakeWorkerRepo) ListMarketsToSettle(context.Context) ([]prediction.Market, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	// Markets already settled in a prior tick drop out (mirrors the real query
	// that only returns closed markets), so a second tick is a no-op.
	var out []prediction.Market
	for _, m := range r.toSettle {
		if r.marketStatuses[m.ID] == prediction.MarketStatusSettled {
			continue
		}
		out = append(out, m)
	}
	return out, nil
}

func (r *fakeWorkerRepo) UpdateMarketStatus(_ context.Context, id string, status, _ prediction.MarketStatus) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.statusUpdates[id] = status
	r.marketStatuses[id] = status
	return nil
}

func (r *fakeWorkerRepo) CreateLifecycleEvent(_ context.Context, e *prediction.LifecycleEvent) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.lifecycle = append(r.lifecycle, e.EventType)
	return nil
}

func (r *fakeWorkerRepo) GetMarket(_ context.Context, id string) (*prediction.Market, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.toSettle {
		if r.toSettle[i].ID == id {
			m := r.toSettle[i]
			if st, ok := r.marketStatuses[id]; ok {
				m.Status = st
			}
			return &m, nil
		}
	}
	return nil, prediction.ErrPositionNotFound
}

func (r *fakeWorkerRepo) ListPositionsByMarket(_ context.Context, marketID string) ([]prediction.Position, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.positions[marketID], nil
}

func (r *fakeWorkerRepo) CreateSettlement(_ context.Context, s *prediction.Settlement) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if s.ID == "" {
		s.ID = "settle-" + s.MarketID
	}
	r.settlements = append(r.settlements, s)
	return nil
}

func (r *fakeWorkerRepo) CreatePayout(_ context.Context, p *prediction.Payout) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.payouts = append(r.payouts, p)
	return nil
}

func (r *fakeWorkerRepo) UpdateMarket(_ context.Context, m *prediction.Market) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.marketStatuses[m.ID] = m.Status
	return nil
}

// fakeWallet records credits so settlement payouts can be asserted.
type fakeWallet struct {
	mu      sync.Mutex
	credits map[string]int64
}

func newFakeWallet() *fakeWallet { return &fakeWallet{credits: map[string]int64{}} }

func (w *fakeWallet) Debit(context.Context, string, int64, string, string) error { return nil }
func (w *fakeWallet) Credit(_ context.Context, userID string, cents int64, _ string, _ string) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.credits[userID] += cents
	return nil
}
func (w *fakeWallet) Balance(context.Context, string) int64 { return 0 }

// fakeAdapter is a feed adapter that returns a configured result. Name() is
// the source key markets reference.
type fakeAdapter struct {
	name   string
	result *feed.Result
	err    error
}

func (a *fakeAdapter) Name() string                           { return a.name }
func (a *fakeAdapter) CanSettle(string, json.RawMessage) bool { return true }
func (a *fakeAdapter) FetchResult(context.Context, string, json.RawMessage) (*feed.Result, error) {
	return a.result, a.err
}
func (a *fakeAdapter) ValidateParams(string, json.RawMessage) error { return nil }

func tradeableMarket(id, ticker string, closeAt time.Time) prediction.Market {
	return prediction.Market{
		ID:                  id,
		Ticker:              ticker,
		Status:              prediction.MarketStatusOpen,
		SettlementSourceKey: "test-source",
		CloseAt:             closeAt,
	}
}

// --- MarketCloser ---

func TestMarketCloserClosesPastCloseMarkets(t *testing.T) {
	repo := newFakeWorkerRepo()
	repo.toClose = []prediction.Market{
		tradeableMarket("m1", "ALPHA", time.Now().Add(-time.Hour)),
	}
	w := NewMarketCloser(repo, time.Minute)

	w.tick(context.Background())

	if got := repo.statusUpdates["m1"]; got != prediction.MarketStatusClosed {
		t.Fatalf("expected m1 closed, got %q", got)
	}
	if len(repo.lifecycle) != 1 || repo.lifecycle[0] != "closed" {
		t.Fatalf("expected one 'closed' lifecycle event, got %v", repo.lifecycle)
	}
}

func TestMarketCloserSkipsNonOpenMarket(t *testing.T) {
	repo := newFakeWorkerRepo()
	// A settled market cannot transition to closed; the worker must skip it,
	// not error out of the whole tick.
	m := tradeableMarket("m2", "BETA", time.Now().Add(-time.Hour))
	m.Status = prediction.MarketStatusSettled
	repo.toClose = []prediction.Market{m}
	w := NewMarketCloser(repo, time.Minute)

	w.tick(context.Background())

	if _, updated := repo.statusUpdates["m2"]; updated {
		t.Fatal("settled market should not have been transitioned to closed")
	}
}

func TestMarketCloserToleratesListError(t *testing.T) {
	repo := newFakeWorkerRepo()
	repo.listCloseErr = errors.New("db down")
	w := NewMarketCloser(repo, time.Minute)
	// Must return without panicking and without writing anything.
	w.tick(context.Background())
	if len(repo.statusUpdates) != 0 {
		t.Fatal("no updates expected when listing failed")
	}
}

// --- AutoSettler ---

func TestAutoSettlerNoAdapterIsNoOp(t *testing.T) {
	repo := newFakeWorkerRepo()
	repo.toSettle = []prediction.Market{tradeableMarket("m3", "GAMMA", time.Now())}
	repo.marketStatuses["m3"] = prediction.MarketStatusClosed

	reg := feed.NewRegistry() // empty: no adapter for "test-source"
	w := NewAutoSettler(repo, reg, newFakeWallet(), time.Minute)

	w.tick(context.Background())

	if len(repo.settlements) != 0 {
		t.Fatalf("expected no settlement without an adapter, got %d", len(repo.settlements))
	}
}

func TestAutoSettlerSettlesOnceAndIsIdempotentAcrossTicks(t *testing.T) {
	repo := newFakeWorkerRepo()
	m := tradeableMarket("m4", "DELTA", time.Now())
	repo.toSettle = []prediction.Market{m}
	repo.marketStatuses["m4"] = prediction.MarketStatusClosed
	repo.positions["m4"] = []prediction.Position{
		{ID: "p1", UserID: "u1", MarketID: "m4", Side: prediction.OrderSideYes, Quantity: 10, AvgPriceCents: 50, TotalCostCents: 500},
	}

	reg := feed.NewRegistry()
	reg.Register(&fakeAdapter{name: "test-source", result: &feed.Result{Outcome: "yes"}})
	wallet := newFakeWallet()
	w := NewAutoSettler(repo, reg, wallet, time.Minute)

	w.tick(context.Background())

	if len(repo.settlements) != 1 {
		t.Fatalf("expected exactly one settlement, got %d", len(repo.settlements))
	}
	// YES won: 10 contracts pay 100c each = 1000c to u1.
	if got := wallet.credits["u1"]; got != 1000 {
		t.Fatalf("expected u1 credited 1000c, got %d", got)
	}

	// Second tick: the market is now settled and drops out of ListMarketsToSettle,
	// so no second settlement / no double payout.
	w.tick(context.Background())
	if len(repo.settlements) != 1 {
		t.Fatalf("second tick must not re-settle; settlements=%d", len(repo.settlements))
	}
	if got := wallet.credits["u1"]; got != 1000 {
		t.Fatalf("second tick must not double-pay; u1=%d", got)
	}
}

func TestAutoSettlerFeedErrorLeavesMarketUnsettled(t *testing.T) {
	repo := newFakeWorkerRepo()
	m := tradeableMarket("m5", "EPSILON", time.Now())
	repo.toSettle = []prediction.Market{m}
	repo.marketStatuses["m5"] = prediction.MarketStatusClosed

	reg := feed.NewRegistry()
	reg.Register(&fakeAdapter{name: "test-source", err: errors.New("source timeout")})
	w := NewAutoSettler(repo, reg, newFakeWallet(), time.Minute)

	w.tick(context.Background())

	if len(repo.settlements) != 0 {
		t.Fatalf("a feed error must leave the market for manual settlement, got %d settlements", len(repo.settlements))
	}
}
