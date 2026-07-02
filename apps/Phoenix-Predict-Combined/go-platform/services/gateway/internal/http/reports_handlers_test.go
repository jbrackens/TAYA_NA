package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

func TestWalletReconciliationReportUsesPointFields(t *testing.T) {
	walletSvc := wallet.NewService()
	if _, err := walletSvc.Credit(context.Background(), wallet.MutationRequest{
		UserID:         "report-user-1",
		AmountCents:    1200,
		IdempotencyKey: "reconciliation-credit-1",
		Reason:         "admin point adjustment",
	}); err != nil {
		t.Fatalf("seed credit: %v", err)
	}
	if _, err := walletSvc.Debit(context.Background(), wallet.MutationRequest{
		UserID:         "report-user-1",
		AmountCents:    350,
		IdempotencyKey: "reconciliation-debit-1",
		Reason:         "prediction point use",
	}); err != nil {
		t.Fatalf("seed debit: %v", err)
	}

	mux := http.NewServeMux()
	registerReportsRoutes(mux, walletSvc)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/wallet/reconciliation", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-test", "admin-test", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected reconciliation status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode reconciliation payload: %v", err)
	}
	if payload["unit"] != "PTS" {
		t.Fatalf("expected PTS point unit, got %+v", payload)
	}
	if int(payload["totalCreditPointsCents"].(float64)) != 1200 ||
		int(payload["totalDebitPointsCents"].(float64)) != 350 ||
		int(payload["netMovementPointsCents"].(float64)) != 850 {
		t.Fatalf("expected point-native reconciliation totals, got %+v", payload)
	}
	if int(payload["entryCount"].(float64)) != 2 || int(payload["distinctUserCount"].(float64)) != 1 {
		t.Fatalf("expected seeded ledger counts, got %+v", payload)
	}
	for _, retired := range []string{"totalCreditsCents", "totalDebitsCents", "netMovementCents"} {
		if _, ok := payload[retired]; ok {
			t.Fatalf("wallet reconciliation report leaked retired metric %s in %+v", retired, payload)
		}
	}
}

func TestPromotionUsageReportUsesPointCampaignPlaceholder(t *testing.T) {
	mux := http.NewServeMux()
	registerReportsRoutes(mux, wallet.NewService())
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/promotions/usage", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-test", "admin-test", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected promotion usage status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload map[string]map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode promotion usage payload: %v", err)
	}
	summary := payload["summary"]
	if summary["unit"] != "PTS" {
		t.Fatalf("expected PTS point unit, got %+v", summary)
	}
	if int(summary["pointRewardCampaigns"].(float64)) != 0 ||
		int(summary["usersWithPointRewards"].(float64)) != 0 ||
		int(summary["totalRewardPointsCents"].(float64)) != 0 {
		t.Fatalf("expected honest zero point-campaign summary, got %+v", summary)
	}
	for _, retired := range []string{"totalBets", "totalStakeCents", "betsWithFreebet", "betsWithOddsBoost"} {
		if _, ok := summary[retired]; ok {
			t.Fatalf("promotion usage report leaked retired metric %s in %+v", retired, summary)
		}
	}
}
