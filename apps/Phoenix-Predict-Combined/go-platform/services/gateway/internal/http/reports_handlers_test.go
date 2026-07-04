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

// TestWalletReconciliationBoundaryLive (verification #20 MED 1) locks in that the
// reconciliation report's inclusive-'to' bound agrees EXACTLY with the CSV
// export / daily-balance `< to+1day` half-open window at a day boundary, through
// the real lib/pq → Postgres round-trip. Seeds a row at the last microsecond of
// the 'to' day (must be INCLUDED) and one at exactly next-day midnight (must be
// EXCLUDED). Against the old nanosecond bound the next-midnight row leaked in
// (Postgres rounds …999999999 up to 00:00:00), making reconciliation disagree
// with daily-balance; the microsecond bound fixes it. Opt-in on REPORT_LIVE_DSN.
func TestWalletReconciliationBoundaryLive(t *testing.T) {
	dsn := reportExportLiveDSN(t)
	walletSvc, err := wallet.NewServiceWithDB("postgres", dsn)
	if err != nil {
		t.Fatalf("db-backed wallet service: %v", err)
	}
	db := walletSvc.DB()
	if db == nil {
		t.Fatal("expected a db-backed wallet service")
	}
	ctx := context.Background()
	cleanup := func() { _, _ = db.ExecContext(ctx, `DELETE FROM wallet_ledger WHERE user_id LIKE 'u-bnd-%'`) }
	cleanup()
	defer cleanup()

	// Two boundary rows for to=2026-03-31: one at 23:59:59.999999 (in), one at
	// exactly 2026-04-01 00:00:00 (out).
	for _, s := range []struct {
		user, key, ts string
		amount        int64
	}{
		{"u-bnd-1", "bnd-in", "2026-03-31T23:59:59.999999Z", 1000},
		{"u-bnd-2", "bnd-out", "2026-04-01T00:00:00Z", 500},
	} {
		if _, err := db.ExecContext(ctx, `
INSERT INTO wallet_ledger (user_id, entry_type, fund_type, amount_cents, balance_cents, idempotency_key, reason, transaction_time)
VALUES ($1,'credit','real',$2,$2,$3,'seed',$4)`, s.user, s.amount, s.key, s.ts); err != nil {
			t.Fatalf("seed %s: %v", s.key, err)
		}
	}

	mux := http.NewServeMux()
	registerReportsRoutes(mux, walletSvc)
	registerFinanceReportRoutes(mux, db)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	get := func(path string) map[string]any {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "admin", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("%s: expected 200, got %d body=%s", path, res.Code, res.Body.String())
		}
		var payload map[string]any
		if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
			t.Fatalf("%s: decode: %v", path, err)
		}
		return payload
	}

	// Reconciliation for to=2026-03-31 must count ONLY the 23:59:59.999999 row.
	rec := get("/api/v1/admin/wallet/reconciliation?from=2026-03-31&to=2026-03-31")
	if int(rec["totalCreditPointsCents"].(float64)) != 1000 || int(rec["entryCount"].(float64)) != 1 {
		t.Fatalf("reconciliation leaked the next-midnight row (MED-1 regression): %+v", rec)
	}

	// Daily-balance for the same window must agree (the auditor tie-out property).
	daily := get("/api/v1/admin/reports/daily-balance?from=2026-03-31&to=2026-03-31")
	days, _ := daily["days"].([]any)
	if len(days) != 1 {
		t.Fatalf("expected exactly the 2026-03-31 bucket, got %+v", daily)
	}
	day0 := days[0].(map[string]any)
	if day0["date"] != "2026-03-31" || int(day0["creditsCents"].(float64)) != 1000 || int(day0["entryCount"].(float64)) != 1 {
		t.Fatalf("daily-balance boundary bucket wrong: %+v", day0)
	}
	// Tie-out: the two reports agree on the period's credit total.
	if int(rec["totalCreditPointsCents"].(float64)) != int(day0["creditsCents"].(float64)) {
		t.Fatalf("reconciliation and daily-balance disagree at the boundary: rec=%v daily=%v", rec["totalCreditPointsCents"], day0["creditsCents"])
	}
}

// GAP-74 (§23 + §7 RBAC): the reconciliation report exposes whole-platform
// financial totals, so — like the CSV ledger export and daily-balance report —
// it is permission-gated, not open to any admin session. With the dev anon
// bypass off, a non-privileged caller is refused before the report is built.
func TestWalletReconciliationRequiresPermission(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "") // TestMain enables the bypass; exercise the real gate
	walletSvc := wallet.NewService()
	mux := http.NewServeMux()
	registerReportsRoutes(mux, walletSvc)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	for _, path := range []string{"/api/v1/admin/wallet/reconciliation", "/admin/wallet/reconciliation"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "u-p", "p@test.local", "player"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("%s: expected a non-privileged caller to be refused, got %d", path, res.Code)
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
