package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestAuthMiddlewareAndRequireRoles(t *testing.T) {
	secret := "wallet-secret"
	makeToken := func(role string) string {
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": "usr_123",
			"role":    role,
			"iss":     "phoenix-user",
			"aud":     "phoenix-platform",
			"exp":     time.Now().Add(time.Hour).Unix(),
		})
		signed, err := token.SignedString([]byte(secret))
		if err != nil {
			t.Fatalf("sign token: %v", err)
		}
		return signed
	}

	tests := []struct {
		name       string
		authHeader string
		statusCode int
	}{
		{name: "admin allowed", authHeader: "Bearer " + makeToken("admin"), statusCode: http.StatusOK},
		{name: "operator allowed with case normalization", authHeader: "Bearer " + makeToken("OPERATOR"), statusCode: http.StatusOK},
		{name: "hyphen role matches underscored token", authHeader: "Bearer " + makeToken("INTERNAL_SUPPORT"), statusCode: http.StatusOK},
		{name: "user forbidden", authHeader: "Bearer " + makeToken("user"), statusCode: http.StatusForbidden},
		{name: "missing auth", statusCode: http.StatusUnauthorized},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := AuthMiddleware(secret, "phoenix-user", "phoenix-platform")(
				RequireRoles("admin", "operator", "internal-support")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusOK)
				})),
			)
			req := httptest.NewRequest(http.MethodGet, "/admin/payments/transactions", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code != tt.statusCode {
				t.Fatalf("status = %d, want %d", rec.Code, tt.statusCode)
			}
		})
	}
}
