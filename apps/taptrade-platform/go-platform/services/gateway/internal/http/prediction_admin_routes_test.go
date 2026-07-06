package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"taptrade/gateway/internal/prediction"
	"taptrade/gateway/internal/wallet"
	"taptrade/platform/transport/httpx"
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

	detail        *prediction.AdminPunter
	gotStatusID   string
	gotStatusVal  string
	statusUpdated *prediction.AdminPunter

	notes          []prediction.AdminPunterNote
	gotNotePunter  string
	gotNoteAuthor  string
	gotNoteCat     string
	gotNoteContent string

	portfolio     *prediction.PortfolioSummary
	walletBalance int64
	listPnls      map[string]int64
	balancesByID  map[string]int64
	settled       []prediction.Payout
	ledger        []wallet.LedgerEntry
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

func (f *fakeAdminReader) GetAdminPunter(_ context.Context, _ string) (*prediction.AdminPunter, error) {
	return f.detail, nil
}

func (f *fakeAdminReader) UpdatePunterStatus(_ context.Context, id, status string) (*prediction.AdminPunter, error) {
	f.gotStatusID = id
	f.gotStatusVal = status
	return f.statusUpdated, nil
}

func (f *fakeAdminReader) AddPunterNote(_ context.Context, punterID, authorID, category, content string) (*prediction.AdminPunterNote, error) {
	f.gotNotePunter = punterID
	f.gotNoteAuthor = authorID
	f.gotNoteCat = category
	f.gotNoteContent = content
	n := prediction.AdminPunterNote{ID: 1, PunterID: punterID, Category: category, Content: content, CreatedAt: "2026-01-01T00:00:00Z"}
	f.notes = append([]prediction.AdminPunterNote{n}, f.notes...)
	return &n, nil
}

func (f *fakeAdminReader) ListPunterNotes(_ context.Context, _ string) ([]prediction.AdminPunterNote, error) {
	return f.notes, nil
}

func (f *fakeAdminReader) GetPortfolioSummary(_ context.Context, _ string) (*prediction.PortfolioSummary, error) {
	if f.portfolio != nil {
		return f.portfolio, nil
	}
	return &prediction.PortfolioSummary{}, nil
}

func (f *fakeAdminReader) Balance(_ context.Context, _ string) int64 { return f.walletBalance }

func (f *fakeAdminReader) Balances(_ context.Context, _ []string) map[string]int64 {
	if f.balancesByID != nil {
		return f.balancesByID
	}
	return map[string]int64{}
}

func (f *fakeAdminReader) ListPuntersRealizedPnl(_ context.Context, _ []string) (map[string]int64, error) {
	if f.listPnls != nil {
		return f.listPnls, nil
	}
	return map[string]int64{}, nil
}

func (f *fakeAdminReader) ListSettledPositions(_ context.Context, _ string, _, _ int) ([]prediction.Payout, int, error) {
	return f.settled, len(f.settled), nil
}

func (f *fakeAdminReader) Ledger(_ context.Context, _ string, _ int) []wallet.LedgerEntry {
	return f.ledger
}

func adminTestHandler(repo *fakeAdminReader) http.Handler {
	mux := http.NewServeMux()
	registerPredictionAdminRoutes(mux, repo, repo)
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
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
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

func TestAdminPuntersListIncludesFinancials(t *testing.T) {
	repo := &fakeAdminReader{
		punters: []prediction.AdminPunter{
			{ID: "u-1", Email: "alice@predict.dev", Status: "active"},
			{ID: "u-2", Email: "bob@predict.dev", Status: "active"},
		},
		punterMeta:   prediction.PageMeta{Page: 1, PageSize: 50, Total: 2},
		balancesByID: map[string]int64{"u-1": 500000, "u-2": 12345},
		listPnls:     map[string]int64{"u-1": 4200},
	}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Items []prediction.AdminPunterListItem `json:"items"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(payload.Items))
	}
	if payload.Items[0].PointAccountBalanceCents != 500000 ||
		payload.Items[0].RealizedPointsCents != 4200 ||
		payload.Items[0].Unit != "PTS" {
		t.Fatalf("u-1 financials wrong: %+v", payload.Items[0])
	}
	// u-2 has a balance but no settled payouts -> realized pnl defaults to 0.
	if payload.Items[1].PointAccountBalanceCents != 12345 ||
		payload.Items[1].RealizedPointsCents != 0 ||
		payload.Items[1].Unit != "PTS" {
		t.Fatalf("u-2 financials wrong: %+v", payload.Items[1])
	}
	body := res.Body.String()
	for _, retired := range []string{`"walletBalanceCents"`, `"realizedPnlCents"`} {
		if strings.Contains(body, retired) {
			t.Fatalf("admin punter list should not emit %s: %s", retired, body)
		}
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
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
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
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
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

func TestAdminAuditLogsListRedactsLegacyUnsafeDetailsOnRead(t *testing.T) {
	rawDetails := json.RawMessage(`{"reason":"cash payout admin note","idempotencyKey":"db-safe-key","nested":{"note":"crypto payout review"}}`)
	repo := &fakeAdminReader{
		logs: []prediction.AdminAuditLog{
			{
				ID:         "db-audit-unsafe-copy",
				Action:     "punter.note",
				Status:     "success",
				Details:    rawDetails,
				OccurredAt: "2026-01-01T00:00:00Z",
			},
		},
		logMeta: prediction.PageMeta{Page: 1, PageSize: 50, Total: 1},
	}
	handler := adminTestHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs?action=punter.note", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if !strings.Contains(string(repo.logs[0].Details), "cash payout admin note") ||
		!strings.Contains(string(repo.logs[0].Details), "crypto payout review") {
		t.Fatalf("raw repo audit details should remain available for review, got %s", repo.logs[0].Details)
	}
	var payload struct {
		Items []prediction.AdminAuditLog `json:"items"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	var got *prediction.AdminAuditLog
	for i := range payload.Items {
		if payload.Items[i].ID == "db-audit-unsafe-copy" {
			got = &payload.Items[i]
		}
	}
	if got == nil {
		t.Fatalf("expected db audit item, got %+v", payload.Items)
	}
	details := string(got.Details)
	if strings.Contains(details, "cash payout admin note") || strings.Contains(details, "crypto payout review") {
		t.Fatalf("admin audit response leaked unsafe db details: %s", details)
	}
	if !strings.Contains(details, launchRedactedUserText) || !strings.Contains(details, "db-safe-key") {
		t.Fatalf("expected redacted unsafe text and preserved safe fields, got %s", details)
	}
}

func TestAdminPunterDetailReturnsPunter(t *testing.T) {
	repo := &fakeAdminReader{detail: &prediction.AdminPunter{ID: "u-1", Email: "a@b.dev", Status: "active"}}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters/u-1", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var p prediction.AdminPunter
	if err := json.Unmarshal(res.Body.Bytes(), &p); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if p.ID != "u-1" {
		t.Fatalf("unexpected punter: %+v", p)
	}
}

func TestAdminPunterDetail404ForUnknown(t *testing.T) {
	repo := &fakeAdminReader{detail: nil}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters/nobody", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", res.Code)
	}
}

func TestAdminPunterDetailIncludesFinancials(t *testing.T) {
	repo := &fakeAdminReader{
		detail:        &prediction.AdminPunter{ID: "u-1", Email: "a@b.dev", Status: "active"},
		walletBalance: 512300,
		portfolio: &prediction.PortfolioSummary{
			TotalValueCents:    100000,
			RealizedPnlCents:   4200,
			OpenPositions:      3,
			TotalPredictions:   10,
			CorrectPredictions: 7,
			AccuracyPct:        70,
		},
	}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters/u-1", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var d prediction.AdminPunterDetail
	if err := json.Unmarshal(res.Body.Bytes(), &d); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if d.ID != "u-1" {
		t.Fatalf("identity not preserved: %+v", d.AdminPunter)
	}
	if d.PointAccountBalanceCents != 512300 || d.Unit != "PTS" {
		t.Fatalf("point-account balance not returned: %+v", d)
	}
	if d.Portfolio.OpenPositions != 3 || d.Portfolio.AccuracyPct != 70 {
		t.Fatalf("portfolio not returned: %+v", d.Portfolio)
	}
	for _, needle := range []string{`"portfolioValuePointsCents":100000`, `"realizedPointsCents":4200`} {
		if !strings.Contains(res.Body.String(), needle) {
			t.Fatalf("portfolio summary missing %s: %s", needle, res.Body.String())
		}
	}
	if strings.Contains(res.Body.String(), `"walletBalanceCents"`) {
		t.Fatalf("admin punter detail should not emit walletBalanceCents: %s", res.Body.String())
	}
	for _, retired := range []string{`"totalValueCents"`, `"realizedPnlCents"`, `"unrealizedPnlCents"`} {
		if strings.Contains(res.Body.String(), retired) {
			t.Fatalf("admin punter detail should not emit portfolio summary alias %s: %s", retired, res.Body.String())
		}
	}
}

func TestAdminPunterSettlements(t *testing.T) {
	repo := &fakeAdminReader{settled: []prediction.Payout{
		{ID: "p-1", UserID: "u-1", MarketID: "m-1", Side: "yes", Quantity: 10, PnlCents: 250, PayoutCents: 1000},
	}}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters/u-1/settlements", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Items []adminPunterSettlementItem `json:"items"`
		Total int                         `json:"total"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Items) != 1 || payload.Items[0].ID != "p-1" || payload.Total != 1 {
		t.Fatalf("unexpected settlements: %+v total=%d", payload.Items, payload.Total)
	}
	if payload.Items[0].RealizedPointsCents != 250 ||
		payload.Items[0].SettlementPointsCents != 1000 ||
		payload.Items[0].Unit != "PTS" {
		t.Fatalf("settlement point aliases missing: %+v", payload.Items[0])
	}
	body := res.Body.String()
	for _, retired := range []string{`"payoutCents"`, `"pnlCents"`} {
		if strings.Contains(body, retired) {
			t.Fatalf("admin account settlement history should not emit %s: %s", retired, body)
		}
	}
}

func TestAdminPunterWalletLedger(t *testing.T) {
	repo := &fakeAdminReader{ledger: []wallet.LedgerEntry{
		{EntryID: "e-1", UserID: "u-1", Type: "credit", AmountCents: 5000, BalanceCents: 5000},
	}}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters/u-1/wallet", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Items) != 1 || payload.Items[0]["entryId"] != "e-1" {
		t.Fatalf("unexpected ledger: %+v", payload.Items)
	}
	if payload.Items[0]["amountPointsCents"] != float64(5000) ||
		payload.Items[0]["balancePointsCents"] != float64(5000) ||
		payload.Items[0]["unit"] != "PTS" {
		t.Fatalf("ledger point aliases missing: %+v", payload.Items[0])
	}
}

func TestAdminPunterStatusUpdate(t *testing.T) {
	repo := &fakeAdminReader{statusUpdated: &prediction.AdminPunter{ID: "u-1", Status: "suspended"}}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/punters/u-1/status", strings.NewReader(`{"status":"suspended"}`))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if repo.gotStatusID != "u-1" || repo.gotStatusVal != "suspended" {
		t.Fatalf("status not plumbed: id=%s val=%s", repo.gotStatusID, repo.gotStatusVal)
	}
}

func TestAdminPunterStatusRejectsBadValue(t *testing.T) {
	repo := &fakeAdminReader{}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/punters/u-1/status", strings.NewReader(`{"status":"banana"}`))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for bad status, got %d", res.Code)
	}
}

func TestAdminPunterUnsupportedActionReturns501(t *testing.T) {
	repo := &fakeAdminReader{}
	handler := adminTestHandler(repo)
	// risk-segment + limits + reset-password remain 501.
	for _, action := range []string{"reset-password", "risk-segment", "limits"} {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/punters/u-1/"+action, nil)
		req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusNotImplemented {
			t.Fatalf("expected 501 for %s, got %d", action, res.Code)
		}
	}
}

func TestAdminPunterNotesList(t *testing.T) {
	repo := &fakeAdminReader{notes: []prediction.AdminPunterNote{
		{ID: 1, PunterID: "u-1", Category: "general", Content: "hello", CreatedAt: "2026-01-01T00:00:00Z"},
	}}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters/u-1/notes", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Items []prediction.AdminPunterNote `json:"items"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Items) != 1 || payload.Items[0].Content != "hello" {
		t.Fatalf("unexpected notes: %+v", payload.Items)
	}
}

func TestAdminPunterNotesListRedactsLegacyUnsafeTextOnRead(t *testing.T) {
	repo := &fakeAdminReader{notes: []prediction.AdminPunterNote{
		{ID: 1, PunterID: "u-1", Category: "cash payout review", Content: "crypto payout escalation", CreatedAt: "2026-01-01T00:00:00Z"},
	}}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters/u-1/notes", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if repo.notes[0].Category != "cash payout review" || repo.notes[0].Content != "crypto payout escalation" {
		t.Fatalf("raw repo note should remain available for review, got %+v", repo.notes[0])
	}
	var payload struct {
		Items []adminPunterNotePayload `json:"items"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Items) != 1 {
		t.Fatalf("unexpected notes: %+v", payload.Items)
	}
	if strings.Contains(payload.Items[0].Category, "cash payout") ||
		strings.Contains(payload.Items[0].Content, "crypto payout") {
		t.Fatalf("admin note response leaked unsafe text: %+v", payload.Items[0])
	}
	if payload.Items[0].Category != launchRedactedUserText ||
		payload.Items[0].Content != launchRedactedUserText {
		t.Fatalf("expected redacted note category/content, got %+v", payload.Items[0])
	}
}

func TestAdminPunterAddNote(t *testing.T) {
	repo := &fakeAdminReader{}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/punters/u-1/notes",
		strings.NewReader(`{"content":"watch this user","category":"risk"}`))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", res.Code, res.Body.String())
	}
	if repo.gotNotePunter != "u-1" || repo.gotNoteContent != "watch this user" || repo.gotNoteCat != "risk" {
		t.Fatalf("note not plumbed: punter=%s content=%q cat=%q", repo.gotNotePunter, repo.gotNoteContent, repo.gotNoteCat)
	}
	if repo.gotNoteAuthor != "admin-1" {
		t.Fatalf("author not plumbed from session: got %q", repo.gotNoteAuthor)
	}
}

func TestAdminPunterAddNoteRejectsEmpty(t *testing.T) {
	repo := &fakeAdminReader{}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/punters/u-1/notes",
		strings.NewReader(`{"content":"   "}`))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty content, got %d", res.Code)
	}
}

func TestAdminPunterAddNoteRejectsMoneyWording(t *testing.T) {
	repo := &fakeAdminReader{}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/punters/u-1/notes",
		strings.NewReader(`{"content":"cash payout review note","category":"risk"}`))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for unsafe note content, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error envelope: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "content" {
		t.Fatalf("expected content error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "cash payout") {
		t.Fatalf("unsafe note content should not be echoed: %s", res.Body.String())
	}
	if repo.gotNoteContent != "" || len(repo.notes) != 0 {
		t.Fatalf("unsafe note content should not be persisted: got content=%q notes=%+v", repo.gotNoteContent, repo.notes)
	}
}

func TestAdminPunterAddNoteRejectsMoneyWordingCategory(t *testing.T) {
	repo := &fakeAdminReader{}
	handler := adminTestHandler(repo)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/punters/u-1/notes",
		strings.NewReader(`{"content":"review account status","category":"cash payout review"}`))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for unsafe note category, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error envelope: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "category" {
		t.Fatalf("expected category error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "cash payout") {
		t.Fatalf("unsafe note category should not be echoed: %s", res.Body.String())
	}
	if repo.gotNoteContent != "" || repo.gotNoteCat != "" || len(repo.notes) != 0 {
		t.Fatalf("unsafe note category should not be persisted: got content=%q category=%q notes=%+v", repo.gotNoteContent, repo.gotNoteCat, repo.notes)
	}
}
