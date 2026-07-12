package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"taptrade/platform/transport/httpx"
)

// Catalogue admin surface (owner decision 2026-07-12, item 3): registered
// only with the store tree, finance-permission-gated, validation-hardened.

func storeAdminHarness(t *testing.T) http.Handler {
	t.Helper()
	t.Setenv("STORE_ENABLED", "true")
	t.Setenv("STORE_PROVIDER", "demo")
	t.Setenv("STORE_WEBHOOK_SECRET", "whsec_store_admin_test")
	// main_test.go enables the dev anon-admin bypass package-wide; these
	// tests assert the real role gate, so switch it off.
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "false")
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func adminStoreRequest(method, path, body string) *http.Request {
	var req *http.Request
	if body == "" {
		req = httptest.NewRequest(method, path, nil)
	} else {
		req = httptest.NewRequest(method, path, strings.NewReader(body))
	}
	return adminWalletContext(req)
}

func TestStoreAdminCatalogueRequiresAdmin(t *testing.T) {
	handler := storeAdminHarness(t)

	// Player session: forbidden.
	req := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/store/packs", nil), "u-player")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
		t.Fatalf("player must not read the admin catalogue, got %d body=%s", res.Code, res.Body.String())
	}

	// Admin session: full catalogue incl. inactive packs.
	res2 := httptest.NewRecorder()
	handler.ServeHTTP(res2, adminStoreRequest(http.MethodGet, "/api/v1/admin/store/packs", ""))
	if res2.Code != http.StatusOK {
		t.Fatalf("admin catalogue read failed: %d body=%s", res2.Code, res2.Body.String())
	}
	var payload struct {
		Items []map[string]any `json:"items"`
		Total int              `json:"total"`
	}
	if err := json.Unmarshal(res2.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if payload.Total < 5 {
		t.Fatalf("expected the seeded catalogue (>=5 packs), got %d", payload.Total)
	}
}

func TestStoreAdminUpdatePackAndValidation(t *testing.T) {
	handler := storeAdminHarness(t)

	// Update an existing pack.
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, adminStoreRequest(http.MethodPut, "/api/v1/admin/store/packs/starter", `{
		"name": "Starter", "priceUsdCents": 599, "basePoints": 599,
		"bonusPoints": 0, "displayOrder": 1, "active": true, "badge": "Starter"
	}`))
	if res.Code != http.StatusOK {
		t.Fatalf("update failed: %d body=%s", res.Code, res.Body.String())
	}
	if !strings.Contains(res.Body.String(), `"priceUsdCents":599`) {
		t.Fatalf("updated price not reflected: %s", res.Body.String())
	}

	// Unknown pack: 404.
	res404 := httptest.NewRecorder()
	handler.ServeHTTP(res404, adminStoreRequest(http.MethodPut, "/api/v1/admin/store/packs/nope", `{
		"name": "X", "priceUsdCents": 100, "basePoints": 100
	}`))
	if res404.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown pack, got %d", res404.Code)
	}

	// Validation: non-positive price is a 400, not a DB error.
	resBad := httptest.NewRecorder()
	handler.ServeHTTP(resBad, adminStoreRequest(http.MethodPut, "/api/v1/admin/store/packs/starter", `{
		"name": "Starter", "priceUsdCents": 0, "basePoints": 500
	}`))
	if resBad.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for zero price, got %d body=%s", resBad.Code, resBad.Body.String())
	}

	// Launch-copy boundary: prohibited wording in the name is rejected.
	resCopy := httptest.NewRecorder()
	handler.ServeHTTP(resCopy, adminStoreRequest(http.MethodPut, "/api/v1/admin/store/packs/starter", `{
		"name": "Cashout Special", "priceUsdCents": 500, "basePoints": 500
	}`))
	if resCopy.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for launch-prohibited name, got %d body=%s", resCopy.Code, resCopy.Body.String())
	}

	// Player session cannot mutate.
	resPlayer := httptest.NewRecorder()
	handler.ServeHTTP(resPlayer, playerWalletContext(httptest.NewRequest(http.MethodPut, "/api/v1/admin/store/packs/starter",
		strings.NewReader(`{"name":"Starter","priceUsdCents":500,"basePoints":500}`)), "u-player"))
	if resPlayer.Code != http.StatusForbidden && resPlayer.Code != http.StatusUnauthorized {
		t.Fatalf("player must not mutate the catalogue, got %d", resPlayer.Code)
	}
}

func TestStoreAdminCreateAndConflict(t *testing.T) {
	handler := storeAdminHarness(t)

	body := `{"id": "mega", "name": "Mega", "priceUsdCents": 20000,
		"basePoints": 20000, "bonusPoints": 5000, "displayOrder": 9, "active": false}`
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, adminStoreRequest(http.MethodPost, "/api/v1/admin/store/packs", body))
	if res.Code != http.StatusCreated {
		t.Fatalf("create failed: %d body=%s", res.Code, res.Body.String())
	}

	// Same id again: conflict.
	resDup := httptest.NewRecorder()
	handler.ServeHTTP(resDup, adminStoreRequest(http.MethodPost, "/api/v1/admin/store/packs", body))
	if resDup.Code != http.StatusConflict {
		t.Fatalf("expected 409 on duplicate id, got %d", resDup.Code)
	}

	// Bad slug: 400.
	resSlug := httptest.NewRecorder()
	handler.ServeHTTP(resSlug, adminStoreRequest(http.MethodPost, "/api/v1/admin/store/packs", `{
		"id": "Not A Slug!", "name": "X", "priceUsdCents": 100, "basePoints": 100
	}`))
	if resSlug.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid slug, got %d", resSlug.Code)
	}
}

func TestStoreAdminRoutesAbsentWhenStoreDisabled(t *testing.T) {
	t.Setenv("STORE_ENABLED", "false")
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	res := httptest.NewRecorder()
	handler.ServeHTTP(res, adminStoreRequest(http.MethodGet, "/api/v1/admin/store/packs", ""))
	if res.Code != http.StatusNotFound {
		t.Fatalf("admin catalogue must be absent when the store is disabled, got %d", res.Code)
	}
}
