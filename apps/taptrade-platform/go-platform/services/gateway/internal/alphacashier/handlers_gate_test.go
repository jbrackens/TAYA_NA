package alphacashier

import (
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"taptrade/gateway/internal/compliance"
	"taptrade/platform/transport/httpx"
)

// The compliance gate must run before any cashier service logic on the
// money-movement endpoints. A zero-value Service is safe here precisely
// because a denying gate returns before the service is touched.
func TestAlphaCashierMoneyEndpointsEnforceComplianceGate(t *testing.T) {
	var surfaces []compliance.Surface
	ComplianceGate = func(_ *stdhttp.Request, _ string, surface compliance.Surface) error {
		surfaces = append(surfaces, surface)
		return httpx.Forbidden("service not available in your jurisdiction")
	}
	t.Cleanup(func() { ComplianceGate = nil })

	mux := stdhttp.NewServeMux()
	RegisterRoutes(mux, &Service{})

	cases := []struct {
		name    string
		path    string
		body    string
		surface compliance.Surface
	}{
		{"create deposit intent", "/api/v1/cashier/alpha/deposit-intents", `{"walletAddress":"0xabc","amountCents":1000}`, compliance.SurfaceDeposit},
		{"submit deposit tx", "/api/v1/cashier/alpha/deposit-intents/intent-1/submit-tx", `{"txHash":"0xdef"}`, compliance.SurfaceDeposit},
		{"create withdrawal request", "/api/v1/cashier/alpha/withdrawal-requests", `{"destinationAddress":"0xabc","amountCents":1000}`, compliance.SurfaceWithdraw},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			surfaces = nil
			req := httptest.NewRequest(stdhttp.MethodPost, tc.path, strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Idempotency-Key", "gate-test-1")
			req = req.WithContext(httpx.WithTestUser(req.Context(), "u-gate", "u-gate", "player"))
			rec := httptest.NewRecorder()

			mux.ServeHTTP(rec, req)

			if rec.Code != stdhttp.StatusForbidden {
				t.Fatalf("expected 403 when the compliance gate denies, got %d body=%s", rec.Code, rec.Body.String())
			}
			if len(surfaces) != 1 || surfaces[0] != tc.surface {
				t.Fatalf("expected gate to see surface %q once, got %v", tc.surface, surfaces)
			}
		})
	}
}

// A nil gate (package default, e.g. in other tests) must not block requests:
// the handler proceeds into normal request validation instead of 403ing.
func TestAlphaCashierNilComplianceGateIsNoOp(t *testing.T) {
	ComplianceGate = nil
	mux := stdhttp.NewServeMux()
	RegisterRoutes(mux, &Service{})

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/cashier/alpha/deposit-intents", strings.NewReader(`not-json`))
	req.Header.Set("Idempotency-Key", "gate-test-2")
	req = req.WithContext(httpx.WithTestUser(req.Context(), "u-gate", "u-gate", "player"))
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	if rec.Code == stdhttp.StatusForbidden {
		t.Fatalf("nil compliance gate must not deny; got 403 body=%s", rec.Body.String())
	}
}
