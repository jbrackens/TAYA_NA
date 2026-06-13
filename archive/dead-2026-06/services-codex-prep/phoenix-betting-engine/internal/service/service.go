package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-betting-engine/internal/client"
	"github.com/phoenixbot/phoenix-betting-engine/internal/middleware"
	"github.com/phoenixbot/phoenix-betting-engine/internal/models"
	"github.com/phoenixbot/phoenix-betting-engine/internal/repository"
)

var (
	ErrForbidden                 = errors.New("forbidden")
	ErrInvalidInput              = errors.New("invalid input")
	ErrOddsChanged               = errors.New("odds changed")
	ErrGeolocationHeaderNotFound = errors.New("geolocation header not found")
	ErrGeolocationNotAllowed     = errors.New("geolocation not allowed")
	ErrGeoLocationService        = errors.New("geo location service error")
)

type BettingService interface {
	PrecheckBets(ctx context.Context, actor models.AuthClaims, req *models.BetPrecheckRequest) (*models.BetPrecheckResponse, error)
	QuoteBetBuilder(ctx context.Context, actor models.AuthClaims, req *models.BetBuilderQuoteRequest) (*models.BetBuilderQuoteResponse, error)
	GetBetBuilderQuote(ctx context.Context, actor models.AuthClaims, quoteID string) (*models.BetBuilderQuoteResponse, error)
	AcceptBetBuilderQuote(ctx context.Context, authHeader string, actor models.AuthClaims, req *models.BetBuilderAcceptRequest) (*models.BetBuilderAcceptResponse, error)
	QuoteFixedExotic(ctx context.Context, actor models.AuthClaims, req *models.FixedExoticQuoteRequest) (*models.FixedExoticQuoteResponse, error)
	GetFixedExoticQuote(ctx context.Context, actor models.AuthClaims, quoteID string) (*models.FixedExoticQuoteResponse, error)
	AcceptFixedExoticQuote(ctx context.Context, authHeader string, actor models.AuthClaims, req *models.FixedExoticAcceptRequest) (*models.FixedExoticAcceptResponse, error)
	GetBetStatusUpdates(ctx context.Context, actor models.AuthClaims, req *models.PendingBetStatusRequest) ([]models.PendingBetStatusItem, error)
	PlaceBet(ctx context.Context, authHeader string, actor models.AuthClaims, req *models.PlaceBetRequest) (*models.Bet, error)
	PlaceParlay(ctx context.Context, authHeader string, actor models.AuthClaims, req *models.PlaceParlayRequest) (*models.Bet, error)
	ListAdminBets(ctx context.Context, actor models.AuthClaims, filters models.BetFilters) (*models.ListBetsResponse, error)
	GetAdminBet(ctx context.Context, actor models.AuthClaims, betID string) (*models.Bet, error)
	ListAdminUserBets(ctx context.Context, actor models.AuthClaims, userID string, filters models.BetFilters) (*models.TalonBetHistoryResponse, error)
	CancelAdminBet(ctx context.Context, authHeader string, actor models.AuthClaims, betID string, req *models.CancelBetRequest) (*models.Bet, error)
	ApplyAdminBetLifecycleAction(ctx context.Context, authHeader string, actor models.AuthClaims, betID, action string, req *models.AdminBetLifecycleRequest) (*models.Bet, error)
	GetBet(ctx context.Context, actor models.AuthClaims, betID string) (*models.Bet, error)
	ListUserBets(ctx context.Context, actor models.AuthClaims, userID string, filters models.BetFilters) (*models.ListBetsResponse, error)
	CashoutBet(ctx context.Context, authHeader string, actor models.AuthClaims, betID string, req *models.CashoutRequest) (*models.CashoutResponse, error)
	GetCashoutOffer(ctx context.Context, actor models.AuthClaims, betID string) (*models.CashoutOfferResponse, error)
}

type bettingService struct {
	logger           *slog.Logger
	repo             repository.BettingRepository
	marketClient     client.MarketClient
	walletClient     client.WalletClient
	complianceClient client.ComplianceClient
	geolocationMode  string
}

type Option func(*bettingService)

func WithComplianceClient(complianceClient client.ComplianceClient) Option {
	return func(s *bettingService) {
		s.complianceClient = complianceClient
	}
}

func WithGeolocationEnforcementMode(mode string) Option {
	return func(s *bettingService) {
		s.geolocationMode = strings.ToLower(strings.TrimSpace(mode))
	}
}

func NewBettingService(
	logger *slog.Logger,
	repo repository.BettingRepository,
	marketClient client.MarketClient,
	walletClient client.WalletClient,
	opts ...Option,
) BettingService {
	svc := &bettingService{
		logger:          logger,
		repo:            repo,
		marketClient:    marketClient,
		walletClient:    walletClient,
		geolocationMode: "disabled",
	}
	for _, opt := range opts {
		opt(svc)
	}
	return svc
}

func (s *bettingService) PrecheckBets(ctx context.Context, actor models.AuthClaims, req *models.BetPrecheckRequest) (*models.BetPrecheckResponse, error) {
	if err := validatePrecheckBets(actor, req); err != nil {
		return nil, err
	}
	response := &models.BetPrecheckResponse{
		ShouldBlockPlacement: false,
		ErrorCodes:           []string{},
	}
	for _, bet := range req.Bets {
		_, _, err := s.validateSingleSelection(ctx, bet.MarketID, bet.OutcomeID, bet.Odds)
		if err == nil {
			continue
		}
		response.ShouldBlockPlacement = true
		switch {
		case errors.Is(err, repository.ErrNotFound):
			appendPrecheckErrorCode(response, "marketNotFound")
		case errors.Is(err, ErrOddsChanged):
			appendPrecheckErrorCode(response, "oddsChanged")
		case strings.Contains(strings.ToLower(err.Error()), "market is not open"):
			appendPrecheckErrorCode(response, "unableToOpenBet")
		default:
			appendPrecheckErrorCode(response, "unexpectedError")
		}
	}
	return response, nil
}

func (s *bettingService) QuoteBetBuilder(ctx context.Context, actor models.AuthClaims, req *models.BetBuilderQuoteRequest) (*models.BetBuilderQuoteResponse, error) {
	if err := validateBetBuilderQuote(actor, req); err != nil {
		return nil, err
	}
	legs := make([]repository.CreateAdvancedQuoteLegParams, 0, len(req.Legs))
	fixtureSet := map[string]struct{}{}
	combinedOdds := decimal.NewFromInt(1)
	combinable := true
	reasonCode := (*string)(nil)
	for _, leg := range req.Legs {
		market, outcome, currentOdds, legReason, err := s.resolveQuoteLeg(ctx, leg.MarketID, leg.SelectionID, leg.RequestedOdds)
		if err != nil {
			return nil, err
		}
		if legReason != nil {
			combinable = false
			if reasonCode == nil {
				reasonCode = legReason
			}
		}
		fixtureSet[market.EventID] = struct{}{}
		combinedOdds = combinedOdds.Mul(currentOdds)
		legs = append(legs, repository.CreateAdvancedQuoteLegParams{
			MarketID:      market.MarketID,
			OutcomeID:     outcome.OutcomeID,
			FixtureID:     market.EventID,
			RequestedOdds: leg.RequestedOdds,
			CurrentOdds:   currentOdds,
		})
	}
	comboType := "parlay"
	if len(fixtureSet) == 1 {
		comboType = "same_game_parlay"
	}
	expiresAt := time.Now().UTC().Add(5 * time.Minute)
	quote, err := s.repo.CreateAdvancedQuote(ctx, repository.CreateAdvancedQuoteParams{
		QuoteID:            "bbq:" + uuid.NewString(),
		QuoteType:          "bet_builder",
		UserID:             req.UserID,
		RequestID:          req.RequestID,
		ComboType:          &comboType,
		CombinedOdds:       decimalPointer(combinedOdds.Round(4)),
		ImpliedProbability: calculateImpliedProbability(combinedOdds),
		Combinable:         combinable,
		ReasonCode:         reasonCode,
		Status:             "open",
		ExpiresAt:          &expiresAt,
		LastReason:         reasonCode,
		Legs:               legs,
	})
	if err != nil {
		return nil, err
	}
	return mapBetBuilderQuote(quote), nil
}

func (s *bettingService) GetBetBuilderQuote(ctx context.Context, actor models.AuthClaims, quoteID string) (*models.BetBuilderQuoteResponse, error) {
	quote, err := s.repo.GetAdvancedQuote(ctx, quoteID)
	if err != nil {
		return nil, err
	}
	if quote.QuoteType != "bet_builder" {
		return nil, repository.ErrNotFound
	}
	if !canAccessBet(actor, quote.UserID) {
		return nil, ErrForbidden
	}
	return mapBetBuilderQuote(quote), nil
}

func (s *bettingService) AcceptBetBuilderQuote(ctx context.Context, authHeader string, actor models.AuthClaims, req *models.BetBuilderAcceptRequest) (*models.BetBuilderAcceptResponse, error) {
	if err := validateBetBuilderAccept(actor, req); err != nil {
		return nil, err
	}
	if err := s.validateGeolocation(ctx); err != nil {
		return nil, err
	}
	quote, bet, err := s.acceptAdvancedQuote(ctx, authHeader, actor, req.QuoteID, req.UserID, req.RequestID, emptyStringAsNil(req.IdempotencyKey), emptyStringAsNil(req.Reason), centsToDecimal(req.StakeCents), "bet_builder")
	if err != nil {
		return nil, err
	}
	return &models.BetBuilderAcceptResponse{
		Bet:   outwardBet(bet),
		Quote: mapBetBuilderQuote(quote),
	}, nil
}

func (s *bettingService) QuoteFixedExotic(ctx context.Context, actor models.AuthClaims, req *models.FixedExoticQuoteRequest) (*models.FixedExoticQuoteResponse, error) {
	if err := validateFixedExoticQuote(actor, req); err != nil {
		return nil, err
	}
	legs := make([]repository.CreateAdvancedQuoteLegParams, 0, len(req.Legs))
	combinedOdds := decimal.NewFromInt(1)
	combinable := true
	reasonCode := (*string)(nil)
	fixtureSet := map[string]struct{}{}
	positionSet := map[int]struct{}{}
	selectionSet := map[string]struct{}{}
	for _, leg := range req.Legs {
		market, outcome, currentOdds, legReason, err := s.resolveQuoteLeg(ctx, leg.MarketID, leg.SelectionID, leg.RequestedOdds)
		if err != nil {
			return nil, err
		}
		if legReason != nil {
			combinable = false
			if reasonCode == nil {
				reasonCode = legReason
			}
		}
		if leg.FixtureID != "" && leg.FixtureID != market.EventID {
			reasonCode = stringPointer("fixtureMismatch")
			combinable = false
		}
		fixtureSet[market.EventID] = struct{}{}
		if _, exists := positionSet[leg.Position]; exists {
			reasonCode = stringPointer("invalidExoticComposition")
			combinable = false
		}
		positionSet[leg.Position] = struct{}{}
		if _, exists := selectionSet[leg.SelectionID]; exists {
			reasonCode = stringPointer("duplicateSelection")
			combinable = false
		}
		selectionSet[leg.SelectionID] = struct{}{}
		combinedOdds = combinedOdds.Mul(currentOdds)
		position := leg.Position
		legs = append(legs, repository.CreateAdvancedQuoteLegParams{
			Position:      &position,
			MarketID:      market.MarketID,
			OutcomeID:     outcome.OutcomeID,
			FixtureID:     market.EventID,
			RequestedOdds: leg.RequestedOdds,
			CurrentOdds:   currentOdds,
		})
	}
	if len(fixtureSet) != 1 {
		reasonCode = stringPointer("invalidExoticComposition")
		combinable = false
	}
	expectedLegs := 2
	if req.ExoticType == "trifecta" {
		expectedLegs = 3
	}
	if len(req.Legs) != expectedLegs {
		reasonCode = stringPointer("invalidExoticComposition")
		combinable = false
	}
	stakeCents := req.StakeCents
	var potentialPayoutCents *int64
	if stakeCents != nil {
		payout := decimal.NewFromInt(*stakeCents).Div(decimal.NewFromInt(100)).Mul(combinedOdds).Mul(decimal.NewFromInt(100)).Round(0).IntPart()
		potentialPayoutCents = &payout
	}
	expiresAt := time.Now().UTC().Add(5 * time.Minute)
	encodedTicket := encodeFixedExoticTicket(req.ExoticType, req.Legs)
	quote, err := s.repo.CreateAdvancedQuote(ctx, repository.CreateAdvancedQuoteParams{
		QuoteID:              "feq:" + uuid.NewString(),
		QuoteType:            "fixed_exotic",
		UserID:               req.UserID,
		RequestID:            req.RequestID,
		ExoticType:           &req.ExoticType,
		StakeCents:           stakeCents,
		CombinedOdds:         decimalPointer(combinedOdds.Round(4)),
		ImpliedProbability:   calculateImpliedProbability(combinedOdds),
		PotentialPayoutCents: potentialPayoutCents,
		EncodedTicket:        &encodedTicket,
		Combinable:           combinable,
		ReasonCode:           reasonCode,
		Status:               "open",
		ExpiresAt:            &expiresAt,
		LastReason:           reasonCode,
		Legs:                 legs,
	})
	if err != nil {
		return nil, err
	}
	return mapFixedExoticQuote(quote), nil
}

func (s *bettingService) GetFixedExoticQuote(ctx context.Context, actor models.AuthClaims, quoteID string) (*models.FixedExoticQuoteResponse, error) {
	quote, err := s.repo.GetAdvancedQuote(ctx, quoteID)
	if err != nil {
		return nil, err
	}
	if quote.QuoteType != "fixed_exotic" {
		return nil, repository.ErrNotFound
	}
	if !canAccessBet(actor, quote.UserID) {
		return nil, ErrForbidden
	}
	return mapFixedExoticQuote(quote), nil
}

func (s *bettingService) AcceptFixedExoticQuote(ctx context.Context, authHeader string, actor models.AuthClaims, req *models.FixedExoticAcceptRequest) (*models.FixedExoticAcceptResponse, error) {
	if err := validateFixedExoticAccept(actor, req); err != nil {
		return nil, err
	}
	if err := s.validateGeolocation(ctx); err != nil {
		return nil, err
	}
	quote, existingErr := s.repo.GetAdvancedQuote(ctx, req.QuoteID)
	if existingErr != nil {
		return nil, existingErr
	}
	if quote.QuoteType != "fixed_exotic" {
		return nil, repository.ErrNotFound
	}
	stake := quote.StakeCents
	if req.StakeCents != nil {
		stake = req.StakeCents
	}
	if stake == nil || *stake <= 0 {
		return nil, fmt.Errorf("%w: stakeCents must be positive", ErrInvalidInput)
	}
	acceptedQuote, bet, err := s.acceptAdvancedQuote(ctx, authHeader, actor, req.QuoteID, req.UserID, req.RequestID, emptyStringAsNil(req.IdempotencyKey), emptyStringAsNil(req.Reason), centsToDecimal(*stake), "fixed_exotic")
	if err != nil {
		return nil, err
	}
	return &models.FixedExoticAcceptResponse{
		Bet:   outwardBet(bet),
		Quote: mapFixedExoticQuote(acceptedQuote),
	}, nil
}

func (s *bettingService) GetBetStatusUpdates(ctx context.Context, actor models.AuthClaims, req *models.PendingBetStatusRequest) ([]models.PendingBetStatusItem, error) {
	if err := validatePendingBetStatusRequest(req); err != nil {
		return nil, err
	}
	updates := make([]models.PendingBetStatusItem, 0, len(req.BetIDs))
	for _, betID := range req.BetIDs {
		bet, err := s.repo.GetBet(ctx, betID)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				continue
			}
			return nil, err
		}
		if !canAccessBet(actor, bet.UserID) {
			continue
		}
		state, reason, ok := mapBetStatusToPendingState(bet)
		if !ok {
			continue
		}
		updates = append(updates, models.PendingBetStatusItem{
			BetID:  bet.BetID,
			State:  state,
			Reason: reason,
		})
	}
	return updates, nil
}

func (s *bettingService) PlaceBet(ctx context.Context, authHeader string, actor models.AuthClaims, req *models.PlaceBetRequest) (*models.Bet, error) {
	if err := validatePlaceBet(actor, req); err != nil {
		return nil, err
	}
	if err := s.validateGeolocation(ctx); err != nil {
		return nil, err
	}
	market, outcome, err := s.validateSingleSelection(ctx, req.MarketID, req.OutcomeID, req.Odds)
	if err != nil {
		return nil, err
	}
	freebetID, freebetApplied, oddsBoostID, err := normalizePromoPlacement(req.FreebetID, req.FreebetAppliedCents, req.OddsBoostID, req.Stake)
	if err != nil {
		return nil, err
	}
	reserveResponse, err := s.walletClient.ReserveFunds(ctx, authHeader, req.UserID, &models.ReserveFundsRequest{
		Amount:        req.Stake,
		ReferenceID:   req.MarketID,
		ReferenceType: "bet",
	})
	if err != nil {
		return nil, err
	}
	potentialPayout := req.Stake.Mul(outcome.Odds).Round(2)
	bet, err := s.repo.CreateSingleBet(ctx, repository.CreateBetParams{
		UserID:          req.UserID,
		MarketID:        market.MarketID,
		OutcomeID:       outcome.OutcomeID,
		FreebetID:       freebetID,
		FreebetApplied:  freebetApplied,
		OddsBoostID:     oddsBoostID,
		Stake:           req.Stake,
		Odds:            outcome.Odds,
		PotentialPayout: potentialPayout,
		ReservationID:   reserveResponse.ReservationID,
	})
	if err != nil {
		_, _ = s.walletClient.ReleaseReservedFunds(ctx, authHeader, req.UserID, &models.ReleaseReserveRequest{ReservationID: reserveResponse.ReservationID, Amount: req.Stake})
		return nil, err
	}
	return outwardBet(bet), nil
}

func (s *bettingService) PlaceParlay(ctx context.Context, authHeader string, actor models.AuthClaims, req *models.PlaceParlayRequest) (*models.Bet, error) {
	if err := validatePlaceParlay(actor, req); err != nil {
		return nil, err
	}
	if err := s.validateGeolocation(ctx); err != nil {
		return nil, err
	}
	legs := make([]repository.CreateParlayLegParams, 0, len(req.Legs))
	totalOdds := decimal.NewFromInt(1)
	for _, leg := range req.Legs {
		_, outcome, err := s.validateSingleSelection(ctx, leg.MarketID, leg.OutcomeID, leg.Odds)
		if err != nil {
			return nil, err
		}
		totalOdds = totalOdds.Mul(outcome.Odds)
		legs = append(legs, repository.CreateParlayLegParams{MarketID: leg.MarketID, OutcomeID: leg.OutcomeID, Odds: outcome.Odds})
	}
	freebetID, freebetApplied, oddsBoostID, err := normalizePromoPlacement(req.FreebetID, req.FreebetAppliedCents, req.OddsBoostID, req.Stake)
	if err != nil {
		return nil, err
	}
	reserveResponse, err := s.walletClient.ReserveFunds(ctx, authHeader, req.UserID, &models.ReserveFundsRequest{Amount: req.Stake, ReferenceID: req.UserID, ReferenceType: "parlay"})
	if err != nil {
		return nil, err
	}
	potentialPayout := req.Stake.Mul(totalOdds).Round(2)
	bet, err := s.repo.CreateParlayBet(ctx, repository.CreateParlayParams{
		UserID:          req.UserID,
		FreebetID:       freebetID,
		FreebetApplied:  freebetApplied,
		OddsBoostID:     oddsBoostID,
		Stake:           req.Stake,
		TotalOdds:       totalOdds.Round(4),
		PotentialPayout: potentialPayout,
		ReservationID:   reserveResponse.ReservationID,
		Legs:            legs,
	})
	if err != nil {
		_, _ = s.walletClient.ReleaseReservedFunds(ctx, authHeader, req.UserID, &models.ReleaseReserveRequest{ReservationID: reserveResponse.ReservationID, Amount: req.Stake})
		return nil, err
	}
	return outwardBet(bet), nil
}

func (s *bettingService) ListAdminBets(ctx context.Context, actor models.AuthClaims, filters models.BetFilters) (*models.ListBetsResponse, error) {
	if !canAdminReadBets(actor.Role) {
		return nil, ErrForbidden
	}
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.Limit < 1 || filters.Limit > 100 {
		filters.Limit = 20
	}
	bets, total, err := s.repo.ListBets(ctx, filters)
	if err != nil {
		return nil, err
	}
	result := make([]*models.Bet, 0, len(bets))
	for _, bet := range bets {
		result = append(result, outwardBet(bet))
	}
	return &models.ListBetsResponse{Data: result, Pagination: models.Pagination{Page: filters.Page, Limit: filters.Limit, Total: total}}, nil
}

func (s *bettingService) GetAdminBet(ctx context.Context, actor models.AuthClaims, betID string) (*models.Bet, error) {
	if !canAdminReadBets(actor.Role) {
		return nil, ErrForbidden
	}
	bet, err := s.repo.GetBet(ctx, betID)
	if err != nil {
		return nil, err
	}
	return outwardBet(bet), nil
}

func (s *bettingService) ListAdminUserBets(ctx context.Context, actor models.AuthClaims, userID string, filters models.BetFilters) (*models.TalonBetHistoryResponse, error) {
	if !canAdminReadBets(actor.Role) {
		return nil, ErrForbidden
	}
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, fmt.Errorf("%w: user id is required", ErrInvalidInput)
	}
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.Limit < 1 || filters.Limit > 100 {
		filters.Limit = 20
	}
	bets, total, err := s.repo.ListUserBets(ctx, userID, filters)
	if err != nil {
		return nil, err
	}
	contextCache := make(map[string]*models.BetLegContext)
	items := make([]models.TalonBet, 0, len(bets))
	for _, bet := range bets {
		item, convErr := s.toTalonBet(ctx, outwardBet(bet), contextCache)
		if convErr != nil {
			return nil, convErr
		}
		items = append(items, item)
	}
	return &models.TalonBetHistoryResponse{
		Data:         items,
		CurrentPage:  filters.Page,
		ItemsPerPage: filters.Limit,
		TotalCount:   total,
	}, nil
}

func (s *bettingService) CancelAdminBet(ctx context.Context, authHeader string, actor models.AuthClaims, betID string, req *models.CancelBetRequest) (*models.Bet, error) {
	if !canAdminReadBets(actor.Role) {
		return nil, ErrForbidden
	}
	reason := strings.TrimSpace(cancelBetReason(req))
	if reason == "" {
		return nil, fmt.Errorf("%w: cancellationReason is required", ErrInvalidInput)
	}
	bet, err := s.repo.GetBet(ctx, betID)
	if err != nil {
		return nil, err
	}
	if bet.Status != "pending" && bet.Status != "matched" {
		return nil, fmt.Errorf("%w: bet is not eligible for cancellation", ErrInvalidInput)
	}
	reservationID, err := s.repo.GetReservationID(ctx, betID)
	if err != nil {
		return nil, err
	}
	if _, err := s.walletClient.ReleaseReservedFunds(ctx, authHeader, bet.UserID, &models.ReleaseReserveRequest{
		ReservationID: reservationID,
		Amount:        bet.Stake,
	}); err != nil {
		return nil, err
	}
	updatedBet, err := s.repo.CancelBet(ctx, repository.CancelBetParams{
		BetID:              betID,
		CancellationReason: reason,
		CancelledAt:        time.Now().UTC(),
		ActorID:            actor.UserID,
		ActorRole:          actor.Role,
	})
	if err != nil {
		if compensationErr := s.restoreReservation(ctx, authHeader, bet, betID, "admin_cancel_failed"); compensationErr != nil {
			return nil, fmt.Errorf("cancel bet failed: %w (reservation compensation failed: %v)", err, compensationErr)
		}
		return nil, err
	}
	return outwardBet(updatedBet), nil
}

func (s *bettingService) ApplyAdminBetLifecycleAction(ctx context.Context, authHeader string, actor models.AuthClaims, betID, action string, req *models.AdminBetLifecycleRequest) (*models.Bet, error) {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "cancel":
		cancelReq := &models.CancelBetRequest{}
		if req != nil {
			cancelReq.Reason = req.Reason
		}
		return s.CancelAdminBet(ctx, authHeader, actor, betID, cancelReq)
	case "refund":
		return s.refundAdminBet(ctx, authHeader, actor, betID, req)
	case "settle":
		return s.settleAdminBet(ctx, authHeader, actor, betID, req)
	default:
		return nil, fmt.Errorf("%w: unsupported bet lifecycle action %q", ErrInvalidInput, strings.TrimSpace(action))
	}
}

func (s *bettingService) refundAdminBet(ctx context.Context, authHeader string, actor models.AuthClaims, betID string, req *models.AdminBetLifecycleRequest) (*models.Bet, error) {
	if !canAdminReadBets(actor.Role) {
		return nil, ErrForbidden
	}
	reason := adminLifecycleReason(req)
	if reason == "" {
		return nil, fmt.Errorf("%w: reason is required", ErrInvalidInput)
	}
	bet, err := s.repo.GetBet(ctx, betID)
	if err != nil {
		return nil, err
	}
	if !isOpenBetLifecycleStatus(bet.Status) {
		return nil, fmt.Errorf("%w: bet is not eligible for refund", ErrInvalidInput)
	}
	reservationID, err := s.repo.GetReservationID(ctx, betID)
	if err != nil {
		return nil, err
	}
	if _, err := s.walletClient.ReleaseReservedFunds(ctx, authHeader, bet.UserID, &models.ReleaseReserveRequest{
		ReservationID: reservationID,
		Amount:        bet.Stake,
	}); err != nil {
		return nil, err
	}
	updatedBet, err := s.repo.RefundBet(ctx, repository.RefundBetParams{
		BetID:      betID,
		Reason:     reason,
		RefundedAt: time.Now().UTC(),
		ActorID:    actor.UserID,
		ActorRole:  actor.Role,
	})
	if err != nil {
		if compensationErr := s.restoreReservation(ctx, authHeader, bet, betID, "admin_refund_failed"); compensationErr != nil {
			return nil, fmt.Errorf("refund bet failed: %w (reservation compensation failed: %v)", err, compensationErr)
		}
		return nil, err
	}
	return outwardBet(updatedBet), nil
}

func (s *bettingService) settleAdminBet(ctx context.Context, authHeader string, actor models.AuthClaims, betID string, req *models.AdminBetLifecycleRequest) (*models.Bet, error) {
	if !canAdminReadBets(actor.Role) {
		return nil, ErrForbidden
	}
	reason := adminLifecycleReason(req)
	if reason == "" {
		return nil, fmt.Errorf("%w: reason is required", ErrInvalidInput)
	}
	bet, err := s.repo.GetBet(ctx, betID)
	if err != nil {
		return nil, err
	}
	if !isOpenBetLifecycleStatus(bet.Status) {
		return nil, fmt.Errorf("%w: bet is not eligible for settlement", ErrInvalidInput)
	}
	result, err := resolveManualSettlementResult(bet, req)
	if err != nil {
		return nil, err
	}
	reservationID, err := s.repo.GetReservationID(ctx, betID)
	if err != nil {
		return nil, err
	}
	if _, err := s.walletClient.ReleaseReservedFunds(ctx, authHeader, bet.UserID, &models.ReleaseReserveRequest{
		ReservationID: reservationID,
		Amount:        bet.Stake,
	}); err != nil {
		return nil, err
	}
	settlementAmount := decimal.Zero
	switch result {
	case "won":
		settlementAmount = bet.PotentialPayout.Sub(bet.Stake).Round(2)
		if settlementAmount.GreaterThan(decimal.Zero) {
			if _, err := s.walletClient.CreateDeposit(ctx, authHeader, bet.UserID, &models.DepositRequest{
				Amount:        settlementAmount,
				PaymentMethod: "bet_settlement",
				PaymentToken:  betID,
				Currency:      "USD",
			}); err != nil {
				if compensationErr := s.restoreReservation(ctx, authHeader, bet, betID, "admin_settle_payout_failed"); compensationErr != nil {
					return nil, fmt.Errorf("settle bet payout failed: %w (reservation compensation failed: %v)", err, compensationErr)
				}
				return nil, err
			}
		}
	case "lost":
		settlementAmount = bet.Stake.Round(2)
		if _, err := s.walletClient.CreateWithdrawal(ctx, authHeader, bet.UserID, &models.WithdrawalRequest{
			Amount:        settlementAmount,
			BankAccountID: betID,
			Currency:      "USD",
		}); err != nil {
			if compensationErr := s.restoreReservation(ctx, authHeader, bet, betID, "admin_settle_debit_failed"); compensationErr != nil {
				return nil, fmt.Errorf("settle bet debit failed: %w (reservation compensation failed: %v)", err, compensationErr)
			}
			return nil, err
		}
	default:
		return nil, fmt.Errorf("%w: unsupported settlement result %q", ErrInvalidInput, result)
	}
	updatedBet, err := s.repo.SettleBet(ctx, repository.SettleBetParams{
		BetID:                betID,
		Result:               result,
		Reason:               reason,
		WinningSelectionID:   strings.TrimSpace(req.WinningSelectionID),
		WinningSelectionName: strings.TrimSpace(req.WinningSelectionName),
		ResultSource:         adminResultSource(req),
		SettledAt:            time.Now().UTC(),
		ActorID:              actor.UserID,
		ActorRole:            actor.Role,
	})
	if err != nil {
		if compensationErr := s.rollbackAdminSettlement(ctx, authHeader, bet, result, settlementAmount, betID); compensationErr != nil {
			return nil, fmt.Errorf("settle bet failed: %w (wallet compensation failed: %v)", err, compensationErr)
		}
		return nil, err
	}
	return outwardBet(updatedBet), nil
}

func (s *bettingService) GetBet(ctx context.Context, actor models.AuthClaims, betID string) (*models.Bet, error) {
	bet, err := s.repo.GetBet(ctx, betID)
	if err != nil {
		return nil, err
	}
	if !canAccessBet(actor, bet.UserID) {
		return nil, ErrForbidden
	}
	return outwardBet(bet), nil
}

func (s *bettingService) ListUserBets(ctx context.Context, actor models.AuthClaims, userID string, filters models.BetFilters) (*models.ListBetsResponse, error) {
	if !canAccessBet(actor, userID) {
		return nil, ErrForbidden
	}
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.Limit < 1 || filters.Limit > 100 {
		filters.Limit = 20
	}
	bets, total, err := s.repo.ListUserBets(ctx, userID, filters)
	if err != nil {
		return nil, err
	}
	result := make([]*models.Bet, 0, len(bets))
	for _, bet := range bets {
		result = append(result, outwardBet(bet))
	}
	return &models.ListBetsResponse{Data: result, Pagination: models.Pagination{Page: filters.Page, Limit: filters.Limit, Total: total}}, nil
}

func (s *bettingService) CashoutBet(ctx context.Context, authHeader string, actor models.AuthClaims, betID string, req *models.CashoutRequest) (*models.CashoutResponse, error) {
	if req == nil || req.CashoutPrice.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("%w: cashout_price must be positive", ErrInvalidInput)
	}
	bet, err := s.repo.GetBet(ctx, betID)
	if err != nil {
		return nil, err
	}
	if !canAccessBet(actor, bet.UserID) {
		return nil, ErrForbidden
	}
	offer, err := s.computeCashoutOffer(ctx, bet)
	if err != nil {
		return nil, err
	}
	if !offer.CashoutOffer.Equal(req.CashoutPrice.Round(2)) {
		return nil, ErrOddsChanged
	}
	reservationID, err := s.repo.GetReservationID(ctx, betID)
	if err != nil {
		return nil, err
	}
	if _, err := s.walletClient.ReleaseReservedFunds(ctx, authHeader, bet.UserID, &models.ReleaseReserveRequest{ReservationID: reservationID, Amount: bet.Stake}); err != nil {
		return nil, err
	}
	profit := req.CashoutPrice.Sub(bet.Stake).Round(2)
	switch {
	case profit.GreaterThan(decimal.Zero):
		if _, err := s.walletClient.CreateDeposit(ctx, authHeader, bet.UserID, &models.DepositRequest{Amount: profit, PaymentMethod: "bet_cashout", PaymentToken: betID, Currency: "USD"}); err != nil {
			if compensationErr := s.restoreReservation(ctx, authHeader, bet, betID, "cashout_payout_failed"); compensationErr != nil {
				return nil, fmt.Errorf("cashout payout failed: %w (reservation compensation failed: %v)", err, compensationErr)
			}
			return nil, err
		}
	case profit.LessThan(decimal.Zero):
		if _, err := s.walletClient.CreateWithdrawal(ctx, authHeader, bet.UserID, &models.WithdrawalRequest{Amount: profit.Abs(), BankAccountID: betID, Currency: "USD"}); err != nil {
			if compensationErr := s.restoreReservation(ctx, authHeader, bet, betID, "cashout_debit_failed"); compensationErr != nil {
				return nil, fmt.Errorf("cashout debit failed: %w (reservation compensation failed: %v)", err, compensationErr)
			}
			return nil, err
		}
	}
	updatedBet, err := s.repo.MarkCashedOut(ctx, betID, req.CashoutPrice.Round(2), time.Now().UTC())
	if err != nil {
		if compensationErr := s.rollbackCashout(ctx, authHeader, bet, profit, betID); compensationErr != nil {
			return nil, fmt.Errorf("mark cashout failed: %w (wallet compensation failed: %v)", err, compensationErr)
		}
		return nil, err
	}
	return &models.CashoutResponse{
		BetID:         betID,
		OriginalStake: bet.Stake,
		CashoutAmount: req.CashoutPrice.Round(2),
		Profit:        profit,
		Status:        outwardStatus(updatedBet.Status),
		CashedOutAt:   derefTime(updatedBet.SettledAt),
	}, nil
}

func (s *bettingService) rollbackCashout(ctx context.Context, authHeader string, bet *models.Bet, profit decimal.Decimal, betID string) error {
	switch {
	case profit.GreaterThan(decimal.Zero):
		if _, err := s.walletClient.CreateWithdrawal(ctx, authHeader, bet.UserID, &models.WithdrawalRequest{
			Amount:        profit,
			BankAccountID: betID + "-cashout-rollback",
			Currency:      "USD",
		}); err != nil {
			return err
		}
	case profit.LessThan(decimal.Zero):
		if _, err := s.walletClient.CreateDeposit(ctx, authHeader, bet.UserID, &models.DepositRequest{
			Amount:        profit.Abs(),
			PaymentMethod: "bet_cashout_reversal",
			PaymentToken:  betID,
			Currency:      "USD",
		}); err != nil {
			return err
		}
	}
	return s.restoreReservation(ctx, authHeader, bet, betID, "cashout_repo_failed")
}

func (s *bettingService) restoreReservation(ctx context.Context, authHeader string, bet *models.Bet, betID, reason string) error {
	reserved, err := s.walletClient.ReserveFunds(ctx, authHeader, bet.UserID, &models.ReserveFundsRequest{
		Amount:        bet.Stake,
		ReferenceID:   betID,
		ReferenceType: "bet",
	})
	if err != nil {
		return err
	}
	if err := s.repo.UpdateReservationID(ctx, betID, reserved.ReservationID, reason, time.Now().UTC()); err != nil {
		_, releaseErr := s.walletClient.ReleaseReservedFunds(ctx, authHeader, bet.UserID, &models.ReleaseReserveRequest{
			ReservationID: reserved.ReservationID,
			Amount:        bet.Stake,
		})
		if releaseErr != nil {
			return fmt.Errorf("update reservation id: %w (release restored reservation failed: %v)", err, releaseErr)
		}
		return err
	}
	return nil
}

func (s *bettingService) rollbackAdminSettlement(ctx context.Context, authHeader string, bet *models.Bet, result string, amount decimal.Decimal, betID string) error {
	switch strings.ToLower(strings.TrimSpace(result)) {
	case "won":
		if amount.GreaterThan(decimal.Zero) {
			if _, err := s.walletClient.CreateWithdrawal(ctx, authHeader, bet.UserID, &models.WithdrawalRequest{
				Amount:        amount,
				BankAccountID: betID + "-settlement-rollback",
				Currency:      "USD",
			}); err != nil {
				return err
			}
		}
	case "lost":
		if amount.GreaterThan(decimal.Zero) {
			if _, err := s.walletClient.CreateDeposit(ctx, authHeader, bet.UserID, &models.DepositRequest{
				Amount:        amount,
				PaymentMethod: "bet_settlement_reversal",
				PaymentToken:  betID,
				Currency:      "USD",
			}); err != nil {
				return err
			}
		}
	default:
		return fmt.Errorf("%w: unsupported settlement result %q", ErrInvalidInput, result)
	}
	return s.restoreReservation(ctx, authHeader, bet, betID, "admin_settle_repo_failed")
}

func (s *bettingService) GetCashoutOffer(ctx context.Context, actor models.AuthClaims, betID string) (*models.CashoutOfferResponse, error) {
	bet, err := s.repo.GetBet(ctx, betID)
	if err != nil {
		return nil, err
	}
	if !canAccessBet(actor, bet.UserID) {
		return nil, ErrForbidden
	}
	return s.computeCashoutOffer(ctx, bet)
}

func (s *bettingService) computeCashoutOffer(ctx context.Context, bet *models.Bet) (*models.CashoutOfferResponse, error) {
	if bet.Status != "pending" {
		return nil, fmt.Errorf("bet is not eligible for cashout")
	}
	currentOdds, err := s.currentOdds(ctx, bet)
	if err != nil {
		return nil, err
	}
	if currentOdds.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("current odds unavailable")
	}
	offer := bet.Stake.Mul(bet.Odds).Div(currentOdds).Round(2)
	if offer.GreaterThan(bet.PotentialPayout) {
		offer = bet.PotentialPayout
	}
	if offer.IsNegative() {
		offer = decimal.Zero
	}
	return &models.CashoutOfferResponse{
		BetID:        bet.BetID,
		CurrentStake: bet.Stake,
		CashoutOffer: offer,
		Profit:       offer.Sub(bet.Stake).Round(2),
		ValidUntil:   time.Now().UTC().Add(5 * time.Minute),
	}, nil
}

func (s *bettingService) currentOdds(ctx context.Context, bet *models.Bet) (decimal.Decimal, error) {
	if len(bet.Legs) == 0 {
		if bet.MarketID == nil || bet.OutcomeID == nil {
			return decimal.Zero, fmt.Errorf("market selection missing")
		}
		market, err := s.marketClient.GetMarket(ctx, *bet.MarketID)
		if err != nil {
			return decimal.Zero, err
		}
		for _, outcome := range market.Outcomes {
			if outcome.OutcomeID == *bet.OutcomeID {
				return outcome.Odds, nil
			}
		}
		return decimal.Zero, repository.ErrNotFound
	}
	totalOdds := decimal.NewFromInt(1)
	for _, leg := range bet.Legs {
		market, err := s.marketClient.GetMarket(ctx, leg.MarketID)
		if err != nil {
			return decimal.Zero, err
		}
		matched := false
		for _, outcome := range market.Outcomes {
			if outcome.OutcomeID == leg.OutcomeID {
				totalOdds = totalOdds.Mul(outcome.Odds)
				matched = true
				break
			}
		}
		if !matched {
			return decimal.Zero, repository.ErrNotFound
		}
	}
	return totalOdds.Round(4), nil
}

func (s *bettingService) acceptAdvancedQuote(ctx context.Context, authHeader string, actor models.AuthClaims, quoteID, userID, requestID string, idempotencyKey, reason *string, stake decimal.Decimal, quoteType string) (*models.AdvancedQuote, *models.Bet, error) {
	if stake.LessThanOrEqual(decimal.Zero) {
		return nil, nil, fmt.Errorf("%w: stake must be positive", ErrInvalidInput)
	}
	quote, err := s.repo.GetAdvancedQuote(ctx, quoteID)
	if err != nil {
		return nil, nil, err
	}
	if quote.QuoteType != quoteType {
		return nil, nil, repository.ErrNotFound
	}
	if !canAccessBet(actor, quote.UserID) || quote.UserID != userID {
		return nil, nil, ErrForbidden
	}
	if quote.Status == "accepted" && quote.AcceptedBetID != nil {
		if (quote.AcceptIdempotencyKey == nil && idempotencyKey == nil) || (quote.AcceptIdempotencyKey != nil && idempotencyKey != nil && *quote.AcceptIdempotencyKey == *idempotencyKey) {
			bet, err := s.repo.GetBet(ctx, *quote.AcceptedBetID)
			if err != nil {
				return nil, nil, err
			}
			return quote, bet, nil
		}
		return nil, nil, fmt.Errorf("%w: quote already accepted", ErrInvalidInput)
	}
	if quote.Status != "open" {
		return nil, nil, fmt.Errorf("%w: quote is not open", ErrInvalidInput)
	}
	if !quote.Combinable {
		return nil, nil, fmt.Errorf("%w: quote is not combinable", ErrInvalidInput)
	}
	if quote.ExpiresAt != nil && time.Now().UTC().After(*quote.ExpiresAt) {
		return nil, nil, fmt.Errorf("%w: quote expired", ErrInvalidInput)
	}
	legs := make([]repository.CreateParlayLegParams, 0, len(quote.Legs))
	totalOdds := decimal.NewFromInt(1)
	for _, leg := range quote.Legs {
		_, outcome, err := s.validateSingleSelection(ctx, leg.MarketID, leg.SelectionID, requestedOrCurrentOdds(leg.RequestedOdds, leg.CurrentOdds))
		if err != nil {
			return nil, nil, err
		}
		totalOdds = totalOdds.Mul(outcome.Odds)
		legs = append(legs, repository.CreateParlayLegParams{
			MarketID:  leg.MarketID,
			OutcomeID: leg.SelectionID,
			Odds:      outcome.Odds,
		})
	}
	reserveResponse, err := s.walletClient.ReserveFunds(ctx, authHeader, userID, &models.ReserveFundsRequest{
		Amount:        stake,
		ReferenceID:   quoteID,
		ReferenceType: quoteType,
	})
	if err != nil {
		return nil, nil, err
	}
	potentialPayout := stake.Mul(totalOdds).Round(2)
	bet, acceptedQuote, err := s.repo.AcceptAdvancedQuoteAsParlay(ctx, repository.AcceptAdvancedQuoteAsParlayParams{
		QuoteID:              quoteID,
		UserID:               userID,
		AcceptRequestID:      requestID,
		AcceptIdempotencyKey: idempotencyKey,
		Reason:               reason,
		Stake:                stake,
		TotalOdds:            totalOdds.Round(4),
		PotentialPayout:      potentialPayout,
		ReservationID:        reserveResponse.ReservationID,
		Legs:                 legs,
	})
	if err != nil {
		_, _ = s.walletClient.ReleaseReservedFunds(ctx, authHeader, userID, &models.ReleaseReserveRequest{
			ReservationID: reserveResponse.ReservationID,
			Amount:        stake,
		})
		return nil, nil, err
	}
	return acceptedQuote, bet, nil
}

func (s *bettingService) resolveQuoteLeg(ctx context.Context, marketID, selectionID string, requestedOdds *decimal.Decimal) (*models.ExternalMarket, *models.ExternalOutcome, decimal.Decimal, *string, error) {
	market, err := s.marketClient.GetMarket(ctx, marketID)
	if err != nil {
		return nil, nil, decimal.Zero, nil, err
	}
	for _, outcome := range market.Outcomes {
		if outcome.OutcomeID == selectionID {
			if market.Status != "open" {
				return market, &outcome, outcome.Odds, stringPointer("unableToOpenBet"), nil
			}
			if requestedOdds != nil && !requestedOdds.Equal(outcome.Odds) {
				return market, &outcome, outcome.Odds, stringPointer("oddsChanged"), nil
			}
			return market, &outcome, outcome.Odds, nil, nil
		}
	}
	return nil, nil, decimal.Zero, nil, repository.ErrNotFound
}

func (s *bettingService) validateGeolocation(ctx context.Context) error {
	if !isGeolocationEnforced(s.geolocationMode) {
		return nil
	}
	packet := strings.TrimSpace(middleware.GetGeolocationHeader(ctx))
	if packet == "" {
		return ErrGeolocationHeaderNotFound
	}
	if s.complianceClient == nil {
		return fmt.Errorf("%w: compliance client not configured", ErrGeoLocationService)
	}
	response, err := s.complianceClient.EvaluateGeoPacket(ctx, packet)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrGeoLocationService, err)
	}
	if response == nil || !strings.EqualFold(response.Result, "PASSED") {
		return ErrGeolocationNotAllowed
	}
	return nil
}

func mapBetBuilderQuote(quote *models.AdvancedQuote) *models.BetBuilderQuoteResponse {
	if quote == nil {
		return nil
	}
	legs := make([]models.BetBuilderQuoteLeg, 0, len(quote.Legs))
	for _, leg := range quote.Legs {
		legs = append(legs, models.BetBuilderQuoteLeg{
			MarketID:      leg.MarketID,
			SelectionID:   leg.SelectionID,
			FixtureID:     leg.FixtureID,
			RequestedOdds: leg.RequestedOdds,
			CurrentOdds:   leg.CurrentOdds,
		})
	}
	return &models.BetBuilderQuoteResponse{
		QuoteID:              quote.QuoteID,
		UserID:               quote.UserID,
		RequestID:            quote.RequestID,
		ComboType:            quote.ComboType,
		Combinable:           quote.Combinable,
		ReasonCode:           quote.ReasonCode,
		CombinedOdds:         quote.CombinedOdds,
		ImpliedProbability:   quote.ImpliedProbability,
		ExpiresAt:            quote.ExpiresAt,
		Legs:                 legs,
		Status:               quote.Status,
		CreatedAt:            quote.CreatedAt,
		UpdatedAt:            quote.UpdatedAt,
		AcceptedAt:           quote.AcceptedAt,
		AcceptedBetID:        quote.AcceptedBetID,
		AcceptRequestID:      quote.AcceptRequestID,
		AcceptIdempotencyKey: quote.AcceptIdempotencyKey,
		LastReason:           quote.LastReason,
	}
}

func mapFixedExoticQuote(quote *models.AdvancedQuote) *models.FixedExoticQuoteResponse {
	if quote == nil {
		return nil
	}
	legs := make([]models.FixedExoticQuoteLeg, 0, len(quote.Legs))
	for _, leg := range quote.Legs {
		position := 0
		if leg.Position != nil {
			position = *leg.Position
		}
		legs = append(legs, models.FixedExoticQuoteLeg{
			Position:      position,
			MarketID:      leg.MarketID,
			SelectionID:   leg.SelectionID,
			FixtureID:     leg.FixtureID,
			RequestedOdds: leg.RequestedOdds,
			CurrentOdds:   leg.CurrentOdds,
		})
	}
	exoticType := ""
	if quote.ExoticType != nil {
		exoticType = *quote.ExoticType
	}
	return &models.FixedExoticQuoteResponse{
		QuoteID:              quote.QuoteID,
		UserID:               quote.UserID,
		RequestID:            quote.RequestID,
		ExoticType:           exoticType,
		Combinable:           quote.Combinable,
		ReasonCode:           quote.ReasonCode,
		CombinedOdds:         quote.CombinedOdds,
		ImpliedProbability:   quote.ImpliedProbability,
		StakeCents:           quote.StakeCents,
		PotentialPayoutCents: quote.PotentialPayoutCents,
		EncodedTicket:        quote.EncodedTicket,
		ExpiresAt:            quote.ExpiresAt,
		Legs:                 legs,
		Status:               quote.Status,
		CreatedAt:            quote.CreatedAt,
		UpdatedAt:            quote.UpdatedAt,
		AcceptedAt:           quote.AcceptedAt,
		AcceptedBetID:        quote.AcceptedBetID,
		AcceptRequestID:      quote.AcceptRequestID,
		AcceptIdempotencyKey: quote.AcceptIdempotencyKey,
		LastReason:           quote.LastReason,
	}
}

func (s *bettingService) validateSingleSelection(ctx context.Context, marketID, outcomeID string, requestedOdds decimal.Decimal) (*models.ExternalMarket, *models.ExternalOutcome, error) {
	market, err := s.marketClient.GetMarket(ctx, marketID)
	if err != nil {
		return nil, nil, err
	}
	if market.Status != "open" {
		return nil, nil, fmt.Errorf("market is not open")
	}
	for _, outcome := range market.Outcomes {
		if outcome.OutcomeID == outcomeID {
			if !requestedOdds.Equal(outcome.Odds) {
				return nil, nil, ErrOddsChanged
			}
			return market, &outcome, nil
		}
	}
	return nil, nil, repository.ErrNotFound
}

func validatePlaceBet(actor models.AuthClaims, req *models.PlaceBetRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.UserID) == "" || strings.TrimSpace(req.MarketID) == "" || strings.TrimSpace(req.OutcomeID) == "" {
		return fmt.Errorf("%w: user_id, market_id, and outcome_id are required", ErrInvalidInput)
	}
	if req.Stake.LessThanOrEqual(decimal.Zero) || req.Odds.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("%w: stake and odds must be positive", ErrInvalidInput)
	}
	if !canAccessBet(actor, req.UserID) {
		return ErrForbidden
	}
	if req.FreebetAppliedCents != nil && *req.FreebetAppliedCents < 0 {
		return fmt.Errorf("%w: freebet_applied_cents must be non-negative", ErrInvalidInput)
	}
	return nil
}

func validatePlaceParlay(actor models.AuthClaims, req *models.PlaceParlayRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.UserID) == "" || len(req.Legs) < 2 {
		return fmt.Errorf("%w: user_id and at least two legs are required", ErrInvalidInput)
	}
	if req.Stake.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("%w: stake must be positive", ErrInvalidInput)
	}
	for _, leg := range req.Legs {
		if strings.TrimSpace(leg.MarketID) == "" || strings.TrimSpace(leg.OutcomeID) == "" || leg.Odds.LessThanOrEqual(decimal.Zero) {
			return fmt.Errorf("%w: every leg requires market_id, outcome_id, and positive odds", ErrInvalidInput)
		}
	}
	if !canAccessBet(actor, req.UserID) {
		return ErrForbidden
	}
	if req.FreebetAppliedCents != nil && *req.FreebetAppliedCents < 0 {
		return fmt.Errorf("%w: freebet_applied_cents must be non-negative", ErrInvalidInput)
	}
	return nil
}

func normalizePromoPlacement(freebetID *string, freebetAppliedCents *int64, oddsBoostID *string, stake decimal.Decimal) (*string, int64, *string, error) {
	normalizedFreebetID := emptyStringAsNil(trimmedPointerValue(freebetID))
	normalizedOddsBoostID := emptyStringAsNil(trimmedPointerValue(oddsBoostID))
	stakeCents := decimalToCents(stake)
	if normalizedFreebetID == nil {
		if freebetAppliedCents != nil && *freebetAppliedCents != 0 {
			return nil, 0, nil, fmt.Errorf("%w: freebet_applied_cents requires freebet_id", ErrInvalidInput)
		}
		return nil, 0, normalizedOddsBoostID, nil
	}
	if freebetAppliedCents == nil {
		return normalizedFreebetID, stakeCents, normalizedOddsBoostID, nil
	}
	if *freebetAppliedCents <= 0 {
		return nil, 0, nil, fmt.Errorf("%w: freebet_applied_cents must be positive when freebet_id is set", ErrInvalidInput)
	}
	if *freebetAppliedCents > stakeCents {
		return nil, 0, nil, fmt.Errorf("%w: freebet_applied_cents cannot exceed stake", ErrInvalidInput)
	}
	return normalizedFreebetID, *freebetAppliedCents, normalizedOddsBoostID, nil
}

func decimalToCents(amount decimal.Decimal) int64 {
	return amount.Mul(decimal.NewFromInt(100)).Round(0).IntPart()
}

func trimmedPointerValue(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func validateBetBuilderQuote(actor models.AuthClaims, req *models.BetBuilderQuoteRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.UserID) == "" || strings.TrimSpace(req.RequestID) == "" {
		return fmt.Errorf("%w: userId and requestId are required", ErrInvalidInput)
	}
	if len(req.Legs) < 2 {
		return fmt.Errorf("%w: at least two legs are required", ErrInvalidInput)
	}
	for _, leg := range req.Legs {
		if strings.TrimSpace(leg.MarketID) == "" || strings.TrimSpace(leg.SelectionID) == "" {
			return fmt.Errorf("%w: each leg requires marketId and selectionId", ErrInvalidInput)
		}
	}
	if !canAccessBet(actor, req.UserID) {
		return ErrForbidden
	}
	return nil
}

func validateBetBuilderAccept(actor models.AuthClaims, req *models.BetBuilderAcceptRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.QuoteID) == "" || strings.TrimSpace(req.UserID) == "" || strings.TrimSpace(req.RequestID) == "" {
		return fmt.Errorf("%w: quoteId, userId, and requestId are required", ErrInvalidInput)
	}
	if req.StakeCents <= 0 {
		return fmt.Errorf("%w: stakeCents must be positive", ErrInvalidInput)
	}
	if !canAccessBet(actor, req.UserID) {
		return ErrForbidden
	}
	return nil
}

func validateFixedExoticQuote(actor models.AuthClaims, req *models.FixedExoticQuoteRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.UserID) == "" || strings.TrimSpace(req.RequestID) == "" {
		return fmt.Errorf("%w: userId and requestId are required", ErrInvalidInput)
	}
	if req.ExoticType != "exacta" && req.ExoticType != "trifecta" {
		return fmt.Errorf("%w: unsupported exoticType", ErrInvalidInput)
	}
	expectedLegs := 2
	if req.ExoticType == "trifecta" {
		expectedLegs = 3
	}
	if len(req.Legs) != expectedLegs {
		return fmt.Errorf("%w: invalid exotic leg count", ErrInvalidInput)
	}
	for _, leg := range req.Legs {
		if leg.Position < 1 || strings.TrimSpace(leg.MarketID) == "" || strings.TrimSpace(leg.SelectionID) == "" || strings.TrimSpace(leg.FixtureID) == "" {
			return fmt.Errorf("%w: each fixed exotic leg requires position, marketId, selectionId, and fixtureId", ErrInvalidInput)
		}
	}
	if req.StakeCents != nil && *req.StakeCents <= 0 {
		return fmt.Errorf("%w: stakeCents must be positive when present", ErrInvalidInput)
	}
	if !canAccessBet(actor, req.UserID) {
		return ErrForbidden
	}
	return nil
}

func validateFixedExoticAccept(actor models.AuthClaims, req *models.FixedExoticAcceptRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.QuoteID) == "" || strings.TrimSpace(req.UserID) == "" || strings.TrimSpace(req.RequestID) == "" {
		return fmt.Errorf("%w: quoteId, userId, and requestId are required", ErrInvalidInput)
	}
	if req.StakeCents != nil && *req.StakeCents <= 0 {
		return fmt.Errorf("%w: stakeCents must be positive when present", ErrInvalidInput)
	}
	if !canAccessBet(actor, req.UserID) {
		return ErrForbidden
	}
	return nil
}

func validatePrecheckBets(actor models.AuthClaims, req *models.BetPrecheckRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.UserID) == "" {
		return fmt.Errorf("%w: user_id is required", ErrInvalidInput)
	}
	if len(req.Bets) == 0 {
		return fmt.Errorf("%w: at least one bet is required", ErrInvalidInput)
	}
	for _, bet := range req.Bets {
		if strings.TrimSpace(bet.MarketID) == "" || strings.TrimSpace(bet.OutcomeID) == "" || bet.Odds.LessThanOrEqual(decimal.Zero) {
			return fmt.Errorf("%w: each bet requires market_id, outcome_id, and positive odds", ErrInvalidInput)
		}
	}
	if !canAccessBet(actor, req.UserID) {
		return ErrForbidden
	}
	return nil
}

func validatePendingBetStatusRequest(req *models.PendingBetStatusRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if len(req.BetIDs) == 0 {
		return fmt.Errorf("%w: at least one bet id is required", ErrInvalidInput)
	}
	return nil
}

func canAccessBet(actor models.AuthClaims, userID string) bool {
	return actor.UserID == userID || actor.Role == "admin" || actor.Role == "internal"
}

func canAdminReadBets(role string) bool {
	switch role {
	case "admin", "operator", "trader":
		return true
	default:
		return false
	}
}

func isOpenBetLifecycleStatus(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "pending", "matched":
		return true
	default:
		return false
	}
}

func adminLifecycleReason(req *models.AdminBetLifecycleRequest) string {
	if req == nil {
		return ""
	}
	return strings.TrimSpace(req.Reason)
}

func adminResultSource(req *models.AdminBetLifecycleRequest) string {
	if req == nil {
		return "manual_ops"
	}
	resultSource := strings.TrimSpace(req.ResultSource)
	if resultSource == "" {
		return "manual_ops"
	}
	return resultSource
}

func resolveManualSettlementResult(bet *models.Bet, req *models.AdminBetLifecycleRequest) (string, error) {
	if req == nil {
		return "", fmt.Errorf("%w: winningSelectionId is required", ErrInvalidInput)
	}
	if bet == nil {
		return "", fmt.Errorf("%w: bet is required", ErrInvalidInput)
	}
	if len(bet.Legs) > 0 {
		return "", fmt.Errorf("%w: manual settlement only supports single bets", ErrInvalidInput)
	}
	winningSelectionID := strings.TrimSpace(req.WinningSelectionID)
	if winningSelectionID == "" {
		return "", fmt.Errorf("%w: winningSelectionId is required", ErrInvalidInput)
	}
	if bet.OutcomeID == nil || strings.TrimSpace(*bet.OutcomeID) == "" {
		return "", fmt.Errorf("%w: bet outcome is unavailable for settlement", ErrInvalidInput)
	}
	if strings.TrimSpace(*bet.OutcomeID) == winningSelectionID {
		return "won", nil
	}
	return "lost", nil
}

func isGeolocationEnforced(mode string) bool {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "required", "enforced", "strict":
		return true
	default:
		return false
	}
}

func appendPrecheckErrorCode(response *models.BetPrecheckResponse, code string) {
	for _, existing := range response.ErrorCodes {
		if existing == code {
			return
		}
	}
	response.ErrorCodes = append(response.ErrorCodes, code)
}

func cancelBetReason(req *models.CancelBetRequest) string {
	if req == nil {
		return ""
	}
	if reason := strings.TrimSpace(req.CancellationReason); reason != "" {
		return reason
	}
	return strings.TrimSpace(req.Reason)
}

func (s *bettingService) toTalonBet(ctx context.Context, bet *models.Bet, cache map[string]*models.BetLegContext) (models.TalonBet, error) {
	legs, err := s.buildTalonBetLegs(ctx, bet, cache)
	if err != nil {
		return models.TalonBet{}, err
	}
	profitLoss := talonProfitLoss(bet)
	item := models.TalonBet{
		BetID:         bet.BetID,
		TransactionID: bet.ReservationID,
		BetType:       talonBetType(bet),
		Stake:         talonMoney(bet.Stake),
		PlacedAt:      bet.PlacedAt,
		SettledAt:     bet.SettledAt,
		Odds:          decimalToFloat64(bet.Odds),
		DisplayOdds:   models.TalonDisplayOdds{Decimal: decimalToFloat64(bet.Odds)},
		Sports:        uniqueTalonSports(legs),
		Legs:          legs,
		Outcome:       talonBetOutcome(bet),
	}
	if bet.Status == "voided" || bet.Status == "cancelled" {
		item.CancelledAt = bet.SettledAt
	}
	if profitLoss != nil {
		item.ProfitLoss = profitLoss
	}
	return item, nil
}

func (s *bettingService) buildTalonBetLegs(ctx context.Context, bet *models.Bet, cache map[string]*models.BetLegContext) ([]models.TalonBetLeg, error) {
	sourceLegs := bet.Legs
	if len(sourceLegs) == 0 && bet.MarketID != nil && bet.OutcomeID != nil {
		sourceLegs = []models.BetLeg{{
			LegID:     bet.BetID,
			MarketID:  *bet.MarketID,
			OutcomeID: *bet.OutcomeID,
			Odds:      bet.Odds,
			Status:    bet.Status,
		}}
	}
	legs := make([]models.TalonBetLeg, 0, len(sourceLegs))
	for _, leg := range sourceLegs {
		contextRow, err := s.loadBetLegContext(ctx, leg.MarketID, leg.OutcomeID, cache)
		if err != nil {
			return nil, err
		}
		leagueID := strings.TrimSpace(contextRow.LeagueName)
		if leagueID == "" {
			leagueID = contextRow.EventID
		}
		outcomeName := firstNonEmpty(strings.TrimSpace(contextRow.OutcomeName), leg.OutcomeID)
		legItem := models.TalonBetLeg{
			ID: bet.BetID,
			Fixture: models.TalonFixture{
				ID:        contextRow.EventID,
				Name:      firstNonEmpty(strings.TrimSpace(contextRow.EventName), contextRow.EventID),
				StartTime: contextRow.EventStartAt,
			},
			Market: models.TalonIDName{
				ID:   contextRow.MarketID,
				Name: firstNonEmpty(strings.TrimSpace(contextRow.MarketName), contextRow.MarketID),
			},
			Selection: models.TalonIDName{
				ID:   firstNonEmpty(strings.TrimSpace(contextRow.OutcomeID), leg.OutcomeID),
				Name: outcomeName,
			},
			Sport: models.TalonIDName{
				ID:   normalizeTalonLookupID(contextRow.SportName),
				Name: firstNonEmpty(strings.TrimSpace(contextRow.SportName), "Unknown"),
			},
			Competitor: models.TalonIDName{
				ID:   firstNonEmpty(strings.TrimSpace(contextRow.OutcomeID), leg.OutcomeID),
				Name: outcomeName,
			},
			Tournament: models.TalonIDName{
				ID:   leagueID,
				Name: firstNonEmpty(strings.TrimSpace(contextRow.LeagueName), "Unknown"),
			},
			Odds:        decimalToFloat64(leg.Odds),
			DisplayOdds: models.TalonDisplayOdds{Decimal: decimalToFloat64(leg.Odds)},
			SettledAt:   bet.SettledAt,
			Outcome:     talonLegOutcome(leg.Status),
			Status:      talonLegStatus(leg.Status),
			EventTime:   &contextRow.EventStartAt,
		}
		legs = append(legs, legItem)
	}
	return legs, nil
}

func (s *bettingService) loadBetLegContext(ctx context.Context, marketID, outcomeID string, cache map[string]*models.BetLegContext) (*models.BetLegContext, error) {
	key := marketID + "|" + outcomeID
	if cached, ok := cache[key]; ok {
		return cached, nil
	}
	contextRow, err := s.repo.GetBetLegContext(ctx, marketID, outcomeID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			contextRow = &models.BetLegContext{
				MarketID:     marketID,
				MarketName:   marketID,
				OutcomeID:    outcomeID,
				OutcomeName:  outcomeID,
				EventID:      marketID,
				EventName:    marketID,
				SportName:    "Unknown",
				LeagueName:   "Unknown",
				EventStartAt: time.Now().UTC(),
			}
		} else {
			return nil, err
		}
	}
	cache[key] = contextRow
	return contextRow, nil
}

func mapBetStatusToPendingState(bet *models.Bet) (string, *string, bool) {
	switch strings.ToLower(strings.TrimSpace(bet.Status)) {
	case "pending":
		return "OPENED", nil, true
	case "won", "lost", "voided", "pushed", "cashed_out", "settled":
		return "SETTLED", nil, true
	case "cancelled":
		return "CANCELLED", nil, true
	case "failed":
		return "FAILED", nil, true
	default:
		return "", nil, false
	}
}

func calculateImpliedProbability(odds decimal.Decimal) *decimal.Decimal {
	if odds.LessThanOrEqual(decimal.Zero) {
		return nil
	}
	value := decimal.NewFromInt(1).Div(odds).Round(6)
	return &value
}

func decimalPointer(value decimal.Decimal) *decimal.Decimal {
	return &value
}

func stringPointer(value string) *string {
	return &value
}

func emptyStringAsNil(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func centsToDecimal(cents int64) decimal.Decimal {
	return decimal.NewFromInt(cents).Div(decimal.NewFromInt(100))
}

func requestedOrCurrentOdds(requested *decimal.Decimal, current decimal.Decimal) decimal.Decimal {
	if requested != nil {
		return *requested
	}
	return current
}

func encodeFixedExoticTicket(exoticType string, legs []models.FixedExoticQuoteLegRequest) string {
	parts := make([]string, 0, len(legs))
	for _, leg := range legs {
		parts = append(parts, fmt.Sprintf("%d=%s", leg.Position, leg.SelectionID))
	}
	return fmt.Sprintf("%s:%s", exoticType, strings.Join(parts, "|"))
}

func outwardBet(bet *models.Bet) *models.Bet {
	if bet == nil {
		return nil
	}
	copyBet := *bet
	if copyBet.BetType == "" {
		copyBet.BetType = "single"
	}
	if len(copyBet.Legs) > 0 {
		copyBet.BetType = "parlay"
		if copyBet.ParlayID == nil {
			parlayID := copyBet.BetID
			copyBet.ParlayID = &parlayID
		}
	}
	copyBet.Status = outwardStatus(copyBet.Status)
	if copyBet.Result != nil {
		result := outwardStatus(*copyBet.Result)
		copyBet.Result = &result
	}
	return &copyBet
}

func outwardStatus(status string) string {
	if status == "pending" {
		return "matched"
	}
	return status
}

func talonMoney(value decimal.Decimal) models.TalonMoney {
	return models.TalonMoney{Amount: decimalToFloat64(value), Currency: "USD"}
}

func talonBetType(bet *models.Bet) string {
	if bet == nil {
		return "single"
	}
	if len(bet.Legs) > 0 || strings.EqualFold(strings.TrimSpace(bet.BetType), "parlay") {
		return "multi"
	}
	return "single"
}

func talonLegStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "pending", "matched":
		return "OPEN"
	case "won", "lost", "settled", "cashed_out":
		return "SETTLED"
	case "voided":
		return "VOIDED"
	case "cancelled":
		return "CANCELLED"
	default:
		return "OPEN"
	}
}

func talonLegOutcome(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "won":
		return "WON"
	case "lost":
		return "LOST"
	case "cashed_out":
		return "CASHED_OUT"
	case "voided", "cancelled":
		return "CANCELLED"
	default:
		return ""
	}
}

func talonBetOutcome(bet *models.Bet) string {
	if bet == nil {
		return ""
	}
	if bet.Result != nil {
		return talonLegOutcome(*bet.Result)
	}
	return talonLegOutcome(bet.Status)
}

func talonProfitLoss(bet *models.Bet) *float64 {
	if bet == nil {
		return nil
	}
	var value float64
	switch strings.ToLower(strings.TrimSpace(bet.Status)) {
	case "won":
		profit := bet.PotentialPayout.Sub(bet.Stake)
		value = decimalToFloat64(profit)
	case "lost":
		value = -decimalToFloat64(bet.Stake)
	case "cashed_out":
		if bet.CashoutAmount == nil {
			return nil
		}
		profit := bet.CashoutAmount.Sub(bet.Stake)
		value = decimalToFloat64(profit)
	case "voided", "cancelled":
		value = 0
	default:
		return nil
	}
	return &value
}

func uniqueTalonSports(legs []models.TalonBetLeg) []models.TalonIDName {
	seen := make(map[string]struct{})
	sports := make([]models.TalonIDName, 0, len(legs))
	for _, leg := range legs {
		if _, ok := seen[leg.Sport.ID]; ok {
			continue
		}
		seen[leg.Sport.ID] = struct{}{}
		sports = append(sports, leg.Sport)
	}
	return sports
}

func normalizeTalonLookupID(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, " ", "-")
	if normalized == "" {
		return "unknown"
	}
	return normalized
}

func derefTime(value *time.Time) time.Time {
	if value == nil {
		return time.Now().UTC()
	}
	return *value
}

func decimalToFloat64(value decimal.Decimal) float64 {
	result, _ := value.Float64()
	return result
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
