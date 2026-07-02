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

func newSegHarness(store segmentationStore) http.Handler {
	mux := http.NewServeMux()
	registerSegmentationAdminRoutes(mux, store)
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
