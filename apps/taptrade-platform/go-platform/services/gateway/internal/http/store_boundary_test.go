package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"taptrade/platform/transport/httpx"
)

// The point store tree mounts ONLY under STORE_ENABLED=true
// (STORE_AND_PAYMENTS.md §7). These tests pin both sides of that boundary in
// the same style as TestLegacyMoneyRoutesAreAbsentByDefault.

func TestStoreRoutesAreAbsentWhenStoreDisabled(t *testing.T) {
	t.Setenv("STORE_ENABLED", "")
	t.Setenv(legacyMoneyRoutesEnv, "")
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	cases := []struct {
		method string
		path   string
		body   string
	}{
		{http.MethodGet, "/api/v1/store/packs", ""},
		{http.MethodPost, "/api/v1/store/checkout", `{"packId":"starter","idempotencyKey":"k"}`},
		{http.MethodGet, "/api/v1/store/purchases", ""},
		{http.MethodGet, "/api/v1/store/purchases/sp_1", ""},
		{http.MethodPost, "/api/v1/store/purchases/sp_1/confirm", `{"outcome":"success"}`},
		{http.MethodPost, "/api/v1/store/webhook", `{}`},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusNotFound {
			t.Fatalf("%s %s: store route must be absent when STORE_ENABLED is unset, got %d body=%s", tc.method, tc.path, res.Code, res.Body.String())
		}
	}

	// The status advertisement must not mention the store when disabled.
	statusReq := httptest.NewRequest(http.MethodGet, "/api/v1/status", nil)
	statusRes := httptest.NewRecorder()
	handler.ServeHTTP(statusRes, statusReq)
	var status struct {
		LaunchRouteDomains []string `json:"launchRouteDomains"`
	}
	if err := json.Unmarshal(statusRes.Body.Bytes(), &status); err != nil {
		t.Fatalf("decode status: %v", err)
	}
	if slices.Contains(status.LaunchRouteDomains, "point_store") {
		t.Fatalf("disabled store must not advertise the point_store domain: %v", status.LaunchRouteDomains)
	}
}

func TestStoreRoutesRegisteredWhenStoreEnabled(t *testing.T) {
	t.Setenv("STORE_ENABLED", "true")
	t.Setenv("STORE_PROVIDER", "demo")
	t.Setenv("STORE_WEBHOOK_SECRET", "whsec_boundary_test")
	t.Setenv(legacyMoneyRoutesEnv, "")
	// Force memory mode so the test needs no database.
	t.Setenv("WALLET_STORE_MODE", "memory")
	t.Setenv("WALLET_DB_DSN", "")
	t.Setenv("GATEWAY_DB_DSN", "")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	// Authenticated catalogue read serves the seeded 5-pack catalogue.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/store/packs", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "u-1", "u-1@test.local", "player"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("enabled store packs read returned %d: %s", res.Code, res.Body.String())
	}
	var packsPayload struct {
		Packs []map[string]any `json:"packs"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &packsPayload); err != nil {
		t.Fatalf("decode packs: %v", err)
	}
	if len(packsPayload.Packs) != 5 {
		t.Fatalf("expected the 5-pack seed catalogue, got %d packs", len(packsPayload.Packs))
	}

	// Unauthenticated store reads stay denied even when the tree is mounted.
	anonReq := httptest.NewRequest(http.MethodGet, "/api/v1/store/packs", nil)
	anonRes := httptest.NewRecorder()
	handler.ServeHTTP(anonRes, anonReq)
	if anonRes.Code != http.StatusForbidden {
		t.Fatalf("anonymous packs read returned %d, want 403", anonRes.Code)
	}

	// The status advertisement gains point_store; the legacy money domains
	// stay absent (the store flag must never drag the legacy trees along).
	statusReq := httptest.NewRequest(http.MethodGet, "/api/v1/status", nil)
	statusRes := httptest.NewRecorder()
	handler.ServeHTTP(statusRes, statusReq)
	var status struct {
		LaunchRouteDomains []string `json:"launchRouteDomains"`
	}
	if err := json.Unmarshal(statusRes.Body.Bytes(), &status); err != nil {
		t.Fatalf("decode status: %v", err)
	}
	if !slices.Contains(status.LaunchRouteDomains, "point_store") {
		t.Fatalf("enabled store must advertise the point_store domain: %v", status.LaunchRouteDomains)
	}
	for _, prohibited := range []string{"alpha_cashier", "payments", "crypto_payments"} {
		if slices.Contains(status.LaunchRouteDomains, prohibited) {
			t.Fatalf("store flag must not enable legacy money domain %s: %v", prohibited, status.LaunchRouteDomains)
		}
	}

	// Legacy money routes remain absent with the store enabled.
	legacyReq := httptest.NewRequest(http.MethodPost, "/api/v1/payments/deposit", strings.NewReader(`{}`))
	legacyRes := httptest.NewRecorder()
	handler.ServeHTTP(legacyRes, legacyReq)
	if legacyRes.Code != http.StatusNotFound {
		t.Fatalf("legacy payments route must stay 404 with the store enabled, got %d", legacyRes.Code)
	}
}
