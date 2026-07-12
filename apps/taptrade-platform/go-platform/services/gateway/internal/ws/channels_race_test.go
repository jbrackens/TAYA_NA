package ws

import (
	"context"
	"fmt"
	"testing"
	"time"
)

// TestClientChannelsSubscribeDisconnectRace drives the client's readPump-side
// subscription path concurrently with hub-side disconnect cleanup. Before the
// client.channels map was guarded, handleSubscribe (readPump goroutine) wrote
// the map while handleDisconnect (hub goroutine) ranged it — a real data race
// flagged by -race. Run with -race; the test is only meaningful there.
func TestClientChannelsSubscribeDisconnectRace(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)
	defer hub.Close()

	client := NewClient(hub, newMockConn(), "u-race")

	done := make(chan struct{})
	go func() {
		defer close(done)
		// Same call the readPump goroutine makes for inbound subscribe frames.
		for i := 0; i < 500; i++ {
			client.handleSubscribe([]string{fmt.Sprintf("market:m-%d", i)})
		}
	}()
	// Each Disconnect makes the hub goroutine walk client.channels in
	// handleDisconnect while the goroutine above is still writing it.
	for i := 0; i < 500; i++ {
		hub.Disconnect(client)
	}
	<-done
}

// TestDisconnectSlowNeverBlocksOnFullQueue models the hub goroutine tripping a
// slow-client disconnect mid-fan-out while the disconnect queue is already
// full. The hub goroutine is the ONLY drainer of that queue, so a blocking
// enqueue from its own call stack self-deadlocks the entire realtime plane.
// The event loop is deliberately not running here — a full, undrained queue is
// exactly the deadlock precondition. disconnectSlow must return promptly; the
// client's cancelled context makes its pumps exit and close() re-schedules the
// hub-side cleanup from the client goroutine.
func TestDisconnectSlowNeverBlocksOnFullQueue(t *testing.T) {
	hub := NewHub()
	for i := 0; i < cap(hub.disconnect); i++ {
		hub.disconnect <- &Client{}
	}

	client := NewClient(hub, newMockConn(), "u-slow-full-queue")
	done := make(chan struct{})
	go func() {
		client.disconnectSlow()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("disconnectSlow blocked on a full disconnect queue — hub self-deadlock")
	}
	if client.ctx.Err() == nil {
		t.Fatal("disconnectSlow must cancel the client context so its pumps exit")
	}
}
