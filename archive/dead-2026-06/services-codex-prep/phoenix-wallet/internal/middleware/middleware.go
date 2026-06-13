package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"log/slog"

	"github.com/phoenixbot/phoenix-wallet/internal/models"
)

type contextKey string

const authClaimsKey contextKey = "auth_claims"

func LoggingMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(wrapped, r)
			logger.Info("request completed", slog.String("method", r.Method), slog.String("path", r.URL.Path), slog.Int("status", wrapped.statusCode), slog.Duration("duration", time.Since(start)))
		})
	}
}

func AuthMiddleware(secret, issuer, audience string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				_ = WriteError(w, http.StatusUnauthorized, "missing or invalid authorization header")
				return
			}
			claims := jwt.MapClaims{}
			token, err := jwt.ParseWithClaims(parts[1], claims, func(token *jwt.Token) (any, error) { return []byte(secret), nil })
			if err != nil || !token.Valid {
				_ = WriteError(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}
			if issuer != "" && claims["iss"] != issuer {
				_ = WriteError(w, http.StatusUnauthorized, "token issuer mismatch")
				return
			}
			if audience != "" && !hasAudience(claims["aud"], audience) {
				_ = WriteError(w, http.StatusUnauthorized, "token audience mismatch")
				return
			}
			ctx := context.WithValue(r.Context(), authClaimsKey, models.AuthClaims{UserID: stringValue(claims["user_id"]), Role: stringValue(claims["role"])})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetAuthClaims(r *http.Request) models.AuthClaims {
	claims, ok := r.Context().Value(authClaimsKey).(models.AuthClaims)
	if !ok {
		return models.AuthClaims{}
	}
	return claims
}

func RequireRoles(allowed ...string) func(http.Handler) http.Handler {
	allowedSet := make(map[string]struct{}, len(allowed))
	for _, role := range allowed {
		if normalized := normalizeRole(role); normalized != "" {
			allowedSet[normalized] = struct{}{}
		}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetAuthClaims(r)
			if claims.UserID == "" {
				_ = WriteError(w, http.StatusUnauthorized, "authentication required")
				return
			}
			if _, ok := allowedSet[normalizeRole(claims.Role)]; !ok {
				_ = WriteError(w, http.StatusForbidden, "forbidden")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func WriteJSON(w http.ResponseWriter, statusCode int, data any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	return json.NewEncoder(w).Encode(data)
}

func WriteError(w http.ResponseWriter, statusCode int, message string) error {
	return WriteJSON(w, statusCode, map[string]any{"error": map[string]any{"message": message, "status": statusCode}})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

func (rw *responseWriter) WriteHeader(code int) {
	if rw.written {
		return
	}
	rw.statusCode = code
	rw.written = true
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(body []byte) (int, error) {
	if !rw.written {
		rw.WriteHeader(http.StatusOK)
	}
	return rw.ResponseWriter.Write(body)
}

func hasAudience(value any, expected string) bool {
	switch typed := value.(type) {
	case string:
		return typed == expected
	case []any:
		for _, item := range typed {
			if s, ok := item.(string); ok && s == expected {
				return true
			}
		}
	}
	return false
}

func stringValue(value any) string {
	if typed, ok := value.(string); ok {
		return typed
	}
	return ""
}

func normalizeRole(role string) string {
	normalized := strings.TrimSpace(strings.ToLower(role))
	normalized = strings.ReplaceAll(normalized, "_", "-")
	normalized = strings.Join(strings.Fields(normalized), "-")
	return normalized
}
