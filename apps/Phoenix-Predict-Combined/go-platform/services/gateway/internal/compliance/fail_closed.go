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

// knownDevEnvironments mirrors the gateway boot check's allowlist (GAP-4): the
// ONLY ENVIRONMENT values that get the approving in-memory mocks. Everything
// else — including a non-canonical deployed value like "prod", "preprod", or a
// typo — is a deployed environment and MUST fail closed. Keeping this as an
// allowlist (rather than an exact production/staging match) means a mistyped
// ENVIRONMENT can never silently hand out approving compliance mocks.
var knownDevEnvironments = map[string]bool{
	"":            true,
	"development": true,
	"dev":         true,
	"test":        true,
	"testing":     true,
	"local":       true,
	"ci":          true,
}

// deployedEnvironment reports whether env should run with the fail-closed
// compliance services (true for anything not in the dev allowlist).
func deployedEnvironment(env string) bool {
	return !knownDevEnvironments[strings.ToLower(strings.TrimSpace(env))]
}

// IsDeployedEnvironment is the exported form of deployedEnvironment (GAP-69) so
// other gateway packages (payments, http, …) share this single dev-allowlist
// instead of re-implementing an exact `env == "production" || "staging"` match —
// which fails OPEN for a non-canonical deployed value like "prod"/"preprod"/a
// typo, silently taking a dev fail-open branch in a real deployment.
func IsDeployedEnvironment(env string) bool {
	return deployedEnvironment(env)
}

// KYCFallbackForEnv picks what stands in when the Postgres KYC store is
// unavailable. Dev/test get the in-memory mock; any deployed environment gets
// the fail-closed service — identity state that vanishes on restart must never
// back real compliance decisions, so a deployed environment degrades to
// denial, not to a mock that approves.
func KYCFallbackForEnv(env string) KYCService {
	if deployedEnvironment(env) {
		return NewFailClosedKYCService()
	}
	return NewMockKYCService()
}

// GeoFallbackForEnv picks the geo-compliance service. Any deployed environment
// gets the fail-closed service (every location check declines) rather than the
// sandbox mock that would approve; dev/test get the mock.
func GeoFallbackForEnv(env string) GeoComplianceService {
	if deployedEnvironment(env) {
		return NewFailClosedGeoComplianceService()
	}
	return NewMockGeoComplianceServiceFromEnv()
}

// RGFallbackForEnv is the responsible-gambling twin of KYCFallbackForEnv:
// limits and self-exclusions that vanish on restart must never gate real
// stakes, so any deployed environment degrades to denial.
func RGFallbackForEnv(env string) ResponsibleGamblingService {
	if deployedEnvironment(env) {
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

func (s *FailClosedResponsibleGamblingService) SetLossLimit(context.Context, string, string, int64) error {
	return ErrRGProviderNotConfigured
}

func (s *FailClosedResponsibleGamblingService) GetLossLimits(context.Context, string) ([]LossLimit, error) {
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

func (s *FailClosedResponsibleGamblingService) SetProblemTradingFlag(context.Context, string, bool, string, string) error {
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
