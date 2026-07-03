package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

func newAuditVerifyHarness() http.Handler {
	mux := http.NewServeMux()
	registerAuditChainVerifyRoute(mux, "/api/v1/admin/audit-logs/verify")
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func TestAuditVerifyRouteRejectsNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	h := newAuditVerifyHarness()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs/verify", nil)
	r = r.WithContext(httpx.WithTestUser(r.Context(), "u-p", "player@test.local", "player"))
	res := httptest.NewRecorder()
	h.ServeHTTP(res, r)
	if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
		t.Fatalf("non-admin must be rejected, got %d", res.Code)
	}
}

func TestAuditVerifyRouteReturnsResultAndAudits(t *testing.T) {
	h := newAuditVerifyHarness()
	r := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs/verify", nil)
	r = r.WithContext(httpx.WithTestUser(r.Context(), "audit-officer", "audit@test.local", "admin"))
	res := httptest.NewRecorder()
	h.ServeHTTP(res, r)
	if res.Code != http.StatusOK {
		t.Fatalf("admin verify: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	// The response carries the integrity verdict (file-mode store in tests
	// reports the chain as not enabled, which is an honest ok=true result).
	if !strings.Contains(res.Body.String(), `"ok"`) {
		t.Fatalf("response should carry the ok verdict, got %s", res.Body.String())
	}
	// The check itself is audited.
	assertAMLAudit(t, "audit.chain_verified", "")
}

func TestAuditVerifyRouteRejectsNonGet(t *testing.T) {
	h := newAuditVerifyHarness()
	r := httptest.NewRequest(http.MethodPost, "/api/v1/admin/audit-logs/verify", nil)
	r = r.WithContext(httpx.WithTestUser(r.Context(), "audit-officer", "audit@test.local", "admin"))
	res := httptest.NewRecorder()
	h.ServeHTTP(res, r)
	if res.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST must be 405, got %d", res.Code)
	}
}
