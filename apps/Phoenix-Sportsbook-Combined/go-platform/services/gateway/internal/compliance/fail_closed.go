package compliance

import (
	"context"
	"errors"
	"log/slog"
	"time"
)

var (
	ErrGeoProviderNotConfigured = errors.New("geo compliance provider not configured")
	ErrKYCProviderNotConfigured = errors.New("KYC provider not configured")
)

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
