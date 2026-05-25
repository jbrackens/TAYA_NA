package http

import (
	"bytes"
	"context"
	stdhttp "net/http"
	"net/http/httptest"
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
	perms map[string]map[string]struct{} // email -> permission set
	roles []rbac.RoleWithPermissions
}

func (f *rbacHandlerFake) EffectivePermissions(_ context.Context, email string) (map[string]struct{}, error) {
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
	return []rbac.UserWithRoles{}, nil
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
