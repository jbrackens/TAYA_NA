package leaderboards

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

var (
	ErrInvalidRequest      = errors.New("invalid leaderboard request")
	ErrLeaderboardNotFound = errors.New("leaderboard not found")
	ErrLeaderboardConflict = errors.New("leaderboard conflict")
	ErrLeaderboardClosed   = errors.New("leaderboard is closed")
)

const (
	metricNetProfitCents        = "net_profit_cents"
	metricStakeCents            = "stake_cents"
	metricQualifiedReferrals    = "qualified_referrals"
	eventTypeSettledBet         = "settled_bet"
	eventTypeReferralConversion = "referral_conversion"
)

type DefinitionFilter struct {
	Status string
	Search string
}

type CreateDefinitionRequest struct {
	Slug           string
	Name           string
	Description    string
	MetricKey      string
	EventType      string
	RankingMode    canonicalv1.LeaderboardRankingMode
	Order          canonicalv1.LeaderboardOrder
	Status         canonicalv1.LeaderboardStatus
	Currency       string
	PrizeSummary   string
	WindowStartsAt *time.Time
	WindowEndsAt   *time.Time
	CreatedBy      string
}

type RecordEventRequest struct {
	LeaderboardID  string
	PlayerID       string
	Score          float64
	SourceType     string
	SourceID       string
	IdempotencyKey string
	Metadata       map[string]string
	RecordedAt     time.Time
}

type SettlementScoreRequest struct {
	PlayerID         string
	BetID            string
	SettlementStatus string
	StakeCents       int64
	PayoutCents      int64
	SettledAt        time.Time
}

type ReferralScoreRequest struct {
	ReferrerPlayerID string
	ReferralID       string
	ReferredPlayerID string
	QualifiedAt      time.Time
}

type Service struct {
	mu sync.RWMutex

	definitions         map[string]canonicalv1.LeaderboardDefinition
	eventsByLeaderboard map[string][]canonicalv1.LeaderboardEvent
	eventByIdempotency  map[string]canonicalv1.LeaderboardEvent
	leaderboardSequence int64
	eventSequence       int64
	now                 func() time.Time
}

func NewService() *Service {
	svc := &Service{
		definitions:         map[string]canonicalv1.LeaderboardDefinition{},
		eventsByLeaderboard: map[string][]canonicalv1.LeaderboardEvent{},
		eventByIdempotency:  map[string]canonicalv1.LeaderboardEvent{},
		now:                 func() time.Time { return time.Now().UTC() },
	}

	now := time.Date(2026, time.April, 8, 12, 0, 0, 0, time.UTC)
	weeklyStart := now.Add(-72 * time.Hour)
	weeklyEnd := now.Add(96 * time.Hour)
	profit, _ := svc.CreateDefinition(CreateDefinitionRequest{
		Slug:           "weekly-profit-race",
		Name:           "Weekly Profit Race",
		Description:    "Top net winners this week.",
		MetricKey:      metricNetProfitCents,
		EventType:      eventTypeSettledBet,
		RankingMode:    canonicalv1.LeaderboardRankingModeSum,
		Order:          canonicalv1.LeaderboardOrderDescending,
		Status:         canonicalv1.LeaderboardStatusActive,
		Currency:       "USD",
		PrizeSummary:   "Top 10 share a cash bonus.",
		WindowStartsAt: &weeklyStart,
		WindowEndsAt:   &weeklyEnd,
		CreatedBy:      "system",
	})
	staking, _ := svc.CreateDefinition(CreateDefinitionRequest{
		Slug:           "weekly-stake-ladder",
		Name:           "Weekly Stake Ladder",
		Description:    "Most qualified stake volume this week.",
		MetricKey:      metricStakeCents,
		EventType:      eventTypeSettledBet,
		RankingMode:    canonicalv1.LeaderboardRankingModeSum,
		Order:          canonicalv1.LeaderboardOrderDescending,
		Status:         canonicalv1.LeaderboardStatusActive,
		Currency:       "USD",
		PrizeSummary:   "VIP boosts for the top 25.",
		WindowStartsAt: &weeklyStart,
		WindowEndsAt:   &weeklyEnd,
		CreatedBy:      "system",
	})
	referrals, _ := svc.CreateDefinition(CreateDefinitionRequest{
		Slug:           "qualified-referral-race",
		Name:           "Qualified Referral Race",
		Description:    "Most qualified referrals in the current campaign window.",
		MetricKey:      metricQualifiedReferrals,
		EventType:      eventTypeReferralConversion,
		RankingMode:    canonicalv1.LeaderboardRankingModeSum,
		Order:          canonicalv1.LeaderboardOrderDescending,
		Status:         canonicalv1.LeaderboardStatusActive,
		PrizeSummary:   "Top referrers unlock campaign rewards.",
		WindowStartsAt: &weeklyStart,
		WindowEndsAt:   &weeklyEnd,
		CreatedBy:      "system",
	})
	_, _ = svc.RecordEvent(RecordEventRequest{
		LeaderboardID:  profit.LeaderboardID,
		PlayerID:       "u-1",
		Score:          125000,
		SourceType:     "bet_settlement",
		SourceID:       "bet:001",
		IdempotencyKey: "seed-profit-1",
		RecordedAt:     now.Add(-2 * time.Hour),
	})
	_, _ = svc.RecordEvent(RecordEventRequest{
		LeaderboardID:  profit.LeaderboardID,
		PlayerID:       "u-2",
		Score:          97500,
		SourceType:     "bet_settlement",
		SourceID:       "bet:002",
		IdempotencyKey: "seed-profit-2",
		RecordedAt:     now.Add(-90 * time.Minute),
	})
	_, _ = svc.RecordEvent(RecordEventRequest{
		LeaderboardID:  staking.LeaderboardID,
		PlayerID:       "u-2",
		Score:          350000,
		SourceType:     "bet_settlement",
		SourceID:       "bet:101",
		IdempotencyKey: "seed-stake-1",
		RecordedAt:     now.Add(-3 * time.Hour),
	})
	_, _ = svc.RecordEvent(RecordEventRequest{
		LeaderboardID:  staking.LeaderboardID,
		PlayerID:       "u-1",
		Score:          275000,
		SourceType:     "bet_settlement",
		SourceID:       "bet:102",
		IdempotencyKey: "seed-stake-2",
		RecordedAt:     now.Add(-70 * time.Minute),
	})
	_, _ = svc.RecordEvent(RecordEventRequest{
		LeaderboardID:  referrals.LeaderboardID,
		PlayerID:       "u-1",
		Score:          1,
		SourceType:     eventTypeReferralConversion,
		SourceID:       "ref:seed:001",
		IdempotencyKey: "seed-referral-1",
		RecordedAt:     now.Add(-50 * time.Minute),
	})
	return svc
}

func (s *Service) ListDefinitions(filter DefinitionFilter, includeDraft bool) []canonicalv1.LeaderboardDefinition {
	s.mu.RLock()
	defer s.mu.RUnlock()

	search := strings.ToLower(strings.TrimSpace(filter.Search))
	status := strings.ToLower(strings.TrimSpace(filter.Status))
	items := make([]canonicalv1.LeaderboardDefinition, 0, len(s.definitions))
	for _, definition := range s.definitions {
		if !includeDraft && definition.Status != canonicalv1.LeaderboardStatusActive {
			continue
		}
		if status != "" && strings.ToLower(string(definition.Status)) != status {
			continue
		}
		if search != "" &&
			!strings.Contains(strings.ToLower(definition.Name), search) &&
			!strings.Contains(strings.ToLower(definition.Description), search) &&
			!strings.Contains(strings.ToLower(definition.Slug), search) {
			continue
		}
		items = append(items, cloneDefinition(definition))
	}

	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Status == items[j].Status {
			return items[i].CreatedAt.After(items[j].CreatedAt)
		}
		if items[i].Status == canonicalv1.LeaderboardStatusActive {
			return true
		}
		if items[j].Status == canonicalv1.LeaderboardStatusActive {
			return false
		}
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	return items
}

func (s *Service) GetDefinition(id string) (canonicalv1.LeaderboardDefinition, bool) {
	id = strings.TrimSpace(id)
	if id == "" {
		return canonicalv1.LeaderboardDefinition{}, false
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	definition, ok := s.definitions[id]
	if !ok {
		return canonicalv1.LeaderboardDefinition{}, false
	}
	return cloneDefinition(definition), true
}

func (s *Service) CreateDefinition(request CreateDefinitionRequest) (canonicalv1.LeaderboardDefinition, error) {
	if err := validateDefinitionRequest(request); err != nil {
		return canonicalv1.LeaderboardDefinition{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.leaderboardSequence++
	now := s.now().UTC().Truncate(time.Second)
	status := request.Status
	if status == "" {
		status = canonicalv1.LeaderboardStatusDraft
	}
	definition := canonicalv1.LeaderboardDefinition{
		LeaderboardID:  fmt.Sprintf("lb:local:%06d", s.leaderboardSequence),
		Slug:           strings.TrimSpace(request.Slug),
		Name:           strings.TrimSpace(request.Name),
		Description:    strings.TrimSpace(request.Description),
		MetricKey:      strings.TrimSpace(request.MetricKey),
		EventType:      strings.TrimSpace(request.EventType),
		RankingMode:    request.RankingMode,
		Order:          request.Order,
		Status:         status,
		Currency:       strings.TrimSpace(request.Currency),
		PrizeSummary:   strings.TrimSpace(request.PrizeSummary),
		WindowStartsAt: cloneTime(request.WindowStartsAt),
		WindowEndsAt:   cloneTime(request.WindowEndsAt),
		CreatedBy:      strings.TrimSpace(request.CreatedBy),
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	s.definitions[definition.LeaderboardID] = definition
	return cloneDefinition(definition), nil
}

func (s *Service) UpdateDefinition(id string, request CreateDefinitionRequest) (canonicalv1.LeaderboardDefinition, error) {
	if err := validateDefinitionRequest(request); err != nil {
		return canonicalv1.LeaderboardDefinition{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.definitions[strings.TrimSpace(id)]
	if !ok {
		return canonicalv1.LeaderboardDefinition{}, ErrLeaderboardNotFound
	}
	existing.Slug = strings.TrimSpace(request.Slug)
	existing.Name = strings.TrimSpace(request.Name)
	existing.Description = strings.TrimSpace(request.Description)
	existing.MetricKey = strings.TrimSpace(request.MetricKey)
	existing.EventType = strings.TrimSpace(request.EventType)
	existing.RankingMode = request.RankingMode
	existing.Order = request.Order
	existing.Status = request.Status
	existing.Currency = strings.TrimSpace(request.Currency)
	existing.PrizeSummary = strings.TrimSpace(request.PrizeSummary)
	existing.WindowStartsAt = cloneTime(request.WindowStartsAt)
	existing.WindowEndsAt = cloneTime(request.WindowEndsAt)
	existing.UpdatedAt = s.now().UTC().Truncate(time.Second)
	s.definitions[existing.LeaderboardID] = existing
	return cloneDefinition(existing), nil
}

func (s *Service) RecordEvent(request RecordEventRequest) (canonicalv1.LeaderboardEvent, error) {
	leaderboardID := strings.TrimSpace(request.LeaderboardID)
	playerID := strings.TrimSpace(request.PlayerID)
	if leaderboardID == "" || playerID == "" {
		return canonicalv1.LeaderboardEvent{}, ErrInvalidRequest
	}
	if request.IdempotencyKey == "" {
		return canonicalv1.LeaderboardEvent{}, ErrInvalidRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	definition, ok := s.definitions[leaderboardID]
	if !ok {
		return canonicalv1.LeaderboardEvent{}, ErrLeaderboardNotFound
	}
	if definition.Status == canonicalv1.LeaderboardStatusClosed {
		return canonicalv1.LeaderboardEvent{}, ErrLeaderboardClosed
	}
	if existing, ok := s.eventByIdempotency[request.IdempotencyKey]; ok {
		return cloneEvent(existing), nil
	}

	recordedAt := request.RecordedAt.UTC().Truncate(time.Second)
	if recordedAt.IsZero() {
		recordedAt = s.now().UTC().Truncate(time.Second)
	}
	s.eventSequence++
	event := canonicalv1.LeaderboardEvent{
		EventID:        fmt.Sprintf("lbe:local:%06d", s.eventSequence),
		LeaderboardID:  leaderboardID,
		PlayerID:       playerID,
		Score:          request.Score,
		SourceType:     strings.TrimSpace(request.SourceType),
		SourceID:       strings.TrimSpace(request.SourceID),
		IdempotencyKey: strings.TrimSpace(request.IdempotencyKey),
		Metadata:       cloneStringMap(request.Metadata),
		RecordedAt:     recordedAt,
	}
	s.eventsByLeaderboard[leaderboardID] = append(s.eventsByLeaderboard[leaderboardID], event)
	s.eventByIdempotency[event.IdempotencyKey] = event
	definition.LastComputedAt = cloneTime(&recordedAt)
	definition.UpdatedAt = s.now().UTC().Truncate(time.Second)
	s.definitions[leaderboardID] = definition
	return cloneEvent(event), nil
}

func (s *Service) Standings(id string, limit, offset int) ([]canonicalv1.LeaderboardStanding, canonicalv1.LeaderboardDefinition, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, canonicalv1.LeaderboardDefinition{}, ErrInvalidRequest
	}
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	definition, ok := s.definitions[id]
	if !ok {
		return nil, canonicalv1.LeaderboardDefinition{}, ErrLeaderboardNotFound
	}
	standings := computeStandings(definition, s.eventsByLeaderboard[id])
	if offset >= len(standings) {
		return []canonicalv1.LeaderboardStanding{}, cloneDefinition(definition), nil
	}
	end := offset + limit
	if end > len(standings) {
		end = len(standings)
	}
	out := make([]canonicalv1.LeaderboardStanding, end-offset)
	copy(out, standings[offset:end])
	return out, cloneDefinition(definition), nil
}

func (s *Service) Recompute(id string) (canonicalv1.LeaderboardDefinition, []canonicalv1.LeaderboardStanding, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return canonicalv1.LeaderboardDefinition{}, nil, ErrInvalidRequest
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	definition, ok := s.definitions[id]
	if !ok {
		return canonicalv1.LeaderboardDefinition{}, nil, ErrLeaderboardNotFound
	}
	now := s.now().UTC().Truncate(time.Second)
	definition.LastComputedAt = &now
	definition.UpdatedAt = now
	s.definitions[id] = definition
	return cloneDefinition(definition), computeStandings(definition, s.eventsByLeaderboard[id]), nil
}

func (s *Service) AccrueSettledBet(request SettlementScoreRequest) error {
	playerID := strings.TrimSpace(request.PlayerID)
	betID := strings.TrimSpace(request.BetID)
	if playerID == "" || betID == "" || request.StakeCents <= 0 {
		return ErrInvalidRequest
	}

	status := strings.ToLower(strings.TrimSpace(request.SettlementStatus))
	if status != "settled_won" && status != "settled_lost" {
		return ErrInvalidRequest
	}

	recordedAt := request.SettledAt.UTC().Truncate(time.Second)
	if recordedAt.IsZero() {
		recordedAt = s.now().UTC().Truncate(time.Second)
	}

	s.mu.RLock()
	definitions := make([]canonicalv1.LeaderboardDefinition, 0, len(s.definitions))
	for _, definition := range s.definitions {
		if definition.Status != canonicalv1.LeaderboardStatusActive {
			continue
		}
		if definition.EventType != "" && definition.EventType != eventTypeSettledBet {
			continue
		}
		switch definition.MetricKey {
		case metricNetProfitCents, metricStakeCents:
			definitions = append(definitions, cloneDefinition(definition))
		}
	}
	s.mu.RUnlock()

	netProfit := float64(-request.StakeCents)
	if status == "settled_won" {
		netProfit = float64(request.PayoutCents - request.StakeCents)
	}

	for _, definition := range definitions {
		score := 0.0
		switch definition.MetricKey {
		case metricStakeCents:
			score = float64(request.StakeCents)
		case metricNetProfitCents:
			score = netProfit
		default:
			continue
		}

		if _, err := s.RecordEvent(RecordEventRequest{
			LeaderboardID:  definition.LeaderboardID,
			PlayerID:       playerID,
			Score:          score,
			SourceType:     eventTypeSettledBet,
			SourceID:       betID,
			IdempotencyKey: fmt.Sprintf("leaderboard:%s:%s:%s", definition.LeaderboardID, eventTypeSettledBet, betID),
			Metadata: map[string]string{
				"betId":            betID,
				"settlementStatus": status,
			},
			RecordedAt: recordedAt,
		}); err != nil {
			return err
		}
	}

	return nil
}

func (s *Service) AccrueQualifiedReferral(request ReferralScoreRequest) error {
	referrerID := strings.TrimSpace(request.ReferrerPlayerID)
	referralID := strings.TrimSpace(request.ReferralID)
	referredID := strings.TrimSpace(request.ReferredPlayerID)
	if referrerID == "" || referralID == "" || referredID == "" {
		return ErrInvalidRequest
	}

	recordedAt := request.QualifiedAt.UTC().Truncate(time.Second)
	if recordedAt.IsZero() {
		recordedAt = s.now().UTC().Truncate(time.Second)
	}

	s.mu.RLock()
	definitions := make([]canonicalv1.LeaderboardDefinition, 0, len(s.definitions))
	for _, definition := range s.definitions {
		if definition.Status != canonicalv1.LeaderboardStatusActive {
			continue
		}
		if definition.EventType != "" && definition.EventType != eventTypeReferralConversion {
			continue
		}
		if definition.MetricKey == metricQualifiedReferrals {
			definitions = append(definitions, cloneDefinition(definition))
		}
	}
	s.mu.RUnlock()

	for _, definition := range definitions {
		if _, err := s.RecordEvent(RecordEventRequest{
			LeaderboardID:  definition.LeaderboardID,
			PlayerID:       referrerID,
			Score:          1,
			SourceType:     eventTypeReferralConversion,
			SourceID:       referralID,
			IdempotencyKey: fmt.Sprintf("leaderboard:%s:%s:%s", definition.LeaderboardID, eventTypeReferralConversion, referralID),
			Metadata: map[string]string{
				"referredPlayerId": referredID,
				"referralId":       referralID,
			},
			RecordedAt: recordedAt,
		}); err != nil {
			return err
		}
	}

	return nil
}

func computeStandings(definition canonicalv1.LeaderboardDefinition, events []canonicalv1.LeaderboardEvent) []canonicalv1.LeaderboardStanding {
	if len(events) == 0 {
		return nil
	}

	type aggregate struct {
		standing canonicalv1.LeaderboardStanding
	}

	byPlayer := make(map[string]*aggregate, len(events))
	for _, event := range events {
		entry, ok := byPlayer[event.PlayerID]
		if !ok {
			entry = &aggregate{
				standing: canonicalv1.LeaderboardStanding{
					LeaderboardID: definition.LeaderboardID,
					PlayerID:      event.PlayerID,
					Score:         event.Score,
					EventCount:    0,
					Metadata:      cloneStringMap(event.Metadata),
				},
			}
			lastEventAt := event.RecordedAt
			entry.standing.LastEventAt = &lastEventAt
			byPlayer[event.PlayerID] = entry
		}

		switch definition.RankingMode {
		case canonicalv1.LeaderboardRankingModeMin:
			if entry.standing.EventCount == 0 || event.Score < entry.standing.Score {
				entry.standing.Score = event.Score
			}
		case canonicalv1.LeaderboardRankingModeMax:
			if entry.standing.EventCount == 0 || event.Score > entry.standing.Score {
				entry.standing.Score = event.Score
			}
		default:
			if entry.standing.EventCount == 0 {
				entry.standing.Score = 0
			}
			entry.standing.Score += event.Score
		}

		entry.standing.EventCount++
		if entry.standing.LastEventAt == nil || event.RecordedAt.After(*entry.standing.LastEventAt) {
			lastEventAt := event.RecordedAt
			entry.standing.LastEventAt = &lastEventAt
		}
	}

	standings := make([]canonicalv1.LeaderboardStanding, 0, len(byPlayer))
	for _, item := range byPlayer {
		standings = append(standings, item.standing)
	}

	sort.SliceStable(standings, func(i, j int) bool {
		if standings[i].Score != standings[j].Score {
			if definition.Order == canonicalv1.LeaderboardOrderAscending {
				return standings[i].Score < standings[j].Score
			}
			return standings[i].Score > standings[j].Score
		}
		if standings[i].LastEventAt != nil && standings[j].LastEventAt != nil && !standings[i].LastEventAt.Equal(*standings[j].LastEventAt) {
			return standings[i].LastEventAt.Before(*standings[j].LastEventAt)
		}
		return standings[i].PlayerID < standings[j].PlayerID
	})

	for i := range standings {
		standings[i].Rank = i + 1
	}
	return standings
}

func validateDefinitionRequest(request CreateDefinitionRequest) error {
	if strings.TrimSpace(request.Name) == "" || strings.TrimSpace(request.MetricKey) == "" {
		return ErrInvalidRequest
	}
	switch request.RankingMode {
	case canonicalv1.LeaderboardRankingModeSum, canonicalv1.LeaderboardRankingModeMin, canonicalv1.LeaderboardRankingModeMax:
	default:
		return ErrInvalidRequest
	}
	switch request.Order {
	case canonicalv1.LeaderboardOrderAscending, canonicalv1.LeaderboardOrderDescending:
	default:
		return ErrInvalidRequest
	}
	if request.Status == "" {
		request.Status = canonicalv1.LeaderboardStatusDraft
	}
	switch request.Status {
	case canonicalv1.LeaderboardStatusDraft, canonicalv1.LeaderboardStatusActive, canonicalv1.LeaderboardStatusClosed:
	default:
		return ErrInvalidRequest
	}
	if request.WindowStartsAt != nil && request.WindowEndsAt != nil && request.WindowEndsAt.Before(*request.WindowStartsAt) {
		return ErrInvalidRequest
	}
	return nil
}

func cloneDefinition(in canonicalv1.LeaderboardDefinition) canonicalv1.LeaderboardDefinition {
	out := in
	out.WindowStartsAt = cloneTime(in.WindowStartsAt)
	out.WindowEndsAt = cloneTime(in.WindowEndsAt)
	out.LastComputedAt = cloneTime(in.LastComputedAt)
	return out
}

func cloneEvent(in canonicalv1.LeaderboardEvent) canonicalv1.LeaderboardEvent {
	out := in
	out.Metadata = cloneStringMap(in.Metadata)
	return out
}

func cloneTime(in *time.Time) *time.Time {
	if in == nil {
		return nil
	}
	t := in.UTC().Truncate(time.Second)
	return &t
}

func cloneStringMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}
