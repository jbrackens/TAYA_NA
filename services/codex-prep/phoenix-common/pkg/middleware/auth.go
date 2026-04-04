package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
)

// contextKey is a type for storing values in request context.
type contextKey string

const (
	// contextKeyUserClaims is the key for storing JWT claims in context.
	contextKeyUserClaims contextKey = "user_claims"
	// BearerScheme is the authentication scheme used in the Authorization header.
	BearerScheme = "Bearer"
)

// CustomClaims represents the custom claims in a JWT token.
type CustomClaims struct {
	UserID   string   `json:"user_id"`
	Email    string   `json:"email"`
	Username string   `json:"username"`
	Role     string   `json:"role"`
	Scopes   []string `json:"scopes"`
	jwt.RegisteredClaims
}

// JWTAuth returns a middleware that validates JWT tokens from the Authorization header.
// It expects tokens in the format: "Authorization: Bearer <token>"
// Valid tokens are stored in the request context for retrieval by handlers.
func JWTAuth(secretKey string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "missing authorization header", http.StatusUnauthorized)
				return
			}

			// Extract the token from "Bearer <token>"
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != BearerScheme {
				http.Error(w, "invalid authorization header format", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]

			// Parse and validate the token
			claims := &CustomClaims{}
			token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
				// Verify the signing method
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(secretKey), nil
			})

			if err != nil || !token.Valid {
				http.Error(w, "invalid or expired token", http.StatusUnauthorized)
				return
			}

			// Store the claims in the request context
			ctx := context.WithValue(r.Context(), contextKeyUserClaims, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserFromContext extracts the JWT claims from the request context.
// Returns nil if no claims are found in the context.
func GetUserFromContext(r *http.Request) *CustomClaims {
	claims, ok := r.Context().Value(contextKeyUserClaims).(*CustomClaims)
	if !ok {
		return nil
	}
	return claims
}

// RequireRole returns a middleware that checks if the user has one of the specified roles.
// It must be used after JWTAuth middleware.
func RequireRole(allowedRoles ...string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetUserFromContext(r)
			if claims == nil {
				http.Error(w, "no user claims in context", http.StatusUnauthorized)
				return
			}

			// Check if the user's role is in the allowed roles
			hasRole := false
			for _, role := range allowedRoles {
				if claims.Role == role {
					hasRole = true
					break
				}
			}

			if !hasRole {
				http.Error(w, "insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireScope returns a middleware that checks if the user has one of the specified scopes.
// It must be used after JWTAuth middleware.
func RequireScope(allowedScopes ...string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetUserFromContext(r)
			if claims == nil {
				http.Error(w, "no user claims in context", http.StatusUnauthorized)
				return
			}

			// Check if the user has any of the allowed scopes
			hasScope := false
			for _, allowedScope := range allowedScopes {
				for _, userScope := range claims.Scopes {
					if userScope == allowedScope {
						hasScope = true
						break
					}
				}
				if hasScope {
					break
				}
			}

			if !hasScope {
				http.Error(w, "insufficient scopes", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// ChainMiddleware chains multiple middleware functions together.
// It applies them in reverse order so they execute in the order they were passed.
func ChainMiddleware(next http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		next = middlewares[i](next)
	}
	return next
}

// RegisterAuthRoutes is a helper to apply authentication middleware to chi routes.
// It wraps a route group with JWT authentication.
func RegisterAuthRoutes(router chi.Router, middleware ...func(http.Handler) http.Handler) {
	for _, m := range middleware {
		router.Use(m)
	}
}
