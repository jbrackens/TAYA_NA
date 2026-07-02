package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/surveillance"
	"phoenix-revival/platform/transport/httpx"
)

type stubSurveillanceStore struct {
	alerts     []surveillance.Alert
	cases      []surveillance.Case
	openErr    error
	updateErr  error
	dismissErr error
	lastOpen   struct {
		title    string
		alertIDs []int64
	}
}

func (s *stubSurveillanceStore) ListAlerts(_ context.Context, _ string, _, _ int) ([]surveillance.Alert, error) {
	return s.alerts, nil
}
func (s *stubSurveillanceStore) DismissAlert(_ context.Context, _ int64) error { return s.dismissErr }
func (s *stubSurveillanceStore) ListCases(_ context.Context, _, _ int) ([]surveillance.Case, error) {
	return s.cases, nil
}
func (s *stubSurveillanceStore) GetCase(_ context.Context, id int64) (*surveillance.Case, error) {
	return &surveillance.Case{ID: id, Status: "open"}, nil
}
func (s *stubSurveillanceStore) OpenCase(_ context.Context, title, _ string, _ string, alertIDs []int64) (*surveillance.Case, error) {
	if s.openErr != nil {
		return nil, s.openErr
	}
	s.lastOpen.title = title
	s.lastOpen.alertIDs = alertIDs
	return &surveillance.Case{ID: 1, Title: title, Status: "open", AlertCount: len(alertIDs)}, nil
}
func (s *stubSurveillanceStore) UpdateCaseStatus(_ context.Context, id int64, status, _ string) (*surveillance.Case, error) {
	if s.updateErr != nil {
		return nil, s.updateErr
	}
	return &surveillance.Case{ID: id, Status: status}, nil
}

type stubScanner struct{ called bool }

func (s *stubScanner) Scan(_ context.Context, _ int) ([]surveillance.ScanResult, error) {
	s.called = true
	return []surveillance.ScanResult{{Detector: "wash_self_trade", Found: 2, Inserted: 2}}, nil
}

func newSurvHarness(store surveillanceStore, scanner surveillanceScanner) http.Handler {
	mux := http.NewServeMux()
	registerSurveillanceAdminRoutes(mux, store, scanner)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func survAdminReq(handler http.Handler, method, path, body string) *httptest.ResponseRecorder {
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	r = r.WithContext(httpx.WithTestUser(r.Context(), "admin-surv", "surv@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, r)
	return res
}

func TestSurveillanceRoutesRejectNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	handler := newSurvHarness(&stubSurveillanceStore{}, &stubScanner{})
	for _, tc := range []struct{ method, path string }{
		{http.MethodGet, "/api/v1/admin/surveillance/alerts"},
		{http.MethodPost, "/api/v1/admin/surveillance/scan"},
		{http.MethodGet, "/api/v1/admin/surveillance/cases"},
		{http.MethodGet, "/api/v1/admin/surveillance/cases/1"},
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

func TestSurveillanceListAlerts(t *testing.T) {
	handler := newSurvHarness(&stubSurveillanceStore{
		alerts: []surveillance.Alert{{ID: 1, Kind: "wash_self_trade", SubjectID: "u-1", Status: "open"}},
	}, &stubScanner{})
	res := survAdminReq(handler, http.MethodGet, "/api/v1/admin/surveillance/alerts?status=open", "")
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Alerts []surveillance.Alert `json:"alerts"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Alerts) != 1 || payload.Alerts[0].Kind != "wash_self_trade" {
		t.Fatalf("unexpected alerts: %s", res.Body.String())
	}
}

func TestSurveillanceScanRuns(t *testing.T) {
	scanner := &stubScanner{}
	handler := newSurvHarness(&stubSurveillanceStore{}, scanner)
	res := survAdminReq(handler, http.MethodPost, "/api/v1/admin/surveillance/scan", `{"lookbackHours":48}`)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if !scanner.called {
		t.Fatal("scan handler did not invoke the scanner")
	}
}

func TestSurveillanceOpenCaseRequiresAlerts(t *testing.T) {
	handler := newSurvHarness(&stubSurveillanceStore{openErr: surveillance.ErrInvalidInput}, &stubScanner{})
	res := survAdminReq(handler, http.MethodPost, "/api/v1/admin/surveillance/cases",
		`{"title":"Wash ring","alertIds":[]}`)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty alertIds, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestSurveillanceOpenCaseSucceeds(t *testing.T) {
	store := &stubSurveillanceStore{}
	handler := newSurvHarness(store, &stubScanner{})
	res := survAdminReq(handler, http.MethodPost, "/api/v1/admin/surveillance/cases",
		`{"title":"Wash ring","priority":"high","alertIds":[1,2]}`)
	if res.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", res.Code, res.Body.String())
	}
	if store.lastOpen.title != "Wash ring" || len(store.lastOpen.alertIDs) != 2 {
		t.Fatalf("open case not forwarded: %+v", store.lastOpen)
	}
}

func TestSurveillanceCloseCaseRequiresResolution(t *testing.T) {
	handler := newSurvHarness(&stubSurveillanceStore{updateErr: surveillance.ErrResolutionRequired}, &stubScanner{})
	res := survAdminReq(handler, http.MethodPut, "/api/v1/admin/surveillance/cases/1",
		`{"status":"closed_action","resolution":""}`)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 without resolution, got %d body=%s", res.Code, res.Body.String())
	}
}
