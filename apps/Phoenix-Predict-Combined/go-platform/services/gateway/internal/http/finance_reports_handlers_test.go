package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	_ "github.com/lib/pq"
	"phoenix-revival/platform/transport/httpx"
)

// Nil DB → the route is not registered (guard in registerFinanceReportRoutes),
// so the request 404s. No DB needed.
func TestFinanceReportRoutesSkipWithoutDB(t *testing.T) {
	mux := http.NewServeMux()
	registerFinanceReportRoutes(mux, nil)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/reports/daily-balance", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404 with nil DB (route unregistered), got %d", res.Code)
	}
}

// GAP-48 slice 2: the daily-balance report enforces RBAC, method, and date
// validation BEFORE any query, so these gates are covered without a live DB (the
// handle is opened lazily and never connected).
func TestDailyBalanceReportGates(t *testing.T) {
	db, err := sql.Open("postgres", "postgres://u:p@127.0.0.1:1/nodb?sslmode=disable")
	if err != nil {
		t.Fatalf("open lazy db: %v", err)
	}
	defer db.Close()

	mux := http.NewServeMux()
	registerFinanceReportRoutes(mux, db)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	const path = "/api/v1/admin/reports/daily-balance"

	t.Run("player rejected", func(t *testing.T) {
		t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "u-p", "p@test.local", "player"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("expected player rejection, got %d", res.Code)
		}
	})

	t.Run("wrong method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, path, nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusMethodNotAllowed {
			t.Fatalf("expected 405 for POST, got %d", res.Code)
		}
	})

	for _, bad := range []string{"?from=notadate", "?to=2026-13-40"} {
		t.Run("bad date "+bad, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path+bad, nil)
			req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != http.StatusBadRequest {
				t.Fatalf("%s: expected 400 for malformed date, got %d", bad, res.Code)
			}
		})
	}
}

// Opt-in live test: seeds wallet_ledger rows in an isolated (far-future) date
// window, then verifies the daily-balance report buckets them correctly by UTC
// day and that the per-day buckets reconcile to a flat window sum (the property
// that lets auditors tie the daily report to the reconciliation summary).
func TestDailyBalanceReportLive(t *testing.T) {
	dsn := reportExportLiveDSN(t)
	db := openLiveDB(t, dsn)
	defer db.Close()
	ctx := context.Background()

	// Self-contained: create the table if the DSN points at a bare scratch DB.
	if _, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, entry_type TEXT NOT NULL,
  fund_type TEXT NOT NULL DEFAULT 'real', amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  balance_cents BIGINT NOT NULL, idempotency_key TEXT NOT NULL, reason TEXT,
  transaction_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entry_type, user_id, idempotency_key))`); err != nil {
		t.Fatalf("ensure wallet_ledger: %v", err)
	}

	// Isolated window so pre-existing rows on a migrated DSN don't pollute assertions.
	cleanup := func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM wallet_ledger WHERE user_id LIKE 'u-dbr-%'`)
	}
	cleanup()
	defer cleanup()

	seed := []struct {
		user, entry string
		amount, bal int64
		key, ts     string
	}{
		{"u-dbr-1", "credit", 10000, 10000, "dbr-c1", "2099-01-01T08:00:00Z"},
		{"u-dbr-2", "credit", 5000, 5000, "dbr-c2", "2099-01-01T20:00:00Z"},
		{"u-dbr-1", "debit", 3000, 7000, "dbr-d1", "2099-01-01T23:30:00Z"},
		{"u-dbr-1", "credit", 2000, 9000, "dbr-c3", "2099-01-02T09:00:00Z"},
	}
	for _, s := range seed {
		if _, err := db.ExecContext(ctx, `
INSERT INTO wallet_ledger (user_id, entry_type, fund_type, amount_cents, balance_cents, idempotency_key, reason, transaction_time)
VALUES ($1,$2,'real',$3,$4,$5,'seed',$6)`, s.user, s.entry, s.amount, s.bal, s.key, s.ts); err != nil {
			t.Fatalf("seed %s/%s: %v", s.user, s.key, err)
		}
	}

	report, err := dailyBalanceReport(ctx, db, "2099-01-01", "2099-01-02")
	if err != nil {
		t.Fatalf("dailyBalanceReport: %v", err)
	}
	if len(report.Days) != 2 {
		t.Fatalf("expected 2 day buckets, got %d (%+v)", len(report.Days), report.Days)
	}

	d1, d2 := report.Days[0], report.Days[1]
	if d1.Date != "2099-01-01" || d1.CreditsCents != 15000 || d1.DebitsCents != 3000 ||
		d1.NetCents != 12000 || d1.EntryCount != 3 || d1.DistinctUsers != 2 {
		t.Fatalf("day1 mismatch: %+v", d1)
	}
	if d2.Date != "2099-01-02" || d2.CreditsCents != 2000 || d2.DebitsCents != 0 ||
		d2.NetCents != 2000 || d2.EntryCount != 1 || d2.DistinctUsers != 1 {
		t.Fatalf("day2 mismatch: %+v", d2)
	}

	// Reconciliation consistency: the sum of the per-day buckets must equal a
	// flat window aggregate computed with the identical credit/debit CASE.
	var flatCredits, flatDebits int64
	if err := db.QueryRowContext(ctx, `
SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount_cents ELSE 0 END),0),
       COALESCE(SUM(CASE WHEN entry_type='debit'  THEN amount_cents ELSE 0 END),0)
FROM wallet_ledger
WHERE user_id LIKE 'u-dbr-%'
  AND transaction_time >= '2099-01-01'::timestamptz
  AND transaction_time < ('2099-01-02'::date + 1)::timestamptz`).Scan(&flatCredits, &flatDebits); err != nil {
		t.Fatalf("flat aggregate: %v", err)
	}
	var sumCredits, sumDebits int64
	for _, d := range report.Days {
		sumCredits += d.CreditsCents
		sumDebits += d.DebitsCents
	}
	if sumCredits != flatCredits || sumDebits != flatDebits {
		t.Fatalf("daily buckets do not reconcile to the flat window sum: daily(c=%d,d=%d) flat(c=%d,d=%d)",
			sumCredits, sumDebits, flatCredits, flatDebits)
	}

	// The 'to' bound is inclusive of its whole day and the 'from' bound excludes
	// earlier rows: narrowing to just 2099-01-02 yields one bucket.
	narrow, err := dailyBalanceReport(ctx, db, "2099-01-02", "2099-01-02")
	if err != nil {
		t.Fatalf("narrow report: %v", err)
	}
	if len(narrow.Days) != 1 || narrow.Days[0].Date != "2099-01-02" {
		t.Fatalf("expected only the 2099-01-02 bucket, got %+v", narrow.Days)
	}

	// Round-trips through the HTTP layer as JSON with the RBAC gate.
	mux := http.NewServeMux()
	registerFinanceReportRoutes(mux, db)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/reports/daily-balance?from=2099-01-01&to=2099-01-02", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("http expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var decoded dailyBalanceReportResult
	if err := json.Unmarshal(res.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode json: %v", err)
	}
	if len(decoded.Days) != 2 || decoded.Unit != "PTS" {
		t.Fatalf("http payload mismatch: %+v", decoded)
	}
}
