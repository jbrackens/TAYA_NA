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

	// Circuit breaker thresholds for auth service
	cbFailureThreshold = 5               // open circuit after 5 consecutive failures
	cbResetTimeout     = 15 * time.Second // try again after 15s
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

// ── Auth Circuit Breaker ──────────────────────────────────────────

// authCircuitBreaker prevents cascading failures when the auth service is down.
// After cbFailureThreshold consecutive failures, the circuit opens and fast-fails
// for cbResetTimeout. After that window, one request is allowed through (half-open).
type authCircuitBreaker struct {
	mu               sync.Mutex
	consecutiveFails int
	lastFailure      time.Time
	state            string // "closed", "open", "half-open"
}

func (cb *authCircuitBreaker) allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	switch cb.state {
	case "open":
		if time.Since(cb.lastFailure) > cbResetTimeout {
			cb.state = "half-open"
			return true
		}
		return false
	case "half-open":
		return false // only one request at a time in half-open
	default: // closed
		return true
	}
}

func (cb *authCircuitBreaker) recordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.consecutiveFails = 0
	cb.state = "closed"
}

func (cb *authCircuitBreaker) recordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.consecutiveFails++
	cb.lastFailure = time.Now()
	if cb.consecutiveFails >= cbFailureThreshold {
		cb.state = "open"
	}
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
// Includes a circuit breaker: after 5 consecutive auth service failures, requests
// fast-fail for 15 seconds instead of waiting for the 5s timeout each time.
func Auth(authServiceURL string, publicPrefixes []string) Middleware {
	cache := &sync.Map{}
	cb := &authCircuitBreaker{state: "closed"}

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

			// Circuit breaker: fast-fail if auth service is known to be down
			if !cb.allow() {
				WriteError(w, r, &AppError{
					Status:  http.StatusServiceUnavailable,
					Code:    "auth_unavailable",
					Message: "auth service temporarily unavailable",
				})
				return
			}

			// Validate against auth service
			sessionURL := strings.TrimRight(authServiceURL, "/") + "/api/v1/auth/session"
			req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, sessionURL, nil)
			if err != nil {
				cb.recordFailure()
				WriteError(w, r, Internal("failed to create auth validation request", err))
				return
			}
			req.AddCookie(&http.Cookie{Name: cookieAccessToken, Value: token})
			req.Header.Set("Authorization", "Bearer "+token)
			// Propagate request ID for cross-service tracing
			if reqID := RequestIDFromContext(r.Context()); reqID != "" {
				req.Header.Set(headerRequestID, reqID)
			}

			client := &http.Client{Timeout: 5 * time.Second}
			resp, err := client.Do(req)
			if err != nil {
				cb.recordFailure()
				WriteError(w, r, Internal("auth service unavailable", err))
				return
			}
			defer func() { _, _ = io.Copy(io.Discard, resp.Body); resp.Body.Close() }()

			if resp.StatusCode >= 500 {
				cb.recordFailure()
				WriteError(w, r, Internal("auth service error", nil))
				return
			}

			if resp.StatusCode != http.StatusOK {
				cb.recordSuccess() // auth service responded, circuit is fine
				WriteError(w, r, Unauthorized("invalid or expired access token"))
				return
			}

			var session authSessionResponse
			if err := json.NewDecoder(resp.Body).Decode(&session); err != nil || !session.Authenticated {
				cb.recordSuccess()
				WriteError(w, r, Unauthorized("invalid session"))
				return
			}

			cb.recordSuccess()

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

// SecurityHeaders adds standard security headers to all responses.
func SecurityHeaders() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			w.Header().Set("X-XSS-Protection", "0") // Modern browsers: use CSP instead
			w.Header().Set("Content-Security-Policy", "default-src 'self'")
			// HSTS only if Secure cookies are enabled (production)
			if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
				w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
			}
			next.ServeHTTP(w, r)
		})
	}
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

			traceID := recorder.Header().Get("X-Trace-Id")
			if traceID != "" {
				l.Printf(
					"request_id=%s trace_id=%s method=%s path=%s status=%d duration_ms=%d bytes=%d",
					RequestIDFromContext(r.Context()),
					traceID,
					r.Method,
					r.URL.Path,
					recorder.statusCode,
					time.Since(started).Milliseconds(),
					recorder.bytes,
				)
			} else {
				l.Printf(
					"request_id=%s method=%s path=%s status=%d duration_ms=%d bytes=%d",
					RequestIDFromContext(r.Context()),
					r.Method,
					r.URL.Path,
					recorder.statusCode,
					time.Since(started).Milliseconds(),
					recorder.bytes,
				)
			}
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
