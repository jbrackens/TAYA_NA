package livemarkets

import (
	"testing"
	"time"
)

func TestParseSportsEvents(t *testing.T) {
	now := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	events := parseSportsEvents([]byte(`{
		"type":"sport_result",
		"payload":{
			"game_id":"match-1",
			"sport":"basketball",
			"league":"NBA",
			"home_team":"Liberty",
			"away_team":"Aces",
			"home_score":82,
			"away_score":79,
			"period":"Q4",
			"clock":"02:14",
			"status":"in_progress",
			"updated_at":"2026-06-02T11:59:30Z"
		}
	}`), now)

	if len(events) != 1 {
		t.Fatalf("events = %d, want 1", len(events))
	}
	event := events[0]
	if event.ID != "match-1" || event.HomeTeam != "Liberty" || event.AwayTeam != "Aces" {
		t.Fatalf("unexpected event identity: %+v", event)
	}
	if event.Score != "82-79" || !event.Live || event.Ended {
		t.Fatalf("unexpected event state: %+v", event)
	}
	if event.UpdatedAt.Format(time.RFC3339) != "2026-06-02T11:59:30Z" {
		t.Fatalf("updatedAt = %s", event.UpdatedAt.Format(time.RFC3339))
	}
}

func TestStoreSnapshotSortsLiveFirst(t *testing.T) {
	store := NewStore(10)
	old := time.Date(2026, 6, 2, 11, 0, 0, 0, time.UTC)
	newer := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	store.UpsertEvent(Event{ID: "ended", Ended: true, UpdatedAt: newer})
	store.UpsertEvent(Event{ID: "live", Live: true, UpdatedAt: old})

	snapshot := store.Snapshot()
	if len(snapshot.Events) != 2 {
		t.Fatalf("events = %d, want 2", len(snapshot.Events))
	}
	if snapshot.Events[0].ID != "live" {
		t.Fatalf("first event = %q, want live", snapshot.Events[0].ID)
	}
}
