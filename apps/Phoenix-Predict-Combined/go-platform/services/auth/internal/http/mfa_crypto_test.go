package http

import (
	"encoding/base64"
	"strings"
	"testing"
)

// A valid AES-256 key (32 bytes) as base64.
const testMFAKey32 = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=" // "0123...ef" x2

func TestMFASecretRoundTrip(t *testing.T) {
	t.Setenv("AUTH_MFA_ENCRYPTION_KEY", testMFAKey32)
	const secret = "JBSWY3DPEHPK3PXP"

	enc, err := encryptMFASecret(secret)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	if !strings.HasPrefix(enc, mfaSecretEncPrefix) {
		t.Fatalf("ciphertext must carry the enc:v1: prefix, got %q", enc)
	}
	if strings.Contains(enc, secret) {
		t.Fatalf("ciphertext must not contain the plaintext secret")
	}
	// Non-deterministic nonce → two encryptions differ.
	enc2, _ := encryptMFASecret(secret)
	if enc == enc2 {
		t.Fatal("two encryptions of the same secret must differ (random nonce)")
	}
	dec, err := decryptMFASecret(enc)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	if dec != secret {
		t.Fatalf("round-trip mismatch: got %q want %q", dec, secret)
	}
}

func TestMFASecretLegacyPlaintextReadsThrough(t *testing.T) {
	// A row stored before GAP-3 has no prefix and must read through unchanged,
	// even with a key configured (backward compatibility).
	t.Setenv("AUTH_MFA_ENCRYPTION_KEY", testMFAKey32)
	dec, err := decryptMFASecret("JBSWY3DPEHPK3PXP")
	if err != nil || dec != "JBSWY3DPEHPK3PXP" {
		t.Fatalf("legacy plaintext must read through: got %q err %v", dec, err)
	}
}

func TestMFASecretNoKeyDevReturnsPlaintext(t *testing.T) {
	t.Setenv("AUTH_MFA_ENCRYPTION_KEY", "")
	t.Setenv("ENVIRONMENT", "development")
	enc, err := encryptMFASecret("SECRET")
	if err != nil || enc != "SECRET" {
		t.Fatalf("dev with no key returns plaintext: got %q err %v", enc, err)
	}
}

func TestMFASecretNoKeyDeployedFailsClosed(t *testing.T) {
	t.Setenv("AUTH_MFA_ENCRYPTION_KEY", "")
	t.Setenv("ENVIRONMENT", "production")
	if _, err := encryptMFASecret("SECRET"); err == nil {
		t.Fatal("deployed env with no key must refuse to store (fail-closed)")
	}
	// An encrypted value cannot be read without the key either.
	if _, err := decryptMFASecret(mfaSecretEncPrefix + "AAAA"); err == nil {
		t.Fatal("deployed env with no key must refuse to read an encrypted secret")
	}
}

func TestMFASecretWrongKeyFails(t *testing.T) {
	t.Setenv("AUTH_MFA_ENCRYPTION_KEY", testMFAKey32)
	enc, err := encryptMFASecret("SECRET")
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	// Different key → GCM auth fails.
	otherKey := base64.StdEncoding.EncodeToString([]byte("ffffffffffffffffffffffffffffffff"))
	t.Setenv("AUTH_MFA_ENCRYPTION_KEY", otherKey)
	if _, err := decryptMFASecret(enc); err == nil {
		t.Fatal("decrypt with the wrong key must fail")
	}
}

func TestMFAEncryptionKeyValidation(t *testing.T) {
	t.Setenv("AUTH_MFA_ENCRYPTION_KEY", "not-base64!!")
	if _, _, err := mfaEncryptionKey(); err == nil {
		t.Fatal("non-base64 key must error")
	}
	t.Setenv("AUTH_MFA_ENCRYPTION_KEY", base64.StdEncoding.EncodeToString([]byte("too-short")))
	if _, _, err := mfaEncryptionKey(); err == nil {
		t.Fatal("wrong-length key must error")
	}
	t.Setenv("AUTH_MFA_ENCRYPTION_KEY", "")
	if _, ok, err := mfaEncryptionKey(); ok || err != nil {
		t.Fatalf("unset key: want ok=false err=nil, got ok=%v err=%v", ok, err)
	}
}
