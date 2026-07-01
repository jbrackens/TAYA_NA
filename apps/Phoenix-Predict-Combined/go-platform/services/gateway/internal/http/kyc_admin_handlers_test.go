package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

func TestKYCAdminDecisionReasonRejectsMoneyWordingBeforeService(t *testing.T) {
	mux := http.NewServeMux()
	registerKYCAdminRoutes(mux, nil)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/kyc/decision", strings.NewReader(`{
		"userId": "u-kyc-unsafe",
		"approve": false,
		"reason": "cash payout review"
	}`))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-kyc", "admin-kyc@tiangge.local", "admin"))
	res := httptest.NewRecorder()

	handler.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe KYC reason to return 400 before service call, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode KYC reason error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "reason" {
		t.Fatalf("expected reason error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "cash payout") {
		t.Fatalf("unsafe KYC reason should not be echoed: %s", res.Body.String())
	}
}

func TestDecodeKYCAdminDecisionRequestTrimsSafeReason(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/kyc/decision", strings.NewReader(`{
		"userId": " u-kyc-safe ",
		"approve": true,
		"reason": " non-redeemable account review "
	}`))

	decoded, err := decodeKYCAdminDecisionRequest(req)
	if err != nil {
		t.Fatalf("expected safe KYC reason to decode: %v", err)
	}
	if decoded.UserID != "u-kyc-safe" {
		t.Fatalf("expected trimmed user id, got %q", decoded.UserID)
	}
	if decoded.Reason != "non-redeemable account review" {
		t.Fatalf("expected trimmed point-native reason, got %q", decoded.Reason)
	}
}
