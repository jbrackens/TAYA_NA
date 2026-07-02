package prediction

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
)

type jsonDefaultRepo struct {
	createdMarket      *Market
	capturedSettlement *Settlement
	market             *Market
	aiDraftCount       int
	aiTokens           int64
}

func TestMarketJSONExposesPointAliases(t *testing.T) {
	lastTrade := 63
	bestYesBid := 62
	bestYesAsk := 64
	bestNoBid := 36
	bestNoAsk := 38
	market := Market{
		ID:                     "market-1",
		EventID:                "event-1",
		Ticker:                 "MLBB-FINAL-G1",
		Title:                  "Will team A win?",
		Status:                 MarketStatusOpen,
		YesPriceCents:          64,
		NoPriceCents:           36,
		LastTradePriceCents:    &lastTrade,
		VolumeCents:            12500,
		OpenInterestCents:      5400,
		LiquidityCents:         20000,
		AMMSubsidyCents:        1500,
		ExecutionMode:          ExecutionModeOrderBook,
		CollateralPoolCents:    8800,
		SettledPayoutPoolCents: 1200,
		BestYesBidCents:        &bestYesBid,
		BestYesAskCents:        &bestYesAsk,
		BestNoBidCents:         &bestNoBid,
		BestNoAskCents:         &bestNoAsk,
		CloseAt:                time.Unix(1700000000, 0).UTC(),
		CreatedAt:              time.Unix(1699990000, 0).UTC(),
		UpdatedAt:              time.Unix(1699995000, 0).UTC(),
	}
	body, err := json.Marshal(market)
	if err != nil {
		t.Fatalf("marshal market: %v", err)
	}
	for _, needle := range []string{
		`"yesPricePointsCents":64`,
		`"noPricePointsCents":36`,
		`"lastTradePricePointsCents":63`,
		`"volumePointsCents":12500`,
		`"openInterestPointsCents":5400`,
		`"liquidityPointsCents":20000`,
		`"ammSubsidyPointsCents":1500`,
		`"collateralPoolPointsCents":8800`,
		`"settlementPoolPointsCents":1200`,
		`"bestYesBidPointsCents":62`,
		`"bestNoAskPointsCents":38`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(string(body), needle) {
			t.Fatalf("market missing %s in %s", needle, string(body))
		}
	}
	for _, retired := range []string{
		`"yesPriceCents"`,
		`"noPriceCents"`,
		`"lastTradePriceCents"`,
		`"volumeCents"`,
		`"openInterestCents"`,
		`"liquidityCents"`,
		`"ammSubsidyCents"`,
		`"collateralPoolCents"`,
		`"settledPayoutPoolPointsCents"`,
		`"settledPayoutPoolCents"`,
		`"bestYesBidCents"`,
		`"bestYesAskCents"`,
		`"bestNoBidCents"`,
		`"bestNoAskCents"`,
	} {
		if strings.Contains(string(body), retired) {
			t.Fatalf("market should not emit retired alias %s in %s", retired, string(body))
		}
	}
}

func TestPricePointJSONExposesPointAliases(t *testing.T) {
	point := PricePoint{
		BucketStart:   time.Unix(1700000000, 0).UTC(),
		YesPriceCents: 64,
		TradeCount:    7,
		VolumeCents:   12500,
	}
	body, err := json.Marshal(point)
	if err != nil {
		t.Fatalf("marshal price point: %v", err)
	}
	for _, needle := range []string{
		`"yesPricePointsCents":64`,
		`"volumePointsCents":12500`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(string(body), needle) {
			t.Fatalf("price point missing %s in %s", needle, string(body))
		}
	}
	for _, retired := range []string{
		`"yesPriceCents"`,
		`"volumeCents"`,
	} {
		if strings.Contains(string(body), retired) {
			t.Fatalf("price point should not emit retired alias %s in %s", retired, string(body))
		}
	}
}

func TestPortfolioSummaryJSONExposesPointAliases(t *testing.T) {
	summary := PortfolioSummary{
		TotalValueCents:    2400,
		UnrealizedPnlCents: -125,
		RealizedPnlCents:   375,
		OpenPositions:      2,
		TotalPredictions:   5,
		CorrectPredictions: 3,
		AccuracyPct:        60,
	}
	body, err := json.Marshal(summary)
	if err != nil {
		t.Fatalf("marshal portfolio summary: %v", err)
	}
	for _, needle := range []string{
		`"totalValuePointsCents":2400`,
		`"portfolioValuePointsCents":2400`,
		`"investedPointsCents":2400`,
		`"unrealizedPointsCents":-125`,
		`"realizedPointsCents":375`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(string(body), needle) {
			t.Fatalf("portfolio summary missing %s in %s", needle, string(body))
		}
	}
	for _, retired := range []string{
		`"totalValueCents"`,
		`"unrealizedPnlCents"`,
		`"realizedPnlCents"`,
	} {
		if strings.Contains(string(body), retired) {
			t.Fatalf("portfolio summary should not emit retired alias %s in %s", retired, string(body))
		}
	}
}

func TestMarketJSONClampsOutOfRangeImportedTimes(t *testing.T) {
	cutoff := time.Date(10000, time.January, 1, 5, 2, 0, 0, time.UTC)
	market := Market{
		ID:                  "market-out-of-range",
		EventID:             "event-out-of-range",
		Ticker:              "IMP-FUTURE",
		Title:               "Imported far future market",
		Status:              MarketStatusOpen,
		YesPriceCents:       50,
		NoPriceCents:        50,
		SettlementSourceKey: "manual",
		SettlementRule:      "manual_attestation",
		SettlementCutoffAt:  &cutoff,
		CloseAt:             time.Date(10000, time.January, 1, 4, 2, 0, 0, time.UTC),
		CreatedAt:           time.Unix(1700000000, 0).UTC(),
		UpdatedAt:           time.Unix(1700000001, 0).UTC(),
		ExecutionMode:       ExecutionModeOrderBook,
	}
	body, err := json.Marshal(market)
	if err != nil {
		t.Fatalf("marshal market with imported far-future dates: %v", err)
	}
	if !strings.Contains(string(body), `"closeAt":"9999-12-31T23:59:59Z"`) {
		t.Fatalf("expected closeAt clamp, got %s", string(body))
	}
	if !strings.Contains(string(body), `"settlementCutoffAt":"9999-12-31T23:59:59Z"`) {
		t.Fatalf("expected settlementCutoffAt clamp, got %s", string(body))
	}
}

func TestOrderJSONExposesPointAliases(t *testing.T) {
	cap := int64(2500)
	reservationID := "reservation-1"
	order := Order{
		ID:                  "order-1",
		UserID:              "user-1",
		MarketID:            "market-1",
		Side:                OrderSideYes,
		Action:              OrderActionBuy,
		OrderType:           OrderTypeMarket,
		Quantity:            10,
		FilledQuantity:      8,
		RemainingQuantity:   2,
		TotalCostCents:      2400,
		Status:              OrderStatusPartial,
		WalletReservationID: &reservationID,
		ReservedCashCents:   2500,
		CapturedCashCents:   1920,
		ReleasedCashCents:   580,
		FilledCostCents:     1920,
		NotionalCapCents:    &cap,
		CreatedAt:           time.Unix(1700000000, 0).UTC(),
		UpdatedAt:           time.Unix(1700000001, 0).UTC(),
	}
	body, err := json.Marshal(order)
	if err != nil {
		t.Fatalf("marshal order: %v", err)
	}
	for _, needle := range []string{
		`"totalCostPointsCents":2400`,
		`"reservedPointsCents":2500`,
		`"capturedPointsCents":1920`,
		`"releasedPointsCents":580`,
		`"filledCostPointsCents":1920`,
		`"notionalCapPointsCents":2500`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(string(body), needle) {
			t.Fatalf("order missing %s in %s", needle, string(body))
		}
	}
	for _, needle := range []string{
		`"totalCostCents"`,
		`"reservedCashCents"`,
		`"capturedCashCents"`,
		`"releasedCashCents"`,
		`"filledCostCents"`,
		`"notionalCapCents"`,
		`"walletReservationId"`,
	} {
		if strings.Contains(string(body), needle) {
			t.Fatalf("order should omit retired alias %s in %s", needle, string(body))
		}
	}
}

func TestPlaceOrderRequestAcceptsPointNativeNotionalCapAlias(t *testing.T) {
	var req PlaceOrderRequest
	if err := json.Unmarshal([]byte(`{
		"marketId": "market-1",
		"side": "yes",
		"action": "buy",
		"orderType": "market",
		"quantity": 3,
		"notionalCapPointsCents": 200
	}`), &req); err != nil {
		t.Fatalf("unmarshal place order request: %v", err)
	}
	if req.NotionalCapCents == nil || *req.NotionalCapCents != 200 {
		t.Fatalf("notional cap = %v, want 200 from point alias", req.NotionalCapCents)
	}
}

func TestOrderPreviewJSONExposesPointAliases(t *testing.T) {
	preview := OrderPreview{
		Side:                   OrderSideYes,
		Action:                 OrderActionBuy,
		Quantity:               12,
		PriceCents:             64,
		TotalCost:              768,
		FeeCents:               5,
		MaxProfit:              432,
		MaxLoss:                768,
		NewYesPrice:            66,
		NewNoPrice:             34,
		ExecutionMode:          ExecutionModeOrderBook,
		FilledQuantity:         10,
		UnfilledQuantity:       2,
		AverageFillPriceCents:  63,
		TotalCostWithFeesCents: 773,
		EstimatedSlippageCents: 2,
		QuoteStatus:            OrderStatusPartial,
	}
	body, err := json.Marshal(preview)
	if err != nil {
		t.Fatalf("marshal order preview: %v", err)
	}
	for _, needle := range []string{
		`"pricePointsCents":64`,
		`"totalCostPointsCents":768`,
		`"feePointsCents":5`,
		`"maxResultPointsCents":432`,
		`"maxLossPointsCents":768`,
		`"newYesPricePointsCents":66`,
		`"newNoPricePointsCents":34`,
		`"averageFillPricePointsCents":63`,
		`"totalCostWithFeesPointsCents":773`,
		`"estimatedSlippagePointsCents":2`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(string(body), needle) {
			t.Fatalf("order preview missing %s in %s", needle, string(body))
		}
	}
	for _, retired := range []string{
		`"priceCents"`,
		`"totalCostCents"`,
		`"feeCents"`,
		`"maxProfitCents"`,
		`"maxProfitPointsCents"`,
		`"maxLossCents"`,
		`"newYesPriceCents"`,
		`"newNoPriceCents"`,
		`"averageFillPriceCents"`,
		`"totalCostWithFeesCents"`,
		`"estimatedSlippageCents"`,
	} {
		if strings.Contains(string(body), retired) {
			t.Fatalf("order preview should omit retired alias %s in %s", retired, string(body))
		}
	}
}

func TestPositionJSONExposesPointAliases(t *testing.T) {
	position := Position{
		ID:               "pos-1",
		UserID:           "user-1",
		MarketID:         "market-1",
		Side:             OrderSideYes,
		Quantity:         12,
		AvgPriceCents:    64,
		TotalCostCents:   768,
		RealizedPnlCents: -125,
		ReservedQuantity: 3,
		CreatedAt:        time.Unix(1700000000, 0).UTC(),
		UpdatedAt:        time.Unix(1700000001, 0).UTC(),
	}
	body, err := json.Marshal(position)
	if err != nil {
		t.Fatalf("marshal position: %v", err)
	}
	for _, needle := range []string{
		`"avgPricePointsCents":64`,
		`"totalCostPointsCents":768`,
		`"realizedPointsCents":-125`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(string(body), needle) {
			t.Fatalf("position missing %s in %s", needle, string(body))
		}
	}
	for _, retired := range []string{
		`"avgPriceCents"`,
		`"totalCostCents"`,
		`"realizedPnlCents"`,
	} {
		if strings.Contains(string(body), retired) {
			t.Fatalf("position should not emit retired alias %s in %s", retired, string(body))
		}
	}
}

func TestTradeJSONExposesPointAliases(t *testing.T) {
	trade := Trade{
		ID:         "trade-1",
		MarketID:   "market-1",
		BuyerID:    "buyer-1",
		Side:       OrderSideYes,
		PriceCents: 64,
		Quantity:   12,
		FeeCents:   5,
		IsAMMTrade: false,
		TradedAt:   time.Unix(1700000000, 0).UTC(),
		MatchID:    "trade-1",
		TradeKind:  TradeKindSecondary,
		EngineKind: EngineKindOrderBook,
	}
	body, err := json.Marshal(trade)
	if err != nil {
		t.Fatalf("marshal trade: %v", err)
	}
	for _, needle := range []string{
		`"pricePointsCents":64`,
		`"feePointsCents":5`,
		`"notionalPointsCents":768`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(string(body), needle) {
			t.Fatalf("trade missing %s in %s", needle, string(body))
		}
	}
	for _, retired := range []string{
		`"priceCents"`,
		`"feeCents"`,
	} {
		if strings.Contains(string(body), retired) {
			t.Fatalf("trade should not emit retired alias %s in %s", retired, string(body))
		}
	}
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
func (r *jsonDefaultRepo) AIUsage(_ context.Context, _ string, _ time.Time) (int, int64, error) {
	return r.aiDraftCount, r.aiTokens, nil
}
func (r *jsonDefaultRepo) ReserveAIUsage(_ context.Context, _ string, estimatedInputTokens int, ratePerMin int, dailyTokenCap int64, _ time.Time) (AIBudgetStatus, error) {
	status := AIBudgetStatus{
		Allowed:            true,
		RequestsLastMinute: r.aiDraftCount,
		RatePerMinute:      ratePerMin,
		TokensToday:        r.aiTokens,
		DailyTokenCap:      dailyTokenCap,
	}
	if r.aiDraftCount+1 > ratePerMin {
		status.Allowed = false
		status.Reason = "rate limit exceeded — too many drafts in the last minute"
		return status, nil
	}
	if r.aiTokens+int64(estimatedInputTokens) > dailyTokenCap {
		status.Allowed = false
		status.Reason = "daily AI token budget exhausted"
		return status, nil
	}
	status.RequestsLastMinute++
	status.TokensToday += int64(estimatedInputTokens)
	return status, nil
}
func (r *jsonDefaultRepo) UpdateMarket(context.Context, *Market) error { return nil }
func (r *jsonDefaultRepo) UpdateMarketStatus(context.Context, string, MarketStatus, MarketStatus) error {
	return nil
}
func (r *jsonDefaultRepo) ListMarketsToClose(context.Context) ([]Market, error)  { return nil, nil }
func (r *jsonDefaultRepo) ListMarketsToSettle(context.Context) ([]Market, error) { return nil, nil }
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
func (r *jsonDefaultRepo) LinkAIGenerationLogsToMarket(context.Context, string, []string, *string) error {
	return nil
}
func (r *jsonDefaultRepo) CreateAPIKey(context.Context, *APIKey) error       { return nil }
func (r *jsonDefaultRepo) DeactivateAPIKey(context.Context, string) error    { return nil }
func (r *jsonDefaultRepo) TouchAPIKeyLastUsed(context.Context, string) error { return nil }
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
	if string(repo.createdMarket.Translations) != "{}" {
		t.Fatalf("expected translations to default to {}, got %q", string(repo.createdMarket.Translations))
	}
}

func TestCreateMarketPreservesTranslations(t *testing.T) {
	repo := &jsonDefaultRepo{}
	svc := NewService(repo, NoopWallet{})
	translations := json.RawMessage(`{"zh-Hans":{"title":"中文标题","description":"中文说明"}}`)

	_, err := svc.CreateMarket(context.Background(), CreateMarketRequest{
		EventID:             "evt-translations",
		Ticker:              "QA-TRANSLATIONS",
		Title:               "QA Translations",
		Translations:        translations,
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
	if string(repo.createdMarket.Translations) != string(translations) {
		t.Fatalf("expected translations %s, got %s", translations, repo.createdMarket.Translations)
	}
}

func TestCreateMarketRejectsLaunchProhibitedSettlementSource(t *testing.T) {
	repo := &jsonDefaultRepo{}
	svc := NewService(repo, NoopWallet{})

	_, err := svc.CreateMarket(context.Background(), CreateMarketRequest{
		EventID:             "evt-prohibited-source",
		Ticker:              "QA-PROHIBITED-SOURCE",
		Title:               "Launch Prohibited Source",
		SettlementSourceKey: "api-feed-crypto",
		SettlementRule:      "price_above",
		SettlementParams:    json.RawMessage(`{"asset":"bitcoin","threshold":100000}`),
		CloseAt:             time.Now().UTC().Add(time.Hour),
		AMMLiquidityParam:   100,
	})
	if !errors.Is(err, ErrLaunchProhibitedMarket) {
		t.Fatalf("expected ErrLaunchProhibitedMarket, got %v", err)
	}
	if repo.createdMarket != nil {
		t.Fatalf("launch-prohibited market should not be persisted: %+v", repo.createdMarket)
	}
}

func TestCreateMarketRejectsLaunchProhibitedMarketCopy(t *testing.T) {
	repo := &jsonDefaultRepo{}
	svc := NewService(repo, NoopWallet{})

	_, err := svc.CreateMarket(context.Background(), CreateMarketRequest{
		EventID:             "evt-prohibited-copy",
		Ticker:              "QA-BTC-COPY",
		Title:               "Will BTC close higher today?",
		SettlementSourceKey: "admin-manual",
		SettlementRule:      "binary_outcome",
		CloseAt:             time.Now().UTC().Add(time.Hour),
		AMMLiquidityParam:   100,
	})
	if !errors.Is(err, ErrLaunchProhibitedMarket) {
		t.Fatalf("expected ErrLaunchProhibitedMarket, got %v", err)
	}
	if repo.createdMarket != nil {
		t.Fatalf("launch-prohibited market should not be persisted: %+v", repo.createdMarket)
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

func TestCheckAIBudget(t *testing.T) {
	ctx := context.Background()

	within := NewService(&jsonDefaultRepo{}, NoopWallet{})
	if s, err := within.CheckAIBudget(ctx, "admin-1"); err != nil || !s.Allowed {
		t.Fatalf("expected allowed within limits, got allowed=%v err=%v", s.Allowed, err)
	}

	rateLimited := NewService(&jsonDefaultRepo{aiDraftCount: 1000}, NoopWallet{})
	if s, _ := rateLimited.CheckAIBudget(ctx, "admin-1"); s.Allowed {
		t.Fatalf("expected rate-limited when recent drafts exceed the cap")
	}

	tokenCapped := NewService(&jsonDefaultRepo{aiTokens: 1_000_000_000}, NoopWallet{})
	if s, _ := tokenCapped.CheckAIBudget(ctx, "admin-1"); s.Allowed {
		t.Fatalf("expected token-capped when daily tokens exceed the cap")
	}
}
