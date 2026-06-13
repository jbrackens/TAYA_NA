package middleware

import (
	"net/http"
	"strings"
)

// CORSConfig holds configuration for CORS middleware.
type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	ExposedHeaders   []string
	AllowCredentials bool
	MaxAge           int
}

// DefaultCORSConfig returns sensible CORS defaults.
func DefaultCORSConfig() *CORSConfig {
	return &CORSConfig{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization", "X-Request-ID"},
		ExposedHeaders: []string{"X-Request-ID", "Content-Length"},
		MaxAge:         3600,
	}
}

// CORS returns a middleware that handles Cross-Origin Resource Sharing (CORS).
// It sets appropriate CORS headers based on the provided configuration.
func CORS(config *CORSConfig) func(next http.Handler) http.Handler {
	if config == nil {
		config = DefaultCORSConfig()
	}

	// Pre-compute header strings
	allowedMethods := strings.Join(config.AllowedMethods, ", ")
	allowedHeaders := strings.Join(config.AllowedHeaders, ", ")
	exposedHeaders := strings.Join(config.ExposedHeaders, ", ")
	credentialsValue := "false"
	if config.AllowCredentials {
		credentialsValue = "true"
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Check if the origin is allowed
			isAllowed := false
			for _, allowedOrigin := range config.AllowedOrigins {
				if allowedOrigin == "*" || allowedOrigin == origin {
					isAllowed = true
					break
				}
			}

			if isAllowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", allowedMethods)
				w.Header().Set("Access-Control-Allow-Headers", allowedHeaders)
				w.Header().Set("Access-Control-Expose-Headers", exposedHeaders)
				w.Header().Set("Access-Control-Allow-Credentials", credentialsValue)
				w.Header().Set("Access-Control-Max-Age", string(rune(config.MaxAge)))
			}

			// Handle preflight requests
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// CORSWithOrigins creates a CORS middleware allowing specific origins.
func CORSWithOrigins(origins ...string) func(next http.Handler) http.Handler {
	config := DefaultCORSConfig()
	config.AllowedOrigins = origins
	return CORS(config)
}
