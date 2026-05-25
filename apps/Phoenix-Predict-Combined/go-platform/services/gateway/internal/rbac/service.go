package rbac

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// MinPasswordLength is the floor for a staff member's temporary password.
const MinPasswordLength = 8

// SystemFullAccessRoleID is the seeded role that always holds every permission.
// Its permission set is immutable via the API (editing it is both a lockout and
// an escalation vector); the Role Matrix UI also renders it read-only.
const SystemFullAccessRoleID = "super-admin"

// emailPattern is a deliberately loose sanity check — real deliverability is
// not this layer's job.
var emailPattern = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// Service is the RBAC business logic: input validation, password hashing, and
// atomic role/permission set replacement on top of a Repository.
type Service struct {
	repo Repository
}

// NewService wires the RBAC service to a repository.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// ListUsers returns every back-office user with their assigned roles.
func (s *Service) ListUsers(ctx context.Context) ([]UserWithRoles, error) {
	return s.repo.ListUsersWithRoles(ctx)
}

// ListRoles returns every role with the ids of its granted permissions.
func (s *Service) ListRoles(ctx context.Context) ([]RoleWithPermissions, error) {
	return s.repo.ListRolesWithPermissions(ctx)
}

// ListPermissions returns the full permission catalog (the Role Matrix columns).
func (s *Service) ListPermissions(ctx context.Context) ([]Permission, error) {
	return s.repo.ListPermissions(ctx)
}

var roleSlugSep = regexp.MustCompile(`[^a-z0-9]+`)

func slugifyRole(name string) string {
	s := roleSlugSep.ReplaceAllString(strings.ToLower(strings.TrimSpace(name)), "-")
	return strings.Trim(s, "-")
}

// CreateRole creates a custom (non-system) role with an empty permission set;
// the id is a slug derived from the name. Permissions are then granted via the
// Role Matrix.
func (s *Service) CreateRole(ctx context.Context, in CreateRoleInput) (*RoleWithPermissions, error) {
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return nil, ValidationError{Msg: "role name is required"}
	}
	id := slugifyRole(name)
	if id == "" {
		return nil, ValidationError{Msg: "role name must contain letters or numbers"}
	}
	existing, err := s.repo.ListRolesWithPermissions(ctx)
	if err != nil {
		return nil, err
	}
	for _, r := range existing {
		if r.ID == id {
			return nil, ValidationError{Msg: fmt.Sprintf("a role %q already exists; choose a different name", id)}
		}
	}
	role := Role{ID: id, Name: name, Description: strings.TrimSpace(in.Description), IsSystem: false}
	if err := s.repo.CreateRole(ctx, role); err != nil {
		return nil, err
	}
	return &RoleWithPermissions{Role: role, Permissions: []string{}}, nil
}

// DeleteRole removes a custom role (cascading its assignments). Seeded
// (is_system) roles are protected.
func (s *Service) DeleteRole(ctx context.Context, roleID string) error {
	roles, err := s.repo.ListRolesWithPermissions(ctx)
	if err != nil {
		return err
	}
	var target *RoleWithPermissions
	for i := range roles {
		if roles[i].ID == roleID {
			target = &roles[i]
			break
		}
	}
	if target == nil {
		return ErrRoleNotFound
	}
	if target.IsSystem {
		return ErrSystemRoleProtected
	}
	return s.repo.DeleteRole(ctx, roleID)
}

// CreateUser validates input, hashes the temporary password, and persists the
// user with the requested roles. actor attributes the role grants in the audit
// columns. Returns ValidationError / ErrDuplicateEmail for client errors.
func (s *Service) CreateUser(ctx context.Context, in CreateUserInput, actor Actor) (*UserWithRoles, error) {
	name := strings.TrimSpace(in.Name)
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if name == "" {
		return nil, ValidationError{Msg: "name is required"}
	}
	if !emailPattern.MatchString(email) {
		return nil, ValidationError{Msg: "a valid email is required"}
	}
	if len(in.Password) < MinPasswordLength {
		return nil, ValidationError{Msg: fmt.Sprintf("temporary password must be at least %d characters", MinPasswordLength)}
	}
	roleRefs, err := s.resolveAssignableRoles(ctx, in.RoleIDs, actor)
	if err != nil {
		return nil, err
	}

	// Friendly duplicate check ahead of the UNIQUE constraint (the constraint
	// is still the source of truth — see ErrDuplicateEmail in CreateUser).
	if existing, err := s.repo.GetUserByEmail(ctx, email); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, ErrDuplicateEmail
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &User{Email: email, Name: name, Status: StatusActive}
	if err := s.repo.CreateUser(ctx, user, string(hash), refIDs(roleRefs), grantedByOf(actor)); err != nil {
		return nil, err
	}
	return &UserWithRoles{User: *user, Roles: roleRefs}, nil
}

// SetUserRoles replaces a user's role assignments. Returns ErrUserNotFound if
// the id doesn't exist, or ValidationError for unknown role ids.
func (s *Service) SetUserRoles(ctx context.Context, userID string, roleIDs []string, actor Actor) (*UserWithRoles, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	roleRefs, err := s.resolveAssignableRoles(ctx, roleIDs, actor)
	if err != nil {
		return nil, err
	}
	if err := s.repo.SetUserRoles(ctx, user.ID, refIDs(roleRefs), grantedByOf(actor)); err != nil {
		return nil, err
	}
	return &UserWithRoles{User: *user, Roles: roleRefs}, nil
}

// SetRolePermissions replaces a role's permission set. Returns ErrRoleNotFound
// for an unknown role, or ValidationError for unknown permission ids.
func (s *Service) SetRolePermissions(ctx context.Context, roleID string, permissionIDs []string, actor Actor) (*RoleWithPermissions, error) {
	roles, err := s.repo.ListRolesWithPermissions(ctx)
	if err != nil {
		return nil, err
	}
	var target *RoleWithPermissions
	for i := range roles {
		if roles[i].ID == roleID {
			target = &roles[i]
			break
		}
	}
	if target == nil {
		return nil, ErrRoleNotFound
	}

	// The full-access role is immutable via the API: editing it can strip its
	// own permissions (lockout) or be used to launder privileges. The dev
	// bypass may still edit it.
	if !actor.Unconstrained && roleID == SystemFullAccessRoleID {
		return nil, ErrImmutableRole
	}

	cleaned, err := s.validatePermissionIDs(ctx, permissionIDs)
	if err != nil {
		return nil, err
	}

	// An actor may only ADD permissions they themselves hold; removing
	// permissions is unrestricted (it can't escalate). Skipped under the dev
	// bypass.
	if !actor.Unconstrained {
		actorPerms, err := s.repo.EffectivePermissions(ctx, actor.Email)
		if err != nil {
			return nil, err
		}
		current := toSet(target.Permissions)
		for _, p := range cleaned {
			if _, already := current[p]; already {
				continue
			}
			if _, held := actorPerms[p]; !held {
				return nil, ErrInsufficientPrivilege
			}
		}
	}

	if err := s.repo.SetRolePermissions(ctx, roleID, cleaned); err != nil {
		return nil, err
	}
	return &RoleWithPermissions{Role: target.Role, Permissions: cleaned}, nil
}

// HasPermission reports whether the active admin user with the given email holds
// the named permission. An empty email (e.g. an unauthenticated context) is
// always false.
func (s *Service) HasPermission(ctx context.Context, email, permission string) (bool, error) {
	if strings.TrimSpace(email) == "" {
		return false, nil
	}
	perms, err := s.repo.EffectivePermissions(ctx, email)
	if err != nil {
		return false, err
	}
	_, ok := perms[permission]
	return ok, nil
}

// SetUserStatus activates or suspends a staff account. Refuses self-targeting;
// the repo refuses suspending the last active super-admin.
func (s *Service) SetUserStatus(ctx context.Context, userID, status string, actor Actor) (*User, error) {
	switch UserStatus(status) {
	case StatusActive, StatusSuspended:
	default:
		return nil, ValidationError{Msg: "status must be 'active' or 'suspended'"}
	}
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	if err := s.guardNotSelf(ctx, userID, actor); err != nil {
		return nil, err
	}
	if err := s.repo.SetUserStatus(ctx, userID, status); err != nil {
		return nil, err
	}
	user.Status = UserStatus(status)
	return user, nil
}

// DeleteUser removes a staff account. Refuses self-targeting; the repo refuses
// deleting the last active super-admin.
func (s *Service) DeleteUser(ctx context.Context, userID string, actor Actor) error {
	if err := s.guardNotSelf(ctx, userID, actor); err != nil {
		return err
	}
	return s.repo.DeleteUser(ctx, userID)
}

// ResetPassword sets a new temporary password (bcrypt-hashed) for a staff
// account. The login path reads this hash via the admin_users fallback.
func (s *Service) ResetPassword(ctx context.Context, userID, newPassword string, actor Actor) error {
	if len(newPassword) < MinPasswordLength {
		return ValidationError{Msg: fmt.Sprintf("temporary password must be at least %d characters", MinPasswordLength)}
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	return s.repo.UpdateUserPassword(ctx, userID, string(hash))
}

// guardNotSelf blocks an actor from suspending or deleting their own account.
// Skipped under the dev bypass (no session identity to compare).
func (s *Service) guardNotSelf(ctx context.Context, userID string, actor Actor) error {
	if actor.Unconstrained || strings.TrimSpace(actor.Email) == "" {
		return nil
	}
	self, err := s.repo.GetUserByEmail(ctx, actor.Email)
	if err != nil {
		return err
	}
	if self != nil && self.ID == userID {
		return ErrCannotTargetSelf
	}
	return nil
}

// resolveAssignableRoles validates the requested role ids against the catalog
// and, unless the actor is unconstrained, enforces that each assigned role's
// permissions are a subset of the actor's own effective permissions — so an
// actor can never grant a role (e.g. super-admin) carrying privileges they do
// not already hold. Returns the refs, de-duplicated and order-preserving.
func (s *Service) resolveAssignableRoles(ctx context.Context, roleIDs []string, actor Actor) ([]RoleRef, error) {
	roles, err := s.repo.ListRolesWithPermissions(ctx)
	if err != nil {
		return nil, err
	}
	byID := map[string]RoleWithPermissions{}
	for _, r := range roles {
		byID[r.ID] = r
	}

	var actorPerms map[string]struct{}
	if !actor.Unconstrained {
		actorPerms, err = s.repo.EffectivePermissions(ctx, actor.Email)
		if err != nil {
			return nil, err
		}
	}

	seen := map[string]struct{}{}
	refs := []RoleRef{}
	for _, id := range roleIDs {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		role, ok := byID[id]
		if !ok {
			return nil, ValidationError{Msg: fmt.Sprintf("unknown role: %q", id)}
		}
		if !actor.Unconstrained && !isSubset(role.Permissions, actorPerms) {
			return nil, ErrInsufficientPrivilege
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		refs = append(refs, RoleRef{ID: role.ID, Name: role.Name})
	}
	return refs, nil
}

// validatePermissionIDs validates ids against the catalog and returns them
// de-duplicated and order-preserving.
func (s *Service) validatePermissionIDs(ctx context.Context, permissionIDs []string) ([]string, error) {
	perms, err := s.repo.ListPermissions(ctx)
	if err != nil {
		return nil, err
	}
	known := map[string]struct{}{}
	for _, p := range perms {
		known[p.ID] = struct{}{}
	}
	seen := map[string]struct{}{}
	cleaned := []string{}
	for _, id := range permissionIDs {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, ok := known[id]; !ok {
			return nil, ValidationError{Msg: fmt.Sprintf("unknown permission: %q", id)}
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		cleaned = append(cleaned, id)
	}
	return cleaned, nil
}

func refIDs(refs []RoleRef) []string {
	ids := make([]string, len(refs))
	for i, r := range refs {
		ids[i] = r.ID
	}
	return ids
}

// grantedByOf attributes a grant to the actor's email, falling back to "system"
// under the dev bypass (where there is no session identity).
func grantedByOf(actor Actor) string {
	if email := strings.TrimSpace(actor.Email); email != "" {
		return email
	}
	return "system"
}

// isSubset reports whether every item is present in set.
func isSubset(items []string, set map[string]struct{}) bool {
	for _, item := range items {
		if _, ok := set[item]; !ok {
			return false
		}
	}
	return true
}

func toSet(items []string) map[string]struct{} {
	set := make(map[string]struct{}, len(items))
	for _, item := range items {
		set[item] = struct{}{}
	}
	return set
}
