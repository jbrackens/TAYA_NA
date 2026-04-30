package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

type predictionAdminRepo struct {
	markets   map[string]*prediction.Market
	positions map[string][]prediction.Position
	lifecycle []prediction.LifecycleEvent
	marketSeq int
}

func newPredictionAdminRepo() *predictionAdminRepo {
	return &predictionAdminRepo{
		markets:   make(map[string]*prediction.Market),
		positions: make(map[string][]prediction.Position),
	}
}

func (r *predictionAdminRepo) ListCategories(context.Context, bool) ([]prediction.Category, error) {
	return nil, nil
}

func (r *predictionAdminRepo) GetCategory(context.Context, string) (*prediction.Category, error) {
	return nil, errors.New("not found")
}

func (r *predictionAdminRepo) CreateCategory(context.Context, *prediction.Category) error { return nil }

func (r *predictionAdminRepo) ListSeries(context.Context, *string) ([]prediction.Series, error) {
	return nil, nil
}

func (r *predictionAdminRepo) GetSeries(context.Context, string) (*prediction.Series, error) {
	return nil, errors.New("not found")
}

func (r *predictionAdminRepo) CreateSeries(context.Context, *prediction.Series) error { return nil }

func (r *predictionAdminRepo) ListEvents(context.Context, prediction.EventFilter) ([]prediction.Event, int, error) {
	return nil, 0, nil
}

func (r *predictionAdminRepo) GetEvent(context.Context, string) (*prediction.Event, error) {
	return nil, errors.New("not found")
}

func (r *predictionAdminRepo) CreateEvent(context.Context, *prediction.Event) error { return nil }

func (r *predictionAdminRepo) UpdateEventStatus(context.Context, string, prediction.EventStatus) error {
	return nil
}

func (r *predictionAdminRepo) ListMarkets(context.Context, prediction.MarketFilter) ([]prediction.Market, int, error) {
	return nil, 0, nil
}

func (r *predictionAdminRepo) GetMarket(_ context.Context, id string) (*prediction.Market, error) {
	market, ok := r.markets[id]
	if !ok {
		return nil, errors.New("not found")
	}
	clone := *market
	return &clone, nil
}

func (r *predictionAdminRepo) GetMarketByTicker(_ context.Context, ticker string) (*prediction.Market, error) {
	for _, market := range r.markets {
		if market.Ticker == ticker {
			clone := *market
			return &clone, nil
		}
	}
	return nil, errors.New("not found")
}

func (r *predictionAdminRepo) CreateMarket(_ context.Context, market *prediction.Market) error {
	r.marketSeq++
	if market.ID == "" {
		market.ID = "mkt-admin-test-" + time.Now().UTC().Format("150405") + "-" + string(rune('a'+r.marketSeq))
	}
	clone := *market
	r.markets[market.ID] = &clone
	return nil
}

func (r *predictionAdminRepo) UpdateMarket(_ context.Context, market *prediction.Market) error {
	clone := *market
	r.markets[market.ID] = &clone
	return nil
}

func (r *predictionAdminRepo) UpdateMarketStatus(_ context.Context, id string, status prediction.MarketStatus) error {
	market, ok := r.markets[id]
	if !ok {
		return errors.New("not found")
	}
	market.Status = status
	market.UpdatedAt = time.Now().UTC()
	return nil
}

func (r *predictionAdminRepo) ListMarketsToClose(context.Context) ([]prediction.Market, error) {
	return nil, nil
}

func (r *predictionAdminRepo) ListMarketsToSettle(context.Context) ([]prediction.Market, error) {
	return nil, nil
}

func (r *predictionAdminRepo) ListOrders(context.Context, prediction.OrderFilter) ([]prediction.Order, int, error) {
	return nil, 0, nil
}

func (r *predictionAdminRepo) GetOrder(context.Context, string) (*prediction.Order, error) {
	return nil, errors.New("not found")
}

func (r *predictionAdminRepo) GetOrderByIdempotencyKey(context.Context, string) (*prediction.Order, error) {
	return nil, errors.New("not found")
}

func (r *predictionAdminRepo) CreateOrder(context.Context, *prediction.Order) error { return nil }

func (r *predictionAdminRepo) UpdateOrder(context.Context, *prediction.Order) error { return nil }

func (r *predictionAdminRepo) PersistFilledOrder(context.Context, *prediction.Order, *prediction.Trade, *prediction.Position, *prediction.Market) error {
	return nil
}

func (r *predictionAdminRepo) ListPositions(context.Context, string) ([]prediction.Position, error) {
	return nil, nil
}

func (r *predictionAdminRepo) GetPosition(context.Context, string, string, prediction.OrderSide) (*prediction.Position, error) {
	return nil, errors.New("not found")
}

func (r *predictionAdminRepo) UpsertPosition(context.Context, *prediction.Position) error { return nil }

func (r *predictionAdminRepo) ListPositionsByMarket(_ context.Context, marketID string) ([]prediction.Position, error) {
	positions := r.positions[marketID]
	out := make([]prediction.Position, len(positions))
	copy(out, positions)
	return out, nil
}

func (r *predictionAdminRepo) ListTrades(context.Context, string, int) ([]prediction.Trade, error) {
	return nil, nil
}

func (r *predictionAdminRepo) CreateTrade(context.Context, *prediction.Trade) error { return nil }

func (r *predictionAdminRepo) GetSettlement(context.Context, string) (*prediction.Settlement, error) {
	return nil, errors.New("not found")
}

func (r *predictionAdminRepo) CreateSettlement(context.Context, *prediction.Settlement) error {
	return nil
}

func (r *predictionAdminRepo) CreatePayout(context.Context, *prediction.Payout) error { return nil }

func (r *predictionAdminRepo) ListLifecycleEvents(_ context.Context, marketID string) ([]prediction.LifecycleEvent, error) {
	filtered := make([]prediction.LifecycleEvent, 0)
	for _, event := range r.lifecycle {
		if event.MarketID == marketID {
			filtered = append(filtered, event)
		}
	}
	return filtered, nil
}

func (r *predictionAdminRepo) CreateLifecycleEvent(_ context.Context, event *prediction.LifecycleEvent) error {
	if event == nil {
		return nil
	}
	clone := *event
	r.lifecycle = append(r.lifecycle, clone)
	return nil
}

func (r *predictionAdminRepo) ListAPIKeys(context.Context, string) ([]prediction.APIKey, error) {
	return nil, nil
}

func (r *predictionAdminRepo) GetAPIKeyByPrefix(context.Context, string) (*prediction.APIKey, error) {
	return nil, errors.New("not found")
}

func (r *predictionAdminRepo) CreateAPIKey(context.Context, *prediction.APIKey) error { return nil }

func (r *predictionAdminRepo) DeactivateAPIKey(context.Context, string) error { return nil }

func (r *predictionAdminRepo) TouchAPIKeyLastUsed(context.Context, string) error { return nil }

func (r *predictionAdminRepo) GetPortfolioSummary(context.Context, string) (*prediction.PortfolioSummary, error) {
	return nil, errors.New("not found")
}

func (r *predictionAdminRepo) ListSettledPositions(context.Context, string, int, int) ([]prediction.Payout, int, error) {
	return nil, 0, nil
}

func (r *predictionAdminRepo) GetDiscovery(context.Context) (*prediction.DiscoveryResponse, error) {
	return nil, errors.New("not found")
}
func (r *predictionAdminRepo) DashboardVolumeStatsSince(context.Context, time.Time, int) (*prediction.DashboardVolumeStats, error) {
	return nil, nil
}

type predictionAdminWallet struct{}

func (predictionAdminWallet) Debit(string, int64, string, string) error  { return nil }
func (predictionAdminWallet) Credit(string, int64, string, string) error { return nil }
func (predictionAdminWallet) Balance(string) int64                       { return 1_000_000 }

func TestPredictionAdminCreateMarketWorksWithNormalizedTrailingSlash(t *testing.T) {
	repo := newPredictionAdminRepo()
	svc := prediction.NewService(repo, predictionAdminWallet{})

	mux := http.NewServeMux()
	registerSettlementRoutes(mux, svc)

	handler := httpx.Chain(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			mux.ServeHTTP(w, r)
		}),
		httpx.RequestID(),
		httpx.NormalizeTrailingSlash("/api/", "/admin/", "/auth/"),
	)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/markets/", strings.NewReader(`{
		"eventId":"evt-admin-test-1",
		"ticker":"QA-CREATE-NORMALIZED",
		"title":"QA Create Normalized",
		"settlementSourceKey":"manual",
		"settlementRule":"binary",
		"closeAt":"2026-04-30T12:00:00Z",
		"ammLiquidityParam":100
	}`))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@phoenix.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusCreated {
		t.Fatalf("expected create market status 201, got %d body=%s", res.Code, res.Body.String())
	}

	var market prediction.Market
	if err := json.Unmarshal(res.Body.Bytes(), &market); err != nil {
		t.Fatalf("decode create market response: %v", err)
	}
	if market.ID == "" {
		t.Fatalf("expected created market id")
	}
	if market.Status != prediction.MarketStatusUnopened {
		t.Fatalf("expected new market to start unopened, got %s", market.Status)
	}
}

func TestPredictionAdminLifecycleRoutesSupportOpenCloseAndVoid(t *testing.T) {
	repo := newPredictionAdminRepo()
	svc := prediction.NewService(repo, predictionAdminWallet{})

	mux := http.NewServeMux()
	registerSettlementRoutes(mux, svc)

	handler := httpx.Chain(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			mux.ServeHTTP(w, r)
		}),
		httpx.RequestID(),
	)

	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/markets", strings.NewReader(`{
		"eventId":"evt-admin-test-2",
		"ticker":"QA-LIFECYCLE-VOID",
		"title":"QA Lifecycle Void",
		"settlementSourceKey":"manual",
		"settlementRule":"binary",
		"closeAt":"2026-04-30T12:00:00Z",
		"ammLiquidityParam":100
	}`))
	createReq = createReq.WithContext(httpx.WithTestUser(createReq.Context(), "admin-1", "admin@phoenix.local", "admin"))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("create market failed: status=%d body=%s", createRes.Code, createRes.Body.String())
	}

	var market prediction.Market
	if err := json.Unmarshal(createRes.Body.Bytes(), &market); err != nil {
		t.Fatalf("decode create response: %v", err)
	}

	repo.positions[market.ID] = []prediction.Position{{
		ID:             "pos-admin-test-1",
		UserID:         "u-qa-1",
		MarketID:       market.ID,
		Side:           prediction.OrderSideYes,
		Quantity:       1,
		AvgPriceCents:  53,
		TotalCostCents: 53,
	}}

	for _, action := range []string{"open", "close"} {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/markets/"+market.ID+"/lifecycle/"+action, strings.NewReader(`{"reason":"qa lifecycle smoke"}`))
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@phoenix.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("%s lifecycle failed: status=%d body=%s", action, res.Code, res.Body.String())
		}
	}

	voidReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/markets/"+market.ID+"/lifecycle/void", strings.NewReader(`{"reason":"qa void smoke"}`))
	voidReq = voidReq.WithContext(httpx.WithTestUser(voidReq.Context(), "admin-1", "admin@phoenix.local", "admin"))
	voidRes := httptest.NewRecorder()
	handler.ServeHTTP(voidRes, voidReq)
	if voidRes.Code != http.StatusOK {
		t.Fatalf("void lifecycle failed: status=%d body=%s", voidRes.Code, voidRes.Body.String())
	}

	stored, err := repo.GetMarket(context.Background(), market.ID)
	if err != nil {
		t.Fatalf("expected stored market after void: %v", err)
	}
	if stored.Status != prediction.MarketStatusVoided {
		t.Fatalf("expected market status voided, got %s", stored.Status)
	}

	var payload struct {
		Status  prediction.MarketStatus `json:"status"`
		Payouts []prediction.Payout     `json:"payouts"`
	}
	if err := json.Unmarshal(voidRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode void response: %v", err)
	}
	if payload.Status != prediction.MarketStatusVoided {
		t.Fatalf("expected void response status voided, got %s", payload.Status)
	}
	if len(payload.Payouts) != 1 || payload.Payouts[0].PayoutCents != 53 {
		t.Fatalf("expected one refund payout for 53 cents, got %+v", payload.Payouts)
	}
}
