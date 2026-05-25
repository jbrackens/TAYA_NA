package rbac

import (
	"context"
	"errors"
)

// Sentinel errors. Handlers map these to HTTP status codes (404/409); anything
// else is treated as a 500.
var (
	ErrUserNotFound   = errors.New("admin user not found")
	ErrRoleNotFound   = errors.New("role not found")
	ErrDuplicateEmail = errors.New("an admin user with that email already exists")
	// ErrInsufficientPrivilege is returned when an actor tries to grant a role or
	// permission they do not themselves hold (privilege-escalation guard).
	ErrInsufficientPrivilege = errors.New("you cannot grant privileges you do not hold")
	// ErrImmutableRole is returned when an actor tries to edit the permissions of
	// the full-access (super-admin) role, which is immutable via the API.
	ErrImmutableRole = errors.New("the super-admin role's permissions cannot be modified")
	// ErrLastSuperAdmin is returned when a change would remove the super-admin
	// role from the only active account holding it (would lock everyone out).
	ErrLastSuperAdmin = errors.New("cannot remove the last super-admin")
	// ErrCannotTargetSelf is returned when an actor tries to suspend or delete
	// their own account.
	ErrCannotTargetSelf = errors.New("you cannot suspend or delete your own account")
)

// Repository is the persistence boundary for the RBAC domain. The PostgreSQL
// implementation lives in sql_repository.go; unit tests use an in-memory fake.
type Repository interface {
	// Users
	ListUsersWithRoles(ctx context.Context) ([]UserWithRoles, error)
	GetUserByID(ctx context.Context, id string) (*User, error)       // nil, nil when not found
	GetUserByEmail(ctx context.Context, email string) (*User, error) // nil, nil when not found
	// CreateUser inserts the user + its role assignments atomically, setting
	// u.ID / u.CreatedAt / u.UpdatedAt. Returns ErrDuplicateEmail on a unique
	// email collision.
	CreateUser(ctx context.Context, u *User, passwordHash string, roleIDs []string, grantedBy string) error
	// SetUserRoles replaces the user's entire role set atomically.
	SetUserRoles(ctx context.Context, userID string, roleIDs []string, grantedBy string) error
	// SetUserStatus sets a user's status ("active"/"suspended"). Refuses to
	// suspend the last active super-admin (ErrLastSuperAdmin).
	SetUserStatus(ctx context.Context, userID, status string) error
	// DeleteUser removes a staff account (cascades role assignments). Refuses to
	// delete the last active super-admin (ErrLastSuperAdmin).
	DeleteUser(ctx context.Context, userID string) error
	// UpdateUserPassword sets a new bcrypt hash for the user.
	UpdateUserPassword(ctx context.Context, userID, passwordHash string) error

	// Roles & permissions
	ListRolesWithPermissions(ctx context.Context) ([]RoleWithPermissions, error)
	ListPermissions(ctx context.Context) ([]Permission, error)
	// SetRolePermissions replaces the role's entire permission set atomically.
	SetRolePermissions(ctx context.Context, roleID string, permissionIDs []string) error

	// EffectivePermissions returns the set of permission ids granted (via roles)
	// to the ACTIVE admin user with the given email. Suspended users and unknown
	// emails resolve to an empty set.
	EffectivePermissions(ctx context.Context, email string) (map[string]struct{}, error)
}
