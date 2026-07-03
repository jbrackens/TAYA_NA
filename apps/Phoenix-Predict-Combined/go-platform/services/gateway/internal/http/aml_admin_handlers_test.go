package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/aml"
	"phoenix-revival/platform/transport/httpx"
)

type stubAMLStore struct {
	rules      []aml.Rule
	alerts     []aml.Alert
	cases      []aml.Case
	upsertID   int64
	updateErr  error
	dismissErr error
	lastUpsert aml.Rule
	lastUpdate struct {
		status, resolution, sar string
	}
}

func (s *stubAMLStore) ListRules(context.Context) ([]aml.Rule, error) { return s.rules, nil }
func (s *stubAMLStore) UpsertRule(_ context.Context, r aml.Rule) (int64, error) {
	s.lastUpsert = r
	if s.upsertID == 0 {
		s.upsertID = 7
	}
	return s.upsertID, nil
}
func (s *stubAMLStore) ListAlerts(context.Context, string, int, int) ([]aml.Alert, error) {
	return s.alerts, nil
}
func (s *stubAMLStore) DismissAlert(context.Context, int64) error { return s.dismissErr }
func (s *stubAMLStore) ListCases(context.Context, string, int, int) ([]aml.Case, error) {
	return s.cases, nil
}
func (s *stubAMLStore) GetCase(_ context.Context, id int64) (*aml.Case, error) {
	return &aml.Case{ID: id, Status: "open", SubjectID: "u-1"}, nil
}
func (s *stubAMLStore) OpenCase(_ context.Context, title, _, subjectID, _ string, alertIDs []int64) (*aml.Case, error) {
	return &aml.Case{ID: 1, Title: title, Status: "open", SubjectID: subjectID, AlertCount: len(alertIDs)}, nil
}
func (s *stubAMLStore) UpdateCaseStatus(_ context.Context, id int64, status, resolution, sar string) (*aml.Case, error) {
	if s.updateErr != nil {
		return nil, s.updateErr
	}
	s.lastUpdate.status, s.lastUpdate.resolution, s.lastUpdate.sar = status, resolution, sar
	return &aml.Case{ID: id, Status: status, SARReference: sar}, nil
}

type stubAMLScanner struct{ called bool }

func (s *stubAMLScanner) ScanOnce(context.Context) (int, error) { s.called = true; return 5, nil }

func newAMLHarness(store amlAdminStore, scanner amlScanner) http.Handler {
	mux := http.NewServeMux()
	registerAMLAdminRoutes(mux, store, scanner)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func amlAdminReq(handler http.Handler, method, path, body string) *httptest.ResponseRecorder {
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	r = r.WithContext(httpx.WithTestUser(r.Context(), "admin-aml", "aml@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, r)
	return res
}

func TestAMLRoutesRejectNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	handler := newAMLHarness(&stubAMLStore{}, &stubAMLScanner{})
	for _, tc := range []struct{ method, path string }{
		{http.MethodGet, "/api/v1/admin/aml/rules"},
		{http.MethodPost, "/api/v1/admin/aml/rules"},
		{http.MethodGet, "/api/v1/admin/aml/alerts"},
		{http.MethodPost, "/api/v1/admin/aml/alerts/1/dismiss"},
		{http.MethodPost, "/api/v1/admin/aml/scan"},
		{http.MethodGet, "/api/v1/admin/aml/cases"},
		{http.MethodPut, "/api/v1/admin/aml/cases/1"},
	} {
		r := httptest.NewRequest(tc.method, tc.path, strings.NewReader("{}"))
		r = r.WithContext(httpx.WithTestUser(r.Context(), "u-p", "player@test.local", "player"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, r)
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s: expected rejection, got %d", tc.method, tc.path, res.Code)
		}
	}
}

func TestAMLUpsertRuleAudited(t *testing.T) {
	store := &stubAMLStore{}
	handler := newAMLHarness(store, &stubAMLScanner{})
	res := amlAdminReq(handler, http.MethodPost, "/api/v1/admin/aml/rules",
		`{"name":"large-deposit","kind":"amount_threshold","riskPoints":60,"severity":"high","enabled":true,"params":{"thresholdCents":1000000}}`)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if store.lastUpsert.Name != "large-deposit" || store.lastUpsert.Kind != "amount_threshold" {
		t.Fatalf("rule not plumbed: %+v", store.lastUpsert)
	}
	assertAMLAudit(t, "aml.rule_upserted", "7")
}

func TestAMLScanAudited(t *testing.T) {
	scanner := &stubAMLScanner{}
	handler := newAMLHarness(&stubAMLStore{}, scanner)
	res := amlAdminReq(handler, http.MethodPost, "/api/v1/admin/aml/scan", "")
	if res.Code != http.StatusOK || !scanner.called {
		t.Fatalf("scan not run: code=%d called=%v", res.Code, scanner.called)
	}
	assertAMLAudit(t, "aml.scan_run", "")
}

func TestAMLAlertDismissAudited(t *testing.T) {
	handler := newAMLHarness(&stubAMLStore{}, &stubAMLScanner{})
	res := amlAdminReq(handler, http.MethodPost, "/api/v1/admin/aml/alerts/42/dismiss", "")
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	assertAMLAudit(t, "aml.alert_dismissed", "42")
}

func TestAMLCaseSARFileAudited(t *testing.T) {
	store := &stubAMLStore{}
	handler := newAMLHarness(store, &stubAMLScanner{})
	res := amlAdminReq(handler, http.MethodPut, "/api/v1/admin/aml/cases/9",
		`{"status":"closed_sar_filed","resolution":"filed with FIU","sarReference":"SAR-2026-007"}`)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if store.lastUpdate.status != "closed_sar_filed" || store.lastUpdate.sar != "SAR-2026-007" {
		t.Fatalf("case update not plumbed: %+v", store.lastUpdate)
	}
	assertAMLAudit(t, "aml.case_updated", "9")
}

// A closing case with no resolution is refused (fail-closed disposition).
func TestAMLCaseCloseRequiresResolution(t *testing.T) {
	store := &stubAMLStore{updateErr: aml.ErrResolutionRequired}
	handler := newAMLHarness(store, &stubAMLScanner{})
	res := amlAdminReq(handler, http.MethodPut, "/api/v1/admin/aml/cases/9",
		`{"status":"closed_no_action"}`)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", res.Code, res.Body.String())
	}
}

func assertAMLAudit(t *testing.T, action, targetID string) {
	t.Helper()
	for _, e := range providerOpsAuditSnapshot() {
		if e.Action == action && (targetID == "" || e.TargetID == targetID) {
			return
		}
	}
	t.Fatalf("audit entry %q (target %q) not recorded", action, targetID)
}
