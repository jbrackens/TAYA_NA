package feed

import (
	"context"
	"encoding/json"
	"time"
)

// Adapter defines the interface for resolving prediction market outcomes
// from external data sources. Each adapter handles a specific settlement source type.
type Adapter interface {
	// Name returns the settlement source key this adapter handles.
	Name() string

	// CanSettle returns true if this adapter can resolve the given market.
	CanSettle(rule string, params json.RawMessage) bool

	// FetchResult queries the external source and returns the settlement result.
	// Returns nil result if the source data is not yet available.
	FetchResult(ctx context.Context, rule string, params json.RawMessage) (*Result, error)

	// ValidateParams checks whether the settlement params are valid for this adapter.
	ValidateParams(rule string, params json.RawMessage) error
}

// Result is the outcome from a feed adapter query.
type Result struct {
	Outcome    string          `json:"outcome"`    // "yes" or "no"
	Confidence float64         `json:"confidence"` // 0.0-1.0
	SourceData json.RawMessage `json:"sourceData"` // raw data from the source
	Digest     string          `json:"digest"`     // SHA256 of source data
	FetchedAt  time.Time       `json:"fetchedAt"`
}

// Registry holds all registered feed adapters keyed by source name.
type Registry struct {
	adapters map[string]Adapter
}

// NewRegistry creates a new adapter registry.
func NewRegistry() *Registry {
	return &Registry{adapters: make(map[string]Adapter)}
}

// Register adds an adapter to the registry.
func (r *Registry) Register(adapter Adapter) {
	r.adapters[adapter.Name()] = adapter
}

// Get returns the adapter for a given source key, or nil if not found.
func (r *Registry) Get(sourceKey string) Adapter {
	return r.adapters[sourceKey]
}

// List returns all registered adapter names.
func (r *Registry) List() []string {
	names := make([]string, 0, len(r.adapters))
	for name := range r.adapters {
		names = append(names, name)
	}
	return names
}
