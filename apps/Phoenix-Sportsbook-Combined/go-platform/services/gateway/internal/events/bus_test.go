package events

import (
	"context"
	"encoding/json"
	"errors"
	"sync/atomic"
	"testing"
)

func TestBus_PublishToSubscriber(t *testing.T) {
	bus := NewBus()
	var received int32

	bus.Subscribe("test.event", func(ctx context.Context, event Event) error {
		atomic.AddInt32(&received, 1)
		return nil
	})

	bus.Publish(context.Background(), Event{Type: "test.event"})

	if atomic.LoadInt32(&received) != 1 {
		t.Fatalf("expected 1 event received, got %d", received)
	}
}

func TestBus_MultipleSubscribers(t *testing.T) {
	bus := NewBus()
	var count int32

	bus.Subscribe("multi", func(ctx context.Context, event Event) error {
		atomic.AddInt32(&count, 1)
		return nil
	})
	bus.Subscribe("multi", func(ctx context.Context, event Event) error {
		atomic.AddInt32(&count, 1)
		return nil
	})

	bus.Publish(context.Background(), Event{Type: "multi"})

	if atomic.LoadInt32(&count) != 2 {
		t.Fatalf("expected 2 handlers called, got %d", count)
	}
}

func TestBus_NoSubscribersNoError(t *testing.T) {
	bus := NewBus()
	// Should not panic
	bus.Publish(context.Background(), Event{Type: "nobody.listening"})
}

func TestBus_HandlerErrorDoesNotStopDelivery(t *testing.T) {
	bus := NewBus()
	var secondCalled int32

	bus.Subscribe("error.test", func(ctx context.Context, event Event) error {
		return errors.New("first handler fails")
	})
	bus.Subscribe("error.test", func(ctx context.Context, event Event) error {
		atomic.AddInt32(&secondCalled, 1)
		return nil
	})

	bus.Publish(context.Background(), Event{Type: "error.test"})

	if atomic.LoadInt32(&secondCalled) != 1 {
		t.Fatal("second handler should still run after first handler errors")
	}
}

func TestBus_PublishJSONMarshalsPayload(t *testing.T) {
	bus := NewBus()
	var receivedPayload json.RawMessage

	bus.Subscribe("json.test", func(ctx context.Context, event Event) error {
		receivedPayload = event.Payload
		return nil
	})

	bus.PublishJSON(context.Background(), "json.test", "user123", map[string]string{
		"key": "value",
	})

	if receivedPayload == nil {
		t.Fatal("expected payload to be set")
	}
	var parsed map[string]string
	if err := json.Unmarshal(receivedPayload, &parsed); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}
	if parsed["key"] != "value" {
		t.Fatalf("expected key=value, got key=%s", parsed["key"])
	}
}

func TestBus_DifferentEventTypesIsolated(t *testing.T) {
	bus := NewBus()
	var aCalled, bCalled int32

	bus.Subscribe("type.a", func(ctx context.Context, event Event) error {
		atomic.AddInt32(&aCalled, 1)
		return nil
	})
	bus.Subscribe("type.b", func(ctx context.Context, event Event) error {
		atomic.AddInt32(&bCalled, 1)
		return nil
	})

	bus.Publish(context.Background(), Event{Type: "type.a"})

	if atomic.LoadInt32(&aCalled) != 1 {
		t.Fatal("type.a handler should have been called")
	}
	if atomic.LoadInt32(&bCalled) != 0 {
		t.Fatal("type.b handler should NOT have been called")
	}
}
