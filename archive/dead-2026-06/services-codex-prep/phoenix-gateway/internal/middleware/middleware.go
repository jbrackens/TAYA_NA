package middleware

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/phoenixbot/phoenix-gateway/internal/models"
)

type ctxKey string

const (
	claimsContextKey ctxKey = "claims"
)

type Claims struct {
	UserID   string   `json:"user_id,omitempty"`
	Email    string   `json:"email,omitempty"`
	Username string   `json:"username,omitempty"`
	Role     string   `json:"role,omitempty"`
	Scopes   []string `json:"scopes,omitempty"`
	jwt.RegisteredClaims
}

var (
	errMissingAuthorizationHeader = errors.New("missing authorization header")
	errInvalidAuthorizationHeader = errors.New("invalid authorization header format")
	errInvalidToken               = errors.New("invalid or expired token")
	errTokenIssuerMismatch        = errors.New("token issuer mismatch")
	errTokenAudienceMismatch      = errors.New("token audience mismatch")
)

var defaultCORSAllowedHeaders = []string{
	"Authorization",
	"Content-Type",
	"Accept",
	"X-Requested-With",
	"X-Request-ID",
	"X-Correlation-ID",
}

var defaultCORSAllowedMethods = []string{
	http.MethodGet,
	http.MethodHead,
	http.MethodPost,
	http.MethodPut,
	http.MethodPatch,
	http.MethodDelete,
	http.MethodOptions,
}

var defaultCORSExposedHeaders = []string{
	"X-Request-ID",
	"X-Correlation-ID",
	"X-Gateway-Service",
	"Retry-After",
}

type MetricsRecorder interface {
	RequestStarted()
	RequestCompleted(status int, duration time.Duration)
}

type rateLimitChecker interface {
	EnforceRateLimit(ctx context.Context, policyName, identifier string) (models.RateLimitDecision, error)
}

func RequestContext() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := strings.TrimSpace(r.Header.Get("X-Request-ID"))
			if requestID == "" {
				requestID = strings.ReplaceAll(time.Now().UTC().Format("20060102150405.000000000"), ".", "")
			}
			correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
			if correlationID == "" {
				correlationID = requestID
			}
			w.Header().Set("X-Request-ID", requestID)
			w.Header().Set("X-Correlation-ID", correlationID)
			next.ServeHTTP(w, r)
		})
	}
}

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowedOriginsSet := make(map[string]struct{}, len(allowedOrigins))
	allowAnyOrigin := false
	for _, origin := range allowedOrigins {
		trimmed := strings.TrimSpace(origin)
		if trimmed == "" {
			continue
		}
		if trimmed == "*" {
			allowAnyOrigin = true
			continue
		}
		allowedOriginsSet[trimmed] = struct{}{}
	}

	allowHeaders := strings.Join(defaultCORSAllowedHeaders, ", ")
	allowMethods := strings.Join(defaultCORSAllowedMethods, ", ")
	exposeHeaders := strings.Join(defaultCORSExposedHeaders, ", ")

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := strings.TrimSpace(r.Header.Get("Origin"))
			if origin == "" {
				next.ServeHTTP(w, r)
				return
			}

			_, allowed := allowedOriginsSet[origin]
			if !allowAnyOrigin && !allowed {
				if r.Method == http.MethodOptions && strings.TrimSpace(r.Header.Get("Access-Control-Request-Method")) != "" {
					http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
					return
				}
				next.ServeHTTP(w, r)
				return
			}

			w.Header().Add("Vary", "Origin")
			w.Header().Add("Vary", "Access-Control-Request-Method")
			w.Header().Add("Vary", "Access-Control-Request-Headers")
			if allowAnyOrigin {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}
			w.Header().Set("Access-Control-Allow-Headers", allowHeaders)
			w.Header().Set("Access-Control-Allow-Methods", allowMethods)
			w.Header().Set("Access-Control-Expose-Headers", exposeHeaders)

			if r.Method == http.MethodOptions && strings.TrimSpace(r.Header.Get("Access-Control-Request-Method")) != "" {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func LoggingMiddleware(logger *slog.Logger, metrics MetricsRecorder) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			if metrics != nil {
				metrics.RequestStarted()
			}
			wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(wrapped, r)
			duration := time.Since(start)
			if metrics != nil {
				metrics.RequestCompleted(wrapped.statusCode, duration)
			}
			logger.Info("request completed",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", wrapped.statusCode),
				slog.Duration("duration", duration),
				slog.String("request_id", w.Header().Get("X-Request-ID")),
				slog.String("correlation_id", w.Header().Get("X-Correlation-ID")),
			)
		})
	}
}

func Recoverer(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recovered := recover(); recovered != nil {
					logger.Error("panic recovered", slog.Any("panic", recovered), slog.String("path", r.URL.Path))
					_ = WriteError(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "an unexpected error occurred", nil)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

func JWTAuth(logger *slog.Logger, secret, issuer, audience string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := ParseToken(secret, issuer, audience, r.Header.Get("Authorization"))
			if err != nil {
				switch {
				case errors.Is(err, errMissingAuthorizationHeader):
					_ = WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing authorization header", nil)
				case errors.Is(err, errInvalidAuthorizationHeader):
					_ = WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid authorization header format", nil)
				case errors.Is(err, errTokenIssuerMismatch), errors.Is(err, errTokenAudienceMismatch):
					_ = WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", err.Error(), nil)
				default:
					logger.Warn("jwt validation failed", slog.Any("error", err))
					_ = WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid or expired token", nil)
				}
				return
			}
			ctx := context.WithValue(r.Context(), claimsContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func ParseToken(secret, issuer, audience, headerOrToken string) (*Claims, error) {
	tokenValue, err := normalizeToken(headerOrToken)
	if err != nil {
		return nil, err
	}
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenValue, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, errInvalidToken
	}
	if issuer != "" && claims.Issuer != "" && claims.Issuer != issuer {
		return nil, errTokenIssuerMismatch
	}
	if audience != "" && len(claims.Audience) > 0 && !containsAudience(claims.Audience, audience) {
		return nil, errTokenAudienceMismatch
	}
	return claims, nil
}

func normalizeToken(headerOrToken string) (string, error) {
	authHeader := strings.TrimSpace(headerOrToken)
	if authHeader == "" {
		return "", errMissingAuthorizationHeader
	}
	if strings.Contains(authHeader, " ") {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return "", errInvalidAuthorizationHeader
		}
		if strings.TrimSpace(parts[1]) == "" {
			return "", errInvalidAuthorizationHeader
		}
		return strings.TrimSpace(parts[1]), nil
	}
	return authHeader, nil
}

func RequireRoles(roles ...string) func(http.Handler) http.Handler {
	allowed := map[string]struct{}{}
	for _, role := range roles {
		allowed[strings.ToLower(role)] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r)
			if claims == nil {
				_ = WriteError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required", nil)
				return
			}
			if _, ok := allowed[strings.ToLower(claims.Role)]; !ok {
				_ = WriteError(w, http.StatusForbidden, "FORBIDDEN", "insufficient permissions", map[string]any{"required_roles": roles})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func FixedRateLimit(logger *slog.Logger, checker rateLimitChecker, policyName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			identifier := ClientIP(r)
			if claims := GetClaims(r); claims != nil && claims.UserID != "" {
				identifier = claims.UserID
			}
			decision, err := checker.EnforceRateLimit(r.Context(), policyName, identifier)
			if err != nil {
				logger.Warn("rate limit check failed", slog.String("policy", policyName), slog.Any("error", err))
				next.ServeHTTP(w, r)
				return
			}
			if !decision.Allowed {
				if decision.RetryAfter > 0 {
					w.Header().Set("Retry-After", formatRetryAfter(decision.RetryAfter))
				}
				_ = WriteError(w, http.StatusTooManyRequests, "RATE_LIMITED", "rate limit exceeded", map[string]any{"policy": policyName})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func formatRetryAfter(seconds int64) string {
	if seconds < 1 {
		seconds = 1
	}
	return strconv.FormatInt(seconds, 10)
}

func containsAudience(audiences []string, audience string) bool {
	for _, candidate := range audiences {
		if candidate == audience {
			return true
		}
	}
	return false
}

func GetClaims(r *http.Request) *Claims {
	claims, _ := r.Context().Value(claimsContextKey).(*Claims)
	return claims
}

func ClientIP(r *http.Request) string {
	if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	if xri := strings.TrimSpace(r.Header.Get("X-Real-IP")); xri != "" {
		return xri
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

func (rw *responseWriter) WriteHeader(code int) {
	if !rw.written {
		rw.statusCode = code
		rw.written = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

func (rw *responseWriter) Write(body []byte) (int, error) {
	if !rw.written {
		rw.WriteHeader(http.StatusOK)
	}
	return rw.ResponseWriter.Write(body)
}

func (rw *responseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if h, ok := rw.ResponseWriter.(http.Hijacker); ok {
		return h.Hijack()
	}
	return nil, nil, errors.New("underlying response writer does not support hijacking")
}

func WriteJSON(w http.ResponseWriter, status int, payload any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(payload)
}

func WriteError(w http.ResponseWriter, status int, code, message string, details map[string]any) error {
	payload := map[string]any{
		"error": map[string]any{
			"code":       code,
			"message":    message,
			"details":    details,
			"request_id": w.Header().Get("X-Request-ID"),
			"timestamp":  time.Now().UTC().Format(time.RFC3339),
		},
	}
	return WriteJSON(w, status, payload)
}
