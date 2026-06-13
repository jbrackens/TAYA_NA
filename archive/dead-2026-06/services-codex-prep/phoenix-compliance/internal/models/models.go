package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type SetLimitRequest struct {
	LimitType     string          `json:"limit_type"`
	LimitAmount   decimal.Decimal `json:"limit_amount"`
	Currency      string          `json:"currency"`
	EffectiveDate time.Time       `json:"effective_date"`
}

type LegacySetLimitsRequest struct {
	DailyLimit   *decimal.Decimal `json:"daily_limit,omitempty"`
	WeeklyLimit  *decimal.Decimal `json:"weekly_limit,omitempty"`
	MonthlyLimit *decimal.Decimal `json:"monthly_limit,omitempty"`
	Daily        *decimal.Decimal `json:"daily,omitempty"`
	Weekly       *decimal.Decimal `json:"weekly,omitempty"`
	Monthly      *decimal.Decimal `json:"monthly,omitempty"`
}

type LegacySetLimitsResponse struct {
	Success bool    `json:"success"`
	Message string  `json:"message,omitempty"`
	Limits  []Limit `json:"limits,omitempty"`
}

type Limit struct {
	UserID            string          `json:"user_id"`
	LimitID           string          `json:"limit_id,omitempty"`
	LimitType         string          `json:"limit_type"`
	LimitAmount       decimal.Decimal `json:"limit_amount"`
	CurrentPeriodLoss decimal.Decimal `json:"current_period_loss"`
	PeriodStart       *time.Time      `json:"period_start,omitempty"`
	SetAt             *time.Time      `json:"set_at,omitempty"`
	Currency          string          `json:"currency,omitempty"`
}

type LimitsResponse struct {
	UserID string  `json:"user_id"`
	Limits []Limit `json:"limits"`
}

type SelfExcludeRequest struct {
	ExclusionType string `json:"exclusion_type"`
	Reason        string `json:"reason"`
	DurationDays  *int   `json:"duration_days"`
}

type AdminLifecycleRequest struct {
	Enable bool   `json:"enable"`
	Reason string `json:"reason"`
}

type SelfExclusion struct {
	UserID        string    `json:"user_id"`
	ExclusionID   string    `json:"exclusion_id"`
	ExclusionType string    `json:"exclusion_type"`
	EffectiveAt   time.Time `json:"effective_at"`
	Status        string    `json:"status"`
}

type Restriction struct {
	Type     string          `json:"type"`
	Value    any             `json:"value"`
	Exceeded bool            `json:"exceeded"`
	Amount   decimal.Decimal `json:"-"`
}

type RestrictionsResponse struct {
	UserID       string        `json:"user_id"`
	Restrictions []Restriction `json:"restrictions"`
}

type LimitHistoryEntry struct {
	Period        string    `json:"period"`
	Limit         string    `json:"limit"`
	EffectiveFrom time.Time `json:"effectiveFrom"`
	LimitType     string    `json:"limitType"`
	RequestedAt   time.Time `json:"requestedAt"`
}

type LimitHistoryResponse struct {
	Data         []LimitHistoryEntry `json:"data"`
	HasNextPage  bool                `json:"hasNextPage"`
	ItemsPerPage int                 `json:"itemsPerPage"`
	TotalCount   int                 `json:"totalCount"`
}

type AdminLimitHistoryResponse struct {
	Data         []AdminLimitHistoryEntry `json:"data"`
	CurrentPage  int                      `json:"currentPage"`
	ItemsPerPage int                      `json:"itemsPerPage"`
	TotalCount   int                      `json:"totalCount"`
}

type AdminLimitHistoryEntry struct {
	Period        string    `json:"period"`
	Limit         string    `json:"limit"`
	EffectiveFrom time.Time `json:"effectiveFrom"`
	LimitType     string    `json:"limitType"`
	RequestedAt   time.Time `json:"requestedAt"`
}

type CoolOffHistoryEntry struct {
	Reason       string     `json:"reason"`
	CoolOffStart time.Time  `json:"coolOffStart"`
	CoolOffEnd   *time.Time `json:"coolOffEnd,omitempty"`
}

type CoolOffHistoryResponse struct {
	Data         []CoolOffHistoryEntry `json:"data"`
	HasNextPage  bool                  `json:"hasNextPage"`
	ItemsPerPage int                   `json:"itemsPerPage"`
	TotalCount   int                   `json:"totalCount"`
}

type AdminCoolOffHistoryResponse struct {
	Data         []AdminCoolOffHistoryEntry `json:"data"`
	CurrentPage  int                        `json:"currentPage"`
	ItemsPerPage int                        `json:"itemsPerPage"`
	TotalCount   int                        `json:"totalCount"`
}

type AdminCoolOffHistoryEntry struct {
	PunterID     string     `json:"punterId"`
	CoolOffStart time.Time  `json:"coolOffStart"`
	CoolOffEnd   *time.Time `json:"coolOffEnd,omitempty"`
	CoolOffCause string     `json:"coolOffCause"`
}

type AMLCheckRequest struct {
	UserID      string    `json:"user_id"`
	FullName    string    `json:"full_name"`
	DateOfBirth time.Time `json:"date_of_birth"`
	Country     string    `json:"country"`
}

type AMLCheck struct {
	CheckID     string     `json:"check_id"`
	UserID      string     `json:"user_id"`
	Status      string     `json:"status"`
	Result      string     `json:"result,omitempty"`
	RiskLevel   string     `json:"risk_level,omitempty"`
	InitiatedAt time.Time  `json:"initiated_at,omitempty"`
	CheckedAt   *time.Time `json:"checked_at,omitempty"`
}

type ComplianceAlertRequest struct {
	AlertType   string `json:"alert_type"`
	UserID      string `json:"user_id"`
	Description string `json:"description"`
	Severity    string `json:"severity"`
}

type ComplianceAlert struct {
	AlertID   string    `json:"alert_id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type ResponsibilityCheckAcceptance struct {
	UserID     string    `json:"user_id"`
	AcceptedAt time.Time `json:"accepted_at"`
}

type GeoComplyLicenseResponse struct {
	Value string `json:"value"`
}

type GeoComplyPacketRequest struct {
	EncryptedString string `json:"encryptedString"`
}

type GeoComplyTroubleshooterReason struct {
	Retry     bool    `json:"retry"`
	Message   string  `json:"message"`
	HelpLink  *string `json:"helpLink,omitempty"`
	OptInLink *string `json:"optInLink,omitempty"`
}

type GeoComplyPacketResponse struct {
	Result                      string                          `json:"result"`
	AnotherGeolocationInSeconds int                             `json:"anotherGeolocationInSeconds,omitempty"`
	Errors                      []string                        `json:"errors,omitempty"`
	Reasons                     []GeoComplyTroubleshooterReason `json:"reasons,omitempty"`
}
