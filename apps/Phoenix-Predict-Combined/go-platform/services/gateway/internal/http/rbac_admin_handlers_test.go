package http

import (
	"bytes"
	"context"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/rbac"
	"phoenix-revival/platform/transport/httpx"
)

// rbacHandlerFake is a minimal rbac.Repository for handler-level tests: it drives
// permission gating via per-email effective permissions and returns fixed role
// data. Mutations are no-ops (the service logic is covered by rbac unit tests);
// these tests assert routing, method dispatch, permission gating, and the
// error -> HTTP status mapping.
type rbacHandlerFake struct {
	perms  map[string]map[string]struct{} // email -> permission set
	roles  []rbac.RoleWithPermissions
	users  []rbac.UserWithRoles
	effErr error // when set, EffectivePermissions returns it (permission-resolution failure)
}

func (f *rbacHandlerFake) EffectivePermissions(_ context.Context, email string) (map[string]struct{}, error) {
	if f.effErr != nil {
		return nil, f.effErr
	}
	if p, ok := f.perms[email]; ok {
		return p, nil
	}
	return map[string]struct{}{}, nil
}
func (f *rbacHandlerFake) ListRolesWithPermissions(context.Context) ([]rbac.RoleWithPermissions, error) {
	return f.roles, nil
}
func (f *rbacHandlerFake) ListPermissions(context.Context) ([]rbac.Permission, error) {
	return []rbac.Permission{{ID: "users:read"}, {ID: "users:write"}, {ID: "roles:read"}, {ID: "roles:write"}}, nil
}
func (f *rbacHandlerFake) ListUsersWithRoles(context.Context) ([]rbac.UserWithRoles, error) {
	return f.users, nil
}
func (f *rbacHandlerFake) GetUserByID(_ context.Context, id string) (*rbac.User, error) {
	return &rbac.User{ID: id, Email: "target@test", Status: rbac.StatusActive}, nil
}
func (f *rbacHandlerFake) GetUserByEmail(context.Context, string) (*rbac.User, error) {
	return nil, nil
}
func (f *rbacHandlerFake) CreateUser(_ context.Context, u *rbac.User, _ string, _ []string, _ string) error {
	u.ID = "new-id"
	return nil
}
func (f *rbacHandlerFake) SetUserRoles(context.Context, string, []string, string) error { return nil }
func (f *rbacHandlerFake) SetUserStatus(context.Context, string, string) error          { return nil }
func (f *rbacHandlerFake) DeleteUser(context.Context, string) error                     { return nil }
func (f *rbacHandlerFake) UpdateUserPassword(context.Context, string, string) error     { return nil }
func (f *rbacHandlerFake) CreateRole(context.Context, rbac.Role) error                  { return nil }
func (f *rbacHandlerFake) DeleteRole(context.Context, string) error                     { return nil }
func (f *rbacHandlerFake) SetRolePermissions(context.Context, string, []string) error   { return nil }

func newRBACTestMux() *stdhttp.ServeMux {
	mux := stdhttp.NewServeMux()
	fake := &rbacHandlerFake{
		perms: map[string]map[string]struct{}{
			"super@test":  {"users:read": {}, "users:write": {}, "roles:read": {}, "roles:write": {}},
			"reader@test": {"users:read": {}, "roles:read": {}},
			"noperm@test": {},
		},
		roles: []rbac.RoleWithPermissions{
			{Role: rbac.Role{ID: "super-admin", Name: "Super Admin", IsSystem: true}, Permissions: []string{"users:read", "users:write", "roles:read", "roles:write"}},
			{Role: rbac.Role{ID: "viewer", Name: "Viewer", IsSystem: false}, Permissions: []string{"users:read"}},
		},
	}
	registerRBACAdminRoutes(mux, rbac.NewService(fake))
	return mux
}

// rbacDo issues a request as the given caller (email + role) and returns the status.
func rbacDo(t *testing.T, mux *stdhttp.ServeMux, method, path, role, email, body string) int {
	t.Helper()
	var reader *bytes.Buffer
	if body != "" {
		reader = bytes.NewBufferString(body)
	} else {
		reader = bytes.NewBuffer(nil)
	}
	req := httptest.NewRequest(method, path, reader)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "uid-"+email, email, role))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec.Code
}

func TestRBACHandlers_PermissionGating(t *testing.T) {
	// main_test.go enables the dev anon bypass package-wide; disable it so the
	// permission gate is actually exercised (matches the authz_hardening tests).
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := newRBACTestMux()
	cases := []struct {
		name, method, path, role, email, body string
		want                                  int
	}{
		{"read user list with users:read", stdhttp.MethodGet, "/api/v1/admin/users", "admin", "reader@test", "", stdhttp.StatusOK},
		{"read user list without users:read", stdhttp.MethodGet, "/api/v1/admin/users", "admin", "noperm@test", "", stdhttp.StatusForbidden},
		{"non-admin session blocked", stdhttp.MethodGet, "/api/v1/admin/users", "player", "reader@test", "", stdhttp.StatusForbidden},
		{"create user without users:write", stdhttp.MethodPost, "/api/v1/admin/users", "admin", "reader@test", `{"name":"X","email":"x@y.co","password":"password1","roleIds":["viewer"]}`, stdhttp.StatusForbidden},
		{"list roles without roles:read", stdhttp.MethodGet, "/api/v1/admin/roles", "admin", "noperm@test", "", stdhttp.StatusForbidden},
		{"create role without roles:write", stdhttp.MethodPost, "/api/v1/admin/roles", "admin", "reader@test", `{"name":"R"}`, stdhttp.StatusForbidden},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := rbacDo(t, mux, tc.method, tc.path, tc.role, tc.email, tc.body); got != tc.want {
				t.Fatalf("%s %s: got %d, want %d", tc.method, tc.path, got, tc.want)
			}
		})
	}
}

func TestRBACCreateRoleRejectsMoneyWordingDescription(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := newRBACTestMux()
	req := httptest.NewRequest(
		stdhttp.MethodPost,
		"/api/v1/admin/roles",
		bytes.NewBufferString(`{"name":"Ops Reviewer","description":"cash payout reviewer"}`),
	)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "uid-super@test", "super@test", "admin"))
	res := httptest.NewRecorder()

	mux.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusBadRequest {
		t.Fatalf("expected unsafe role description status 400, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe role description error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "description" {
		t.Fatalf("expected description error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "cash payout") {
		t.Fatalf("unsafe role description should not be echoed: %s", res.Body.String())
	}

	listReq := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/admin/roles", nil)
	listReq = listReq.WithContext(httpx.WithTestUser(listReq.Context(), "uid-super@test", "super@test", "admin"))
	listRes := httptest.NewRecorder()
	mux.ServeHTTP(listRes, listReq)
	if strings.Contains(listRes.Body.String(), "cash payout") {
		t.Fatalf("unsafe role description should not be persisted into role list: %s", listRes.Body.String())
	}
}

func TestRBACRoleReadsRedactLegacyUnsafeCopy(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	fake := &rbacHandlerFake{
		perms: map[string]map[string]struct{}{
			"super@test": {"users:read": {}, "roles:read": {}},
		},
		roles: []rbac.RoleWithPermissions{
			{
				Role:        rbac.Role{ID: "legacy-role", Name: "cash payout ops", Description: "crypto payout controls", IsSystem: false},
				Permissions: []string{"users:read"},
			},
		},
		users: []rbac.UserWithRoles{
			{
				User:  rbac.User{ID: "user-1", Email: "ops@test", Name: "Ops Reviewer", Status: rbac.StatusActive},
				Roles: []rbac.RoleRef{{ID: "legacy-role", Name: "cash payout ops"}},
			},
		},
	}
	mux := stdhttp.NewServeMux()
	registerRBACAdminRoutes(mux, rbac.NewService(fake))

	roleReq := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/admin/roles", nil)
	roleReq = roleReq.WithContext(httpx.WithTestUser(roleReq.Context(), "uid-super@test", "super@test", "admin"))
	roleRes := httptest.NewRecorder()
	mux.ServeHTTP(roleRes, roleReq)

	if roleRes.Code != stdhttp.StatusOK {
		t.Fatalf("role list: want 200, got %d body=%s", roleRes.Code, roleRes.Body.String())
	}
	if fake.roles[0].Name != "cash payout ops" || fake.roles[0].Description != "crypto payout controls" {
		t.Fatalf("raw role copy should remain unchanged, got %+v", fake.roles[0].Role)
	}
	var rolePayload struct {
		Roles []rbac.RoleWithPermissions `json:"roles"`
	}
	if err := json.Unmarshal(roleRes.Body.Bytes(), &rolePayload); err != nil {
		t.Fatalf("decode role list: %v body=%s", err, roleRes.Body.String())
	}
	if len(rolePayload.Roles) != 1 ||
		rolePayload.Roles[0].Name != launchRedactedUserText ||
		rolePayload.Roles[0].Description != launchRedactedUserText {
		t.Fatalf("expected redacted role copy, got %+v", rolePayload.Roles)
	}
	if strings.Contains(roleRes.Body.String(), "cash payout") || strings.Contains(roleRes.Body.String(), "crypto payout") {
		t.Fatalf("unsafe legacy role copy leaked in role response: %s", roleRes.Body.String())
	}

	userReq := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/admin/users", nil)
	userReq = userReq.WithContext(httpx.WithTestUser(userReq.Context(), "uid-super@test", "super@test", "admin"))
	userRes := httptest.NewRecorder()
	mux.ServeHTTP(userRes, userReq)

	if userRes.Code != stdhttp.StatusOK {
		t.Fatalf("user list: want 200, got %d body=%s", userRes.Code, userRes.Body.String())
	}
	if fake.users[0].Roles[0].Name != "cash payout ops" {
		t.Fatalf("raw user role ref should remain unchanged, got %+v", fake.users[0].Roles)
	}
	var userPayload struct {
		Users []rbac.UserWithRoles `json:"users"`
	}
	if err := json.Unmarshal(userRes.Body.Bytes(), &userPayload); err != nil {
		t.Fatalf("decode user list: %v body=%s", err, userRes.Body.String())
	}
	if len(userPayload.Users) != 1 ||
		len(userPayload.Users[0].Roles) != 1 ||
		userPayload.Users[0].Roles[0].Name != launchRedactedUserText {
		t.Fatalf("expected redacted role ref in user response, got %+v", userPayload.Users)
	}
	if strings.Contains(userRes.Body.String(), "cash payout") {
		t.Fatalf("unsafe legacy role ref leaked in user response: %s", userRes.Body.String())
	}
}

func TestRBACHandlers_MethodAndErrorMapping(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := newRBACTestMux()
	cases := []struct {
		name, method, path, body string
		want                     int
	}{
		// wrong method on the users collection
		{"PUT on users collection -> 405", stdhttp.MethodPut, "/api/v1/admin/users", "", stdhttp.StatusMethodNotAllowed},
		// POST reaches the service; invalid email -> ValidationError -> 400
		{"create with bad email -> 400", stdhttp.MethodPost, "/api/v1/admin/users", `{"name":"X","email":"not-an-email","password":"password1","roleIds":["viewer"]}`, stdhttp.StatusBadRequest},
		// DELETE reaches the service; system role is protected -> 409
		{"delete system role -> 409", stdhttp.MethodDelete, "/api/v1/admin/roles/super-admin", "", stdhttp.StatusConflict},
		// unknown subpath (PUT reaches the action switch; unknown action -> 404)
		{"unknown user subpath -> 404", stdhttp.MethodPut, "/api/v1/admin/users/abc/bogus", `{}`, stdhttp.StatusNotFound},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// super@test holds every permission, so these exercise dispatch +
			// error mapping rather than the permission gate.
			if got := rbacDo(t, mux, tc.method, tc.path, "admin", "super@test", tc.body); got != tc.want {
				t.Fatalf("%s %s: got %d, want %d", tc.method, tc.path, got, tc.want)
			}
		})
	}
}

// TestRBACPermissionDenialIsAudited proves GAP-25: when an authenticated admin
// is denied a permissioned route (missing the specific permission), the denial
// is written to the append-only provider-ops audit trail. noperm@test carries
// the admin role but holds zero permissions, so GET /users (users:read) denies.
func TestRBACPermissionDenialIsAudited(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "") // TestMain enables the bypass; this test needs real gating
	mux := newRBACTestMux()
	status := rbacDo(t, mux, stdhttp.MethodGet, "/api/v1/admin/users", "admin", "noperm@test", "")
	if status != stdhttp.StatusForbidden {
		t.Fatalf("permissionless admin: got status %d, want %d", status, stdhttp.StatusForbidden)
	}
	found := false
	for _, e := range providerOpsAuditSnapshot() {
		if e.Action == "access.permission_denied" &&
			strings.Contains(e.Details, "users:read") &&
			strings.Contains(e.Details, "noperm@test") {
			if e.TargetID != "/api/v1/admin/users" {
				t.Fatalf("denial audit target = %q, want the request path", e.TargetID)
			}
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected an access.permission_denied audit entry naming users:read + noperm@test")
	}
}

// TestRBACPermittedAccessNotAuditedAsDenial guards against over-auditing: a
// caller WITH the permission must not emit a denial entry for that path.
func TestRBACPermittedAccessNotAuditedAsDenial(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "") // real gating so a permitted call actually resolves permissions
	mux := newRBACTestMux()
	if status := rbacDo(t, mux, stdhttp.MethodGet, "/api/v1/admin/roles", "admin", "reader@test", ""); status != stdhttp.StatusOK {
		t.Fatalf("reader@test GET /roles: got %d, want 200", status)
	}
	for _, e := range providerOpsAuditSnapshot() {
		if e.Action == "access.permission_denied" && strings.Contains(e.Details, "reader@test") &&
			strings.Contains(e.Details, "roles:read") {
			t.Fatal("a permitted access must not produce a denial audit entry")
		}
	}
}
