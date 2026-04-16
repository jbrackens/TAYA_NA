package prediction

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	stdhttp "net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// BotAuthMiddleware validates API key authentication for bot endpoints.
// API keys are passed via the Authorization header: "Bearer tna_<prefix>_<secret>"
type BotAuthMiddleware struct {
	repo Repository
}

// NewBotAuthMiddleware creates a new bot auth middleware.
func NewBotAuthMiddleware(repo Repository) *BotAuthMiddleware {
	return &BotAuthMiddleware{repo: repo}
}

// Wrap returns an HTTP handler that validates the API key before calling next.
// On success, it sets X-User-ID and X-Bot-Scopes headers on the request.
func (m *BotAuthMiddleware) Wrap(next stdhttp.Handler, requiredScope string) stdhttp.Handler {
	return stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer tna_") {
			stdhttp.Error(w, `{"error":{"code":"unauthorized","message":"missing or invalid API key"}}`, stdhttp.StatusUnauthorized)
			return
		}

		token := strings.TrimPrefix(auth, "Bearer ")
		prefix, secret, err := parseAPIKey(token)
		if err != nil {
			stdhttp.Error(w, `{"error":{"code":"unauthorized","message":"malformed API key"}}`, stdhttp.StatusUnauthorized)
			return
		}

		key, err := m.repo.GetAPIKeyByPrefix(r.Context(), prefix)
		if err != nil || key == nil {
			stdhttp.Error(w, `{"error":{"code":"unauthorized","message":"API key not found"}}`, stdhttp.StatusUnauthorized)
			return
		}

		if !key.Active {
			stdhttp.Error(w, `{"error":{"code":"unauthorized","message":"API key is deactivated"}}`, stdhttp.StatusUnauthorized)
			return
		}

		if key.ExpiresAt != nil && key.ExpiresAt.Before(time.Now().UTC()) {
			stdhttp.Error(w, `{"error":{"code":"unauthorized","message":"API key has expired"}}`, stdhttp.StatusUnauthorized)
			return
		}

		// Verify secret against hash
		if err := bcrypt.CompareHashAndPassword([]byte(key.KeyHash), []byte(secret)); err != nil {
			stdhttp.Error(w, `{"error":{"code":"unauthorized","message":"invalid API key"}}`, stdhttp.StatusUnauthorized)
			return
		}

		// Check scope
		if requiredScope != "" && !hasScope(key.Scopes, requiredScope) {
			stdhttp.Error(w, fmt.Sprintf(`{"error":{"code":"forbidden","message":"API key missing required scope: %s"}}`, requiredScope), stdhttp.StatusForbidden)
			return
		}

		// Touch last used (fire and forget)
		go func() {
			if err := m.repo.TouchAPIKeyLastUsed(context.Background(), key.ID); err != nil {
				slog.Warn("bot auth: failed to update last_used_at", "key_id", key.ID, "error", err)
			}
		}()

		// Inject user context
		r.Header.Set("X-User-ID", key.UserID)
		r.Header.Set("X-Bot-Scopes", strings.Join(key.Scopes, ","))
		r.Header.Set("X-Bot-Key-ID", key.ID)

		next.ServeHTTP(w, r)
	})
}

// GenerateAPIKey creates a new API key with the format: tna_<prefix>_<secret>
// Returns the full key (shown once) and the hashed version for storage.
func GenerateAPIKey() (fullKey string, prefix string, hash string, err error) {
	// Generate 8-byte prefix and 24-byte secret
	prefixBytes := make([]byte, 4)
	secretBytes := make([]byte, 24)

	if _, err := rand.Read(prefixBytes); err != nil {
		return "", "", "", fmt.Errorf("generate prefix: %w", err)
	}
	if _, err := rand.Read(secretBytes); err != nil {
		return "", "", "", fmt.Errorf("generate secret: %w", err)
	}

	prefix = hex.EncodeToString(prefixBytes)
	secret := hex.EncodeToString(secretBytes)
	fullKey = fmt.Sprintf("tna_%s_%s", prefix, secret)

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(secret), bcrypt.DefaultCost)
	if err != nil {
		return "", "", "", fmt.Errorf("hash key: %w", err)
	}

	return fullKey, prefix, string(hashBytes), nil
}

// parseAPIKey splits "tna_<prefix>_<secret>" into prefix and secret.
func parseAPIKey(token string) (prefix, secret string, err error) {
	parts := strings.SplitN(token, "_", 3)
	if len(parts) != 3 || parts[0] != "tna" {
		return "", "", fmt.Errorf("invalid key format")
	}
	return parts[1], parts[2], nil
}

func hasScope(scopes []string, required string) bool {
	for _, s := range scopes {
		if s == required || s == "admin" {
			return true
		}
	}
	return false
}
