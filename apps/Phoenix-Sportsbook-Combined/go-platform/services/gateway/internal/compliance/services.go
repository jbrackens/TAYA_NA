package compliance

import (
	"context"
	"errors"
)

var (
	ErrInvalidUserID        = errors.New("invalid user id")
	ErrInvalidLocation      = errors.New("invalid location")
	ErrRestrictedLocation   = errors.New("restricted location")
	ErrInvalidDocument      = errors.New("invalid document")
	ErrUserNotVerified      = errors.New("user not verified")
	ErrInvalidLimitPeriod   = errors.New("invalid limit period")
	ErrDepositLimitExceeded = errors.New("deposit limit exceeded")
	ErrBetLimitExceeded     = errors.New("bet limit exceeded")
	ErrUserBlocked          = errors.New("user blocked")
	ErrUserExcluded         = errors.New("user self-excluded")
)

// GeoComplianceService defines geolocation verification operations
type GeoComplianceService interface {
	// VerifyLocation verifies a user's location
	VerifyLocation(ctx context.Context, userID string, latitude float64, longitude float64) (*LocationResult, error)

	// GetApprovedCountries returns list of countries where gaming is approved
	GetApprovedCountries(ctx context.Context) ([]string, error)

	// IsLocationApproved checks if a specific location is approved
	IsLocationApproved(ctx context.Context, country string, state string) (bool, error)
}

// KYCService defines Know Your Customer verification operations
type KYCService interface {
	// VerifyIdentity verifies a user's identity with provided documents
	VerifyIdentity(ctx context.Context, userID string, docs []VerificationDocument) (*KYCResult, error)

	// GetVerificationStatus returns the current KYC status
	GetVerificationStatus(ctx context.Context, userID string) (*KYCStatus, error)

	// SubmitDocument submits a document for KYC verification
	SubmitDocument(ctx context.Context, userID string, doc VerificationDocument) (*VerificationDocument, error)

	// ListDocuments lists all documents submitted by a user
	ListDocuments(ctx context.Context, userID string) ([]VerificationDocument, error)
}

// ResponsibleGamblingService defines responsible gambling controls
type ResponsibleGamblingService interface {
	// SetDepositLimit sets a deposit limit for a user
	SetDepositLimit(ctx context.Context, userID string, period string, amountCents int64) error

	// GetDepositLimits returns all deposit limits for a user
	GetDepositLimits(ctx context.Context, userID string) ([]DepositLimit, error)

	// SetBetLimit sets a bet stake limit for a user
	SetBetLimit(ctx context.Context, userID string, period string, amountCents int64) error

	// GetBetLimits returns all bet limits for a user
	GetBetLimits(ctx context.Context, userID string) ([]BetLimit, error)

	// CheckDepositAllowed checks if a user can deposit the given amount
	CheckDepositAllowed(ctx context.Context, userID string, amountCents int64) (bool, string, error)

	// CheckBetAllowed checks if a user can place a bet with the given stake
	CheckBetAllowed(ctx context.Context, userID string, stakeCents int64) (bool, string, error)

	// SetCoolOff sets a temporary cool-off period for a user
	SetCoolOff(ctx context.Context, userID string, duration int) error // duration in hours

	// SetSelfExclusion sets a self-exclusion for a user
	SetSelfExclusion(ctx context.Context, userID string, permanent bool) error

	// GetPlayerRestrictions returns all restrictions for a user
	GetPlayerRestrictions(ctx context.Context, userID string) (*PlayerRestrictions, error)

	// RecordDeposit records a deposit for limit tracking
	RecordDeposit(ctx context.Context, userID string, amountCents int64) error

	// RecordBet records a bet for limit tracking
	RecordBet(ctx context.Context, userID string, stakeCents int64) error
}
