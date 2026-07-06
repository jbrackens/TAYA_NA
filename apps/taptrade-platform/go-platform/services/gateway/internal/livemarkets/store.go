package livemarkets

import (
	"sort"
	"sync"
	"time"
)

type Store struct {
	mu        sync.RWMutex
	events    map[string]Event
	providers map[string]ProviderStatus
	maxEvents int
}

func NewStore(maxEvents int) *Store {
	if maxEvents <= 0 {
		maxEvents = 100
	}
	return &Store{
		events:    map[string]Event{},
		providers: map[string]ProviderStatus{},
		maxEvents: maxEvents,
	}
}

func (s *Store) UpsertEvent(event Event) {
	if event.ID == "" {
		return
	}
	if event.UpdatedAt.IsZero() {
		event.UpdatedAt = time.Now().UTC()
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.events[event.ID] = event
	s.trimLocked()
}

func (s *Store) SetProvider(status ProviderStatus) {
	if status.Key == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.providers[status.Key] = status
}

func (s *Store) Snapshot() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()

	events := make([]Event, 0, len(s.events))
	for _, event := range s.events {
		events = append(events, event)
	}
	sortEvents(events)

	providers := make([]ProviderStatus, 0, len(s.providers))
	for _, provider := range s.providers {
		providers = append(providers, provider)
	}
	sort.Slice(providers, func(i, j int) bool {
		return providers[i].Key < providers[j].Key
	})

	return Snapshot{
		Events:    events,
		Providers: providers,
		Generated: time.Now().UTC(),
	}
}

func (s *Store) trimLocked() {
	if len(s.events) <= s.maxEvents {
		return
	}
	events := make([]Event, 0, len(s.events))
	for _, event := range s.events {
		events = append(events, event)
	}
	sortEvents(events)
	for _, event := range events[s.maxEvents:] {
		delete(s.events, event.ID)
	}
}

func sortEvents(events []Event) {
	sort.Slice(events, func(i, j int) bool {
		if events[i].Live != events[j].Live {
			return events[i].Live
		}
		if events[i].Ended != events[j].Ended {
			return !events[i].Ended
		}
		return events[i].UpdatedAt.After(events[j].UpdatedAt)
	})
}
