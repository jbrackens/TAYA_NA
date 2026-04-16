package v1

import (
	"encoding/json"
	"testing"
	"time"
)

func TestLeaderboardDefinitionJSONRoundTrip(t *testing.T) {
	now := time.Date(2026, time.April, 8, 14, 0, 0, 0, time.UTC)
	startsAt := now.Add(-7 * 24 * time.Hour)
	endsAt := now.Add(24 * time.Hour)
	lastComputedAt := now.Add(-15 * time.Minute)
	payload := LeaderboardDefinition{
		LeaderboardID:  "lb:local:001",
		Slug:           "weekly-profit",
		Name:           "Weekly Profit Race",
		Description:    "Top net winners for the current week.",
		MetricKey:      "net_profit_cents",
		EventType:      "settled_bet",
		RankingMode:    LeaderboardRankingModeSum,
		Order:          LeaderboardOrderDescending,
		Status:         LeaderboardStatusActive,
		Currency:       "USD",
		PrizeSummary:   "Top 10 share a 5,000 USD prize pool.",
		WindowStartsAt: &startsAt,
		WindowEndsAt:   &endsAt,
		LastComputedAt: &lastComputedAt,
		CreatedBy:      "admin-1",
		CreatedAt:      now.Add(-8 * 24 * time.Hour),
		UpdatedAt:      now,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	var decoded LeaderboardDefinition
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}

	if decoded.RankingMode != LeaderboardRankingModeSum {
		t.Fatalf("expected rankingMode=%s, got %s", LeaderboardRankingModeSum, decoded.RankingMode)
	}
	if decoded.Order != LeaderboardOrderDescending {
		t.Fatalf("expected order=%s, got %s", LeaderboardOrderDescending, decoded.Order)
	}
	if decoded.Status != LeaderboardStatusActive {
		t.Fatalf("expected status=%s, got %s", LeaderboardStatusActive, decoded.Status)
	}
}

func TestLeaderboardStandingJSONRoundTrip(t *testing.T) {
	now := time.Date(2026, time.April, 8, 14, 30, 0, 0, time.UTC)
	payload := LeaderboardStanding{
		LeaderboardID: "lb:local:001",
		PlayerID:      "u-1",
		Rank:          1,
		Score:         1250.5,
		EventCount:    4,
		LastEventAt:   &now,
		Metadata: map[string]string{
			"displayName": "Player One",
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	var decoded LeaderboardStanding
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}

	if decoded.Rank != 1 {
		t.Fatalf("expected rank=1, got %d", decoded.Rank)
	}
	if decoded.Score != 1250.5 {
		t.Fatalf("expected score=1250.5, got %f", decoded.Score)
	}
}

func TestLeaderboardEntityConstants(t *testing.T) {
	if EntityLeaderboard == "" {
		t.Fatal("expected leaderboard entity constant to be non-empty")
	}
	if string(EntityLeaderboard) != "leaderboard" {
		t.Fatalf("unexpected leaderboard entity value: %s", EntityLeaderboard)
	}
	if EntityLeaderboardEvent == "" {
		t.Fatal("expected leaderboard event entity constant to be non-empty")
	}
	if string(EntityLeaderboardEvent) != "leaderboard_event" {
		t.Fatalf("unexpected leaderboard event entity value: %s", EntityLeaderboardEvent)
	}
	if EntityLeaderboardStanding == "" {
		t.Fatal("expected leaderboard standing entity constant to be non-empty")
	}
	if string(EntityLeaderboardStanding) != "leaderboard_standing" {
		t.Fatalf("unexpected leaderboard standing entity value: %s", EntityLeaderboardStanding)
	}
}
