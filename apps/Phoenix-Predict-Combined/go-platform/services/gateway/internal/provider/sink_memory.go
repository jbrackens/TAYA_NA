package provider

import (
	"context"
	"sync"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

type MemorySink struct {
	mu     sync.RWMutex
	events []canonicalv1.Envelope
}

func NewMemorySink() *MemorySink {
	return &MemorySink{
		events: []canonicalv1.Envelope{},
	}
}

func (s *MemorySink) Apply(_ context.Context, event canonicalv1.Envelope) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append(s.events, event)
	return nil
}

func (s *MemorySink) Snapshot() []canonicalv1.Envelope {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]canonicalv1.Envelope, len(s.events))
	copy(out, s.events)
	return out
}
