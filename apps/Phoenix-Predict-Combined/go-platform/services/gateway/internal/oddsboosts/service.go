package oddsboosts

import (
	"errors"
	"math"
	"strings"
	"sync"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

var (
	ErrOddsBoostInvalidRequest = errors.New("odds boost request is invalid")
	ErrOddsBoostNotFound       = errors.New("odds boost not found")
	ErrOddsBoostForbidden      = errors.New("odds boost does not belong to user")
	ErrOddsBoostNotAcceptable  = errors.New("odds boost is not in acceptable state")
	ErrOddsBoostIdempotency    = errors.New("odds boost accept idempotency conflict")
)

type AcceptRequest struct {
	OddsBoostID string
	UserID      string
	RequestID   string
	Reason      string
}

type ValidateForBetRequest struct {
	OddsBoostID   string
	UserID        string
	MarketID      string
	SelectionID   string
	StakeCents    int64
	RequestedOdds float64
}

type Service struct {
	mu                sync.RWMutex
	items             map[string]canonicalv1.OddsBoost
	acceptByRequestID map[string]string
	now               func() time.Time
}

func NewService() *Service {
	now := time.Now().UTC().Truncate(time.Second)
	seed := []canonicalv1.OddsBoost{
		{
			OddsBoostID:    "ob:local:001",
			PlayerID:       "u-1",
			CampaignID:     "campaign:evening-boost",
			MarketID:       "m:local:001",
			SelectionID:    "home",
			Currency:       "USD",
			OriginalOdds:   1.85,
			BoostedOdds:    2.05,
			MaxStakeCents:  2500,
			MinOddsDecimal: 1.4,
			Status:         canonicalv1.OddsBoostStatusAvailable,
			ExpiresAt:      now.Add(8 * time.Hour),
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		{
			OddsBoostID:    "ob:local:002",
			PlayerID:       "u-1",
			CampaignID:     "campaign:weekend-special",
			MarketID:       "m:local:002",
			SelectionID:    "over",
			Currency:       "USD",
			OriginalOdds:   1.72,
			BoostedOdds:    1.95,
			MaxStakeCents:  3000,
			MinOddsDecimal: 1.3,
			Status:         canonicalv1.OddsBoostStatusAvailable,
			ExpiresAt:      now.Add(5 * time.Hour),
			CreatedAt:      now.Add(-2 * time.Hour),
			UpdatedAt:      now.Add(-2 * time.Hour),
		},
		{
			OddsBoostID:    "ob:local:003",
			PlayerID:       "u-2",
			CampaignID:     "campaign:welcome-boost",
			MarketID:       "m:local:003",
			SelectionID:    "away",
			Currency:       "USD",
			OriginalOdds:   2.1,
			BoostedOdds:    2.35,
			MaxStakeCents:  2000,
			MinOddsDecimal: 1.5,
			Status:         canonicalv1.OddsBoostStatusAvailable,
			ExpiresAt:      now.Add(12 * time.Hour),
			CreatedAt:      now,
			UpdatedAt:      now,
		},
	}

	items := make(map[string]canonicalv1.OddsBoost, len(seed))
	for _, item := range seed {
		items[item.OddsBoostID] = item
	}
	return &Service{
		items:             items,
		acceptByRequestID: map[string]string{},
		now:               func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) GetByID(oddsBoostID string) (canonicalv1.OddsBoost, bool) {
	id := strings.TrimSpace(oddsBoostID)
	if id == "" {
		return canonicalv1.OddsBoost{}, false
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	item, exists := s.items[id]
	if !exists {
		return canonicalv1.OddsBoost{}, false
	}
	return cloneOddsBoost(item), true
}

func (s *Service) ListByUser(userID string, status string) []canonicalv1.OddsBoost {
	playerID := strings.TrimSpace(userID)
	if playerID == "" {
		return nil
	}
	statusFilter := strings.TrimSpace(strings.ToLower(status))

	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]canonicalv1.OddsBoost, 0, len(s.items))
	for _, item := range s.items {
		if !strings.EqualFold(item.PlayerID, playerID) {
			continue
		}
		if statusFilter != "" && !strings.EqualFold(string(item.Status), statusFilter) {
			continue
		}
		out = append(out, cloneOddsBoost(item))
	}
	return out
}

func (s *Service) Accept(request AcceptRequest) (canonicalv1.OddsBoost, error) {
	boostID := strings.TrimSpace(request.OddsBoostID)
	userID := strings.TrimSpace(request.UserID)
	requestID := strings.TrimSpace(request.RequestID)
	if boostID == "" || userID == "" || requestID == "" {
		return canonicalv1.OddsBoost{}, ErrOddsBoostInvalidRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if existingBoostID, ok := s.acceptByRequestID[requestID]; ok {
		if !strings.EqualFold(existingBoostID, boostID) {
			return canonicalv1.OddsBoost{}, ErrOddsBoostIdempotency
		}
		item, exists := s.items[boostID]
		if !exists {
			return canonicalv1.OddsBoost{}, ErrOddsBoostNotFound
		}
		if !strings.EqualFold(item.PlayerID, userID) {
			return canonicalv1.OddsBoost{}, ErrOddsBoostForbidden
		}
		return cloneOddsBoost(item), nil
	}

	item, exists := s.items[boostID]
	if !exists {
		return canonicalv1.OddsBoost{}, ErrOddsBoostNotFound
	}
	if !strings.EqualFold(item.PlayerID, userID) {
		return canonicalv1.OddsBoost{}, ErrOddsBoostForbidden
	}

	now := s.now()
	if item.Status == canonicalv1.OddsBoostStatusAvailable && !item.ExpiresAt.After(now) {
		item.Status = canonicalv1.OddsBoostStatusExpired
		item.UpdatedAt = now
		s.items[boostID] = item
		return canonicalv1.OddsBoost{}, ErrOddsBoostNotAcceptable
	}
	if item.Status != canonicalv1.OddsBoostStatusAvailable {
		return canonicalv1.OddsBoost{}, ErrOddsBoostNotAcceptable
	}

	item.Status = canonicalv1.OddsBoostStatusAccepted
	item.AcceptRequestID = requestID
	item.AcceptReason = strings.TrimSpace(request.Reason)
	item.AcceptedAt = &now
	item.UpdatedAt = now
	s.items[boostID] = item
	s.acceptByRequestID[requestID] = boostID

	return cloneOddsBoost(item), nil
}

func (s *Service) ValidateForBet(request ValidateForBetRequest) (canonicalv1.OddsBoost, error) {
	boostID := strings.TrimSpace(request.OddsBoostID)
	userID := strings.TrimSpace(request.UserID)
	marketID := strings.TrimSpace(request.MarketID)
	selectionID := strings.TrimSpace(request.SelectionID)
	if boostID == "" || userID == "" || marketID == "" || selectionID == "" || request.StakeCents <= 0 || request.RequestedOdds <= 0 {
		return canonicalv1.OddsBoost{}, ErrOddsBoostInvalidRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	item, exists := s.items[boostID]
	if !exists {
		return canonicalv1.OddsBoost{}, ErrOddsBoostNotFound
	}
	if !strings.EqualFold(item.PlayerID, userID) {
		return canonicalv1.OddsBoost{}, ErrOddsBoostForbidden
	}

	now := s.now()
	if !item.ExpiresAt.After(now) {
		if item.Status == canonicalv1.OddsBoostStatusAvailable || item.Status == canonicalv1.OddsBoostStatusAccepted {
			item.Status = canonicalv1.OddsBoostStatusExpired
			item.UpdatedAt = now
			s.items[boostID] = item
		}
		return canonicalv1.OddsBoost{}, ErrOddsBoostNotAcceptable
	}
	if item.Status != canonicalv1.OddsBoostStatusAccepted {
		return canonicalv1.OddsBoost{}, ErrOddsBoostNotAcceptable
	}
	if !strings.EqualFold(item.MarketID, marketID) || !strings.EqualFold(item.SelectionID, selectionID) {
		return canonicalv1.OddsBoost{}, ErrOddsBoostNotAcceptable
	}
	if item.MaxStakeCents > 0 && request.StakeCents > item.MaxStakeCents {
		return canonicalv1.OddsBoost{}, ErrOddsBoostNotAcceptable
	}
	if item.MinOddsDecimal > 0 && request.RequestedOdds+0.0000001 < item.MinOddsDecimal {
		return canonicalv1.OddsBoost{}, ErrOddsBoostNotAcceptable
	}
	if item.BoostedOdds > 0 && !sameOdds(item.BoostedOdds, request.RequestedOdds) {
		return canonicalv1.OddsBoost{}, ErrOddsBoostNotAcceptable
	}
	return cloneOddsBoost(item), nil
}

func cloneOddsBoost(value canonicalv1.OddsBoost) canonicalv1.OddsBoost {
	out := value
	if value.AcceptedAt != nil {
		acceptedAt := value.AcceptedAt.UTC()
		out.AcceptedAt = &acceptedAt
	}
	return out
}

func sameOdds(left float64, right float64) bool {
	return math.Abs(left-right) <= 0.0000001
}
