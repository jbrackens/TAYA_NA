package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/notify"
	"phoenix-revival/platform/transport/httpx"
)

type stubTemplateStore struct {
	tmpl     *notify.Template
	getErr   error
	lastKey  string
	lastBody string
}

func (s *stubTemplateStore) List(_ context.Context) ([]notify.Template, error) {
	if s.tmpl != nil {
		return []notify.Template{*s.tmpl}, nil
	}
	return []notify.Template{}, nil
}
func (s *stubTemplateStore) Get(_ context.Context, key string) (*notify.Template, error) {
	if s.getErr != nil {
		return nil, s.getErr
	}
	return &notify.Template{Key: key, Subject: "s", Body: "b"}, nil
}
func (s *stubTemplateStore) Upsert(_ context.Context, t notify.Template, _ string) (*notify.Template, error) {
	s.lastKey = t.Key
	s.lastBody = t.Body
	return &t, nil
}

func newTmplHarness(store notificationTemplateAdmin) http.Handler {
	mux := http.NewServeMux()
	registerNotificationTemplateAdminRoutes(mux, store)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func tmplReq(h http.Handler, method, path, body, role string) *httptest.ResponseRecorder {
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	r = r.WithContext(httpx.WithTestUser(r.Context(), "admin-n", "n@test.local", role))
	res := httptest.NewRecorder()
	h.ServeHTTP(res, r)
	return res
}

func TestNotificationTemplateRoutesRejectNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	h := newTmplHarness(&stubTemplateStore{})
	for _, tc := range []struct{ method, path, body string }{
		{http.MethodGet, "/api/v1/admin/notification-templates", ""},
		{http.MethodGet, "/api/v1/admin/notification-templates/resolution.settled", ""},
		{http.MethodPut, "/api/v1/admin/notification-templates/resolution.settled", `{"subject":"x","body":"y"}`},
	} {
		res := tmplReq(h, tc.method, tc.path, tc.body, "player")
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s: expected rejection, got %d", tc.method, tc.path, res.Code)
		}
	}
}

func TestNotificationTemplateListAndUpsert(t *testing.T) {
	store := &stubTemplateStore{}
	h := newTmplHarness(store)

	if res := tmplReq(h, http.MethodGet, "/api/v1/admin/notification-templates", "", "admin"); res.Code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d", res.Code)
	}
	res := tmplReq(h, http.MethodPut, "/api/v1/admin/notification-templates/resolution.settled",
		`{"subject":"Resolved {{ticker}}","body":"Your market settled."}`, "admin")
	if res.Code != http.StatusOK {
		t.Fatalf("upsert: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if store.lastKey != "resolution.settled" || store.lastBody != "Your market settled." {
		t.Fatalf("upsert not forwarded: key=%q body=%q", store.lastKey, store.lastBody)
	}
}

func TestNotificationTemplateGetMissingIs404(t *testing.T) {
	h := newTmplHarness(&stubTemplateStore{getErr: notify.ErrTemplateNotFound})
	res := tmplReq(h, http.MethodGet, "/api/v1/admin/notification-templates/nope", "", "admin")
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", res.Code)
	}
}
