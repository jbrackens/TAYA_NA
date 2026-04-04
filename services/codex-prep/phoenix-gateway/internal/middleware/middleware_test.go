package middleware

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestJWTAuthAndRequireRoles(t *testing.T) {
	secret := "test-secret"
	validToken := signedToken(t, secret, "admin")
	playerToken := signedToken(t, secret, "player")

	tests := []struct {
		name       string
		header     string
		statusCode int
		withRole   bool
	}{
		{name: "missing auth", header: "", statusCode: http.StatusUnauthorized},
		{name: "invalid token", header: "Bearer bad-token", statusCode: http.StatusUnauthorized},
		{name: "valid token", header: "Bearer " + validToken, statusCode: http.StatusOK},
		{name: "role denied", header: "Bearer " + playerToken, statusCode: http.StatusForbidden, withRole: true},
		{name: "role allowed", header: "Bearer " + validToken, statusCode: http.StatusOK, withRole: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})
			wrapped := JWTAuth(slog.Default(), secret, "phoenix-gateway", "phoenix-platform")(handler)
			if tt.withRole {
				wrapped = JWTAuth(slog.Default(), secret, "phoenix-gateway", "phoenix-platform")(RequireRoles("admin")(handler))
			}

			req := httptest.NewRequest(http.MethodGet, "/api/v1/routes", nil)
			if tt.header != "" {
				req.Header.Set("Authorization", tt.header)
			}
			res := httptest.NewRecorder()
			wrapped.ServeHTTP(res, req)

			if res.Code != tt.statusCode {
				t.Fatalf("status = %d, want %d", res.Code, tt.statusCode)
			}
		})
	}
}

func TestParseTokenSupportsRawAndBearerTokens(t *testing.T) {
	secret := "test-secret"
	token := signedToken(t, secret, "admin")

	tests := []struct {
		name  string
		value string
	}{
		{name: "raw token", value: token},
		{name: "bearer token", value: "Bearer " + token},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := ParseToken(secret, "phoenix-gateway", "phoenix-platform", tt.value)
			if err != nil {
				t.Fatalf("expected token to parse, got %v", err)
			}
			if claims.UserID != "usr_123" {
				t.Fatalf("expected user id usr_123, got %s", claims.UserID)
			}
		})
	}
}

func TestCORSAllowsConfiguredOriginAndPreflight(t *testing.T) {
	handler := CORS([]string{"http://localhost:3100"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	t.Run("simple request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.Header.Set("Origin", "http://localhost:3100")

		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
		}
		if got := res.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3100" {
			t.Fatalf("allow origin = %q, want %q", got, "http://localhost:3100")
		}
		if got := res.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
			t.Fatalf("allow credentials = %q, want true", got)
		}
	})

	t.Run("preflight request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/auth/login", nil)
		req.Header.Set("Origin", "http://localhost:3100")
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		req.Header.Set("Access-Control-Request-Headers", "authorization,content-type")

		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)

		if res.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusNoContent)
		}
		if got := res.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3100" {
			t.Fatalf("allow origin = %q, want %q", got, "http://localhost:3100")
		}
	})
}

func TestCORSRejectsDisallowedPreflightOrigin(t *testing.T) {
	handler := CORS([]string{"http://localhost:3100"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/auth/login", nil)
	req.Header.Set("Origin", "http://localhost:9999")
	req.Header.Set("Access-Control-Request-Method", http.MethodPost)

	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
	}
}

func signedToken(t *testing.T, secret, role string) string {
	t.Helper()
	claims := &Claims{
		UserID: "usr_123",
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
