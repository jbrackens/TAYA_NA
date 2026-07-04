package http

import (
	"encoding/json"
	"io"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

// TestAdminRevokeSessionsRoute (GAP-76, §11 Session Management) covers the
// gateway admin route POST /api/v1/admin/punters/{id}/revoke-sessions:
// admin-gated, a mandatory reason, fail-closed when the auth-service integration
// is unconfigured, and — when configured — proxying to the auth internal
// endpoint with the shared secret + the target punter id, plus an append-only
// audit entry.
func TestAdminRevokeSessionsRoute(t *testing.T) {
	const punterID = "u-gap76"
	newRepo := func() *fakeAdminReader {
		return &fakeAdminReader{
			detail: &prediction.AdminPunter{ID: punterID, Email: "target@predict.dev", Status: "active", CreatedAt: "2026-01-01T00:00:00Z"},
		}
	}

	var gotPath, gotSecret, gotUserID string
	authSrv := httptest.NewServer(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		gotPath = r.URL.Path
		gotSecret = r.Header.Get("X-Internal-Auth")
		var body struct {
			UserID string `json:"userId"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		gotUserID = body.UserID
		w.WriteHeader(stdhttp.StatusOK)
		_, _ = io.WriteString(w, `{"revoked":true}`)
	}))
	defer authSrv.Close()

	path := "/api/v1/admin/punters/" + punterID + "/revoke-sessions"
	do := func(repo *fakeAdminReader, method, user, email, role, bodyJSON string) *httptest.ResponseRecorder {
		handler := adminTestHandler(repo)
		var reader io.Reader
		if bodyJSON != "" {
			reader = strings.NewReader(bodyJSON)
		}
		req := httptest.NewRequest(method, path, reader)
		req = req.WithContext(httpx.WithTestUser(req.Context(), user, email, role))
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec
	}

	// 1. Wrong method (GET) -> 405.
	if rec := do(newRepo(), stdhttp.MethodGet, "admin-1", "a@test.local", "admin", ""); rec.Code != stdhttp.StatusMethodNotAllowed {
		t.Fatalf("GET: want 405, got %d", rec.Code)
	}

	// 2. Missing reason -> 400.
	t.Setenv("AUTH_SERVICE_URL", authSrv.URL)
	t.Setenv("AUTH_INTERNAL_SECRET", "test-secret")
	gotPath = ""
	if rec := do(newRepo(), stdhttp.MethodPost, "admin-1", "a@test.local", "admin", `{}`); rec.Code != stdhttp.StatusBadRequest {
		t.Fatalf("missing reason: want 400, got %d", rec.Code)
	}
	if gotPath != "" {
		t.Fatalf("no auth call should be made when the request is rejected pre-dispatch, got %q", gotPath)
	}

	// 3. Unknown punter -> 404, and no auth call made.
	gotPath = ""
	unknownRepo := &fakeAdminReader{detail: nil}
	if rec := do(unknownRepo, stdhttp.MethodPost, "admin-1", "a@test.local", "admin", `{"reason":"account compromise"}`); rec.Code != stdhttp.StatusNotFound {
		t.Fatalf("unknown punter: want 404, got %d", rec.Code)
	}
	if gotPath != "" {
		t.Fatal("no auth call should be made for an unknown punter")
	}

	// 4. Fail-closed: auth integration unconfigured -> 500, no auth call.
	t.Setenv("AUTH_SERVICE_URL", "")
	t.Setenv("AUTH_INTERNAL_SECRET", "")
	gotPath = ""
	if rec := do(newRepo(), stdhttp.MethodPost, "admin-1", "a@test.local", "admin", `{"reason":"account compromise"}`); rec.Code != stdhttp.StatusInternalServerError {
		t.Fatalf("unconfigured: want 500, got %d", rec.Code)
	}
	if gotPath != "" {
		t.Fatalf("no auth call should be made when unconfigured, got %q", gotPath)
	}

	// 5. Happy path: admin + configured + punter exists -> 200; auth called with
	//    the right path/secret/id; append-only audit entry written.
	t.Setenv("AUTH_SERVICE_URL", authSrv.URL)
	t.Setenv("AUTH_INTERNAL_SECRET", "test-secret")
	gotPath, gotSecret, gotUserID = "", "", ""
	rec := do(newRepo(), stdhttp.MethodPost, "admin-9", "super@test.local", "admin", `{"reason":"account compromise"}`)
	if rec.Code != stdhttp.StatusOK {
		t.Fatalf("configured revoke: want 200, got %d (%s)", rec.Code, rec.Body.String())
	}
	if gotPath != "/api/v1/auth/internal/sessions/revoke" || gotSecret != "test-secret" || gotUserID != punterID {
		t.Fatalf("auth call wrong: path=%q secret=%q userId=%q", gotPath, gotSecret, gotUserID)
	}
	// Audit: an append-only punter.sessions_revoked entry names the target + reason.
	foundAudit := false
	for _, e := range providerOpsAuditSnapshot() {
		if e.Action == "punter.sessions_revoked" && e.TargetID == punterID && strings.Contains(e.Details, "account compromise") {
			foundAudit = true
			break
		}
	}
	if !foundAudit {
		t.Fatal("expected an append-only punter.sessions_revoked audit entry naming the target and reason")
	}

	// 6. RBAC: a non-admin caller is refused, and no auth call is made.
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	gotPath = ""
	if rec := do(newRepo(), stdhttp.MethodPost, "u-p", "p@test.local", "player", `{"reason":"account compromise"}`); rec.Code != stdhttp.StatusForbidden && rec.Code != stdhttp.StatusUnauthorized {
		t.Fatalf("non-admin: want 403/401, got %d", rec.Code)
	}
	if gotPath != "" {
		t.Fatal("no auth call should be made when the caller is not an admin")
	}
}
