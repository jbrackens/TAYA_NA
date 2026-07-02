package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/platformconfig"
	"phoenix-revival/platform/transport/httpx"
)

type stubConfigStore struct {
	getErr   error
	lastKey  string
	lastVal  string
}

func (s *stubConfigStore) List(_ context.Context) ([]platformconfig.Flag, error) {
	return []platformconfig.Flag{{Key: "k", Value: "v"}}, nil
}
func (s *stubConfigStore) Get(_ context.Context, key string) (*platformconfig.Flag, error) {
	if s.getErr != nil {
		return nil, s.getErr
	}
	return &platformconfig.Flag{Key: key, Value: "v"}, nil
}
func (s *stubConfigStore) Upsert(_ context.Context, f platformconfig.Flag, _ string) (*platformconfig.Flag, error) {
	s.lastKey = f.Key
	s.lastVal = f.Value
	return &f, nil
}

func newConfigHarness(store platformConfigAdmin) http.Handler {
	mux := http.NewServeMux()
	registerPlatformConfigAdminRoutes(mux, store)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func configReq(h http.Handler, method, path, body, role string) *httptest.ResponseRecorder {
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	r = r.WithContext(httpx.WithTestUser(r.Context(), "admin-c", "c@test.local", role))
	res := httptest.NewRecorder()
	h.ServeHTTP(res, r)
	return res
}

func TestPlatformConfigRoutesRejectNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	h := newConfigHarness(&stubConfigStore{})
	for _, tc := range []struct{ method, path, body string }{
		{http.MethodGet, "/api/v1/admin/config/flags", ""},
		{http.MethodGet, "/api/v1/admin/config/flags/some.key", ""},
		{http.MethodPut, "/api/v1/admin/config/flags/some.key", `{"value":"true"}`},
	} {
		res := configReq(h, tc.method, tc.path, tc.body, "player")
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s: expected rejection, got %d", tc.method, tc.path, res.Code)
		}
	}
}

func TestPlatformConfigListAndUpsert(t *testing.T) {
	store := &stubConfigStore{}
	h := newConfigHarness(store)

	if res := configReq(h, http.MethodGet, "/api/v1/admin/config/flags", "", "admin"); res.Code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d", res.Code)
	}
	res := configReq(h, http.MethodPut, "/api/v1/admin/config/flags/smm.enabled",
		`{"value":"true","description":"synthetic market maker"}`, "admin")
	if res.Code != http.StatusOK {
		t.Fatalf("upsert: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if store.lastKey != "smm.enabled" || store.lastVal != "true" {
		t.Fatalf("upsert not forwarded: key=%q val=%q", store.lastKey, store.lastVal)
	}
}

func TestPlatformConfigGetMissingIs404(t *testing.T) {
	h := newConfigHarness(&stubConfigStore{getErr: platformconfig.ErrNotFound})
	res := configReq(h, http.MethodGet, "/api/v1/admin/config/flags/nope", "", "admin")
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", res.Code)
	}
}
