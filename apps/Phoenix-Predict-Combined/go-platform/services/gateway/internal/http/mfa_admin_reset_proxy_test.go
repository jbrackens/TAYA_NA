package http

import (
	"encoding/json"
	"io"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

// TestAdminMFAResetRoute (GAP-15 slice 2) covers the gateway admin route
// PUT /api/v1/admin/users/{id}/mfa-reset: RBAC-gated (users:write), fail-closed
// when the auth-service integration is unconfigured, and — when configured —
// proxying to the auth internal endpoint with the shared secret + the target id.
func TestAdminMFAResetRoute(t *testing.T) {
	// main_test.go enables the dev anon bypass package-wide; disable it so the
	// users:write gate is actually exercised (matches TestRBACHandlers_PermissionGating).
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := newRBACTestMux()

	var gotPath, gotSecret, gotUserID, gotResetBy string
	authSrv := httptest.NewServer(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		gotPath = r.URL.Path
		gotSecret = r.Header.Get("X-Internal-Auth")
		var body struct {
			UserID  string `json:"userId"`
			ResetBy string `json:"resetBy"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		gotUserID, gotResetBy = body.UserID, body.ResetBy
		w.WriteHeader(stdhttp.StatusOK)
		_, _ = io.WriteString(w, `{"reset":true}`)
	}))
	defer authSrv.Close()

	do := func(email string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(stdhttp.MethodPut, "/api/v1/admin/users/admin-42/mfa-reset", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "uid-"+email, email, "admin"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	// 1. Fail-closed: integration not configured -> 500, and no auth call made.
	t.Setenv("AUTH_SERVICE_URL", "")
	t.Setenv("AUTH_INTERNAL_SECRET", "")
	if rec := do("super@test"); rec.Code != stdhttp.StatusInternalServerError {
		t.Fatalf("unconfigured: want 500, got %d", rec.Code)
	}
	if gotPath != "" {
		t.Fatalf("no auth call should be made when unconfigured, got path %q", gotPath)
	}

	// 2. Configured + users:write -> 200; auth called with the right path/secret/id.
	t.Setenv("AUTH_SERVICE_URL", authSrv.URL)
	t.Setenv("AUTH_INTERNAL_SECRET", "test-secret")
	if rec := do("super@test"); rec.Code != stdhttp.StatusOK {
		t.Fatalf("configured reset: want 200, got %d (%s)", rec.Code, rec.Body.String())
	}
	if gotPath != "/api/v1/auth/internal/mfa/reset" || gotSecret != "test-secret" || gotUserID != "admin-42" {
		t.Fatalf("auth call wrong: path=%q secret=%q userId=%q", gotPath, gotSecret, gotUserID)
	}
	if gotResetBy == "" {
		t.Fatal("resetBy should identify the acting admin")
	}

	// 3. RBAC: caller without users:write -> 403, and no auth call made.
	gotPath = ""
	if rec := do("reader@test"); rec.Code != stdhttp.StatusForbidden {
		t.Fatalf("no users:write: want 403, got %d", rec.Code)
	}
	if gotPath != "" {
		t.Fatal("no auth call should be made when RBAC denies")
	}
}
