package http

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"taptrade/platform/transport/httpx"
)

// Regression tests for IMPROVEMENT_PLAN.md P1-05 (audit SEC-01 / SEC-05).

func newP105Harness(t *testing.T) http.Handler {
	t.Helper()
	t.Setenv("AUTH_DEMO_USERNAME", "demo@taptrade.local")
	t.Setenv("AUTH_DEMO_PASSWORD", "Password123!")
	auth := NewAuthService()
	mux := http.NewServeMux()
	RegisterRoutes(mux, "auth", auth)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func p105Login(t *testing.T, handler http.Handler, username, password string) (accessToken string, res *httptest.ResponseRecorder) {
	t.Helper()
	payload, _ := json.Marshal(map[string]string{"username": username, "password": password})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(payload))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	for _, c := range rec.Result().Cookies() {
		if c.Name == "access_token" {
			accessToken = c.Value
		}
	}
	return accessToken, rec
}

func p105SessionStatus(t *testing.T, handler http.Handler, accessToken string) int {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/session", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: accessToken})
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec.Code
}

// SEC-01: logout previously double-digested the token, so the session
// survived server-side until its TTL. It must die immediately.
func TestLogoutRevokesSessionServerSide(t *testing.T) {
	handler := newP105Harness(t)

	token, loginRes := p105Login(t, handler, "demo@taptrade.local", "Password123!")
	if loginRes.Code != http.StatusOK || token == "" {
		t.Fatalf("login failed: status=%d body=%s", loginRes.Code, loginRes.Body.String())
	}
	if got := p105SessionStatus(t, handler, token); got != http.StatusOK {
		t.Fatalf("pre-logout session check expected 200, got %d", got)
	}

	logoutReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	logoutReq.AddCookie(&http.Cookie{Name: "access_token", Value: token})
	logoutRec := httptest.NewRecorder()
	handler.ServeHTTP(logoutRec, logoutReq)
	if logoutRec.Code != http.StatusOK {
		t.Fatalf("logout expected 200, got %d body=%s", logoutRec.Code, logoutRec.Body.String())
	}

	if got := p105SessionStatus(t, handler, token); got != http.StatusUnauthorized {
		t.Fatalf("token still valid after logout: session check returned %d, want 401", got)
	}
}

// Password change must revoke existing sessions, not just rotate the hash.
func TestPasswordChangeRevokesSessions(t *testing.T) {
	handler := newP105Harness(t)

	token, loginRes := p105Login(t, handler, "demo@taptrade.local", "Password123!")
	if loginRes.Code != http.StatusOK || token == "" {
		t.Fatalf("login failed: status=%d", loginRes.Code)
	}

	payload, _ := json.Marshal(map[string]string{
		"currentPassword": "Password123!",
		"newPassword":     "Password456!",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/change-password", bytes.NewBuffer(payload))
	req.AddCookie(&http.Cookie{Name: "access_token", Value: token})
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("password change expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}

	if got := p105SessionStatus(t, handler, token); got != http.StatusUnauthorized {
		t.Fatalf("old session still valid after password change: got %d, want 401", got)
	}

	if newToken, res := p105Login(t, handler, "demo@taptrade.local", "Password456!"); res.Code != http.StatusOK || newToken == "" {
		t.Fatalf("login with new password failed: status=%d", res.Code)
	}
}

// SEC-05: DELETE /sessions/{id} previously required no authentication.
func TestSessionDeleteRequiresAuthAndOwnership(t *testing.T) {
	handler := newP105Harness(t)

	// Unauthenticated → 401.
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/auth/sessions/some-digest", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated session delete expected 401, got %d", rec.Code)
	}

	// Authenticated but targeting a digest the caller doesn't own → 404.
	token, _ := p105Login(t, handler, "demo@taptrade.local", "Password123!")
	req = httptest.NewRequest(http.MethodDelete, "/api/v1/auth/sessions/not-my-session-digest", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: token})
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("foreign session delete expected 404, got %d body=%s", rec.Code, rec.Body.String())
	}
}

// SEC-05: per-IP login limiter must catch password sprays (one password,
// many usernames) that the per-username limiter never sees.
func TestLoginPerIPLimitBlocksSpray(t *testing.T) {
	handler := newP105Harness(t)

	var last int
	for i := 0; i < 31; i++ {
		payload, _ := json.Marshal(map[string]string{
			"username": fmt.Sprintf("spray-user-%d@test.local", i),
			"password": "Wrong123!",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(payload))
		req.RemoteAddr = "203.0.113.7:4444"
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		last = rec.Code
	}
	if last != http.StatusTooManyRequests {
		t.Fatalf("31st spray attempt from one IP expected 429, got %d", last)
	}
}

// SEC-05: forwarding headers must be ignored unless the peer is a trusted
// proxy; when trusted, the RIGHTMOST XFF entry (proxy-appended) wins.
func TestExtractIPTrustedProxyHandling(t *testing.T) {
	mk := func(remote, xff string) *http.Request {
		r := httptest.NewRequest(http.MethodGet, "/", nil)
		r.RemoteAddr = remote
		if xff != "" {
			r.Header.Set("X-Forwarded-For", xff)
		}
		return r
	}

	// No trusted proxies configured: client-supplied XFF is ignored.
	t.Setenv("TRUSTED_PROXY_CIDRS", "")
	if got := extractIP(mk("198.51.100.9:1234", "1.2.3.4")); got != "198.51.100.9" {
		t.Fatalf("untrusted peer: want peer IP 198.51.100.9, got %s", got)
	}

	// Trusted proxy peer: rightmost XFF entry (appended by our proxy) wins —
	// the attacker-chosen leftmost entry must NOT be used.
	t.Setenv("TRUSTED_PROXY_CIDRS", "10.0.0.0/8")
	if got := extractIP(mk("10.1.2.3:9999", "6.6.6.6, 203.0.113.50")); got != "203.0.113.50" {
		t.Fatalf("trusted peer: want rightmost XFF 203.0.113.50, got %s", got)
	}
}
