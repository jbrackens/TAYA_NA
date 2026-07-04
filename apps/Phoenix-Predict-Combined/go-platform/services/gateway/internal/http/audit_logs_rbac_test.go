package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/rbac"
	"phoenix-revival/platform/transport/httpx"
)

// TestAdminAuditLogsRequiresAuditRead (GAP-80) locks the least-privilege gate on
// the compliance audit-log read route: it now requires the dedicated audit:read
// permission, not the coarse role==admin check that let any back-office admin
// read the full trail (§7/§24/§27).
func TestAdminAuditLogsRequiresAuditRead(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "") // TestMain enables the bypass; exercise the real gate
	repo := &fakeAdminReader{}
	handler := adminTestHandler(repo)

	get := func(user, email, role string) int {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), user, email, role))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		return res.Code
	}

	// 1. Non-privileged caller (player) is refused — the route is gated.
	if code := get("u-p", "p@test.local", "player"); code != http.StatusForbidden && code != http.StatusUnauthorized {
		t.Fatalf("player: expected refusal, got %d", code)
	}

	// 2. With the real RBAC service wired, only a caller HOLDING audit:read passes
	//    — an admin-role user without it is refused (the tightening away from
	//    "any admin reads the full trail").
	adminRBAC = rbac.NewService(&rbacHandlerFake{perms: map[string]map[string]struct{}{
		"auditor@test":    {"audit:read": {}},
		"plainadmin@test": {"users:read": {}},
	}})
	t.Cleanup(func() { adminRBAC = nil })

	if code := get("uid-plain", "plainadmin@test", "admin"); code != http.StatusForbidden {
		t.Fatalf("admin without audit:read: expected 403, got %d", code)
	}
	if code := get("uid-aud", "auditor@test", "admin"); code != http.StatusOK {
		t.Fatalf("holder of audit:read: expected 200, got %d", code)
	}
}
