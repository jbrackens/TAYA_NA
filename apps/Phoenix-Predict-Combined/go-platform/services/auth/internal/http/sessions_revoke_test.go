package http

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestInternalSessionsRevokeEndpoint (GAP-76, §11 Session Management) exercises
// the fail-closed internal session-revocation endpoint: inert without
// AUTH_INTERNAL_SECRET, 403 on a wrong secret, and a successful call terminates
// EVERY live session for the target user while leaving other users' sessions
// intact — the "kick session" recovery path an operator uses on a compromised or
// just-suspended account. Memory mode (no DB required).
func TestInternalSessionsRevokeEndpoint(t *testing.T) {
	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)

	const target = "compromised-user"
	const bystander = "other-user"
	// One live session per user. (The file store's Put enforces single-session per
	// user, so one Put per user is the realistic seed.)
	_ = auth.store.Put(session{UserID: target, AccessTokenDigest: "t-a1", RefreshTokenDigest: "t-r1"})
	_ = auth.store.Put(session{UserID: bystander, AccessTokenDigest: "o-a1", RefreshTokenDigest: "o-r1"})
	sessionCount := func(userID string) int {
		s, _ := auth.store.ListByUserID(userID)
		return len(s)
	}

	post := func(secretHeader, bodyJSON string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodPost, "/api/v1/auth/internal/sessions/revoke", bytes.NewBufferString(bodyJSON))
		if secretHeader != "" {
			r.Header.Set("X-Internal-Auth", secretHeader)
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}

	if sessionCount(target) != 1 || sessionCount(bystander) != 1 {
		t.Fatalf("seed: want 1 session each, got target=%d bystander=%d",
			sessionCount(target), sessionCount(bystander))
	}

	// 1. No AUTH_INTERNAL_SECRET -> endpoint inert (404); sessions untouched.
	t.Setenv("AUTH_INTERNAL_SECRET", "")
	if w := post("anything", `{"userId":"`+target+`"}`); w.Code != http.StatusNotFound {
		t.Fatalf("unset secret: want 404, got %d", w.Code)
	}
	if sessionCount(target) == 0 {
		t.Fatal("sessions must be untouched while the endpoint is inert")
	}

	// 2. Secret set, wrong header -> 403; sessions untouched.
	t.Setenv("AUTH_INTERNAL_SECRET", "s3cr3t-internal")
	if w := post("wrong", `{"userId":"`+target+`"}`); w.Code != http.StatusForbidden {
		t.Fatalf("wrong secret: want 403, got %d", w.Code)
	}
	if sessionCount(target) == 0 {
		t.Fatal("sessions must be untouched on a rejected call")
	}

	// 3. Correct secret -> 200; target's sessions cleared, bystander untouched.
	if w := post("s3cr3t-internal", `{"userId":"`+target+`"}`); w.Code != http.StatusOK {
		t.Fatalf("valid revoke: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	if got := sessionCount(target); got != 0 {
		t.Fatalf("target sessions must be revoked, still have %d", got)
	}
	if got := sessionCount(bystander); got != 1 {
		t.Fatalf("bystander sessions must be untouched, have %d", got)
	}

	// 4. Idempotent: revoking again (no sessions present) still succeeds.
	if w := post("s3cr3t-internal", `{"userId":"`+target+`"}`); w.Code != http.StatusOK {
		t.Fatalf("idempotent revoke: want 200, got %d", w.Code)
	}

	// 5. Missing userId -> 400.
	if w := post("s3cr3t-internal", `{}`); w.Code != http.StatusBadRequest {
		t.Fatalf("missing userId: want 400, got %d", w.Code)
	}

	// 6. Non-POST -> 405.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/internal/sessions/revoke", nil)
	req.Header.Set("X-Internal-Auth", "s3cr3t-internal")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET: want 405, got %d", w.Code)
	}
}
