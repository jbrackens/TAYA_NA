package models

import "time"

// UserRole represents the role of a user in the Phoenix system.
type UserRole string

const (
	// RoleAdmin has full system access and administrative privileges.
	RoleAdmin UserRole = "admin"
	// RoleOperator can manage events, markets, and perform operational tasks.
	RoleOperator UserRole = "operator"
	// RolePlayer is a regular user who can place bets.
	RolePlayer UserRole = "player"
	// RoleBot represents an automated bot account.
	RoleBot UserRole = "bot"
)

// IsValid checks if the UserRole is one of the valid roles.
func (r UserRole) IsValid() bool {
	return r == RoleAdmin || r == RoleOperator || r == RolePlayer || r == RoleBot
}

// KYCStatus represents the Know Your Customer verification status of a user.
type KYCStatus string

const (
	// KYCPending indicates the user's KYC verification is in progress.
	KYCPending KYCStatus = "pending"
	// KYCApproved indicates the user has passed KYC verification.
	KYCApproved KYCStatus = "approved"
	// KYCRejected indicates the user's KYC verification was rejected.
	KYCRejected KYCStatus = "rejected"
	// KYCNone indicates the user has not started KYC verification.
	KYCNone KYCStatus = "none"
)

// IsValid checks if the KYCStatus is one of the valid statuses.
func (k KYCStatus) IsValid() bool {
	return k == KYCPending || k == KYCApproved || k == KYCRejected || k == KYCNone
}

// User represents a user account in the Phoenix system.
type User struct {
	// ID is the unique identifier for the user.
	ID string `db:"id" json:"id"`
	// Email is the user's email address, used for communication and authentication.
	Email string `db:"email" json:"email"`
	// Username is the user's unique display name.
	Username string `db:"username" json:"username"`
	// Role is the user's role in the system (admin, operator, player, bot).
	Role UserRole `db:"role" json:"role"`
	// KYCStatus is the user's Know Your Customer verification status.
	KYCStatus KYCStatus `db:"kyc_status" json:"kyc_status"`
	// CreatedAt is the timestamp when the user account was created.
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	// UpdatedAt is the timestamp when the user account was last updated.
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// NewUser creates a new User instance with sensible defaults.
func NewUser(id, email, username string, role UserRole) *User {
	now := time.Now().UTC()
	return &User{
		ID:        id,
		Email:     email,
		Username:  username,
		Role:      role,
		KYCStatus: KYCNone,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// UpdateTimestamp updates the UpdatedAt field to the current time.
func (u *User) UpdateTimestamp() {
	u.UpdatedAt = time.Now().UTC()
}
