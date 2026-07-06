package ws

import (
	"context"
	"testing"
	"time"
)

// TestSendMessageDropsAndDisconnectsOnFullBuffer is the unit-level proof for
// audit PERF-03: a client that never drains must not block SendMessage; the
// frame is dropped and the client disconnected.
func TestSendMessageDropsAndDisconnectsOnFullBuffer(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)
	defer hub.Close()

	conn := newMockConn()
	// Deliberately do NOT call client.Start(): nothing drains c.send.
	client := NewClient(hub, conn, "stalled")

	// Fill the 256-deep buffer exactly (each send is non-blocking and succeeds).
	for i := 0; i < 256; i++ {
		client.SendMessage([]byte("x"))
	}

	droppedBefore := WSDroppedMessages()
	disconnectedBefore := WSSlowClientsDisconnected()

	// The next send must drop (buffer full) and return immediately. If
	// SendMessage still blocked, this goroutine would hang and the test would
	// time out instead of failing fast.
	done := make(chan struct{})
	go func() {
		client.SendMessage([]byte("overflow"))
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("SendMessage blocked on a full buffer — PERF-03 regression")
	}

	if got := WSDroppedMessages(); got != droppedBefore+1 {
		t.Fatalf("expected dropped count +1, got %d (before %d)", got, droppedBefore)
	}
	if got := WSSlowClientsDisconnected(); got != disconnectedBefore+1 {
		t.Fatalf("expected slow-disconnect count +1, got %d (before %d)", got, disconnectedBefore)
	}
	if !client.slowDisconnected.Load() {
		t.Fatal("slow client was not marked disconnected")
	}
}

// TestHealthyClientReceivesWhileAnotherIsStalled is the integration-level
// proof: one wedged subscriber must not stop delivery to a healthy one on the
// same channel. Before the fix the hub's single goroutine blocked on the
// stalled client's full buffer, freezing the entire realtime plane.
func TestHealthyClientReceivesWhileAnotherIsStalled(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)
	defer hub.Close()

	const channel = "market:test"

	// Healthy client: write pump running, drains normally.
	healthyConn := newMockConn()
	healthy := NewClient(hub, healthyConn, "healthy")
	healthy.Start()
	hub.Subscribe(healthy, channel)

	// Stalled client: no write pump; pre-fill its buffer so the very next
	// hub send to it would block under the old design.
	stalledConn := newMockConn()
	stalled := NewClient(hub, stalledConn, "stalled")
	hub.Subscribe(stalled, channel)
	for i := 0; i < 256; i++ {
		stalled.SendMessage([]byte("backlog"))
	}

	time.Sleep(50 * time.Millisecond) // let subscriptions settle

	hub.Broadcast(channel, []byte(`{"hello":"world"}`))

	// The healthy client must receive promptly despite the stalled peer.
	deadline := time.After(2 * time.Second)
	for {
		if healthyConn.messageCount() > 0 {
			break
		}
		select {
		case <-deadline:
			t.Fatal("healthy client did not receive a broadcast while a peer was stalled — hub froze (PERF-03)")
		case <-time.After(10 * time.Millisecond):
		}
	}
}

// TestBroadcastDoesNotBlockWhenHubQueueFull proves the producer side: a full
// hub command queue must not block the calling (HTTP request) goroutine.
func TestBroadcastDoesNotBlockWhenHubQueueFull(t *testing.T) {
	hub := NewHub()
	// Intentionally do NOT start hub.Run, so the broadcast channel (cap 100)
	// fills and never drains.
	for i := 0; i < 100; i++ {
		hub.Broadcast("market:x", []byte("fill"))
	}

	before := WSBroadcastsDropped()
	done := make(chan struct{})
	go func() {
		hub.Broadcast("market:x", []byte("overflow"))
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Broadcast blocked on a full hub queue — would stall the order handler (PERF-03)")
	}
	if got := WSBroadcastsDropped(); got != before+1 {
		t.Fatalf("expected dropped-broadcast count +1, got %d (before %d)", got, before)
	}
}
