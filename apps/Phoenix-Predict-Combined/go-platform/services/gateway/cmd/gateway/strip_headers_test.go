package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestStripClientIdentityHeadersRemovesInternalAuth (verification #16) locks in
// that the dev/demo (auth-disabled) chain strips a client-supplied
// X-Internal-Auth, keeping it consistent with the main httpx ingress strip so
// the server-to-server auth header can never be injected by a client.
func TestStripClientIdentityHeadersRemovesInternalAuth(t *testing.T) {
	var sawInternal, sawUserID string
	h := stripClientIdentityHeaders(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		sawInternal = r.Header.Get("X-Internal-Auth")
		sawUserID = r.Header.Get("X-User-ID")
	}))
	req := httptest.NewRequest(http.MethodGet, "/anything", nil)
	req.Header.Set("X-Internal-Auth", "leaked-secret")
	req.Header.Set("X-User-ID", "victim")
	h.ServeHTTP(httptest.NewRecorder(), req)
	if sawInternal != "" {
		t.Fatalf("X-Internal-Auth must be stripped, handler saw %q", sawInternal)
	}
	if sawUserID != "" {
		t.Fatalf("X-User-ID must be stripped, handler saw %q", sawUserID)
	}
}
