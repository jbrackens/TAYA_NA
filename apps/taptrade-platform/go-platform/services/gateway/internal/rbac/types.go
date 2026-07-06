// Package rbac is the back-office Role-Based Access Control domain: staff
// accounts (admin_users), roles, granular permissions, and the many-to-many
// joins between them. It is the authorization model for operator tooling and is
// deliberately separate from `punters` (customers) and the auth service's
// `auth_users` (the login identity). See migration 027_rbac_admin.sql.
package rbac

import "time"

// UserStatus is the lifecycle state of a back-office account.
type UserStatus string

const (
	StatusActive    UserStatus = "active"
	StatusSuspended UserStatus = "suspended"
)

// Permission is a single granular capability, keyed by its id (e.g. "users:read").
// Category groups permissions into columns in the Role Matrix UI.
type Permission struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

// Role is a named bundle of permissions. ID is a stable slug (e.g. "super-admin").
// IsSystem marks the seeded roles, which cannot be deleted.
type Role struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsSystem    bool   `json:"isSystem"`
}

// RoleWithPermissions is a role plus the ids of the permissions granted to it.
type RoleWithPermissions struct {
	Role
	Permissions []string `json:"permissions"`
}

// RoleRef is a lightweight role reference (id + display name) for embedding in a
// user record without the full permission set.
type RoleRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// User is a back-office staff account. The password hash is never part of this
// struct — it lives only in the persistence layer.
type User struct {
	ID        string     `json:"id"`
	Email     string     `json:"email"`
	Name      string     `json:"name"`
	Status    UserStatus `json:"status"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// UserWithRoles is a user plus their assigned roles.
type UserWithRoles struct {
	User
	Roles []RoleRef `json:"roles"`
}

// CreateUserInput is the payload for creating a staff account.
type CreateUserInput struct {
	Name     string
	Email    string
	Password string
	RoleIDs  []string
}

// CreateRoleInput is the payload for creating a custom (non-system) role.
type CreateRoleInput struct {
	Name        string
	Description string
}

// Actor is the authenticated caller making a privileged RBAC change. Email maps
// to an admin_users record so the service can resolve the actor's own effective
// permissions and refuse to grant anything beyond them. Unconstrained is set
// only under the dev-only admin bypass (GATEWAY_ALLOW_ADMIN_ANON) and skips the
// privilege-subset and immutability checks.
type Actor struct {
	Email         string
	Unconstrained bool
}

// ValidationError is a client-correctable input error (mapped to HTTP 400). The
// service returns it for missing/invalid fields and unknown role/permission ids.
type ValidationError struct {
	Msg string
}

func (e ValidationError) Error() string { return e.Msg }
