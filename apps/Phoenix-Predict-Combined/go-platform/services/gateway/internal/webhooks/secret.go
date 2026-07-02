package webhooks

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

// SecretPrefix tags generated signing secrets (Stripe-style whsec_…) so they're
// recognizable in logs/configs and distinct from API keys.
const SecretPrefix = "whsec_"

// GenerateSecret returns a fresh HMAC signing secret (32 random bytes, hex,
// whsec_-prefixed). Unlike an API key it is stored in plaintext — the gateway
// needs it to sign every delivery (Sign) — and shared with the partner, who
// uses it to Verify. Returned to the operator once at registration.
func GenerateSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate webhook secret: %w", err)
	}
	return SecretPrefix + hex.EncodeToString(b), nil
}
