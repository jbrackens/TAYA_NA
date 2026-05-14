package feed

import (
	"context"
	"encoding/json"
	"fmt"
)

// ManualAdapter handles markets that require admin-attested resolution.
// It does not auto-settle — it only validates params and signals that
// settlement must be done via the admin API.
//
// Two source keys point at the same behavior: 'admin-manual' is the
// canonical name today, and 'manual' is the historical key still
// present on 137 base-seed markets. Both routes are non-auto by design
// (CanSettle=false), so wiring both to this adapter silences the
// every-tick "auto-settler: no adapter for source" WARN spam that
// would otherwise fire for every legacy market on every settler tick.
//
// Register both names via separate New() calls in handlers.go; the
// Registry deduplicates by Name(), not by adapter identity.
type ManualAdapter struct {
	name string
}

// NewManualAdapter constructs a ManualAdapter under the given source key.
// Use this to register both 'manual' and 'admin-manual' against the same
// behavior.
func NewManualAdapter(name string) *ManualAdapter {
	if name == "" {
		name = "admin-manual"
	}
	return &ManualAdapter{name: name}
}

func (a *ManualAdapter) Name() string {
	if a.name == "" {
		return "admin-manual"
	}
	return a.name
}

func (a *ManualAdapter) CanSettle(rule string, params json.RawMessage) bool {
	// Manual adapter doesn't auto-settle — resolution comes from admin API
	return false
}

func (a *ManualAdapter) FetchResult(ctx context.Context, rule string, params json.RawMessage) (*Result, error) {
	return nil, fmt.Errorf("manual adapter does not support auto-settlement; use admin API to resolve")
}

func (a *ManualAdapter) ValidateParams(rule string, params json.RawMessage) error {
	// Manual markets accept any params — the admin decides the outcome
	return nil
}
