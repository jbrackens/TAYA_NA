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
	if err := checkComplianceGates(req, "u-beta", compliance.SurfaceTrade); err != nil {
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
	if err := checkComplianceGates(req, "u-prod", compliance.SurfaceTrade); err == nil {
		t.Fatalf("enabled geo gate must fail closed when the edge country header is missing")
	}
}

// setAllowlistGeoGate configures an enabled allowlist-mode geo gate (PH,TH)
// for the duration of the test, restoring the previous gates on cleanup.
func setAllowlistGeoGate(t *testing.T) {
	t.Helper()
	t.Setenv("BETA_COMPLIANCE_MODE", "")
	t.Setenv("GEO_GATE_ENABLED", "true")
	t.Setenv("GEO_ALLOWED_COUNTRIES", "PH,TH")
	t.Setenv("KYC_REQUIRED_FOR_TRADING", "false")

	prevGeo := tradeGeoGate
	prevKYC := tradeKYCGate
	tradeGeoGate = compliance.NewGeoGateFromEnv()
	tradeKYCGate = nil
	t.Cleanup(func() {
		tradeGeoGate = prevGeo
		tradeKYCGate = prevKYC
	})
}

func TestComplianceGates_DepositAndWithdrawSurfacesEnforceGeoAllowlist(t *testing.T) {
	setAllowlistGeoGate(t)

	for _, surface := range []compliance.Surface{compliance.SurfaceDeposit, compliance.SurfaceWithdraw} {
		t.Run(string(surface)+" non-allowlisted country", func(t *testing.T) {
			req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/cashier/alpha/deposit-intents", nil)
			req.Header.Set("CF-IPCountry", "US")
			if err := checkComplianceGates(req, "u-blocked", surface); err == nil {
				t.Fatalf("expected %s from non-allowlisted country to be denied", surface)
			}
		})
		t.Run(string(surface)+" missing header fails closed", func(t *testing.T) {
			req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/cashier/alpha/deposit-intents", nil)
			if err := checkComplianceGates(req, "u-nosignal", surface); err == nil {
				t.Fatalf("expected %s with no geo signal to fail closed", surface)
			}
		})
		t.Run(string(surface)+" allowlisted country", func(t *testing.T) {
			req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/cashier/alpha/deposit-intents", nil)
			req.Header.Set("CF-IPCountry", "PH")
			if err := checkComplianceGates(req, "u-allowed", surface); err != nil {
				t.Fatalf("expected %s from allowlisted country to pass, got %v", surface, err)
			}
		})
	}
}

func TestComplianceGates_TradingKYCDoesNotGateMoneySurfaces(t *testing.T) {
	// KYC_REQUIRED_FOR_TRADING gates the trade surface only — withdrawal KYC
	// is the threshold gate in internal/payments, and deposits are not
	// KYC-gated. An unverified user from an allowed country may deposit.
	t.Setenv("BETA_COMPLIANCE_MODE", "")
	t.Setenv("GEO_GATE_ENABLED", "true")
	t.Setenv("GEO_ALLOWED_COUNTRIES", "PH")
	t.Setenv("KYC_REQUIRED_FOR_TRADING", "true")

	prevGeo := tradeGeoGate
	prevKYC := tradeKYCGate
	tradeGeoGate = compliance.NewGeoGateFromEnv()
	tradeKYCGate = &pretradeFakeKYC{status: "unverified"}
	t.Cleanup(func() {
		tradeGeoGate = prevGeo
		tradeKYCGate = prevKYC
	})

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/cashier/alpha/deposit-intents", nil)
	req.Header.Set("CF-IPCountry", "PH")
	if err := checkComplianceGates(req, "u-unverified", compliance.SurfaceDeposit); err != nil {
		t.Fatalf("deposit surface must not be blocked by the trading KYC gate, got %v", err)
	}
	if err := checkComplianceGates(req, "u-unverified", compliance.SurfaceTrade); err == nil {
		t.Fatalf("trade surface must be blocked for an unverified user when trading KYC is required")
	}
}

func TestComplianceGates_TrustedProxyModeCountsMissingSignalDenials(t *testing.T) {
	setAllowlistGeoGate(t)
	t.Setenv("GEO_TRUSTED_PROXY_MODE", "require")

	before := geoMissingSignalDenials.Load()
	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/orders", nil)
	if err := checkComplianceGates(req, "u-edgegap", compliance.SurfaceTrade); err == nil {
		t.Fatalf("missing geo signal must still fail closed in trusted-proxy mode")
	}
	if got := geoMissingSignalDenials.Load(); got != before+1 {
		t.Fatalf("expected missing-signal denial counter to increment, got %d -> %d", before, got)
	}

	// A denial with a country present is a routine geo denial, not an edge gap.
	req2 := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/orders", nil)
	req2.Header.Set("CF-IPCountry", "US")
	if err := checkComplianceGates(req2, "u-blocked", compliance.SurfaceTrade); err == nil {
		t.Fatalf("non-allowlisted country must be denied")
	}
	if got := geoMissingSignalDenials.Load(); got != before+1 {
		t.Fatalf("country-present denial must not bump the missing-signal counter, got %d", got)
	}
}
