package replay

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestMemoryStoreGetSave(t *testing.T) {
	store := NewMemoryStore()
	_, err := store.Get("odds88", canonicalv1.StreamDelta)
	if !errors.Is(err, ErrCheckpointNotFound) {
		t.Fatalf("expected ErrCheckpointNotFound, got: %v", err)
	}

	cp := Checkpoint{
		Adapter:   "odds88",
		Stream:    canonicalv1.StreamDelta,
		Revision:  12,
		Sequence:  4,
		UpdatedAt: time.Now().UTC(),
	}
	if err := store.Save(cp); err != nil {
		t.Fatalf("expected save success, got: %v", err)
	}

	got, err := store.Get("odds88", canonicalv1.StreamDelta)
	if err != nil {
		t.Fatalf("expected get success, got: %v", err)
	}
	if got.Revision != cp.Revision || got.Sequence != cp.Sequence {
		t.Fatalf("unexpected checkpoint: %+v", got)
	}
}

func TestReplayAppliesSortedAndUpdatesCheckpoint(t *testing.T) {
	store := NewMemoryStore()
	engine := NewEngine(store)

	events := []canonicalv1.Envelope{
		mustEvent(t, 2, 1),
		mustEvent(t, 1, 2),
		mustEvent(t, 1, 1),
	}

	var appliedOrder []string
	result, err := engine.Replay(context.Background(), "odds88", canonicalv1.StreamDelta, events, func(_ context.Context, event canonicalv1.Envelope) error {
		appliedOrder = append(appliedOrder, fmt.Sprintf("%d:%d", event.Revision, event.Sequence))
		return nil
	})
	if err != nil {
		t.Fatalf("expected replay to succeed, got: %v", err)
	}

	if result.Applied != 3 || result.Skipped != 0 {
		t.Fatalf("expected applied=3 skipped=0, got applied=%d skipped=%d", result.Applied, result.Skipped)
	}
	want := []string{"1:1", "1:2", "2:1"}
	if fmt.Sprint(appliedOrder) != fmt.Sprint(want) {
		t.Fatalf("expected applied order %v, got %v", want, appliedOrder)
	}

	cp, err := store.Get("odds88", canonicalv1.StreamDelta)
	if err != nil {
		t.Fatalf("expected checkpoint in store, got: %v", err)
	}
	if cp.Revision != 2 || cp.Sequence != 1 {
		t.Fatalf("expected checkpoint 2/1, got %d/%d", cp.Revision, cp.Sequence)
	}
}

func TestReplaySkipsOldEvents(t *testing.T) {
	store := NewMemoryStore()
	_ = store.Save(Checkpoint{
		Adapter:   "odds88",
		Stream:    canonicalv1.StreamDelta,
		Revision:  1,
		Sequence:  2,
		UpdatedAt: time.Now().UTC(),
	})
	engine := NewEngine(store)

	events := []canonicalv1.Envelope{
		mustEvent(t, 1, 1),
		mustEvent(t, 1, 2),
		mustEvent(t, 1, 3),
		mustEvent(t, 2, 1),
	}

	result, err := engine.Replay(context.Background(), "odds88", canonicalv1.StreamDelta, events, func(_ context.Context, _ canonicalv1.Envelope) error {
		return nil
	})
	if err != nil {
		t.Fatalf("expected replay to succeed, got: %v", err)
	}
	if result.Applied != 2 || result.Skipped != 2 {
		t.Fatalf("expected applied=2 skipped=2, got applied=%d skipped=%d", result.Applied, result.Skipped)
	}
}

func TestReplayStopsOnApplyError(t *testing.T) {
	store := NewMemoryStore()
	engine := NewEngine(store)
	events := []canonicalv1.Envelope{
		mustEvent(t, 1, 1),
		mustEvent(t, 1, 2),
	}

	_, err := engine.Replay(context.Background(), "odds88", canonicalv1.StreamDelta, events, func(_ context.Context, event canonicalv1.Envelope) error {
		if event.Sequence == 2 {
			return errors.New("boom")
		}
		return nil
	})
	if err == nil {
		t.Fatal("expected replay apply to fail")
	}
	if !errors.Is(err, ErrReplayApplyFailed) {
		t.Fatalf("expected ErrReplayApplyFailed, got: %v", err)
	}

	cp, err := store.Get("odds88", canonicalv1.StreamDelta)
	if err != nil {
		t.Fatalf("expected checkpoint to be persisted for first event, got: %v", err)
	}
	if cp.Revision != 1 || cp.Sequence != 1 {
		t.Fatalf("expected checkpoint 1/1 after partial replay, got %d/%d", cp.Revision, cp.Sequence)
	}
}

func mustEvent(t *testing.T, revision int64, sequence int64) canonicalv1.Envelope {
	t.Helper()
	now := time.Date(2026, 3, 4, 12, 0, 0, 0, time.UTC).Add(time.Duration(sequence) * time.Second)
	event, err := canonicalv1.NewEnvelope(
		canonicalv1.ProviderRef{Name: "odds88", Feed: "delta"},
		canonicalv1.StreamDelta,
		revision,
		sequence,
		canonicalv1.EntityFixture,
		canonicalv1.ActionUpsert,
		now,
		canonicalv1.Fixture{
			FixtureID: "fixture-1",
			SportID:   "sport-1",
			Name:      "fixture",
			StartsAt:  now.Add(time.Hour),
			Status:    canonicalv1.FixtureStatusScheduled,
			UpdatedAt: now,
		},
	)
	if err != nil {
		t.Fatalf("expected event creation to succeed, got: %v", err)
	}
	return event
}
