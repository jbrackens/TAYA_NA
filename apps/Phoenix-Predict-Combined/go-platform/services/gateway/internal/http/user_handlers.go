package http

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	stdhttp "net/http"
	"os"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

// profileKYCProvider supplies the real KYC status for the user profile.
// Set in RegisterRoutes alongside the compliance wiring. When nil or on
// error the profile reports "unverified" — it must never claim "verified"
// without the compliance service confirming it (UAT D-8: the profile used
// to hardcode "verified", masking real state and breaking the JIT surface).
var profileKYCProvider compliance.KYCService

type userProfileResponse struct {
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	KYCStatus string `json:"kyc_status"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type authSessionResponse struct {
	Authenticated bool   `json:"authenticated"`
	UserID        string `json:"userId"`
	Username      string `json:"username"`
	ExpiresAt     string `json:"expiresAt"`
}

func registerUserRoutes(mux *stdhttp.ServeMux) {
	authURL := os.Getenv("AUTH_SERVICE_URL")
	if authURL == "" {
		authURL = "http://localhost:18081"
	}

	// POST /api/v1/punters/delete — player-initiated account deletion
	mux.Handle("/api/v1/punters/delete", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		// Self-service deletion: the subject is the authenticated session user,
		// never a client-supplied user_id (which would let any authenticated user
		// schedule deletion for any account — SECURITY-REVIEW #13, IDOR).
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}
		deletionDate := time.Now().AddDate(0, 0, 30).UTC().Format(time.RFC3339)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{
			"user_id":                 userID,
			"status":                  "pending_deletion",
			"scheduled_deletion_date": deletionDate,
		})
	}))

	// GET|PUT /api/v1/users/{userId}/profile
	// GET: returns profile derived from auth session
	// PUT: updates stored profile fields
	mux.Handle("/api/v1/users/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		// CORS allowlist + OPTIONS short-circuit are handled by httpx.CORS in
		// the outer middleware chain. The handler must NOT set ACAO/ACAC
		// here — doing so would overwrite the allowlist check and let any
		// origin read profile responses with credentials attached.

		// Parse: /api/v1/users/{userId}/profile[/preferences]
		trimmed := strings.TrimPrefix(r.URL.Path, "/api/v1/users/")
		trimmed = strings.TrimSuffix(trimmed, "/")
		pathParts := strings.Split(trimmed, "/")
		if len(pathParts) < 2 || pathParts[0] == "" {
			return httpx.NotFound("route not found")
		}
		requestedUserID := pathParts[0]
		subRoute := strings.Join(pathParts[1:], "/")

		// Handle PUT for profile updates and preferences
		if r.Method == stdhttp.MethodPut {
			var body map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid JSON payload", nil)
			}
			// NOTE: profile updates are not yet persisted. The prior in-memory
			// store (removed, P3-06) was write-only — the GET path derives the
			// profile from the auth session and never read it back, so it held
			// nothing across requests/instances. Echo the accepted fields;
			// durable per-user profile storage is a DB-backed follow-up.
			return httpx.WriteJSON(w, stdhttp.StatusOK, userProfileUpdatePayload(body))
		}

		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPut)
		}

		if subRoute != "profile" {
			return httpx.NotFound("route not found")
		}

		// Forward the Authorization header to the auth service session endpoint
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			// Also check cookies for HttpOnly access_token
			if cookie, cookieErr := r.Cookie("access_token"); cookieErr == nil && cookie.Value != "" {
				authHeader = "Bearer " + cookie.Value
			} else {
				return httpx.Unauthorized("missing Authorization header")
			}
		}

		sessionURL := fmt.Sprintf("%s/api/v1/auth/session", authURL)
		req, err := stdhttp.NewRequestWithContext(r.Context(), stdhttp.MethodGet, sessionURL, nil)
		if err != nil {
			return httpx.Internal("failed to create session request", err)
		}
		req.Header.Set("Authorization", authHeader)

		client := &stdhttp.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			slog.Error("user profile: auth service unreachable", "error", err)
			return httpx.Internal("auth service unreachable", err)
		}
		defer func() { _ = resp.Body.Close() }()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return httpx.Internal("failed to read auth response", err)
		}

		if resp.StatusCode != stdhttp.StatusOK {
			return httpx.Unauthorized("invalid or expired session")
		}

		var session authSessionResponse
		if err := json.Unmarshal(body, &session); err != nil {
			return httpx.Internal("failed to parse auth session", err)
		}

		if !session.Authenticated || session.UserID != requestedUserID {
			return httpx.Forbidden("not authorized to view this profile")
		}

		// The username in the auth service is the email address (e.g. demo@phoenix.local)
		// Derive a display username from the email prefix
		email := session.Username
		displayUsername := email
		if atIdx := strings.Index(email, "@"); atIdx > 0 {
			displayUsername = email[:atIdx]
		}

		// Real KYC status from the compliance service — never hardcode
		// "verified" (UAT D-8). Fail safe to "unverified" so the profile
		// can't claim a verification the compliance service hasn't made.
		kycStatus := "unverified"
		if profileKYCProvider != nil {
			kctx, kcancel := context.WithTimeout(r.Context(), 3*time.Second)
			st, kerr := profileKYCProvider.GetVerificationStatus(kctx, session.UserID)
			kcancel()
			if kerr != nil {
				slog.Warn("user profile: KYC status lookup failed; reporting unverified", "user_id", session.UserID, "error", kerr)
			} else if st != nil && st.Status != "" {
				kycStatus = st.Status
			}
		}

		now := time.Now().UTC().Format(time.RFC3339)
		profile := userProfileResponse{
			UserID:    session.UserID,
			Username:  displayUsername,
			Email:     email,
			KYCStatus: kycStatus,
			CreatedAt: now,
			UpdatedAt: now,
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, userProfilePayload(profile))
	}))
}

func userProfilePayload(profile userProfileResponse) userProfileResponse {
	profile.Username = redactLaunchProhibitedUserText(profile.Username)
	return profile
}

func userProfileUpdatePayload(body map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(body))
	for key, value := range body {
		out[key] = redactProfileUpdateValue(value)
	}
	return out
}

func redactProfileUpdateValue(value interface{}) interface{} {
	switch typed := value.(type) {
	case string:
		return redactLaunchProhibitedUserText(typed)
	case []interface{}:
		out := make([]interface{}, len(typed))
		for i, item := range typed {
			out[i] = redactProfileUpdateValue(item)
		}
		return out
	case map[string]interface{}:
		out := make(map[string]interface{}, len(typed))
		for key, item := range typed {
			out[key] = redactProfileUpdateValue(item)
		}
		return out
	default:
		return value
	}
}
