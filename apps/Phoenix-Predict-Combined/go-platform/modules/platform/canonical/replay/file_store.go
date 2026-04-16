package replay

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

type FileStore struct {
	mu   sync.Mutex
	path string
}

func NewFileStore(path string) (*FileStore, error) {
	if path == "" {
		return nil, errors.New("checkpoint file path is required")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	return &FileStore{path: path}, nil
}

func (s *FileStore) Get(adapter string, stream canonicalv1.StreamType) (Checkpoint, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	store, err := s.readAll()
	if err != nil {
		return Checkpoint{}, err
	}

	key := checkpointKey(adapter, stream)
	checkpoint, found := store[key]
	if !found {
		return Checkpoint{}, ErrCheckpointNotFound
	}
	return checkpoint, nil
}

func (s *FileStore) Save(checkpoint Checkpoint) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	store, err := s.readAll()
	if err != nil {
		return err
	}

	store[checkpointKey(checkpoint.Adapter, checkpoint.Stream)] = checkpoint
	return s.writeAll(store)
}

func (s *FileStore) readAll() (map[string]Checkpoint, error) {
	raw, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return map[string]Checkpoint{}, nil
	}
	if err != nil {
		return nil, err
	}
	if len(bytes.TrimSpace(raw)) == 0 {
		return map[string]Checkpoint{}, nil
	}

	var store map[string]Checkpoint
	if err := json.Unmarshal(raw, &store); err != nil {
		return nil, fmt.Errorf("decode checkpoint store: %w", err)
	}
	if store == nil {
		store = map[string]Checkpoint{}
	}
	return store, nil
}

func (s *FileStore) writeAll(store map[string]Checkpoint) error {
	payload, err := json.MarshalIndent(store, "", "  ")
	if err != nil {
		return fmt.Errorf("encode checkpoint store: %w", err)
	}
	return os.WriteFile(s.path, payload, 0o644)
}
