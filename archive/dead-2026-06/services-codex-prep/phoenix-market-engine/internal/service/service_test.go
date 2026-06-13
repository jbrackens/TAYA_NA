package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-market-engine/internal/models"
	"github.com/phoenixbot/phoenix-market-engine/internal/repository"
)

type fakeRepo struct {
	event              *models.MarketEvent
	market             *models.Market
	list               []*models.Market
	total              int
	previousOdds       map[string]decimal.Decimal
	previousStatus     string
	createParams       repository.CreateMarketParams
	upsertParams       repository.UpsertProviderMarketParams
	upsertCreated      bool
	updateOddsInput    map[string]decimal.Decimal
	statusInput        string
	settleOutcomeInput string
	auditEntries       []repository.AuditLogEntry
	err                error
}

func (f *fakeRepo) GetEvent(ctx context.Context, eventID string) (*models.MarketEvent, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.event, nil
}

func (f *fakeRepo) CreateMarket(ctx context.Context, params repository.CreateMarketParams) (*models.Market, error) {
	f.createParams = params
	if f.err != nil {
		return nil, f.err
	}
	return f.market, nil
}

func (f *fakeRepo) UpsertProviderMarket(ctx context.Context, params repository.UpsertProviderMarketParams) (*models.Market, bool, error) {
	f.upsertParams = params
	if f.err != nil {
		return nil, false, f.err
	}
	return f.market, f.upsertCreated, nil
}

func (f *fakeRepo) GetMarket(ctx context.Context, marketID string) (*models.Market, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.market, nil
}

func (f *fakeRepo) GetEventByExternalID(ctx context.Context, externalID string) (*models.MarketEvent, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.event, nil
}

func (f *fakeRepo) ListMarkets(ctx context.Context, filters models.MarketFilters) ([]*models.Market, int, error) {
	if f.err != nil {
		return nil, 0, f.err
	}
	return f.list, f.total, nil
}

func (f *fakeRepo) UpdateOdds(ctx context.Context, marketID string, odds map[string]decimal.Decimal) (*models.Market, map[string]decimal.Decimal, error) {
	f.updateOddsInput = odds
	if f.err != nil {
		return nil, nil, f.err
	}
	return f.market, f.previousOdds, nil
}

func (f *fakeRepo) UpdateStatus(ctx context.Context, marketID, status string, validateTransition func(from, to string) error) (*models.Market, string, error) {
	f.statusInput = status
	if f.err != nil {
		return nil, "", f.err
	}
	if validateTransition != nil {
		if err := validateTransition(f.previousStatus, status); err != nil {
			return nil, "", fmt.Errorf("%w: %v", repository.ErrInvalidTransition, err)
		}
	}
	return f.market, f.previousStatus, nil
}

func (f *fakeRepo) SettleMarket(ctx context.Context, marketID, winningOutcomeID string, settledAt time.Time) (*models.Market, error) {
	f.settleOutcomeInput = winningOutcomeID
	if f.err != nil {
		return nil, f.err
	}
	// Mirror the real repo's state validation: only open/suspended can be settled.
	switch f.market.Status {
	case "open", "suspended":
		// allowed
	default:
		return nil, fmt.Errorf("%w: cannot settle market in %q state", repository.ErrInvalidTransition, f.market.Status)
	}
	settled := *f.market
	settled.Status = "settled"
	return &settled, nil
}

func (f *fakeRepo) GetLiquidity(ctx context.Context, marketID string) (*models.LiquidityResponse, error) {
	if f.err != nil {
		return nil, f.err
	}
	return &models.LiquidityResponse{MarketID: marketID, TotalMatched: decimal.RequireFromString("120.00")}, nil
}

func (f *fakeRepo) WriteAuditLog(ctx context.Context, entry repository.AuditLogEntry) error {
	f.auditEntries = append(f.auditEntries, entry)
	return nil
}

type publishedMessage struct {
	topic string
	key   string
	value any
}

type fakePublisher struct {
	messages []publishedMessage
}

func (f *fakePublisher) SendMessage(ctx context.Context, topic, key string, value any) error {
	f.messages = append(f.messages, publishedMessage{topic: topic, key: key, value: value})
	return nil
}

func TestCreateMarket(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{
		event: &models.MarketEvent{ID: "evt-1", Name: "Match", Sport: "soccer", League: "EPL", StartTime: time.Now().UTC()},
		market: &models.Market{
			MarketID:   "mrk-1",
			EventID:    "evt-1",
			MarketType: "moneyline",
			Status:     "open",
			Outcomes: []models.MarketOutcome{
				{OutcomeID: "out-1", Name: "Team A", Odds: decimal.RequireFromString("1.85")},
				{OutcomeID: "out-2", Name: "Team B", Odds: decimal.RequireFromString("2.10")},
			},
			Odds: map[string]decimal.Decimal{},
		},
	}
	publisher := &fakePublisher{}
	svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))

	request := &models.CreateMarketRequest{
		EventID:    "evt-1",
		MarketType: "moneyline",
		Outcomes:   []models.CreateMarketOutcomeInput{{Name: "Team A", OutcomeID: "out-1"}, {Name: "Team B", OutcomeID: "out-2"}},
		Odds:       map[string]decimal.Decimal{"out-1": decimal.RequireFromString("1.85"), "out-2": decimal.RequireFromString("2.10")},
		Status:     "open",
	}
	market, err := svc.CreateMarket(context.Background(), request, models.AuthClaims{UserID: "operator-1", Role: "operator"})
	if err != nil {
		t.Fatalf("CreateMarket returned error: %v", err)
	}
	if market.MinBet.String() != "1" {
		t.Fatalf("expected min bet 1, got %s", market.MinBet.String())
	}
	if got := len(publisher.messages); got != 1 {
		t.Fatalf("expected one publish, got %d", got)
	}
	if publisher.messages[0].topic != "phoenix.market.created" {
		t.Fatalf("unexpected topic %s", publisher.messages[0].topic)
	}
	if repo.createParams.EventID != "evt-1" {
		t.Fatalf("create params not captured")
	}
}

func TestCreateMarketValidation(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewMarketService(logger, &fakeRepo{}, &fakePublisher{}, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))
	_, err := svc.CreateMarket(context.Background(), &models.CreateMarketRequest{EventID: "evt-1", MarketType: "moneyline"}, models.AuthClaims{})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestUpdateOddsPublishesEvent(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{
		market:       &models.Market{MarketID: "mrk-1", EventID: "evt-1", MarketType: "moneyline", Status: "open", Outcomes: []models.MarketOutcome{{OutcomeID: "out-1", Name: "A", Odds: decimal.RequireFromString("1.90")}, {OutcomeID: "out-2", Name: "B", Odds: decimal.RequireFromString("2.00")}}},
		previousOdds: map[string]decimal.Decimal{"out-1": decimal.RequireFromString("1.85"), "out-2": decimal.RequireFromString("2.10")},
	}
	publisher := &fakePublisher{}
	svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))
	_, err := svc.UpdateOdds(context.Background(), "mrk-1", &models.UpdateOddsRequest{Odds: map[string]decimal.Decimal{"out-1": decimal.RequireFromString("1.90")}, Reason: "market_movement"}, models.AuthClaims{UserID: "odds-1", Role: "odds-manager"})
	if err != nil {
		t.Fatalf("UpdateOdds returned error: %v", err)
	}
	if len(publisher.messages) != 1 || publisher.messages[0].topic != "phoenix.market.odds-updated" {
		t.Fatalf("expected odds update event")
	}
}

func TestUpdateStatusNormalizesAndPublishes(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{market: &models.Market{MarketID: "mrk-1", Status: "suspended"}, previousStatus: "open"}
	publisher := &fakePublisher{}
	svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))
	_, err := svc.UpdateStatus(context.Background(), "mrk-1", &models.UpdateMarketStatusRequest{Status: "SUSPENDED", Reason: "feed_down"}, models.AuthClaims{UserID: "op-1", Role: "operator"})
	if err != nil {
		t.Fatalf("UpdateStatus returned error: %v", err)
	}
	if repo.statusInput != "suspended" {
		t.Fatalf("expected normalized status, got %s", repo.statusInput)
	}
	if len(publisher.messages) != 1 || publisher.messages[0].topic != "phoenix.market.status-changed" {
		t.Fatalf("expected status changed event")
	}
}

func TestSettleMarketFromOpen(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{market: &models.Market{MarketID: "mrk-1", Status: "open"}}
	publisher := &fakePublisher{}
	svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))
	response, err := svc.SettleMarket(context.Background(), "mrk-1", &models.SettleMarketRequest{WinningOutcomeID: "out-1", Reason: "match ended"}, models.AuthClaims{UserID: "op-1", Role: "operator"})
	if err != nil {
		t.Fatalf("SettleMarket returned error: %v", err)
	}
	if response.MarketID != "mrk-1" || response.WinningOutcomeID != "out-1" {
		t.Fatalf("unexpected response: %+v", response)
	}
	if len(publisher.messages) != 1 || publisher.messages[0].topic != "phoenix.market.settled" {
		t.Fatalf("expected market settled event")
	}
	if len(repo.auditEntries) != 1 || repo.auditEntries[0].Action != "market.settled" {
		t.Fatalf("expected market.settled audit entry")
	}
}

func TestSettleMarketFromSuspended(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{market: &models.Market{MarketID: "mrk-1", Status: "suspended"}}
	publisher := &fakePublisher{}
	svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))
	_, err := svc.SettleMarket(context.Background(), "mrk-1", &models.SettleMarketRequest{WinningOutcomeID: "out-1"}, models.AuthClaims{UserID: "op-1", Role: "operator"})
	if err != nil {
		t.Fatalf("SettleMarket from suspended returned error: %v", err)
	}
}

func TestSettleMarketRejectsAlreadySettled(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{market: &models.Market{MarketID: "mrk-1", Status: "settled"}}
	publisher := &fakePublisher{}
	svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))
	_, err := svc.SettleMarket(context.Background(), "mrk-1", &models.SettleMarketRequest{WinningOutcomeID: "out-1"}, models.AuthClaims{UserID: "op-1", Role: "operator"})
	if err == nil {
		t.Fatalf("expected error settling already-settled market")
	}
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
	if len(publisher.messages) != 0 {
		t.Fatalf("expected no events on invalid settle")
	}
}

func TestSettleMarketRejectsVoided(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{market: &models.Market{MarketID: "mrk-1", Status: "voided"}}
	publisher := &fakePublisher{}
	svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))
	_, err := svc.SettleMarket(context.Background(), "mrk-1", &models.SettleMarketRequest{WinningOutcomeID: "out-1"}, models.AuthClaims{UserID: "op-1", Role: "operator"})
	if err == nil {
		t.Fatalf("expected error settling voided market")
	}
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestSettleMarketRejectsClosed(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{market: &models.Market{MarketID: "mrk-1", Status: "closed"}}
	publisher := &fakePublisher{}
	svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))
	_, err := svc.SettleMarket(context.Background(), "mrk-1", &models.SettleMarketRequest{WinningOutcomeID: "out-1"}, models.AuthClaims{UserID: "op-1", Role: "operator"})
	if err == nil {
		t.Fatalf("expected error settling closed market")
	}
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestSettleMarketRequiresWinningOutcome(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewMarketService(logger, &fakeRepo{}, &fakePublisher{}, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))
	_, err := svc.SettleMarket(context.Background(), "mrk-1", &models.SettleMarketRequest{}, models.AuthClaims{UserID: "op-1", Role: "operator"})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for missing winning_outcome_id, got %v", err)
	}
}

func TestUpdateStatusTransitionValidation(t *testing.T) {
	tests := []struct {
		name        string
		fromStatus  string
		toStatus    string
		expectError bool
	}{
		{"open to suspended", "open", "suspended", false},
		{"suspended to open", "suspended", "open", false},
		{"open to closed", "open", "closed", false},
		{"suspended to closed", "suspended", "closed", false},
		{"open to voided", "open", "voided", false},
		{"suspended to voided", "suspended", "voided", false},
		{"idempotent open to open", "open", "open", false},
		{"closed to open blocked", "closed", "open", true},
		{"closed to suspended blocked", "closed", "suspended", true},
		{"voided to open blocked", "voided", "open", true},
		{"voided to suspended blocked", "voided", "suspended", true},
		{"settled to open blocked", "settled", "open", true},
		{"settled to suspended blocked", "settled", "suspended", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := slog.New(slog.NewTextHandler(io.Discard, nil))
			// GetMarket returns current (from) status; UpdateStatus returns new (to) status
			repo := &fakeRepo{
				market:         &models.Market{MarketID: "mrk-1", Status: tt.fromStatus},
				previousStatus: tt.fromStatus,
			}
			publisher := &fakePublisher{}
			svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))
			_, err := svc.UpdateStatus(context.Background(), "mrk-1", &models.UpdateMarketStatusRequest{Status: tt.toStatus}, models.AuthClaims{UserID: "op-1", Role: "operator"})
			if tt.expectError && err == nil {
				t.Fatalf("expected error for %s -> %s, got nil", tt.fromStatus, tt.toStatus)
			}
			if !tt.expectError && err != nil {
				t.Fatalf("unexpected error for %s -> %s: %v", tt.fromStatus, tt.toStatus, err)
			}
			if tt.expectError {
				if !errors.Is(err, ErrInvalidInput) {
					t.Fatalf("expected ErrInvalidInput, got %v", err)
				}
				// Verify no mutation happened (no event published)
				if len(publisher.messages) != 0 {
					t.Fatalf("expected no events on invalid transition, got %d", len(publisher.messages))
				}
			} else {
				// Verify event was published on valid transition
				if len(publisher.messages) != 1 {
					t.Fatalf("expected 1 event on valid transition, got %d", len(publisher.messages))
				}
			}
		})
	}
}

func TestListMarketsPaginationDefaults(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{list: []*models.Market{{MarketID: "mrk-1"}}, total: 1}
	svc := NewMarketService(logger, repo, &fakePublisher{}, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))
	response, err := svc.ListMarkets(context.Background(), models.MarketFilters{})
	if err != nil {
		t.Fatalf("ListMarkets returned error: %v", err)
	}
	if response.Pagination.Page != 1 || response.Pagination.Limit != 50 || response.Pagination.Total != 1 {
		t.Fatalf("unexpected pagination: %+v", response.Pagination)
	}
}

func TestSyncMockDataMarkets(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{
		event:         &models.MarketEvent{ID: "evt-1", ExternalID: "mockdata:event-1"},
		market:        &models.Market{MarketID: "mrk-1", ExternalID: "mockdata:market-1", EventID: "evt-1", MarketType: "moneyline", Status: "open"},
		upsertCreated: true,
	}
	publisher := &fakePublisher{}
	svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))

	resp, err := svc.SyncMockDataMarkets(context.Background(), &models.SyncMockDataMarketsRequest{
		Markets: []models.MockDataMarketInput{{
			ProviderMarketID: "market-1",
			EventExternalID:  "event-1",
			MarketType:       "moneyline",
			Status:           "open",
			Outcomes: []models.CreateMarketOutcomeInput{
				{Name: "A", OutcomeID: "home"},
				{Name: "B", OutcomeID: "away"},
			},
			Odds: map[string]decimal.Decimal{
				"home": decimal.RequireFromString("1.80"),
				"away": decimal.RequireFromString("2.05"),
			},
		}},
	}, models.AuthClaims{UserID: "provider-1", Role: "data-provider"})
	if err != nil {
		t.Fatalf("SyncMockDataMarkets returned error: %v", err)
	}
	if repo.upsertParams.ExternalID != "mockdata:market-1" || repo.upsertParams.EventExternalID != "mockdata:event-1" {
		t.Fatalf("unexpected provider params: %+v", repo.upsertParams)
	}
	if resp.Synced != 1 || resp.Created != 1 || len(resp.Items) != 1 {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if len(publisher.messages) != 1 || publisher.messages[0].topic != "phoenix.market.provider-synced" {
		t.Fatalf("expected provider sync event")
	}
}

func TestSyncOddinMarkets(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{
		event:         &models.MarketEvent{ID: "evt-oddin-1", ExternalID: "oddin:sr:match:42"},
		market:        &models.Market{MarketID: "mrk-oddin-1", ExternalID: "oddin:sr:match:42:1:map=1", EventID: "evt-oddin-1", MarketType: "Match Winner", Status: "open"},
		upsertCreated: false,
	}
	publisher := &fakePublisher{}
	svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))

	resp, err := svc.SyncOddinMarkets(context.Background(), &models.SyncOddinMarketsRequest{
		Markets: []models.OddinMarketInput{{
			SportEventID:        "sr:match:42",
			MarketDescriptionID: "1",
			MarketName:          "Match Winner",
			MarketSpecifiers:    map[string]string{"map": "1"},
			MarketStatus:        "active",
			MarketOutcomes: []models.OddinOutcomeInput{
				{OutcomeID: "1", OutcomeName: "Falcons", Odds: decimal.RequireFromString("1.80"), Active: true},
				{OutcomeID: "2", OutcomeName: "Wolves", Odds: decimal.RequireFromString("2.05"), Active: true},
			},
		}},
	}, models.AuthClaims{UserID: "provider-oddin", Role: "data-provider"})
	if err != nil {
		t.Fatalf("SyncOddinMarkets returned error: %v", err)
	}
	if repo.upsertParams.ExternalID != "oddin:sr:match:42:1:map=1" || repo.upsertParams.EventExternalID != "oddin:sr:match:42" {
		t.Fatalf("unexpected provider params: %+v", repo.upsertParams)
	}
	if repo.upsertParams.MarketType != "Match Winner" {
		t.Fatalf("unexpected market type: %s", repo.upsertParams.MarketType)
	}
	if resp.Synced != 1 || resp.Updated != 1 || len(resp.Items) != 1 {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if len(publisher.messages) != 1 || publisher.messages[0].topic != "phoenix.market.provider-synced" {
		t.Fatalf("expected provider sync event")
	}
}

func TestSyncBetgeniusMarkets(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{
		event:         &models.MarketEvent{ID: "evt-betgenius-1", ExternalID: "betgenius:fixture-42"},
		market:        &models.Market{MarketID: "mrk-betgenius-1", ExternalID: "betgenius:market-42", EventID: "evt-betgenius-1", MarketType: "Match Winner", Status: "open"},
		upsertCreated: true,
	}
	publisher := &fakePublisher{}
	svc := NewMarketService(logger, repo, publisher, decimal.RequireFromString("1.00"), decimal.RequireFromString("10000.00"))

	resp, err := svc.SyncBetgeniusMarkets(context.Background(), &models.SyncBetgeniusMarketsRequest{
		Markets: []models.SyncBetgeniusMarketsItem{{
			FixtureID:     "fixture-42",
			MarketID:      "market-42",
			MarketType:    "match_winner",
			MarketName:    "Match Winner",
			TradingStatus: "open",
			Selections: []models.BetgeniusSelectionInput{
				{SelectionID: "home", Name: "Falcons", Odds: decimal.RequireFromString("1.80"), Trading: true},
				{SelectionID: "away", Name: "Wolves", Odds: decimal.RequireFromString("2.05"), Trading: true},
			},
		}},
	}, models.AuthClaims{UserID: "provider-betgenius", Role: "data-provider"})
	if err != nil {
		t.Fatalf("SyncBetgeniusMarkets returned error: %v", err)
	}
	if repo.upsertParams.ExternalID != "betgenius:market-42" || repo.upsertParams.EventExternalID != "betgenius:fixture-42" {
		t.Fatalf("unexpected provider params: %+v", repo.upsertParams)
	}
	if repo.upsertParams.MarketType != "Match Winner" {
		t.Fatalf("unexpected market type: %s", repo.upsertParams.MarketType)
	}
	if resp.Synced != 1 || resp.Created != 1 || len(resp.Items) != 1 {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if len(publisher.messages) != 1 || publisher.messages[0].topic != "phoenix.market.provider-synced" {
		t.Fatalf("expected provider sync event")
	}
}
