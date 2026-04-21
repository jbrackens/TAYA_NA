package payments

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	webhookSignatureHeader = "X-Payments-Signature"
	webhookSecretEnv       = "PAYMENTS_WEBHOOK_SECRET"
	webhookMaxAge          = 5 * time.Minute
)

var (
	ErrWebhookSecretMissing    = errors.New("payments webhook secret not configured")
	ErrWebhookSignatureMissing = errors.New("payments webhook signature missing")
	ErrWebhookSignatureInvalid = errors.New("payments webhook signature invalid")
	ErrWebhookTimestampMissing = errors.New("payments webhook timestamp missing")
	ErrWebhookTimestampInvalid = errors.New("payments webhook timestamp invalid")
	ErrWebhookTimestampExpired = errors.New("payments webhook timestamp outside allowed window")
)

type webhookVerifier struct {
	secret []byte
	now    func() time.Time
	maxAge time.Duration
}

func newWebhookVerifierFromEnv() (*webhookVerifier, error) {
	secret := strings.TrimSpace(os.Getenv(webhookSecretEnv))
	if secret == "" {
		return nil, ErrWebhookSecretMissing
	}
	return &webhookVerifier{
		secret: []byte(secret),
		now: func() time.Time {
			return time.Now().UTC()
		},
		maxAge: webhookMaxAge,
	}, nil
}

func (v *webhookVerifier) Verify(body []byte, signature string, timestamp string) error {
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
