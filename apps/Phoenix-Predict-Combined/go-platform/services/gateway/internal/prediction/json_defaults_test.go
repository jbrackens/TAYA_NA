package prediction

import (
	"context"
	"errors"
	"testing"
	"time"
)

type jsonDefaultRepo struct {
	createdMarket      *Market
	capturedSettlement *Settlement
	market             *Market
}

func (r *jsonDefaultRepo) ListCategories(context.Context, bool) ([]Category, error) { return nil, nil }
func (r *jsonDefaultRepo) GetCategory(context.Context, string) (*Category, error) {
	return nil, errors.New("not found")
}
func (r *jsonDefaultRepo) CreateCategory(context.Context, *Category) error       { return nil }
func (r *jsonDefaultRepo) ListSeries(context.Context, *string) ([]Series, error) { return nil, nil }
func (r *jsonDefaultRepo) GetSeries(context.Context, string) (*Series, error) {
	return nil, errors.New("not found")
}
func (r *jsonDefaultRepo) CreateSeries(context.Context, *Series) error { return nil }
func (r *jsonDefaultRepo) ListEvents(context.Context, EventFilter) ([]Event, int, error) {
	return nil, 0, nil
}
func (r *jsonDefaultRepo) GetEvent(context.Context, string) (*Event, error) {
	return nil, errors.New("not found")
}
func (r *jsonDefaultRepo) CreateEvent(context.Context, *Event) error { return nil }
func (r *jsonDefaultRepo) UpdateEventStatus(context.Context, string, EventStatus) error {
	return nil
}
func (r *jsonDefaultRepo) ListMarkets(context.Context, MarketFilter) ([]Market, int, error) {
	return nil, 0, nil
}
func (r *jsonDefaultRepo) GetMarket(context.Context, string) (*Market, error) {
	if r.market == nil {
		return nil, errors.New("not found")
	}
	clone := *r.market
	return &clone, nil
}
func (r *jsonDefaultRepo) GetMarketByTicker(context.Context, string) (*Market, error) {
	return nil, errors.New("not found")
}
func (r *jsonDefaultRepo) CreateMarket(_ context.Context, m *Market) error {
	clone := *m
	r.createdMarket = &clone
	return nil
}
func (r *jsonDefaultRepo) UpdateMarket(context.Context, *Market) error                    { return nil }
func (r *jsonDefaultRepo) UpdateMarketStatus(context.Context, string, MarketStatus) error { return nil }
func (r *jsonDefaultRepo) ListMarketsToClose(context.Context) ([]Market, error)           { return nil, nil }
func (r *jsonDefaultRepo) ListMarketsToSettle(context.Context) ([]Market, error)          { return nil, nil }
func (r *jsonDefaultRepo) ListRestingOrdersOnInactiveMarkets(context.Context, int) ([]Order, error) {
	return nil, nil
}
func (r *jsonDefaultRepo) ListOrders(context.Context, OrderFilter) ([]Order, int, error) {
	return nil, 0, nil
}
func (r *jsonDefaultRepo) GetOrder(context.Context, string) (*Order, error) {
	return nil, errors.New("not found")
}
func (r *jsonDefaultRepo) GetOrderByIdempotencyKey(context.Context, string) (*Order, error) {
	return nil, errors.New("not found")
}
func (r *jsonDefaultRepo) CreateOrder(context.Context, *Order) error { return nil }
func (r *jsonDefaultRepo) UpdateOrder(context.Context, *Order) error { return nil }
func (r *jsonDefaultRepo) PersistFilledOrder(context.Context, *Order, *Trade, *Position, *Market) error {
	return nil
}
func (r *jsonDefaultRepo) ListPositions(context.Context, string) ([]Position, error) { return nil, nil }
func (r *jsonDefaultRepo) GetPosition(context.Context, string, string, OrderSide) (*Position, error) {
	return nil, errors.New("not found")
}
func (r *jsonDefaultRepo) UpsertPosition(context.Context, *Position) error { return nil }
func (r *jsonDefaultRepo) ListPositionsByMarket(context.Context, string) ([]Position, error) {
	return nil, nil
}
func (r *jsonDefaultRepo) ListTrades(context.Context, string, int) ([]Trade, error) { return nil, nil }
func (r *jsonDefaultRepo) CreateTrade(context.Context, *Trade) error                { return nil }
func (r *jsonDefaultRepo) GetSettlement(context.Context, string) (*Settlement, error) {
	return nil, errors.New("not found")
}
func (r *jsonDefaultRepo) CreateSettlement(_ context.Context, s *Settlement) error {
	clone := *s
	r.capturedSettlement = &clone
	return nil
}
func (r *jsonDefaultRepo) CreatePayout(context.Context, *Payout) error { return nil }
func (r *jsonDefaultRepo) ListLifecycleEvents(context.Context, string) ([]LifecycleEvent, error) {
	return nil, nil
}
func (r *jsonDefaultRepo) CreateLifecycleEvent(context.Context, *LifecycleEvent) error { return nil }
func (r *jsonDefaultRepo) ListAPIKeys(context.Context, string) ([]APIKey, error)       { return nil, nil }
func (r *jsonDefaultRepo) GetAPIKeyByPrefix(context.Context, string) (*APIKey, error) {
	return nil, errors.New("not found")
}
func (r *jsonDefaultRepo) CreateArticleSource(context.Context, *ArticleSource) error { return nil }
func (r *jsonDefaultRepo) LogAIGeneration(context.Context, *AIGenerationLog) error   { return nil }
func (r *jsonDefaultRepo) CreateAPIKey(context.Context, *APIKey) error               { return nil }
func (r *jsonDefaultRepo) DeactivateAPIKey(context.Context, string) error            { return nil }
func (r *jsonDefaultRepo) TouchAPIKeyLastUsed(context.Context, string) error         { return nil }
func (r *jsonDefaultRepo) GetPortfolioSummary(context.Context, string) (*PortfolioSummary, error) {
	return nil, errors.New("not found")
}
func (r *jsonDefaultRepo) ListSettledPositions(context.Context, string, int, int) ([]Payout, int, error) {
	return nil, 0, nil
}
func (r *jsonDefaultRepo) GetDiscovery(context.Context) (*DiscoveryResponse, error) {
	return nil, errors.New("not found")
}
func (r *jsonDefaultRepo) DashboardVolumeStatsSince(context.Context, time.Time, int) (*DashboardVolumeStats, error) {
	return nil, nil
}

func TestCreateMarketDefaultsSettlementParamsToJSONObject(t *testing.T) {
	repo := &jsonDefaultRepo{}
	svc := NewService(repo, NoopWallet{})

	_, err := svc.CreateMarket(context.Background(), CreateMarketRequest{
		EventID:             "evt-default-json",
		Ticker:              "QA-DEFAULT-JSON",
		Title:               "QA Default JSON",
		SettlementSourceKey: "manual",
		SettlementRule:      "binary",
		CloseAt:             time.Now().UTC().Add(time.Hour),
		AMMLiquidityParam:   100,
	})
	if err != nil {
		t.Fatalf("create market: %v", err)
	}
	if repo.createdMarket == nil {
		t.Fatalf("expected created market capture")
	}
	if string(repo.createdMarket.SettlementParams) != "{}" {
		t.Fatalf("expected settlement params to default to {}, got %q", string(repo.createdMarket.SettlementParams))
	}
}

func TestResolveMarketDefaultsAttestationDataToJSONObject(t *testing.T) {
	repo := &jsonDefaultRepo{
		market: &Market{
			ID:     "mkt-default-json",
			Ticker: "QA-RESOLVE-DEFAULT-JSON",
			Status: MarketStatusClosed,
		},
	}
	engine := NewSettlementEngine(repo, NoopWallet{})

	settlement, _, err := engine.ResolveMarket(context.Background(), ResolveMarketRequest{
		Result:            MarketResultYes,
		AttestationSource: "qa-smoke",
	}, "mkt-default-json", nil)
	if err != nil {
		t.Fatalf("resolve market: %v", err)
	}
	if settlement == nil || repo.capturedSettlement == nil {
		t.Fatalf("expected captured settlement")
	}
	if string(repo.capturedSettlement.AttestationData) != "{}" {
		t.Fatalf("expected attestation data to default to {}, got %q", string(repo.capturedSettlement.AttestationData))
	}
}

func TestCreateMarketSetsArticleSourceID(t *testing.T) {
	repo := &jsonDefaultRepo{}
	svc := NewService(repo, NoopWallet{})
	srcID := "src-xyz"

	_, err := svc.CreateMarket(context.Background(), CreateMarketRequest{
		EventID:             "evt-asid",
		Ticker:              "QA-ASID",
		Title:               "QA Article Source Link",
		SettlementSourceKey: "admin-manual",
		SettlementRule:      "binary_outcome",
		CloseAt:             time.Now().UTC().Add(time.Hour),
		AMMLiquidityParam:   100,
		ArticleSourceID:     &srcID,
	})
	if err != nil {
		t.Fatalf("create market: %v", err)
	}
	if repo.createdMarket == nil || repo.createdMarket.ArticleSourceID == nil {
		t.Fatalf("expected created market with an article source id")
	}
	if *repo.createdMarket.ArticleSourceID != srcID {
		t.Fatalf("expected article source id %q, got %q", srcID, *repo.createdMarket.ArticleSourceID)
	}
}

func TestCreateArticleSourceRequiresTextHash(t *testing.T) {
	svc := NewService(&jsonDefaultRepo{}, NoopWallet{})
	if _, err := svc.CreateArticleSource(context.Background(), &ArticleSource{}); err == nil {
		t.Fatalf("expected error for empty textHash")
	}
}

func TestLogAIGenerationRequiresStage(t *testing.T) {
	svc := NewService(&jsonDefaultRepo{}, NoopWallet{})
	if err := svc.LogAIGeneration(context.Background(), &AIGenerationLog{}); err == nil {
		t.Fatalf("expected error for empty stage")
	}
}

func TestCreateEventValidation(t *testing.T) {
	svc := NewService(&jsonDefaultRepo{}, NoopWallet{})
	ctx := context.Background()
	future := time.Now().UTC().Add(time.Hour)

	if _, err := svc.CreateEvent(ctx, CreateEventRequest{CategoryID: "c", CloseAt: future}); err == nil {
		t.Fatalf("expected error for missing title")
	}
	if _, err := svc.CreateEvent(ctx, CreateEventRequest{Title: "t", CloseAt: future}); err == nil {
		t.Fatalf("expected error for missing categoryId")
	}
	if _, err := svc.CreateEvent(ctx, CreateEventRequest{Title: "t", CategoryID: "c"}); err == nil {
		t.Fatalf("expected error for missing closeAt")
	}
	if _, err := svc.CreateEvent(ctx, CreateEventRequest{Title: "t", CategoryID: "c", CloseAt: future}); err != nil {
		t.Fatalf("unexpected error for a valid event: %v", err)
	}
}
