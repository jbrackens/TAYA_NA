package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"phoenix-revival/platform/transport/httpx"
)

func tenantHarness(t *testing.T) http.Handler {
	t.Helper()
	dsn := reportExportLiveDSN(t) // reuses the REPORT_LIVE_DSN opt-in gate
	db := openLiveDB(t, dsn)
	t.Cleanup(func() { _ = db.Close() })
	mux := http.NewServeMux()
	registerTenantAdminRoutes(mux, db)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func TestTenantAdminRoutesSkipWithoutDB(t *testing.T) {
	mux := http.NewServeMux()
	registerTenantAdminRoutes(mux, nil)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/tenants", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin", "a@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404 with nil DB, got %d", res.Code)
	}
}

func TestTenantAdminLive(t *testing.T) {
	handler := tenantHarness(t)

	adminReq := func(method, path, body string) *httptest.ResponseRecorder {
		var r *http.Request
		if body != "" {
			r = httptest.NewRequest(method, path, strings.NewReader(body))
		} else {
			r = httptest.NewRequest(method, path, nil)
		}
		r = r.WithContext(httpx.WithTestUser(r.Context(), "admin-t", "t@test.local", "admin"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, r)
		return res
	}

	// Player rejected.
	t.Run("player rejected", func(t *testing.T) {
		t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
		r := httptest.NewRequest(http.MethodGet, "/api/v1/admin/tenants", nil)
		r = r.WithContext(httpx.WithTestUser(r.Context(), "u-p", "p@test.local", "player"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, r)
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("expected rejection, got %d", res.Code)
		}
	})

	// List includes the default 'hula' tenant.
	listRes := adminReq(http.MethodGet, "/api/v1/admin/tenants", "")
	if listRes.Code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}

	// Create a fresh tenant, then suspend it.
	id := fmt.Sprintf("t%d", time.Now().UnixNano())
	createRes := adminReq(http.MethodPost, "/api/v1/admin/tenants",
		fmt.Sprintf(`{"id":%q,"displayName":"Test Brand"}`, id))
	if createRes.Code != http.StatusCreated {
		t.Fatalf("create: expected 201, got %d body=%s", createRes.Code, createRes.Body.String())
	}
	// Duplicate is a conflict.
	if dup := adminReq(http.MethodPost, "/api/v1/admin/tenants",
		fmt.Sprintf(`{"id":%q,"displayName":"Test Brand"}`, id)); dup.Code != http.StatusConflict {
		t.Fatalf("duplicate create: expected 409, got %d", dup.Code)
	}
	// Suspend.
	suspendRes := adminReq(http.MethodPut, "/api/v1/admin/tenants/"+id, `{"status":"suspended"}`)
	if suspendRes.Code != http.StatusOK {
		t.Fatalf("suspend: expected 200, got %d body=%s", suspendRes.Code, suspendRes.Body.String())
	}
	var updated tenantRow
	if err := json.Unmarshal(suspendRes.Body.Bytes(), &updated); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if updated.Status != "suspended" {
		t.Fatalf("expected suspended, got %q", updated.Status)
	}
	// Bad status rejected.
	if bad := adminReq(http.MethodPut, "/api/v1/admin/tenants/"+id, `{"status":"deleted"}`); bad.Code != http.StatusBadRequest {
		t.Fatalf("bad status: expected 400, got %d", bad.Code)
	}
	// Unknown tenant is 404.
	if nf := adminReq(http.MethodPut, "/api/v1/admin/tenants/nonexistent", `{"status":"active"}`); nf.Code != http.StatusNotFound {
		t.Fatalf("unknown tenant: expected 404, got %d", nf.Code)
	}
}
