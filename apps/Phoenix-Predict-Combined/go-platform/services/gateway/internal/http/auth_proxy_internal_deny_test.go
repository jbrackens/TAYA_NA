package http

import (
	stdhttp "net/http"
	"net/http/httptest"
	"testing"
)

// TestAuthProxyDeniesInternalPaths (verification #15 F1) proves the public auth
// proxy refuses /api/v1/auth/internal/* — those endpoints (e.g. MFA reset) are
// server-to-server only and must not be reachable via the public, CSRF-exempt
// proxy prefix even with a client-supplied X-Internal-Auth header. Normal auth
// paths still proxy through.
func TestAuthProxyDeniesInternalPaths(t *testing.T) {
	var upstreamPaths []string
	upstream := httptest.NewServer(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		upstreamPaths = append(upstreamPaths, r.URL.Path)
		w.WriteHeader(stdhttp.StatusOK)
	}))
	defer upstream.Close()
	t.Setenv("AUTH_SERVICE_URL", upstream.URL)

	mux := stdhttp.NewServeMux()
	registerAuthProxy(mux)

	// /internal/* is denied at the gateway (404) and never forwarded, even with a
	// leaked secret in the header.
	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/auth/internal/mfa/reset", nil)
	req.Header.Set("X-Internal-Auth", "leaked-secret")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != stdhttp.StatusNotFound {
		t.Fatalf("internal path via proxy: want 404, got %d", rec.Code)
	}
	for _, p := range upstreamPaths {
		if p == "/api/v1/auth/internal/mfa/reset" {
			t.Fatal("internal path must NOT be forwarded to the auth service")
		}
	}

	// The /auth/ alias is rewritten and also denied for internal paths.
	upstreamPaths = nil
	aliasReq := httptest.NewRequest(stdhttp.MethodPost, "/auth/internal/mfa/reset", nil)
	aliasRec := httptest.NewRecorder()
	mux.ServeHTTP(aliasRec, aliasReq)
	if aliasRec.Code != stdhttp.StatusNotFound {
		t.Fatalf("/auth/internal alias: want 404, got %d", aliasRec.Code)
	}

	// A normal auth path IS proxied through.
	upstreamPaths = nil
	loginRec := httptest.NewRecorder()
	mux.ServeHTTP(loginRec, httptest.NewRequest(stdhttp.MethodPost, "/api/v1/auth/login", nil))
	forwarded := false
	for _, p := range upstreamPaths {
		if p == "/api/v1/auth/login" {
			forwarded = true
		}
	}
	if !forwarded {
		t.Fatalf("normal auth path should proxy through; upstream saw %v", upstreamPaths)
	}
}
