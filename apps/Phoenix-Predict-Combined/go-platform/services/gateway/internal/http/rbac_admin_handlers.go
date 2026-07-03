package http

import (
	"encoding/json"
	"errors"
	"log/slog"
	stdhttp "net/http"
	"strings"

	"phoenix-revival/gateway/internal/rbac"
	"phoenix-revival/platform/transport/httpx"
)

// registerRBACAdminRoutes wires the back-office Role-Based Access Control admin
// API the office "Access Control" screens consume:
//
//	GET  /api/v1/admin/users                 (users:read)  — list staff + roles
//	POST /api/v1/admin/users                 (users:write) — create staff account
//	PUT  /api/v1/admin/users/{id}/roles      (users:write) — replace a user's roles
//	GET  /api/v1/admin/roles                 (roles:read)  — roles + perms + catalog
//	PUT  /api/v1/admin/roles/{id}/permissions(roles:write) — replace a role's perms
//
// Authorization is two-layered: requireAdminRole (the session must be an admin)
// followed by a per-endpoint permission resolved from the caller's roles in the
// DB (see requireRBACPermission). Both no-slash and trailing-slash forms are
// registered because the office's next.config rewrite can send either (same as
// registerPredictionAdminRoutes).
func registerRBACAdminRoutes(mux *stdhttp.ServeMux, svc *rbac.Service) {
	for _, base := range []string{"/api/v1/admin", "/admin"} {
		registerRBACUsersCollection(mux, base+"/users", svc)
		registerRBACUserSubtree(mux, base+"/users/", svc)
		registerRBACRolesCollection(mux, base+"/roles", svc)
		registerRBACRoleSubtree(mux, base+"/roles/", svc)
		registerRBACMe(mux, base+"/me", svc)
	}
	slog.Info("rbac: admin access-control routes registered (users, roles, me)")
}

// GET /api/v1/admin/me — the caller's own identity + effective permissions.
// Any authenticated admin may read their OWN permissions, so this gates on the
// coarse admin-session check only (requiring a specific permission here would
// be circular — the menu that drives access needs this to render). The
// back-office uses the result to show a permission-aware sidebar; it is a UX
// hint, never the authorization boundary — every route still enforces its own
// permission server-side. Under the dev anonymous bypass it reports
// unconstrained so the menu shows everything, matching requireRBACPermission.
func registerRBACMe(mux *stdhttp.ServeMux, path string, svc *rbac.Service) {
	mux.Handle(path, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if adminAnonBypassEnabled() {
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"email":         rbacActor(r),
				"permissions":   []string{},
				"unconstrained": true,
			})
		}
		email := strings.TrimSpace(httpx.UsernameFromContext(r.Context()))
		perms, err := svc.EffectivePermissions(r.Context(), email)
		if err != nil {
			return writeRBACError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"email":         email,
			"permissions":   perms,
			"unconstrained": false,
		})
	}))
}

// GET (list) + POST (create) on the users collection.
func registerRBACUsersCollection(mux *stdhttp.ServeMux, path string, svc *rbac.Service) {
	mux.Handle(path, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireRBACPermission(r, svc, "users:read"); err != nil {
				return err
			}
			users, err := svc.ListUsers(r.Context())
			if err != nil {
				return writeRBACError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"users": rbacUserPayloads(users)})

		case stdhttp.MethodPost:
			if err := requireRBACPermission(r, svc, "users:write"); err != nil {
				return err
			}
			var body struct {
				Name     string   `json:"name"`
				Email    string   `json:"email"`
				Password string   `json:"password"`
				RoleIDs  []string `json:"roleIds"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			user, err := svc.CreateUser(r.Context(), rbac.CreateUserInput{
				Name:     body.Name,
				Email:    body.Email,
				Password: body.Password,
				RoleIDs:  body.RoleIDs,
			}, rbacActorObj(r))
			if err != nil {
				return writeRBACError(err)
			}
			recordProviderOpsAuditAction(rbacActor(r), "rbac.user.create", user.Email, map[string]any{
				"userId": user.ID,
				"roles":  roleIDList(user.Roles),
			})
			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{"user": rbacUserPayload(*user)})

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))
}

// The /users/{id} subtree (all require users:write):
//
//	PUT    /users/{id}/roles      -> replace role set
//	PUT    /users/{id}/status     -> activate / suspend
//	PUT    /users/{id}/password   -> reset temporary password
//	DELETE /users/{id}            -> delete the staff account
func registerRBACUserSubtree(mux *stdhttp.ServeMux, prefix string, svc *rbac.Service) {
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
		if rest == "" {
			return httpx.NotFound("not found")
		}
		parts := strings.Split(rest, "/")
		id := parts[0]
		if id == "" {
			return httpx.NotFound("not found")
		}

		// DELETE /users/{id}
		if len(parts) == 1 {
			if r.Method != stdhttp.MethodDelete {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodDelete)
			}
			if err := requireRBACPermission(r, svc, "users:write"); err != nil {
				return err
			}
			if err := svc.DeleteUser(r.Context(), id, rbacActorObj(r)); err != nil {
				return writeRBACError(err)
			}
			recordProviderOpsAuditAction(rbacActor(r), "rbac.user.delete", id, nil)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"deleted": true})
		}

		if len(parts) != 2 {
			return httpx.NotFound("not found")
		}
		action := parts[1]
		if r.Method != stdhttp.MethodPut {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPut)
		}
		if err := requireRBACPermission(r, svc, "users:write"); err != nil {
			return err
		}

		switch action {
		case "roles":
			var body struct {
				RoleIDs []string `json:"roleIds"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			user, err := svc.SetUserRoles(r.Context(), id, body.RoleIDs, rbacActorObj(r))
			if err != nil {
				return writeRBACError(err)
			}
			recordProviderOpsAuditAction(rbacActor(r), "rbac.user.roles", user.ID, map[string]any{
				"roles": roleIDList(user.Roles),
			})
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"user": rbacUserPayload(*user)})

		case "status":
			var body struct {
				Status string `json:"status"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			user, err := svc.SetUserStatus(r.Context(), id, body.Status, rbacActorObj(r))
			if err != nil {
				return writeRBACError(err)
			}
			recordProviderOpsAuditAction(rbacActor(r), "rbac.user.status", id, map[string]any{
				"status": user.Status,
			})
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"user": user})

		case "password":
			var body struct {
				Password string `json:"password"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			if err := svc.ResetPassword(r.Context(), id, body.Password, rbacActorObj(r)); err != nil {
				return writeRBACError(err)
			}
			// Never log the password itself.
			recordProviderOpsAuditAction(rbacActor(r), "rbac.user.password", id, nil)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"reset": true})

		default:
			return httpx.NotFound("not found")
		}
	}))
}

// GET roles + permission catalog; POST creates a custom role.
func registerRBACRolesCollection(mux *stdhttp.ServeMux, path string, svc *rbac.Service) {
	mux.Handle(path, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodGet:
			if err := requireRBACPermission(r, svc, "roles:read"); err != nil {
				return err
			}
			roles, err := svc.ListRoles(r.Context())
			if err != nil {
				return writeRBACError(err)
			}
			permissions, err := svc.ListPermissions(r.Context())
			if err != nil {
				return writeRBACError(err)
			}
			// The permission catalog rides along so the Role Matrix can render
			// its columns without a second request.
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"roles":       rbacRolePayloads(roles),
				"permissions": permissions,
			})

		case stdhttp.MethodPost:
			if err := requireRBACPermission(r, svc, "roles:write"); err != nil {
				return err
			}
			var body struct {
				Name        string `json:"name"`
				Description string `json:"description"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			if err := validateRBACRoleLaunchCopy(body.Name, body.Description); err != nil {
				return err
			}
			role, err := svc.CreateRole(r.Context(), rbac.CreateRoleInput{
				Name:        body.Name,
				Description: body.Description,
			})
			if err != nil {
				return writeRBACError(err)
			}
			recordProviderOpsAuditAction(rbacActor(r), "rbac.role.create", role.ID, map[string]any{
				"name": role.Name,
			})
			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{"role": rbacRolePayload(*role)})

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))
}

func validateRBACRoleLaunchCopy(name, description string) error {
	if err := validateLaunchFacingReason("name", strings.TrimSpace(name)); err != nil {
		return err
	}
	if err := validateLaunchFacingReason("description", strings.TrimSpace(description)); err != nil {
		return err
	}
	return nil
}

// The /roles/{id} subtree (roles:write):
//
//	PUT    /roles/{id}/permissions  -> replace permission set
//	DELETE /roles/{id}              -> delete a custom (non-system) role
func registerRBACRoleSubtree(mux *stdhttp.ServeMux, prefix string, svc *rbac.Service) {
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
		if rest == "" {
			return httpx.NotFound("not found")
		}
		parts := strings.Split(rest, "/")
		id := parts[0]
		if id == "" {
			return httpx.NotFound("not found")
		}

		// DELETE /roles/{id}
		if len(parts) == 1 {
			if r.Method != stdhttp.MethodDelete {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodDelete)
			}
			if err := requireRBACPermission(r, svc, "roles:write"); err != nil {
				return err
			}
			if err := svc.DeleteRole(r.Context(), id); err != nil {
				return writeRBACError(err)
			}
			recordProviderOpsAuditAction(rbacActor(r), "rbac.role.delete", id, nil)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"deleted": true})
		}

		// PUT /roles/{id}/permissions
		if len(parts) != 2 || parts[1] != "permissions" {
			return httpx.NotFound("not found")
		}
		if r.Method != stdhttp.MethodPut {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPut)
		}
		if err := requireRBACPermission(r, svc, "roles:write"); err != nil {
			return err
		}
		var body struct {
			PermissionIDs []string `json:"permissionIds"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		role, err := svc.SetRolePermissions(r.Context(), id, body.PermissionIDs, rbacActorObj(r))
		if err != nil {
			return writeRBACError(err)
		}
		recordProviderOpsAuditAction(rbacActor(r), "rbac.role.permissions", role.ID, map[string]any{
			"permissions": role.Permissions,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"role": rbacRolePayload(*role)})
	}))
}

func rbacUserPayload(user rbac.UserWithRoles) rbac.UserWithRoles {
	if user.Roles == nil {
		return user
	}
	roles := make([]rbac.RoleRef, 0, len(user.Roles))
	for i := range user.Roles {
		role := user.Roles[i]
		role.Name = redactLaunchProhibitedUserText(role.Name)
		roles = append(roles, role)
	}
	user.Roles = roles
	return user
}

func rbacUserPayloads(users []rbac.UserWithRoles) []rbac.UserWithRoles {
	if users == nil {
		return nil
	}
	out := make([]rbac.UserWithRoles, 0, len(users))
	for _, user := range users {
		out = append(out, rbacUserPayload(user))
	}
	return out
}

func rbacRolePayload(role rbac.RoleWithPermissions) rbac.RoleWithPermissions {
	role.Name = redactLaunchProhibitedUserText(role.Name)
	role.Description = redactLaunchProhibitedUserText(role.Description)
	return role
}

func rbacRolePayloads(roles []rbac.RoleWithPermissions) []rbac.RoleWithPermissions {
	if roles == nil {
		return nil
	}
	out := make([]rbac.RoleWithPermissions, 0, len(roles))
	for _, role := range roles {
		out = append(out, rbacRolePayload(role))
	}
	return out
}

// requireRBACPermission enforces the coarse admin-session gate, then the
// fine-grained permission resolved from the caller's roles in the DB. The
// dev-only anonymous bypass (GATEWAY_ALLOW_ADMIN_ANON, non-prod) short-circuits
// both, consistent with requireAdminRole.
func requireRBACPermission(r *stdhttp.Request, svc *rbac.Service, permission string) error {
	if err := requireAdminRole(r); err != nil {
		return err
	}
	if adminAnonBypassEnabled() {
		return nil
	}
	email := httpx.UsernameFromContext(r.Context())
	ok, err := svc.HasPermission(r.Context(), email, permission)
	if err != nil {
		return httpx.Internal("permission check failed", err)
	}
	if !ok {
		// GAP-25 (PAM spec §24 Audit Logs, §27 Security): a denied privileged
		// access attempt is a security-relevant event and must be captured in the
		// append-only audit trail — otherwise an authenticated admin probing for
		// permissions they lack leaves no forensic record. This branch is only
		// reachable after requireAdminRole succeeds, so the actor is always an
		// identified admin (not an anonymous flood), and the write records who
		// tried to reach what.
		recordProviderOpsAuditAction(
			userIDFromRequest(r),
			"access.permission_denied",
			r.URL.Path,
			map[string]any{
				"permission": permission,
				"method":     r.Method,
				"path":       r.URL.Path,
				"email":      email,
			},
		)
		return httpx.Forbidden("missing required permission: " + permission)
	}
	return nil
}

// adminRBAC is the process-wide RBAC service used by requireAdminPermission. It
// is set once by RegisterRoutes (read per-request from handler closures, so
// registration order does not matter) and is nil in memory mode / tests, where
// requireAdminPermission degrades to the admin-role gate alone — preserving
// prior behavior.
var adminRBAC *rbac.Service

// requireAdminPermission gates an admin route on the session admin role and,
// when the RBAC service is wired, the given fine-grained permission. It closes
// the escalation where any admin_users staffer could reach money/market routes
// that previously checked only requireAdminRole (SECURITY-REVIEW #5).
func requireAdminPermission(r *stdhttp.Request, permission string) error {
	if adminRBAC == nil {
		return requireAdminRole(r)
	}
	return requireRBACPermission(r, adminRBAC, permission)
}

// writeRBACError maps domain errors to HTTP responses.
func writeRBACError(err error) error {
	switch {
	case errors.Is(err, rbac.ErrDuplicateEmail), errors.Is(err, rbac.ErrLastSuperAdmin), errors.Is(err, rbac.ErrCannotTargetSelf), errors.Is(err, rbac.ErrSystemRoleProtected):
		return httpx.Conflict(redactLaunchProhibitedUserText(err.Error()), nil)
	case errors.Is(err, rbac.ErrUserNotFound), errors.Is(err, rbac.ErrRoleNotFound):
		return httpx.NotFound(redactLaunchProhibitedUserText(err.Error()))
	case errors.Is(err, rbac.ErrInsufficientPrivilege), errors.Is(err, rbac.ErrImmutableRole):
		return httpx.Forbidden(redactLaunchProhibitedUserText(err.Error()))
	}
	var ve rbac.ValidationError
	if errors.As(err, &ve) {
		return httpx.BadRequest(redactLaunchProhibitedUserText(ve.Msg), nil)
	}
	return httpx.Internal("rbac operation failed", err)
}

// rbacActor identifies the authenticated caller for audit attribution: the
// session username (email) preferred, then the user id, then "admin".
func rbacActor(r *stdhttp.Request) string {
	if email := strings.TrimSpace(httpx.UsernameFromContext(r.Context())); email != "" {
		return email
	}
	if id := strings.TrimSpace(httpx.UserIDFromContext(r.Context())); id != "" {
		return id
	}
	return "admin"
}

// rbacActorObj builds the privilege-bearing actor for RBAC mutations: the
// session email plus the dev-bypass flag. Under the bypass the actor is
// unconstrained (matching requireRBACPermission's short-circuit); otherwise the
// service resolves this email's effective permissions to bound what it can grant.
func rbacActorObj(r *stdhttp.Request) rbac.Actor {
	return rbac.Actor{
		Email:         strings.TrimSpace(httpx.UsernameFromContext(r.Context())),
		Unconstrained: adminAnonBypassEnabled(),
	}
}

func roleIDList(roles []rbac.RoleRef) []string {
	ids := make([]string, len(roles))
	for i, r := range roles {
		ids[i] = r.ID
	}
	return ids
}
