package v1

import (
	"encoding/json"
	"testing"
	"time"
)

func TestFixtureStatsJSONRoundTrip(t *testing.T) {
	now := time.Date(2026, time.March, 4, 16, 0, 0, 0, time.UTC)
	payload := FixtureStats{
		FixtureID:    "f:local:001",
		Status:       FixtureStatusInPlay,
		Period:       "2H",
		ClockSeconds: 3780,
		Metrics: map[string]FixtureStatPair{
			"possession_pct":  {Home: 54.2, Away: 45.8, Unit: "percent"},
			"shots_on_target": {Home: 6, Away: 3},
			"corners":         {Home: 7, Away: 2},
		},
		UpdatedAt: now,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	var decoded FixtureStats
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}

	if decoded.FixtureID != payload.FixtureID {
		t.Fatalf("expected fixtureId=%s, got %s", payload.FixtureID, decoded.FixtureID)
	}
	if decoded.Status != FixtureStatusInPlay {
		t.Fatalf("expected status=%s, got %s", FixtureStatusInPlay, decoded.Status)
	}
	if decoded.Metrics["corners"].Home != 7 {
		t.Fatalf("expected corners home=7, got %v", decoded.Metrics["corners"].Home)
	}
}

func TestFixtureStatsEntityConstant(t *testing.T) {
	if EntityFixtureStats == "" {
		t.Fatalf("expected fixture stats entity constant to be non-empty")
	}
	if string(EntityFixtureStats) != "fixture_stats" {
		t.Fatalf("unexpected fixture stats entity value: %s", EntityFixtureStats)
	}
}
