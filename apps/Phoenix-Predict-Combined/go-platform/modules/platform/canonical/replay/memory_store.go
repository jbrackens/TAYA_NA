package replay

import (
	"strings"
	"sync"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

type MemoryStore struct {
	mu          sync.RWMutex
	checkpoints map[string]Checkpoint
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		checkpoints: map[string]Checkpoint{},
	}
}

func (s *MemoryStore) Get(adapter string, stream canonicalv1.StreamType) (Checkpoint, error) {
	key := checkpointKey(adapter, stream)
	s.mu.RLock()
	defer s.mu.RUnlock()

	cp, found := s.checkpoints[key]
	if !found {
		return Checkpoint{}, ErrCheckpointNotFound
	}
	return cp, nil
}

func (s *MemoryStore) Save(checkpoint Checkpoint) error {
	key := checkpointKey(checkpoint.Adapter, checkpoint.Stream)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.checkpoints[key] = checkpoint
	return nil
}

func checkpointKey(adapter string, stream canonicalv1.StreamType) string {
	return strings.TrimSpace(strings.ToLower(adapter)) + "|" + strings.TrimSpace(strings.ToLower(string(stream)))
}
