package http

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"os"
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

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/reports/kyc-statuses.csv", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404 with nil DB (routes unregistered), got %d", res.Code)
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
