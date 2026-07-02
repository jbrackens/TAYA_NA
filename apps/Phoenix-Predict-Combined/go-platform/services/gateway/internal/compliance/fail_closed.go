package compliance

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"
)

var (
	ErrGeoProviderNotConfigured = errors.New("geo compliance provider not configured")
	ErrKYCProviderNotConfigured = errors.New("KYC provider not configured")
	ErrRGProviderNotConfigured  = errors.New("responsible-gambling store not available")
)

// KYCFallbackForEnv picks what stands in when the Postgres KYC store is
// unavailable. Dev and tests get the in-memory mock; production and staging
// get the fail-closed service — identity state that vanishes on restart must
// never back real compliance decisions, so a deployed environment degrades to
// denial, not to a mock that approves.
func KYCFallbackForEnv(env string) KYCService {
	switch strings.ToLower(strings.TrimSpace(env)) {
	case "production", "staging":
		return NewFailClosedKYCService()
	}
	return NewMockKYCService()
}

// RGFallbackForEnv is the responsible-gambling twin of KYCFallbackForEnv:
// limits and self-exclusions that vanish on restart must never gate real
// stakes, so deployed environments degrade to denial.
func RGFallbackForEnv(env string) ResponsibleGamblingService {
	switch strings.ToLower(strings.TrimSpace(env)) {
	case "production", "staging":
		return NewFailClosedResponsibleGamblingService()
	}
	return NewMockResponsibleGamblingService()
}

// FailClosedResponsibleGamblingService denies all stake/deposit checks and
// refuses limit mutations. Used in production/staging when the Postgres RG
// store is unavailable: with limits and self-exclusions unreadable, the only
// compliant answer to "may this user bet?" is no.
type FailClosedResponsibleGamblingService struct{}

func NewFailClosedResponsibleGamblingService() *FailClosedResponsibleGamblingService {
	slog.Warn("compliance: responsible-gambling service running in FAIL-CLOSED mode — all stake and deposit checks will be denied until the store is available")
	return &FailClosedResponsibleGamblingService{}
}

func (s *FailClosedResponsibleGamblingService) SetDepositLimit(context.Context, string, string, int64) error {
	return ErrRGProviderNotConfigured
}

func (s *FailClosedResponsibleGamblingService) GetDepositLimits(context.Context, string) ([]DepositLimit, error) {
	return nil, ErrRGProviderNotConfigured
}

func (s *FailClosedResponsibleGamblingService) SetBetLimit(context.Context, string, string, int64) error {
	return ErrRGProviderNotConfigured
}

func (s *FailClosedResponsibleGamblingService) GetBetLimits(context.Context, string) ([]BetLimit, error) {
	return nil, ErrRGProviderNotConfigured
}

func (s *FailClosedResponsibleGamblingService) CheckDepositAllowed(context.Context, string, int64) (bool, string, error) {
	return false, "responsible-gambling service unavailable", nil
}

func (s *FailClosedResponsibleGamblingService) CheckBetAllowed(context.Context, string, int64) (bool, string, error) {
	return false, "responsible-gambling service unavailable", nil
}

func (s *FailClosedResponsibleGamblingService) SetCoolOff(context.Context, string, int) error {
	return ErrRGProviderNotConfigured
}

func (s *FailClosedResponsibleGamblingService) SetSelfExclusion(context.Context, string, bool) error {
	return ErrRGProviderNotConfigured
}

func (s *FailClosedResponsibleGamblingService) GetPlayerRestrictions(context.Context, string) (*PlayerRestrictions, error) {
	return nil, ErrRGProviderNotConfigured
}

func (s *FailClosedResponsibleGamblingService) RecordDeposit(context.Context, string, int64) error {
	return ErrRGProviderNotConfigured
}

func (s *FailClosedResponsibleGamblingService) RecordBet(context.Context, string, int64) error {
	return ErrRGProviderNotConfigured
}

func (s *FailClosedResponsibleGamblingService) ReleaseBet(context.Context, string, int64, time.Time) error {
	return ErrRGProviderNotConfigured
}

// FailClosedGeoComplianceService rejects all geo-verification requests.
// Used in production when no real GeoComply/similar provider is configured.
// This ensures no user can bypass geo-fencing by default.
type FailClosedGeoComplianceService struct{}

func NewFailClosedGeoComplianceService() *FailClosedGeoComplianceService {
	slog.Warn("compliance: geo-compliance service running in FAIL-CLOSED mode — all location checks will be rejected until a real provider is configured")
	return &FailClosedGeoComplianceService{}
}

func (s *FailClosedGeoComplianceService) VerifyLocation(_ context.Context, userID string, _ float64, _ float64) (*LocationResult, error) {
	return &LocationResult{
		UserID:    userID,
		Status:    "declined",
		Message:   "geo compliance provider not configured",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (s *FailClosedGeoComplianceService) GetApprovedCountries(_ context.Context) ([]string, error) {
	return []string{}, nil
}

func (s *FailClosedGeoComplianceService) IsLocationApproved(_ context.Context, _ string, _ string) (bool, error) {
	return false, nil
}

// FailClosedKYCService rejects all KYC verification requests.
// Used in production when no real identity provider is configured.
// Verification status returns "pending" so the UI can prompt the user.
type FailClosedKYCService struct{}

func NewFailClosedKYCService() *FailClosedKYCService {
	slog.Warn("compliance: KYC service running in FAIL-CLOSED mode — all identity verifications will return pending until a real provider is configured")
	return &FailClosedKYCService{}
}

func (s *FailClosedKYCService) VerifyIdentity(_ context.Context, _ string, _ []VerificationDocument) (*KYCResult, error) {
	return nil, ErrKYCProviderNotConfigured
}

func (s *FailClosedKYCService) GetVerificationStatus(_ context.Context, userID string) (*KYCStatus, error) {
	return &KYCStatus{
		UserID:    userID,
		Status:    "pending",
		RiskLevel: "unknown",
	}, nil
}

func (s *FailClosedKYCService) SubmitDocument(_ context.Context, _ string, _ VerificationDocument) (*VerificationDocument, error) {
	return nil, ErrKYCProviderNotConfigured
}

func (s *FailClosedKYCService) ListDocuments(_ context.Context, _ string) ([]VerificationDocument, error) {
	return []VerificationDocument{}, nil
}
