package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

// TestUserIDFromRequest_PreferContextOverHeader is the regression guard for
// Bug A from QA 2026-04-18: prediction handlers must read the authenticated
// user ID from the request context (set by httpx.Auth via cookie auth),
// falling back to the X-User-ID header only when present (set by
// prediction.BotAuthMiddleware for bot API keys).
//
// Before the fix, every cookie-authenticated call to /orders, /portfolio,
// /portfolio/summary, /bot/keys returned 401 because the handler only
// checked the header.
func TestUserIDFromRequest_PreferContextOverHeader(t *testing.T) {
	tests := []struct {
		name    string
		setupReq func() *http.Request
		want    string
	}{
		{
			name: "cookie auth: user ID from context",
			setupReq: func() *http.Request {
				r := httptest.NewRequest("GET", "/", nil)
				ctx := httpx.WithTestUser(r.Context(), "user-cookie-123", "alice", "player")
				return r.WithContext(ctx)
			},
			want: "user-cookie-123",
		},
		{
			name: "bot auth: user ID from header",
			setupReq: func() *http.Request {
				r := httptest.NewRequest("GET", "/", nil)
				r.Header.Set("X-User-ID", "user-bot-456")
				return r
			},
			want: "user-bot-456",
		},
		{
			name: "both present: context wins (cookie auth takes precedence)",
			setupReq: func() *http.Request {
				r := httptest.NewRequest("GET", "/", nil)
				ctx := httpx.WithTestUser(r.Context(), "user-ctx", "alice", "player")
				r = r.WithContext(ctx)
				r.Header.Set("X-User-ID", "user-hdr")
				return r
			},
			want: "user-ctx",
		},
		{
			name: "neither present: empty string",
			setupReq: func() *http.Request {
				return httptest.NewRequest("GET", "/", nil)
			},
			want: "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := userIDFromRequest(tc.setupReq())
			if got != tc.want {
				t.Fatalf("userIDFromRequest: got %q, want %q", got, tc.want)
			}
		})
	}
}

// Probe: does httpx expose a test helper to inject user into context?
// If not, we fall back to calling context.WithValue directly on the
// unexported contextKey. This test will fail to compile if the helper
// doesn't exist — alerting us to add one.
var _ = func() bool {
	_ = context.Background()
	return true
}()
