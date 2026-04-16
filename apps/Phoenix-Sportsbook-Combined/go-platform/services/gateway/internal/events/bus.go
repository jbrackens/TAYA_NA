// Package events provides an in-process publish/subscribe event bus.
// This is intentionally simple — a single-instance gateway does not need
// distributed messaging. The Bus can be swapped to a Kafka-backed
// implementation later without changing callers.
package events

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"
)

// Event represents a domain event published through the bus.
type Event struct {
	Type      string          `json:"type"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp time.Time       `json:"timestamp"`
	UserID    string          `json:"userId,omitempty"`
}

// Handler processes a single event. Returning an error logs the failure
// but does not prevent other handlers from running.
type Handler func(ctx context.Context, event Event) error

// Bus is a synchronous, in-process event bus. Handlers run in the caller's
// goroutine to keep the implementation simple and predictable.
type Bus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
}

// NewBus creates an empty event bus.
func NewBus() *Bus {
	return &Bus{handlers: make(map[string][]Handler)}
}

// Subscribe registers a handler for events of the given type.
func (b *Bus) Subscribe(eventType string, handler Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers[eventType] = append(b.handlers[eventType], handler)
}

// Publish sends an event to all registered handlers for its type.
// Errors from individual handlers are logged but do not stop delivery
// to remaining handlers.
func (b *Bus) Publish(ctx context.Context, event Event) {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}

	b.mu.RLock()
	handlers := b.handlers[event.Type]
	b.mu.RUnlock()

	for _, h := range handlers {
		if err := h(ctx, event); err != nil {
			slog.Error("event handler failed",
				"eventType", event.Type,
				"userId", event.UserID,
				"error", err)
		}
	}
}

// PublishJSON is a convenience that marshals a payload struct into an Event.
func (b *Bus) PublishJSON(ctx context.Context, eventType string, userID string, payload any) {
	raw, err := json.Marshal(payload)
	if err != nil {
		slog.Error("event marshal failed", "eventType", eventType, "error", err)
		return
	}
	b.Publish(ctx, Event{
		Type:    eventType,
		Payload: raw,
		UserID:  userID,
	})
}
