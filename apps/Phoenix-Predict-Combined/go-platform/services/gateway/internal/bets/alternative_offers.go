package bets

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
)

var (
	ErrInvalidAlternativeOfferRequest = errors.New("invalid alternative odds offer request")
	ErrAlternativeOfferNotFound       = errors.New("alternative odds offer not found")
	ErrAlternativeOfferExpired        = errors.New("alternative odds offer expired")
	ErrAlternativeOfferStateConflict  = errors.New("alternative odds offer state conflict")
)

const (
	offerStatusOpen     = "open"
	offerStatusAccepted = "accepted"
	offerStatusDeclined = "declined"
	offerStatusExpired  = "expired"

	defaultAlternativeOfferTTLSeconds int64 = 30
)

type AlternativeOddsOffer struct {
	OfferID              string  `json:"offerId"`
	UserID               string  `json:"userId"`
	RequestID            string  `json:"requestId"`
	MarketID             string  `json:"marketId"`
	SelectionID          string  `json:"selectionId"`
	StakeCents           int64   `json:"stakeCents"`
	RequestedOdds        float64 `json:"requestedOdds"`
	CurrentOdds          float64 `json:"currentOdds"`
	OfferedOdds          float64 `json:"offeredOdds"`
	Status               string  `json:"status"`
	Version              int64   `json:"version"`
	LastAction           string  `json:"lastAction"`
	DecisionReason       string  `json:"decisionReason,omitempty"`
	CreatedAt            string  `json:"createdAt"`
	UpdatedAt            string  `json:"updatedAt"`
	ExpiresAt            string  `json:"expiresAt"`
	AcceptedAt           string  `json:"acceptedAt,omitempty"`
	DeclinedAt           string  `json:"declinedAt,omitempty"`
	ExpiredAt            string  `json:"expiredAt,omitempty"`
	RepricedAt           string  `json:"repricedAt,omitempty"`
	CommittedBetID       string  `json:"committedBetId,omitempty"`
	CommittedAt          string  `json:"committedAt,omitempty"`
	CommitRequestID      string  `json:"commitRequestId,omitempty"`
	CommitIdempotencyKey string  `json:"commitIdempotencyKey,omitempty"`
}

type AlternativeOddsOfferCreateRequest struct {
	UserID          string
	RequestID       string
	DeviceID        string
	SegmentID       string
	IPAddress       string
	OddsPrecision   int
	MarketID        string
	SelectionID     string
	StakeCents      int64
	RequestedOdds   float64
	OfferedOdds     float64
	ExpiresInSecond int64
}

type AlternativeOddsOfferDecisionRequest struct {
	OfferID   string
	UserID    string
	RequestID string
	Reason    string
}

type AlternativeOddsOfferRepriceRequest struct {
	OfferID          string
	UserID           string
	RequestID        string
	OfferedOdds      float64
	ExpiresInSeconds int64
	Reason           string
}

type AlternativeOddsOfferCommitRequest struct {
	OfferID        string
	UserID         string
	RequestID      string
	IdempotencyKey string
	Reason         string
	ActorID        string
}

func (s *Service) CreateAlternativeOddsOffer(request AlternativeOddsOfferCreateRequest) (AlternativeOddsOffer, error) {
	if s.repository == nil || s.wallet == nil {
		return AlternativeOddsOffer{}, ErrInvalidAlternativeOfferRequest
	}

	normalized, err := normalizeAlternativeOfferCreateRequest(request)
	if err != nil {
		return AlternativeOddsOffer{}, err
	}

	placement := PlaceBetRequest{
		UserID:         normalized.UserID,
		RequestID:      normalized.RequestID,
		DeviceID:       normalized.DeviceID,
		SegmentID:      normalized.SegmentID,
		IPAddress:      normalized.IPAddress,
		OddsPrecision:  normalized.OddsPrecision,
		MarketID:       normalized.MarketID,
		SelectionID:    normalized.SelectionID,
		StakeCents:     normalized.StakeCents,
		Odds:           normalized.RequestedOdds,
		IdempotencyKey: "alt-offer:" + normalized.RequestID,
	}
	normalizedPlacement, err := normalizePlacementEnvelope(placement)
	if err != nil {
		if errors.Is(err, ErrInvalidBetRequest) {
			return AlternativeOddsOffer{}, ErrInvalidAlternativeOfferRequest
		}
		return AlternativeOddsOffer{}, err
	}
	market, fixture, selection, err := s.validatePlacementRequest(normalizedPlacement)
	if err != nil {
		return AlternativeOddsOffer{}, err
	}

	currentOdds := selection.Odds
	if currentOdds <= 0 {
		currentOdds = normalized.RequestedOdds
	}
	offeredOdds := normalized.OfferedOdds
	if offeredOdds <= 0 {
		offeredOdds = currentOdds
	}
	if err := s.validateAlternativeOfferedOdds(offeredOdds, normalized.OddsPrecision); err != nil {
		return AlternativeOddsOffer{}, err
	}
	_ = market
	_ = fixture

	now := s.now().UTC()
	ttl := normalized.ExpiresInSecond
	if ttl <= 0 {
		ttl = parseInt64Env("BET_ALT_OFFER_TTL_SECONDS", defaultAlternativeOfferTTLSeconds)
		if ttl <= 0 {
			ttl = defaultAlternativeOfferTTLSeconds
		}
	}

	idempotencyKey := normalized.UserID + ":" + normalized.RequestID

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureAlternativeOfferStateLocked()

	if existing, found := s.offersByKey[idempotencyKey]; found {
		if sameAlternativeOffer(existing, normalized, offeredOdds) {
			return existing, nil
		}
		return AlternativeOddsOffer{}, ErrIdempotencyReplay
	}

	s.offerSequence++
	offer := AlternativeOddsOffer{
		OfferID:       fmt.Sprintf("ao:local:%06d", s.offerSequence),
		UserID:        normalized.UserID,
		RequestID:     normalized.RequestID,
		MarketID:      normalized.MarketID,
		SelectionID:   normalized.SelectionID,
		StakeCents:    normalized.StakeCents,
		RequestedOdds: normalized.RequestedOdds,
		CurrentOdds:   currentOdds,
		OfferedOdds:   offeredOdds,
		Status:        offerStatusOpen,
		Version:       1,
		LastAction:    "created",
		CreatedAt:     now.Format(time.RFC3339),
		UpdatedAt:     now.Format(time.RFC3339),
		ExpiresAt:     now.Add(time.Duration(ttl) * time.Second).Format(time.RFC3339),
	}

	s.offersByID[offer.OfferID] = offer
	s.offersByKey[idempotencyKey] = offer
	s.offerMetrics.Created++

	if err := s.saveToDiskLocked(); err != nil {
		return AlternativeOddsOffer{}, err
	}

	return offer, nil
}

func (s *Service) GetAlternativeOddsOffer(offerID string) (AlternativeOddsOffer, error) {
	id := strings.TrimSpace(offerID)
	if id == "" {
		return AlternativeOddsOffer{}, ErrInvalidAlternativeOfferRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureAlternativeOfferStateLocked()

	offer, found := s.offersByID[id]
	if !found {
		return AlternativeOddsOffer{}, ErrAlternativeOfferNotFound
	}
	if s.expireOfferIfNeededLocked(offer) {
		offer = s.offersByID[id]
	}
	return offer, nil
}

func (s *Service) ListAlternativeOddsOffers(userID string, status string, limit int) []AlternativeOddsOffer {
	filterUser := strings.TrimSpace(userID)
	filterStatus := strings.TrimSpace(strings.ToLower(status))

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureAlternativeOfferStateLocked()

	out := make([]AlternativeOddsOffer, 0, len(s.offersByID))
	changed := false
	for _, offer := range s.offersByID {
		if s.expireOfferIfNeededLocked(offer) {
			offer = s.offersByID[offer.OfferID]
			changed = true
		}
		if filterUser != "" && offer.UserID != filterUser {
			continue
		}
		if filterStatus != "" && strings.ToLower(offer.Status) != filterStatus {
			continue
		}
		out = append(out, offer)
	}
	if changed {
		_ = s.saveToDiskLocked()
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].UpdatedAt == out[j].UpdatedAt {
			return out[i].OfferID > out[j].OfferID
		}
		return out[i].UpdatedAt > out[j].UpdatedAt
	})
	if limit > 0 && len(out) > limit {
		return out[:limit]
	}
	return out
}

func (s *Service) AlternativeOfferMetricsSnapshot() (AlternativeOfferMetrics, AlternativeOfferStatusMetrics) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	status := AlternativeOfferStatusMetrics{}
	status.Total = int64(len(s.offersByID))
	for _, offer := range s.offersByID {
		switch offer.Status {
		case offerStatusOpen:
			status.Open++
		case offerStatusAccepted:
			status.Accepted++
		case offerStatusDeclined:
			status.Declined++
		case offerStatusExpired:
			status.Expired++
		}
		if strings.TrimSpace(offer.CommittedBetID) != "" {
			status.Committed++
		}
	}
	return s.offerMetrics, status
}

func (s *Service) AcceptAlternativeOddsOffer(request AlternativeOddsOfferDecisionRequest) (AlternativeOddsOffer, error) {
	return s.applyAlternativeOfferDecision(request, offerStatusAccepted, "accepted")
}

func (s *Service) DeclineAlternativeOddsOffer(request AlternativeOddsOfferDecisionRequest) (AlternativeOddsOffer, error) {
	return s.applyAlternativeOfferDecision(request, offerStatusDeclined, "declined")
}

func (s *Service) CommitAlternativeOddsOffer(request AlternativeOddsOfferCommitRequest) (AlternativeOddsOffer, Bet, error) {
	request.OfferID = strings.TrimSpace(request.OfferID)
	request.UserID = strings.TrimSpace(request.UserID)
	request.RequestID = strings.TrimSpace(request.RequestID)
	request.IdempotencyKey = strings.TrimSpace(request.IdempotencyKey)
	request.Reason = strings.TrimSpace(request.Reason)
	request.ActorID = strings.TrimSpace(request.ActorID)

	if request.OfferID == "" || request.UserID == "" || request.RequestID == "" {
		return AlternativeOddsOffer{}, Bet{}, ErrInvalidAlternativeOfferRequest
	}
	if request.IdempotencyKey == "" {
		request.IdempotencyKey = "alt-offer-commit:" + request.OfferID
	}

	s.mu.Lock()
	s.ensureAlternativeOfferStateLocked()
	offer, found := s.offersByID[request.OfferID]
	if !found || offer.UserID != request.UserID {
		s.mu.Unlock()
		return AlternativeOddsOffer{}, Bet{}, ErrAlternativeOfferNotFound
	}
	if s.expireOfferIfNeededLocked(offer) {
		s.mu.Unlock()
		return AlternativeOddsOffer{}, Bet{}, ErrAlternativeOfferExpired
	}
	if offer.CommittedBetID != "" {
		committedBetID := offer.CommittedBetID
		s.mu.Unlock()
		bet, err := s.GetByID(committedBetID)
		if err != nil {
			return AlternativeOddsOffer{}, Bet{}, err
		}
		return offer, bet, nil
	}
	if offer.Status == offerStatusDeclined || offer.Status == offerStatusExpired {
		s.mu.Unlock()
		return AlternativeOddsOffer{}, Bet{}, ErrAlternativeOfferStateConflict
	}

	now := s.now().UTC().Format(time.RFC3339)
	if offer.Status == offerStatusOpen {
		offer.Status = offerStatusAccepted
		offer.AcceptedAt = now
		s.offerMetrics.Accepted++
	}
	offer.LastAction = "commit_requested"
	offer.DecisionReason = settlementReasonOrDefault(request.Reason, offer.DecisionReason)
	offer.Version++
	offer.UpdatedAt = now
	s.offersByID[offer.OfferID] = offer
	s.offersByKey[offer.UserID+":"+offer.RequestID] = offer
	if err := s.saveToDiskLocked(); err != nil {
		s.mu.Unlock()
		return AlternativeOddsOffer{}, Bet{}, err
	}
	s.mu.Unlock()

	bet, err := s.Place(PlaceBetRequest{
		UserID:             offer.UserID,
		RequestID:          request.RequestID,
		MarketID:           offer.MarketID,
		SelectionID:        offer.SelectionID,
		StakeCents:         offer.StakeCents,
		Odds:               offer.OfferedOdds,
		ForceRequestedOdds: true,
		IdempotencyKey:     request.IdempotencyKey,
		ActorID:            fallbackActor(request.ActorID, offer.UserID),
	})
	if err != nil {
		return AlternativeOddsOffer{}, Bet{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureAlternativeOfferStateLocked()
	latest, found := s.offersByID[request.OfferID]
	if !found {
		return AlternativeOddsOffer{}, Bet{}, ErrAlternativeOfferNotFound
	}
	latest.Status = offerStatusAccepted
	latest.LastAction = "committed"
	latest.Version++
	latest.CommittedBetID = bet.BetID
	latest.CommittedAt = s.now().UTC().Format(time.RFC3339)
	latest.CommitRequestID = request.RequestID
	latest.CommitIdempotencyKey = request.IdempotencyKey
	latest.UpdatedAt = latest.CommittedAt
	s.offerMetrics.Committed++
	if request.Reason != "" {
		latest.DecisionReason = request.Reason
	}
	s.offersByID[latest.OfferID] = latest
	s.offersByKey[latest.UserID+":"+latest.RequestID] = latest
	if err := s.saveToDiskLocked(); err != nil {
		return AlternativeOddsOffer{}, Bet{}, err
	}
	return latest, bet, nil
}

func (s *Service) RepriceAlternativeOddsOffer(request AlternativeOddsOfferRepriceRequest) (AlternativeOddsOffer, error) {
	request.OfferID = strings.TrimSpace(request.OfferID)
	request.UserID = strings.TrimSpace(request.UserID)
	request.RequestID = strings.TrimSpace(request.RequestID)
	request.Reason = strings.TrimSpace(request.Reason)

	if request.OfferID == "" || request.UserID == "" || request.RequestID == "" {
		return AlternativeOddsOffer{}, ErrInvalidAlternativeOfferRequest
	}
	if err := s.validateAlternativeOfferedOdds(request.OfferedOdds, 0); err != nil {
		return AlternativeOddsOffer{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureAlternativeOfferStateLocked()

	offer, found := s.offersByID[request.OfferID]
	if !found || offer.UserID != request.UserID {
		return AlternativeOddsOffer{}, ErrAlternativeOfferNotFound
	}
	if s.expireOfferIfNeededLocked(offer) {
		return AlternativeOddsOffer{}, ErrAlternativeOfferExpired
	}
	if offer.Status != offerStatusOpen {
		return AlternativeOddsOffer{}, ErrAlternativeOfferStateConflict
	}

	offer.CurrentOdds = offer.OfferedOdds
	offer.OfferedOdds = request.OfferedOdds
	offer.Version++
	offer.LastAction = "repriced"
	offer.RepricedAt = s.now().UTC().Format(time.RFC3339)
	offer.UpdatedAt = offer.RepricedAt
	s.offerMetrics.Repriced++
	if request.Reason != "" {
		offer.DecisionReason = request.Reason
	}
	if request.ExpiresInSeconds > 0 {
		offer.ExpiresAt = s.now().UTC().Add(time.Duration(request.ExpiresInSeconds) * time.Second).Format(time.RFC3339)
	}

	s.offersByID[offer.OfferID] = offer
	s.offersByKey[offer.UserID+":"+offer.RequestID] = offer
	if err := s.saveToDiskLocked(); err != nil {
		return AlternativeOddsOffer{}, err
	}
	return offer, nil
}

func (s *Service) ExpireAlternativeOddsOffers(now time.Time) int {
	when := now.UTC()

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureAlternativeOfferStateLocked()

	changed := false
	expiredCount := 0
	for _, offer := range s.offersByID {
		if offer.Status != offerStatusOpen {
			continue
		}
		expiresAt, err := time.Parse(time.RFC3339, offer.ExpiresAt)
		if err != nil || !expiresAt.After(when) {
			offer.Status = offerStatusExpired
			offer.LastAction = "expired"
			offer.Version++
			offer.ExpiredAt = when.Format(time.RFC3339)
			offer.UpdatedAt = when.Format(time.RFC3339)
			s.offersByID[offer.OfferID] = offer
			s.offersByKey[offer.UserID+":"+offer.RequestID] = offer
			s.offerMetrics.Expired++
			expiredCount++
			changed = true
		}
	}
	if changed {
		_ = s.saveToDiskLocked()
	}
	return expiredCount
}

func (s *Service) applyAlternativeOfferDecision(
	request AlternativeOddsOfferDecisionRequest,
	targetStatus string,
	action string,
) (AlternativeOddsOffer, error) {
	request.OfferID = strings.TrimSpace(request.OfferID)
	request.UserID = strings.TrimSpace(request.UserID)
	request.RequestID = strings.TrimSpace(request.RequestID)
	request.Reason = strings.TrimSpace(request.Reason)

	if request.OfferID == "" || request.UserID == "" || request.RequestID == "" {
		return AlternativeOddsOffer{}, ErrInvalidAlternativeOfferRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.ensureAlternativeOfferStateLocked()

	offer, found := s.offersByID[request.OfferID]
	if !found || offer.UserID != request.UserID {
		return AlternativeOddsOffer{}, ErrAlternativeOfferNotFound
	}
	if s.expireOfferIfNeededLocked(offer) {
		return AlternativeOddsOffer{}, ErrAlternativeOfferExpired
	}
	if offer.Status == targetStatus {
		return offer, nil
	}
	if offer.Status != offerStatusOpen {
		return AlternativeOddsOffer{}, ErrAlternativeOfferStateConflict
	}

	now := s.now().UTC().Format(time.RFC3339)
	offer.Status = targetStatus
	offer.LastAction = action
	offer.Version++
	offer.UpdatedAt = now
	if request.Reason != "" {
		offer.DecisionReason = request.Reason
	}
	switch targetStatus {
	case offerStatusAccepted:
		offer.AcceptedAt = now
		s.offerMetrics.Accepted++
	case offerStatusDeclined:
		offer.DeclinedAt = now
		s.offerMetrics.Declined++
	}

	s.offersByID[offer.OfferID] = offer
	s.offersByKey[offer.UserID+":"+offer.RequestID] = offer
	if err := s.saveToDiskLocked(); err != nil {
		return AlternativeOddsOffer{}, err
	}
	return offer, nil
}

func normalizeAlternativeOfferCreateRequest(request AlternativeOddsOfferCreateRequest) (AlternativeOddsOfferCreateRequest, error) {
	request.UserID = strings.TrimSpace(request.UserID)
	request.RequestID = strings.TrimSpace(request.RequestID)
	request.DeviceID = strings.TrimSpace(request.DeviceID)
	request.SegmentID = strings.TrimSpace(request.SegmentID)
	request.IPAddress = strings.TrimSpace(request.IPAddress)
	request.MarketID = strings.TrimSpace(request.MarketID)
	request.SelectionID = strings.TrimSpace(request.SelectionID)

	if request.UserID == "" || request.RequestID == "" || request.MarketID == "" || request.SelectionID == "" {
		return AlternativeOddsOfferCreateRequest{}, ErrInvalidAlternativeOfferRequest
	}
	if request.StakeCents <= 0 {
		return AlternativeOddsOfferCreateRequest{}, ErrInvalidAlternativeOfferRequest
	}
	if request.RequestedOdds <= 1.0 {
		return AlternativeOddsOfferCreateRequest{}, ErrInvalidAlternativeOfferRequest
	}
	return request, nil
}

func sameAlternativeOffer(existing AlternativeOddsOffer, request AlternativeOddsOfferCreateRequest, offeredOdds float64) bool {
	return existing.UserID == request.UserID &&
		existing.RequestID == request.RequestID &&
		existing.MarketID == request.MarketID &&
		existing.SelectionID == request.SelectionID &&
		existing.StakeCents == request.StakeCents &&
		sameOdds(existing.RequestedOdds, request.RequestedOdds) &&
		sameOdds(existing.OfferedOdds, offeredOdds)
}

func (s *Service) validateAlternativeOfferedOdds(odds float64, oddsPrecision int) error {
	if odds <= 1.0 || !oddsPrecisionValid(odds) {
		return ErrOddsOutOfRange
	}
	if odds < s.minOdds || odds > s.maxOdds {
		return ErrOddsOutOfRange
	}
	if oddsPrecision > 0 && oddsDecimalPlaces(odds) > oddsPrecision {
		return ErrOddsOutOfRange
	}
	return nil
}

func (s *Service) ensureAlternativeOfferStateLocked() {
	if s.offersByID == nil {
		s.offersByID = map[string]AlternativeOddsOffer{}
	}
	if s.offersByKey == nil {
		s.offersByKey = map[string]AlternativeOddsOffer{}
	}
}

func (s *Service) expireOfferIfNeededLocked(offer AlternativeOddsOffer) bool {
	if offer.Status != offerStatusOpen {
		return false
	}
	expiresAt, err := time.Parse(time.RFC3339, offer.ExpiresAt)
	if err != nil {
		expiresAt = s.now().UTC()
	}
	now := s.now().UTC()
	if expiresAt.After(now) {
		return false
	}
	offer.Status = offerStatusExpired
	offer.LastAction = "expired"
	offer.Version++
	offer.ExpiredAt = now.Format(time.RFC3339)
	offer.UpdatedAt = now.Format(time.RFC3339)
	s.offersByID[offer.OfferID] = offer
	s.offersByKey[offer.UserID+":"+offer.RequestID] = offer
	s.offerMetrics.Expired++
	_ = s.saveToDiskLocked()
	return true
}
