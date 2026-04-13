package http

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	stdhttp "net/http"
	"os"
	"strings"
	"sync"
	"time"

	"phoenix-revival/platform/transport/httpx"
)

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

	// In-memory profile store for updates (production would use DB)
	profileStore := &sync.Map{}

	// POST /api/v1/punters/delete — player-initiated account deletion
	mux.Handle("/api/v1/punters/delete", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		var body struct {
			UserID string `json:"user_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.UserID == "" {
			return httpx.BadRequest("user_id is required", nil)
		}
		deletionDate := time.Now().AddDate(0, 0, 30).UTC().Format(time.RFC3339)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{
			"user_id":                 body.UserID,
			"status":                  "pending_deletion",
			"scheduled_deletion_date": deletionDate,
		})
	}))

	// GET|PUT /api/v1/users/{userId}/profile
	// GET: returns profile derived from auth session
	// PUT: updates stored profile fields
	mux.Handle("/api/v1/users/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method == stdhttp.MethodOptions {
			w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
			w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.WriteHeader(stdhttp.StatusNoContent)
			return nil
		}

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
			storeKey := requestedUserID + ":" + subRoute
			profileStore.Store(storeKey, body)
			w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			return httpx.WriteJSON(w, stdhttp.StatusOK, body)
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
			log.Printf("user profile: auth service unreachable: %v", err)
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

		now := time.Now().UTC().Format(time.RFC3339)
		profile := userProfileResponse{
			UserID:    session.UserID,
			Username:  displayUsername,
			Email:     email,
			KYCStatus: "verified",
			CreatedAt: now,
			UpdatedAt: now,
		}

		w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		return httpx.WriteJSON(w, stdhttp.StatusOK, profile)
	}))
}
