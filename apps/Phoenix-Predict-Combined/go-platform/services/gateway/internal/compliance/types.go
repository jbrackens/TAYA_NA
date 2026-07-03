package compliance

import "time"

// LocationResult represents the result of a geolocation verification
type LocationResult struct {
	UserID   string `json:"userId"`
	Latitude float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Status   string `json:"status"` // approved, declined, restricted
	Message  string `json:"message"`
	Country  string `json:"country"`
	State    string `json:"state,omitempty"`
	City     string `json:"city,omitempty"`
	Timestamp string `json:"timestamp"`
}

// KYCResult represents the result of KYC verification
type KYCResult struct {
	UserID          string `json:"userId"`
	Status          string `json:"status"` // pending, approved, declined, blocked
	VerificationType string `json:"verificationType"` // document, facial_recognition, etc
	RiskLevel       string `json:"riskLevel"` // low, medium, high
	Message         string `json:"message"`
	VerifiedAt      string `json:"verifiedAt,omitempty"`
	ExpiresAt       string `json:"expiresAt,omitempty"`
	DocumentType    string `json:"documentType,omitempty"` // passport, driver_license, id_card, etc
	LastFour        string `json:"lastFour,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
}

// KYCStatus represents the current KYC verification status
type KYCStatus struct {
	UserID              string `json:"userId"`
	Status              string `json:"status"` // unverified, pending, approved, declined, blocked
	RiskLevel           string `json:"riskLevel"`
	LastVerifiedAt      string `json:"lastVerifiedAt,omitempty"`
	ExpiresAt           string `json:"expiresAt,omitempty"`
	DocumentsSubmitted  []string `json:"documentsSubmitted"`
	RejectionReasons    []string `json:"rejectionReasons,omitempty"`
	Metadata            map[string]string `json:"metadata,omitempty"`
}

// DepositLimit represents a deposit limit configuration
type DepositLimit struct {
	UserID    string `json:"userId"`
	Period    string `json:"period"` // daily, weekly, monthly
	LimitCents int64  `json:"limitCents"`
	RemainingCents int64  `json:"remainingCents"`
	UsedCents int64  `json:"usedCents"`
	ResetsAt  string `json:"resetsAt"`
	CreatedAt string `json:"createdAt"`
	// LC-19/D-11 loosen-limit cooldown: a requested *increase* does not
	// take effect immediately. The effective (tighter) LimitCents stays
	// enforced until PendingActivatesAt; only then does PendingLimitCents
	// become LimitCents. Zero/empty = no pending change. A decrease
	// applies immediately and clears any pending increase.
	PendingLimitCents  int64  `json:"pendingLimitCents,omitempty"`
	PendingActivatesAt string `json:"pendingActivatesAt,omitempty"`
}

// BetLimit represents a bet stake limit
type BetLimit struct {
	UserID    string `json:"userId"`
	Period    string `json:"period"` // daily, weekly, monthly
	LimitCents int64  `json:"limitCents"`
	RemainingCents int64  `json:"remainingCents"`
	UsedCents int64  `json:"usedCents"`
	ResetsAt  string `json:"resetsAt"`
	CreatedAt string `json:"createdAt"`
	// LC-19/D-11 loosen-limit cooldown — see DepositLimit.
	PendingLimitCents  int64  `json:"pendingLimitCents,omitempty"`
	PendingActivatesAt string `json:"pendingActivatesAt,omitempty"`
}

// LossLimit represents a net-realized-loss cap over a period (GAP-11, PAM spec
// §13 Responsible Gaming). Unlike deposit/bet limits (which cap money IN and
// stake), a loss limit caps how much a player may NET LOSE in the period; its
// UsedCents is the player's realized loss (from settled payouts), populated by
// the enforcement/display slices. Stored plain-upsert like the Postgres
// bet/deposit limits (the loosen-cooldown gap is tracked separately).
type LossLimit struct {
	UserID         string `json:"userId"`
	Period         string `json:"period"` // daily, weekly, monthly
	LimitCents     int64  `json:"limitCents"`
	RemainingCents int64  `json:"remainingCents"`
	UsedCents      int64  `json:"usedCents"`
	ResetsAt       string `json:"resetsAt"`
	CreatedAt      string `json:"createdAt"`
}

// PlayerRestrictions represents all restrictions on a player
type PlayerRestrictions struct {
	UserID          string `json:"userId"`
	IsBlocked       bool   `json:"isBlocked"`
	IsOnCoolOff     bool   `json:"isOnCoolOff"`
	CoolOffUntil    string `json:"coolOffUntil,omitempty"`
	IsExcluded      bool   `json:"isExcluded"`
	ExclusionType   string `json:"exclusionType,omitempty"` // temporary, permanent
	ExcludedUntil   string `json:"excludedUntil,omitempty"`
	DepositLimits   []DepositLimit `json:"depositLimits"`
	BetLimits       []BetLimit     `json:"betLimits"`
	LossLimits      []LossLimit    `json:"lossLimits"`
	LastUpdated     string `json:"lastUpdated"`
}

// RiskAssessment is used internally to track risk
type RiskAssessment struct {
	UserID       string
	RiskScore    float64 // 0-100
	RiskLevel    string  // low, medium, high
	Factors      []string
	AssessedAt   time.Time
}

// VerificationDocument represents a document submitted for KYC
type VerificationDocument struct {
	ID           string `json:"id"`
	UserID       string `json:"userId"`
	Type         string `json:"type"` // passport, driver_license, id_card, etc
	DocumentID   string `json:"documentId"`
	IssuingCountry string `json:"issuingCountry"`
	ExpiryDate   string `json:"expiryDate,omitempty"`
	SubmittedAt  string `json:"submittedAt"`
	VerifiedAt   string `json:"verifiedAt,omitempty"`
	Status       string `json:"status"` // submitted, verifying, approved, rejected
	RejectReason string `json:"rejectReason,omitempty"`
}
