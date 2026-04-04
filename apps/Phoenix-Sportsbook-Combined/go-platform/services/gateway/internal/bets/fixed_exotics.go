package bets

import (
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/wallet"
)

var (
	ErrInvalidFixedExoticRequest  = errors.New("invalid fixed exotic request")
	ErrUnsupportedFixedExoticType = errors.New("unsupported fixed exotic type")
	ErrFixedExoticFixtureMismatch = errors.New("fixed exotic legs must belong to the same fixture")
	ErrFixedExoticDuplicateMarket = errors.New("fixed exotic legs must target distinct markets")
	ErrFixedExoticQuoteNotFound   = errors.New("fixed exotic quote not found")
	ErrFixedExoticQuoteExpired    = errors.New("fixed exotic quote expired")
	ErrFixedExoticQuoteConflict   = errors.New("fixed exotic quote state conflict")
)

const (
	fixedExoticTypeExacta             = "exacta"
	fixedExoticTypeTrifecta           = "trifecta"
	defaultFixedExoticQuoteTTLSeconds = int64(45)
	defaultFixedExoticTicketDelimiter = ">"
	defaultFixedExoticTypeSeparator   = ":"
	defaultFixedExoticOddsPrecision   = 4
	defaultFixedExoticValuePrecision  = 6

	fixedExoticQuoteStatusOpen     = "open"
	fixedExoticQuoteStatusAccepted = "accepted"
	fixedExoticQuoteStatusExpired  = "expired"

	actionFixedExoticQuoteExpired = "fixed_exotic.quote.expired"
)

type FixedExoticQuoteRequest struct {
	UserID     string
	RequestID  string
	ExoticType string
	StakeCents int64
	Legs       []FixedExoticLegRequest
}

type FixedExoticLegRequest struct {
	Position      int
	MarketID      string
	SelectionID   string
	RequestedOdds float64
}

type FixedExoticAcceptRequest struct {
	QuoteID        string
	UserID         string
	RequestID      string
	StakeCents     int64
	IdempotencyKey string
	Reason         string
	ActorID        string
}

type FixedExoticQuote struct {
	QuoteID              string                `json:"quoteId"`
	UserID               string                `json:"userId"`
	RequestID            string                `json:"requestId"`
	ExoticType           string                `json:"exoticType"`
	Combinable           bool                  `json:"combinable"`
	ReasonCode           string                `json:"reasonCode,omitempty"`
	CombinedOdds         float64               `json:"combinedOdds,omitempty"`
	ImpliedProbability   float64               `json:"impliedProbability,omitempty"`
	StakeCents           int64                 `json:"stakeCents,omitempty"`
	PotentialPayoutCents int64                 `json:"potentialPayoutCents,omitempty"`
	EncodedTicket        string                `json:"encodedTicket,omitempty"`
	ExpiresAt            string                `json:"expiresAt,omitempty"`
	Legs                 []FixedExoticQuoteLeg `json:"legs"`
	Status               string                `json:"status,omitempty"`
	CreatedAt            string                `json:"createdAt,omitempty"`
	UpdatedAt            string                `json:"updatedAt,omitempty"`
	AcceptedAt           string                `json:"acceptedAt,omitempty"`
	LastReason           string                `json:"lastReason,omitempty"`
	AcceptedBetID        string                `json:"acceptedBetId,omitempty"`
	AcceptRequestID      string                `json:"acceptRequestId,omitempty"`
	AcceptIdempotencyKey string                `json:"acceptIdempotencyKey,omitempty"`
}

type FixedExoticQuoteLeg struct {
	Position      int     `json:"position"`
	MarketID      string  `json:"marketId"`
	SelectionID   string  `json:"selectionId"`
	FixtureID     string  `json:"fixtureId"`
	RequestedOdds float64 `json:"requestedOdds,omitempty"`
	CurrentOdds   float64 `json:"currentOdds"`
}

type fixedExoticQuoteDraft struct {
	request            FixedExoticQuoteRequest
	legs               []FixedExoticQuoteLeg
	combinedOdds       float64
	impliedProbability float64
	encodedTicket      string
	potentialPayout    int64
}

func (s *Service) QuoteFixedExotic(request FixedExoticQuoteRequest) (FixedExoticQuote, error) {
	draft, err := s.prepareFixedExoticQuoteDraft(request)
	if err != nil {
		return FixedExoticQuote{}, err
	}

	now := s.now().UTC()
	ttlSeconds := parseInt64Env("FIXED_EXOTIC_QUOTE_TTL_SECONDS", defaultFixedExoticQuoteTTLSeconds)
	if ttlSeconds <= 0 {
		ttlSeconds = defaultFixedExoticQuoteTTLSeconds
	}
	indexKey := fixedExoticQuoteKey(draft.request.UserID, draft.request.RequestID)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureFixedExoticQuoteStateLocked()

	if existing, found := s.fixedExoticQuotesByKey[indexKey]; found {
		if s.expireFixedExoticQuoteIfNeededLocked(existing) {
			existing = s.fixedExoticQuotesByID[existing.QuoteID]
		}
		if sameFixedExoticQuoteRequest(existing, draft) {
			return existing, nil
		}
		return FixedExoticQuote{}, ErrIdempotencyReplay
	}

	s.fixedExoticQuoteSequence++
	quote := FixedExoticQuote{
		QuoteID:              fmt.Sprintf("feq:local:%06d", s.fixedExoticQuoteSequence),
		UserID:               draft.request.UserID,
		RequestID:            draft.request.RequestID,
		ExoticType:           draft.request.ExoticType,
		Combinable:           true,
		CombinedOdds:         draft.combinedOdds,
		ImpliedProbability:   draft.impliedProbability,
		StakeCents:           draft.request.StakeCents,
		PotentialPayoutCents: draft.potentialPayout,
		EncodedTicket:        draft.encodedTicket,
		ExpiresAt:            now.Add(time.Duration(ttlSeconds) * time.Second).Format(time.RFC3339),
		Legs:                 draft.legs,
		Status:               fixedExoticQuoteStatusOpen,
		CreatedAt:            now.Format(time.RFC3339),
		UpdatedAt:            now.Format(time.RFC3339),
	}

	s.fixedExoticQuotesByID[quote.QuoteID] = quote
	s.fixedExoticQuotesByKey[indexKey] = quote
	if err := s.saveToDiskLocked(); err != nil {
		return FixedExoticQuote{}, err
	}
	return quote, nil
}

func (s *Service) GetFixedExoticQuote(quoteID string) (FixedExoticQuote, error) {
	id := strings.TrimSpace(quoteID)
	if id == "" {
		return FixedExoticQuote{}, ErrInvalidFixedExoticRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureFixedExoticQuoteStateLocked()

	quote, found := s.fixedExoticQuotesByID[id]
	if !found {
		return FixedExoticQuote{}, ErrFixedExoticQuoteNotFound
	}
	if s.expireFixedExoticQuoteIfNeededLocked(quote) {
		quote = s.fixedExoticQuotesByID[id]
	}
	return quote, nil
}

func (s *Service) ListFixedExoticQuotes(userID string, status string, limit int) []FixedExoticQuote {
	userID = strings.TrimSpace(userID)
	status = strings.TrimSpace(strings.ToLower(status))
	if limit <= 0 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureFixedExoticQuoteStateLocked()

	items := make([]FixedExoticQuote, 0, len(s.fixedExoticQuotesByID))
	for _, quote := range s.fixedExoticQuotesByID {
		if s.expireFixedExoticQuoteIfNeededLocked(quote) {
			quote = s.fixedExoticQuotesByID[quote.QuoteID]
		}
		if userID != "" && !strings.EqualFold(quote.UserID, userID) {
			continue
		}
		if status != "" && !strings.EqualFold(quote.Status, status) {
			continue
		}
		items = append(items, quote)
	}

	sort.SliceStable(items, func(i int, j int) bool {
		left := strings.TrimSpace(items[i].UpdatedAt)
		if left == "" {
			left = strings.TrimSpace(items[i].CreatedAt)
		}
		right := strings.TrimSpace(items[j].UpdatedAt)
		if right == "" {
			right = strings.TrimSpace(items[j].CreatedAt)
		}
		if left == right {
			return items[i].QuoteID > items[j].QuoteID
		}
		return left > right
	})

	if len(items) > limit {
		items = append([]FixedExoticQuote{}, items[:limit]...)
	}
	return items
}

func (s *Service) AdminExpireFixedExoticQuote(quoteID string, reason string, actorID string) (FixedExoticQuote, error) {
	quoteID = strings.TrimSpace(quoteID)
	reason = strings.TrimSpace(reason)
	actorID = strings.TrimSpace(actorID)
	if quoteID == "" {
		return FixedExoticQuote{}, ErrInvalidFixedExoticRequest
	}
	if actorID == "" {
		actorID = "admin"
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureFixedExoticQuoteStateLocked()

	quote, found := s.fixedExoticQuotesByID[quoteID]
	if !found {
		return FixedExoticQuote{}, ErrFixedExoticQuoteNotFound
	}
	if s.expireFixedExoticQuoteIfNeededLocked(quote) {
		quote = s.fixedExoticQuotesByID[quoteID]
	}
	if quote.Status == fixedExoticQuoteStatusAccepted {
		return quote, ErrFixedExoticQuoteConflict
	}
	if quote.Status == fixedExoticQuoteStatusExpired {
		return quote, nil
	}
	if quote.Status != fixedExoticQuoteStatusOpen {
		return quote, ErrFixedExoticQuoteConflict
	}

	now := s.now().UTC().Format(time.RFC3339)
	finalReason := settlementReasonOrDefault(reason, "admin_expired")
	quote.Status = fixedExoticQuoteStatusExpired
	quote.UpdatedAt = now
	quote.LastReason = finalReason + " by " + actorID
	s.fixedExoticQuotesByID[quote.QuoteID] = quote
	s.fixedExoticQuotesByKey[fixedExoticQuoteKey(quote.UserID, quote.RequestID)] = quote
	if err := s.saveToDiskLocked(); err != nil {
		return FixedExoticQuote{}, err
	}
	s.recordFixedExoticQuoteEventLocked(
		actionFixedExoticQuoteExpired,
		quote,
		actorID,
		fmt.Sprintf(
			"manualExpire=true reason=%s quoteId=%s exoticType=%s status=%s",
			finalReason,
			quote.QuoteID,
			quote.ExoticType,
			quote.Status,
		),
	)
	return quote, nil
}

func (s *Service) AcceptFixedExoticQuote(request FixedExoticAcceptRequest) (Bet, FixedExoticQuote, error) {
	request.QuoteID = strings.TrimSpace(request.QuoteID)
	request.UserID = strings.TrimSpace(request.UserID)
	request.RequestID = strings.TrimSpace(request.RequestID)
	request.IdempotencyKey = strings.TrimSpace(request.IdempotencyKey)
	request.Reason = strings.TrimSpace(request.Reason)
	request.ActorID = strings.TrimSpace(request.ActorID)
	if request.IdempotencyKey == "" {
		request.IdempotencyKey = "fixed-exotic-accept:" + request.QuoteID
	}

	if request.QuoteID == "" || request.UserID == "" || request.RequestID == "" {
		return Bet{}, FixedExoticQuote{}, ErrInvalidFixedExoticRequest
	}

	idempotencyIndex := fmt.Sprintf("%s:%s", request.UserID, request.IdempotencyKey)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureFixedExoticQuoteStateLocked()

	quote, found := s.fixedExoticQuotesByID[request.QuoteID]
	if !found || quote.UserID != request.UserID {
		return Bet{}, FixedExoticQuote{}, ErrFixedExoticQuoteNotFound
	}
	if s.expireFixedExoticQuoteIfNeededLocked(quote) {
		quote = s.fixedExoticQuotesByID[request.QuoteID]
		return Bet{}, quote, ErrFixedExoticQuoteExpired
	}

	effectiveStake := request.StakeCents
	if effectiveStake <= 0 {
		effectiveStake = quote.StakeCents
	}
	if effectiveStake <= 0 {
		return Bet{}, quote, ErrInvalidFixedExoticRequest
	}
	if effectiveStake < s.minStakeCents || effectiveStake > s.maxStakeCents {
		return Bet{}, quote, ErrStakeOutOfRange
	}

	if quote.Status == fixedExoticQuoteStatusAccepted {
		acceptedBetID := strings.TrimSpace(quote.AcceptedBetID)
		if acceptedBetID == "" {
			return Bet{}, FixedExoticQuote{}, ErrFixedExoticQuoteConflict
		}
		bet, err := s.getPlacedBetForAcceptLocked(acceptedBetID)
		if err != nil {
			return Bet{}, FixedExoticQuote{}, err
		}
		return bet, quote, nil
	}
	if quote.Status != fixedExoticQuoteStatusOpen {
		return Bet{}, FixedExoticQuote{}, ErrFixedExoticQuoteConflict
	}

	if existing, found, err := s.findExistingBuilderAcceptBetLocked(request.UserID, request.IdempotencyKey, idempotencyIndex); err != nil {
		return Bet{}, FixedExoticQuote{}, err
	} else if found {
		quote = s.markFixedExoticQuoteAcceptedLocked(quote, existing.BetID, request)
		quote.StakeCents = effectiveStake
		quote.PotentialPayoutCents = int64(math.Round(float64(effectiveStake) * quote.CombinedOdds))
		s.fixedExoticQuotesByID[quote.QuoteID] = quote
		s.fixedExoticQuotesByKey[fixedExoticQuoteKey(quote.UserID, quote.RequestID)] = quote
		if err := s.saveToDiskLocked(); err != nil {
			return Bet{}, FixedExoticQuote{}, err
		}
		return existing, quote, nil
	}

	walletEntry, err := s.wallet.Debit(wallet.MutationRequest{
		UserID:         request.UserID,
		AmountCents:    effectiveStake,
		IdempotencyKey: "bet:" + request.IdempotencyKey,
		Reason:         "fixed exotic placement " + request.QuoteID,
	})
	if err != nil {
		if errors.Is(err, wallet.ErrIdempotencyConflict) {
			if existing, found, lookupErr := s.findExistingBuilderAcceptBetLocked(request.UserID, request.IdempotencyKey, idempotencyIndex); lookupErr == nil && found {
				quote = s.markFixedExoticQuoteAcceptedLocked(quote, existing.BetID, request)
				quote.StakeCents = effectiveStake
				quote.PotentialPayoutCents = int64(math.Round(float64(effectiveStake) * quote.CombinedOdds))
				s.fixedExoticQuotesByID[quote.QuoteID] = quote
				s.fixedExoticQuotesByKey[fixedExoticQuoteKey(quote.UserID, quote.RequestID)] = quote
				_ = s.saveToDiskLocked()
				return existing, quote, nil
			}
		}
		return Bet{}, FixedExoticQuote{}, err
	}

	now := s.now().UTC()
	betID := fmt.Sprintf("b:db:%d", now.UnixNano())
	if s.db == nil {
		s.sequence++
		betID = fmt.Sprintf("b:local:%06d", s.sequence)
	}

	bet := buildPlacedFixedExotic(betID, request, quote, effectiveStake, walletEntry, now)
	if err := s.persistAcceptedFixedExoticBetLocked(bet, quote); err != nil {
		if existing, found, lookupErr := s.findExistingBuilderAcceptBetLocked(request.UserID, request.IdempotencyKey, idempotencyIndex); lookupErr == nil && found {
			quote = s.markFixedExoticQuoteAcceptedLocked(quote, existing.BetID, request)
			quote.StakeCents = effectiveStake
			quote.PotentialPayoutCents = int64(math.Round(float64(effectiveStake) * quote.CombinedOdds))
			s.fixedExoticQuotesByID[quote.QuoteID] = quote
			s.fixedExoticQuotesByKey[fixedExoticQuoteKey(quote.UserID, quote.RequestID)] = quote
			_ = s.saveToDiskLocked()
			return existing, quote, nil
		}
		return Bet{}, FixedExoticQuote{}, err
	}

	quote = s.markFixedExoticQuoteAcceptedLocked(quote, bet.BetID, request)
	quote.StakeCents = effectiveStake
	quote.PotentialPayoutCents = int64(math.Round(float64(effectiveStake) * quote.CombinedOdds))
	s.fixedExoticQuotesByID[quote.QuoteID] = quote
	s.fixedExoticQuotesByKey[fixedExoticQuoteKey(quote.UserID, quote.RequestID)] = quote
	if err := s.saveToDiskLocked(); err != nil {
		return Bet{}, FixedExoticQuote{}, err
	}
	return bet, quote, nil
}

func (s *Service) prepareFixedExoticQuoteDraft(request FixedExoticQuoteRequest) (fixedExoticQuoteDraft, error) {
	request.UserID = strings.TrimSpace(request.UserID)
	request.RequestID = strings.TrimSpace(request.RequestID)
	request.ExoticType = normalizeFixedExoticType(request.ExoticType)

	requiredLegCount, ok := fixedExoticRequiredLegs(request.ExoticType)
	if !ok {
		return fixedExoticQuoteDraft{}, ErrUnsupportedFixedExoticType
	}
	if request.UserID == "" || request.RequestID == "" || len(request.Legs) != requiredLegCount || request.StakeCents < 0 {
		return fixedExoticQuoteDraft{}, ErrInvalidFixedExoticRequest
	}
	if request.StakeCents > 0 && (request.StakeCents < s.minStakeCents || request.StakeCents > s.maxStakeCents) {
		return fixedExoticQuoteDraft{}, ErrStakeOutOfRange
	}

	seenPositions := map[int]struct{}{}
	seenMarkets := map[string]struct{}{}
	orderedSelections := make([]string, requiredLegCount)
	referenceFixtureID := ""
	combinedOdds := 1.0
	quoteLegs := make([]FixedExoticQuoteLeg, 0, len(request.Legs))

	for idx, leg := range request.Legs {
		leg.MarketID = strings.TrimSpace(leg.MarketID)
		leg.SelectionID = strings.TrimSpace(leg.SelectionID)
		if leg.MarketID == "" || leg.SelectionID == "" || leg.RequestedOdds < 0 {
			return fixedExoticQuoteDraft{}, ErrInvalidFixedExoticRequest
		}

		position := leg.Position
		if position == 0 {
			position = idx + 1
		}
		if position < 1 || position > requiredLegCount {
			return fixedExoticQuoteDraft{}, ErrInvalidFixedExoticRequest
		}
		if _, exists := seenPositions[position]; exists {
			return fixedExoticQuoteDraft{}, ErrInvalidFixedExoticRequest
		}
		seenPositions[position] = struct{}{}

		marketKey := strings.ToLower(leg.MarketID)
		if _, exists := seenMarkets[marketKey]; exists {
			return fixedExoticQuoteDraft{}, ErrFixedExoticDuplicateMarket
		}
		seenMarkets[marketKey] = struct{}{}

		market, err := s.repository.GetMarketByID(leg.MarketID)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return fixedExoticQuoteDraft{}, ErrMarketNotFound
			}
			return fixedExoticQuoteDraft{}, err
		}
		if !strings.EqualFold(market.Status, "open") {
			return fixedExoticQuoteDraft{}, ErrMarketNotOpen
		}

		selection, found := findSelection(market.Selections, leg.SelectionID)
		if !found || !selection.Active {
			return fixedExoticQuoteDraft{}, ErrSelectionNotFound
		}
		if selection.Odds <= 1 || !oddsPrecisionValid(selection.Odds) {
			return fixedExoticQuoteDraft{}, ErrOddsOutOfRange
		}
		if selection.Odds < s.minOdds || selection.Odds > s.maxOdds {
			return fixedExoticQuoteDraft{}, ErrOddsOutOfRange
		}
		if leg.RequestedOdds > 0 && !sameOdds(leg.RequestedOdds, selection.Odds) {
			return fixedExoticQuoteDraft{}, ErrOddsChanged
		}

		fixtureID := strings.TrimSpace(market.FixtureID)
		if referenceFixtureID == "" {
			referenceFixtureID = fixtureID
		} else if !strings.EqualFold(referenceFixtureID, fixtureID) {
			return fixedExoticQuoteDraft{}, ErrFixedExoticFixtureMismatch
		}

		combinedOdds *= selection.Odds
		orderedSelections[position-1] = leg.SelectionID
		quoteLegs = append(quoteLegs, FixedExoticQuoteLeg{
			Position:      position,
			MarketID:      leg.MarketID,
			SelectionID:   leg.SelectionID,
			FixtureID:     fixtureID,
			RequestedOdds: leg.RequestedOdds,
			CurrentOdds:   selection.Odds,
		})
	}

	for _, selectionID := range orderedSelections {
		if strings.TrimSpace(selectionID) == "" {
			return fixedExoticQuoteDraft{}, ErrInvalidFixedExoticRequest
		}
	}

	combinedOdds = roundBuilderValue(combinedOdds, defaultFixedExoticOddsPrecision)
	impliedProbability := 0.0
	if combinedOdds > 0 {
		impliedProbability = roundBuilderValue(1/combinedOdds, defaultFixedExoticValuePrecision)
	}

	potentialPayout := int64(0)
	if request.StakeCents > 0 {
		potentialPayout = int64(math.Round(float64(request.StakeCents) * combinedOdds))
	}

	return fixedExoticQuoteDraft{
		request:            request,
		legs:               quoteLegs,
		combinedOdds:       combinedOdds,
		impliedProbability: impliedProbability,
		encodedTicket:      buildFixedExoticTicket(request.ExoticType, orderedSelections),
		potentialPayout:    potentialPayout,
	}, nil
}

func (s *Service) ensureFixedExoticQuoteStateLocked() {
	if s.fixedExoticQuotesByID == nil {
		s.fixedExoticQuotesByID = map[string]FixedExoticQuote{}
	}
	if s.fixedExoticQuotesByKey == nil {
		s.fixedExoticQuotesByKey = map[string]FixedExoticQuote{}
	}
}

func (s *Service) expireFixedExoticQuoteIfNeededLocked(quote FixedExoticQuote) bool {
	if quote.Status != fixedExoticQuoteStatusOpen {
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

	quote.Status = fixedExoticQuoteStatusExpired
	quote.UpdatedAt = now.Format(time.RFC3339)
	quote.LastReason = "expired"
	s.fixedExoticQuotesByID[quote.QuoteID] = quote
	s.fixedExoticQuotesByKey[fixedExoticQuoteKey(quote.UserID, quote.RequestID)] = quote
	_ = s.saveToDiskLocked()
	return true
}

func (s *Service) markFixedExoticQuoteAcceptedLocked(quote FixedExoticQuote, betID string, request FixedExoticAcceptRequest) FixedExoticQuote {
	now := s.now().UTC().Format(time.RFC3339)
	quote.Status = fixedExoticQuoteStatusAccepted
	quote.AcceptedBetID = betID
	quote.AcceptRequestID = request.RequestID
	quote.AcceptIdempotencyKey = request.IdempotencyKey
	quote.LastReason = settlementReasonOrDefault(request.Reason, quote.LastReason)
	if quote.AcceptedAt == "" {
		quote.AcceptedAt = now
	}
	quote.UpdatedAt = now
	return quote
}

func (s *Service) persistAcceptedFixedExoticBetLocked(bet Bet, quote FixedExoticQuote) error {
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
			Details:    fmt.Sprintf("fixedExotic=true exoticType=%s requestId=%s ticket=%s stakeCents=%d odds=%.4f", quote.ExoticType, bet.RequestID, quote.EncodedTicket, bet.StakeCents, bet.Odds),
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
		Details:    fmt.Sprintf("fixedExotic=true exoticType=%s requestId=%s ticket=%s stakeCents=%d odds=%.4f", quote.ExoticType, bet.RequestID, quote.EncodedTicket, bet.StakeCents, bet.Odds),
		OccurredAt: now,
	})
	return nil
}

func buildPlacedFixedExotic(
	betID string,
	request FixedExoticAcceptRequest,
	quote FixedExoticQuote,
	stakeCents int64,
	walletEntry wallet.LedgerEntry,
	now time.Time,
) Bet {
	marketID := "fe:quote:" + quote.QuoteID
	if len(quote.Legs) > 0 {
		if fixtureID := strings.TrimSpace(quote.Legs[0].FixtureID); fixtureID != "" {
			marketID = "fe:fixture:" + fixtureID + ":" + quote.ExoticType
		}
	}

	selectionID := "fe:ticket:" + quote.EncodedTicket
	legs := make([]BetLeg, 0, len(quote.Legs))
	for _, leg := range quote.Legs {
		legs = append(legs, BetLeg{
			LineID:        fmt.Sprintf("position-%d", leg.Position),
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
		StakeCents:           stakeCents,
		RequestedOdds:        quote.CombinedOdds,
		CurrentOdds:          quote.CombinedOdds,
		Odds:                 quote.CombinedOdds,
		OddsChangePolicy:     oddsPolicyAcceptRequested,
		OddsChanged:          false,
		PotentialPayoutCents: int64(math.Round(float64(stakeCents) * quote.CombinedOdds)),
		Status:               statusPlaced,
		WalletLedgerEntryID:  walletEntry.EntryID,
		WalletBalanceCents:   walletEntry.BalanceCents,
		IdempotencyKey:       request.IdempotencyKey,
		PlacedAt:             now.UTC().Format(time.RFC3339),
	}
}

func sameFixedExoticQuoteRequest(existing FixedExoticQuote, draft fixedExoticQuoteDraft) bool {
	if existing.UserID != draft.request.UserID ||
		existing.RequestID != draft.request.RequestID ||
		normalizeFixedExoticType(existing.ExoticType) != normalizeFixedExoticType(draft.request.ExoticType) ||
		!sameOdds(existing.CombinedOdds, draft.combinedOdds) ||
		existing.StakeCents != draft.request.StakeCents ||
		existing.EncodedTicket != draft.encodedTicket ||
		existing.PotentialPayoutCents != draft.potentialPayout ||
		len(existing.Legs) != len(draft.legs) {
		return false
	}

	for index := range draft.legs {
		left := existing.Legs[index]
		right := draft.legs[index]
		if left.Position != right.Position ||
			left.MarketID != right.MarketID ||
			left.SelectionID != right.SelectionID ||
			left.FixtureID != right.FixtureID ||
			!sameOdds(left.RequestedOdds, right.RequestedOdds) ||
			!sameOdds(left.CurrentOdds, right.CurrentOdds) {
			return false
		}
	}
	return true
}

func normalizeFixedExoticType(raw string) string {
	value := strings.TrimSpace(strings.ToLower(raw))
	value = strings.ReplaceAll(value, "-", "_")
	value = strings.ReplaceAll(value, " ", "_")
	return value
}

func fixedExoticRequiredLegs(exoticType string) (int, bool) {
	switch normalizeFixedExoticType(exoticType) {
	case fixedExoticTypeExacta:
		return 2, true
	case fixedExoticTypeTrifecta:
		return 3, true
	default:
		return 0, false
	}
}

func buildFixedExoticTicket(exoticType string, selectionIDs []string) string {
	return normalizeFixedExoticType(exoticType) +
		defaultFixedExoticTypeSeparator +
		strings.Join(selectionIDs, defaultFixedExoticTicketDelimiter)
}

func fixedExoticQuoteKey(userID string, requestID string) string {
	return strings.TrimSpace(userID) + ":" + strings.TrimSpace(requestID)
}

func (s *Service) recordFixedExoticQuoteEventLocked(action string, quote FixedExoticQuote, actorID string, details string) {
	event := BetEvent{
		ID:         fmt.Sprintf("be:db:%d", s.now().UTC().UnixNano()),
		BetID:      quote.QuoteID,
		UserID:     quote.UserID,
		Action:     action,
		ActorID:    fallbackActor(actorID, "admin"),
		Status:     quote.Status,
		Details:    details,
		OccurredAt: s.now().UTC().Format(time.RFC3339),
	}

	if s.db != nil {
		s.recordEventDBBestEffort(event)
		return
	}

	event.ID = s.nextMemoryEventIDLocked()
	s.recordEventLocked(event)
}
