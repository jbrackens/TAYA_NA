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

// GAP-72 (§23 Reporting): the reconciliation report honors ?from=/?to= so an
// auditor can pull a PERIOD, not just all-time. Seeded entries are timestamped
// ~now, so a window spanning all eras includes them, a past-only or future-only
// window excludes them, and a malformed date is a 400 (not the 500 the old get
// wrapper produced for any fn error).
func TestWalletReconciliationReportDateRange(t *testing.T) {
	walletSvc := wallet.NewService()
	if _, err := walletSvc.Credit(context.Background(), wallet.MutationRequest{
		UserID: "range-user-1", AmountCents: 1000, IdempotencyKey: "range-credit-1",
	}); err != nil {
		t.Fatalf("seed credit: %v", err)
	}
	if _, err := walletSvc.Debit(context.Background(), wallet.MutationRequest{
		UserID: "range-user-1", AmountCents: 400, IdempotencyKey: "range-debit-1",
	}); err != nil {
		t.Fatalf("seed debit: %v", err)
	}

	mux := http.NewServeMux()
	registerReportsRoutes(mux, walletSvc)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	call := func(qs string) (int, map[string]any) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/wallet/reconciliation"+qs, nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-test", "admin-test", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		var payload map[string]any
		if res.Code == http.StatusOK {
			if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
				t.Fatalf("decode payload for %q: %v", qs, err)
			}
		}
		return res.Code, payload
	}

	// A window spanning all eras includes the ~now entries → full totals.
	code, p := call("?from=2000-01-01&to=2999-12-31")
	if code != http.StatusOK {
		t.Fatalf("wide window: expected 200, got %d", code)
	}
	if int(p["totalCreditPointsCents"].(float64)) != 1000 || int(p["totalDebitPointsCents"].(float64)) != 400 ||
		int(p["netMovementPointsCents"].(float64)) != 600 || int(p["entryCount"].(float64)) != 2 {
		t.Fatalf("wide window should include seeded entries, got %+v", p)
	}

	// A past-only window excludes the ~now entries (proves the 'to' upper bound).
	code, p = call("?from=2000-01-01&to=2000-01-02")
	if code != http.StatusOK || int(p["entryCount"].(float64)) != 0 || int(p["totalCreditPointsCents"].(float64)) != 0 {
		t.Fatalf("past-only window should be empty, got code=%d %+v", code, p)
	}

	// A future 'from' excludes the ~now entries (proves the 'from' lower bound).
	code, p = call("?from=2999-01-01")
	if code != http.StatusOK || int(p["entryCount"].(float64)) != 0 {
		t.Fatalf("future 'from' window should be empty, got code=%d %+v", code, p)
	}

	// Malformed dates are client errors, not 500s.
	if code, _ := call("?from=notadate"); code != http.StatusBadRequest {
		t.Fatalf("malformed 'from' should be 400, got %d", code)
	}
	if code, _ := call("?to=2026-13-40"); code != http.StatusBadRequest {
		t.Fatalf("malformed 'to' should be 400, got %d", code)
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
