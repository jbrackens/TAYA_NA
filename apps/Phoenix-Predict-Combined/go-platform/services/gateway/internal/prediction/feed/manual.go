package feed

import (
	"context"
	"encoding/json"
	"fmt"
)

// ManualAdapter handles markets that require admin-attested resolution.
// It does not auto-settle — it only validates params and signals that
// settlement must be done via the admin API.
type ManualAdapter struct{}

func (a *ManualAdapter) Name() string { return "admin-manual" }

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
