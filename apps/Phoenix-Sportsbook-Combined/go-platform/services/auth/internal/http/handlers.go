package http

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	stdhttp "net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
	"phoenix-revival/platform/transport/httpx"
)

const (
	defaultAccessTokenTTL  = 15 * time.Minute
	defaultRefreshTokenTTL = 24 * time.Hour
	tokenSize              = 24
	csrfTokenSize          = 32
	csrfCookieName         = "csrf_token"
	csrfHeaderName         = "X-CSRF-Token"
)

type AuthService struct {
	mu sync.RWMutex

	usersByUsername map[string]user
	db             *sql.DB // nil = in-memory mode
	store          SessionStore
	audit          AuditLogger
	metrics        authMetrics

	accessTTL  time.Duration
	refreshTTL time.Duration

	loginLimiter    *rateLimiter
	registerLimiter *rateLimiter
	lockout         *lockoutTracker
}

type registerRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role,omitempty"`
}

const (
	bcryptCost    = 12
	userDBTimeout = 5 * time.Second
	rolePlayer    = "player"
	roleAdmin     = "admin"
)

type user struct {
	ID           string
	Username     string
	Password     string // plaintext (dev mode only, deprecated)
	PasswordHash string // bcrypt hash (production mode)
	Role         string // "player" or "admin"
}

type session struct {
	UserID             string    `json:"userId"`
	Username           string    `json:"username"`
	Role               string    `json:"role"`
	AccessTokenDigest  string    `json:"accessTokenDigest"`
	RefreshTokenDigest string    `json:"refreshTokenDigest"`
	AccessUntil        time.Time `json:"accessUntil"`
	RefreshUntil       time.Time `json:"refreshUntil"`
	IssuedAt           time.Time `json:"issuedAt"`
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type tokenResponse struct {
	TokenType       string `json:"tokenType"`
	AccessToken     string `json:"accessToken"`
	RefreshToken    string `json:"refreshToken"`
	ExpiresInSecond int64  `json:"expiresInSeconds"`
}

type sessionResponse struct {
	Authenticated bool   `json:"authenticated"`
	UserID        string `json:"userId"`
	Username      string `json:"username"`
	Role          string `json:"role"`
	ExpiresAt     string `json:"expiresAt"`
}

type metricsResponse struct {
	LoginSuccess   int64 `json:"loginSuccess"`
	LoginFailure   int64 `json:"loginFailure"`
	RefreshSuccess int64 `json:"refreshSuccess"`
	RefreshFailure int64 `json:"refreshFailure"`
	SessionSuccess int64 `json:"sessionSuccess"`
	SessionFailure int64 `json:"sessionFailure"`
}

type authMetrics struct {
	loginSuccess   int64
	loginFailure   int64
	refreshSuccess int64
	refreshFailure int64
	sessionSuccess int64
	sessionFailure int64
}

type AuditLogger interface {
	Event(name string, fields map[string]any)
}

type structuredAuditLogger struct {
	logger *log.Logger
}

func NewAuthService() *AuthService {
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))

	demoUsername := os.Getenv("AUTH_DEMO_USERNAME")
	demoPassword := os.Getenv("AUTH_DEMO_PASSWORD")
	demoUserID := getEnvOrDefault("AUTH_DEMO_USER_ID", "u-1")
	adminUsername := os.Getenv("AUTH_ADMIN_USERNAME")
	adminPassword := os.Getenv("AUTH_ADMIN_PASSWORD")
	adminUserID := getEnvOrDefault("AUTH_ADMIN_USER_ID", "user-admin")

	// In production/staging, seed credentials MUST come from environment.
	// In development, provide defaults so the platform works out-of-the-box.
	if env == "production" || env == "staging" {
		if demoUsername == "" || demoPassword == "" || adminUsername == "" || adminPassword == "" {
			log.Fatalf("FATAL: AUTH_DEMO_USERNAME, AUTH_DEMO_PASSWORD, AUTH_ADMIN_USERNAME, and AUTH_ADMIN_PASSWORD must be set in %s", env)
		}
	} else {
		if demoUsername == "" {
			demoUsername = "demo@phoenix.local"
		}
		if demoPassword == "" {
			demoPassword = "demo123"
		}
		if adminUsername == "" {
			adminUsername = "admin@phoenix.local"
		}
		if adminPassword == "" {
			adminPassword = "admin123"
		}
	}
	sessionStorePath := os.Getenv("AUTH_SESSION_STORE_FILE")

	// Hash seed passwords with bcrypt for consistency
	demoHash, _ := bcrypt.GenerateFromPassword([]byte(demoPassword), bcryptCost)
	adminHash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcryptCost)

	users := map[string]user{
		demoUsername: {
			ID:           demoUserID,
			Username:     demoUsername,
			Password:     demoPassword,
			PasswordHash: string(demoHash),
			Role:         rolePlayer,
		},
	}
	if _, exists := users[adminUsername]; !exists {
		users[adminUsername] = user{
			ID:           adminUserID,
			Username:     adminUsername,
			Password:     adminPassword,
			PasswordHash: string(adminHash),
			Role:         roleAdmin,
		}
	}

	svc := &AuthService{
		usersByUsername:  users,
		store:           NewFileBackedSessionStore(sessionStorePath),
		audit:           &structuredAuditLogger{logger: log.Default()},
		accessTTL:       durationFromEnvSeconds("AUTH_ACCESS_TTL_SECONDS", defaultAccessTokenTTL),
		refreshTTL:      durationFromEnvSeconds("AUTH_REFRESH_TTL_SECONDS", defaultRefreshTokenTTL),
		loginLimiter:    newRateLimiter(),
		registerLimiter: newRateLimiter(),
		lockout:         newLockoutTracker(),
	}

	// Optionally initialize DB-backed user store
	storeMode := strings.ToLower(strings.TrimSpace(os.Getenv("AUTH_STORE_MODE")))
	if storeMode == "db" || storeMode == "postgres" {
		dsn := strings.TrimSpace(os.Getenv("AUTH_DB_DSN"))
		if dsn != "" {
			db, err := sql.Open("postgres", dsn)
			if err != nil {
				log.Printf("warning: failed to open auth DB: %v; falling back to in-memory", err)
			} else {
				ctx, cancel := context.WithTimeout(context.Background(), userDBTimeout)
				defer cancel()
				if err := db.PingContext(ctx); err != nil {
					log.Printf("warning: auth DB ping failed: %v; falling back to in-memory", err)
					_ = db.Close()
				} else if err := svc.ensureUserSchema(db); err != nil {
					log.Printf("warning: auth DB schema init failed: %v; falling back to in-memory", err)
					_ = db.Close()
				} else {
					svc.db = db
					svc.seedDBUsers(demoUsername, demoPassword, demoUserID, rolePlayer)
					svc.seedDBUsers(adminUsername, adminPassword, adminUserID, roleAdmin)
					log.Printf("auth service initialized in DB mode")
				}
			}
		} else {
			log.Printf("warning: AUTH_STORE_MODE=%s but AUTH_DB_DSN is empty; using in-memory", storeMode)
		}
	}

	return svc
}

func (a *AuthService) ensureUserSchema(db *sql.DB) error {
	ctx, cancel := context.WithTimeout(context.Background(), userDBTimeout)
	defer cancel()
	_, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS auth_users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'player',
  oauth_provider VARCHAR(50),
  oauth_subject VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`)
	return err
}

func (a *AuthService) seedDBUsers(username, password, id, role string) {
	if a.db == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), userDBTimeout)
	defer cancel()

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		log.Printf("warning: failed to hash seed password for %s: %v", username, err)
		return
	}
	_, _ = a.db.ExecContext(ctx, `
INSERT INTO auth_users (id, username, password_hash, role)
VALUES ($1, $2, $3, $4)
ON CONFLICT (username) DO NOTHING`, id, username, string(hash), role)
}

func RegisterRoutes(mux *stdhttp.ServeMux, service string, auth *AuthService) {
	mux.Handle("/healthz", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		w.WriteHeader(stdhttp.StatusOK)
		_, _ = w.Write([]byte("ok"))
		return nil
	}))

	mux.Handle("/readyz", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{
			"service": service,
			"status":  "ready",
		})
	}))

	mux.Handle("/api/v1/status", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{
			"service": service,
			"status":  "up",
		})
	}))

	mux.Handle("/api/v1/auth/login", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		auth.PruneExpiredSessions()

		var body loginRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}
		if body.Username == "" || body.Password == "" {
			return httpx.BadRequest("username and password are required", nil)
		}

		response, err := auth.Login(body.Username, body.Password)
		if err != nil {
			return err
		}

		// Set HttpOnly cookies for secure token transport
		secure := os.Getenv("AUTH_COOKIE_SECURE") != "false"
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name:     "access_token",
			Value:    response.AccessToken,
			Path:     "/",
			HttpOnly: true,
			Secure:   secure,
			SameSite: stdhttp.SameSiteLaxMode,
			MaxAge:   int(auth.accessTTL.Seconds()),
		})
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name:     "refresh_token",
			Value:    response.RefreshToken,
			Path:     "/api/v1/auth/refresh",
			HttpOnly: true,
			Secure:   secure,
			SameSite: stdhttp.SameSiteLaxMode,
			MaxAge:   int(auth.refreshTTL.Seconds()),
		})
		setCSRFCookie(w, secure, int(auth.accessTTL.Seconds()))

		return httpx.WriteJSON(w, stdhttp.StatusOK, response)
	}))

	mux.Handle("/api/v1/auth/register", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		// Rate limit: 3 registrations per minute per IP
		remoteIP := extractIP(r)
		if !auth.registerLimiter.allow("register:"+remoteIP, 3, time.Minute) {
			return httpx.TooManyRequests("too many registration attempts, try again later")
		}

		var body registerRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		newUser, err := auth.Register(body.Username, body.Password, body.Role)
		if err != nil {
			return err
		}

		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
			"userId":   newUser.ID,
			"username": newUser.Username,
			"role":     newUser.Role,
		})
	}))

	mux.Handle("/api/v1/auth/refresh", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		auth.PruneExpiredSessions()

		// Read refresh token from HttpOnly cookie first, fall back to request body
		var refreshToken string
		if cookie, err := r.Cookie("refresh_token"); err == nil && cookie.Value != "" {
			refreshToken = cookie.Value
		} else {
			var body refreshRequest
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			refreshToken = body.RefreshToken
		}
		if refreshToken == "" {
			return httpx.BadRequest("refresh token is required", nil)
		}

		response, err := auth.Refresh(refreshToken)
		if err != nil {
			return err
		}

		// Set new HttpOnly cookies
		secure := os.Getenv("AUTH_COOKIE_SECURE") != "false"
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name:     "access_token",
			Value:    response.AccessToken,
			Path:     "/",
			HttpOnly: true,
			Secure:   secure,
			SameSite: stdhttp.SameSiteLaxMode,
			MaxAge:   int(auth.accessTTL.Seconds()),
		})
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name:     "refresh_token",
			Value:    response.RefreshToken,
			Path:     "/api/v1/auth/refresh",
			HttpOnly: true,
			Secure:   secure,
			SameSite: stdhttp.SameSiteLaxMode,
			MaxAge:   int(auth.refreshTTL.Seconds()),
		})
		setCSRFCookie(w, secure, int(auth.accessTTL.Seconds()))

		return httpx.WriteJSON(w, stdhttp.StatusOK, response)
	}))

	mux.Handle("/api/v1/auth/session", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		auth.PruneExpiredSessions()

		// Read access token from HttpOnly cookie first, fall back to Authorization header
		var token string
		if cookie, err := r.Cookie("access_token"); err == nil && cookie.Value != "" {
			token = cookie.Value
		} else {
			var parseErr error
			token, parseErr = parseBearerToken(r.Header.Get("Authorization"))
			if parseErr != nil {
				return parseErr
			}
		}

		currentSession, err := auth.ValidateAccessToken(token)
		if err != nil {
			return err
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, sessionResponse{
			Authenticated: true,
			UserID:        currentSession.UserID,
			Username:      currentSession.Username,
			Role:          currentSession.Role,
			ExpiresAt:     currentSession.AccessUntil.UTC().Format(time.RFC3339),
		})
	}))

	mux.Handle("/api/v1/auth/logout", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		// Verify CSRF token on state-changing request.
		// Skip CSRF check if no CSRF cookie exists (e.g., client clearing
		// cookies during a failed login before a CSRF token was ever issued).
		if _, cookieErr := r.Cookie(csrfCookieName); cookieErr == nil {
			if err := verifyCSRF(r); err != nil {
				return err
			}
		}

		// Clear auth cookies
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name:     "access_token",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			MaxAge:   -1,
		})
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name:     "refresh_token",
			Value:    "",
			Path:     "/api/v1/auth/refresh",
			HttpOnly: true,
			MaxAge:   -1,
		})
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name:   csrfCookieName,
			Value:  "",
			Path:   "/",
			MaxAge: -1,
		})

		// Invalidate session: try cookie first, then Authorization header
		var tokenToInvalidate string
		if cookie, err := r.Cookie("access_token"); err == nil && cookie.Value != "" {
			tokenToInvalidate = cookie.Value
		}
		if tokenToInvalidate == "" {
			if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
				tokenToInvalidate = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}
		if tokenToInvalidate != "" {
			_ = auth.store.DeleteByAccessToken(digestToken(tokenToInvalidate))
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "logged_out"})
	}))

	// ─── Sessions Management ────────────────────────────────────
	mux.Handle("/api/v1/auth/sessions/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		// DELETE /api/v1/auth/sessions/{sessionId} — revoke a specific session
		if r.Method != stdhttp.MethodDelete {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodDelete)
		}

		sessionID := strings.TrimPrefix(r.URL.Path, "/api/v1/auth/sessions/")
		sessionID = strings.TrimSuffix(sessionID, "/")
		if sessionID == "" {
			return httpx.BadRequest("session ID required", nil)
		}

		if err := auth.store.DeleteBySessionID(sessionID); err != nil {
			return httpx.Internal("failed to revoke session", err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{"message": "session revoked"})
	}))

	mux.Handle("/api/v1/auth/sessions", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		// GET /api/v1/auth/sessions — list active sessions for the authenticated user
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		auth.PruneExpiredSessions()

		// Authenticate: read access token from cookie or header
		var token string
		if cookie, err := r.Cookie("access_token"); err == nil && cookie.Value != "" {
			token = cookie.Value
		} else {
			var parseErr error
			token, parseErr = parseBearerToken(r.Header.Get("Authorization"))
			if parseErr != nil {
				return parseErr
			}
		}

		currentSession, err := auth.ValidateAccessToken(token)
		if err != nil {
			return err
		}

		sessions, err := auth.store.ListByUserID(currentSession.UserID)
		if err != nil {
			return httpx.Internal("failed to list sessions", err)
		}

		type sessionEntry struct {
			ID         string `json:"id"`
			Device     string `json:"device"`
			Location   string `json:"location"`
			LastActive string `json:"last_active"`
			Current    bool   `json:"current"`
		}

		result := make([]sessionEntry, 0, len(sessions))
		for _, s := range sessions {
			isCurrent := s.AccessTokenDigest == currentSession.AccessTokenDigest
			result = append(result, sessionEntry{
				ID:         s.AccessTokenDigest,
				Device:     r.Header.Get("User-Agent"),
				Location:   r.RemoteAddr,
				LastActive: s.IssuedAt.UTC().Format(time.RFC3339),
				Current:    isCurrent,
			})
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, result)
	}))

	mux.Handle("/api/v1/auth/metrics", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, auth.MetricsSnapshot())
	}))

	// ─── OAuth Routes ────────────────────────────────────────────
	frontendURL := getEnvOrDefault("AUTH_FRONTEND_URL", "http://localhost:3000")

	// Google OAuth
	googleClientID := os.Getenv("GOOGLE_OAUTH_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")
	googleRedirectURI := getEnvOrDefault("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:18081/api/v1/auth/oauth/google/callback")

	mux.Handle("/api/v1/auth/oauth/google/start", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if googleClientID == "" {
			return httpx.BadRequest("Google OAuth is not configured (set GOOGLE_OAUTH_CLIENT_ID)", nil)
		}
		state, err := makeCSRFToken()
		if err != nil {
			return httpx.Internal("failed to generate OAuth state", err)
		}
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name:     "oauth_state",
			Value:    state,
			Path:     "/",
			HttpOnly: true,
			SameSite: stdhttp.SameSiteLaxMode,
			MaxAge:   300,
		})
		authURL := fmt.Sprintf(
			"https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=openid+email+profile&state=%s",
			googleClientID, googleRedirectURI, state,
		)
		stdhttp.Redirect(w, r, authURL, stdhttp.StatusTemporaryRedirect)
		return nil
	}))

	mux.Handle("/api/v1/auth/oauth/google/callback", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		code := r.URL.Query().Get("code")
		state := r.URL.Query().Get("state")
		if code == "" || state == "" {
			return httpx.BadRequest("missing code or state parameter", nil)
		}
		// Verify state matches cookie
		stateCookie, err := r.Cookie("oauth_state")
		if err != nil || stateCookie.Value != state {
			return httpx.Forbidden("OAuth state mismatch")
		}
		// Clear state cookie
		stdhttp.SetCookie(w, &stdhttp.Cookie{Name: "oauth_state", Value: "", Path: "/", MaxAge: -1})

		// Exchange code for Google tokens
		tokenResp, err := exchangeGoogleCode(code, googleClientID, googleClientSecret, googleRedirectURI)
		if err != nil {
			log.Printf("Google OAuth token exchange failed: %v", err)
			return httpx.Internal("Google OAuth token exchange failed", err)
		}

		// Get user info from Google
		userInfo, err := getGoogleUserInfo(tokenResp.AccessToken)
		if err != nil {
			return httpx.Internal("failed to get Google user info", err)
		}

		// Find or create user by email
		email := userInfo.Email
		account, exists := auth.lookupUser(email)
		if !exists {
			// Auto-create user from Google login
			auth.mu.Lock()
			newID := fmt.Sprintf("u-google-%s", hex.EncodeToString([]byte(email))[:12])
			auth.usersByUsername[email] = user{
				ID:       newID,
				Username: email,
				Password: "", // No password for OAuth users
			}
			account = auth.usersByUsername[email]
			auth.mu.Unlock()
			auth.audit.Event("auth.oauth.google.user_created", map[string]any{"email": email, "userId": newID})
		}

		// Create session (same as login)
		s, response, err := newSession(account, auth.accessTTL, auth.refreshTTL)
		if err != nil {
			return httpx.Internal("failed to create session", err)
		}
		if err := auth.store.Put(s); err != nil {
			return httpx.Internal("failed to persist session", err)
		}

		// Set auth cookies
		secure := os.Getenv("AUTH_COOKIE_SECURE") != "false"
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name: "access_token", Value: response.AccessToken,
			Path: "/", HttpOnly: true, Secure: secure, SameSite: stdhttp.SameSiteLaxMode,
			MaxAge: int(auth.accessTTL.Seconds()),
		})
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name: "refresh_token", Value: response.RefreshToken,
			Path: "/api/v1/auth/refresh", HttpOnly: true, Secure: secure, SameSite: stdhttp.SameSiteLaxMode,
			MaxAge: int(auth.refreshTTL.Seconds()),
		})
		setCSRFCookie(w, secure, int(auth.accessTTL.Seconds()))

		auth.audit.Event("auth.oauth.google.login", map[string]any{"email": email, "userId": account.ID})

		// Redirect back to frontend
		stdhttp.Redirect(w, r, frontendURL+"/", stdhttp.StatusTemporaryRedirect)
		return nil
	}))

	// Apple OAuth
	appleClientID := os.Getenv("APPLE_OAUTH_CLIENT_ID")
	appleRedirectURI := getEnvOrDefault("APPLE_OAUTH_REDIRECT_URI", "http://localhost:18081/api/v1/auth/oauth/apple/callback")

	mux.Handle("/api/v1/auth/oauth/apple/start", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if appleClientID == "" {
			return httpx.BadRequest("Apple OAuth is not configured (set APPLE_OAUTH_CLIENT_ID)", nil)
		}
		state, err := makeCSRFToken()
		if err != nil {
			return httpx.Internal("failed to generate OAuth state", err)
		}
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name:     "oauth_state",
			Value:    state,
			Path:     "/",
			HttpOnly: true,
			SameSite: stdhttp.SameSiteLaxMode,
			MaxAge:   300,
		})
		authURL := fmt.Sprintf(
			"https://appleid.apple.com/auth/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=name+email&response_mode=form_post&state=%s",
			appleClientID, appleRedirectURI, state,
		)
		stdhttp.Redirect(w, r, authURL, stdhttp.StatusTemporaryRedirect)
		return nil
	}))

	mux.Handle("/api/v1/auth/oauth/apple/callback", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		// Apple sends callback as POST with form data
		if err := r.ParseForm(); err != nil {
			return httpx.BadRequest("invalid form data", nil)
		}
		code := r.FormValue("code")
		state := r.FormValue("state")
		if code == "" || state == "" {
			return httpx.BadRequest("missing code or state", nil)
		}
		stateCookie, err := r.Cookie("oauth_state")
		if err != nil || stateCookie.Value != state {
			return httpx.Forbidden("OAuth state mismatch")
		}
		stdhttp.SetCookie(w, &stdhttp.Cookie{Name: "oauth_state", Value: "", Path: "/", MaxAge: -1})

		// Apple user info comes in the initial POST as JSON in the "user" form field
		email := r.FormValue("email")
		if email == "" {
			// For returning users, Apple doesn't send email again — use a placeholder
			email = fmt.Sprintf("apple-%s@oauth.local", state[:8])
		}

		account, exists := auth.lookupUser(email)
		if !exists {
			auth.mu.Lock()
			newID := fmt.Sprintf("u-apple-%s", hex.EncodeToString([]byte(email))[:12])
			auth.usersByUsername[email] = user{
				ID:       newID,
				Username: email,
				Password: "",
			}
			account = auth.usersByUsername[email]
			auth.mu.Unlock()
			auth.audit.Event("auth.oauth.apple.user_created", map[string]any{"email": email, "userId": newID})
		}

		s, response, err := newSession(account, auth.accessTTL, auth.refreshTTL)
		if err != nil {
			return httpx.Internal("failed to create session", err)
		}
		if err := auth.store.Put(s); err != nil {
			return httpx.Internal("failed to persist session", err)
		}

		secure := os.Getenv("AUTH_COOKIE_SECURE") != "false"
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name: "access_token", Value: response.AccessToken,
			Path: "/", HttpOnly: true, Secure: secure, SameSite: stdhttp.SameSiteLaxMode,
			MaxAge: int(auth.accessTTL.Seconds()),
		})
		stdhttp.SetCookie(w, &stdhttp.Cookie{
			Name: "refresh_token", Value: response.RefreshToken,
			Path: "/api/v1/auth/refresh", HttpOnly: true, Secure: secure, SameSite: stdhttp.SameSiteLaxMode,
			MaxAge: int(auth.refreshTTL.Seconds()),
		})
		setCSRFCookie(w, secure, int(auth.accessTTL.Seconds()))

		auth.audit.Event("auth.oauth.apple.login", map[string]any{"email": email, "userId": account.ID})
		stdhttp.Redirect(w, r, frontendURL+"/", stdhttp.StatusTemporaryRedirect)
		return nil
	}))
}

func (a *AuthService) Login(username string, password string) (tokenResponse, error) {
	a.PruneExpiredSessions()

	// Rate limit: 10 login attempts per minute per username
	if !a.loginLimiter.allow("login:"+username, 10, time.Minute) {
		a.audit.Event("auth.login.rate_limited", map[string]any{"username": username})
		return tokenResponse{}, httpx.TooManyRequests("too many login attempts, try again later")
	}

	// Account lockout check
	if a.lockout.isLocked(username) {
		a.audit.Event("auth.login.locked_out", map[string]any{"username": username})
		return tokenResponse{}, httpx.TooManyRequests("account temporarily locked due to repeated failures")
	}

	account, exists := a.lookupUser(username)
	if !exists || !a.verifyPassword(account, password) {
		a.lockout.recordFailure(username)
		a.recordAuthMetric("login_failure")
		a.audit.Event("auth.login.failed", map[string]any{"username": username, "reason": "invalid_credentials"})
		return tokenResponse{}, httpx.Unauthorized("invalid username or password")
	}

	// Successful login clears lockout state
	a.lockout.clearFailures(username)

	s, response, err := newSession(account, a.accessTTL, a.refreshTTL)
	if err != nil {
		a.recordAuthMetric("login_failure")
		a.audit.Event("auth.login.failed", map[string]any{"username": username, "reason": "token_generation_failed"})
		return tokenResponse{}, httpx.Internal("failed to initialize session", err)
	}
	if err := a.store.Put(s); err != nil {
		a.recordAuthMetric("login_failure")
		a.audit.Event("auth.login.failed", map[string]any{"username": username, "reason": "session_store_failed"})
		return tokenResponse{}, httpx.Internal("failed to persist session", err)
	}

	a.recordAuthMetric("login_success")
	a.audit.Event("auth.login.success", map[string]any{"username": username, "userId": account.ID})

	return response, nil
}

func (a *AuthService) verifyPassword(account user, password string) bool {
	// Prefer bcrypt hash if available
	if account.PasswordHash != "" {
		return bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(password)) == nil
	}
	// Fallback to plaintext for legacy dev-mode accounts (deprecated)
	return account.Password != "" && account.Password == password
}

func (a *AuthService) Register(username, password, _ string) (user, error) {
	username = strings.TrimSpace(username)
	password = strings.TrimSpace(password)
	if username == "" {
		return user{}, httpx.BadRequest("username is required", nil)
	}
	if err := validatePasswordStrength(password); err != nil {
		return user{}, err
	}
	// Registration always creates player accounts. Admin accounts must be
	// created through a separate protected admin endpoint or seeded via env.
	role := rolePlayer

	// Check if user already exists
	if _, exists := a.lookupUser(username); exists {
		return user{}, httpx.Conflict("username already registered", nil)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return user{}, httpx.Internal("failed to hash password", err)
	}

	newID := fmt.Sprintf("u-%s", hex.EncodeToString([]byte(username))[:12])
	newUser := user{
		ID:           newID,
		Username:     username,
		PasswordHash: string(hash),
		Role:         role,
	}

	if a.db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), userDBTimeout)
		defer cancel()
		_, err := a.db.ExecContext(ctx, `
INSERT INTO auth_users (id, username, password_hash, role)
VALUES ($1, $2, $3, $4)`, newUser.ID, newUser.Username, newUser.PasswordHash, newUser.Role)
		if err != nil {
			if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
				return user{}, httpx.Conflict("username already registered", nil)
			}
			return user{}, httpx.Internal("failed to create user", err)
		}
	}

	// Also store in memory map for session lookups
	a.mu.Lock()
	a.usersByUsername[username] = newUser
	a.mu.Unlock()

	a.audit.Event("auth.register.success", map[string]any{"username": username, "userId": newID, "role": role})
	return newUser, nil
}

func (a *AuthService) Refresh(refreshToken string) (tokenResponse, error) {
	a.PruneExpiredSessions()

	existing, found, err := a.store.GetByRefreshToken(refreshToken)
	if err != nil {
		a.recordAuthMetric("refresh_failure")
		a.audit.Event("auth.refresh.failed", map[string]any{"reason": "session_store_read_failed"})
		return tokenResponse{}, httpx.Internal("failed to read refresh token", err)
	}
	if !found || existing.RefreshUntil.Before(time.Now().UTC()) {
		_ = a.store.DeleteByRefreshToken(refreshToken)
		a.recordAuthMetric("refresh_failure")
		a.audit.Event("auth.refresh.failed", map[string]any{"reason": "invalid_or_expired_refresh"})
		return tokenResponse{}, httpx.Unauthorized("refresh token is invalid or expired")
	}

	account, exists := a.lookupUser(existing.Username)
	if !exists {
		a.recordAuthMetric("refresh_failure")
		a.audit.Event("auth.refresh.failed", map[string]any{"username": existing.Username, "reason": "user_not_found"})
		return tokenResponse{}, httpx.Internal("session user not found", nil)
	}

	if err := a.store.DeleteByRefreshToken(refreshToken); err != nil {
		a.recordAuthMetric("refresh_failure")
		a.audit.Event("auth.refresh.failed", map[string]any{"username": existing.Username, "reason": "session_store_delete_failed"})
		return tokenResponse{}, httpx.Internal("failed to rotate session", err)
	}

	s, response, err := newSession(account, a.accessTTL, a.refreshTTL)
	if err != nil {
		a.recordAuthMetric("refresh_failure")
		a.audit.Event("auth.refresh.failed", map[string]any{"username": existing.Username, "reason": "token_generation_failed"})
		return tokenResponse{}, httpx.Internal("failed to refresh session", err)
	}
	if err := a.store.Put(s); err != nil {
		a.recordAuthMetric("refresh_failure")
		a.audit.Event("auth.refresh.failed", map[string]any{"username": existing.Username, "reason": "session_store_failed"})
		return tokenResponse{}, httpx.Internal("failed to persist refreshed session", err)
	}

	a.recordAuthMetric("refresh_success")
	a.audit.Event("auth.refresh.success", map[string]any{"username": existing.Username, "userId": existing.UserID})

	return response, nil
}

func (a *AuthService) ValidateAccessToken(accessToken string) (session, error) {
	a.PruneExpiredSessions()

	s, found, err := a.store.GetByAccessToken(accessToken)
	if err != nil {
		a.recordAuthMetric("session_failure")
		a.audit.Event("auth.session.failed", map[string]any{"reason": "session_store_read_failed"})
		return session{}, httpx.Internal("failed to read access token", err)
	}
	if !found || s.AccessUntil.Before(time.Now().UTC()) {
		_ = a.store.DeleteByAccessToken(accessToken)
		a.recordAuthMetric("session_failure")
		a.audit.Event("auth.session.failed", map[string]any{"reason": "invalid_or_expired_access"})
		return session{}, httpx.Unauthorized("access token is invalid or expired")
	}

	a.recordAuthMetric("session_success")
	a.audit.Event("auth.session.success", map[string]any{"username": s.Username, "userId": s.UserID})
	return s, nil
}

func (a *AuthService) PruneExpiredSessions() {
	now := time.Now().UTC()
	if err := a.store.DeleteExpired(now); err != nil {
		a.audit.Event("auth.session.prune_failed", map[string]any{"reason": err.Error()})
	}
}

func (a *AuthService) MetricsSnapshot() metricsResponse {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return metricsResponse{
		LoginSuccess:   a.metrics.loginSuccess,
		LoginFailure:   a.metrics.loginFailure,
		RefreshSuccess: a.metrics.refreshSuccess,
		RefreshFailure: a.metrics.refreshFailure,
		SessionSuccess: a.metrics.sessionSuccess,
		SessionFailure: a.metrics.sessionFailure,
	}
}

func (a *AuthService) recordAuthMetric(name string) {
	a.mu.Lock()
	defer a.mu.Unlock()

	switch name {
	case "login_success":
		a.metrics.loginSuccess++
	case "login_failure":
		a.metrics.loginFailure++
	case "refresh_success":
		a.metrics.refreshSuccess++
	case "refresh_failure":
		a.metrics.refreshFailure++
	case "session_success":
		a.metrics.sessionSuccess++
	case "session_failure":
		a.metrics.sessionFailure++
	}
}

func (a *AuthService) lookupUser(username string) (user, bool) {
	// Check DB first if available
	if a.db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), userDBTimeout)
		defer cancel()
		var u user
		err := a.db.QueryRowContext(ctx, `
SELECT id, username, password_hash, COALESCE(role, 'player')
FROM auth_users
WHERE username = $1`, username).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role)
		if err == nil {
			return u, true
		}
		if err != sql.ErrNoRows {
			log.Printf("warning: auth DB lookup failed for %s: %v; falling back to memory", username, err)
		}
	}

	// Fallback to in-memory map
	a.mu.RLock()
	defer a.mu.RUnlock()
	account, exists := a.usersByUsername[username]
	return account, exists
}

func newSession(account user, accessTTL, refreshTTL time.Duration) (session, tokenResponse, error) {
	accessToken, err := makeToken("atk")
	if err != nil {
		return session{}, tokenResponse{}, err
	}
	refreshToken, err := makeToken("rtk")
	if err != nil {
		return session{}, tokenResponse{}, err
	}

	role := account.Role
	if role == "" {
		role = rolePlayer
	}

	now := time.Now().UTC()
	return session{
			UserID:             account.ID,
			Username:           account.Username,
			Role:               role,
			AccessTokenDigest:  digestToken(accessToken),
			RefreshTokenDigest: digestToken(refreshToken),
			AccessUntil:        now.Add(accessTTL),
			RefreshUntil:       now.Add(refreshTTL),
			IssuedAt:           now,
		}, tokenResponse{
			TokenType:       "Bearer",
			AccessToken:     accessToken,
			RefreshToken:    refreshToken,
			ExpiresInSecond: int64(accessTTL.Seconds()),
		}, nil
}

func makeToken(prefix string) (string, error) {
	raw := make([]byte, tokenSize)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(raw)), nil
}

func parseBearerToken(header string) (string, error) {
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
		return "", httpx.Unauthorized("missing or invalid Authorization bearer token")
	}
	return parts[1], nil
}

func digestToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func makeCSRFToken() (string, error) {
	raw := make([]byte, csrfTokenSize)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return hex.EncodeToString(raw), nil
}

func setCSRFCookie(w stdhttp.ResponseWriter, secure bool, maxAge int) {
	token, err := makeCSRFToken()
	if err != nil {
		return
	}
	stdhttp.SetCookie(w, &stdhttp.Cookie{
		Name:     csrfCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: false, // JS must read this
		Secure:   secure,
		SameSite: stdhttp.SameSiteLaxMode,
		MaxAge:   maxAge,
	})
}

func verifyCSRF(r *stdhttp.Request) error {
	cookie, err := r.Cookie(csrfCookieName)
	if err != nil || cookie.Value == "" {
		return httpx.Forbidden("missing CSRF token cookie")
	}
	header := r.Header.Get(csrfHeaderName)
	if header == "" {
		return httpx.Forbidden("missing CSRF token header")
	}
	if !hmacEqual(cookie.Value, header) {
		return httpx.Forbidden("CSRF token mismatch")
	}
	return nil
}

func hmacEqual(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	result := byte(0)
	for i := 0; i < len(a); i++ {
		result |= a[i] ^ b[i]
	}
	return result == 0
}

func durationFromEnvSeconds(name string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds <= 0 {
		return fallback
	}
	return time.Duration(seconds) * time.Second
}

func (l *structuredAuditLogger) Event(name string, fields map[string]any) {
	if l == nil || l.logger == nil {
		return
	}
	payload, err := json.Marshal(fields)
	if err != nil {
		l.logger.Printf("event=%s fields=\"{}\"", name)
		return
	}
	l.logger.Printf("event=%s fields=%s", name, string(payload))
}

// ─── Google OAuth Helpers ─────────────────────────────────────

type googleTokenResponse struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

type googleUserInfo struct {
	Email         string `json:"email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	EmailVerified bool   `json:"email_verified"`
}

func exchangeGoogleCode(code, clientID, clientSecret, redirectURI string) (*googleTokenResponse, error) {
	data := fmt.Sprintf(
		"code=%s&client_id=%s&client_secret=%s&redirect_uri=%s&grant_type=authorization_code",
		code, clientID, clientSecret, redirectURI,
	)
	resp, err := stdhttp.Post(
		"https://oauth2.googleapis.com/token",
		"application/x-www-form-urlencoded",
		strings.NewReader(data),
	)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	var tokenResp googleTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}
	if tokenResp.AccessToken == "" {
		return nil, fmt.Errorf("empty access_token from Google")
	}
	return &tokenResp, nil
}

func getGoogleUserInfo(accessToken string) (*googleUserInfo, error) {
	req, err := stdhttp.NewRequest(stdhttp.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := (&stdhttp.Client{Timeout: 5 * time.Second}).Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	if info.Email == "" {
		return nil, fmt.Errorf("no email in Google user info")
	}
	return &info, nil
}

func extractIP(r *stdhttp.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i > 0 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	if xri := r.Header.Get("X-Real-Ip"); xri != "" {
		return xri
	}
	if i := strings.LastIndex(r.RemoteAddr, ":"); i > 0 {
		return r.RemoteAddr[:i]
	}
	return r.RemoteAddr
}

func getEnvOrDefault(name string, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

// ─── Password Strength ──────────────────────────────────────────

const minPasswordLength = 12

func validatePasswordStrength(password string) error {
	if len(password) < minPasswordLength {
		return httpx.BadRequest(fmt.Sprintf("password must be at least %d characters", minPasswordLength), nil)
	}
	var hasUpper, hasLower, hasDigit bool
	for _, ch := range password {
		switch {
		case ch >= 'A' && ch <= 'Z':
			hasUpper = true
		case ch >= 'a' && ch <= 'z':
			hasLower = true
		case ch >= '0' && ch <= '9':
			hasDigit = true
		}
	}
	classes := 0
	if hasUpper {
		classes++
	}
	if hasLower {
		classes++
	}
	if hasDigit {
		classes++
	}
	if classes < 2 {
		return httpx.BadRequest("password must contain at least two of: uppercase, lowercase, digits", nil)
	}
	return nil
}

// ─── Rate Limiting ──────────────────────────────────────────────

type rateLimiter struct {
	mu      sync.Mutex
	windows map[string][]time.Time
}

func newRateLimiter() *rateLimiter {
	rl := &rateLimiter{windows: make(map[string][]time.Time)}
	// Sweep old entries every 60s
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			rl.sweep()
		}
	}()
	return rl
}

func (rl *rateLimiter) allow(key string, limit int, window time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-window)
	// Filter to recent entries
	recent := make([]time.Time, 0, len(rl.windows[key]))
	for _, t := range rl.windows[key] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}
	if len(recent) >= limit {
		rl.windows[key] = recent
		return false
	}
	rl.windows[key] = append(recent, now)
	return true
}

func (rl *rateLimiter) sweep() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	cutoff := time.Now().Add(-5 * time.Minute)
	for key, times := range rl.windows {
		recent := make([]time.Time, 0, len(times))
		for _, t := range times {
			if t.After(cutoff) {
				recent = append(recent, t)
			}
		}
		if len(recent) == 0 {
			delete(rl.windows, key)
		} else {
			rl.windows[key] = recent
		}
	}
}

// ─── Account Lockout ────────────────────────────────────────────

const (
	maxFailedAttempts  = 5
	lockoutDuration    = 15 * time.Minute
	failedAttemptWindow = time.Minute
)

type lockoutTracker struct {
	mu       sync.Mutex
	failures map[string][]time.Time // username -> timestamps of failures
	lockouts map[string]time.Time   // username -> locked until
}

func newLockoutTracker() *lockoutTracker {
	lt := &lockoutTracker{
		failures: make(map[string][]time.Time),
		lockouts: make(map[string]time.Time),
	}
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			lt.sweep()
		}
	}()
	return lt
}

func (lt *lockoutTracker) isLocked(username string) bool {
	lt.mu.Lock()
	defer lt.mu.Unlock()
	until, ok := lt.lockouts[username]
	if !ok {
		return false
	}
	if time.Now().After(until) {
		delete(lt.lockouts, username)
		delete(lt.failures, username)
		return false
	}
	return true
}

func (lt *lockoutTracker) recordFailure(username string) {
	lt.mu.Lock()
	defer lt.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-failedAttemptWindow)
	recent := make([]time.Time, 0, len(lt.failures[username]))
	for _, t := range lt.failures[username] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}
	recent = append(recent, now)
	lt.failures[username] = recent
	if len(recent) >= maxFailedAttempts {
		lt.lockouts[username] = now.Add(lockoutDuration)
	}
}

func (lt *lockoutTracker) clearFailures(username string) {
	lt.mu.Lock()
	defer lt.mu.Unlock()
	delete(lt.failures, username)
	delete(lt.lockouts, username)
}

func (lt *lockoutTracker) sweep() {
	lt.mu.Lock()
	defer lt.mu.Unlock()
	now := time.Now()
	for u, until := range lt.lockouts {
		if now.After(until) {
			delete(lt.lockouts, u)
			delete(lt.failures, u)
		}
	}
}
