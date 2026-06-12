package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

// TestBotOrderPathIsGeoGated is the regression guard for audit SEC-02: the
// bot/partner order route must run the same jurisdiction gate as the session
// order route. Before the fix, an API key (self-issuable by any player) could
// place orders from a blocked country with no geo/KYC check.
func TestBotOrderPathIsGeoGated(t *testing.T) {
	// Mint a real API key so botAuth.Wrap (bcrypt verify) passes.
	fullKey, prefix, hash, err := prediction.GenerateAPIKey()
	if err != nil {
		t.Fatalf("generate api key: %v", err)
	}
	repo := newPredictionAdminRepo()
	repo.apiKey = &prediction.APIKey{
		ID:        "key-1",
		UserID:    "bot-user-1",
		Name:      "test",
		KeyHash:   hash,
		KeyPrefix: prefix,
		Scopes:    []string{"read", "trade"},
		Active:    true,
	}

	svc := prediction.NewService(repo, nil)
	mux := http.NewServeMux()
	registerBotRoutes(mux, svc, repo, nil)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	// Geo gate ON with an allowlist that excludes the request's country.
	t.Setenv("GEO_GATE_ENABLED", "true")
	t.Setenv("GEO_ALLOWED_COUNTRIES", "PH")
	t.Setenv("BETA_COMPLIANCE_MODE", "")
	prevGeo := tradeGeoGate
	tradeGeoGate = compliance.NewGeoGateFromEnv()
	t.Cleanup(func() { tradeGeoGate = prevGeo })

	body, _ := json.Marshal(prediction.PlaceOrderRequest{
		MarketID: "mkt-1",
		Side:     prediction.OrderSideYes,
		Action:   prediction.OrderActionBuy,
		Quantity: 1,
	})

	// Blocked country → 403, and PlaceOrder is never reached.
	blocked := httptest.NewRequest(http.MethodPost, "/api/v1/bot/orders", bytes.NewReader(body))
	blocked.Header.Set("Authorization", "Bearer "+fullKey)
	blocked.Header.Set("CF-IPCountry", "US")
	blockedRec := httptest.NewRecorder()
	handler.ServeHTTP(blockedRec, blocked)
	if blockedRec.Code != http.StatusForbidden {
		t.Fatalf("blocked-country bot order: expected 403, got %d body=%s", blockedRec.Code, blockedRec.Body.String())
	}

	// Allowed country → passes the gate (then fails downstream because the
	// fake has no tradeable market; the point is it is NOT a 403 geo block).
	allowed := httptest.NewRequest(http.MethodPost, "/api/v1/bot/orders", bytes.NewReader(body))
	allowed.Header.Set("Authorization", "Bearer "+fullKey)
	allowed.Header.Set("CF-IPCountry", "PH")
	allowedRec := httptest.NewRecorder()
	handler.ServeHTTP(allowedRec, allowed)
	if allowedRec.Code == http.StatusForbidden {
		t.Fatalf("allowed-country bot order was geo-blocked (403); gate should have passed. body=%s", allowedRec.Body.String())
	}
}

// TestBotKeySelfServeGate verifies the self-serve creation gate (audit SEC-02):
// off in production unless BOT_KEYS_SELF_SERVE=true.
func TestBotKeySelfServeGate(t *testing.T) {
	t.Run("production blocks self-serve by default", func(t *testing.T) {
		t.Setenv("ENVIRONMENT", "production")
		t.Setenv("BOT_KEYS_SELF_SERVE", "")
		if botKeySelfServeEnabled() {
			t.Fatal("self-serve must be off in production by default")
		}
	})
	t.Run("production opt-in enables it", func(t *testing.T) {
		t.Setenv("ENVIRONMENT", "production")
		t.Setenv("BOT_KEYS_SELF_SERVE", "true")
		if !botKeySelfServeEnabled() {
			t.Fatal("explicit opt-in must enable self-serve")
		}
	})
	t.Run("dev allows self-serve", func(t *testing.T) {
		t.Setenv("ENVIRONMENT", "")
		t.Setenv("BOT_KEYS_SELF_SERVE", "")
		if !botKeySelfServeEnabled() {
			t.Fatal("self-serve should be on in dev/demo by default")
		}
	})
}
