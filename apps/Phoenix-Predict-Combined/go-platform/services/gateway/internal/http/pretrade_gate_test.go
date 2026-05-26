package http

import (
	"context"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/compliance"
)

type pretradeFakeKYC struct {
	status string
}

func (f *pretradeFakeKYC) GetVerificationStatus(_ context.Context, userID string) (*compliance.KYCStatus, error) {
	return &compliance.KYCStatus{UserID: userID, Status: f.status}, nil
}

func (f *pretradeFakeKYC) VerifyIdentity(context.Context, string, []compliance.VerificationDocument) (*compliance.KYCResult, error) {
	return &compliance.KYCResult{Status: f.status}, nil
}

func (f *pretradeFakeKYC) SubmitDocument(context.Context, string, compliance.VerificationDocument) (*compliance.VerificationDocument, error) {
	return &compliance.VerificationDocument{}, nil
}

func (f *pretradeFakeKYC) ListDocuments(context.Context, string) ([]compliance.VerificationDocument, error) {
	return nil, nil
}

func TestPreTradeCompliance_PermissiveBetaBypassesKYCAndGeo(t *testing.T) {
	t.Setenv("BETA_COMPLIANCE_MODE", "permissive")
	t.Setenv("GEO_GATE_ENABLED", "true")
	t.Setenv("KYC_REQUIRED_FOR_TRADING", "true")

	prevGeo := tradeGeoGate
	prevKYC := tradeKYCGate
	tradeGeoGate = compliance.NewGeoGateFromEnv()
	tradeKYCGate = &pretradeFakeKYC{status: "unverified"}
	t.Cleanup(func() {
		tradeGeoGate = prevGeo
		tradeKYCGate = prevKYC
	})

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/orders", nil)
	if err := checkPreTradeCompliance(req, "u-beta"); err != nil {
		t.Fatalf("permissive beta mode must not block on KYC or missing geo header, got %v", err)
	}
	if tradingKYCRequired() {
		t.Fatalf("permissive beta mode must force trading KYC off")
	}
}

func TestPreTradeCompliance_EnabledGeoStillFailsClosedOutsidePermissiveBeta(t *testing.T) {
	t.Setenv("BETA_COMPLIANCE_MODE", "")
	t.Setenv("GEO_GATE_ENABLED", "true")
	t.Setenv("KYC_REQUIRED_FOR_TRADING", "false")

	prevGeo := tradeGeoGate
	prevKYC := tradeKYCGate
	tradeGeoGate = compliance.NewGeoGateFromEnv()
	tradeKYCGate = nil
	t.Cleanup(func() {
		tradeGeoGate = prevGeo
		tradeKYCGate = prevKYC
	})

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/orders", nil)
	if err := checkPreTradeCompliance(req, "u-prod"); err == nil {
		t.Fatalf("enabled geo gate must fail closed when the edge country header is missing")
	}
}
