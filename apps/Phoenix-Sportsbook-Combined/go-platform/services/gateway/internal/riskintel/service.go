package riskintel

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"phoenix-revival/gateway/internal/bets"
	"phoenix-revival/gateway/internal/domain"
)

const defaultModelVersion = "risk-intel-v1"

type RankingRequest struct {
	UserID    string
	FixtureID string
	Limit     int
}

type RankedMarket struct {
	Rank      int      `json:"rank"`
	MarketID  string   `json:"marketId"`
	FixtureID string   `json:"fixtureId"`
	Name      string   `json:"name"`
	Status    string   `json:"status"`
	StartsAt  string   `json:"startsAt"`
	Score     float64  `json:"score"`
	Reasons   []string `json:"reasons"`
}

type ComboSuggestionRequest struct {
	UserID string
	Limit  int
}

type ComboSuggestionLeg struct {
	MarketID    string `json:"marketId"`
	FixtureID   string `json:"fixtureId"`
	SelectionID string `json:"selectionId"`
}

type ComboSuggestion struct {
	SuggestionID string               `json:"suggestionId"`
	UserID       string               `json:"userId,omitempty"`
	Label        string               `json:"label"`
	Eligible     bool                 `json:"eligible"`
	Confidence   int                  `json:"confidence"`
	FeatureFlags []string             `json:"featureFlags"`
	Explanation  string               `json:"explanation"`
	GeneratedAt  string               `json:"generatedAt"`
	Legs         []ComboSuggestionLeg `json:"legs"`
}

type PlayerScore struct {
	UserID       string             `json:"userId"`
	ChurnScore   float64            `json:"churnScore"`
	LTVScore     float64            `json:"ltvScore"`
	RiskScore    float64            `json:"riskScore"`
	ModelVersion string             `json:"modelVersion"`
	GeneratedAt  string             `json:"generatedAt"`
	Features     map[string]float64 `json:"features"`
}

type RiskSignal struct {
	Code        string  `json:"code"`
	Severity    string  `json:"severity"`
	Score       float64 `json:"score"`
	Description string  `json:"description"`
	TriggeredAt string  `json:"triggeredAt"`
}

type RiskSegmentOverride struct {
	SegmentID string `json:"segmentId"`
	Reason    string `json:"reason"`
	SetBy     string `json:"setBy"`
	SetAt     string `json:"setAt"`
	ExpiresAt string `json:"expiresAt,omitempty"`
}

type RiskSegmentProfile struct {
	UserID             string               `json:"userId"`
	SegmentID          string               `json:"segmentId"`
	SegmentReason      string               `json:"segmentReason"`
	RiskScore          float64              `json:"riskScore"`
	SuspiciousSignals  []RiskSignal         `json:"suspiciousSignals"`
	Score              PlayerScore          `json:"score"`
	Override           *RiskSegmentOverride `json:"override,omitempty"`
	GeneratedAt        string               `json:"generatedAt"`
	HasManualOverride  bool                 `json:"hasManualOverride"`
	AutomationStrategy string               `json:"automationStrategy"`
}

type SetOverrideRequest struct {
	SegmentID string
	Reason    string
	Operator  string
	ExpiresAt *time.Time
}

type Service struct {
	mu sync.RWMutex

	repository domain.ReadRepository
	betService *bets.Service

	overrides map[string]RiskSegmentOverride

	modelVersion string
	now          func() time.Time
}

func NewService(repository domain.ReadRepository, betService *bets.Service) *Service {
	return &Service{
		repository:   repository,
		betService:   betService,
		overrides:    map[string]RiskSegmentOverride{},
		modelVersion: defaultModelVersion,
		now:          func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) RankMarkets(request RankingRequest) ([]RankedMarket, error) {
	limit := normalizeLimit(request.Limit, 10, 100)
	filter := domain.MarketFilter{
		FixtureID: strings.TrimSpace(request.FixtureID),
		Status:    "open",
	}
	markets, _, err := s.repository.ListMarkets(filter, domain.PageRequest{
		Page:     1,
		PageSize: 200,
		SortBy:   "startsAt",
		SortDir:  "asc",
	})
	if err != nil {
		return nil, err
	}

	affinityByMarket, affinityByFixture := s.marketAffinities(strings.TrimSpace(request.UserID))
	now := s.now()
	ranked := make([]RankedMarket, 0, len(markets))
	for _, market := range markets {
		score, reasons := scoreMarket(now, market, affinityByMarket[market.ID], affinityByFixture[market.FixtureID])
		ranked = append(ranked, RankedMarket{
			MarketID:  market.ID,
			FixtureID: market.FixtureID,
			Name:      market.Name,
			Status:    market.Status,
			StartsAt:  market.StartsAt,
			Score:     score,
			Reasons:   reasons,
		})
	}

	sort.SliceStable(ranked, func(i, j int) bool {
		if ranked[i].Score == ranked[j].Score {
			if ranked[i].StartsAt == ranked[j].StartsAt {
				return ranked[i].MarketID < ranked[j].MarketID
			}
			return ranked[i].StartsAt < ranked[j].StartsAt
		}
		return ranked[i].Score > ranked[j].Score
	})

	if len(ranked) > limit {
		ranked = ranked[:limit]
	}
	for index := range ranked {
		ranked[index].Rank = index + 1
	}
	return ranked, nil
}

func (s *Service) SuggestCombos(request ComboSuggestionRequest) ([]ComboSuggestion, error) {
	limit := normalizeLimit(request.Limit, 6, 30)
	ranked, err := s.RankMarkets(RankingRequest{
		UserID: strings.TrimSpace(request.UserID),
		Limit:  limit * 4,
	})
	if err != nil {
		return nil, err
	}

	now := s.now().Format(time.RFC3339)
	out := make([]ComboSuggestion, 0, limit)
	for i := 0; i < len(ranked) && len(out) < limit; i++ {
		for j := i + 1; j < len(ranked) && len(out) < limit; j++ {
			left := ranked[i]
			right := ranked[j]
			if left.MarketID == right.MarketID {
				continue
			}

			leftMarket, err := s.repository.GetMarketByID(left.MarketID)
			if err != nil {
				continue
			}
			rightMarket, err := s.repository.GetMarketByID(right.MarketID)
			if err != nil {
				continue
			}

			leftSelection, ok := firstActiveSelection(leftMarket)
			if !ok {
				continue
			}
			rightSelection, ok := firstActiveSelection(rightMarket)
			if !ok {
				continue
			}

			featureFlags := []string{"combo_suggestion_v1"}
			if strings.EqualFold(left.FixtureID, right.FixtureID) {
				featureFlags = append(featureFlags, "same_fixture")
			} else {
				featureFlags = append(featureFlags, "cross_fixture")
			}
			if left.Score >= 75 || right.Score >= 75 {
				featureFlags = append(featureFlags, "affinity_boost")
			}

			confidence := int(math.Round((left.Score + right.Score) / 2))
			if confidence > 99 {
				confidence = 99
			}
			if confidence < 10 {
				confidence = 10
			}

			out = append(out, ComboSuggestion{
				SuggestionID: fmt.Sprintf("combo:%s:%s", left.MarketID, right.MarketID),
				UserID:       strings.TrimSpace(request.UserID),
				Label:        fmt.Sprintf("%s + %s", left.Name, right.Name),
				Eligible:     true,
				Confidence:   confidence,
				FeatureFlags: featureFlags,
				Explanation:  fmt.Sprintf("Weighted by market ranks %d and %d", left.Rank, right.Rank),
				GeneratedAt:  now,
				Legs: []ComboSuggestionLeg{
					{
						MarketID:    left.MarketID,
						FixtureID:   left.FixtureID,
						SelectionID: leftSelection.ID,
					},
					{
						MarketID:    right.MarketID,
						FixtureID:   right.FixtureID,
						SelectionID: rightSelection.ID,
					},
				},
			})
		}
	}

	return out, nil
}

func (s *Service) PlayerScore(userID string) (PlayerScore, error) {
	trimmedUserID := strings.TrimSpace(userID)
	if trimmedUserID == "" {
		return PlayerScore{}, fmt.Errorf("userId is required")
	}

	events := s.userEvents(trimmedUserID)
	now := s.now()

	var (
		placedCount       float64
		cancelledCount    float64
		refundedCount     float64
		settledCount      float64
		totalStakeCents   float64
		lastActivityAt    time.Time
		hasLastActivityAt bool
	)
	for _, event := range events {
		if occurredAt, ok := parseEventTime(event.OccurredAt); ok {
			if !hasLastActivityAt || occurredAt.After(lastActivityAt) {
				lastActivityAt = occurredAt
				hasLastActivityAt = true
			}
		}

		switch strings.ToLower(strings.TrimSpace(event.Action)) {
		case "bet.placed":
			placedCount++
			fields := parseDetailFields(event.Details)
			if rawStake := strings.TrimSpace(fields["stakeCents"]); rawStake != "" {
				if parsedStake, err := strconv.ParseInt(rawStake, 10, 64); err == nil && parsedStake > 0 {
					totalStakeCents += float64(parsedStake)
				}
			}
		case "bet.cancelled":
			cancelledCount++
		case "bet.refunded":
			refundedCount++
		case "bet.settled", "bet.cashed_out":
			settledCount++
		}
	}

	daysSinceActivity := 30.0
	if hasLastActivityAt {
		daysSinceActivity = now.Sub(lastActivityAt).Hours() / 24
		if daysSinceActivity < 0 {
			daysSinceActivity = 0
		}
	}

	cancelRatio := safeRatio(cancelledCount+refundedCount, placedCount)
	avgStake := safeRatio(totalStakeCents, placedCount)

	churnScore := clampScore(daysSinceActivity*2.8 + safeRatio(12, placedCount+1)*6)
	ltvScore := clampScore(20 + math.Log10(totalStakeCents+1)*22 + settledCount*2.5)
	riskScore := clampScore(cancelRatio*100*0.7 + safeRatio(avgStake, 1000)*6 + safeRatio(daysSinceActivity, 2)*5)

	return PlayerScore{
		UserID:       trimmedUserID,
		ChurnScore:   roundToSingleDecimal(churnScore),
		LTVScore:     roundToSingleDecimal(ltvScore),
		RiskScore:    roundToSingleDecimal(riskScore),
		ModelVersion: s.modelVersion,
		GeneratedAt:  now.Format(time.RFC3339),
		Features: map[string]float64{
			"placedCount":       placedCount,
			"settledCount":      settledCount,
			"cancelledCount":    cancelledCount,
			"refundedCount":     refundedCount,
			"cancelRatio":       roundToSingleDecimal(cancelRatio),
			"averageStakeCents": roundToSingleDecimal(avgStake),
			"daysSinceActivity": roundToSingleDecimal(daysSinceActivity),
			"totalStakeCents":   totalStakeCents,
		},
	}, nil
}

func (s *Service) RiskSegment(userID string) (RiskSegmentProfile, error) {
	score, err := s.PlayerScore(userID)
	if err != nil {
		return RiskSegmentProfile{}, err
	}

	segmentID, segmentReason := automatedSegment(score)
	signals := suspiciousSignals(score)

	override := s.activeOverrideForUser(score.UserID)
	hasManualOverride := false
	if override != nil {
		segmentID = override.SegmentID
		segmentReason = fmt.Sprintf("manual override: %s", strings.TrimSpace(override.Reason))
		hasManualOverride = true
	}

	return RiskSegmentProfile{
		UserID:             score.UserID,
		SegmentID:          segmentID,
		SegmentReason:      segmentReason,
		RiskScore:          score.RiskScore,
		SuspiciousSignals:  signals,
		Score:              score,
		Override:           override,
		GeneratedAt:        s.now().Format(time.RFC3339),
		HasManualOverride:  hasManualOverride,
		AutomationStrategy: "hybrid_rules_v1",
	}, nil
}

func (s *Service) RiskSegments(userID string, limit int) ([]RiskSegmentProfile, error) {
	trimmedUserID := strings.TrimSpace(userID)
	if trimmedUserID != "" {
		item, err := s.RiskSegment(trimmedUserID)
		if err != nil {
			return nil, err
		}
		return []RiskSegmentProfile{item}, nil
	}

	userIDs := s.discoverRiskUsers()
	normalizedLimit := normalizeLimit(limit, 20, 200)
	if len(userIDs) > normalizedLimit {
		userIDs = userIDs[:normalizedLimit]
	}

	out := make([]RiskSegmentProfile, 0, len(userIDs))
	for _, candidate := range userIDs {
		profile, err := s.RiskSegment(candidate)
		if err != nil {
			continue
		}
		out = append(out, profile)
	}
	return out, nil
}

func (s *Service) SetRiskSegmentOverride(userID string, request SetOverrideRequest) (RiskSegmentOverride, error) {
	trimmedUserID := strings.TrimSpace(userID)
	if trimmedUserID == "" {
		return RiskSegmentOverride{}, fmt.Errorf("userId is required")
	}
	segmentID := strings.TrimSpace(request.SegmentID)
	if segmentID == "" {
		return RiskSegmentOverride{}, fmt.Errorf("segmentId is required")
	}

	operator := strings.TrimSpace(request.Operator)
	if operator == "" {
		operator = "admin"
	}
	now := s.now()
	override := RiskSegmentOverride{
		SegmentID: segmentID,
		Reason:    strings.TrimSpace(request.Reason),
		SetBy:     operator,
		SetAt:     now.Format(time.RFC3339),
	}
	if request.ExpiresAt != nil {
		override.ExpiresAt = request.ExpiresAt.UTC().Format(time.RFC3339)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.overrides[trimmedUserID] = override
	return override, nil
}

func (s *Service) activeOverrideForUser(userID string) *RiskSegmentOverride {
	s.mu.Lock()
	defer s.mu.Unlock()

	override, ok := s.overrides[userID]
	if !ok {
		return nil
	}

	if strings.TrimSpace(override.ExpiresAt) != "" {
		if parsed, err := time.Parse(time.RFC3339, override.ExpiresAt); err == nil {
			if s.now().After(parsed) {
				delete(s.overrides, userID)
				return nil
			}
		}
	}

	out := override
	return &out
}

func (s *Service) discoverRiskUsers() []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, 32)

	if s.betService != nil {
		events, err := s.betService.ListEvents(2000)
		if err == nil {
			for _, event := range events {
				userID := strings.TrimSpace(event.UserID)
				if userID == "" {
					continue
				}
				if _, exists := seen[userID]; exists {
					continue
				}
				seen[userID] = struct{}{}
				out = append(out, userID)
			}
		}
	}

	punters, _, err := s.repository.ListPunters(domain.PunterFilter{}, domain.PageRequest{
		Page:     1,
		PageSize: 200,
		SortBy:   "createdAt",
		SortDir:  "asc",
	})
	if err == nil {
		for _, punter := range punters {
			userID := strings.TrimSpace(punter.ID)
			if userID == "" {
				continue
			}
			if _, exists := seen[userID]; exists {
				continue
			}
			seen[userID] = struct{}{}
			out = append(out, userID)
		}
	}

	sort.Strings(out)
	return out
}

func (s *Service) userEvents(userID string) []bets.BetEvent {
	if s.betService == nil {
		return []bets.BetEvent{}
	}
	events, err := s.betService.ListEvents(2000)
	if err != nil {
		return []bets.BetEvent{}
	}

	out := make([]bets.BetEvent, 0, len(events))
	for _, event := range events {
		if strings.EqualFold(strings.TrimSpace(event.UserID), userID) {
			out = append(out, event)
		}
	}
	return out
}

func (s *Service) marketAffinities(userID string) (map[string]int, map[string]int) {
	affinityByMarket := map[string]int{}
	affinityByFixture := map[string]int{}
	if userID == "" || s.betService == nil {
		return affinityByMarket, affinityByFixture
	}

	events, err := s.betService.ListEvents(2000)
	if err != nil {
		return affinityByMarket, affinityByFixture
	}

	marketToFixture := map[string]string{}
	markets, _, marketErr := s.repository.ListMarkets(domain.MarketFilter{}, domain.PageRequest{
		Page:     1,
		PageSize: 500,
		SortBy:   "startsAt",
		SortDir:  "asc",
	})
	if marketErr == nil {
		for _, market := range markets {
			marketToFixture[market.ID] = market.FixtureID
		}
	}

	for _, event := range events {
		if !strings.EqualFold(strings.TrimSpace(event.UserID), userID) {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(event.Action), "bet.placed") {
			continue
		}
		fields := parseDetailFields(event.Details)
		marketID := strings.TrimSpace(fields["marketId"])
		if marketID == "" {
			continue
		}
		affinityByMarket[marketID]++

		fixtureID := strings.TrimSpace(marketToFixture[marketID])
		if fixtureID != "" {
			affinityByFixture[fixtureID]++
		}
	}

	return affinityByMarket, affinityByFixture
}

func scoreMarket(now time.Time, market domain.Market, marketAffinity int, fixtureAffinity int) (float64, []string) {
	score := 40.0
	reasons := make([]string, 0, 6)

	if strings.EqualFold(strings.TrimSpace(market.Status), "open") {
		score += 30
		reasons = append(reasons, "market_open")
	} else {
		score -= 15
		reasons = append(reasons, "market_not_open")
	}

	if startsAt, ok := parseEventTime(market.StartsAt); ok {
		hoursToStart := startsAt.Sub(now).Hours()
		if hoursToStart >= 0 {
			boost := clampScore((24-hoursToStart)*1.2) / 3
			if boost > 0 {
				score += boost
				reasons = append(reasons, "near_start")
			}
		}
	}

	if marketAffinity > 0 {
		score += float64(minInt(20, marketAffinity*5))
		reasons = append(reasons, "market_affinity")
	}
	if fixtureAffinity > 0 {
		score += float64(minInt(12, fixtureAffinity*3))
		reasons = append(reasons, "fixture_affinity")
	}
	if strings.Contains(strings.ToLower(strings.TrimSpace(market.Name)), "live") {
		score += 4
		reasons = append(reasons, "live_context")
	}

	return roundToSingleDecimal(score), reasons
}

func suspiciousSignals(score PlayerScore) []RiskSignal {
	signals := make([]RiskSignal, 0, 3)
	now := score.GeneratedAt
	cancelRatio := score.Features["cancelRatio"]
	averageStake := score.Features["averageStakeCents"]
	daysSinceActivity := score.Features["daysSinceActivity"]

	if cancelRatio >= 0.35 {
		signals = append(signals, RiskSignal{
			Code:        "high_cancel_ratio",
			Severity:    "high",
			Score:       roundToSingleDecimal(cancelRatio * 100),
			Description: "High ratio of cancelled/refunded bets",
			TriggeredAt: now,
		})
	}
	if averageStake >= 25000 {
		signals = append(signals, RiskSignal{
			Code:        "high_stake_velocity",
			Severity:    "medium",
			Score:       roundToSingleDecimal(averageStake),
			Description: "Average stake is above medium-risk threshold",
			TriggeredAt: now,
		})
	}
	if daysSinceActivity >= 21 {
		signals = append(signals, RiskSignal{
			Code:        "activity_gap",
			Severity:    "medium",
			Score:       roundToSingleDecimal(daysSinceActivity),
			Description: "Player has a long activity gap",
			TriggeredAt: now,
		})
	}
	return signals
}

func automatedSegment(score PlayerScore) (string, string) {
	if score.RiskScore >= 75 {
		return "high_risk_watchlist", "risk score above 75"
	}
	if score.RiskScore >= 50 {
		return "medium_risk_monitor", "risk score above 50"
	}
	if score.ChurnScore >= 70 {
		return "churn_watch", "churn score above 70"
	}
	if score.LTVScore >= 70 {
		return "vip_value", "high projected lifetime value"
	}
	return "standard", "default segment from baseline model"
}

func firstActiveSelection(market domain.Market) (domain.MarketSelection, bool) {
	for _, selection := range market.Selections {
		if selection.Active {
			return selection, true
		}
	}
	if len(market.Selections) > 0 {
		return market.Selections[0], true
	}
	return domain.MarketSelection{}, false
}

func parseDetailFields(details string) map[string]string {
	out := map[string]string{}
	for _, token := range strings.Fields(strings.TrimSpace(details)) {
		parts := strings.SplitN(token, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		if key == "" || value == "" {
			continue
		}
		out[key] = value
	}
	return out
}

func parseEventTime(raw string) (time.Time, bool) {
	layouts := []string{time.RFC3339Nano, time.RFC3339, "2006-01-02 15:04:05-07:00", "2006-01-02 15:04:05-07"}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, strings.TrimSpace(raw)); err == nil {
			return parsed.UTC(), true
		}
	}
	return time.Time{}, false
}

func normalizeLimit(value int, fallback int, maxValue int) int {
	if value <= 0 {
		value = fallback
	}
	if value > maxValue {
		value = maxValue
	}
	return value
}

func roundToSingleDecimal(value float64) float64 {
	return math.Round(value*10) / 10
}

func safeRatio(numerator float64, denominator float64) float64 {
	if denominator <= 0 {
		return 0
	}
	return numerator / denominator
}

func clampScore(value float64) float64 {
	if value < 0 {
		return 0
	}
	if value > 100 {
		return 100
	}
	return value
}

func minInt(a int, b int) int {
	if a < b {
		return a
	}
	return b
}
