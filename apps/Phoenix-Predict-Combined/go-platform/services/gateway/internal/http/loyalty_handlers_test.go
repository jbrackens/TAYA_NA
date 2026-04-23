package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

func TestLoyaltyRoutesExposeAccountLedgerAndTiers(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	accountReq := httptest.NewRequest(http.MethodGet, "/api/v1/loyalty?userId=u-1", nil)
	// requireSelfOrAdmin reads the session user from context/header — tests
	// use the X-User-ID bot-auth header path. Must match the userId param.
	accountReq.Header.Set("X-User-ID", "u-1")
	accountRes := httptest.NewRecorder()
	handler.ServeHTTP(accountRes, accountReq)
	if accountRes.Code != http.StatusOK {
		t.Fatalf("expected account status 200, got %d, body=%s", accountRes.Code, accountRes.Body.String())
	}

	var accountPayload map[string]any
	if err := json.Unmarshal(accountRes.Body.Bytes(), &accountPayload); err != nil {
		t.Fatalf("decode account payload: %v", err)
	}
	if accountPayload["playerId"] != "u-1" {
		t.Fatalf("expected playerId u-1, got %v", accountPayload["playerId"])
	}

	ledgerReq := httptest.NewRequest(http.MethodGet, "/api/v1/loyalty/ledger?userId=u-1&limit=5", nil)
	ledgerReq.Header.Set("X-User-ID", "u-1")
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}

	var ledgerPayload struct {
		PlayerID string           `json:"playerId"`
		Items    []map[string]any `json:"items"`
		Total    int              `json:"total"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode ledger payload: %v", err)
	}
	if ledgerPayload.PlayerID != "u-1" {
		t.Fatalf("expected ledger playerId u-1, got %s", ledgerPayload.PlayerID)
	}
	if ledgerPayload.Total < 1 {
		t.Fatalf("expected seeded ledger total >= 1, got %d", ledgerPayload.Total)
	}

	tiersReq := httptest.NewRequest(http.MethodGet, "/api/v1/loyalty/tiers", nil)
	tiersRes := httptest.NewRecorder()
	handler.ServeHTTP(tiersRes, tiersReq)
	if tiersRes.Code != http.StatusOK {
		t.Fatalf("expected tiers status 200, got %d, body=%s", tiersRes.Code, tiersRes.Body.String())
	}

	var tiersPayload struct {
		Items      []map[string]any `json:"items"`
		TotalCount int              `json:"totalCount"`
	}
	if err := json.Unmarshal(tiersRes.Body.Bytes(), &tiersPayload); err != nil {
		t.Fatalf("decode tiers payload: %v", err)
	}
	if tiersPayload.TotalCount < 4 {
		t.Fatalf("expected at least four loyalty tiers, got %d", tiersPayload.TotalCount)
	}
}

// TestLoyaltyHandlersEnforceSelfOrAdmin verifies the auth-hardening added per
// PLAN-loyalty-leaderboards.md §8 "Auth hardening". Before this, any
// authenticated user could enumerate any other user's loyalty data via
// ?userId= — now it's 401 without a session user and 403 if the session
// user differs from the claim.
//
// Note: main_test.go sets GATEWAY_ALLOW_ADMIN_ANON=true globally, which
// bypasses requireAdminRole. Disable it here so mismatch cases exercise
// the real denial path instead of the dev bypass.
func TestLoyaltyHandlersEnforceSelfOrAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	cases := []struct {
		name          string
		url           string
		sessionUserID string
		wantStatus    int
	}{
		{"no session → 401", "/api/v1/loyalty?userId=u-1", "", http.StatusUnauthorized},
		{"self → 200", "/api/v1/loyalty?userId=u-1", "u-1", http.StatusOK},
		{"other user → 403", "/api/v1/loyalty?userId=u-1", "u-2", http.StatusForbidden},
		{"ledger no session → 401", "/api/v1/loyalty/ledger?userId=u-1", "", http.StatusUnauthorized},
		{"ledger self → 200", "/api/v1/loyalty/ledger?userId=u-1", "u-1", http.StatusOK},
		{"ledger other user → 403", "/api/v1/loyalty/ledger?userId=u-1", "u-2", http.StatusForbidden},
		{"referrals self → 200", "/api/v1/referrals?userId=u-1", "u-1", http.StatusOK},
		{"referrals other → 403", "/api/v1/referrals?userId=u-1", "u-2", http.StatusForbidden},
		// Note: admin-delegated access works in production via httpx.Auth
		// middleware, which populates both context.UserID + context.Role.
		// In this unit test we use the bot-auth X-User-ID header path,
		// which doesn't populate context, so requireAdminRole fails even
		// with X-Admin-Role set. The admin bypass is covered by the
		// existing TestAdminLoyaltyAdjustmentAndDetailFlow test (which
		// runs with GATEWAY_ALLOW_ADMIN_ANON=true, the usual test env).
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.url, nil)
			if tc.sessionUserID != "" {
				req.Header.Set("X-User-ID", tc.sessionUserID)
			}
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != tc.wantStatus {
				t.Errorf("%s: want %d got %d (body=%s)", tc.name, tc.wantStatus, res.Code, res.Body.String())
			}
		})
	}
}

func TestAdminLoyaltyAdjustmentAndDetailFlow(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	payload := []byte(`{"playerId":"u-loyalty-admin-1","pointsDelta":250,"idempotencyKey":"adj-1","reason":"manual goodwill","createdBy":"admin-ops-1","entrySubtype":"goodwill"}`)
	adjustReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/loyalty/adjustments", bytes.NewBuffer(payload))
	adjustReq.Header.Set("X-Admin-Role", "admin")
	adjustRes := httptest.NewRecorder()
	handler.ServeHTTP(adjustRes, adjustReq)
	if adjustRes.Code != http.StatusOK {
		t.Fatalf("expected adjust status 200, got %d, body=%s", adjustRes.Code, adjustRes.Body.String())
	}

	var adjustPayload struct {
		Account map[string]any `json:"account"`
		Entry   map[string]any `json:"entry"`
	}
	if err := json.Unmarshal(adjustRes.Body.Bytes(), &adjustPayload); err != nil {
		t.Fatalf("decode adjust payload: %v", err)
	}
	if adjustPayload.Account["playerId"] != "u-loyalty-admin-1" {
		t.Fatalf("expected account playerId u-loyalty-admin-1, got %v", adjustPayload.Account["playerId"])
	}
	if int(adjustPayload.Account["pointsBalance"].(float64)) != 250 {
		t.Fatalf("expected pointsBalance 250, got %v", adjustPayload.Account["pointsBalance"])
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/loyalty/accounts?search=u-loyalty-admin-1", nil)
	listReq.Header.Set("X-Admin-Role", "admin")
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}

	var listPayload struct {
		Items      []map[string]any `json:"items"`
		TotalCount int              `json:"totalCount"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list payload: %v", err)
	}
	if listPayload.TotalCount != 1 {
		t.Fatalf("expected one loyalty account in filtered admin list, got %d", listPayload.TotalCount)
	}

	detailReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/loyalty/accounts/u-loyalty-admin-1?limit=5", nil)
	detailReq.Header.Set("X-Admin-Role", "admin")
	detailRes := httptest.NewRecorder()
	handler.ServeHTTP(detailRes, detailReq)
	if detailRes.Code != http.StatusOK {
		t.Fatalf("expected detail status 200, got %d, body=%s", detailRes.Code, detailRes.Body.String())
	}

	var detailPayload struct {
		Account map[string]any   `json:"account"`
		Ledger  []map[string]any `json:"ledger"`
		Tiers   []map[string]any `json:"tiers"`
	}
	if err := json.Unmarshal(detailRes.Body.Bytes(), &detailPayload); err != nil {
		t.Fatalf("decode detail payload: %v", err)
	}
	if len(detailPayload.Ledger) != 1 {
		t.Fatalf("expected one ledger entry in detail view, got %d", len(detailPayload.Ledger))
	}
	if detailPayload.Account["playerId"] != "u-loyalty-admin-1" {
		t.Fatalf("expected detail playerId u-loyalty-admin-1, got %v", detailPayload.Account["playerId"])
	}
}

func TestAdminLoyaltyRoutesRequireAdminRole(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/loyalty/accounts", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestReferralRegistrationAndPlayerListFlow(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/loyalty/referrals",
		bytes.NewBufferString(`{"referrerPlayerId":"u-referrer-office-1","referredPlayerId":"u-referred-office-1"}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("X-Admin-Role", "admin")
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusOK {
		t.Fatalf("expected create referral status 200, got %d, body=%s", createRes.Code, createRes.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/referrals?userId=u-referrer-office-1", nil)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected referral list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}

	var payload struct {
		PlayerID string           `json:"playerId"`
		Items    []map[string]any `json:"items"`
		Total    int              `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode referral list payload: %v", err)
	}
	if payload.PlayerID != "u-referrer-office-1" {
		t.Fatalf("expected playerId u-referrer-office-1, got %s", payload.PlayerID)
	}
	if payload.Total != 1 {
		t.Fatalf("expected one referral record, got %d", payload.Total)
	}
}

func TestAdminLoyaltyConfigAndSettingsUpdateFlow(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	configReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/loyalty/config", nil)
	configReq.Header.Set("X-Admin-Role", "admin")
	configRes := httptest.NewRecorder()
	handler.ServeHTTP(configRes, configReq)
	if configRes.Code != http.StatusOK {
		t.Fatalf("expected config status 200, got %d, body=%s", configRes.Code, configRes.Body.String())
	}

	tierReq := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/loyalty/tiers/silver",
		bytes.NewBufferString(`{"displayName":"Silver","rank":2,"minLifetimePoints":700,"minRolling30dPoints":0,"benefits":{"cashoutBoost":"priority"},"active":true}`),
	)
	tierReq.Header.Set("Content-Type", "application/json")
	tierReq.Header.Set("X-Admin-Role", "admin")
	tierRes := httptest.NewRecorder()
	handler.ServeHTTP(tierRes, tierReq)
	if tierRes.Code != http.StatusOK {
		t.Fatalf("expected tier update status 200, got %d, body=%s", tierRes.Code, tierRes.Body.String())
	}

	ruleReq := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/loyalty/rules/rule:loyalty:default-settlement",
		bytes.NewBufferString(`{"name":"Default settled bet accrual","sourceType":"bet_settlement","active":true,"multiplier":2,"minQualifiedStakeCents":100,"eligibleSportIds":[],"eligibleBetTypes":[],"maxPointsPerEvent":0}`),
	)
	ruleReq.Header.Set("Content-Type", "application/json")
	ruleReq.Header.Set("X-Admin-Role", "admin")
	ruleRes := httptest.NewRecorder()
	handler.ServeHTTP(ruleRes, ruleReq)
	if ruleRes.Code != http.StatusOK {
		t.Fatalf("expected rule update status 200, got %d, body=%s", ruleRes.Code, ruleRes.Body.String())
	}
}
