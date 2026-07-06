package v1

import (
	"encoding/json"
	"testing"
	"time"
)

func TestMatchTimelineJSONRoundTrip(t *testing.T) {
	now := time.Date(2026, time.March, 4, 13, 45, 0, 0, time.UTC)
	payload := MatchTimeline{
		FixtureID:    "f:local:001",
		Status:       FixtureStatusInPlay,
		Period:       "1H",
		ClockSeconds: 1335,
		Score: MatchScore{
			Home: 1,
			Away: 0,
		},
		Incidents: []MatchIncident{
			{
				IncidentID:   "inc:local:0001",
				FixtureID:    "f:local:001",
				Type:         MatchIncidentGoal,
				Period:       "1H",
				ClockSeconds: 1320,
				Score: MatchScore{
					Home: 1,
					Away: 0,
				},
				OccurredAt: now,
			},
		},
		UpdatedAt: now,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	var decoded MatchTimeline
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}

	if decoded.FixtureID != payload.FixtureID {
		t.Fatalf("expected fixtureId=%s, got %s", payload.FixtureID, decoded.FixtureID)
	}
	if decoded.Status != FixtureStatusInPlay {
		t.Fatalf("expected status=%s, got %s", FixtureStatusInPlay, decoded.Status)
	}
	if len(decoded.Incidents) != 1 {
		t.Fatalf("expected one incident, got %d", len(decoded.Incidents))
	}
	if decoded.Incidents[0].Type != MatchIncidentGoal {
		t.Fatalf("expected incident type=%s, got %s", MatchIncidentGoal, decoded.Incidents[0].Type)
	}
}

func TestMatchTrackerEntityConstant(t *testing.T) {
	if EntityMatchTracker == "" {
		t.Fatalf("expected match tracker entity constant to be non-empty")
	}
	if string(EntityMatchTracker) != "match_tracker" {
		t.Fatalf("unexpected match tracker entity value: %s", EntityMatchTracker)
	}
}
