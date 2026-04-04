package ws

import (
	"log"
	stdhttp "net/http"
	"strings"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *stdhttp.Request) bool {
		// In production, implement stricter origin checking
		return true
	},
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

// authenticateWebSocket extracts and validates the Bearer token from the request
func authenticateWebSocket(r *stdhttp.Request) (string, error) {
	// Try to get token from Authorization header first
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		const bearerPrefix = "Bearer "
		if strings.HasPrefix(authHeader, bearerPrefix) {
			token := strings.TrimPrefix(authHeader, bearerPrefix)
			userID, err := validateToken(token)
			if err == nil && userID != "" {
				return userID, nil
			}
		}
	}

	// Try to get token from query parameter as fallback
	token := r.URL.Query().Get("token")
	if token != "" {
		userID, err := validateToken(token)
		if err == nil && userID != "" {
			return userID, nil
		}
	}

	return "", stdhttp.ErrMissingFile
}

// validateToken validates a Bearer token and returns the user ID
// In a real implementation, this would validate against your auth service
func validateToken(token string) (string, error) {
	// TODO: Implement actual token validation against your auth service
	// For now, extract a simple user ID from the token format
	// Format: "user_{userId}" or similar

	if token == "" {
		return "", stdhttp.ErrMissingFile
	}

	// Placeholder: In production, call your auth service to validate the token
	// and extract the user ID. For now, we use the token as the user ID.
	// This should be replaced with proper token validation.

	return token, nil
}
