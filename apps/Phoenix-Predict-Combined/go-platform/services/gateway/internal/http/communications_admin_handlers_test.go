package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	_ "github.com/lib/pq"
	"phoenix-revival/gateway/internal/communications"
	"phoenix-revival/gateway/internal/notify"
	"phoenix-revival/platform/transport/httpx"
)

// fakeCommsStore is an in-memory communicationsStore so the routes can be tested
// without a live database.
type fakeCommsStore struct {
	byUser    map[string][]communications.Communication
	email     string
	emailErr  error
	recorded  []communications.Communication
	recordErr error
}

func (f *fakeCommsStore) ListForUser(_ context.Context, userID string, _, _ int) ([]communications.Communication, error) {
	return f.byUser[userID], nil
}

func (f *fakeCommsStore) Record(_ context.Context, c communications.Communication) (communications.Communication, error) {
	if f.recordErr != nil {
		return communications.Communication{}, f.recordErr
	}
	c.ID = int64(len(f.recorded) + 1)
	f.recorded = append(f.recorded, c)
	return c, nil
}

func (f *fakeCommsStore) RecipientEmail(_ context.Context, _ string) (string, error) {
	if f.emailErr != nil {
		return "", f.emailErr
	}
	return f.email, nil
}

// fakeNotifier records dispatch calls so tests can assert fail-closed behaviour
// without real external delivery.
type fakeNotifier struct {
	calls int
	err   error
}

func (f *fakeNotifier) Name() string { return "fake" }
func (f *fakeNotifier) Notify(_ context.Context, _ []string, _, _ string) error {
	f.calls++
	return f.err
}

func commsHandler(store communicationsStore, notifier notify.Notifier) http.Handler {
	mux := http.NewServeMux()
	registerCommunicationsAdminRoutes(mux, store, notifier)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

// A nil store leaves the routes unregistered, so requests 404.
func TestCommunicationsRoutesSkipWithoutStore(t *testing.T) {
	handler := commsHandler(nil, &fakeNotifier{})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/communications/u-1", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404 with nil store, got %d", res.Code)
	}
}

func TestCommunicationsHistoryGates(t *testing.T) {
	store := &fakeCommsStore{byUser: map[string][]communications.Communication{
		"u-1": {{ID: 2, UserID: "u-1", Channel: "email", Status: "sent"}, {ID: 1, UserID: "u-1", Channel: "sms", Status: "failed"}},
	}}
	handler := commsHandler(store, &fakeNotifier{})

	// Non-admin is refused on GET (users:read) with the anon bypass off.
	t.Run("player rejected", func(t *testing.T) {
		t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/communications/u-1", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "u-p", "p@test.local", "player"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("expected player rejection, got %d", res.Code)
		}
	})

	// PUT is neither GET nor POST → 405.
	t.Run("unsupported method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/communications/u-1", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusMethodNotAllowed {
			t.Fatalf("expected 405, got %d", res.Code)
		}
	})

	t.Run("missing user id", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/communications/", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for missing user id, got %d", res.Code)
		}
	})

	t.Run("returns history", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/communications/u-1", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
		}
		var payload struct {
			Items []communications.Communication `json:"items"`
		}
		if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
			t.Fatalf("decode: %v", err)
		}
		if len(payload.Items) != 2 || payload.Items[0].ID != 2 {
			t.Fatalf("expected 2 items most-recent-first, got %+v", payload.Items)
		}
	})
}

// POST send: the gates and early validation are testable without a DB (they
// short-circuit before the template store / recipient lookup).
func TestCommunicationsSendGates(t *testing.T) {
	store := &fakeCommsStore{email: "p@example.com"}
	notifier := &fakeNotifier{}
	handler := commsHandler(store, notifier)
	const path = "/api/v1/admin/communications/u-1"

	post := func(t *testing.T, roleUser, roleEmail, role, bodyJSON string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(bodyJSON))
		req = req.WithContext(httpx.WithTestUser(req.Context(), roleUser, roleEmail, role))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		return res
	}

	// A non-admin is refused on POST (users:write) with the anon bypass off.
	t.Run("player rejected on send", func(t *testing.T) {
		t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
		res := post(t, "u-p", "p@test.local", "player", `{"templateKey":"welcome","channel":"email"}`)
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("expected player rejection, got %d", res.Code)
		}
	})

	t.Run("missing templateKey", func(t *testing.T) {
		res := post(t, "admin", "a@test.local", "admin", `{"channel":"email"}`)
		if res.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for missing templateKey, got %d", res.Code)
		}
	})

	t.Run("invalid channel", func(t *testing.T) {
		res := post(t, "admin", "a@test.local", "admin", `{"templateKey":"welcome","channel":"telepathy"}`)
		if res.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for invalid channel, got %d", res.Code)
		}
	})

	// With no template store configured, a valid request is refused fail-closed
	// (503) — never a blank send. notificationTemplateStore is nil in unit tests.
	t.Run("no template store is fail-closed", func(t *testing.T) {
		if notificationTemplateStore != nil {
			t.Skip("notificationTemplateStore set by another test")
		}
		res := post(t, "admin", "a@test.local", "admin", `{"templateKey":"welcome","channel":"email"}`)
		if res.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected 503 with no template store, got %d body=%s", res.Code, res.Body.String())
		}
		if notifier.calls != 0 {
			t.Fatalf("no dispatch should occur when fail-closed, got %d calls", notifier.calls)
		}
	})
}

// GAP-75 (§27): the send is per-actor rate-limited. With the cap set to 1/min,
// the first send passes the throttle (then fails-closed at the nil template
// store) and the second, same-actor send within the window is a 429.
func TestCommunicationsSendRateLimited(t *testing.T) {
	t.Setenv("COMMS_SEND_RATE_LIMIT_PER_MIN", "1") // limiter is built at registration
	store := &fakeCommsStore{email: "p@example.com"}
	handler := commsHandler(store, &fakeNotifier{})

	post := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(
			http.MethodPost,
			"/api/v1/admin/communications/u-1",
			strings.NewReader(`{"templateKey":"welcome","channel":"email"}`),
		)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		return res
	}

	if res := post(); res.Code == http.StatusTooManyRequests {
		t.Fatalf("first send should pass the rate limit, got 429")
	}
	if res := post(); res.Code != http.StatusTooManyRequests {
		t.Fatalf("second same-actor send should be rate-limited (429), got %d", res.Code)
	}
}

// Opt-in full-send integration: real communications store + real template store +
// fake notifier. Proves the fail-closed dispatch semantics end to end.
func TestCommunicationsSendLive(t *testing.T) {
	dsn := os.Getenv("COMMS_LIVE_DSN")
	if dsn == "" {
		t.Skip("COMMS_LIVE_DSN not set; skipping live send test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	ctx := context.Background()

	// Minimal punters table + a seeded player for recipient resolution.
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS punters (id VARCHAR(255) PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, username VARCHAR(255))`); err != nil {
		t.Fatalf("ensure punters: %v", err)
	}
	_, _ = db.ExecContext(ctx, `DELETE FROM punters WHERE id = 'u-send-1'`)
	if _, err := db.ExecContext(ctx, `INSERT INTO punters (id, email) VALUES ('u-send-1','send1@example.com')`); err != nil {
		t.Fatalf("seed punter: %v", err)
	}
	defer db.ExecContext(ctx, `DELETE FROM punters WHERE id = 'u-send-1'`)

	store, err := communications.NewStore(db)
	if err != nil {
		t.Fatalf("comms store: %v", err)
	}
	_, _ = db.ExecContext(ctx, `DELETE FROM player_communications WHERE user_id = 'u-send-1'`)
	defer db.ExecContext(ctx, `DELETE FROM player_communications WHERE user_id = 'u-send-1'`)

	ts, err := notify.NewTemplateStore(db)
	if err != nil {
		t.Fatalf("template store: %v", err)
	}
	if _, err := ts.Upsert(ctx, notify.Template{Key: "welcome", Subject: "Hi {{name}}", Body: "Welcome {{name}}"}, "admin"); err != nil {
		t.Fatalf("seed template: %v", err)
	}
	// Point the package var at the real store for the duration of the test.
	prev := notificationTemplateStore
	notificationTemplateStore = ts
	defer func() { notificationTemplateStore = prev }()

	notifier := &fakeNotifier{}
	handler := commsHandler(store, notifier)

	post := func(bodyJSON string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/communications/u-send-1", strings.NewReader(bodyJSON))
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		return res
	}

	// Email channel: dispatched via the (fake) notifier, status "sent", recorded.
	res := post(`{"templateKey":"welcome","channel":"email","data":{"name":"Ada"}}`)
	if res.Code != http.StatusCreated {
		t.Fatalf("email send: expected 201, got %d body=%s", res.Code, res.Body.String())
	}
	var comm communications.Communication
	if err := json.Unmarshal(res.Body.Bytes(), &comm); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if comm.Status != "sent" || comm.Subject != "Hi Ada" || comm.Body != "Welcome Ada" {
		t.Fatalf("expected rendered sent comm, got %+v", comm)
	}
	if notifier.calls != 1 {
		t.Fatalf("email channel should dispatch once, got %d", notifier.calls)
	}

	// Non-email channel: recorded but NOT dispatched (fail-closed, no wrong-channel delivery).
	before := notifier.calls
	res = post(`{"templateKey":"welcome","channel":"sms","data":{"name":"Bo"}}`)
	if res.Code != http.StatusCreated {
		t.Fatalf("sms send: expected 201, got %d body=%s", res.Code, res.Body.String())
	}
	_ = json.Unmarshal(res.Body.Bytes(), &comm)
	if comm.Status != "recorded" {
		t.Fatalf("non-email channel should be recorded-not-dispatched, got status %q", comm.Status)
	}
	if notifier.calls != before {
		t.Fatalf("non-email channel must not dispatch, calls went %d→%d", before, notifier.calls)
	}

	// Unknown template → 400; unknown player → 404.
	if res := post(`{"templateKey":"does-not-exist","channel":"email"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("unknown template: expected 400, got %d", res.Code)
	}
	reqBad := httptest.NewRequest(http.MethodPost, "/api/v1/admin/communications/u-ghost", strings.NewReader(`{"templateKey":"welcome","channel":"email"}`))
	reqBad = reqBad.WithContext(httpx.WithTestUser(reqBad.Context(), "admin", "a@test.local", "admin"))
	resBad := httptest.NewRecorder()
	handler.ServeHTTP(resBad, reqBad)
	if resBad.Code != http.StatusNotFound {
		t.Fatalf("unknown player: expected 404, got %d", resBad.Code)
	}

	// History now shows both recorded messages.
	reqH := httptest.NewRequest(http.MethodGet, "/api/v1/admin/communications/u-send-1", nil)
	reqH = reqH.WithContext(httpx.WithTestUser(reqH.Context(), "admin", "a@test.local", "admin"))
	resH := httptest.NewRecorder()
	handler.ServeHTTP(resH, reqH)
	var hist struct {
		Items []communications.Communication `json:"items"`
	}
	_ = json.Unmarshal(resH.Body.Bytes(), &hist)
	if len(hist.Items) != 2 {
		t.Fatalf("history should show 2 sent comms, got %d", len(hist.Items))
	}
}
