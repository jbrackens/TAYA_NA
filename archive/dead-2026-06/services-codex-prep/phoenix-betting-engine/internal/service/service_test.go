package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-betting-engine/internal/middleware"
	"github.com/phoenixbot/phoenix-betting-engine/internal/models"
	"github.com/phoenixbot/phoenix-betting-engine/internal/repository"
)

type fakeRepo struct {
	bet           *models.Bet
	betMap        map[string]*models.Bet
	bets          []*models.Bet
	total         int
	legContexts   map[string]*models.BetLegContext
	quote         *models.AdvancedQuote
	quoteMap      map[string]*models.AdvancedQuote
	reservationID string
	createSingle  repository.CreateBetParams
	createParlay  repository.CreateParlayParams
	createQuote   repository.CreateAdvancedQuoteParams
	acceptQuote   repository.AcceptAdvancedQuoteAsParlayParams
	cancelParams  repository.CancelBetParams
	settleParams  repository.SettleBetParams
	refundParams  repository.RefundBetParams
	cashoutAmount decimal.Decimal
	err           error
	markErr       error
	cancelErr     error
	settleErr     error
	refundErr     error
	updateErr     error
	updatedBetID  string
	updatedResID  string
	updateReason  string
}

func (f *fakeRepo) CreateSingleBet(ctx context.Context, params repository.CreateBetParams) (*models.Bet, error) {
	f.createSingle = params
	if f.err != nil {
		return nil, f.err
	}
	return f.bet, nil
}

func (f *fakeRepo) CreateParlayBet(ctx context.Context, params repository.CreateParlayParams) (*models.Bet, error) {
	f.createParlay = params
	if f.err != nil {
		return nil, f.err
	}
	return f.bet, nil
}

func (f *fakeRepo) CreateAdvancedQuote(ctx context.Context, params repository.CreateAdvancedQuoteParams) (*models.AdvancedQuote, error) {
	f.createQuote = params
	if f.err != nil {
		return nil, f.err
	}
	if f.quote != nil {
		return f.quote, nil
	}
	return &models.AdvancedQuote{QuoteID: params.QuoteID, QuoteType: params.QuoteType, UserID: params.UserID, RequestID: params.RequestID, Status: params.Status, Combinable: params.Combinable}, nil
}

func (f *fakeRepo) GetAdvancedQuote(ctx context.Context, quoteID string) (*models.AdvancedQuote, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.quoteMap != nil {
		quote, ok := f.quoteMap[quoteID]
		if !ok {
			return nil, repository.ErrNotFound
		}
		return quote, nil
	}
	if f.quote == nil {
		return nil, repository.ErrNotFound
	}
	return f.quote, nil
}

func (f *fakeRepo) AcceptAdvancedQuoteAsParlay(ctx context.Context, params repository.AcceptAdvancedQuoteAsParlayParams) (*models.Bet, *models.AdvancedQuote, error) {
	f.acceptQuote = params
	if f.err != nil {
		return nil, nil, f.err
	}
	quote := f.quote
	if quote == nil {
		quote = &models.AdvancedQuote{
			QuoteID:              params.QuoteID,
			UserID:               params.UserID,
			Status:               "accepted",
			AcceptedBetID:        stringPtr("bet-1"),
			AcceptRequestID:      &params.AcceptRequestID,
			AcceptIdempotencyKey: params.AcceptIdempotencyKey,
		}
	}
	return f.bet, quote, nil
}

func (f *fakeRepo) GetBet(ctx context.Context, betID string) (*models.Bet, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.betMap != nil {
		bet, ok := f.betMap[betID]
		if !ok {
			return nil, repository.ErrNotFound
		}
		return bet, nil
	}
	return f.bet, nil
}

func (f *fakeRepo) ListUserBets(ctx context.Context, userID string, filters models.BetFilters) ([]*models.Bet, int, error) {
	if f.err != nil {
		return nil, 0, f.err
	}
	return f.bets, f.total, nil
}

func (f *fakeRepo) ListBets(ctx context.Context, filters models.BetFilters) ([]*models.Bet, int, error) {
	if f.err != nil {
		return nil, 0, f.err
	}
	if filters.UserID != "" {
		filtered := make([]*models.Bet, 0, len(f.bets))
		for _, bet := range f.bets {
			if bet.UserID == filters.UserID {
				filtered = append(filtered, bet)
			}
		}
		return filtered, len(filtered), nil
	}
	return f.bets, f.total, nil
}

func (f *fakeRepo) GetBetLegContext(_ context.Context, marketID, outcomeID string) (*models.BetLegContext, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.legContexts == nil {
		return nil, repository.ErrNotFound
	}
	contextRow, ok := f.legContexts[marketID+"|"+outcomeID]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return contextRow, nil
}

func (f *fakeRepo) MarkCashedOut(ctx context.Context, betID string, cashoutAmount decimal.Decimal, cashedOutAt time.Time) (*models.Bet, error) {
	f.cashoutAmount = cashoutAmount
	if f.markErr != nil {
		return nil, f.markErr
	}
	if f.err != nil {
		return nil, f.err
	}
	copyBet := *f.bet
	copyBet.Status = "cashed_out"
	copyBet.SettledAt = &cashedOutAt
	copyBet.CashoutAmount = &cashoutAmount
	return &copyBet, nil
}

func (f *fakeRepo) CancelBet(ctx context.Context, params repository.CancelBetParams) (*models.Bet, error) {
	f.cancelParams = params
	if f.cancelErr != nil {
		return nil, f.cancelErr
	}
	if f.err != nil {
		return nil, f.err
	}
	copyBet := *f.bet
	copyBet.Status = "cancelled"
	copyBet.SettledAt = &params.CancelledAt
	for i := range copyBet.Legs {
		copyBet.Legs[i].Status = "cancelled"
	}
	return &copyBet, nil
}

func (f *fakeRepo) SettleBet(ctx context.Context, params repository.SettleBetParams) (*models.Bet, error) {
	f.settleParams = params
	if f.settleErr != nil {
		return nil, f.settleErr
	}
	if f.err != nil {
		return nil, f.err
	}
	copyBet := *f.bet
	copyBet.Status = params.Result
	copyBet.SettledAt = &params.SettledAt
	result := params.Result
	copyBet.Result = &result
	for i := range copyBet.Legs {
		copyBet.Legs[i].Status = params.Result
	}
	return &copyBet, nil
}

func (f *fakeRepo) RefundBet(ctx context.Context, params repository.RefundBetParams) (*models.Bet, error) {
	f.refundParams = params
	if f.refundErr != nil {
		return nil, f.refundErr
	}
	if f.err != nil {
		return nil, f.err
	}
	copyBet := *f.bet
	copyBet.Status = "voided"
	copyBet.SettledAt = &params.RefundedAt
	result := "voided"
	copyBet.Result = &result
	for i := range copyBet.Legs {
		copyBet.Legs[i].Status = "voided"
	}
	return &copyBet, nil
}

func (f *fakeRepo) GetReservationID(ctx context.Context, betID string) (string, error) {
	if f.err != nil {
		return "", f.err
	}
	return f.reservationID, nil
}

func (f *fakeRepo) UpdateReservationID(ctx context.Context, betID, reservationID, reason string, updatedAt time.Time) error {
	f.updatedBetID = betID
	f.updatedResID = reservationID
	f.updateReason = reason
	if f.updateErr != nil {
		return f.updateErr
	}
	return f.err
}

type fakeMarketClient struct {
	market *models.ExternalMarket
	err    error
}

func (f *fakeMarketClient) GetMarket(ctx context.Context, marketID string) (*models.ExternalMarket, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.market, nil
}

type fakeWalletClient struct {
	reserved      *models.ReserveFundsResponse
	released      *models.ReleaseReserveResponse
	deposited     *models.DepositResponse
	withdrawn     *models.WithdrawalResponse
	reserveReq    *models.ReserveFundsRequest
	releaseReq    *models.ReleaseReserveRequest
	depositReq    *models.DepositRequest
	withdrawReq   *models.WithdrawalRequest
	reserveCalls  int
	releaseCalls  int
	depositCalls  int
	withdrawCalls int
	err           error
	reserveErr    error
	releaseErr    error
	depositErr    error
	withdrawErr   error
}

func (f *fakeWalletClient) ReserveFunds(ctx context.Context, authHeader, userID string, req *models.ReserveFundsRequest) (*models.ReserveFundsResponse, error) {
	f.reserveReq = req
	f.reserveCalls++
	if f.reserveErr != nil {
		return nil, f.reserveErr
	}
	if f.err != nil {
		return nil, f.err
	}
	return f.reserved, nil
}

func (f *fakeWalletClient) ReleaseReservedFunds(ctx context.Context, authHeader, userID string, req *models.ReleaseReserveRequest) (*models.ReleaseReserveResponse, error) {
	f.releaseReq = req
	f.releaseCalls++
	if f.releaseErr != nil {
		return nil, f.releaseErr
	}
	if f.err != nil {
		return nil, f.err
	}
	return f.released, nil
}

func (f *fakeWalletClient) CreateDeposit(ctx context.Context, authHeader, userID string, req *models.DepositRequest) (*models.DepositResponse, error) {
	f.depositReq = req
	f.depositCalls++
	if f.depositErr != nil {
		return nil, f.depositErr
	}
	if f.err != nil {
		return nil, f.err
	}
	return f.deposited, nil
}

func (f *fakeWalletClient) CreateWithdrawal(ctx context.Context, authHeader, userID string, req *models.WithdrawalRequest) (*models.WithdrawalResponse, error) {
	f.withdrawReq = req
	f.withdrawCalls++
	if f.withdrawErr != nil {
		return nil, f.withdrawErr
	}
	if f.err != nil {
		return nil, f.err
	}
	return f.withdrawn, nil
}

type fakeComplianceClient struct {
	response *models.GeoComplyPacketResponse
	err      error
	packet   string
	calls    int
}

func (f *fakeComplianceClient) EvaluateGeoPacket(ctx context.Context, packet string) (*models.GeoComplyPacketResponse, error) {
	f.packet = packet
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	return f.response, nil
}

func stringPtr(value string) *string {
	return &value
}

func intPtr(value int) *int {
	return &value
}

func int64Ptr(value int64) *int64 {
	return &value
}

func decimalPtr(value decimal.Decimal) *decimal.Decimal {
	return &value
}

func TestPlaceBet(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{bet: &models.Bet{BetID: "bet-1", UserID: "user-1", Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85"), PotentialPayout: decimal.RequireFromString("92.50"), Status: "pending"}}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.85")}}}}
	walletClient := &fakeWalletClient{reserved: &models.ReserveFundsResponse{ReservationID: "res-1"}}
	svc := NewBettingService(logger, repo, marketClient, walletClient)

	bet, err := svc.PlaceBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, &models.PlaceBetRequest{UserID: "user-1", MarketID: "mrk-1", OutcomeID: "out-1", Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85")})
	if err != nil {
		t.Fatalf("PlaceBet returned error: %v", err)
	}
	if bet.Status != "matched" {
		t.Fatalf("expected outward matched status, got %s", bet.Status)
	}
	if repo.createSingle.ReservationID != "res-1" {
		t.Fatalf("expected reservation id to be forwarded")
	}
}

func TestPlaceBetPersistsPromoLinkage(t *testing.T) {
	repo := &fakeRepo{bet: &models.Bet{BetID: "bet-1", UserID: "user-1", Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85"), PotentialPayout: decimal.RequireFromString("92.50"), Status: "pending"}}
	walletClient := &fakeWalletClient{reserved: &models.ReserveFundsResponse{ReservationID: "res-1"}}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.85")}}}}
	svc := NewBettingService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo, marketClient, walletClient)
	freebetID := "fb-1"
	oddsBoostID := "ob-1"

	_, err := svc.PlaceBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, &models.PlaceBetRequest{
		UserID:      "user-1",
		MarketID:    "mrk-1",
		OutcomeID:   "out-1",
		Stake:       decimal.RequireFromString("50.00"),
		Odds:        decimal.RequireFromString("1.85"),
		FreebetID:   &freebetID,
		OddsBoostID: &oddsBoostID,
	})
	if err != nil {
		t.Fatalf("PlaceBet returned error: %v", err)
	}
	if repo.createSingle.FreebetID == nil || *repo.createSingle.FreebetID != "fb-1" {
		t.Fatalf("expected freebet id to be persisted, got %+v", repo.createSingle.FreebetID)
	}
	if repo.createSingle.OddsBoostID == nil || *repo.createSingle.OddsBoostID != "ob-1" {
		t.Fatalf("expected odds boost id to be persisted, got %+v", repo.createSingle.OddsBoostID)
	}
	if repo.createSingle.FreebetApplied != 5000 {
		t.Fatalf("expected freebet applied cents 5000, got %d", repo.createSingle.FreebetApplied)
	}
}

func TestPlaceBetRejectsFreebetAppliedWithoutFreebetID(t *testing.T) {
	repo := &fakeRepo{bet: &models.Bet{BetID: "bet-1", UserID: "user-1"}}
	walletClient := &fakeWalletClient{reserved: &models.ReserveFundsResponse{ReservationID: "res-1"}}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.85")}}}}
	svc := NewBettingService(slog.New(slog.NewTextHandler(io.Discard, nil)), repo, marketClient, walletClient)
	applied := int64(500)

	_, err := svc.PlaceBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, &models.PlaceBetRequest{
		UserID:              "user-1",
		MarketID:            "mrk-1",
		OutcomeID:           "out-1",
		Stake:               decimal.RequireFromString("50.00"),
		Odds:                decimal.RequireFromString("1.85"),
		FreebetAppliedCents: &applied,
	})
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestPlaceBetRejectsOddsChange(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(logger, &fakeRepo{}, &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.90")}}}}, &fakeWalletClient{})
	_, err := svc.PlaceBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, &models.PlaceBetRequest{UserID: "user-1", MarketID: "mrk-1", OutcomeID: "out-1", Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85")})
	if !errors.Is(err, ErrOddsChanged) {
		t.Fatalf("expected ErrOddsChanged, got %v", err)
	}
}

func TestPlaceParlay(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{bet: &models.Bet{BetID: "bet-1", UserID: "user-1", Stake: decimal.RequireFromString("25.00"), Odds: decimal.RequireFromString("3.88"), PotentialPayout: decimal.RequireFromString("97.13"), Status: "pending", Legs: []models.BetLeg{{LegID: "leg-1", MarketID: "mrk-1", OutcomeID: "out-1", Odds: decimal.RequireFromString("1.85")}, {LegID: "leg-2", MarketID: "mrk-2", OutcomeID: "out-2", Odds: decimal.RequireFromString("2.10")}}}}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.85")}, {OutcomeID: "out-2", Odds: decimal.RequireFromString("2.10")}}}}
	walletClient := &fakeWalletClient{reserved: &models.ReserveFundsResponse{ReservationID: "res-2"}}
	svc := NewBettingService(logger, repo, marketClient, walletClient)
	bet, err := svc.PlaceParlay(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, &models.PlaceParlayRequest{UserID: "user-1", Stake: decimal.RequireFromString("25.00"), Legs: []models.ParlayLeg{{MarketID: "mrk-1", OutcomeID: "out-1", Odds: decimal.RequireFromString("1.85")}, {MarketID: "mrk-2", OutcomeID: "out-2", Odds: decimal.RequireFromString("2.10")}}})
	if err != nil {
		t.Fatalf("PlaceParlay returned error: %v", err)
	}
	if bet.BetType != "parlay" {
		t.Fatalf("expected parlay bet type, got %s", bet.BetType)
	}
	if repo.createParlay.ReservationID != "res-2" {
		t.Fatalf("expected reservation id to be forwarded")
	}
}

func TestQuoteBetBuilder(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{
		quote: &models.AdvancedQuote{
			QuoteID:      "bbq:test-1",
			QuoteType:    "bet_builder",
			UserID:       "user-1",
			RequestID:    "req-1",
			Status:       "open",
			Combinable:   true,
			ComboType:    stringPtr("same_game_parlay"),
			CombinedOdds: decimalPtr(decimal.RequireFromString("3.5100")),
			Legs: []models.AdvancedQuoteLeg{
				{MarketID: "mrk-1", SelectionID: "out-1", FixtureID: "fx-1", CurrentOdds: decimal.RequireFromString("1.85")},
				{MarketID: "mrk-1", SelectionID: "out-2", FixtureID: "fx-1", CurrentOdds: decimal.RequireFromString("1.90")},
			},
		},
	}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{
		MarketID: "mrk-1",
		EventID:  "fx-1",
		Status:   "open",
		Outcomes: []models.ExternalOutcome{
			{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.85")},
			{OutcomeID: "out-2", Odds: decimal.RequireFromString("1.90")},
		},
	}}
	svc := NewBettingService(logger, repo, marketClient, &fakeWalletClient{})

	response, err := svc.QuoteBetBuilder(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, &models.BetBuilderQuoteRequest{
		UserID:    "user-1",
		RequestID: "req-1",
		Legs: []models.BetBuilderQuoteLegRequest{
			{MarketID: "mrk-1", SelectionID: "out-1", RequestedOdds: decimalPtr(decimal.RequireFromString("1.85"))},
			{MarketID: "mrk-1", SelectionID: "out-2", RequestedOdds: decimalPtr(decimal.RequireFromString("1.90"))},
		},
	})
	if err != nil {
		t.Fatalf("QuoteBetBuilder returned error: %v", err)
	}
	if response.QuoteID != "bbq:test-1" {
		t.Fatalf("expected persisted quote id, got %s", response.QuoteID)
	}
	if repo.createQuote.QuoteType != "bet_builder" {
		t.Fatalf("expected bet_builder quote type, got %s", repo.createQuote.QuoteType)
	}
	if repo.createQuote.ComboType == nil || *repo.createQuote.ComboType != "same_game_parlay" {
		t.Fatalf("expected same_game_parlay combo type")
	}
}

func TestAcceptBetBuilderQuote(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	quote := &models.AdvancedQuote{
		QuoteID:      "bbq:test-1",
		QuoteType:    "bet_builder",
		UserID:       "user-1",
		RequestID:    "req-1",
		Status:       "open",
		Combinable:   true,
		CombinedOdds: decimalPtr(decimal.RequireFromString("3.5150")),
		Legs: []models.AdvancedQuoteLeg{
			{MarketID: "mrk-1", SelectionID: "out-1", FixtureID: "fx-1", RequestedOdds: decimalPtr(decimal.RequireFromString("1.85")), CurrentOdds: decimal.RequireFromString("1.85")},
			{MarketID: "mrk-2", SelectionID: "out-2", FixtureID: "fx-2", RequestedOdds: decimalPtr(decimal.RequireFromString("1.90")), CurrentOdds: decimal.RequireFromString("1.90")},
		},
	}
	repo := &fakeRepo{
		quote: quote,
		bet: &models.Bet{
			BetID:           "bet-1",
			UserID:          "user-1",
			Stake:           decimal.RequireFromString("25.00"),
			Odds:            decimal.RequireFromString("3.5150"),
			PotentialPayout: decimal.RequireFromString("87.88"),
			Status:          "pending",
			Legs: []models.BetLeg{
				{LegID: "leg-1", MarketID: "mrk-1", OutcomeID: "out-1", Odds: decimal.RequireFromString("1.85")},
				{LegID: "leg-2", MarketID: "mrk-2", OutcomeID: "out-2", Odds: decimal.RequireFromString("1.90")},
			},
		},
	}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{
		Status: "open",
		Outcomes: []models.ExternalOutcome{
			{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.85")},
			{OutcomeID: "out-2", Odds: decimal.RequireFromString("1.90")},
		},
	}}
	walletClient := &fakeWalletClient{reserved: &models.ReserveFundsResponse{ReservationID: "res-bb-1"}}
	svc := NewBettingService(logger, repo, marketClient, walletClient)

	response, err := svc.AcceptBetBuilderQuote(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, &models.BetBuilderAcceptRequest{
		QuoteID:    "bbq:test-1",
		UserID:     "user-1",
		RequestID:  "accept-1",
		StakeCents: 2500,
	})
	if err != nil {
		t.Fatalf("AcceptBetBuilderQuote returned error: %v", err)
	}
	if response.Bet == nil || response.Bet.BetID != "bet-1" {
		t.Fatalf("expected accepted bet in response")
	}
	if repo.acceptQuote.ReservationID != "res-bb-1" {
		t.Fatalf("expected reservation to be forwarded to quote acceptance")
	}
	if repo.acceptQuote.Stake.String() != "25" {
		t.Fatalf("expected stake to be converted from cents, got %s", repo.acceptQuote.Stake.String())
	}
}

func TestQuoteFixedExotic(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	stakeCents := int64(2000)
	repo := &fakeRepo{
		quote: &models.AdvancedQuote{
			QuoteID:              "feq:test-1",
			QuoteType:            "fixed_exotic",
			UserID:               "user-1",
			RequestID:            "req-1",
			Status:               "open",
			Combinable:           true,
			ExoticType:           stringPtr("exacta"),
			StakeCents:           &stakeCents,
			PotentialPayoutCents: int64Ptr(7980),
			EncodedTicket:        stringPtr("exacta:1=out-1|2=out-2"),
			Legs: []models.AdvancedQuoteLeg{
				{Position: intPtr(1), MarketID: "mrk-1", SelectionID: "out-1", FixtureID: "fx-1", CurrentOdds: decimal.RequireFromString("1.90")},
				{Position: intPtr(2), MarketID: "mrk-1", SelectionID: "out-2", FixtureID: "fx-1", CurrentOdds: decimal.RequireFromString("2.10")},
			},
		},
	}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{
		MarketID: "mrk-1",
		EventID:  "fx-1",
		Status:   "open",
		Outcomes: []models.ExternalOutcome{
			{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.90")},
			{OutcomeID: "out-2", Odds: decimal.RequireFromString("2.10")},
		},
	}}
	svc := NewBettingService(logger, repo, marketClient, &fakeWalletClient{})

	response, err := svc.QuoteFixedExotic(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, &models.FixedExoticQuoteRequest{
		UserID:     "user-1",
		RequestID:  "req-1",
		ExoticType: "exacta",
		StakeCents: &stakeCents,
		Legs: []models.FixedExoticQuoteLegRequest{
			{Position: 1, MarketID: "mrk-1", SelectionID: "out-1", FixtureID: "fx-1"},
			{Position: 2, MarketID: "mrk-1", SelectionID: "out-2", FixtureID: "fx-1"},
		},
	})
	if err != nil {
		t.Fatalf("QuoteFixedExotic returned error: %v", err)
	}
	if response.ExoticType != "exacta" {
		t.Fatalf("expected exacta quote, got %s", response.ExoticType)
	}
	if repo.createQuote.QuoteType != "fixed_exotic" {
		t.Fatalf("expected fixed_exotic quote type")
	}
}

func TestAcceptFixedExoticQuote(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	stakeCents := int64(1500)
	quote := &models.AdvancedQuote{
		QuoteID:      "feq:test-1",
		QuoteType:    "fixed_exotic",
		UserID:       "user-1",
		RequestID:    "req-1",
		Status:       "open",
		Combinable:   true,
		ExoticType:   stringPtr("exacta"),
		StakeCents:   &stakeCents,
		CombinedOdds: decimalPtr(decimal.RequireFromString("3.9900")),
		Legs: []models.AdvancedQuoteLeg{
			{Position: intPtr(1), MarketID: "mrk-1", SelectionID: "out-1", FixtureID: "fx-1", CurrentOdds: decimal.RequireFromString("1.90")},
			{Position: intPtr(2), MarketID: "mrk-1", SelectionID: "out-2", FixtureID: "fx-1", CurrentOdds: decimal.RequireFromString("2.10")},
		},
	}
	repo := &fakeRepo{
		quote: quote,
		bet: &models.Bet{
			BetID:           "bet-2",
			UserID:          "user-1",
			Stake:           decimal.RequireFromString("15.00"),
			Odds:            decimal.RequireFromString("3.99"),
			PotentialPayout: decimal.RequireFromString("59.85"),
			Status:          "pending",
			Legs: []models.BetLeg{
				{LegID: "leg-1", MarketID: "mrk-1", OutcomeID: "out-1", Odds: decimal.RequireFromString("1.90")},
				{LegID: "leg-2", MarketID: "mrk-1", OutcomeID: "out-2", Odds: decimal.RequireFromString("2.10")},
			},
		},
	}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{
		MarketID: "mrk-1",
		EventID:  "fx-1",
		Status:   "open",
		Outcomes: []models.ExternalOutcome{
			{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.90")},
			{OutcomeID: "out-2", Odds: decimal.RequireFromString("2.10")},
		},
	}}
	walletClient := &fakeWalletClient{reserved: &models.ReserveFundsResponse{ReservationID: "res-fe-1"}}
	svc := NewBettingService(logger, repo, marketClient, walletClient)

	response, err := svc.AcceptFixedExoticQuote(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, &models.FixedExoticAcceptRequest{
		QuoteID:   "feq:test-1",
		UserID:    "user-1",
		RequestID: "accept-1",
	})
	if err != nil {
		t.Fatalf("AcceptFixedExoticQuote returned error: %v", err)
	}
	if response.Bet == nil || response.Bet.BetID != "bet-2" {
		t.Fatalf("expected accepted fixed exotic bet")
	}
	if repo.acceptQuote.ReservationID != "res-fe-1" {
		t.Fatalf("expected reservation id on fixed exotic acceptance")
	}
}

func TestPrecheckBetsAcceptsValidSelections(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(
		logger,
		&fakeRepo{},
		&fakeMarketClient{market: &models.ExternalMarket{
			MarketID: "mrk-1",
			Status:   "open",
			Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.85")}},
		}},
		&fakeWalletClient{},
	)

	response, err := svc.PrecheckBets(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, &models.BetPrecheckRequest{
		UserID: "user-1",
		Bets: []models.BetPrecheckSelection{{
			MarketID:  "mrk-1",
			OutcomeID: "out-1",
			Odds:      decimal.RequireFromString("1.85"),
			Stake:     decimal.RequireFromString("10.00"),
		}},
	})
	if err != nil {
		t.Fatalf("PrecheckBets returned error: %v", err)
	}
	if response.ShouldBlockPlacement {
		t.Fatalf("expected precheck to allow placement, got blocking response: %+v", response)
	}
	if len(response.ErrorCodes) != 0 {
		t.Fatalf("expected no precheck error codes, got %+v", response.ErrorCodes)
	}
}

func TestPrecheckBetsBlocksClosedMarket(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(
		logger,
		&fakeRepo{},
		&fakeMarketClient{market: &models.ExternalMarket{
			MarketID: "mrk-1",
			Status:   "suspended",
			Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.85")}},
		}},
		&fakeWalletClient{},
	)

	response, err := svc.PrecheckBets(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, &models.BetPrecheckRequest{
		UserID: "user-1",
		Bets: []models.BetPrecheckSelection{{
			MarketID:  "mrk-1",
			OutcomeID: "out-1",
			Odds:      decimal.RequireFromString("1.85"),
		}},
	})
	if err != nil {
		t.Fatalf("PrecheckBets returned error: %v", err)
	}
	if !response.ShouldBlockPlacement {
		t.Fatalf("expected closed market to block placement")
	}
	if len(response.ErrorCodes) != 1 || response.ErrorCodes[0] != "unableToOpenBet" {
		t.Fatalf("expected unableToOpenBet, got %+v", response.ErrorCodes)
	}
}

func TestPrecheckBetsBlocksMissingSelection(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(
		logger,
		&fakeRepo{},
		&fakeMarketClient{market: &models.ExternalMarket{
			MarketID: "mrk-1",
			Status:   "open",
			Outcomes: []models.ExternalOutcome{{OutcomeID: "out-2", Odds: decimal.RequireFromString("1.85")}},
		}},
		&fakeWalletClient{},
	)

	response, err := svc.PrecheckBets(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, &models.BetPrecheckRequest{
		UserID: "user-1",
		Bets: []models.BetPrecheckSelection{{
			MarketID:  "mrk-1",
			OutcomeID: "out-1",
			Odds:      decimal.RequireFromString("1.85"),
		}},
	})
	if err != nil {
		t.Fatalf("PrecheckBets returned error: %v", err)
	}
	if !response.ShouldBlockPlacement {
		t.Fatalf("expected missing selection to block placement")
	}
	if len(response.ErrorCodes) != 1 || response.ErrorCodes[0] != "marketNotFound" {
		t.Fatalf("expected marketNotFound, got %+v", response.ErrorCodes)
	}
}

func TestPrecheckBetsBlocksOddsChange(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(
		logger,
		&fakeRepo{},
		&fakeMarketClient{market: &models.ExternalMarket{
			MarketID: "mrk-1",
			Status:   "open",
			Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.95")}},
		}},
		&fakeWalletClient{},
	)

	response, err := svc.PrecheckBets(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, &models.BetPrecheckRequest{
		UserID: "user-1",
		Bets: []models.BetPrecheckSelection{{
			MarketID:  "mrk-1",
			OutcomeID: "out-1",
			Odds:      decimal.RequireFromString("1.85"),
		}},
	})
	if err != nil {
		t.Fatalf("PrecheckBets returned error: %v", err)
	}
	if !response.ShouldBlockPlacement {
		t.Fatalf("expected odds change to block placement")
	}
	if len(response.ErrorCodes) != 1 || response.ErrorCodes[0] != "oddsChanged" {
		t.Fatalf("expected oddsChanged, got %+v", response.ErrorCodes)
	}
}

func TestPrecheckBetsCollapsesUnexpectedErrors(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(
		logger,
		&fakeRepo{},
		&fakeMarketClient{err: errors.New("market engine unavailable")},
		&fakeWalletClient{},
	)

	response, err := svc.PrecheckBets(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, &models.BetPrecheckRequest{
		UserID: "user-1",
		Bets: []models.BetPrecheckSelection{{
			MarketID:  "mrk-1",
			OutcomeID: "out-1",
			Odds:      decimal.RequireFromString("1.85"),
		}},
	})
	if err != nil {
		t.Fatalf("PrecheckBets returned error: %v", err)
	}
	if !response.ShouldBlockPlacement {
		t.Fatalf("expected unexpected market error to block placement")
	}
	if len(response.ErrorCodes) != 1 || response.ErrorCodes[0] != "unexpectedError" {
		t.Fatalf("expected unexpectedError, got %+v", response.ErrorCodes)
	}
}

func TestGetBetStatusUpdatesReturnsMappedStates(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(
		logger,
		&fakeRepo{betMap: map[string]*models.Bet{
			"bet-open":      {BetID: "bet-open", UserID: "user-1", Status: "pending"},
			"bet-settled":   {BetID: "bet-settled", UserID: "user-1", Status: "won"},
			"bet-cancelled": {BetID: "bet-cancelled", UserID: "user-1", Status: "cancelled"},
			"bet-failed":    {BetID: "bet-failed", UserID: "user-1", Status: "failed"},
		}},
		&fakeMarketClient{},
		&fakeWalletClient{},
	)

	response, err := svc.GetBetStatusUpdates(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, &models.PendingBetStatusRequest{
		BetIDs: []string{"bet-open", "bet-settled", "bet-cancelled", "bet-failed"},
	})
	if err != nil {
		t.Fatalf("GetBetStatusUpdates returned error: %v", err)
	}
	if len(response) != 4 {
		t.Fatalf("expected 4 status updates, got %d", len(response))
	}

	got := map[string]string{}
	for _, item := range response {
		got[item.BetID] = item.State
	}

	if got["bet-open"] != "OPENED" {
		t.Fatalf("expected pending bet to map to OPENED, got %s", got["bet-open"])
	}
	if got["bet-settled"] != "SETTLED" {
		t.Fatalf("expected won bet to map to SETTLED, got %s", got["bet-settled"])
	}
	if got["bet-cancelled"] != "CANCELLED" {
		t.Fatalf("expected cancelled bet to map to CANCELLED, got %s", got["bet-cancelled"])
	}
	if got["bet-failed"] != "FAILED" {
		t.Fatalf("expected failed bet to map to FAILED, got %s", got["bet-failed"])
	}
}

func TestGetBetStatusUpdatesSkipsMissingAndForeignBets(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(
		logger,
		&fakeRepo{betMap: map[string]*models.Bet{
			"bet-owned":   {BetID: "bet-owned", UserID: "user-1", Status: "pending"},
			"bet-foreign": {BetID: "bet-foreign", UserID: "user-2", Status: "pending"},
		}},
		&fakeMarketClient{},
		&fakeWalletClient{},
	)

	response, err := svc.GetBetStatusUpdates(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, &models.PendingBetStatusRequest{
		BetIDs: []string{"bet-owned", "bet-foreign", "bet-missing"},
	})
	if err != nil {
		t.Fatalf("GetBetStatusUpdates returned error: %v", err)
	}
	if len(response) != 1 {
		t.Fatalf("expected only the owned known bet to be returned, got %d entries", len(response))
	}
	if response[0].BetID != "bet-owned" || response[0].State != "OPENED" {
		t.Fatalf("unexpected status update returned: %+v", response[0])
	}
}

func TestPlaceBetRequiresGeolocationHeaderWhenEnforced(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{}
	marketClient := &fakeMarketClient{}
	walletClient := &fakeWalletClient{}
	complianceClient := &fakeComplianceClient{}
	svc := NewBettingService(
		logger,
		repo,
		marketClient,
		walletClient,
		WithComplianceClient(complianceClient),
		WithGeolocationEnforcementMode("required"),
	)

	_, err := svc.PlaceBet(
		context.Background(),
		"Bearer token",
		models.AuthClaims{UserID: "user-1", Role: "player"},
		&models.PlaceBetRequest{
			UserID:    "user-1",
			MarketID:  "mrk-1",
			OutcomeID: "out-1",
			Stake:     decimal.RequireFromString("50.00"),
			Odds:      decimal.RequireFromString("1.85"),
		},
	)
	if !errors.Is(err, ErrGeolocationHeaderNotFound) {
		t.Fatalf("expected ErrGeolocationHeaderNotFound, got %v", err)
	}
	if complianceClient.calls != 0 {
		t.Fatalf("expected no compliance call when header is missing")
	}
}

func TestPlaceBetRejectsGeolocationWhenComplianceFails(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{}
	marketClient := &fakeMarketClient{}
	walletClient := &fakeWalletClient{}
	complianceClient := &fakeComplianceClient{err: errors.New("service unavailable")}
	svc := NewBettingService(
		logger,
		repo,
		marketClient,
		walletClient,
		WithComplianceClient(complianceClient),
		WithGeolocationEnforcementMode("strict"),
	)

	ctx := middleware.WithGeolocationHeader(context.Background(), "encrypted-packet")
	_, err := svc.PlaceBet(
		ctx,
		"Bearer token",
		models.AuthClaims{UserID: "user-1", Role: "player"},
		&models.PlaceBetRequest{
			UserID:    "user-1",
			MarketID:  "mrk-1",
			OutcomeID: "out-1",
			Stake:     decimal.RequireFromString("50.00"),
			Odds:      decimal.RequireFromString("1.85"),
		},
	)
	if !errors.Is(err, ErrGeoLocationService) {
		t.Fatalf("expected ErrGeoLocationService, got %v", err)
	}
	if complianceClient.packet != "encrypted-packet" {
		t.Fatalf("expected geolocation packet to be forwarded")
	}
}

func TestPlaceBetRejectsGeolocationWhenPacketFails(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{}
	marketClient := &fakeMarketClient{}
	walletClient := &fakeWalletClient{}
	complianceClient := &fakeComplianceClient{
		response: &models.GeoComplyPacketResponse{Result: "FAILED"},
	}
	svc := NewBettingService(
		logger,
		repo,
		marketClient,
		walletClient,
		WithComplianceClient(complianceClient),
		WithGeolocationEnforcementMode("enforced"),
	)

	ctx := middleware.WithGeolocationHeader(context.Background(), "encrypted-packet")
	_, err := svc.PlaceBet(
		ctx,
		"Bearer token",
		models.AuthClaims{UserID: "user-1", Role: "player"},
		&models.PlaceBetRequest{
			UserID:    "user-1",
			MarketID:  "mrk-1",
			OutcomeID: "out-1",
			Stake:     decimal.RequireFromString("50.00"),
			Odds:      decimal.RequireFromString("1.85"),
		},
	)
	if !errors.Is(err, ErrGeolocationNotAllowed) {
		t.Fatalf("expected ErrGeolocationNotAllowed, got %v", err)
	}
}

func TestPlaceBetAcceptsGeolocationWhenPacketPasses(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{bet: &models.Bet{
		BetID:           "bet-1",
		UserID:          "user-1",
		Stake:           decimal.RequireFromString("50.00"),
		Odds:            decimal.RequireFromString("1.85"),
		PotentialPayout: decimal.RequireFromString("92.50"),
		Status:          "pending",
	}}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{
		MarketID: "mrk-1",
		Status:   "open",
		Outcomes: []models.ExternalOutcome{{
			OutcomeID: "out-1",
			Odds:      decimal.RequireFromString("1.85"),
		}},
	}}
	walletClient := &fakeWalletClient{reserved: &models.ReserveFundsResponse{ReservationID: "res-geo-1"}}
	complianceClient := &fakeComplianceClient{
		response: &models.GeoComplyPacketResponse{Result: "PASSED"},
	}
	svc := NewBettingService(
		logger,
		repo,
		marketClient,
		walletClient,
		WithComplianceClient(complianceClient),
		WithGeolocationEnforcementMode("required"),
	)

	ctx := middleware.WithGeolocationHeader(context.Background(), "encrypted-packet")
	bet, err := svc.PlaceBet(
		ctx,
		"Bearer token",
		models.AuthClaims{UserID: "user-1", Role: "player"},
		&models.PlaceBetRequest{
			UserID:    "user-1",
			MarketID:  "mrk-1",
			OutcomeID: "out-1",
			Stake:     decimal.RequireFromString("50.00"),
			Odds:      decimal.RequireFromString("1.85"),
		},
	)
	if err != nil {
		t.Fatalf("expected successful bet placement, got %v", err)
	}
	if bet == nil || bet.BetID != "bet-1" {
		t.Fatalf("expected bet to be created after passing geolocation")
	}
	if complianceClient.calls != 1 {
		t.Fatalf("expected exactly one compliance call, got %d", complianceClient.calls)
	}
}

func TestCashoutBetCreditsProfit(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	marketID := "mrk-1"
	outcomeID := "out-1"
	repo := &fakeRepo{bet: &models.Bet{BetID: "bet-1", UserID: "user-1", MarketID: &marketID, OutcomeID: &outcomeID, Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85"), PotentialPayout: decimal.RequireFromString("92.50"), Status: "pending"}, reservationID: "res-1"}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.42")}}}}
	walletClient := &fakeWalletClient{released: &models.ReleaseReserveResponse{}, deposited: &models.DepositResponse{}}
	svc := NewBettingService(logger, repo, marketClient, walletClient)
	offer, err := svc.GetCashoutOffer(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1")
	if err != nil {
		t.Fatalf("GetCashoutOffer returned error: %v", err)
	}
	response, err := svc.CashoutBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1", &models.CashoutRequest{CashoutPrice: offer.CashoutOffer})
	if err != nil {
		t.Fatalf("CashoutBet returned error: %v", err)
	}
	if walletClient.depositReq == nil || walletClient.depositReq.Amount.LessThanOrEqual(decimal.Zero) {
		t.Fatalf("expected deposit profit request")
	}
	if response.Status != "cashed_out" {
		t.Fatalf("expected cashed_out status, got %s", response.Status)
	}
}

func TestCashoutBetRestoresReservationWhenProfitDepositFails(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	marketID := "mrk-1"
	outcomeID := "out-1"
	repo := &fakeRepo{
		bet:           &models.Bet{BetID: "bet-1", UserID: "user-1", MarketID: &marketID, OutcomeID: &outcomeID, Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85"), PotentialPayout: decimal.RequireFromString("92.50"), Status: "pending"},
		reservationID: "res-1",
	}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.42")}}}}
	walletClient := &fakeWalletClient{
		released:   &models.ReleaseReserveResponse{},
		depositErr: errors.New("deposit failed"),
		reserved:   &models.ReserveFundsResponse{ReservationID: "res-restored"},
	}
	svc := NewBettingService(logger, repo, marketClient, walletClient)

	offer, err := svc.GetCashoutOffer(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1")
	if err != nil {
		t.Fatalf("GetCashoutOffer returned error: %v", err)
	}
	if _, err := svc.CashoutBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1", &models.CashoutRequest{CashoutPrice: offer.CashoutOffer}); err == nil {
		t.Fatalf("expected cashout failure when deposit fails")
	}
	if walletClient.reserveReq == nil || walletClient.reserveReq.Amount.String() != "50" {
		t.Fatalf("expected reservation restoration after deposit failure")
	}
	if repo.updatedResID != "res-restored" || repo.updateReason != "cashout_payout_failed" {
		t.Fatalf("expected repository reservation update after compensation, got id=%q reason=%q", repo.updatedResID, repo.updateReason)
	}
	if !repo.cashoutAmount.IsZero() {
		t.Fatalf("expected bet not to be marked cashed out when payout fails")
	}
}

func TestCashoutBetRestoresReservationWhenLossWithdrawalFails(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	marketID := "mrk-1"
	outcomeID := "out-1"
	repo := &fakeRepo{
		bet:           &models.Bet{BetID: "bet-1", UserID: "user-1", MarketID: &marketID, OutcomeID: &outcomeID, Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85"), PotentialPayout: decimal.RequireFromString("92.50"), Status: "pending"},
		reservationID: "res-1",
	}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("3.00")}}}}
	walletClient := &fakeWalletClient{
		released:    &models.ReleaseReserveResponse{},
		withdrawErr: errors.New("withdraw failed"),
		reserved:    &models.ReserveFundsResponse{ReservationID: "res-restored"},
	}
	svc := NewBettingService(logger, repo, marketClient, walletClient)

	offer, err := svc.GetCashoutOffer(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1")
	if err != nil {
		t.Fatalf("GetCashoutOffer returned error: %v", err)
	}
	if _, err := svc.CashoutBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1", &models.CashoutRequest{CashoutPrice: offer.CashoutOffer}); err == nil {
		t.Fatalf("expected cashout failure when withdrawal fails")
	}
	if walletClient.reserveReq == nil || repo.updatedResID != "res-restored" || repo.updateReason != "cashout_debit_failed" {
		t.Fatalf("expected reservation restoration after withdrawal failure")
	}
	if walletClient.depositReq != nil {
		t.Fatalf("did not expect deposit compensation on loss-side cashout failure")
	}
}

func TestCashoutBetRollsBackWalletSideEffectsWhenMarkFails(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	marketID := "mrk-1"
	outcomeID := "out-1"
	repo := &fakeRepo{
		bet:           &models.Bet{BetID: "bet-1", UserID: "user-1", MarketID: &marketID, OutcomeID: &outcomeID, Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85"), PotentialPayout: decimal.RequireFromString("92.50"), Status: "pending"},
		reservationID: "res-1",
		markErr:       errors.New("repository unavailable"),
	}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.42")}}}}
	walletClient := &fakeWalletClient{
		released:  &models.ReleaseReserveResponse{},
		deposited: &models.DepositResponse{},
		withdrawn: &models.WithdrawalResponse{},
		reserved:  &models.ReserveFundsResponse{ReservationID: "res-restored"},
	}
	svc := NewBettingService(logger, repo, marketClient, walletClient)

	offer, err := svc.GetCashoutOffer(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1")
	if err != nil {
		t.Fatalf("GetCashoutOffer returned error: %v", err)
	}
	if _, err := svc.CashoutBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1", &models.CashoutRequest{CashoutPrice: offer.CashoutOffer}); err == nil {
		t.Fatalf("expected cashout failure when mark fails")
	}
	if walletClient.withdrawReq == nil || walletClient.withdrawReq.Amount.LessThanOrEqual(decimal.Zero) {
		t.Fatalf("expected profit reversal withdrawal when mark fails")
	}
	if walletClient.reserveReq == nil || repo.updatedResID != "res-restored" || repo.updateReason != "cashout_repo_failed" {
		t.Fatalf("expected reservation restoration when mark fails")
	}
}

func TestCashoutBetReturnsCompensationErrorWhenReservationRestoreFails(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	marketID := "mrk-1"
	outcomeID := "out-1"
	repo := &fakeRepo{
		bet:           &models.Bet{BetID: "bet-1", UserID: "user-1", MarketID: &marketID, OutcomeID: &outcomeID, Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85"), PotentialPayout: decimal.RequireFromString("92.50"), Status: "pending"},
		reservationID: "res-1",
	}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.42")}}}}
	walletClient := &fakeWalletClient{
		released:   &models.ReleaseReserveResponse{},
		depositErr: errors.New("deposit failed"),
		reserveErr: errors.New("reserve compensation failed"),
	}
	svc := NewBettingService(logger, repo, marketClient, walletClient)

	offer, err := svc.GetCashoutOffer(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1")
	if err != nil {
		t.Fatalf("GetCashoutOffer returned error: %v", err)
	}
	_, err = svc.CashoutBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1", &models.CashoutRequest{CashoutPrice: offer.CashoutOffer})
	if err == nil {
		t.Fatalf("expected cashout failure when reservation compensation fails")
	}
	if !strings.Contains(err.Error(), "reservation compensation failed") {
		t.Fatalf("expected compensation failure in error, got %v", err)
	}
	if walletClient.reserveCalls != 1 {
		t.Fatalf("expected a single reservation restore attempt, got %d", walletClient.reserveCalls)
	}
	if repo.updatedResID != "" {
		t.Fatalf("did not expect reservation id update when reserve compensation fails")
	}
}

func TestCashoutBetReleasesRestoredReservationWhenReservationUpdateFails(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	marketID := "mrk-1"
	outcomeID := "out-1"
	repo := &fakeRepo{
		bet:           &models.Bet{BetID: "bet-1", UserID: "user-1", MarketID: &marketID, OutcomeID: &outcomeID, Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85"), PotentialPayout: decimal.RequireFromString("92.50"), Status: "pending"},
		reservationID: "res-1",
		updateErr:     errors.New("reservation update failed"),
	}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.42")}}}}
	walletClient := &fakeWalletClient{
		released:   &models.ReleaseReserveResponse{},
		depositErr: errors.New("deposit failed"),
		reserved:   &models.ReserveFundsResponse{ReservationID: "res-restored"},
	}
	svc := NewBettingService(logger, repo, marketClient, walletClient)

	offer, err := svc.GetCashoutOffer(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1")
	if err != nil {
		t.Fatalf("GetCashoutOffer returned error: %v", err)
	}
	_, err = svc.CashoutBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1", &models.CashoutRequest{CashoutPrice: offer.CashoutOffer})
	if err == nil {
		t.Fatalf("expected cashout failure when reservation update fails")
	}
	if !strings.Contains(err.Error(), "reservation compensation failed") || !strings.Contains(err.Error(), "reservation update failed") {
		t.Fatalf("expected wrapped reservation update failure in error, got %v", err)
	}
	if walletClient.releaseReq == nil || walletClient.releaseReq.ReservationID != "res-restored" {
		t.Fatalf("expected restored reservation to be released on update failure")
	}
	if walletClient.releaseCalls < 2 {
		t.Fatalf("expected initial release plus restore cleanup release, got %d", walletClient.releaseCalls)
	}
}

func TestCashoutBetReturnsCompensationErrorWhenRollbackWithdrawalFails(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	marketID := "mrk-1"
	outcomeID := "out-1"
	repo := &fakeRepo{
		bet:           &models.Bet{BetID: "bet-1", UserID: "user-1", MarketID: &marketID, OutcomeID: &outcomeID, Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85"), PotentialPayout: decimal.RequireFromString("92.50"), Status: "pending"},
		reservationID: "res-1",
		markErr:       errors.New("repository unavailable"),
	}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("1.42")}}}}
	walletClient := &fakeWalletClient{
		released:    &models.ReleaseReserveResponse{},
		deposited:   &models.DepositResponse{},
		withdrawErr: errors.New("rollback withdrawal failed"),
	}
	svc := NewBettingService(logger, repo, marketClient, walletClient)

	offer, err := svc.GetCashoutOffer(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1")
	if err != nil {
		t.Fatalf("GetCashoutOffer returned error: %v", err)
	}
	_, err = svc.CashoutBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1", &models.CashoutRequest{CashoutPrice: offer.CashoutOffer})
	if err == nil {
		t.Fatalf("expected cashout failure when rollback withdrawal fails")
	}
	if !strings.Contains(err.Error(), "wallet compensation failed") {
		t.Fatalf("expected wallet compensation failure in error, got %v", err)
	}
	if walletClient.withdrawCalls != 1 {
		t.Fatalf("expected exactly one rollback withdrawal attempt, got %d", walletClient.withdrawCalls)
	}
	if walletClient.reserveCalls != 0 {
		t.Fatalf("did not expect reservation restoration when rollback withdrawal itself fails")
	}
}

func TestCashoutBetReturnsCompensationErrorWhenRollbackDepositFails(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	marketID := "mrk-1"
	outcomeID := "out-1"
	repo := &fakeRepo{
		bet:           &models.Bet{BetID: "bet-1", UserID: "user-1", MarketID: &marketID, OutcomeID: &outcomeID, Stake: decimal.RequireFromString("50.00"), Odds: decimal.RequireFromString("1.85"), PotentialPayout: decimal.RequireFromString("92.50"), Status: "pending"},
		reservationID: "res-1",
		markErr:       errors.New("repository unavailable"),
	}
	marketClient := &fakeMarketClient{market: &models.ExternalMarket{MarketID: "mrk-1", Status: "open", Outcomes: []models.ExternalOutcome{{OutcomeID: "out-1", Odds: decimal.RequireFromString("3.00")}}}}
	walletClient := &fakeWalletClient{
		released:   &models.ReleaseReserveResponse{},
		withdrawn:  &models.WithdrawalResponse{},
		depositErr: errors.New("rollback deposit failed"),
	}
	svc := NewBettingService(logger, repo, marketClient, walletClient)

	offer, err := svc.GetCashoutOffer(context.Background(), models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1")
	if err != nil {
		t.Fatalf("GetCashoutOffer returned error: %v", err)
	}
	_, err = svc.CashoutBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-1", Role: "player"}, "bet-1", &models.CashoutRequest{CashoutPrice: offer.CashoutOffer})
	if err == nil {
		t.Fatalf("expected cashout failure when rollback deposit fails")
	}
	if !strings.Contains(err.Error(), "wallet compensation failed") {
		t.Fatalf("expected wallet compensation failure in error, got %v", err)
	}
	if walletClient.depositCalls != 1 {
		t.Fatalf("expected exactly one rollback deposit attempt, got %d", walletClient.depositCalls)
	}
	if walletClient.reserveCalls != 0 {
		t.Fatalf("did not expect reservation restoration when rollback deposit itself fails")
	}
}

func TestListUserBetsForbidden(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(logger, &fakeRepo{}, &fakeMarketClient{}, &fakeWalletClient{})
	_, err := svc.ListUserBets(context.Background(), models.AuthClaims{UserID: "other-user", Role: "player"}, "user-1", models.BetFilters{})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

func TestListAdminUserBetsBuildsTalonCompatibilityResponse(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	outcome := "won"
	settledAt := time.Now().UTC()
	repo := &fakeRepo{
		bets: []*models.Bet{
			{
				BetID:           "bet-1",
				UserID:          "user-1",
				Stake:           decimal.RequireFromString("50.00"),
				Odds:            decimal.RequireFromString("1.85"),
				PotentialPayout: decimal.RequireFromString("92.50"),
				Status:          "won",
				PlacedAt:        time.Now().UTC().Add(-time.Hour),
				SettledAt:       &settledAt,
				Result:          &outcome,
				ReservationID:   "res-1",
				Legs: []models.BetLeg{
					{
						LegID:     "leg-1",
						MarketID:  "market-1",
						OutcomeID: "outcome-1",
						Odds:      decimal.RequireFromString("1.85"),
						Status:    "won",
					},
				},
			},
		},
		total: 1,
		legContexts: map[string]*models.BetLegContext{
			"market-1|outcome-1": {
				MarketID:     "market-1",
				MarketName:   "Moneyline",
				OutcomeID:    "outcome-1",
				OutcomeName:  "Home",
				EventID:      "event-1",
				EventName:    "Phoenix FC v Malta FC",
				SportName:    "soccer",
				LeagueName:   "Premier League",
				EventStartAt: time.Now().UTC().Add(2 * time.Hour),
			},
		},
	}
	svc := NewBettingService(logger, repo, &fakeMarketClient{}, &fakeWalletClient{})

	response, err := svc.ListAdminUserBets(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "user-1", models.BetFilters{Page: 1, Limit: 20})
	if err != nil {
		t.Fatalf("ListAdminUserBets() error = %v", err)
	}
	if response.TotalCount != 1 || len(response.Data) != 1 {
		t.Fatalf("ListAdminUserBets() unexpected pagination = %+v", response)
	}
	item := response.Data[0]
	if item.BetID != "bet-1" || item.BetType != "multi" {
		t.Fatalf("ListAdminUserBets() unexpected bet payload = %+v", item)
	}
	if item.DisplayOdds.Decimal != 1.85 || item.Stake.Amount != 50 {
		t.Fatalf("ListAdminUserBets() unexpected monetary payload = %+v", item)
	}
	if item.Outcome != "WON" || item.Legs[0].Status != "SETTLED" {
		t.Fatalf("ListAdminUserBets() unexpected outcome mapping = %+v", item)
	}
	if item.Legs[0].ID != "bet-1" {
		t.Fatalf("expected lifecycle/cancel id to use bet id, got %+v", item.Legs[0])
	}
	if len(item.Sports) != 1 || item.Sports[0].ID != "soccer" {
		t.Fatalf("ListAdminUserBets() unexpected sports payload = %+v", item.Sports)
	}
}

func TestListAdminUserBetsForbidden(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(logger, &fakeRepo{}, &fakeMarketClient{}, &fakeWalletClient{})
	if _, err := svc.ListAdminUserBets(context.Background(), models.AuthClaims{UserID: "user-2", Role: "player"}, "user-1", models.BetFilters{}); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

func TestCancelAdminBetReleasesReservationAndMarksCancelled(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{
		bet: &models.Bet{
			BetID:  "bet-1",
			UserID: "user-1",
			Stake:  decimal.RequireFromString("50.00"),
			Status: "pending",
			Legs: []models.BetLeg{{
				LegID:     "leg-1",
				MarketID:  "market-1",
				OutcomeID: "outcome-1",
				Odds:      decimal.RequireFromString("1.85"),
				Status:    "pending",
			}},
		},
		reservationID: "res-1",
	}
	walletClient := &fakeWalletClient{released: &models.ReleaseReserveResponse{}}
	svc := NewBettingService(logger, repo, &fakeMarketClient{}, walletClient)

	bet, err := svc.CancelAdminBet(
		context.Background(),
		"Bearer admin-token",
		models.AuthClaims{UserID: "admin-1", Role: "operator"},
		"bet-1",
		&models.CancelBetRequest{CancellationReason: "operator requested cancellation"},
	)
	if err != nil {
		t.Fatalf("CancelAdminBet() error = %v", err)
	}
	if walletClient.releaseReq == nil || walletClient.releaseReq.ReservationID != "res-1" {
		t.Fatalf("expected reservation release, got %+v", walletClient.releaseReq)
	}
	if repo.cancelParams.BetID != "bet-1" || repo.cancelParams.CancellationReason != "operator requested cancellation" {
		t.Fatalf("unexpected cancel params: %+v", repo.cancelParams)
	}
	if repo.cancelParams.ActorID != "admin-1" || repo.cancelParams.ActorRole != "operator" {
		t.Fatalf("expected actor details to be forwarded, got %+v", repo.cancelParams)
	}
	if bet.Status != "cancelled" || bet.SettledAt == nil {
		t.Fatalf("expected cancelled outward bet, got %+v", bet)
	}
}

func TestCancelAdminBetRestoresReservationWhenMarkFails(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{
		bet: &models.Bet{
			BetID:  "bet-1",
			UserID: "user-1",
			Stake:  decimal.RequireFromString("50.00"),
			Status: "pending",
		},
		reservationID: "res-1",
		cancelErr:     errors.New("cancel update failed"),
	}
	walletClient := &fakeWalletClient{
		released: &models.ReleaseReserveResponse{},
		reserved: &models.ReserveFundsResponse{ReservationID: "res-restored"},
	}
	svc := NewBettingService(logger, repo, &fakeMarketClient{}, walletClient)

	_, err := svc.CancelAdminBet(
		context.Background(),
		"Bearer admin-token",
		models.AuthClaims{UserID: "admin-1", Role: "admin"},
		"bet-1",
		&models.CancelBetRequest{CancellationReason: "bad line"},
	)
	if err == nil {
		t.Fatalf("expected cancel failure when repository mark fails")
	}
	if walletClient.reserveReq == nil || repo.updatedResID != "res-restored" || repo.updateReason != "admin_cancel_failed" {
		t.Fatalf("expected reservation compensation after cancel failure, reserveReq=%+v updatedResID=%q reason=%q", walletClient.reserveReq, repo.updatedResID, repo.updateReason)
	}
}

func TestCancelAdminBetForbidden(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(logger, &fakeRepo{}, &fakeMarketClient{}, &fakeWalletClient{})
	_, err := svc.CancelAdminBet(context.Background(), "Bearer token", models.AuthClaims{UserID: "user-2", Role: "player"}, "bet-1", &models.CancelBetRequest{CancellationReason: "x"})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

func TestApplyAdminBetLifecycleActionCancel(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{
		bet: &models.Bet{
			BetID:  "bet-1",
			UserID: "user-1",
			Stake:  decimal.RequireFromString("50.00"),
			Status: "pending",
		},
		reservationID: "res-1",
	}
	walletClient := &fakeWalletClient{released: &models.ReleaseReserveResponse{}}
	svc := NewBettingService(logger, repo, &fakeMarketClient{}, walletClient)

	bet, err := svc.ApplyAdminBetLifecycleAction(
		context.Background(),
		"Bearer admin-token",
		models.AuthClaims{UserID: "admin-1", Role: "operator"},
		"bet-1",
		"cancel",
		&models.AdminBetLifecycleRequest{Reason: "triage cancel"},
	)
	if err != nil {
		t.Fatalf("ApplyAdminBetLifecycleAction() error = %v", err)
	}
	if repo.cancelParams.CancellationReason != "triage cancel" {
		t.Fatalf("expected lifecycle cancel reason to flow through, got %+v", repo.cancelParams)
	}
	if bet.Status != "cancelled" {
		t.Fatalf("expected cancelled outward bet, got %+v", bet)
	}
}

func TestApplyAdminBetLifecycleActionRefund(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{
		bet: &models.Bet{
			BetID:  "bet-1",
			UserID: "user-1",
			Stake:  decimal.RequireFromString("50.00"),
			Status: "pending",
		},
		reservationID: "res-1",
	}
	walletClient := &fakeWalletClient{released: &models.ReleaseReserveResponse{}}
	svc := NewBettingService(logger, repo, &fakeMarketClient{}, walletClient)

	bet, err := svc.ApplyAdminBetLifecycleAction(
		context.Background(),
		"Bearer admin-token",
		models.AuthClaims{UserID: "admin-1", Role: "admin"},
		"bet-1",
		"refund",
		&models.AdminBetLifecycleRequest{Reason: "ops refund"},
	)
	if err != nil {
		t.Fatalf("ApplyAdminBetLifecycleAction(refund) error = %v", err)
	}
	if walletClient.releaseReq == nil || walletClient.releaseReq.ReservationID != "res-1" {
		t.Fatalf("expected reservation release for refund, got %+v", walletClient.releaseReq)
	}
	if repo.refundParams.Reason != "ops refund" || repo.refundParams.ActorID != "admin-1" {
		t.Fatalf("unexpected refund params: %+v", repo.refundParams)
	}
	if bet.Status != "voided" || bet.SettledAt == nil {
		t.Fatalf("expected voided outward bet, got %+v", bet)
	}
}

func TestApplyAdminBetLifecycleActionSettleWin(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	outcomeID := "outcome-1"
	repo := &fakeRepo{
		bet: &models.Bet{
			BetID:           "bet-1",
			UserID:          "user-1",
			OutcomeID:       &outcomeID,
			Stake:           decimal.RequireFromString("50.00"),
			PotentialPayout: decimal.RequireFromString("92.50"),
			Status:          "pending",
		},
		reservationID: "res-1",
	}
	walletClient := &fakeWalletClient{
		released:  &models.ReleaseReserveResponse{},
		deposited: &models.DepositResponse{},
	}
	svc := NewBettingService(logger, repo, &fakeMarketClient{}, walletClient)

	bet, err := svc.ApplyAdminBetLifecycleAction(
		context.Background(),
		"Bearer admin-token",
		models.AuthClaims{UserID: "admin-1", Role: "operator"},
		"bet-1",
		"settle",
		&models.AdminBetLifecycleRequest{
			Reason:               "provider settled",
			WinningSelectionID:   "outcome-1",
			WinningSelectionName: "Home",
			ResultSource:         "provider_ops_triage",
		},
	)
	if err != nil {
		t.Fatalf("ApplyAdminBetLifecycleAction(settle win) error = %v", err)
	}
	if walletClient.releaseReq == nil || walletClient.releaseReq.ReservationID != "res-1" {
		t.Fatalf("expected reservation release for settlement, got %+v", walletClient.releaseReq)
	}
	if walletClient.depositReq == nil || !walletClient.depositReq.Amount.Equal(decimal.RequireFromString("42.50")) {
		t.Fatalf("expected payout deposit of 42.50, got %+v", walletClient.depositReq)
	}
	if repo.settleParams.Result != "won" || repo.settleParams.WinningSelectionID != "outcome-1" {
		t.Fatalf("unexpected settle params: %+v", repo.settleParams)
	}
	if bet.Status != "won" || bet.Result == nil || *bet.Result != "won" {
		t.Fatalf("expected won outward bet, got %+v", bet)
	}
}

func TestApplyAdminBetLifecycleActionSettleLoss(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	outcomeID := "outcome-1"
	repo := &fakeRepo{
		bet: &models.Bet{
			BetID:           "bet-1",
			UserID:          "user-1",
			OutcomeID:       &outcomeID,
			Stake:           decimal.RequireFromString("50.00"),
			PotentialPayout: decimal.RequireFromString("92.50"),
			Status:          "pending",
		},
		reservationID: "res-1",
	}
	walletClient := &fakeWalletClient{
		released:  &models.ReleaseReserveResponse{},
		withdrawn: &models.WithdrawalResponse{},
	}
	svc := NewBettingService(logger, repo, &fakeMarketClient{}, walletClient)

	bet, err := svc.ApplyAdminBetLifecycleAction(
		context.Background(),
		"Bearer admin-token",
		models.AuthClaims{UserID: "admin-1", Role: "operator"},
		"bet-1",
		"settle",
		&models.AdminBetLifecycleRequest{
			Reason:             "provider settled",
			WinningSelectionID: "outcome-9",
			ResultSource:       "provider_ops_triage",
		},
	)
	if err != nil {
		t.Fatalf("ApplyAdminBetLifecycleAction(settle loss) error = %v", err)
	}
	if walletClient.withdrawReq == nil || !walletClient.withdrawReq.Amount.Equal(decimal.RequireFromString("50.00")) {
		t.Fatalf("expected stake withdrawal of 50.00, got %+v", walletClient.withdrawReq)
	}
	if repo.settleParams.Result != "lost" {
		t.Fatalf("expected lost settle result, got %+v", repo.settleParams)
	}
	if bet.Status != "lost" || bet.Result == nil || *bet.Result != "lost" {
		t.Fatalf("expected lost outward bet, got %+v", bet)
	}
}

func TestApplyAdminBetLifecycleActionSettleRollsBackWalletSideEffectsWhenMarkFails(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	outcomeID := "outcome-1"
	repo := &fakeRepo{
		bet: &models.Bet{
			BetID:           "bet-1",
			UserID:          "user-1",
			OutcomeID:       &outcomeID,
			Stake:           decimal.RequireFromString("50.00"),
			PotentialPayout: decimal.RequireFromString("92.50"),
			Status:          "pending",
		},
		reservationID: "res-1",
		settleErr:     errors.New("settlement update failed"),
	}
	walletClient := &fakeWalletClient{
		released:  &models.ReleaseReserveResponse{},
		deposited: &models.DepositResponse{},
		withdrawn: &models.WithdrawalResponse{},
		reserved:  &models.ReserveFundsResponse{ReservationID: "res-restored"},
	}
	svc := NewBettingService(logger, repo, &fakeMarketClient{}, walletClient)

	_, err := svc.ApplyAdminBetLifecycleAction(
		context.Background(),
		"Bearer admin-token",
		models.AuthClaims{UserID: "admin-1", Role: "admin"},
		"bet-1",
		"settle",
		&models.AdminBetLifecycleRequest{
			Reason:             "provider settled",
			WinningSelectionID: "outcome-1",
			ResultSource:       "provider_ops_triage",
		},
	)
	if err == nil {
		t.Fatalf("expected settle failure when repository mark fails")
	}
	if walletClient.withdrawReq == nil || !walletClient.withdrawReq.Amount.Equal(decimal.RequireFromString("42.50")) {
		t.Fatalf("expected payout reversal withdrawal of 42.50, got %+v", walletClient.withdrawReq)
	}
	if walletClient.reserveReq == nil || repo.updatedResID != "res-restored" || repo.updateReason != "admin_settle_repo_failed" {
		t.Fatalf("expected reservation compensation after settle failure, reserveReq=%+v updatedResID=%q reason=%q", walletClient.reserveReq, repo.updatedResID, repo.updateReason)
	}
}

func TestApplyAdminBetLifecycleActionSettleRejectsParlays(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := &fakeRepo{
		bet: &models.Bet{
			BetID:  "bet-1",
			UserID: "user-1",
			Stake:  decimal.RequireFromString("50.00"),
			Status: "pending",
			Legs: []models.BetLeg{{
				LegID:     "leg-1",
				MarketID:  "market-1",
				OutcomeID: "outcome-1",
				Odds:      decimal.RequireFromString("1.85"),
				Status:    "pending",
			}},
		},
		reservationID: "res-1",
	}
	svc := NewBettingService(logger, repo, &fakeMarketClient{}, &fakeWalletClient{})

	_, err := svc.ApplyAdminBetLifecycleAction(
		context.Background(),
		"Bearer admin-token",
		models.AuthClaims{UserID: "admin-1", Role: "operator"},
		"bet-1",
		"settle",
		&models.AdminBetLifecycleRequest{
			Reason:             "provider settled",
			WinningSelectionID: "outcome-1",
		},
	)
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for parlay settle, got %v", err)
	}
}

func TestApplyAdminBetLifecycleActionUnsupported(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewBettingService(logger, &fakeRepo{}, &fakeMarketClient{}, &fakeWalletClient{})
	_, err := svc.ApplyAdminBetLifecycleAction(
		context.Background(),
		"Bearer admin-token",
		models.AuthClaims{UserID: "admin-1", Role: "admin"},
		"bet-1",
		"resettle",
		&models.AdminBetLifecycleRequest{Reason: "ops resettle"},
	)
	if err == nil || !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput for unsupported lifecycle action, got %v", err)
	}
}
