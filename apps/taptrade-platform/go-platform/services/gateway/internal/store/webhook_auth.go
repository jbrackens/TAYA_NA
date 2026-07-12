package store

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strconv"
	"strings"
	"time"
)

// Webhook signature verification: HMAC-SHA256 over the raw body with a ±5min
// timestamp window. Same shape as the proven legacy verifier
// (internal/payments/webhook_auth.go) — deliberately re-implemented here so
// the store never imports the retired payments package. The secret is bound
// at construction from STORE_WEBHOOK_SECRET (never re-read per request).
//
// Stripe later: point this verifier's replacement at Stripe's
// `Stripe-Signature: t=...,v1=...` scheme; nothing else changes.

const (
	// WebhookSignatureHeader carries `sha256=<hex>` (or bare hex) of the
	// HMAC-SHA256 over the raw request body.
	WebhookSignatureHeader = "X-Store-Signature"
	webhookMaxAge          = 5 * time.Minute
)

var (
	ErrWebhookSecretMissing    = errors.New("store webhook secret not configured")
	ErrWebhookSignatureMissing = errors.New("store webhook signature missing")
	ErrWebhookSignatureInvalid = errors.New("store webhook signature invalid")
	ErrWebhookTimestampMissing = errors.New("store webhook timestamp missing")
	ErrWebhookTimestampInvalid = errors.New("store webhook timestamp invalid")
	ErrWebhookTimestampExpired = errors.New("store webhook timestamp outside allowed window")
)

type webhookVerifier struct {
	secret []byte
	now    func() time.Time
	maxAge time.Duration
}

// newWebhookVerifier binds the shared secret once. An empty secret yields a
// verifier that always fails with ErrWebhookSecretMissing (fail closed).
func newWebhookVerifier(secret string) *webhookVerifier {
	return &webhookVerifier{
		secret: []byte(strings.TrimSpace(secret)),
		now: func() time.Time {
			return time.Now().UTC()
		},
		maxAge: webhookMaxAge,
	}
}

func (v *webhookVerifier) Verify(body []byte, signature string, timestamp string) error {
	if len(v.secret) == 0 {
		return ErrWebhookSecretMissing
	}
	if strings.TrimSpace(signature) == "" {
		return ErrWebhookSignatureMissing
	}
	if strings.TrimSpace(timestamp) == "" {
		return ErrWebhookTimestampMissing
	}

	signedAt, err := parseWebhookTimestamp(timestamp)
	if err != nil {
		return ErrWebhookTimestampInvalid
	}
	if age := absoluteDuration(v.now().Sub(signedAt)); age > v.maxAge {
		return ErrWebhookTimestampExpired
	}

	providedSig, err := decodeWebhookSignature(signature)
	if err != nil {
		return ErrWebhookSignatureInvalid
	}

	mac := hmac.New(sha256.New, v.secret)
	if _, err := mac.Write(body); err != nil {
		return err
	}
	if !hmac.Equal(mac.Sum(nil), providedSig) {
		return ErrWebhookSignatureInvalid
	}
	return nil
}

func signWebhookBody(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func decodeWebhookSignature(signature string) ([]byte, error) {
	normalized := strings.TrimSpace(signature)
	if strings.HasPrefix(strings.ToLower(normalized), "sha256=") {
		normalized = normalized[len("sha256="):]
	}
	return hex.DecodeString(normalized)
}

func parseWebhookTimestamp(raw string) (time.Time, error) {
	if unix, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64); err == nil {
		return time.Unix(unix, 0).UTC(), nil
	}
	return time.Parse(time.RFC3339, strings.TrimSpace(raw))
}

func absoluteDuration(value time.Duration) time.Duration {
	if value < 0 {
		return -value
	}
	return value
}
