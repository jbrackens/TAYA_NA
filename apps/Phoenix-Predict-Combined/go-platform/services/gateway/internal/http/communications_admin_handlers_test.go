package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/communications"
	"phoenix-revival/platform/transport/httpx"
)

// fakeCommsLister is an in-memory communicationsLister so the GAP-43 history
// route's RBAC / method / path gates can be tested without a live database.
type fakeCommsLister struct {
	byUser map[string][]communications.Communication
	err    error
}

func (f *fakeCommsLister) ListForUser(_ context.Context, userID string, _, _ int) ([]communications.Communication, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.byUser[userID], nil
}

func commsHandler(store communicationsLister) http.Handler {
	mux := http.NewServeMux()
	registerCommunicationsAdminRoutes(mux, store)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

// A nil store leaves the routes unregistered, so requests 404.
func TestCommunicationsRoutesSkipWithoutStore(t *testing.T) {
	handler := commsHandler(nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/communications/u-1", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404 with nil store, got %d", res.Code)
	}
}

func TestCommunicationsHistoryGates(t *testing.T) {
	store := &fakeCommsLister{byUser: map[string][]communications.Communication{
		"u-1": {{ID: 2, UserID: "u-1", Channel: "email", Status: "sent"}, {ID: 1, UserID: "u-1", Channel: "sms", Status: "failed"}},
	}}
	handler := commsHandler(store)

	// Non-admin is refused (anon bypass off).
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

	// Wrong method (anon bypass on via TestMain) → 405.
	t.Run("wrong method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/communications/u-1", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusMethodNotAllowed {
			t.Fatalf("expected 405, got %d", res.Code)
		}
	})

	// Missing user id → 404.
	t.Run("no user id", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/communications/", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for missing user id, got %d", res.Code)
		}
	})

	// Happy path: admin gets the user's history.
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

	// Unknown user → empty list, still 200.
	t.Run("unknown user empty", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/communications/u-nobody", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.Code)
		}
	})
}
