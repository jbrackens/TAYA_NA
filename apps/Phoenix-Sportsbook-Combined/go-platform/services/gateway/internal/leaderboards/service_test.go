package leaderboards

import (
	"testing"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestCreateAndListDefinitions(t *testing.T) {
	svc := NewService()

	created, err := svc.CreateDefinition(CreateDefinitionRequest{
		Slug:        "fastest-slip",
		Name:        "Fastest Slip",
		MetricKey:   "completion_seconds",
		EventType:   "challenge",
		RankingMode: canonicalv1.LeaderboardRankingModeMin,
		Order:       canonicalv1.LeaderboardOrderAscending,
		Status:      canonicalv1.LeaderboardStatusDraft,
		CreatedBy:   "admin-1",
	})
	if err != nil {
		t.Fatalf("create definition: %v", err)
	}
	if created.LeaderboardID == "" {
		t.Fatal("expected leaderboard id to be populated")
	}

	adminItems := svc.ListDefinitions(DefinitionFilter{}, true)
	if len(adminItems) < 3 {
		t.Fatalf("expected seeded + created leaderboards, got %d", len(adminItems))
	}

	playerItems := svc.ListDefinitions(DefinitionFilter{}, false)
	for _, item := range playerItems {
		if item.Status != canonicalv1.LeaderboardStatusActive {
			t.Fatalf("expected player list to exclude non-active leaderboards, saw status=%s", item.Status)
		}
	}
}

func TestStandingsRespectRankingModes(t *testing.T) {
	svc := &Service{
		definitions:         map[string]canonicalv1.LeaderboardDefinition{},
		eventsByLeaderboard: map[string][]canonicalv1.LeaderboardEvent{},
		eventByIdempotency:  map[string]canonicalv1.LeaderboardEvent{},
		now:                 func() time.Time { return time.Date(2026, time.April, 8, 15, 0, 0, 0, time.UTC) },
	}
	minBoard, err := svc.CreateDefinition(CreateDefinitionRequest{
		Name:        "Best Time",
		MetricKey:   "seconds",
		RankingMode: canonicalv1.LeaderboardRankingModeMin,
		Order:       canonicalv1.LeaderboardOrderAscending,
		Status:      canonicalv1.LeaderboardStatusActive,
		CreatedBy:   "admin-1",
	})
	if err != nil {
		t.Fatalf("create min leaderboard: %v", err)
	}
	maxBoard, err := svc.CreateDefinition(CreateDefinitionRequest{
		Name:        "Biggest Win",
		MetricKey:   "profit_cents",
		RankingMode: canonicalv1.LeaderboardRankingModeMax,
		Order:       canonicalv1.LeaderboardOrderDescending,
		Status:      canonicalv1.LeaderboardStatusActive,
		CreatedBy:   "admin-1",
	})
	if err != nil {
		t.Fatalf("create max leaderboard: %v", err)
	}

	_, _ = svc.RecordEvent(RecordEventRequest{LeaderboardID: minBoard.LeaderboardID, PlayerID: "u-1", Score: 85, IdempotencyKey: "min-1", RecordedAt: svc.now()})
	_, _ = svc.RecordEvent(RecordEventRequest{LeaderboardID: minBoard.LeaderboardID, PlayerID: "u-1", Score: 75, IdempotencyKey: "min-2", RecordedAt: svc.now().Add(time.Minute)})
	_, _ = svc.RecordEvent(RecordEventRequest{LeaderboardID: minBoard.LeaderboardID, PlayerID: "u-2", Score: 78, IdempotencyKey: "min-3", RecordedAt: svc.now().Add(2 * time.Minute)})

	_, _ = svc.RecordEvent(RecordEventRequest{LeaderboardID: maxBoard.LeaderboardID, PlayerID: "u-1", Score: 1250, IdempotencyKey: "max-1", RecordedAt: svc.now()})
	_, _ = svc.RecordEvent(RecordEventRequest{LeaderboardID: maxBoard.LeaderboardID, PlayerID: "u-2", Score: 1400, IdempotencyKey: "max-2", RecordedAt: svc.now().Add(time.Minute)})
	_, _ = svc.RecordEvent(RecordEventRequest{LeaderboardID: maxBoard.LeaderboardID, PlayerID: "u-1", Score: 1600, IdempotencyKey: "max-3", RecordedAt: svc.now().Add(2 * time.Minute)})

	minStandings, _, err := svc.Standings(minBoard.LeaderboardID, 10, 0)
	if err != nil {
		t.Fatalf("min standings: %v", err)
	}
	if minStandings[0].PlayerID != "u-1" || minStandings[0].Score != 75 {
		t.Fatalf("expected u-1 with best min score 75, got %#v", minStandings[0])
	}

	maxStandings, _, err := svc.Standings(maxBoard.LeaderboardID, 10, 0)
	if err != nil {
		t.Fatalf("max standings: %v", err)
	}
	if maxStandings[0].PlayerID != "u-1" || maxStandings[0].Score != 1600 {
		t.Fatalf("expected u-1 with best max score 1600, got %#v", maxStandings[0])
	}
}

func TestRecordEventIsIdempotentAndClosedLeaderboardsRejectWrites(t *testing.T) {
	svc := NewService()
	definition, err := svc.CreateDefinition(CreateDefinitionRequest{
		Name:        "Weekly Challenge",
		MetricKey:   "points",
		RankingMode: canonicalv1.LeaderboardRankingModeSum,
		Order:       canonicalv1.LeaderboardOrderDescending,
		Status:      canonicalv1.LeaderboardStatusActive,
		CreatedBy:   "admin-1",
	})
	if err != nil {
		t.Fatalf("create definition: %v", err)
	}

	first, err := svc.RecordEvent(RecordEventRequest{
		LeaderboardID:  definition.LeaderboardID,
		PlayerID:       "u-3",
		Score:          55,
		IdempotencyKey: "evt-1",
		RecordedAt:     time.Date(2026, time.April, 8, 16, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("record event: %v", err)
	}
	second, err := svc.RecordEvent(RecordEventRequest{
		LeaderboardID:  definition.LeaderboardID,
		PlayerID:       "u-3",
		Score:          88,
		IdempotencyKey: "evt-1",
		RecordedAt:     time.Date(2026, time.April, 8, 16, 1, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("record duplicate event: %v", err)
	}
	if first.EventID != second.EventID {
		t.Fatalf("expected same event to be returned on duplicate idempotency key")
	}

	updated, err := svc.UpdateDefinition(definition.LeaderboardID, CreateDefinitionRequest{
		Name:        definition.Name,
		MetricKey:   definition.MetricKey,
		RankingMode: definition.RankingMode,
		Order:       definition.Order,
		Status:      canonicalv1.LeaderboardStatusClosed,
		CreatedBy:   "admin-1",
	})
	if err != nil {
		t.Fatalf("close definition: %v", err)
	}
	if updated.Status != canonicalv1.LeaderboardStatusClosed {
		t.Fatalf("expected closed status, got %s", updated.Status)
	}

	_, err = svc.RecordEvent(RecordEventRequest{
		LeaderboardID:  definition.LeaderboardID,
		PlayerID:       "u-4",
		Score:          99,
		IdempotencyKey: "evt-closed",
		RecordedAt:     time.Date(2026, time.April, 8, 16, 2, 0, 0, time.UTC),
	})
	if err != ErrLeaderboardClosed {
		t.Fatalf("expected ErrLeaderboardClosed, got %v", err)
	}
}

func TestAccrueSettledBetPopulatesStakeAndProfitBoards(t *testing.T) {
	svc := NewService()

	err := svc.AccrueSettledBet(SettlementScoreRequest{
		PlayerID:         "u-score-1",
		BetID:            "bet:score:001",
		SettlementStatus: "settled_won",
		StakeCents:       1200,
		PayoutCents:      2400,
		SettledAt:        time.Date(2026, time.April, 8, 17, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("accrue settled bet: %v", err)
	}

	definitions := svc.ListDefinitions(DefinitionFilter{}, true)
	var profitBoardID string
	var stakeBoardID string
	for _, definition := range definitions {
		switch definition.MetricKey {
		case metricNetProfitCents:
			profitBoardID = definition.LeaderboardID
		case metricStakeCents:
			stakeBoardID = definition.LeaderboardID
		}
	}

	profitStandings, _, err := svc.Standings(profitBoardID, 20, 0)
	if err != nil {
		t.Fatalf("profit standings: %v", err)
	}
	foundProfit := false
	for _, standing := range profitStandings {
		if standing.PlayerID == "u-score-1" {
			foundProfit = true
			if standing.Score != 1200 {
				t.Fatalf("expected net profit score 1200, got %f", standing.Score)
			}
		}
	}
	if !foundProfit {
		t.Fatal("expected profit standings to include player")
	}

	stakeStandings, _, err := svc.Standings(stakeBoardID, 20, 0)
	if err != nil {
		t.Fatalf("stake standings: %v", err)
	}
	foundStake := false
	for _, standing := range stakeStandings {
		if standing.PlayerID == "u-score-1" {
			foundStake = true
			if standing.Score != 1200 {
				t.Fatalf("expected stake score 1200, got %f", standing.Score)
			}
			if standing.EventCount != 1 {
				t.Fatalf("expected one stake event, got %d", standing.EventCount)
			}
		}
	}
	if !foundStake {
		t.Fatal("expected stake standings to include player")
	}

	err = svc.AccrueSettledBet(SettlementScoreRequest{
		PlayerID:         "u-score-1",
		BetID:            "bet:score:001",
		SettlementStatus: "settled_won",
		StakeCents:       1200,
		PayoutCents:      2400,
		SettledAt:        time.Date(2026, time.April, 8, 17, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("idempotent accrue settled bet: %v", err)
	}

	stakeStandings, _, err = svc.Standings(stakeBoardID, 20, 0)
	if err != nil {
		t.Fatalf("stake standings after replay: %v", err)
	}
	for _, standing := range stakeStandings {
		if standing.PlayerID == "u-score-1" && standing.EventCount != 1 {
			t.Fatalf("expected event count 1 after replay, got %d", standing.EventCount)
		}
	}
}
