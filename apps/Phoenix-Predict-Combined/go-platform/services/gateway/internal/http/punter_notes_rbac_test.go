package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/rbac"
	"phoenix-revival/platform/transport/httpx"
)

// TestAdminPunterNoteWriteRequiresUsersWrite (GAP-105, §7 Permission Model /
// §27 least-privilege) locks the write gate on the punter notes POST: adding a
// note is a WRITE and must require users:write — it previously rode the
// handler's top-level users:read gate, letting a read-only Auditor write CRM
// notes. The GET (list notes) stays a users:read operation.
func TestAdminPunterNoteWriteRequiresUsersWrite(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "") // TestMain enables the bypass; exercise the real gate
	repo := &fakeAdminReader{}
	handler := adminTestHandler(repo)

	adminRBAC = rbac.NewService(&rbacHandlerFake{perms: map[string]map[string]struct{}{
		"auditor@test": {"users:read": {}},
		"support@test": {"users:read": {}, "users:write": {}},
	}})
	t.Cleanup(func() { adminRBAC = nil })

	do := func(method, email, body string) int {
		var req *http.Request
		if body != "" {
			req = httptest.NewRequest(method, "/api/v1/admin/punters/u-1/notes", strings.NewReader(body))
		} else {
			req = httptest.NewRequest(method, "/api/v1/admin/punters/u-1/notes", nil)
		}
		req = req.WithContext(httpx.WithTestUser(req.Context(), "uid-"+email, email, "admin"))
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec.Code
	}

	// A users:read-only caller may LIST notes but must NOT add one.
	if code := do(http.MethodGet, "auditor@test", ""); code != http.StatusOK {
		t.Fatalf("GET notes with users:read: want 200, got %d", code)
	}
	if code := do(http.MethodPost, "auditor@test", `{"content":"note","category":"general"}`); code != http.StatusForbidden {
		t.Fatalf("POST note without users:write: want 403, got %d", code)
	}
	// A users:write holder adds the note (201 Created).
	if code := do(http.MethodPost, "support@test", `{"content":"note","category":"general"}`); code != http.StatusCreated {
		t.Fatalf("POST note with users:write: want 201, got %d", code)
	}
}
