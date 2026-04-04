package freebets

import (
	"errors"
	"math"
	"strings"
	"sync"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

var (
	ErrFreebetInvalidRequest = errors.New("freebet request is invalid")
	ErrFreebetNotFound       = errors.New("freebet not found")
	ErrFreebetForbidden      = errors.New("freebet does not belong to user")
	ErrFreebetNotApplicable  = errors.New("freebet is not applicable for placement")
	ErrFreebetIdempotency    = errors.New("freebet apply idempotency conflict")
)

type ApplyToBetRequest struct {
	FreebetID  string
	UserID     string
	RequestID  string
	StakeCents int64
	Odds       float64
}

type ApplyToBetResult struct {
	Freebet            canonicalv1.Freebet
	AppliedAmountCents int64
}

type applyRecord struct {
	FreebetID          string
	UserID             string
	StakeCents         int64
	Odds               float64
	AppliedAmountCents int64
	Before             canonicalv1.Freebet
	After              canonicalv1.Freebet
}

type Service struct {
	mu               sync.RWMutex
	items            map[string]canonicalv1.Freebet
	applyByRequestID map[string]applyRecord
	now              func() time.Time
}

func NewService() *Service {
	now := time.Date(2026, 4, 3, 16, 30, 0, 0, time.UTC)
	seed := []canonicalv1.Freebet{
		{
			FreebetID:            "fb:local:001",
			PlayerID:             "u-1",
			CampaignID:           "campaign:welcome",
			Currency:             "USD",
			TotalAmountCents:     1500,
			RemainingAmountCents: 1500,
			MinOddsDecimal:       1.5,
			AppliesToSportIDs:    []string{"sport:football"},
			ExpiresAt:            now.Add(24 * time.Hour),
			Status:               canonicalv1.FreebetStatusAvailable,
			CreatedAt:            now,
			UpdatedAt:            now,
		},
		{
			FreebetID:            "fb:local:002",
			PlayerID:             "u-1",
			CampaignID:           "campaign:weekend-boost",
			Currency:             "USD",
			TotalAmountCents:     2000,
			RemainingAmountCents: 500,
			MinOddsDecimal:       1.2,
			AppliesToSportIDs:    []string{"sport:esports"},
			ExpiresAt:            now.Add(12 * time.Hour),
			Status:               canonicalv1.FreebetStatusReserved,
			CreatedAt:            now.Add(-3 * time.Hour),
			UpdatedAt:            now.Add(-30 * time.Minute),
		},
		{
			FreebetID:            "fb:local:003",
			PlayerID:             "u-2",
			CampaignID:           "campaign:welcome",
			Currency:             "USD",
			TotalAmountCents:     1000,
			RemainingAmountCents: 1000,
			MinOddsDecimal:       1.5,
			AppliesToSportIDs:    []string{"sport:football"},
			ExpiresAt:            now.Add(24 * time.Hour),
			Status:               canonicalv1.FreebetStatusAvailable,
			CreatedAt:            now,
			UpdatedAt:            now,
		},
	}
	items := make(map[string]canonicalv1.Freebet, len(seed))
	for _, item := range seed {
		items[item.FreebetID] = item
	}
	return &Service{
		items:            items,
		applyByRequestID: map[string]applyRecord{},
		now:              func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) GetByID(freebetID string) (canonicalv1.Freebet, bool) {
	id := strings.TrimSpace(freebetID)
	if id == "" {
		return canonicalv1.Freebet{}, false
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	item, exists := s.items[id]
	if !exists {
		return canonicalv1.Freebet{}, false
	}
	return cloneFreebet(item), true
}

func (s *Service) ListByUser(userID string, status string) []canonicalv1.Freebet {
	playerID := strings.TrimSpace(userID)
	if playerID == "" {
		return nil
	}
	statusFilter := strings.TrimSpace(strings.ToLower(status))

	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]canonicalv1.Freebet, 0, len(s.items))
	for _, item := range s.items {
		if !strings.EqualFold(item.PlayerID, playerID) {
			continue
		}
		if statusFilter != "" && !strings.EqualFold(string(item.Status), statusFilter) {
			continue
		}
		out = append(out, cloneFreebet(item))
	}
	return out
}

func (s *Service) ApplyToBet(request ApplyToBetRequest) (ApplyToBetResult, error) {
	freebetID := strings.TrimSpace(request.FreebetID)
	userID := strings.TrimSpace(request.UserID)
	requestID := strings.TrimSpace(request.RequestID)
	if freebetID == "" || userID == "" || requestID == "" || request.StakeCents <= 0 || request.Odds <= 0 {
		return ApplyToBetResult{}, ErrFreebetInvalidRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.applyByRequestID[requestID]; ok {
		if !strings.EqualFold(existing.FreebetID, freebetID) ||
			!strings.EqualFold(existing.UserID, userID) ||
			existing.StakeCents != request.StakeCents ||
			!sameOdds(existing.Odds, request.Odds) {
			return ApplyToBetResult{}, ErrFreebetIdempotency
		}
		return ApplyToBetResult{
			Freebet:            cloneFreebet(existing.After),
			AppliedAmountCents: existing.AppliedAmountCents,
		}, nil
	}

	item, exists := s.items[freebetID]
	if !exists {
		return ApplyToBetResult{}, ErrFreebetNotFound
	}
	if !strings.EqualFold(item.PlayerID, userID) {
		return ApplyToBetResult{}, ErrFreebetForbidden
	}

	now := s.now()
	if !item.ExpiresAt.After(now) {
		if item.Status == canonicalv1.FreebetStatusAvailable || item.Status == canonicalv1.FreebetStatusReserved {
			item.Status = canonicalv1.FreebetStatusExpired
			item.UpdatedAt = now
			s.items[freebetID] = item
		}
		return ApplyToBetResult{}, ErrFreebetNotApplicable
	}
	if item.Status != canonicalv1.FreebetStatusAvailable && item.Status != canonicalv1.FreebetStatusReserved {
		return ApplyToBetResult{}, ErrFreebetNotApplicable
	}
	if item.MinOddsDecimal > 0 && request.Odds+0.0000001 < item.MinOddsDecimal {
		return ApplyToBetResult{}, ErrFreebetNotApplicable
	}
	if item.RemainingAmountCents <= 0 {
		return ApplyToBetResult{}, ErrFreebetNotApplicable
	}

	appliedAmountCents := request.StakeCents
	if appliedAmountCents > item.RemainingAmountCents {
		appliedAmountCents = item.RemainingAmountCents
	}
	if appliedAmountCents <= 0 {
		return ApplyToBetResult{}, ErrFreebetNotApplicable
	}

	before := cloneFreebet(item)
	item.RemainingAmountCents -= appliedAmountCents
	if item.RemainingAmountCents <= 0 {
		item.RemainingAmountCents = 0
		item.Status = canonicalv1.FreebetStatusConsumed
	} else {
		item.Status = canonicalv1.FreebetStatusReserved
	}
	item.UpdatedAt = now
	s.items[freebetID] = item

	s.applyByRequestID[requestID] = applyRecord{
		FreebetID:          freebetID,
		UserID:             userID,
		StakeCents:         request.StakeCents,
		Odds:               request.Odds,
		AppliedAmountCents: appliedAmountCents,
		Before:             before,
		After:              cloneFreebet(item),
	}

	return ApplyToBetResult{
		Freebet:            cloneFreebet(item),
		AppliedAmountCents: appliedAmountCents,
	}, nil
}

func (s *Service) RollbackApply(requestID string) error {
	id := strings.TrimSpace(requestID)
	if id == "" {
		return ErrFreebetInvalidRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	record, exists := s.applyByRequestID[id]
	if !exists {
		return nil
	}
	s.items[record.FreebetID] = cloneFreebet(record.Before)
	delete(s.applyByRequestID, id)
	return nil
}

func cloneFreebet(value canonicalv1.Freebet) canonicalv1.Freebet {
	out := value
	out.AppliesToSportIDs = append([]string(nil), value.AppliesToSportIDs...)
	out.AppliesToTournamentIDs = append([]string(nil), value.AppliesToTournamentIDs...)
	return out
}

func sameOdds(left float64, right float64) bool {
	return math.Abs(left-right) <= 0.0000001
}
