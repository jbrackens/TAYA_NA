package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

// fakeAdminReader implements predictionAdminReader without a DB so the
// route handlers can be tested for shape, gating, and param plumbing.
type fakeAdminReader struct {
	punters       []prediction.AdminPunter
	punterMeta    prediction.PageMeta
	punterErr     error
	gotPunterFltr prediction.AdminPunterFilter
	gotPunterPage int
	gotPunterSize int

	logs      []prediction.AdminAuditLog
	logMeta   prediction.PageMeta
	logErr    error
	gotLogFlt prediction.AdminAuditLogFilter
}

func (f *fakeAdminReader) ListPuntersAdmin(_ context.Context, filter prediction.AdminPunterFilter, page, pageSize int) ([]prediction.AdminPunter, prediction.PageMeta, error) {
	f.gotPunterFltr = filter
	f.gotPunterPage = page
	f.gotPunterSize = pageSize
	return f.punters, f.punterMeta, f.punterErr
}

func (f *fakeAdminReader) ListAuditLogsAdmin(_ context.Context, filter prediction.AdminAuditLogFilter, _, _ int) ([]prediction.AdminAuditLog, prediction.PageMeta, error) {
	f.gotLogFlt = filter
	return f.logs, f.logMeta, f.logErr
}

func adminTestHandler(repo predictionAdminReader) http.Handler {
	mux := http.NewServeMux()
	registerPredictionAdminRoutes(mux, repo)
	return httpx.Chain(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { mux.ServeHTTP(w, r) }),
		httpx.RequestID(),
	)
}

func TestAdminPuntersListReturnsItemsAndPagination(t *testing.T) {
	repo := &fakeAdminReader{
		punters: []prediction.AdminPunter{
			{ID: "u-1", Email: "alice@predict.dev", Status: "active", CreatedAt: "2026-01-01T00:00:00Z"},
		},
		punterMeta: prediction.PageMeta{Page: 1, PageSize: 50, Total: 1, HasNext: false},
	}
	handler := adminTestHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters?status=active&search=alice&page=2&pageSize=25", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@phoenix.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Items      []prediction.AdminPunter `json:"items"`
		Pagination prediction.PageMeta      `json:"pagination"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Items) != 1 || payload.Items[0].Email != "alice@predict.dev" {
		t.Fatalf("unexpected items: %+v", payload.Items)
	}
	if payload.Pagination.Total != 1 {
		t.Fatalf("expected total 1, got %d", payload.Pagination.Total)
	}
	// query params are plumbed through to the repo
	if repo.gotPunterFltr.Status != "active" || repo.gotPunterFltr.Search != "alice" {
		t.Fatalf("filter not plumbed: %+v", repo.gotPunterFltr)
	}
	if repo.gotPunterPage != 2 || repo.gotPunterSize != 25 {
		t.Fatalf("paging not plumbed: page=%d size=%d", repo.gotPunterPage, repo.gotPunterSize)
	}
}

func TestAdminPuntersListRequiresAdminRole(t *testing.T) {
	// main_test.go sets GATEWAY_ALLOW_ADMIN_ANON=true globally, which bypasses
	// requireAdminRole. Disable it here so the real denial path is exercised.
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")

	repo := &fakeAdminReader{}
	handler := adminTestHandler(repo)

	// No admin role in context → 403.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusForbidden {
		t.Fatalf("expected 403 without admin role, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestAdminPuntersListRejectsNonGet(t *testing.T) {
	repo := &fakeAdminReader{}
	handler := adminTestHandler(repo)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/punters", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@phoenix.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for POST, got %d", res.Code)
	}
}

func TestAdminAuditLogsListReturnsItems(t *testing.T) {
	repo := &fakeAdminReader{
		logs: []prediction.AdminAuditLog{
			{ID: "a-1", Action: "market.settled", Status: "success", OccurredAt: "2026-01-01T00:00:00Z"},
		},
		logMeta: prediction.PageMeta{Page: 1, PageSize: 50, Total: 1},
	}
	handler := adminTestHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs?action=market.settled", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@phoenix.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Items []prediction.AdminAuditLog `json:"items"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Items) != 1 || payload.Items[0].Action != "market.settled" {
		t.Fatalf("unexpected items: %+v", payload.Items)
	}
	if repo.gotLogFlt.Action != "market.settled" {
		t.Fatalf("action filter not plumbed: %+v", repo.gotLogFlt)
	}
}
