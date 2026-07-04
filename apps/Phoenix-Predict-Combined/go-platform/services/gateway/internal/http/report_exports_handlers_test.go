package http

import (
	"context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	_ "github.com/lib/pq"
	"phoenix-revival/platform/transport/httpx"
)

func reportExportLiveDSN(t *testing.T) string {
	t.Helper()
	dsn := os.Getenv("REPORT_LIVE_DSN")
	if dsn == "" {
		t.Skip("REPORT_LIVE_DSN not set; skipping live report-export test")
	}
	return dsn
}

func openLiveDB(t *testing.T, dsn string) *sql.DB {
	t.Helper()
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	return db
}

// Nil DB → routes are not registered, so requests 404 (the guard in
// registerReportExportRoutes). No DB needed for this check.
func TestReportExportRoutesSkipWithoutDB(t *testing.T) {
	mux := http.NewServeMux()
	registerReportExportRoutes(mux, nil)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	for _, path := range []string{
		"/api/v1/admin/reports/kyc-statuses.csv",
		"/api/v1/admin/reports/wallet-ledger.csv",
	} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusNotFound {
			t.Fatalf("%s: expected 404 with nil DB (routes unregistered), got %d", path, res.Code)
		}
	}
}

// GAP-48: the wallet-ledger export enforces its gates (RBAC, method, date
// validation) BEFORE touching the database, so these are covered without a live
// DB. The DB handle is opened lazily and never connected — every case here
// returns before any query runs.
func TestWalletLedgerExportGates(t *testing.T) {
	db, err := sql.Open("postgres", "postgres://u:p@127.0.0.1:1/nodb?sslmode=disable")
	if err != nil {
		t.Fatalf("open lazy db: %v", err)
	}
	defer db.Close()

	mux := http.NewServeMux()
	registerReportExportRoutes(mux, db)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	const path = "/api/v1/admin/reports/wallet-ledger.csv"

	// A non-admin is refused by the role gate before any permission/DB lookup.
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

	// Method + date-validation gates run with the (TestMain) anon bypass on, so
	// RBAC passes without a DB and we reach the gate under test.
	t.Run("wrong method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, path, nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusMethodNotAllowed {
			t.Fatalf("expected 405 for POST, got %d", res.Code)
		}
	})

	for _, bad := range []string{"?from=notadate", "?to=2026-13-99", "?from=07-04-2026"} {
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

// GAP-73 (§24 audit-evidence integrity): a row-fetch error mid-export must NOT
// deliver a truncated CSV as a successful 200 — the buffered writeCSVReport
// returns a clean error with nothing written to the client. This forces a real
// mid-scan failure by scanning a NULL user_id (temporarily nullable) into a Go
// string. Against the old direct-streaming code the header row + a 200 were
// already committed before the scan reached the NULL row (200 + text/csv +
// partial body); the buffered version yields a non-2xx with no CSV body. Opt-in.
func TestWalletLedgerExportNoTruncationLive(t *testing.T) {
	dsn := reportExportLiveDSN(t)
	db := openLiveDB(t, dsn)
	defer db.Close()
	ctx := context.Background()

	if _, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, entry_type TEXT NOT NULL,
  fund_type TEXT NOT NULL DEFAULT 'real', amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  balance_cents BIGINT NOT NULL, idempotency_key TEXT NOT NULL, reason TEXT,
  transaction_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entry_type, user_id, idempotency_key))`); err != nil {
		t.Fatalf("ensure wallet_ledger: %v", err)
	}

	// Temporarily allow NULL user_id, then a NULL row that fails to scan into a
	// Go string mid-export. LIFO defers: delete the NULL row FIRST, then restore
	// the NOT NULL constraint.
	if _, err := db.ExecContext(ctx, `ALTER TABLE wallet_ledger ALTER COLUMN user_id DROP NOT NULL`); err != nil {
		t.Fatalf("drop not null: %v", err)
	}
	defer func() { _, _ = db.ExecContext(ctx, `ALTER TABLE wallet_ledger ALTER COLUMN user_id SET NOT NULL`) }()
	defer func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM wallet_ledger WHERE idempotency_key = 'gap73-null-row'`)
	}()
	if _, err := db.ExecContext(ctx, `
INSERT INTO wallet_ledger (user_id, entry_type, fund_type, amount_cents, balance_cents, idempotency_key, reason, transaction_time)
VALUES (NULL,'credit','real',1,1,'gap73-null-row','x', NOW())`); err != nil {
		t.Fatalf("seed null row: %v", err)
	}

	mux := http.NewServeMux()
	registerReportExportRoutes(mux, db)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/reports/wallet-ledger.csv", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	// The failure must surface as a non-2xx with NO partial CSV delivered.
	if res.Code >= 200 && res.Code < 300 {
		t.Fatalf("scan failure delivered a %d (truncated success?) body=%q", res.Code, res.Body.String())
	}
	if ct := res.Header().Get("Content-Type"); strings.HasPrefix(ct, "text/csv") {
		t.Fatalf("error response must not carry a text/csv content-type, got %q", ct)
	}
	if strings.Contains(res.Body.String(), "id,user_id,entry_type") {
		t.Fatalf("error response leaked a partial CSV header row: %q", res.Body.String())
	}
}

// Opt-in live test: exports enforce RBAC and emit well-formed CSV.
func TestReportExportsLive(t *testing.T) {
	dsn := reportExportLiveDSN(t)
	db := openLiveDB(t, dsn)
	defer db.Close()

	mux := http.NewServeMux()
	registerReportExportRoutes(mux, db)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	t.Run("player is rejected", func(t *testing.T) {
		t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/reports/kyc-statuses.csv", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "u-p", "p@test.local", "player"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("expected rejection, got %d", res.Code)
		}
	})

	for _, path := range []string{
		"/api/v1/admin/reports/kyc-statuses.csv",
		"/api/v1/admin/reports/surveillance-alerts.csv",
		"/api/v1/admin/reports/wallet-ledger.csv",
		"/api/v1/admin/reports/wallet-ledger.csv?from=2020-01-01&to=2030-12-31",
	} {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != http.StatusOK {
				t.Fatalf("%s: expected 200, got %d body=%s", path, res.Code, res.Body.String())
			}
			if ct := res.Header().Get("Content-Type"); ct != "text/csv; charset=utf-8" {
				t.Fatalf("%s: expected csv content type, got %q", path, ct)
			}
			if res.Body.Len() == 0 {
				t.Fatalf("%s: expected at least a header row", path)
			}
		})
	}
}
