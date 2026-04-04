package middleware

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/phoenixbot/phoenix-notification/internal/models"
)

type ctxKey string

const claimsContextKey ctxKey = "claims"

type Claims struct {
	UserID string `json:"user_id,omitempty"`
	Role   string `json:"role,omitempty"`
	jwt.RegisteredClaims
}

func LoggingMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(wrapped, r)
			logger.Info("request completed",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", wrapped.statusCode),
				slog.Duration("duration", time.Since(start)),
			)
		})
	}
}

func AuthMiddleware(secret, issuer, audience string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
			if authHeader == "" {
				writeError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				writeError(w, http.StatusUnauthorized, "invalid authorization header format")
				return
			}
			claims := &Claims{}
			token, err := jwt.ParseWithClaims(parts[1], claims, func(token *jwt.Token) (interface{}, error) {
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				writeError(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}
			if issuer != "" && claims.Issuer != "" && claims.Issuer != issuer {
				writeError(w, http.StatusUnauthorized, "token issuer mismatch")
				return
			}
			if audience != "" && len(claims.Audience) > 0 {
				matched := false
				for _, candidate := range claims.Audience {
					if candidate == audience {
						matched = true
						break
					}
				}
				if !matched {
					writeError(w, http.StatusUnauthorized, "token audience mismatch")
					return
				}
			}
			ctx := context.WithValue(r.Context(), claimsContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetClaims(r *http.Request) *models.AuthClaims {
	claims, _ := r.Context().Value(claimsContextKey).(*Claims)
	if claims == nil {
		return nil
	}
	return &models.AuthClaims{UserID: claims.UserID, Role: claims.Role}
}

func WriteJSON(w http.ResponseWriter, status int, payload any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(payload)
}

func WriteError(w http.ResponseWriter, status int, message string) error {
	return WriteJSON(w, status, map[string]any{"error": map[string]any{"message": message}})
}

func writeError(w http.ResponseWriter, status int, message string) {
	_ = WriteError(w, status, message)
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *responseWriter) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}
