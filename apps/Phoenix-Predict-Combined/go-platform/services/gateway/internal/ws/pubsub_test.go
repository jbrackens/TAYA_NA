package ws

import (
	"context"
	"encoding/json"
	"sync"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newTestRedis(t *testing.T) *redis.Client {
	t.Helper()
	mr := miniredis.RunT(t)
	return redis.NewClient(&redis.Options{Addr: mr.Addr()})
}

// fakePublisher captures Publish calls for hub-level tests that don't need
// a real Redis. Subscribe blocks until ctx cancels — the hub treats it as
// a successful background subscription.
type fakePublisher struct {
	mu             sync.Mutex
	published      []publishedMsg
	publishErr     error
	subscribedDone chan struct{}
	onMessage      func(string, []byte)
	onMessageOnce  sync.Once
}

type publishedMsg struct {
	channel string
	message []byte
}

func newFakePublisher() *fakePublisher {
	return &fakePublisher{subscribedDone: make(chan struct{})}
}

func (f *fakePublisher) Publish(_ context.Context, channel string, message []byte) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.publishErr != nil {
		return f.publishErr
	}
	cp := make([]byte, len(message))
	copy(cp, message)
	f.published = append(f.published, publishedMsg{channel: channel, message: cp})
	return nil
}

func (f *fakePublisher) Subscribe(ctx context.Context, onMessage func(channel string, message []byte)) error {
	f.mu.Lock()
	f.onMessage = onMessage
	f.mu.Unlock()
	f.onMessageOnce.Do(func() { close(f.subscribedDone) })
	<-ctx.Done()
	return ctx.Err()
}

// deliver simulates a bus message arriving from another replica. Test-only.
func (f *fakePublisher) deliver(channel string, payload []byte) {
	f.mu.Lock()
	cb := f.onMessage
	f.mu.Unlock()
	if cb != nil {
		cb(channel, payload)
	}
}

func (f *fakePublisher) Close() error { return nil }

func (f *fakePublisher) snapshot() []publishedMsg {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]publishedMsg, len(f.published))
	copy(out, f.published)
	return out
}

func TestRedisPublisherRoundTrip(t *testing.T) {
	client := newTestRedis(t)
	pub := NewRedisPublisher(client, "wstest")
	defer pub.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	received := make(chan publishedMsg, 4)
	go func() {
		_ = pub.Subscribe(ctx, func(channel string, message []byte) {
			received <- publishedMsg{channel: channel, message: message}
		})
	}()

	// Wait briefly for the subscriber to PSUBSCRIBE before publishing.
	// miniredis is fast but pubsub is still goroutine-driven.
	time.Sleep(50 * time.Millisecond)

	if err := pub.Publish(ctx, "market:abc", []byte(`{"price":42}`)); err != nil {
		t.Fatalf("Publish: %v", err)
	}

	select {
	case m := <-received:
		if m.channel != "market:abc" {
			t.Fatalf("want channel=market:abc got %q", m.channel)
		}
		if string(m.message) != `{"price":42}` {
			t.Fatalf("want message=%s got %q", `{"price":42}`, m.message)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("did not receive published message in time")
	}
}

func TestRedisPublisherCloseStopsPublish(t *testing.T) {
	client := newTestRedis(t)
	pub := NewRedisPublisher(client, "wstest")
	if err := pub.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	if err := pub.Publish(context.Background(), "x", []byte("y")); err == nil {
		t.Fatal("expected error after Close")
	}
}

func TestHubBroadcastWithPublisherRoutesToBus(t *testing.T) {
	hub := NewHub()
	pub := newFakePublisher()
	hub.SetPublisher(pub)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)

	select {
	case <-pub.subscribedDone:
	case <-time.After(time.Second):
		t.Fatal("publisher.Subscribe was not called")
	}

	hub.Broadcast("market:xyz", []byte(`{"foo":"bar"}`))

	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		if len(pub.snapshot()) > 0 {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}

	got := pub.snapshot()
	if len(got) != 1 {
		t.Fatalf("want 1 published message, got %d", len(got))
	}
	if got[0].channel != "market:xyz" {
		t.Fatalf("want channel=market:xyz got %q", got[0].channel)
	}
	// Body is wrapped in a busEnvelope JSON: {"o":<instanceID>,"c":<channel>,"b":<original>}
	var env busEnvelope
	if err := json.Unmarshal(got[0].message, &env); err != nil {
		t.Fatalf("envelope is not JSON: %v (%s)", err, got[0].message)
	}
	if env.Origin != hub.instanceID {
		t.Fatalf("envelope origin=%q want %q", env.Origin, hub.instanceID)
	}
	if env.Channel != "market:xyz" {
		t.Fatalf("envelope channel=%q want market:xyz", env.Channel)
	}
	if string(env.Body) != `{"foo":"bar"}` {
		t.Fatalf("envelope body=%s want %s", env.Body, `{"foo":"bar"}`)
	}
}

func TestHubOriginAlwaysFansOutLocallyEvenWithPublisher(t *testing.T) {
	// Verifies the codex finding: an origin's own clients must see the
	// broadcast even if the bus is slow / disconnected / mid-reconnect.
	hub := NewHub()
	pub := newFakePublisher()
	hub.SetPublisher(pub)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)
	<-pub.subscribedDone

	conn := newMockConn()
	c := NewClient(hub, conn, "u1")
	c.Start()
	defer c.close()
	hub.Subscribe(c, "market:abc")
	time.Sleep(50 * time.Millisecond)

	hub.Broadcast("market:abc", []byte(`{"v":1}`))

	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		conn.mu.Lock()
		got := len(conn.messages)
		conn.mu.Unlock()
		if got > 0 {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("origin client did not receive local fanout")
}

func TestHubInboundFromSelfIsDeduped(t *testing.T) {
	// Verify that messages this hub published are NOT re-fanout when
	// they come back via the subscribe loop. Without dedup the origin
	// would deliver the message twice.
	hub := NewHub()
	pub := newFakePublisher()
	hub.SetPublisher(pub)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)
	<-pub.subscribedDone

	conn := newMockConn()
	c := NewClient(hub, conn, "u1")
	c.Start()
	defer c.close()
	hub.Subscribe(c, "market:abc")
	time.Sleep(50 * time.Millisecond)

	// Construct an inbound envelope pretending to be from this hub itself.
	env, _ := json.Marshal(busEnvelope{
		Origin:  hub.instanceID,
		Channel: "market:abc",
		Body:    json.RawMessage(`{"v":99}`),
	})
	pub.deliver("market:abc", env)

	time.Sleep(100 * time.Millisecond)
	conn.mu.Lock()
	count := len(conn.messages)
	conn.mu.Unlock()
	if count != 0 {
		t.Fatalf("inbound from self should be deduped (0 deliveries); got %d", count)
	}
}

func TestHubInboundFromOtherInstanceFansOutOnce(t *testing.T) {
	hub := NewHub()
	pub := newFakePublisher()
	hub.SetPublisher(pub)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)
	<-pub.subscribedDone

	conn := newMockConn()
	c := NewClient(hub, conn, "u1")
	c.Start()
	defer c.close()
	hub.Subscribe(c, "market:abc")
	time.Sleep(50 * time.Millisecond)

	env, _ := json.Marshal(busEnvelope{
		Origin:  "some-other-instance",
		Channel: "market:abc",
		Body:    json.RawMessage(`{"v":7}`),
	})
	pub.deliver("market:abc", env)

	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		conn.mu.Lock()
		got := len(conn.messages)
		conn.mu.Unlock()
		if got >= 1 {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}
	conn.mu.Lock()
	defer conn.mu.Unlock()
	if len(conn.messages) != 1 {
		t.Fatalf("want exactly 1 delivery from other-instance broadcast, got %d", len(conn.messages))
	}
	if string(conn.messages[0]) != `{"v":7}` {
		t.Fatalf("delivered payload=%s want %s", conn.messages[0], `{"v":7}`)
	}
}

func TestRedisPublisherCloseStopsSubscribeLoop(t *testing.T) {
	client := newTestRedis(t)
	pub := NewRedisPublisher(client, "wstest")

	done := make(chan error, 1)
	go func() {
		done <- pub.Subscribe(context.Background(), func(string, []byte) {})
	}()

	// Let the subscriber establish.
	time.Sleep(50 * time.Millisecond)

	if err := pub.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	select {
	case err := <-done:
		if err == nil {
			return
		}
		// Either context.Canceled or the underlying conn error are
		// acceptable signals that the loop exited.
	case <-time.After(2 * time.Second):
		t.Fatal("Subscribe did not return after Close")
	}
}

func TestHubBroadcastWithoutPublisherFansOutLocallyOnly(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)

	conn := newMockConn()
	c := NewClient(hub, conn, "u1")
	c.Start()
	defer c.close()
	hub.Subscribe(c, "market:abc")
	time.Sleep(50 * time.Millisecond)

	hub.Broadcast("market:abc", []byte(`{"v":1}`))

	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		conn.mu.Lock()
		got := len(conn.messages)
		conn.mu.Unlock()
		if got > 0 {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("did not deliver message locally")
}

func TestHubPublisherErrorFallsBackToLocalFanout(t *testing.T) {
	hub := NewHub()
	pub := newFakePublisher()
	pub.publishErr = errFakePublisher{}
	hub.SetPublisher(pub)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)

	select {
	case <-pub.subscribedDone:
	case <-time.After(time.Second):
		t.Fatal("Subscribe not called")
	}

	conn := newMockConn()
	c := NewClient(hub, conn, "u1")
	c.Start()
	defer c.close()
	hub.Subscribe(c, "market:abc")
	time.Sleep(50 * time.Millisecond)

	hub.Broadcast("market:abc", []byte(`{"x":1}`))

	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		conn.mu.Lock()
		got := len(conn.messages)
		conn.mu.Unlock()
		if got > 0 {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("expected fallback local delivery")
}

func TestHubInboundLocalBroadcastDoesNotRepublish(t *testing.T) {
	// Ensure that broadcasts coming in from the Subscribe callback (local=true)
	// are not republished — that would form an infinite loop.
	hub := NewHub()
	pub := newFakePublisher()
	hub.SetPublisher(pub)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go hub.Run(ctx)
	<-pub.subscribedDone

	// Inject a local-only broadcast directly via the channel (mirrors what the
	// Subscribe callback does).
	hub.broadcast <- &broadcastCmd{channel: "market:abc", message: []byte(`{"y":1}`), local: true}

	time.Sleep(50 * time.Millisecond)

	if got := pub.snapshot(); len(got) != 0 {
		t.Fatalf("local broadcast must NOT republish; got %d publishes", len(got))
	}
}

// errFakePublisher is a simple error type for the fake.
type errFakePublisher struct{}

func (errFakePublisher) Error() string { return "fake publisher error" }
