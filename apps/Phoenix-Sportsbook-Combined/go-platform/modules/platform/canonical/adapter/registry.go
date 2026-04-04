package adapter

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

var (
	ErrNilAdapter         = errors.New("adapter is nil")
	ErrAdapterNameMissing = errors.New("adapter name is empty")
	ErrAdapterExists      = errors.New("adapter already registered")
	ErrAdapterNotFound    = errors.New("adapter not found")
	ErrIncompatibleSchema = errors.New("adapter schema is not compatible with canonical v1")
)

type Registry struct {
	mu       sync.RWMutex
	adapters map[string]ProviderAdapter
}

func NewRegistry(initial ...ProviderAdapter) (*Registry, error) {
	registry := &Registry{
		adapters: map[string]ProviderAdapter{},
	}
	for _, adapter := range initial {
		if err := registry.Register(adapter); err != nil {
			return nil, err
		}
	}
	return registry, nil
}

func (r *Registry) Register(adapter ProviderAdapter) error {
	if adapter == nil {
		return ErrNilAdapter
	}

	name := strings.TrimSpace(strings.ToLower(adapter.Name()))
	if name == "" {
		return ErrAdapterNameMissing
	}
	if !canonicalv1.IsCompatible(adapter.CanonicalSchema().Version) {
		return fmt.Errorf("%w: adapter=%s version=%s", ErrIncompatibleSchema, name, adapter.CanonicalSchema().Version)
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.adapters[name]; exists {
		return fmt.Errorf("%w: %s", ErrAdapterExists, name)
	}
	r.adapters[name] = adapter
	return nil
}

func (r *Registry) Get(name string) (ProviderAdapter, error) {
	key := strings.TrimSpace(strings.ToLower(name))
	r.mu.RLock()
	defer r.mu.RUnlock()

	adapter, found := r.adapters[key]
	if !found {
		return nil, fmt.Errorf("%w: %s", ErrAdapterNotFound, key)
	}
	return adapter, nil
}

func (r *Registry) Names() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	names := make([]string, 0, len(r.adapters))
	for name := range r.adapters {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}
