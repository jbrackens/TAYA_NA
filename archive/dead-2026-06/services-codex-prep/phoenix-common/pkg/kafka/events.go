package kafka

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Event represents a domain event that flows through the system via Kafka.
// It wraps application events with metadata for tracing and routing.
type Event struct {
	// ID is a unique identifier for this event instance (UUID v4).
	ID string `json:"id"`
	// Type is the event type identifier (e.g., "user.created", "bet.placed").
	Type string `json:"type"`
	// Source is the service or component that emitted this event.
	Source string `json:"source"`
	// Timestamp is when the event was created in UTC.
	Timestamp time.Time `json:"timestamp"`
	// Data contains the event payload as raw JSON.
	Data json.RawMessage `json:"data"`
}

// NewEvent creates a new Event instance with the specified type, source, and data.
// The data parameter can be any struct that is JSON-serializable.
// It automatically generates a UUID and sets the timestamp to now.
func NewEvent(eventType, source string, data any) (*Event, error) {
	// Marshal data to JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal event data: %w", err)
	}

	return &Event{
		ID:        uuid.New().String(),
		Type:      eventType,
		Source:    source,
		Timestamp: time.Now().UTC(),
		Data:      json.RawMessage(jsonData),
	}, nil
}

// UnmarshalData unmarshals the Data field into the provided target struct.
// This is a convenience method for deserializing the event payload.
func (e *Event) UnmarshalData(target any) error {
	if err := json.Unmarshal(e.Data, target); err != nil {
		return fmt.Errorf("failed to unmarshal event data: %w", err)
	}
	return nil
}

// String returns a string representation of the event.
func (e *Event) String() string {
	return fmt.Sprintf("Event{ID: %s, Type: %s, Source: %s, Timestamp: %s}",
		e.ID, e.Type, e.Source, e.Timestamp.Format(time.RFC3339))
}

// MarshalJSON implements custom JSON marshaling for the Event.
func (e *Event) MarshalJSON() ([]byte, error) {
	type Alias Event
	return json.Marshal(&struct {
		Timestamp string `json:"timestamp"`
		*Alias
	}{
		Timestamp: e.Timestamp.Format(time.RFC3339),
		Alias:     (*Alias)(e),
	})
}

// UnmarshalJSON implements custom JSON unmarshaling for the Event.
func (e *Event) UnmarshalJSON(data []byte) error {
	type Alias Event
	aux := &struct {
		Timestamp string `json:"timestamp"`
		*Alias
	}{
		Alias: (*Alias)(e),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return fmt.Errorf("failed to unmarshal event: %w", err)
	}

	t, err := time.Parse(time.RFC3339, aux.Timestamp)
	if err != nil {
		return fmt.Errorf("failed to parse timestamp: %w", err)
	}
	e.Timestamp = t

	return nil
}

// Common Event Types for the Phoenix system
const (
	// User domain events
	EventUserCreated     = "user.created"
	EventUserUpdated     = "user.updated"
	EventUserDeleted     = "user.deleted"
	EventUserKYCApproved = "user.kyc_approved"
	EventUserKYCRejected = "user.kyc_rejected"
	EventUserBlocked     = "user.blocked"
	EventUserUnblocked   = "user.unblocked"

	// Wallet domain events
	EventWalletCreated       = "wallet.created"
	EventWalletUpdated       = "wallet.updated"
	EventDepositReceived     = "deposit.received"
	EventWithdrawalRequested = "withdrawal.requested"
	EventWithdrawalCompleted = "withdrawal.completed"
	EventWalletFrozen        = "wallet.frozen"
	EventWalletUnfrozen      = "wallet.unfrozen"

	// Market domain events
	EventMarketCreated  = "market.created"
	EventMarketUpdated  = "market.updated"
	EventMarketClosed   = "market.closed"
	EventMarketSettled  = "market.settled"
	EventMarketVoided   = "market.voided"
	EventOutcomeCreated = "outcome.created"

	// Bet domain events
	EventBetPlaced      = "bet.placed"
	EventBetCancelled   = "bet.cancelled"
	EventBetSettledWin  = "bet.settled_win"
	EventBetSettledLoss = "bet.settled_loss"
	EventBetVoided      = "bet.voided"

	// System events
	EventHealthCheck   = "system.health_check"
	EventConfigUpdated = "system.config_updated"
)

// EventPayload represents the base structure for event data payloads.
type EventPayload struct {
	// EntityID is the primary identifier of the entity being changed.
	EntityID string `json:"entity_id"`
	// Timestamp is when the change occurred (may differ from Event.Timestamp).
	Timestamp time.Time `json:"timestamp"`
	// Version is an optimistic locking version or sequence number.
	Version int64 `json:"version,omitempty"`
	// Metadata contains additional context about the change.
	Metadata map[string]string `json:"metadata,omitempty"`
}

// UserCreatedPayload is the payload for user.created events.
type UserCreatedPayload struct {
	EventPayload
	Email    string `json:"email"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

// BetPlacedPayload is the payload for bet.placed events.
type BetPlacedPayload struct {
	EventPayload
	UserID    string `json:"user_id"`
	MarketID  string `json:"market_id"`
	OutcomeID string `json:"outcome_id"`
	Stake     string `json:"stake"` // decimal as string
	Odds      string `json:"odds"`  // decimal as string
	BetID     string `json:"bet_id"`
}

// BetSettledPayload is the payload for bet settlement events.
type BetSettledPayload struct {
	EventPayload
	BetID     string `json:"bet_id"`
	UserID    string `json:"user_id"`
	MarketID  string `json:"market_id"`
	OutcomeID string `json:"outcome_id"`
	Status    string `json:"status"` // settled_win, settled_loss, voided
	Stake     string `json:"stake"`
	Payout    string `json:"payout"`
}

// TransactionPayload is the payload for wallet transaction events.
type TransactionPayload struct {
	EventPayload
	WalletID      string `json:"wallet_id"`
	UserID        string `json:"user_id"`
	Type          string `json:"type"` // deposit, withdrawal, bet_place, etc.
	Amount        string `json:"amount"`
	BalanceBefore string `json:"balance_before"`
	BalanceAfter  string `json:"balance_after"`
	Reference     string `json:"reference"`
}
