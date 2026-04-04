package ws

import (
	"context"
	"encoding/json"
	"sync"
	"testing"
	"time"
)

// TestHubSubscribeUnsubscribe tests basic subscribe and unsubscribe operations
func TestHubSubscribeUnsubscribe(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go hub.Run(ctx)
	defer hub.Close()

	conn1 := newMockConn()
	conn2 := newMockConn()

	client1 := NewClient(hub, conn1, "user1")
	client2 := NewClient(hub, conn2, "user2")

	hub.Subscribe(client1, "markets:fixture1")
	hub.Subscribe(client2, "markets:fixture1")
	hub.Subscribe(client1, "fixtures:soccer")

	time.Sleep(100 * time.Millisecond)

	subscribers := hub.GetChannelSubscribers("markets:fixture1")
	if len(subscribers) != 2 {
		t.Errorf("expected 2 subscribers to markets:fixture1, got %d", len(subscribers))
	}

	subscribers = hub.GetChannelSubscribers("fixtures:soccer")
	if len(subscribers) != 1 {
		t.Errorf("expected 1 subscriber to fixtures:soccer, got %d", len(subscribers))
	}

	hub.Unsubscribe(client1, "markets:fixture1")
	time.Sleep(100 * time.Millisecond)

	subscribers = hub.GetChannelSubscribers("markets:fixture1")
	if len(subscribers) != 1 {
		t.Errorf("expected 1 subscriber to markets:fixture1 after unsubscribe, got %d", len(subscribers))
	}
}

// TestHubBroadcast tests broadcasting messages to subscribers
func TestHubBroadcast(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go hub.Run(ctx)
	defer hub.Close()

	conn1 := newMockConn()
	conn2 := newMockConn()

	client1 := NewClient(hub, conn1, "user1")
	client2 := NewClient(hub, conn2, "user2")

	// Start clients so the writePump forwards messages from send to conn
	client1.Start()
	client2.Start()

	hub.Subscribe(client1, "markets:fixture1")
	hub.Subscribe(client2, "markets:fixture1")

	time.Sleep(100 * time.Millisecond)

	testMessage := []byte(`{"type":"event","data":"test"}`)
	hub.Broadcast("markets:fixture1", testMessage)

	time.Sleep(200 * time.Millisecond)

	msg1, ok1 := conn1.LastMessage()
	if !ok1 {
		t.Error("client1 did not receive message")
	} else if string(msg1) != string(testMessage) {
		t.Errorf("client1 received unexpected message: %s", string(msg1))
	}

	msg2, ok2 := conn2.LastMessage()
	if !ok2 {
		t.Error("client2 did not receive message")
	} else if string(msg2) != string(testMessage) {
		t.Errorf("client2 received unexpected message: %s", string(msg2))
	}
}

// TestHubBroadcastEvent tests broadcasting typed events
func TestHubBroadcastEvent(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go hub.Run(ctx)
	defer hub.Close()

	conn := newMockConn()
	client := NewClient(hub, conn, "user1")
	client.Start()

	hub.Subscribe(client, "markets:fixture1")
	time.Sleep(100 * time.Millisecond)

	testData := map[string]interface{}{
		"price": 2.5,
		"odds":  "1/2",
	}
	hub.BroadcastEvent("markets:fixture1", "evt123", "price_update", testData)

	time.Sleep(200 * time.Millisecond)

	msg, ok := conn.LastMessage()
	if !ok {
		t.Fatal("did not receive event")
	}

	var event Event
	err := json.Unmarshal(msg, &event)
	if err != nil {
		t.Fatalf("failed to unmarshal event: %v", err)
	}

	if event.Type != MessageTypeEvent {
		t.Errorf("expected event type %s, got %s", MessageTypeEvent, event.Type)
	}
	if event.Channel != "markets:fixture1" {
		t.Errorf("expected channel markets:fixture1, got %s", event.Channel)
	}
	if event.EventID != "evt123" {
		t.Errorf("expected event ID evt123, got %s", event.EventID)
	}

	var data map[string]interface{}
	err = json.Unmarshal(event.Data, &data)
	if err != nil {
		t.Fatalf("failed to unmarshal event data: %v", err)
	}
	if data["price"] != 2.5 {
		t.Errorf("expected price 2.5, got %v", data["price"])
	}
}

// TestHubClientDisconnectCleanup tests that client disconnect properly cleans up subscriptions
func TestHubClientDisconnectCleanup(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go hub.Run(ctx)
	defer hub.Close()

	conn := newMockConn()
	client := NewClient(hub, conn, "user1")

	// Subscribe to multiple channels via the hub directly
	hub.Subscribe(client, "markets:fixture1")
	hub.Subscribe(client, "fixtures:soccer")
	hub.Subscribe(client, "bets:user1")
	// Also track in client's channels map for disconnect cleanup
	client.channels["markets:fixture1"] = true
	client.channels["fixtures:soccer"] = true
	client.channels["bets:user1"] = true

	time.Sleep(100 * time.Millisecond)

	if len(hub.GetChannelSubscribers("markets:fixture1")) != 1 {
		t.Error("subscription to markets:fixture1 failed")
	}
	if len(hub.GetChannelSubscribers("fixtures:soccer")) != 1 {
		t.Error("subscription to fixtures:soccer failed")
	}
	if len(hub.GetChannelSubscribers("bets:user1")) != 1 {
		t.Error("subscription to bets:user1 failed")
	}

	// Disconnect the client via hub
	hub.Disconnect(client)
	time.Sleep(100 * time.Millisecond)

	if len(hub.GetChannelSubscribers("markets:fixture1")) != 0 {
		t.Error("markets:fixture1 channel should be empty after disconnect")
	}
	if len(hub.GetChannelSubscribers("fixtures:soccer")) != 0 {
		t.Error("fixtures:soccer channel should be empty after disconnect")
	}
	if len(hub.GetChannelSubscribers("bets:user1")) != 0 {
		t.Error("bets:user1 channel should be empty after disconnect")
	}
}

// TestHubMultipleChannelsBroadcast tests broadcasting to specific channels doesn't affect others
func TestHubMultipleChannelsBroadcast(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go hub.Run(ctx)
	defer hub.Close()

	conn1 := newMockConn()
	conn2 := newMockConn()
	conn3 := newMockConn()

	client1 := NewClient(hub, conn1, "user1")
	client2 := NewClient(hub, conn2, "user2")
	client3 := NewClient(hub, conn3, "user3")

	client1.Start()
	client2.Start()
	client3.Start()

	hub.Subscribe(client1, "markets:fixture1")
	hub.Subscribe(client2, "markets:fixture2")
	hub.Subscribe(client3, "markets:fixture1")

	time.Sleep(100 * time.Millisecond)

	hub.Broadcast("markets:fixture1", []byte(`{"test":"data1"}`))
	time.Sleep(200 * time.Millisecond)

	if _, ok := conn1.LastMessage(); !ok {
		t.Error("client1 should have received message for fixture1")
	}

	if _, ok := conn3.LastMessage(); !ok {
		t.Error("client3 should have received message for fixture1")
	}

	if _, ok := conn2.LastMessage(); ok {
		t.Error("client2 should NOT have received message for fixture1")
	}
}

// TestNotifierInterface tests the Notifier interface implementation
func TestNotifierInterface(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go hub.Run(ctx)
	defer hub.Close()

	var _ Notifier = hub

	conn := newMockConn()
	client := NewClient(hub, conn, "user1")
	client.Start()

	hub.Subscribe(client, "markets:fixture1")
	time.Sleep(100 * time.Millisecond)

	marketData := map[string]interface{}{"odds": 2.5}
	hub.NotifyMarketUpdate("fixture1", marketData)

	time.Sleep(200 * time.Millisecond)

	msg, ok := conn.LastMessage()
	if !ok {
		t.Error("did not receive market update event")
	} else {
		var event Event
		json.Unmarshal(msg, &event)
		if event.Channel != "markets:fixture1" {
			t.Errorf("expected markets:fixture1 channel, got %s", event.Channel)
		}
	}
}

// TestHubClientCount tests the client count functionality
func TestHubClientCount(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go hub.Run(ctx)
	defer hub.Close()

	conn1 := newMockConn()
	conn2 := newMockConn()

	client1 := NewClient(hub, conn1, "user1")
	client2 := NewClient(hub, conn2, "user2")

	hub.Subscribe(client1, "markets:fixture1")
	hub.Subscribe(client2, "markets:fixture1")

	time.Sleep(100 * time.Millisecond)

	count := hub.ClientCount()
	if count != 2 {
		t.Errorf("expected 2 clients, got %d", count)
	}

	channelCount := hub.ChannelCount()
	if channelCount != 1 {
		t.Errorf("expected 1 channel, got %d", channelCount)
	}
}

// mockConn is a mock WebSocket connection for testing
type mockConn struct {
	mu       sync.Mutex
	messages [][]byte
	closed   bool
	closeCh  chan struct{}
}

func newMockConn() *mockConn {
	return &mockConn{
		messages: nil,
		closed:   false,
		closeCh:  make(chan struct{}),
	}
}

func (m *mockConn) ReadMessage() (int, []byte, error) {
	// Block until closed
	<-m.closeCh
	return 0, nil, &mockCloseError{}
}

func (m *mockConn) WriteMessage(messageType int, data []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if !m.closed && data != nil {
		m.messages = append(m.messages, data)
	}
	return nil
}

func (m *mockConn) SetReadDeadline(t time.Time) error {
	return nil
}

func (m *mockConn) SetWriteDeadline(t time.Time) error {
	return nil
}

func (m *mockConn) SetReadLimit(limit int64) {
}

func (m *mockConn) SetPongHandler(h func(string) error) {
}

func (m *mockConn) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if !m.closed {
		m.closed = true
		close(m.closeCh)
	}
	return nil
}

// LastMessage returns the most recent message written to this mock connection
func (m *mockConn) LastMessage() ([]byte, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.messages) == 0 {
		return nil, false
	}
	return m.messages[len(m.messages)-1], true
}

type mockCloseError struct{}

func (e *mockCloseError) Error() string { return "mock connection closed" }
