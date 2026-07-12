package store

import (
	"errors"
	"time"
)

// PurchaseStatus is the store_purchases state machine:
// pending_payment -> completed | failed | canceled. Terminal states are
// final; only pending_payment rows may transition (same canApply pattern as
// the proven legacy webhook handler).
type PurchaseStatus string

const (
	StatusPendingPayment PurchaseStatus = "pending_payment"
	StatusCompleted      PurchaseStatus = "completed"
	StatusFailed         PurchaseStatus = "failed"
	StatusCanceled       PurchaseStatus = "canceled"
)

// Terminal reports whether the status is final.
func (s PurchaseStatus) Terminal() bool {
	switch s {
	case StatusCompleted, StatusFailed, StatusCanceled:
		return true
	default:
		return false
	}
}

// CanTransition reports whether a purchase may move from -> to. Only
// pending_payment rows transition, and only into a terminal state.
func CanTransition(from, to PurchaseStatus) bool {
	if from != StatusPendingPayment {
		return false
	}
	return to.Terminal()
}

// Wallet ledger reasons for purchase fulfillment. Deliberately NOT in the
// free-grant reason set (isRewardGrantReason in internal/http): paid
// purchases must not consume the free-faucet daily budget or trip the
// free-grant device/IP cluster caps. Both pass the launch-safety copy scrub
// (compliance.HasLaunchProhibitedCopy) — pinned by tests in this package.
const (
	ReasonPointPackPurchase = "point_pack_purchase"
	ReasonPromoBonus        = "promo_bonus"
)

// PurchaseCreditKey is the wallet idempotency key for the base-point credit.
// The store_purchase: prefix collides with no existing wallet key prefix and
// no mission/badge ledger-evidence matcher. Keys are per-order so a user can
// buy the same pack repeatedly.
func PurchaseCreditKey(purchaseID string) string {
	return "store_purchase:" + purchaseID
}

// PurchaseBonusCreditKey is the wallet idempotency key for the bonus credit.
func PurchaseBonusCreditKey(purchaseID string) string {
	return PurchaseCreditKey(purchaseID) + ":bonus"
}

// PointPack is one row of the operator-configured catalogue.
type PointPack struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	PriceUsdCents int64      `json:"priceUsdCents"`
	BasePoints    int64      `json:"basePoints"`
	BonusPoints   int64      `json:"bonusPoints"`
	DisplayOrder  int        `json:"displayOrder"`
	Active        bool       `json:"active"`
	Badge         string     `json:"badge,omitempty"`
	IntroOnly     bool       `json:"introOnly"`
	PromoStartsAt *time.Time `json:"promoStartsAt,omitempty"`
	PromoEndsAt   *time.Time `json:"promoEndsAt,omitempty"`
	StripePriceID string     `json:"-"`
	CreatedAt     time.Time  `json:"-"`
	UpdatedAt     time.Time  `json:"-"`
}

// TotalPoints is computed, never stored (contract §2).
func (p PointPack) TotalPoints() int64 {
	return p.BasePoints + p.BonusPoints
}

// Purchase is one store_purchases row: server-resolved snapshot + state.
type Purchase struct {
	ID                   string
	UserID               string
	PackID               string
	PriceUsdCents        int64
	BasePoints           int64
	BonusPoints          int64
	Status               PurchaseStatus
	Provider             string
	ProviderSessionID    string
	ClientIdempotencyKey string
	FailureReason        string
	CreatedAt            time.Time
	UpdatedAt            time.Time
	CompletedAt          *time.Time
}

// TotalPoints is the total the purchase settles for when completed.
func (p Purchase) TotalPoints() int64 {
	return p.BasePoints + p.BonusPoints
}

// PaymentEvent is one append-only store_payment_events evidence row.
type PaymentEvent struct {
	PurchaseID      string
	EventType       string
	ProviderEventID string
	SignatureValid  bool
	Payload         string
	ReceivedAt      time.Time
}

// --- Provider DTOs (contract §6) ---

// CheckoutSessionRequest registers a checkout attempt with the provider.
// Amounts come from the server-side purchase snapshot only.
type CheckoutSessionRequest struct {
	PurchaseID    string
	UserID        string
	PackID        string
	PriceUsdCents int64
	TotalPoints   int64
}

// CheckoutSession is the provider session detail returned to the client.
type CheckoutSession struct {
	ProviderSessionID string
	// CheckoutToken is the opaque token the demo checkout screen presents
	// back on confirmation. Stripe would return a hosted checkout URL here.
	CheckoutToken string
}

// CheckoutStatusState is the provider's view of a checkout session.
type CheckoutStatusState string

const (
	CheckoutStatePending   CheckoutStatusState = "pending"
	CheckoutStateCompleted CheckoutStatusState = "completed"
	CheckoutStateFailed    CheckoutStatusState = "failed"
	CheckoutStateCanceled  CheckoutStatusState = "canceled"
)

// CheckoutStatus is the result of a provider status poll.
type CheckoutStatus struct {
	ProviderSessionID string
	State             CheckoutStatusState
}

// Demo checkout outcomes selectable on the simulated checkout screen.
const (
	DemoOutcomeSuccess = "success"
	DemoOutcomeFailure = "failure"
	DemoOutcomeCancel  = "cancel"
	DemoOutcomeDelayed = "delayed"
)

// ConfirmationInput is a provider confirmation (demo confirm call or a
// verified webhook event) to be mapped to a purchase outcome.
type ConfirmationInput struct {
	PurchaseID        string
	ProviderSessionID string
	Outcome           string
	ProviderEventID   string
}

// PurchaseOutcome is the mapped result of a provider confirmation.
type PurchaseOutcome string

const (
	OutcomeCompleted PurchaseOutcome = "completed"
	OutcomeFailed    PurchaseOutcome = "failed"
	OutcomeCanceled  PurchaseOutcome = "canceled"
	OutcomePending   PurchaseOutcome = "pending"
)

// ConfirmationResult is what a provider confirmation resolved to. The
// provider never credits points itself — fulfillment is server-side only.
type ConfirmationResult struct {
	Outcome         PurchaseOutcome
	FailureReason   string
	EventType       string
	ProviderEventID string
}

// --- Structured errors ---

var (
	ErrPackNotFound           = errors.New("store: point pack not found")
	ErrPackUnavailable        = errors.New("store: point pack is not available for this account")
	ErrPurchaseNotFound       = errors.New("store: purchase not found")
	ErrInvalidTransition      = errors.New("store: purchase is in a terminal state and cannot transition")
	ErrIdempotencyKeyRequired = errors.New("store: idempotencyKey is required")
	ErrDuplicateClientKey     = errors.New("store: duplicate client idempotency key")
	ErrOutcomeInvalid         = errors.New("store: unknown checkout outcome")
	ErrProviderSessionUnknown = errors.New("store: unknown provider session")
	ErrConfirmNotSupported    = errors.New("store: manual confirmation is only available for the demo provider")
)
