package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/segmentation"
	"phoenix-revival/platform/transport/httpx"
)

type stubSegStore struct {
	createErr error
	assignErr error
	lastAssign struct {
		tagID  int64
		userID string
	}
	lastQuery   segmentation.Query
	campaignErr error
}

func (s *stubSegStore) CreateTag(_ context.Context, name, _ string) (*segmentation.Tag, error) {
	if s.createErr != nil {
		return nil, s.createErr
	}
	return &segmentation.Tag{ID: 1, Name: name}, nil
}
func (s *stubSegStore) ListTags(_ context.Context) ([]segmentation.Tag, error) {
	return []segmentation.Tag{{ID: 1, Name: "vip"}}, nil
}
func (s *stubSegStore) DeleteTag(_ context.Context, _ int64) error { return nil }
func (s *stubSegStore) AssignTag(_ context.Context, tagID int64, userID, _ string) error {
	if s.assignErr != nil {
		return s.assignErr
	}
	s.lastAssign.tagID = tagID
	s.lastAssign.userID = userID
	return nil
}
func (s *stubSegStore) UnassignTag(_ context.Context, _ int64, _ string) error { return nil }
func (s *stubSegStore) UsersForTag(_ context.Context, _ int64, _, _ int) ([]string, error) {
	return []string{"user-001"}, nil
}
func (s *stubSegStore) TagsForUser(_ context.Context, _ string) ([]segmentation.Tag, error) {
	return []segmentation.Tag{{ID: 1, Name: "vip"}}, nil
}
func (s *stubSegStore) RunQuery(_ context.Context, q segmentation.Query) (*segmentation.QueryResult, error) {
	s.lastQuery = q
	return &segmentation.QueryResult{UserIDs: []string{"user-001"}, Total: 1}, nil
}
func (s *stubSegStore) CreateCampaign(_ context.Context, name string, tagID int64, actionType, _, _ string) (*segmentation.Campaign, error) {
	if s.campaignErr != nil {
		return nil, s.campaignErr
	}
	return &segmentation.Campaign{ID: 5, Name: name, TagID: tagID, ActionType: actionType, Status: "draft"}, nil
}
func (s *stubSegStore) ListCampaigns(_ context.Context) ([]segmentation.Campaign, error) {
	return []segmentation.Campaign{{ID: 5, Name: "welcome", Status: "draft"}}, nil
}
func (s *stubSegStore) GetCampaign(_ context.Context, id int64) (*segmentation.Campaign, error) {
	return &segmentation.Campaign{ID: id, Name: "welcome", TagID: 1, ActionType: "notification", Status: "draft"}, nil
}
func (s *stubSegStore) UpdateCampaignStatus(_ context.Context, id int64, status string) (*segmentation.Campaign, error) {
	return &segmentation.Campaign{ID: id, Status: status}, nil
}
func (s *stubSegStore) PreviewCampaign(_ context.Context, _ int64) (int, error) {
	return 42, nil
}

// stubGate is a campaignDispatchGate whose answer is fixed.
type stubGate struct{ enabled bool }

func (g stubGate) GetBool(_ context.Context, _ string, _ bool) bool { return g.enabled }

func newSegHarness(store segmentationStore) http.Handler {
	return newSegHarnessGate(store, stubGate{enabled: false})
}

func newSegHarnessGate(store segmentationStore, gate campaignDispatchGate) http.Handler {
	mux := http.NewServeMux()
	registerSegmentationAdminRoutes(mux, store, gate)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func segReq(h http.Handler, method, path, body, role string) *httptest.ResponseRecorder {
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	r = r.WithContext(httpx.WithTestUser(r.Context(), "admin-s", "s@test.local", role))
	res := httptest.NewRecorder()
	h.ServeHTTP(res, r)
	return res
}

func TestSegmentationRoutesRejectNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	h := newSegHarness(&stubSegStore{})
	for _, tc := range []struct{ method, path, body string }{
		{http.MethodGet, "/api/v1/admin/segments/tags", ""},
		{http.MethodPost, "/api/v1/admin/segments/tags", `{"name":"vip"}`},
		{http.MethodPost, "/api/v1/admin/segments/tags/1/assign", `{"userId":"u-1"}`},
		{http.MethodGet, "/api/v1/admin/segments/users/u-1/tags", ""},
	} {
		res := segReq(h, tc.method, tc.path, tc.body, "player")
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s: expected rejection, got %d", tc.method, tc.path, res.Code)
		}
	}
}

func TestSegmentationCreateAndAssign(t *testing.T) {
	store := &stubSegStore{}
	h := newSegHarness(store)

	if res := segReq(h, http.MethodGet, "/api/v1/admin/segments/tags", "", "admin"); res.Code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d", res.Code)
	}
	if res := segReq(h, http.MethodPost, "/api/v1/admin/segments/tags", `{"name":"vip"}`, "admin"); res.Code != http.StatusCreated {
		t.Fatalf("create: expected 201, got %d body=%s", res.Code, res.Body.String())
	}
	if res := segReq(h, http.MethodPost, "/api/v1/admin/segments/tags/7/assign", `{"userId":"user-001"}`, "admin"); res.Code != http.StatusOK {
		t.Fatalf("assign: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if store.lastAssign.tagID != 7 || store.lastAssign.userID != "user-001" {
		t.Fatalf("assign not forwarded: %+v", store.lastAssign)
	}
}

func TestSegmentationQueryBuilder(t *testing.T) {
	store := &stubSegStore{}
	h := newSegHarness(store)

	res := segReq(h, http.MethodPost, "/api/v1/admin/segments/query",
		`{"tagId":3,"status":"active","limit":50}`, "admin")
	if res.Code != http.StatusOK {
		t.Fatalf("query: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if store.lastQuery.TagID != 3 || store.lastQuery.Status != "active" || store.lastQuery.Limit != 50 {
		t.Fatalf("query not forwarded: %+v", store.lastQuery)
	}

	// Unknown status is rejected before hitting the store.
	bad := segReq(h, http.MethodPost, "/api/v1/admin/segments/query", `{"status":"bogus"}`, "admin")
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("bad status: expected 400, got %d", bad.Code)
	}

	// Read permission required.
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	player := segReq(h, http.MethodPost, "/api/v1/admin/segments/query", `{}`, "player")
	if player.Code != http.StatusForbidden && player.Code != http.StatusUnauthorized {
		t.Fatalf("player query: expected rejection, got %d", player.Code)
	}
}

func TestSegmentationDuplicateTagIs409(t *testing.T) {
	h := newSegHarness(&stubSegStore{createErr: segmentation.ErrDuplicate})
	res := segReq(h, http.MethodPost, "/api/v1/admin/segments/tags", `{"name":"vip"}`, "admin")
	if res.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d", res.Code)
	}
}

func TestSegmentationAssignUnknownTagIs404(t *testing.T) {
	h := newSegHarness(&stubSegStore{assignErr: segmentation.ErrNotFound})
	res := segReq(h, http.MethodPost, "/api/v1/admin/segments/tags/999/assign", `{"userId":"u-1"}`, "admin")
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", res.Code)
	}
}

func TestSegmentationCampaignCRUDAndPreview(t *testing.T) {
	h := newSegHarness(&stubSegStore{})
	if res := segReq(h, http.MethodPost, "/api/v1/admin/segments/campaigns",
		`{"name":"welcome","tagId":1,"actionType":"notification"}`, "admin"); res.Code != http.StatusCreated {
		t.Fatalf("create: expected 201, got %d body=%s", res.Code, res.Body.String())
	}
	if res := segReq(h, http.MethodGet, "/api/v1/admin/segments/campaigns", "", "admin"); res.Code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d", res.Code)
	}
	if res := segReq(h, http.MethodGet, "/api/v1/admin/segments/campaigns/5/preview", "", "admin"); res.Code != http.StatusOK {
		t.Fatalf("preview: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if res := segReq(h, http.MethodPut, "/api/v1/admin/segments/campaigns/5", `{"status":"active"}`, "admin"); res.Code != http.StatusOK {
		t.Fatalf("update: expected 200, got %d", res.Code)
	}
}

func TestSegmentationCampaignCreateInvalidAction(t *testing.T) {
	h := newSegHarness(&stubSegStore{campaignErr: segmentation.ErrCampaignInvalid})
	res := segReq(h, http.MethodPost, "/api/v1/admin/segments/campaigns",
		`{"name":"x","tagId":1,"actionType":"telepathy"}`, "admin")
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", res.Code, res.Body.String())
	}
}

// Launch-safety: with dispatch disabled (default), execute is unreachable.
func TestSegmentationCampaignExecuteFailsClosedWhenDisabled(t *testing.T) {
	h := newSegHarnessGate(&stubSegStore{}, stubGate{enabled: false})
	res := segReq(h, http.MethodPost, "/api/v1/admin/segments/campaigns/5/execute", "", "admin")
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected 403 with dispatch disabled, got %d body=%s", res.Code, res.Body.String())
	}
}

// When enabled (non-launch), execute is 501 — the dispatch worker is an
// explicit follow-up, never a fake success.
func TestSegmentationCampaignExecuteNotImplementedWhenEnabled(t *testing.T) {
	h := newSegHarnessGate(&stubSegStore{}, stubGate{enabled: true})
	res := segReq(h, http.MethodPost, "/api/v1/admin/segments/campaigns/5/execute", "", "admin")
	if res.Code != http.StatusNotImplemented {
		t.Fatalf("expected 501 with dispatch enabled, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestSegmentationCampaignExecuteRejectsNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	h := newSegHarnessGate(&stubSegStore{}, stubGate{enabled: true})
	res := segReq(h, http.MethodPost, "/api/v1/admin/segments/campaigns/5/execute", "", "player")
	if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
		t.Fatalf("expected rejection, got %d", res.Code)
	}
}

// TestSegmentationQueryCSVExport (GAP-44) covers ?format=csv on the segment
// query: a text/csv attachment of the matched user ids, and an audit entry
// (bulk member extract is a sensitive action).
func TestSegmentationQueryCSVExport(t *testing.T) {
	store := &stubSegStore{}
	h := newSegHarness(store)

	res := segReq(h, http.MethodPost, "/api/v1/admin/segments/query?format=csv",
		`{"tagId":3,"status":"active"}`, "admin")
	if res.Code != http.StatusOK {
		t.Fatalf("csv export: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if ct := res.Header().Get("Content-Type"); !strings.Contains(ct, "text/csv") {
		t.Fatalf("expected text/csv, got %q", ct)
	}
	if cd := res.Header().Get("Content-Disposition"); !strings.Contains(cd, "attachment") {
		t.Fatalf("expected attachment disposition, got %q", cd)
	}
	body := res.Body.String()
	if !strings.Contains(body, "userId") || !strings.Contains(body, "user-001") {
		t.Fatalf("csv body missing header/rows: %q", body)
	}

	found := false
	for _, e := range providerOpsAuditSnapshot() {
		if e.Action == "segment.query_exported" {
			found = true
		}
	}
	if !found {
		t.Fatal("segment.query_exported audit entry not found")
	}
}
