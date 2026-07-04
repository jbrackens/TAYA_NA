package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	_ "github.com/lib/pq"
	"phoenix-revival/platform/transport/httpx"
)

// Nil DB → route not registered → 404.
func TestCasesRoutesSkipWithoutDB(t *testing.T) {
	mux := http.NewServeMux()
	registerCasesAdminRoutes(mux, nil)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/cases", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404 with nil DB, got %d", res.Code)
	}
}

// GAP-32: RBAC (compliance:read) and method gates run before any query, so they
// are testable without a live DB (lazy handle, never connected).
func TestCasesGates(t *testing.T) {
	db, err := sql.Open("postgres", "postgres://u:p@127.0.0.1:1/nodb?sslmode=disable")
	if err != nil {
		t.Fatalf("open lazy db: %v", err)
	}
	defer db.Close()
	mux := http.NewServeMux()
	registerCasesAdminRoutes(mux, db)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	t.Run("player rejected", func(t *testing.T) {
		t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/cases", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "u-p", "p@test.local", "player"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("expected rejection, got %d", res.Code)
		}
	})

	t.Run("wrong method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/cases", nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusMethodNotAllowed {
			t.Fatalf("expected 405, got %d", res.Code)
		}
	})
}

// Opt-in live test: seeds AML + surveillance cases and asserts the center
// aggregates both, and that a subjectId filter returns only the subject's AML
// cases (surveillance cases are market-scoped, not per-player).
func TestCasesCenterLive(t *testing.T) {
	dsn := os.Getenv("CASES_LIVE_DSN")
	if dsn == "" {
		t.Skip("CASES_LIVE_DSN not set; skipping live cases test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	ctx := context.Background()

	// Minimal case tables (subset of the real schemas — enough columns for the
	// aggregation query).
	if _, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS aml_cases (id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium', subject_id TEXT NOT NULL, opened_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS surveillance_cases (id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium', opened_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`); err != nil {
		t.Fatalf("ensure case tables: %v", err)
	}
	cleanup := func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM aml_cases WHERE subject_id LIKE 'u-case-%'`)
		_, _ = db.ExecContext(ctx, `DELETE FROM surveillance_cases WHERE title LIKE 'gap32 %'`)
	}
	cleanup()
	defer cleanup()

	// The first title deliberately contains a launch-prohibited word ("deposit") —
	// case titles must NOT be run through the launch-copy redactor (verification #23
	// HIGH), so it must survive verbatim.
	if _, err := db.ExecContext(ctx, `
INSERT INTO aml_cases (title, subject_id, opened_by, created_at) VALUES
 ('gap32 large deposit review','u-case-1','admin','2026-03-01T00:00:00Z'),
 ('gap32 aml b','u-case-2','admin','2026-03-02T00:00:00Z')`); err != nil {
		t.Fatalf("seed aml: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO surveillance_cases (title, opened_by, created_at) VALUES ('gap32 surv','admin','2026-03-03T00:00:00Z')`); err != nil {
		t.Fatalf("seed surveillance: %v", err)
	}

	mux := http.NewServeMux()
	registerCasesAdminRoutes(mux, db)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	get := func(qs string) []unifiedCase {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/cases"+qs, nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("%s: expected 200, got %d body=%s", qs, res.Code, res.Body.String())
		}
		var payload struct {
			Cases []unifiedCase `json:"cases"`
		}
		if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
			t.Fatalf("decode: %v", err)
		}
		return payload.Cases
	}

	// Full center: our 3 seeded cases (2 aml + 1 surveillance), both types present.
	all := get("")
	var seededAML, seededSurv int
	for _, c := range all {
		if c.Type == "aml" && (c.SubjectID == "u-case-1" || c.SubjectID == "u-case-2") {
			seededAML++
		}
		if c.Type == "surveillance" && c.Title == "gap32 surv" {
			seededSurv++
		}
	}
	if seededAML != 2 || seededSurv != 1 {
		t.Fatalf("full center should include both domains, got aml=%d surv=%d", seededAML, seededSurv)
	}

	// H1: the "deposit"-containing case title is preserved verbatim, not redacted.
	pos := map[string]int{}
	var depositTitleOK bool
	for i, c := range all {
		pos[c.Type+":"+c.Title] = i
		if c.Title == "gap32 large deposit review" {
			depositTitleOK = true
		}
	}
	if !depositTitleOK {
		t.Fatalf("case title with a launch-prohibited word was redacted or dropped: %+v", all)
	}

	// M2: most-recent-first across domains — surveillance (03-03) before aml b
	// (03-02) before the deposit case (03-01). Verified by returned position, not
	// by string comparison, so it catches a mis-ordered SQL/merge.
	iSurv, okSurv := pos["surveillance:gap32 surv"]
	iAmlB, okAmlB := pos["aml:gap32 aml b"]
	iDeposit, okDeposit := pos["aml:gap32 large deposit review"]
	if !okSurv || !okAmlB || !okDeposit || !(iSurv < iAmlB && iAmlB < iDeposit) {
		t.Fatalf("cross-domain order should be most-recent-first (surv<amlB<deposit), got surv=%d amlB=%d deposit=%d", iSurv, iAmlB, iDeposit)
	}

	// M1: with includeSurveillance=false, surveillance cases are excluded entirely.
	amlOnly, err := listUnifiedCases(ctx, db, "", 200, false)
	if err != nil {
		t.Fatalf("listUnifiedCases(includeSurveillance=false): %v", err)
	}
	for _, c := range amlOnly {
		if c.Type == "surveillance" {
			t.Fatalf("surveillance case leaked with includeSurveillance=false: %+v", c)
		}
	}

	// Subject filter: only u-case-1's AML case, no surveillance.
	scoped := get("?subjectId=u-case-1")
	for _, c := range scoped {
		if c.Type == "surveillance" {
			t.Fatalf("subject-scoped query must not include surveillance cases: %+v", c)
		}
	}
	var scopedForSubject int
	for _, c := range scoped {
		if c.Type == "aml" && c.SubjectID == "u-case-1" {
			scopedForSubject++
		}
	}
	if scopedForSubject != 1 {
		t.Fatalf("expected exactly u-case-1's AML case, got %d (%+v)", scopedForSubject, scoped)
	}
	// The prefixed id disambiguates domains.
	if len(all) > 0 && all[0].ID == "" {
		t.Fatal("unified case id should be domain-prefixed")
	}
}
