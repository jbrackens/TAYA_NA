package webhooks

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	stdhttp "net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// memStore is an in-memory Store for exercising the dispatcher loop without a
// database. The SQL round-trip is covered separately by store_test.go.
type memStore struct {
	mu   sync.Mutex
	seq  int
	rows map[string]*memRow
}

type memRow struct {
	id, eventType, url, secret string
	payload                    json.RawMessage
	status                     string
	attempts                   int
	nextAttemptAt              time.Time
	createdAt                  time.Time
	lastCode                   int
	lastErr                    string
}

func newMemStore() *memStore { return &memStore{rows: map[string]*memRow{}} }

// seed adds a single pending delivery (already due) and returns its id.
func (m *memStore) seed(url, secret, eventType string, payload json.RawMessage) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.seq++
	id := fmt.Sprintf("dlv-%d", m.seq)
	now := time.Now()
	m.rows[id] = &memRow{
		id: id, eventType: eventType, url: url, secret: secret, payload: payload,
		status: "pending", nextAttemptAt: now.Add(-time.Second), createdAt: now,
	}
	return id
}

func (m *memStore) statusOf(id string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r, ok := m.rows[id]; ok {
		return r.status
	}
	return ""
}

func (m *memStore) attemptsOf(id string) int {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r, ok := m.rows[id]; ok {
		return r.attempts
	}
	return -1
}

func (m *memStore) ClaimDue(_ context.Context, limit int, leaseFor time.Duration) ([]DueDelivery, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now()
	var out []DueDelivery
	for _, r := range m.rows {
		if r.status != "pending" || r.nextAttemptAt.After(now) {
			continue
		}
		r.nextAttemptAt = now.Add(leaseFor) // lease so it isn't re-claimed mid-send
		out = append(out, DueDelivery{
			ID: r.id, EventType: r.eventType, Payload: r.payload,
			Attempts: r.attempts, CreatedAt: r.createdAt, URL: r.url, Secret: r.secret,
		})
		if len(out) >= limit {
			break
		}
	}
	return out, nil
}

func (m *memStore) MarkDelivered(_ context.Context, id string, code int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r := m.rows[id]; r != nil {
		r.status, r.attempts, r.lastCode, r.lastErr = "delivered", r.attempts+1, code, ""
	}
	return nil
}

func (m *memStore) Reschedule(_ context.Context, id string, next time.Time, code int, errMsg string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r := m.rows[id]; r != nil {
		r.attempts, r.nextAttemptAt, r.lastCode, r.lastErr = r.attempts+1, next, code, errMsg
	}
	return nil
}

func (m *memStore) DeadLetter(_ context.Context, id string, code int, errMsg string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r := m.rows[id]; r != nil {
		r.status, r.attempts, r.lastCode, r.lastErr = "failed", r.attempts+1, code, errMsg
	}
	return nil
}

// Endpoint-registry methods are unused by the dispatcher; minimal stubs keep
// memStore a complete Store.
func (m *memStore) CreateEndpoint(context.Context, Endpoint) (Endpoint, error) {
	return Endpoint{}, nil
}
func (m *memStore) ListEndpoints(context.Context, string) ([]Endpoint, error)     { return nil, nil }
func (m *memStore) SetEndpointActive(context.Context, string, string, bool) error { return nil }
func (m *memStore) Enqueue(context.Context, string, json.RawMessage) (int, error) { return 0, nil }

func testDispatcher(st Store, cfg func(*DispatcherConfig)) *Dispatcher {
	c := DispatcherConfig{
		BatchSize: 10, Lease: time.Second, MaxAttempts: 6,
		BackoffBase: time.Millisecond, BackoffMax: 5 * time.Millisecond, Timeout: 2 * time.Second,
	}
	if cfg != nil {
		cfg(&c)
	}
	return NewDispatcher(st, c)
}

// drive ticks the dispatcher until predicate holds or the deadline passes.
func drive(d *Dispatcher, until func() bool) {
	deadline := time.Now().Add(3 * time.Second)
	for !until() && time.Now().Before(deadline) {
		d.tick(context.Background())
		time.Sleep(2 * time.Millisecond)
	}
}

// TestDispatcherDeliversFlakyReceiverWithRetries is the P3-03 acceptance: a
// registered endpoint behind a flaky receiver (503 twice, then 200) receives
// the signed event, and the receiver can verify the signature over the exact
// delivered body.
func TestDispatcherDeliversFlakyReceiverWithRetries(t *testing.T) {
	var attempts int32
	var gotSig, gotEvent, gotID string
	var gotBody []byte
	srv := httptest.NewServer(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		if atomic.AddInt32(&attempts, 1) < 3 {
			w.WriteHeader(stdhttp.StatusServiceUnavailable)
			return
		}
		gotSig = r.Header.Get(SignatureHeader)
		gotEvent = r.Header.Get(EventHeader)
		gotID = r.Header.Get(DeliveryIDHeader)
		gotBody, _ = io.ReadAll(r.Body)
		w.WriteHeader(stdhttp.StatusOK)
	}))
	defer srv.Close()

	st := newMemStore()
	id := st.seed(srv.URL, "topsecret", EventOrderFilled, json.RawMessage(`{"orderId":"o1"}`))
	d := testDispatcher(st, nil)

	drive(d, func() bool { return st.statusOf(id) == "delivered" })

	if got := st.statusOf(id); got != "delivered" {
		t.Fatalf("status = %q after retries; attempts=%d", got, atomic.LoadInt32(&attempts))
	}
	if n := atomic.LoadInt32(&attempts); n != 3 {
		t.Fatalf("delivered after %d attempts, want 3 (503, 503, 200)", n)
	}
	if gotEvent != EventOrderFilled || gotID != id {
		t.Fatalf("delivery headers: event=%q id=%q (want %q / %q)", gotEvent, gotID, EventOrderFilled, id)
	}
	if !Verify("topsecret", gotBody, gotSig) {
		t.Fatal("receiver could not verify the signature over the delivered body")
	}
}

func TestDispatcherDeadLettersPermanent(t *testing.T) {
	var attempts int32
	srv := httptest.NewServer(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, _ *stdhttp.Request) {
		atomic.AddInt32(&attempts, 1)
		w.WriteHeader(stdhttp.StatusBadRequest) // 400 — permanent
	}))
	defer srv.Close()

	st := newMemStore()
	id := st.seed(srv.URL, "s", EventMarketSettled, json.RawMessage(`{"marketId":"m1"}`))
	d := testDispatcher(st, nil)

	d.tick(context.Background())

	if got := st.statusOf(id); got != "failed" {
		t.Fatalf("permanent 4xx should dead-letter immediately, status=%q", got)
	}
	if n := atomic.LoadInt32(&attempts); n != 1 {
		t.Fatalf("permanent failure should not retry, got %d attempts", n)
	}
}

func TestDispatcherDeadLettersAfterMaxAttempts(t *testing.T) {
	var attempts int32
	srv := httptest.NewServer(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, _ *stdhttp.Request) {
		atomic.AddInt32(&attempts, 1)
		w.WriteHeader(stdhttp.StatusServiceUnavailable) // always 503 — never recovers
	}))
	defer srv.Close()

	st := newMemStore()
	id := st.seed(srv.URL, "s", EventOrderFilled, json.RawMessage(`{}`))
	d := testDispatcher(st, func(c *DispatcherConfig) { c.MaxAttempts = 3 })

	drive(d, func() bool { return st.statusOf(id) == "failed" })

	if got := st.statusOf(id); got != "failed" {
		t.Fatalf("never-recovering receiver should dead-letter, status=%q", got)
	}
	if a := st.attemptsOf(id); a != 3 {
		t.Fatalf("should dead-letter after MaxAttempts=3, got attempts=%d", a)
	}
	if n := atomic.LoadInt32(&attempts); n != 3 {
		t.Fatalf("receiver should see exactly 3 attempts, got %d", n)
	}
}
