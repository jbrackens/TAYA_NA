package replay

import (
	"errors"
	"path/filepath"
	"testing"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestFileStoreSaveAndGet(t *testing.T) {
	path := filepath.Join(t.TempDir(), "checkpoints.json")
	store, err := NewFileStore(path)
	if err != nil {
		t.Fatalf("expected file store initialization success, got: %v", err)
	}

	cp := Checkpoint{
		Adapter:   "betby",
		Stream:    canonicalv1.StreamDelta,
		Revision:  8,
		Sequence:  3,
		UpdatedAt: time.Now().UTC(),
	}
	if err := store.Save(cp); err != nil {
		t.Fatalf("expected save success, got: %v", err)
	}

	got, err := store.Get("betby", canonicalv1.StreamDelta)
	if err != nil {
		t.Fatalf("expected get success, got: %v", err)
	}
	if got.Revision != cp.Revision || got.Sequence != cp.Sequence {
		t.Fatalf("unexpected checkpoint values: %+v", got)
	}
}

func TestFileStoreGetNotFound(t *testing.T) {
	path := filepath.Join(t.TempDir(), "checkpoints.json")
	store, err := NewFileStore(path)
	if err != nil {
		t.Fatalf("expected file store initialization success, got: %v", err)
	}

	_, err = store.Get("odds88", canonicalv1.StreamDelta)
	if !errors.Is(err, ErrCheckpointNotFound) {
		t.Fatalf("expected ErrCheckpointNotFound, got: %v", err)
	}
}
