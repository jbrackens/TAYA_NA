package ws

import (
	"encoding/json"
	"io"
	"log"
	stdhttp "net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

var allowedOrigins []string

func init() {
	raw := strings.TrimSpace(os.Getenv("WS_ALLOWED_ORIGINS"))
	if raw != "" {
		for _, origin := range strings.Split(raw, ",") {
			origin = strings.TrimSpace(origin)
			if origin != "" {
				allowedOrigins = append(allowedOrigins, origin)
			}
		}
	}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *stdhttp.Request) bool {
		if len(allowedOrigins) == 0 {
			// Dev mode: allow all origins when no origins configured
			return true
		}
		origin := r.Header.Get("Origin")
		for _, allowed := range allowedOrigins {
			if strings.EqualFold(origin, allowed) {
				return true
			}
		}
		log.Printf("ws connection rejected: origin=%s not in allowed list", origin)
		return false
	},
}

// authServiceURL is the URL of the auth service for token validation
var authServiceURL string

func init() {
	authServiceURL = os.Getenv("AUTH_SERVICE_URL")
	if authServiceURL == "" {
		authServiceURL = "http://localhost:18081"
	}
}

// NewHandler creates an HTTP handler function for WebSocket connections
func NewHandler(hub *Hub) stdhttp.HandlerFunc {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		if r.Method != stdhttp.MethodGet {
			stdhttp.Error(w, "Method not allowed", stdhttp.StatusMethodNotAllowed)
			return
		}

		// Extract and validate the Bearer token
		userID, err := authenticateWebSocket(r)
		if err != nil {
			stdhttp.Error(w, "Unauthorized", stdhttp.StatusUnauthorized)
			return
		}

		// Upgrade the HTTP connection to WebSocket
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("ws upgrade error: %v", err)
			return
		}

		// Create a new client and start it
		client := NewClientFromWS(hub, conn, userID)
		client.Start()

		log.Printf("ws client connected user_id=%s", userID)
	}
}

// authenticateWebSocket extracts and validates the token from the request.
// Priority: access_token cookie > Authorization header > query param (deprecated).
func authenticateWebSocket(r *stdhttp.Request) (string, error) {
	var token string

	// 1. Try access_token cookie first (preferred — no token in URL)
	if cookie, err := r.Cookie("access_token"); err == nil && cookie.Value != "" {
		token = cookie.Value
	}

	// 2. Try Authorization header
	if token == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	// 3. Fallback: query param (deprecated — logs warning)
	if token == "" {
		token = r.URL.Query().Get("token")
		if token != "" {
			log.Printf("ws auth: token passed via query param (deprecated, use cookie or header)")
		}
	}

	if token == "" {
		return "", stdhttp.ErrMissingFile
	}

	return validateTokenAgainstAuthService(token)
}

// authSessionResponse mirrors the auth service session response
type authSessionResponse struct {
	Authenticated bool   `json:"authenticated"`
	UserID        string `json:"userId"`
	Username      string `json:"username"`
	Role          string `json:"role"`
}

// validateTokenAgainstAuthService calls the auth service to validate the token
// and extract the user identity.
func validateTokenAgainstAuthService(token string) (string, error) {
	sessionURL := strings.TrimRight(authServiceURL, "/") + "/api/v1/auth/session"
	req, err := stdhttp.NewRequest(stdhttp.MethodGet, sessionURL, nil)
	if err != nil {
		return "", err
	}
	req.AddCookie(&stdhttp.Cookie{Name: "access_token", Value: token})
	req.Header.Set("Authorization", "Bearer "+token)

	client := &stdhttp.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("ws auth: auth service unavailable: %v", err)
		return "", err
	}
	defer func() { _, _ = io.Copy(io.Discard, resp.Body); resp.Body.Close() }()

	if resp.StatusCode != stdhttp.StatusOK {
		return "", stdhttp.ErrMissingFile
	}

	var session authSessionResponse
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil || !session.Authenticated {
		return "", stdhttp.ErrMissingFile
	}

	if session.UserID == "" {
		return "", stdhttp.ErrMissingFile
	}

	return session.UserID, nil
}
