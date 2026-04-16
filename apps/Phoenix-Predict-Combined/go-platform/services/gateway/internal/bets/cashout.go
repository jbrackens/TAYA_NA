package bets

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/wallet"
)

var (
	ErrInvalidCashoutRequest = errors.New("invalid cashout request")
	ErrCashoutNotEligible    = errors.New("bet is not eligible for cashout")
	ErrCashoutQuoteNotFound  = errors.New("cashout quote not found")
	ErrCashoutQuoteExpired   = errors.New("cashout quote expired")
	ErrCashoutQuoteConflict  = errors.New("cashout quote state conflict")
	ErrCashoutQuoteStale     = errors.New("cashout quote stale")
)

const (
	cashoutQuoteStatusOpen     = "open"
	cashoutQuoteStatusAccepted = "accepted"
	cashoutQuoteStatusExpired  = "expired"

	defaultCashoutQuoteTTLSeconds int64 = 10
)

type CashoutQuoteRequest struct {
	BetID               string
	UserID              string
	RequestID           string
	ProviderAmountCents int64
	ProviderRevision    int64
	ProviderSource      string
	ProviderExpiresAt   time.Time
}

type CashoutAcceptRequest struct {
	BetID         string
	UserID        string
	QuoteID       string
	RequestID     string
	QuoteRevision int64
	Reason        string
	ActorID       string
}

type CashoutQuote struct {
	QuoteID     string `json:"quoteId"`
	BetID       string `json:"betId"`
	UserID      string `json:"userId"`
	RequestID   string `json:"requestId"`
	AmountCents int64  `json:"amountCents"`
	Revision    int64  `json:"revision"`
	Source      string `json:"source,omitempty"`
	Currency    string `json:"currency"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
	ExpiresAt   string `json:"expiresAt"`
	AcceptedAt  string `json:"acceptedAt,omitempty"`
	LastReason  string `json:"lastReason,omitempty"`
}

func (s *Service) QuoteCashout(request CashoutQuoteRequest) (CashoutQuote, error) {
	request.BetID = strings.TrimSpace(request.BetID)
	request.UserID = strings.TrimSpace(request.UserID)
	request.RequestID = strings.TrimSpace(request.RequestID)
	request.ProviderSource = strings.TrimSpace(request.ProviderSource)
	if request.BetID == "" || request.UserID == "" || request.RequestID == "" {
		return CashoutQuote{}, ErrInvalidCashoutRequest
	}

	bet, err := s.GetByID(request.BetID)
	if err != nil {
		return CashoutQuote{}, err
	}
	if bet.UserID != request.UserID || bet.Status != statusPlaced {
		return CashoutQuote{}, ErrCashoutNotEligible
	}

	quoteAmount := calculateCashoutAmount(bet)
	quoteSource := "local_heuristic"
	if request.ProviderAmountCents > 0 {
		quoteAmount = request.ProviderAmountCents
		quoteSource = request.ProviderSource
		if quoteSource == "" {
			quoteSource = "provider_stream"
		}
	}
	now := s.now().UTC()
	ttl := parseInt64Env("BET_CASHOUT_QUOTE_TTL_SECONDS", defaultCashoutQuoteTTLSeconds)
	if ttl <= 0 {
		ttl = defaultCashoutQuoteTTLSeconds
	}
	expiresAt := now.Add(time.Duration(ttl) * time.Second)
	if !request.ProviderExpiresAt.IsZero() {
		expiresAt = request.ProviderExpiresAt.UTC()
	}
	key := cashoutQuoteKey(request.UserID, request.RequestID)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureCashoutQuoteStateLocked()

	if existing, found := s.quotesByKey[key]; found {
		if existing.BetID == request.BetID && existing.UserID == request.UserID {
			return existing, nil
		}
		return CashoutQuote{}, ErrIdempotencyReplay
	}

	currentRevision := s.quoteLatestRevisionByBet[request.BetID]
	quoteRevision := currentRevision + 1
	if request.ProviderRevision > 0 {
		if request.ProviderRevision <= currentRevision {
			s.cashoutMetrics.StaleRejects++
			return CashoutQuote{}, ErrCashoutQuoteStale
		}
		quoteRevision = request.ProviderRevision
	}

	s.quoteSequence++
	quote := CashoutQuote{
		QuoteID:     fmt.Sprintf("cq:local:%06d", s.quoteSequence),
		BetID:       request.BetID,
		UserID:      request.UserID,
		RequestID:   request.RequestID,
		AmountCents: quoteAmount,
		Revision:    quoteRevision,
		Source:      quoteSource,
		Currency:    "USD",
		Status:      cashoutQuoteStatusOpen,
		CreatedAt:   now.Format(time.RFC3339),
		UpdatedAt:   now.Format(time.RFC3339),
		ExpiresAt:   expiresAt.Format(time.RFC3339),
	}
	s.quotesByID[quote.QuoteID] = quote
	s.quotesByKey[key] = quote
	s.quoteLatestRevisionByBet[request.BetID] = quoteRevision
	s.cashoutMetrics.QuotesCreated++
	if err := s.saveToDiskLocked(); err != nil {
		return CashoutQuote{}, err
	}
	return quote, nil
}

func (s *Service) AcceptCashout(request CashoutAcceptRequest) (Bet, CashoutQuote, error) {
	request.BetID = strings.TrimSpace(request.BetID)
	request.UserID = strings.TrimSpace(request.UserID)
	request.QuoteID = strings.TrimSpace(request.QuoteID)
	request.RequestID = strings.TrimSpace(request.RequestID)
	request.Reason = strings.TrimSpace(request.Reason)
	if request.BetID == "" || request.UserID == "" || request.QuoteID == "" || request.RequestID == "" {
		return Bet{}, CashoutQuote{}, ErrInvalidCashoutRequest
	}

	if s.db != nil {
		return s.acceptCashoutDB(request)
	}
	return s.acceptCashoutMemory(request)
}

func (s *Service) GetCashoutQuote(quoteID string) (CashoutQuote, error) {
	id := strings.TrimSpace(quoteID)
	if id == "" {
		return CashoutQuote{}, ErrInvalidCashoutRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureCashoutQuoteStateLocked()

	quote, found := s.quotesByID[id]
	if !found {
		return CashoutQuote{}, ErrCashoutQuoteNotFound
	}
	if s.expireCashoutQuoteIfNeededLocked(quote) {
		quote = s.quotesByID[id]
	}
	return quote, nil
}

func (s *Service) acceptCashoutMemory(request CashoutAcceptRequest) (Bet, CashoutQuote, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureCashoutQuoteStateLocked()

	quote, found := s.quotesByID[request.QuoteID]
	if !found || quote.BetID != request.BetID || quote.UserID != request.UserID {
		return Bet{}, CashoutQuote{}, ErrCashoutQuoteNotFound
	}
	if s.expireCashoutQuoteIfNeededLocked(quote) {
		return Bet{}, CashoutQuote{}, ErrCashoutQuoteExpired
	}
	if request.QuoteRevision > 0 && request.QuoteRevision != quote.Revision {
		s.cashoutMetrics.StaleRejects++
		return Bet{}, CashoutQuote{}, ErrCashoutQuoteStale
	}
	if latest := s.quoteLatestRevisionByBet[request.BetID]; latest > 0 && quote.Revision != latest {
		s.cashoutMetrics.StaleRejects++
		return Bet{}, CashoutQuote{}, ErrCashoutQuoteStale
	}
	if quote.Status == cashoutQuoteStatusAccepted {
		bet, found := s.betsByID[request.BetID]
		if !found {
			return Bet{}, CashoutQuote{}, domain.ErrNotFound
		}
		return bet, quote, nil
	}
	if quote.Status != cashoutQuoteStatusOpen {
		s.cashoutMetrics.QuoteStateConflicts++
		return Bet{}, CashoutQuote{}, ErrCashoutQuoteConflict
	}

	bet, found := s.betsByID[request.BetID]
	if !found {
		return Bet{}, CashoutQuote{}, domain.ErrNotFound
	}
	if bet.UserID != request.UserID || bet.Status != statusPlaced {
		return Bet{}, CashoutQuote{}, ErrCashoutNotEligible
	}

	entry, err := s.wallet.Credit(wallet.MutationRequest{
		UserID:         bet.UserID,
		AmountCents:    quote.AmountCents,
		IdempotencyKey: "cashout:" + bet.BetID,
		Reason:         settlementReasonOrDefault(request.Reason, "bet cashout"),
	})
	if err != nil {
		return Bet{}, CashoutQuote{}, err
	}

	now := s.now().UTC().Format(time.RFC3339)
	bet.Status = statusCashedOut
	bet.SettledAt = now
	bet.SettlementOutcome = "cashed_out"
	bet.SettlementReference = quote.QuoteID
	bet.SettlementLedgerEntryID = entry.EntryID
	bet.WalletBalanceCents = entry.BalanceCents

	quote.Status = cashoutQuoteStatusAccepted
	quote.AcceptedAt = now
	quote.UpdatedAt = now
	quote.LastReason = request.Reason

	s.betsByID[bet.BetID] = bet
	if index := fmt.Sprintf("%s:%s", bet.UserID, bet.IdempotencyKey); index != ":" {
		s.betsByIdempotent[index] = bet
	}
	s.quotesByID[quote.QuoteID] = quote
	s.quotesByKey[cashoutQuoteKey(quote.UserID, quote.RequestID)] = quote
	s.cashoutMetrics.QuotesAccepted++
	s.recordEventLocked(BetEvent{
		ID:         s.nextMemoryEventIDLocked(),
		BetID:      bet.BetID,
		UserID:     bet.UserID,
		Action:     actionBetCashedOut,
		ActorID:    fallbackActor(request.ActorID, bet.UserID),
		Status:     bet.Status,
		Reason:     normalizeReasonCode(request.Reason, "cashout_accepted"),
		Details:    fmt.Sprintf("quoteId=%s revision=%d amountCents=%d source=%s", quote.QuoteID, quote.Revision, quote.AmountCents, quote.Source),
		OccurredAt: now,
	})

	if err := s.saveToDiskLocked(); err != nil {
		return Bet{}, CashoutQuote{}, err
	}

	return bet, quote, nil
}

func (s *Service) acceptCashoutDB(request CashoutAcceptRequest) (Bet, CashoutQuote, error) {
	s.mu.Lock()
	s.ensureCashoutQuoteStateLocked()
	quote, found := s.quotesByID[request.QuoteID]
	if !found || quote.BetID != request.BetID || quote.UserID != request.UserID {
		s.mu.Unlock()
		return Bet{}, CashoutQuote{}, ErrCashoutQuoteNotFound
	}
	if s.expireCashoutQuoteIfNeededLocked(quote) {
		s.mu.Unlock()
		return Bet{}, CashoutQuote{}, ErrCashoutQuoteExpired
	}
	if request.QuoteRevision > 0 && request.QuoteRevision != quote.Revision {
		s.cashoutMetrics.StaleRejects++
		s.mu.Unlock()
		return Bet{}, CashoutQuote{}, ErrCashoutQuoteStale
	}
	if latest := s.quoteLatestRevisionByBet[request.BetID]; latest > 0 && quote.Revision != latest {
		s.cashoutMetrics.StaleRejects++
		s.mu.Unlock()
		return Bet{}, CashoutQuote{}, ErrCashoutQuoteStale
	}
	if quote.Status == cashoutQuoteStatusAccepted {
		s.mu.Unlock()
		bet, err := s.getBetByIDDB(request.BetID)
		return bet, quote, err
	}
	if quote.Status != cashoutQuoteStatusOpen {
		s.cashoutMetrics.QuoteStateConflicts++
		s.mu.Unlock()
		return Bet{}, CashoutQuote{}, ErrCashoutQuoteConflict
	}
	s.mu.Unlock()

	bet, err := s.getBetByIDDB(request.BetID)
	if err != nil {
		return Bet{}, CashoutQuote{}, err
	}
	if bet.UserID != request.UserID || bet.Status != statusPlaced {
		return Bet{}, CashoutQuote{}, ErrCashoutNotEligible
	}

	entry, err := s.wallet.Credit(wallet.MutationRequest{
		UserID:         bet.UserID,
		AmountCents:    quote.AmountCents,
		IdempotencyKey: "cashout:" + bet.BetID,
		Reason:         settlementReasonOrDefault(request.Reason, "bet cashout"),
	})
	if err != nil {
		return Bet{}, CashoutQuote{}, err
	}

	now := s.now().UTC().Format(time.RFC3339)
	bet.Status = statusCashedOut
	bet.SettledAt = now
	bet.SettlementOutcome = "cashed_out"
	bet.SettlementReference = quote.QuoteID
	bet.SettlementLedgerEntryID = entry.EntryID
	bet.WalletBalanceCents = entry.BalanceCents
	if err := s.updateBetLifecycleDB(bet); err != nil {
		return Bet{}, CashoutQuote{}, err
	}

	s.recordEventDBBestEffort(BetEvent{
		ID:         fmt.Sprintf("be:db:%d", s.now().UTC().UnixNano()),
		BetID:      bet.BetID,
		UserID:     bet.UserID,
		Action:     actionBetCashedOut,
		ActorID:    fallbackActor(request.ActorID, bet.UserID),
		Status:     bet.Status,
		Reason:     normalizeReasonCode(request.Reason, "cashout_accepted"),
		Details:    fmt.Sprintf("quoteId=%s revision=%d amountCents=%d source=%s", quote.QuoteID, quote.Revision, quote.AmountCents, quote.Source),
		OccurredAt: now,
	})

	s.mu.Lock()
	s.ensureCashoutQuoteStateLocked()
	quote.Status = cashoutQuoteStatusAccepted
	quote.AcceptedAt = now
	quote.UpdatedAt = now
	quote.LastReason = request.Reason
	s.quotesByID[quote.QuoteID] = quote
	s.quotesByKey[cashoutQuoteKey(quote.UserID, quote.RequestID)] = quote
	s.cashoutMetrics.QuotesAccepted++
	_ = s.saveToDiskLocked()
	s.mu.Unlock()

	return bet, quote, nil
}

func calculateCashoutAmount(bet Bet) int64 {
	if bet.PotentialPayoutCents <= 0 {
		return bet.StakeCents
	}
	profit := bet.PotentialPayoutCents - bet.StakeCents
	if profit <= 0 {
		return bet.StakeCents
	}
	amount := bet.StakeCents + int64(float64(profit)*0.6)
	if amount > bet.PotentialPayoutCents {
		amount = bet.PotentialPayoutCents
	}
	if amount < 0 {
		return 0
	}
	return amount
}

func cashoutQuoteKey(userID string, requestID string) string {
	return strings.TrimSpace(userID) + ":" + strings.TrimSpace(requestID)
}

func (s *Service) ensureCashoutQuoteStateLocked() {
	if s.quotesByID == nil {
		s.quotesByID = map[string]CashoutQuote{}
	}
	if s.quotesByKey == nil {
		s.quotesByKey = map[string]CashoutQuote{}
	}
	if s.quoteLatestRevisionByBet == nil {
		s.quoteLatestRevisionByBet = map[string]int64{}
	}
}

func (s *Service) expireCashoutQuoteIfNeededLocked(quote CashoutQuote) bool {
	if quote.Status != cashoutQuoteStatusOpen {
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
	quote.Status = cashoutQuoteStatusExpired
	quote.UpdatedAt = now.Format(time.RFC3339)
	quote.LastReason = "expired"
	s.quotesByID[quote.QuoteID] = quote
	s.quotesByKey[cashoutQuoteKey(quote.UserID, quote.RequestID)] = quote
	s.cashoutMetrics.QuotesExpired++
	_ = s.saveToDiskLocked()
	return true
}

func (s *Service) CashoutMetricsSnapshot() CashoutMetrics {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.cashoutMetrics
}

func (s *Service) SettlementMetricsSnapshot() SettlementMetrics {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.settlementMetrics
}
