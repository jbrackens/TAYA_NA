package store

import (
	"errors"
	"fmt"
	"testing"
	"time"
)

func fixedVerifier(secret string, now time.Time) *webhookVerifier {
	verifier := newWebhookVerifier(secret)
	verifier.now = func() time.Time { return now }
	return verifier
}

func TestWebhookVerifierAcceptsValidSignature(t *testing.T) {
	now := time.Date(2026, 7, 12, 12, 0, 0, 0, time.UTC)
	body := []byte(fmt.Sprintf(`{"purchaseId":"sp_1","status":"completed","timestamp":%d}`, now.Unix()))
	verifier := fixedVerifier("whsec_test", now)

	signature := signWebhookBody("whsec_test", body)
	if err := verifier.Verify(body, signature, fmt.Sprintf("%d", now.Unix())); err != nil {
		t.Fatalf("expected sha256=<hex> signature to verify, got %v", err)
	}
	// Bare hex (no sha256= prefix) is also accepted, matching the legacy
	// verifier shape.
	if err := verifier.Verify(body, signature[len("sha256="):], fmt.Sprintf("%d", now.Unix())); err != nil {
		t.Fatalf("expected bare hex signature to verify, got %v", err)
	}
	// RFC3339 timestamps are accepted alongside unix seconds.
	if err := verifier.Verify(body, signature, now.Format(time.RFC3339)); err != nil {
		t.Fatalf("expected RFC3339 timestamp to verify, got %v", err)
	}
}

func TestWebhookVerifierRejectsBadSignatures(t *testing.T) {
	now := time.Date(2026, 7, 12, 12, 0, 0, 0, time.UTC)
	body := []byte(`{"purchaseId":"sp_1"}`)
	verifier := fixedVerifier("whsec_test", now)
	timestamp := fmt.Sprintf("%d", now.Unix())

	if err := verifier.Verify(body, "", timestamp); !errors.Is(err, ErrWebhookSignatureMissing) {
		t.Fatalf("missing signature: got %v", err)
	}
	if err := verifier.Verify(body, "sha256=not-hex", timestamp); !errors.Is(err, ErrWebhookSignatureInvalid) {
		t.Fatalf("undecodable signature: got %v", err)
	}
	wrong := signWebhookBody("whsec_other", body)
	if err := verifier.Verify(body, wrong, timestamp); !errors.Is(err, ErrWebhookSignatureInvalid) {
		t.Fatalf("wrong-secret signature: got %v", err)
	}
	tampered := signWebhookBody("whsec_test", []byte(`{"purchaseId":"sp_2"}`))
	if err := verifier.Verify(body, tampered, timestamp); !errors.Is(err, ErrWebhookSignatureInvalid) {
		t.Fatalf("tampered-body signature: got %v", err)
	}
}

func TestWebhookVerifierEnforcesTimestampWindow(t *testing.T) {
	now := time.Date(2026, 7, 12, 12, 0, 0, 0, time.UTC)
	body := []byte(`{"purchaseId":"sp_1"}`)
	verifier := fixedVerifier("whsec_test", now)
	signature := signWebhookBody("whsec_test", body)

	if err := verifier.Verify(body, signature, ""); !errors.Is(err, ErrWebhookTimestampMissing) {
		t.Fatalf("missing timestamp: got %v", err)
	}
	if err := verifier.Verify(body, signature, "not-a-time"); !errors.Is(err, ErrWebhookTimestampInvalid) {
		t.Fatalf("invalid timestamp: got %v", err)
	}
	// Inside the ±5min window: ok in both directions.
	for _, delta := range []time.Duration{-4 * time.Minute, 4 * time.Minute} {
		ts := fmt.Sprintf("%d", now.Add(delta).Unix())
		if err := verifier.Verify(body, signature, ts); err != nil {
			t.Fatalf("timestamp %v inside window rejected: %v", delta, err)
		}
	}
	// Outside the window: expired in both directions.
	for _, delta := range []time.Duration{-6 * time.Minute, 6 * time.Minute} {
		ts := fmt.Sprintf("%d", now.Add(delta).Unix())
		if err := verifier.Verify(body, signature, ts); !errors.Is(err, ErrWebhookTimestampExpired) {
			t.Fatalf("timestamp %v outside window: got %v", delta, err)
		}
	}
}

func TestWebhookVerifierFailsClosedWithoutSecret(t *testing.T) {
	now := time.Date(2026, 7, 12, 12, 0, 0, 0, time.UTC)
	verifier := fixedVerifier("", now)
	body := []byte(`{}`)
	if err := verifier.Verify(body, signWebhookBody("", body), fmt.Sprintf("%d", now.Unix())); !errors.Is(err, ErrWebhookSecretMissing) {
		t.Fatalf("empty secret must fail closed, got %v", err)
	}
}
