package httpx

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

type Middleware func(http.Handler) http.Handler

type contextKey string

const (
	headerRequestID      = "X-Request-Id"
	headerCSRFToken      = "X-CSRF-Token"
	cookieCSRFToken      = "csrf_token"
	cookieAccessToken    = "access_token"
	requestIDContextKey  = contextKey("request_id")
	userIDContextKey     = contextKey("auth_user_id")
	usernameContextKey   = contextKey("auth_username")
	roleContextKey       = contextKey("auth_role")
	defaultLoggerPrefix  = "[httpx]"
	generatedRequestSize = 16
	authCacheTTL         = 30 * time.Second
	authCacheMaxSize     = 10000
)

func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
	chained := handler
	for i := len(middlewares) - 1; i >= 0; i-- {
		chained = middlewares[i](chained)
	}
	return chained
}

func RequestID() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := r.Header.Get(headerRequestID)
			if requestID == "" {
				requestID = generateRequestID()
			}

			w.Header().Set(headerRequestID, requestID)
			ctx := context.WithValue(r.Context(), requestIDContextKey, requestID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequestIDFromContext(ctx context.Context) string {
	value := ctx.Value(requestIDContextKey)
	if value == nil {
		return ""
	}

	requestID, _ := value.(string)
	return requestID
}

// ── Auth Context Helpers ───────────────────────────────────────────

func UserIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(userIDContextKey).(string)
	return v
}

func UsernameFromContext(ctx context.Context) string {
	v, _ := ctx.Value(usernameContextKey).(string)
	return v
}

func RoleFromContext(ctx context.Context) string {
	v, _ := ctx.Value(roleContextKey).(string)
	return v
}

// ── Auth Middleware ────────────────────────────────────────────────

type authCacheEntry struct {
	userID   string
	username string
	role     string
	expires  time.Time
}

type authSessionResponse struct {
	Authenticated bool   `json:"authenticated"`
	UserID        string `json:"userId"`
	Username      string `json:"username"`
	Role          string `json:"role"`
}

// Auth validates the access_token cookie or Authorization header against the
// auth service and injects UserID, Username, and Role into the request context.
// Paths matching any publicPrefix are passed through without authentication.
func Auth(authServiceURL string, publicPrefixes []string) Middleware {
	cache := &sync.Map{}

	// Background cache cleanup every 60 seconds
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now()
			cache.Range(func(key, value any) bool {
				if entry, ok := value.(authCacheEntry); ok && now.After(entry.expires) {
					cache.Delete(key)
				}
				return true
			})
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check if path is public
			path := r.URL.Path
			for _, prefix := range publicPrefixes {
				if strings.HasPrefix(path, prefix) || path == prefix {
					next.ServeHTTP(w, r)
					return
				}
			}

			// Extract access token from cookie or Authorization header
			token := ""
			if cookie, err := r.Cookie(cookieAccessToken); err == nil && cookie.Value != "" {
				token = cookie.Value
			} else {
				authHeader := r.Header.Get("Authorization")
				if strings.HasPrefix(authHeader, "Bearer ") {
					token = strings.TrimPrefix(authHeader, "Bearer ")
				}
			}

			if token == "" {
				WriteError(w, r, Unauthorized("authentication required"))
				return
			}

			// Check cache first
			if cached, ok := cache.Load(token); ok {
				entry := cached.(authCacheEntry)
				if time.Now().Before(entry.expires) {
					ctx := r.Context()
					ctx = context.WithValue(ctx, userIDContextKey, entry.userID)
					ctx = context.WithValue(ctx, usernameContextKey, entry.username)
					ctx = context.WithValue(ctx, roleContextKey, entry.role)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
				cache.Delete(token)
			}

			// Validate against auth service
			sessionURL := strings.TrimRight(authServiceURL, "/") + "/api/v1/auth/session"
			req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, sessionURL, nil)
			if err != nil {
				WriteError(w, r, Internal("failed to create auth validation request", err))
				return
			}
			req.AddCookie(&http.Cookie{Name: cookieAccessToken, Value: token})
			req.Header.Set("Authorization", "Bearer "+token)

			client := &http.Client{Timeout: 5 * time.Second}
			resp, err := client.Do(req)
			if err != nil {
				WriteError(w, r, Internal("auth service unavailable", err))
				return
			}
			defer func() { _, _ = io.Copy(io.Discard, resp.Body); resp.Body.Close() }()

			if resp.StatusCode != http.StatusOK {
				WriteError(w, r, Unauthorized("invalid or expired access token"))
				return
			}

			var session authSessionResponse
			if err := json.NewDecoder(resp.Body).Decode(&session); err != nil || !session.Authenticated {
				WriteError(w, r, Unauthorized("invalid session"))
				return
			}

			// Cache the validated session
			cache.Store(token, authCacheEntry{
				userID:   session.UserID,
				username: session.Username,
				role:     session.Role,
				expires:  time.Now().Add(authCacheTTL),
			})

			// Inject auth context
			ctx := r.Context()
			ctx = context.WithValue(ctx, userIDContextKey, session.UserID)
			ctx = context.WithValue(ctx, usernameContextKey, session.Username)
			ctx = context.WithValue(ctx, roleContextKey, session.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ── CSRF Middleware ────────────────────────────────────────────────

// CSRF validates the double-submit cookie pattern on state-changing requests.
// Safe methods (GET, HEAD, OPTIONS) are passed through without CSRF validation.
func CSRF(skipPrefixes []string) Middleware {
	safeMethods := map[string]bool{
		http.MethodGet:     true,
		http.MethodHead:    true,
		http.MethodOptions: true,
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Safe methods don't need CSRF
			if safeMethods[r.Method] {
				next.ServeHTTP(w, r)
				return
			}

			// Skip CSRF for configured prefixes (e.g., auth endpoints)
			path := r.URL.Path
			for _, prefix := range skipPrefixes {
				if strings.HasPrefix(path, prefix) {
					next.ServeHTTP(w, r)
					return
				}
			}

			// Verify CSRF double-submit cookie pattern
			cookie, err := r.Cookie(cookieCSRFToken)
			if err != nil || cookie.Value == "" {
				WriteError(w, r, Forbidden("missing CSRF token cookie"))
				return
			}
			header := r.Header.Get(headerCSRFToken)
			if header == "" {
				WriteError(w, r, Forbidden("missing CSRF token header"))
				return
			}
			if !constantTimeEqual(cookie.Value, header) {
				WriteError(w, r, Forbidden("CSRF token mismatch"))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func constantTimeEqual(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	result := byte(0)
	for i := 0; i < len(a); i++ {
		result |= a[i] ^ b[i]
	}
	return result == 0
}

// ── Admin Role Helper ─────────────────────────────────────────────

// RequireRole returns an error if the authenticated user does not have the
// specified role. Call from within httpx.Handle() handlers.
func RequireRole(r *http.Request, role string) error {
	actual := RoleFromContext(r.Context())
	if actual != role {
		return Forbidden(fmt.Sprintf("%s role required", role))
	}
	return nil
}

func Recovery(logger *log.Logger) Middleware {
	l := withFallbackLogger(logger)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recovered := recover(); recovered != nil {
					l.Printf("panic recovered request_id=%s method=%s path=%s panic=%v",
						RequestIDFromContext(r.Context()),
						r.Method,
						r.URL.Path,
						recovered,
					)
					WriteError(w, r, Internal("internal server error", fmt.Errorf("%v", recovered)))
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}

func AccessLog(logger *log.Logger) Middleware {
	l := withFallbackLogger(logger)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			started := time.Now()
			recorder := newStatusRecorder(w)

			next.ServeHTTP(recorder, r)

			l.Printf(
				"request_id=%s method=%s path=%s status=%d duration_ms=%d bytes=%d",
				RequestIDFromContext(r.Context()),
				r.Method,
				r.URL.Path,
				recorder.statusCode,
				time.Since(started).Milliseconds(),
				recorder.bytes,
			)
		})
	}
}

func generateRequestID() string {
	randomBytes := make([]byte, generatedRequestSize)
	if _, err := rand.Read(randomBytes); err != nil {
		return fmt.Sprintf("fallback-%d", time.Now().UnixNano())
	}

	return hex.EncodeToString(randomBytes)
}

func withFallbackLogger(logger *log.Logger) *log.Logger {
	if logger != nil {
		return logger
	}
	return log.Default()
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
	bytes      int
}

func newStatusRecorder(w http.ResponseWriter) *statusRecorder {
	return &statusRecorder{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
	}
}

func (r *statusRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func (r *statusRecorder) Write(data []byte) (int, error) {
	written, err := r.ResponseWriter.Write(data)
	r.bytes += written
	return written, err
}
