package handlers

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"

	"github.com/phoenixbot/phoenix-gateway/internal/config"
	gatewayMiddleware "github.com/phoenixbot/phoenix-gateway/internal/middleware"
	"github.com/phoenixbot/phoenix-gateway/internal/repository"
	"github.com/phoenixbot/phoenix-gateway/internal/service"
)

func TestGatewayProxiesPublicAndAuthenticatedRoutes(t *testing.T) {
	t.Run("public market detail proxy", func(t *testing.T) {
		var downstreamPath string
		var downstreamQuery string
		marketService := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			downstreamPath = r.URL.Path
			downstreamQuery = r.URL.RawQuery
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"market_id":"mrk_123","status":"open"}`))
		}))
		defer marketService.Close()

		router := buildGatewayRouter(t, marketService.URL, "http://wallet.invalid", "http://betting.invalid", "http://config.invalid")
		req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/mrk_123?status=open", nil)
		res := httptest.NewRecorder()

		router.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
		}
		if got := res.Header().Get("X-Gateway-Service"); got != "phoenix-market-engine" {
			t.Fatalf("X-Gateway-Service = %q, want %q", got, "phoenix-market-engine")
		}
		if downstreamPath != "/api/v1/markets/mrk_123" {
			t.Fatalf("downstream path = %q, want %q", downstreamPath, "/api/v1/markets/mrk_123")
		}
		if downstreamQuery != "status=open" {
			t.Fatalf("downstream query = %q, want %q", downstreamQuery, "status=open")
		}
	})

	t.Run("public current terms proxy", func(t *testing.T) {
		var downstreamPath string
		configService := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			downstreamPath = r.URL.Path
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"current_terms_version":"v1"}`))
		}))
		defer configService.Close()

		router := buildGatewayRouter(t, "http://market.invalid", "http://wallet.invalid", "http://betting.invalid", configService.URL)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/terms/current", nil)
		res := httptest.NewRecorder()

		router.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			body, _ := io.ReadAll(res.Body)
			t.Fatalf("status = %d, want %d, body=%s", res.Code, http.StatusOK, string(body))
		}
		if got := res.Header().Get("X-Gateway-Service"); got != "phoenix-config" {
			t.Fatalf("X-Gateway-Service = %q, want %q", got, "phoenix-config")
		}
		if downstreamPath != "/api/v1/terms/current" {
			t.Fatalf("downstream path = %q, want %q", downstreamPath, "/api/v1/terms/current")
		}
	})

	t.Run("authenticated user bets proxy injects identity headers", func(t *testing.T) {
		var downstreamPath string
		var userID string
		var role string
		bettingService := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			downstreamPath = r.URL.Path
			userID = r.Header.Get("X-User-ID")
			role = r.Header.Get("X-User-Role")
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"data": []any{}, "total": 0})
		}))
		defer bettingService.Close()

		router := buildGatewayRouter(t, "http://market.invalid", "http://wallet.invalid", bettingService.URL, "http://config.invalid")
		req := httptest.NewRequest(http.MethodGet, "/api/v1/users/usr_123/bets?page=2", nil)
		req.Header.Set("Authorization", "Bearer "+signedGatewayToken(t, "gateway-test-secret", "trader", "usr_123"))
		res := httptest.NewRecorder()

		router.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			body, _ := io.ReadAll(res.Body)
			t.Fatalf("status = %d, want %d, body=%s", res.Code, http.StatusOK, string(body))
		}
		if got := res.Header().Get("X-Gateway-Service"); got != "phoenix-betting-engine" {
			t.Fatalf("X-Gateway-Service = %q, want %q", got, "phoenix-betting-engine")
		}
		if downstreamPath != "/api/v1/users/usr_123/bets" {
			t.Fatalf("downstream path = %q, want %q", downstreamPath, "/api/v1/users/usr_123/bets")
		}
		if userID != "usr_123" {
			t.Fatalf("X-User-ID = %q, want %q", userID, "usr_123")
		}
		if role != "trader" {
			t.Fatalf("X-User-Role = %q, want %q", role, "trader")
		}
	})
}

func buildGatewayRouter(t *testing.T, marketURL, walletURL, bettingURL, configURL string) http.Handler {
	t.Helper()

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cfg := &config.Config{
		Server: config.ServerConfig{
			Environment: "test",
		},
		Auth: config.AuthConfig{
			JWTSecretKey: "gateway-test-secret",
			JWTIssuer:    "phoenix-gateway",
			JWTAudience:  "phoenix-platform",
		},
		Services: map[string]config.ServiceConfig{
			"phoenix-user":           {BaseURL: "http://user.invalid", HealthPath: "/health"},
			"phoenix-wallet":         {BaseURL: walletURL, HealthPath: "/health"},
			"phoenix-market-engine":  {BaseURL: marketURL, HealthPath: "/health"},
			"phoenix-betting-engine": {BaseURL: bettingURL, HealthPath: "/health"},
			"phoenix-config":         {BaseURL: configURL, HealthPath: "/health"},
		},
		Features: config.FeatureFlags{
			ParlaysEnabled:     true,
			LiveBettingEnabled: true,
			CashoutEnabled:     true,
		},
		Limits: config.PlatformLimits{
			MaxBetAmount:  10000,
			MinBetAmount:  1,
			MaxParlayLegs: 12,
		},
		RateLimits: map[string]config.RateLimitPolicy{
			"auth-login":   {Name: "auth-login", Requests: 5, Window: time.Minute},
			"auth-refresh": {Name: "auth-refresh", Requests: 20, Window: time.Minute},
			"auth-logout":  {Name: "auth-logout", Requests: 20, Window: time.Minute},
			"admin":        {Name: "admin", Requests: 60, Window: time.Minute},
			"proxy":        {Name: "proxy", Requests: 300, Window: time.Minute},
		},
	}

	routeRepo := repository.NewStaticRouteRepository()
	rateLimitRepo := repository.NewMemoryRateLimitRepository()
	gatewayService := service.NewGatewayService(logger, cfg, routeRepo, rateLimitRepo)
	h := NewHandlers(logger, nil, gatewayService)

	r := chi.NewRouter()
	r.Use(chiMiddleware.RealIP)
	r.Use(gatewayMiddleware.RequestContext())
	r.Use(gatewayMiddleware.LoggingMiddleware(logger, gatewayService))
	r.Use(gatewayMiddleware.Recoverer(logger))
	r.Get("/terms", h.ProxyAuthRequest)
	r.Get("/api/v1/terms/current", h.ProxyAuthRequest)
	r.Get("/api/v1/markets", h.ProxyAuthRequest)
	r.Get("/api/v1/markets/{marketID}", h.ProxyAuthRequest)
	r.Group(func(r chi.Router) {
		r.Use(gatewayMiddleware.JWTAuth(logger, cfg.Auth.JWTSecretKey, cfg.Auth.JWTIssuer, cfg.Auth.JWTAudience))
		r.HandleFunc("/*", h.ProxyRequest)
	})
	return r
}

func signedGatewayToken(t *testing.T, secret, role, userID string) string {
	t.Helper()
	claims := &gatewayMiddleware.Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "phoenix-gateway",
			Audience:  []string{"phoenix-platform"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}
