package matchtracker

import (
	"testing"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestServiceUpsertTimelineAndGet(t *testing.T) {
	service := NewService()
	updatedAt := time.Date(2026, 3, 4, 12, 20, 0, 0, time.UTC)
	ok := service.UpsertTimeline(canonicalv1.MatchTimeline{
		FixtureID:    "f:local:001",
		Status:       canonicalv1.FixtureStatusInPlay,
		Period:       "1H",
		ClockSeconds: 1230,
		Score: canonicalv1.MatchScore{
			Home: 1,
			Away: 0,
		},
		UpdatedAt: updatedAt,
		Incidents: []canonicalv1.MatchIncident{
			{
				IncidentID:   "inc:1",
				FixtureID:    "f:local:001",
				Type:         canonicalv1.MatchIncidentGoal,
				ClockSeconds: 1220,
				Score: canonicalv1.MatchScore{
					Home: 1,
					Away: 0,
				},
				OccurredAt: updatedAt,
			},
		},
	})
	if !ok {
		t.Fatal("expected timeline upsert to succeed")
	}

	timeline, exists := service.GetTimeline("f:local:001")
	if !exists {
		t.Fatal("expected timeline to exist")
	}
	if timeline.Status != canonicalv1.FixtureStatusInPlay {
		t.Fatalf("expected in_play status, got %s", timeline.Status)
	}
	if len(timeline.Incidents) != 1 {
		t.Fatalf("expected one incident, got %d", len(timeline.Incidents))
	}
}

func TestServiceApplyIncidentReplacesDuplicateIncidentID(t *testing.T) {
	service := NewService()
	base := time.Date(2026, 3, 4, 12, 0, 0, 0, time.UTC)
	if !service.ApplyIncident(canonicalv1.MatchIncident{
		IncidentID:   "inc:goal:1",
		FixtureID:    "f:local:001",
		Type:         canonicalv1.MatchIncidentGoal,
		ClockSeconds: 900,
		Score: canonicalv1.MatchScore{
			Home: 1,
			Away: 0,
		},
		OccurredAt: base,
	}, base) {
		t.Fatal("expected first incident apply to succeed")
	}
	if !service.ApplyIncident(canonicalv1.MatchIncident{
		IncidentID:   "inc:goal:1",
		FixtureID:    "f:local:001",
		Type:         canonicalv1.MatchIncidentGoal,
		ClockSeconds: 905,
		Score: canonicalv1.MatchScore{
			Home: 2,
			Away: 0,
		},
		OccurredAt: base.Add(1 * time.Minute),
	}, base.Add(1*time.Minute)) {
		t.Fatal("expected duplicate incident apply to succeed")
	}

	timeline, exists := service.GetTimeline("f:local:001")
	if !exists {
		t.Fatal("expected timeline to exist")
	}
	if len(timeline.Incidents) != 1 {
		t.Fatalf("expected deduped incidents length 1, got %d", len(timeline.Incidents))
	}
	if timeline.Incidents[0].ClockSeconds != 905 {
		t.Fatalf("expected updated incident clock=905, got %d", timeline.Incidents[0].ClockSeconds)
	}
	if timeline.Score.Home != 2 || timeline.Score.Away != 0 {
		t.Fatalf("expected timeline score 2-0, got %d-%d", timeline.Score.Home, timeline.Score.Away)
	}
}
