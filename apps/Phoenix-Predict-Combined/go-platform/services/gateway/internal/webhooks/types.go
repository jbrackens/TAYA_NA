// Package webhooks delivers signed outbound event notifications to partner
// endpoints (P3-03). Events are emitted post-commit — the same seam the WS
// notifier uses — and delivered at-least-once with exponential backoff; the
// receiver verifies the HMAC signature and dedupes on the delivery id.
//
// This file + signer.go + deliver.go are the transport engine (pure, no DB).
// Persistence (endpoint registry + delivery log), the dispatch worker, the
// commit-time hooks, and the admin API are layered on top.
package webhooks

import (
	"encoding/json"
	"time"
)

// Event types — stable strings, part of the partner-facing contract.
const (
	EventOrderFilled      = "order.filled"
	EventMarketSettled    = "market.settled"
	EventMarketVoided     = "market.voided"
	EventWithdrawalStatus = "withdrawal.status"
)

// KnownEventTypes is the canonical set, used to validate endpoint subscriptions.
var KnownEventTypes = map[string]bool{
	EventOrderFilled:      true,
	EventMarketSettled:    true,
	EventMarketVoided:     true,
	EventWithdrawalStatus: true,
}

// Event is one outbound webhook notification.
type Event struct {
	ID        string          `json:"id"`   // unique per delivery — receivers dedupe on this
	Type      string          `json:"type"` // one of the Event* constants
	CreatedAt time.Time       `json:"createdAt"`
	Data      json.RawMessage `json:"data"` // event-specific payload
}

// Endpoint is a partner's registered receiver.
type Endpoint struct {
	ID        string   // internal id
	PartnerID string   // the partner (api-key user) this endpoint belongs to
	URL       string   // https receiver
	Secret    string   // HMAC signing secret (shared with the partner)
	Events    []string // subscribed event types; empty = all
	Active    bool
}

// Wants reports whether this endpoint should receive the given event type.
func (e Endpoint) Wants(eventType string) bool {
	if !e.Active {
		return false
	}
	if len(e.Events) == 0 {
		return true // subscribe-all
	}
	for _, t := range e.Events {
		if t == eventType {
			return true
		}
	}
	return false
}
