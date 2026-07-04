package http

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/rbac"
	"phoenix-revival/platform/transport/httpx"
)

// TestAdminPunterReadRequiresUsersRead (GAP-86, §7/§27/§29) locks the
// least-privilege gate on the Profile-360 read surface: the player list and the
// player-detail route require users:read, not the coarse role==admin check that
// let any admin session read every player regardless of grant.
func TestAdminPunterReadRequiresUsersRead(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "") // TestMain enables the bypass; exercise the real gate
	p := prediction.AdminPunter{ID: "u-1", Email: "a@predict.dev", Status: "active", CreatedAt: "2026-01-01T00:00:00Z"}
	repo := &fakeAdminReader{punters: []prediction.AdminPunter{p}, detail: &p}
	handler := adminTestHandler(repo)

	adminRBAC = rbac.NewService(&rbacHandlerFake{perms: map[string]map[string]struct{}{
		"support@test": {"users:read": {}},
		"noread@test":  {"markets:read": {}},
	}})
	t.Cleanup(func() { adminRBAC = nil })

	get := func(path, email string) int {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "uid-"+email, email, "admin"))
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec.Code
	}

	for _, path := range []string{"/api/v1/admin/punters", "/api/v1/admin/punters/u-1"} {
		if code := get(path, "noread@test"); code != http.StatusForbidden {
			t.Fatalf("%s without users:read: want 403, got %d", path, code)
		}
		if code := get(path, "support@test"); code != http.StatusOK {
			t.Fatalf("%s with users:read: want 200, got %d", path, code)
		}
	}
}
