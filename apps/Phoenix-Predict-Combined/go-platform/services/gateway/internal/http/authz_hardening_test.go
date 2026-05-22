package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

// These tests lock in the ADR-0002 authorization hardening: admin authority
// comes only from the validated session role (never a request header), and the
// ungated public wallet credit/debit endpoints no longer exist. The package's
// TestMain enables GATEWAY_ALLOW_ADMIN_ANON, so each test that exercises the
// real admin gate disables it first.

func newAuthzTestHandler() http.Handler {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func TestAdminRouteRejectsXAdminRoleHeader(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	handler := newAuthzTestHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/leaderboards", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusForbidden {
		t.Fatalf("X-Admin-Role header must not grant admin: want 403, got %d (body=%s)", res.Code, res.Body.String())
	}
}

func TestAdminRouteAllowsValidatedSessionAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	handler := newAuthzTestHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/leaderboards", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-test", "admin-test", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code == http.StatusForbidden || res.Code == http.StatusUnauthorized {
		t.Fatalf("validated session admin must be allowed: got %d (body=%s)", res.Code, res.Body.String())
	}
}

func TestPublicWalletMutationRoutesRemoved(t *testing.T) {
	handler := newAuthzTestHandler()

	for _, path := range []string{"/api/v1/wallet/credit", "/api/v1/wallet/debit"} {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{"userId":"u-1","amountCents":100000,"idempotencyKey":"hack-1"}`))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)

		if res.Code == http.StatusOK {
			t.Fatalf("POST %s must not succeed — there is no public mint/burn route, got 200", path)
		}
		if res.Code != http.StatusMethodNotAllowed {
			t.Fatalf("POST %s: want 405 (route removed; only the GET wallet handler remains), got %d (body=%s)", path, res.Code, res.Body.String())
		}
	}
}

func TestAdminWalletMutationRequiresValidatedAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	handler := newAuthzTestHandler()
	body := `{"userId":"u-authz-1","amountCents":500,"idempotencyKey":"authz-credit-1","reason":"test"}`

	// No admin → rejected at the gate, before any money could move.
	denyReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", strings.NewReader(body))
	denyRes := httptest.NewRecorder()
	handler.ServeHTTP(denyRes, denyReq)
	if denyRes.Code != http.StatusForbidden {
		t.Fatalf("admin wallet credit without admin: want 403, got %d (body=%s)", denyRes.Code, denyRes.Body.String())
	}

	// Validated session admin → authorization passes (no longer a 403).
	okReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", strings.NewReader(body))
	okReq = okReq.WithContext(httpx.WithTestUser(okReq.Context(), "admin-test", "admin-test", "admin"))
	okRes := httptest.NewRecorder()
	handler.ServeHTTP(okRes, okReq)
	if okRes.Code == http.StatusForbidden {
		t.Fatalf("admin wallet credit with validated admin must pass authz, got 403 (body=%s)", okRes.Body.String())
	}
}

func TestAdminWalletCreditRecordsAuditEntry(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	handler := newAuthzTestHandler()

	body := `{"userId":"u-audit-credit-1","amountCents":1234,"idempotencyKey":"audit-credit-key-1","reason":"audit test"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", strings.NewReader(body))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-auditor", "admin-auditor", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected admin credit 200, got %d (body=%s)", res.Code, res.Body.String())
	}

	found := false
	for _, e := range providerOpsAuditSnapshot() {
		if e.Action == "wallet.credit" && e.TargetID == "u-audit-credit-1" && e.ActorID == "admin-auditor" {
			found = true
			if !strings.Contains(e.Details, "audit-credit-key-1") {
				t.Fatalf("audit details should include the idempotency key, got %s", e.Details)
			}
			break
		}
	}
	if !found {
		t.Fatal("expected a wallet.credit audit entry recording the admin adjustment")
	}
}
