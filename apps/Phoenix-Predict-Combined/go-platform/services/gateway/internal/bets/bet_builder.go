package bets

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/wallet"
)

var (
	ErrInvalidBetBuilderRequest     = errors.New("invalid bet builder request")
	ErrBetBuilderNotCombinable      = errors.New("bet builder legs are not combinable")
	ErrSameGameComboFixtureMismatch = errors.New("same game combo legs must belong to the same fixture")
	ErrSameGameComboDuplicateMarket = errors.New("same game combo legs must target distinct markets")
	ErrBetBuilderQuoteNotFound      = errors.New("bet builder quote not found")
	ErrBetBuilderQuoteExpired       = errors.New("bet builder quote expired")
	ErrBetBuilderQuoteConflict      = errors.New("bet builder quote state conflict")
)

const (
	defaultBuilderQuoteTTLSeconds int64 = 30
	defaultBuilderOddsPrecision         = 4
	defaultBuilderProbPrecision         = 6
	betBuilderComboTypeSameGame         = "same_game_combo"

	betBuilderQuoteStatusOpen     = "open"
	betBuilderQuoteStatusAccepted = "accepted"
	betBuilderQuoteStatusExpired  = "expired"
)

type BetBuilderQuoteRequest struct {
	UserID    string
	RequestID string
	Legs      []BetBuilderLegRequest
}

type BetBuilderLegRequest struct {
	MarketID      string
	SelectionID   string
	RequestedOdds float64
}

type BetBuilderAcceptRequest struct {
	QuoteID        string
	UserID         string
	RequestID      string
	StakeCents     int64
	IdempotencyKey string
	Reason         string
	ActorID        string
}

type BetBuilderQuote struct {
	QuoteID              string               `json:"quoteId"`
	UserID               string               `json:"userId"`
	RequestID            string               `json:"requestId"`
	ComboType            string               `json:"comboType,omitempty"`
	Combinable           bool                 `json:"combinable"`
	ReasonCode           string               `json:"reasonCode,omitempty"`
	CombinedOdds         float64              `json:"combinedOdds,omitempty"`
	ImpliedProbability   float64              `json:"impliedProbability,omitempty"`
	ExpiresAt            string               `json:"expiresAt,omitempty"`
	Legs                 []BetBuilderQuoteLeg `json:"legs"`
	Status               string               `json:"status,omitempty"`
	CreatedAt            string               `json:"createdAt,omitempty"`
	UpdatedAt            string               `json:"updatedAt,omitempty"`
	AcceptedAt           string               `json:"acceptedAt,omitempty"`
	LastReason           string               `json:"lastReason,omitempty"`
	AcceptedBetID        string               `json:"acceptedBetId,omitempty"`
	AcceptRequestID      string               `json:"acceptRequestId,omitempty"`
	AcceptIdempotencyKey string               `json:"acceptIdempotencyKey,omitempty"`
}

type BetBuilderQuoteLeg struct {
	MarketID      string  `json:"marketId"`
	SelectionID   string  `json:"selectionId"`
	FixtureID     string  `json:"fixtureId"`
	RequestedOdds float64 `json:"requestedOdds,omitempty"`
	CurrentOdds   float64 `json:"currentOdds"`
}

func (s *Service) QuoteBetBuilder(request BetBuilderQuoteRequest) (BetBuilderQuote, error) {
	request.UserID = strings.TrimSpace(request.UserID)
	request.RequestID = strings.TrimSpace(request.RequestID)
	if request.UserID == "" || request.RequestID == "" || len(request.Legs) < 2 {
		return BetBuilderQuote{}, ErrInvalidBetBuilderRequest
	}

	seenLegs := map[string]struct{}{}
	seenMarkets := map[string]struct{}{}
	quoteLegs := make([]BetBuilderQuoteLeg, 0, len(request.Legs))
	combinedOdds := 1.0
	referenceFixtureID := ""

	for _, leg := range request.Legs {
		leg.MarketID = strings.TrimSpace(leg.MarketID)
		leg.SelectionID = strings.TrimSpace(leg.SelectionID)
		if leg.MarketID == "" || leg.SelectionID == "" {
			return BetBuilderQuote{}, ErrInvalidBetBuilderRequest
		}
		if leg.RequestedOdds < 0 {
			return BetBuilderQuote{}, ErrInvalidBetBuilderRequest
		}

		legKey := strings.ToLower(fmt.Sprintf("%s:%s", leg.MarketID, leg.SelectionID))
		if _, exists := seenLegs[legKey]; exists {
			return BetBuilderQuote{}, ErrSameGameComboDuplicateMarket
		}
		seenLegs[legKey] = struct{}{}
		marketKey := strings.ToLower(leg.MarketID)
		if _, exists := seenMarkets[marketKey]; exists {
			return BetBuilderQuote{}, ErrSameGameComboDuplicateMarket
		}
		seenMarkets[marketKey] = struct{}{}

		market, err := s.repository.GetMarketByID(leg.MarketID)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return BetBuilderQuote{}, ErrMarketNotFound
			}
			return BetBuilderQuote{}, err
		}
		if !strings.EqualFold(market.Status, "open") {
			return BetBuilderQuote{}, ErrMarketNotOpen
		}

		selection, ok := findSelection(market.Selections, leg.SelectionID)
		if !ok || !selection.Active {
			return BetBuilderQuote{}, ErrSelectionNotFound
		}
		if selection.Odds <= 1 || !oddsPrecisionValid(selection.Odds) {
			return BetBuilderQuote{}, ErrOddsOutOfRange
		}
		if selection.Odds < s.minOdds || selection.Odds > s.maxOdds {
			return BetBuilderQuote{}, ErrOddsOutOfRange
		}

		fixtureID := strings.TrimSpace(market.FixtureID)
		if referenceFixtureID == "" {
			referenceFixtureID = fixtureID
		} else if !strings.EqualFold(referenceFixtureID, fixtureID) {
			return BetBuilderQuote{}, ErrSameGameComboFixtureMismatch
		}

		if leg.RequestedOdds > 0 && !sameOdds(leg.RequestedOdds, selection.Odds) {
			return BetBuilderQuote{}, ErrOddsChanged
		}

		combinedOdds *= selection.Odds
		quoteLegs = append(quoteLegs, BetBuilderQuoteLeg{
			MarketID:      leg.MarketID,
			SelectionID:   leg.SelectionID,
			FixtureID:     fixtureID,
			RequestedOdds: leg.RequestedOdds,
			CurrentOdds:   selection.Odds,
		})
	}

	combinedOdds = roundBuilderValue(combinedOdds, defaultBuilderOddsPrecision)
	impliedProbability := 0.0
	if combinedOdds > 0 {
		impliedProbability = roundBuilderValue(1/combinedOdds, defaultBuilderProbPrecision)
	}

	now := s.now().UTC()
	ttlSeconds := parseInt64Env("BET_BUILDER_QUOTE_TTL_SECONDS", defaultBuilderQuoteTTLSeconds)
	if ttlSeconds <= 0 {
		ttlSeconds = defaultBuilderQuoteTTLSeconds
	}
	indexKey := betBuilderQuoteKey(request.UserID, request.RequestID)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureBetBuilderQuoteStateLocked()

	if existing, found := s.builderQuotesByKey[indexKey]; found {
		if s.expireBetBuilderQuoteIfNeededLocked(existing) {
			existing = s.builderQuotesByID[existing.QuoteID]
		}
		if sameBetBuilderQuoteRequest(existing, request, quoteLegs, combinedOdds) {
			return existing, nil
		}
		return BetBuilderQuote{}, ErrIdempotencyReplay
	}

	s.builderQuoteSequence++
	quote := BetBuilderQuote{
		QuoteID:            fmt.Sprintf("bbq:local:%06d", s.builderQuoteSequence),
		UserID:             request.UserID,
		RequestID:          request.RequestID,
		ComboType:          betBuilderComboTypeSameGame,
		Combinable:         true,
		CombinedOdds:       combinedOdds,
		ImpliedProbability: impliedProbability,
		ExpiresAt:          now.Add(time.Duration(ttlSeconds) * time.Second).Format(time.RFC3339),
		Legs:               quoteLegs,
		Status:             betBuilderQuoteStatusOpen,
		CreatedAt:          now.Format(time.RFC3339),
		UpdatedAt:          now.Format(time.RFC3339),
	}

	s.builderQuotesByID[quote.QuoteID] = quote
	s.builderQuotesByKey[indexKey] = quote
	if err := s.saveToDiskLocked(); err != nil {
		return BetBuilderQuote{}, err
	}
	return quote, nil
}

func (s *Service) GetBetBuilderQuote(quoteID string) (BetBuilderQuote, error) {
	id := strings.TrimSpace(quoteID)
	if id == "" {
		return BetBuilderQuote{}, ErrInvalidBetBuilderRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureBetBuilderQuoteStateLocked()

	quote, found := s.builderQuotesByID[id]
	if !found {
		return BetBuilderQuote{}, ErrBetBuilderQuoteNotFound
	}
	if s.expireBetBuilderQuoteIfNeededLocked(quote) {
		quote = s.builderQuotesByID[id]
	}
	return quote, nil
}

func (s *Service) AcceptBetBuilderQuote(request BetBuilderAcceptRequest) (Bet, BetBuilderQuote, error) {
	request.QuoteID = strings.TrimSpace(request.QuoteID)
	request.UserID = strings.TrimSpace(request.UserID)
	request.RequestID = strings.TrimSpace(request.RequestID)
	request.IdempotencyKey = strings.TrimSpace(request.IdempotencyKey)
	request.Reason = strings.TrimSpace(request.Reason)
	request.ActorID = strings.TrimSpace(request.ActorID)

	if request.QuoteID == "" || request.UserID == "" || request.RequestID == "" || request.StakeCents <= 0 {
		return Bet{}, BetBuilderQuote{}, ErrInvalidBetBuilderRequest
	}
	if request.StakeCents < s.minStakeCents || request.StakeCents > s.maxStakeCents {
		return Bet{}, BetBuilderQuote{}, ErrStakeOutOfRange
	}
	if request.IdempotencyKey == "" {
		request.IdempotencyKey = "builder-accept:" + request.QuoteID
	}

	idempotencyIndex := fmt.Sprintf("%s:%s", request.UserID, request.IdempotencyKey)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureBetBuilderQuoteStateLocked()

	quote, found := s.builderQuotesByID[request.QuoteID]
	if !found || quote.UserID != request.UserID {
		return Bet{}, BetBuilderQuote{}, ErrBetBuilderQuoteNotFound
	}
	if s.expireBetBuilderQuoteIfNeededLocked(quote) {
		quote = s.builderQuotesByID[request.QuoteID]
		return Bet{}, quote, ErrBetBuilderQuoteExpired
	}

	if quote.Status == betBuilderQuoteStatusAccepted {
		acceptedBetID := strings.TrimSpace(quote.AcceptedBetID)
		if acceptedBetID == "" {
			return Bet{}, BetBuilderQuote{}, ErrBetBuilderQuoteConflict
		}
		bet, err := s.getPlacedBetForAcceptLocked(acceptedBetID)
		if err != nil {
			return Bet{}, BetBuilderQuote{}, err
		}
		return bet, quote, nil
	}
	if quote.Status != betBuilderQuoteStatusOpen {
		return Bet{}, BetBuilderQuote{}, ErrBetBuilderQuoteConflict
	}

	if existing, found, err := s.findExistingBuilderAcceptBetLocked(request.UserID, request.IdempotencyKey, idempotencyIndex); err != nil {
		return Bet{}, BetBuilderQuote{}, err
	} else if found {
		quote = s.markBetBuilderQuoteAcceptedLocked(quote, existing.BetID, request)
		if err := s.saveToDiskLocked(); err != nil {
			return Bet{}, BetBuilderQuote{}, err
		}
		return existing, quote, nil
	}

	walletEntry, err := s.wallet.Debit(wallet.MutationRequest{
		UserID:         request.UserID,
		AmountCents:    request.StakeCents,
		IdempotencyKey: "bet:" + request.IdempotencyKey,
		Reason:         "bet builder placement " + request.QuoteID,
	})
	if err != nil {
		if errors.Is(err, wallet.ErrIdempotencyConflict) {
			if existing, found, lookupErr := s.findExistingBuilderAcceptBetLocked(request.UserID, request.IdempotencyKey, idempotencyIndex); lookupErr == nil && found {
				quote = s.markBetBuilderQuoteAcceptedLocked(quote, existing.BetID, request)
				_ = s.saveToDiskLocked()
				return existing, quote, nil
			}
		}
		return Bet{}, BetBuilderQuote{}, err
	}

	now := s.now().UTC()
	betID := fmt.Sprintf("b:db:%d", now.UnixNano())
	if s.db == nil {
		s.sequence++
		betID = fmt.Sprintf("b:local:%06d", s.sequence)
	}

	bet := buildPlacedBetBuilder(betID, request, quote, walletEntry, now)
	if err := s.persistAcceptedBuilderBetLocked(bet); err != nil {
		if existing, found, lookupErr := s.findExistingBuilderAcceptBetLocked(request.UserID, request.IdempotencyKey, idempotencyIndex); lookupErr == nil && found {
			quote = s.markBetBuilderQuoteAcceptedLocked(quote, existing.BetID, request)
			_ = s.saveToDiskLocked()
			return existing, quote, nil
		}
		return Bet{}, BetBuilderQuote{}, err
	}

	quote = s.markBetBuilderQuoteAcceptedLocked(quote, bet.BetID, request)
	if err := s.saveToDiskLocked(); err != nil {
		return Bet{}, BetBuilderQuote{}, err
	}
	return bet, quote, nil
}

func (s *Service) ensureBetBuilderQuoteStateLocked() {
	if s.builderQuotesByID == nil {
		s.builderQuotesByID = map[string]BetBuilderQuote{}
	}
	if s.builderQuotesByKey == nil {
		s.builderQuotesByKey = map[string]BetBuilderQuote{}
	}
}

func (s *Service) expireBetBuilderQuoteIfNeededLocked(quote BetBuilderQuote) bool {
	if quote.Status != betBuilderQuoteStatusOpen {
		return false
	}

	expiresAt, err := time.Parse(time.RFC3339, quote.ExpiresAt)
	if err != nil {
		expiresAt = s.now().UTC()
	}
	now := s.now().UTC()
	if expiresAt.After(now) {
		return false
	}

	quote.Status = betBuilderQuoteStatusExpired
	quote.UpdatedAt = now.Format(time.RFC3339)
	quote.LastReason = "expired"
	s.builderQuotesByID[quote.QuoteID] = quote
	s.builderQuotesByKey[betBuilderQuoteKey(quote.UserID, quote.RequestID)] = quote
	_ = s.saveToDiskLocked()
	return true
}

func (s *Service) persistAcceptedBuilderBetLocked(bet Bet) error {
	now := s.now().UTC().Format(time.RFC3339)
	if s.db != nil {
		if err := s.insertBetDB(bet); err != nil {
			return err
		}
		s.recordEventDBBestEffort(BetEvent{
			ID:         fmt.Sprintf("be:db:%d", s.now().UTC().UnixNano()),
			BetID:      bet.BetID,
			UserID:     bet.UserID,
			Action:     actionBetPlaced,
			ActorID:    fallbackActor("", bet.UserID),
			Status:     bet.Status,
			Details:    fmt.Sprintf("betBuilder=true requestId=%s marketId=%s selectionId=%s stakeCents=%d odds=%.4f", bet.RequestID, bet.MarketID, bet.SelectionID, bet.StakeCents, bet.Odds),
			OccurredAt: now,
		})
		return nil
	}

	s.betsByID[bet.BetID] = bet
	s.betsByIdempotent[fmt.Sprintf("%s:%s", bet.UserID, bet.IdempotencyKey)] = bet
	s.recordEventLocked(BetEvent{
		ID:         s.nextMemoryEventIDLocked(),
		BetID:      bet.BetID,
		UserID:     bet.UserID,
		Action:     actionBetPlaced,
		ActorID:    fallbackActor("", bet.UserID),
		Status:     bet.Status,
		Details:    fmt.Sprintf("betBuilder=true requestId=%s marketId=%s selectionId=%s stakeCents=%d odds=%.4f", bet.RequestID, bet.MarketID, bet.SelectionID, bet.StakeCents, bet.Odds),
		OccurredAt: now,
	})
	return nil
}

func (s *Service) findExistingBuilderAcceptBetLocked(userID string, idempotencyKey string, localIndex string) (Bet, bool, error) {
	if s.db != nil {
		return s.getBetByUserIdempotencyDB(userID, idempotencyKey)
	}
	existing, found := s.betsByIdempotent[localIndex]
	return existing, found, nil
}

func (s *Service) getPlacedBetForAcceptLocked(betID string) (Bet, error) {
	if s.db != nil {
		return s.getBetByIDDB(betID)
	}
	bet, found := s.betsByID[betID]
	if !found {
		return Bet{}, domain.ErrNotFound
	}
	return bet, nil
}

func (s *Service) markBetBuilderQuoteAcceptedLocked(quote BetBuilderQuote, betID string, request BetBuilderAcceptRequest) BetBuilderQuote {
	now := s.now().UTC().Format(time.RFC3339)
	quote.Status = betBuilderQuoteStatusAccepted
	quote.AcceptedBetID = betID
	quote.AcceptRequestID = request.RequestID
	quote.AcceptIdempotencyKey = request.IdempotencyKey
	quote.LastReason = settlementReasonOrDefault(request.Reason, quote.LastReason)
	if quote.AcceptedAt == "" {
		quote.AcceptedAt = now
	}
	quote.UpdatedAt = now
	s.builderQuotesByID[quote.QuoteID] = quote
	s.builderQuotesByKey[betBuilderQuoteKey(quote.UserID, quote.RequestID)] = quote
	return quote
}

func buildPlacedBetBuilder(
	betID string,
	request BetBuilderAcceptRequest,
	quote BetBuilderQuote,
	walletEntry wallet.LedgerEntry,
	now time.Time,
) Bet {
	marketID := "bb:quote:" + quote.QuoteID
	if len(quote.Legs) > 0 {
		if fixtureID := strings.TrimSpace(quote.Legs[0].FixtureID); fixtureID != "" {
			marketID = "bb:fixture:" + fixtureID
		}
	}
	selectionID := "bb:combo:" + quote.QuoteID
	legs := make([]BetLeg, 0, len(quote.Legs))
	for _, leg := range quote.Legs {
		legs = append(legs, BetLeg{
			MarketID:      leg.MarketID,
			SelectionID:   leg.SelectionID,
			FixtureID:     leg.FixtureID,
			RequestedOdds: leg.RequestedOdds,
			CurrentOdds:   leg.CurrentOdds,
			FinalOdds:     leg.CurrentOdds,
		})
	}

	return Bet{
		BetID:                betID,
		UserID:               request.UserID,
		RequestID:            request.RequestID,
		MarketID:             marketID,
		SelectionID:          selectionID,
		Legs:                 legs,
		StakeCents:           request.StakeCents,
		RequestedOdds:        quote.CombinedOdds,
		CurrentOdds:          quote.CombinedOdds,
		Odds:                 quote.CombinedOdds,
		OddsChangePolicy:     oddsPolicyAcceptRequested,
		OddsChanged:          false,
		PotentialPayoutCents: int64(math.Round(float64(request.StakeCents) * quote.CombinedOdds)),
		Status:               statusPlaced,
		WalletLedgerEntryID:  walletEntry.EntryID,
		WalletBalanceCents:   walletEntry.BalanceCents,
		IdempotencyKey:       request.IdempotencyKey,
		PlacedAt:             now.UTC().Format(time.RFC3339),
	}
}

func sameBetBuilderQuoteRequest(existing BetBuilderQuote, request BetBuilderQuoteRequest, legs []BetBuilderQuoteLeg, combinedOdds float64) bool {
	if existing.UserID != request.UserID || existing.RequestID != request.RequestID {
		return false
	}
	if !sameOdds(existing.CombinedOdds, combinedOdds) {
		return false
	}
	if len(existing.Legs) != len(legs) {
		return false
	}
	for index := range legs {
		left := existing.Legs[index]
		right := legs[index]
		if left.MarketID != right.MarketID ||
			left.SelectionID != right.SelectionID ||
			!sameOdds(left.RequestedOdds, right.RequestedOdds) ||
			!sameOdds(left.CurrentOdds, right.CurrentOdds) {
			return false
		}
	}
	return true
}

func betBuilderQuoteKey(userID string, requestID string) string {
	return strings.TrimSpace(userID) + ":" + strings.TrimSpace(requestID)
}

func roundBuilderValue(value float64, decimals int) float64 {
	factor := math.Pow(10, float64(decimals))
	if factor <= 0 {
		return value
	}
	return math.Round(value*factor) / factor
}
