package http

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
)

// GAP-3 (PAM spec §27 Security Requirements): TOTP shared secrets are encrypted
// at rest with AES-256-GCM using a key from AUTH_MFA_ENCRYPTION_KEY (base64,
// decoding to 32 bytes). Stored ciphertext carries the "enc:v1:" prefix; legacy
// plaintext rows (no prefix) are read through unchanged for backward
// compatibility and migrate to ciphertext on the next enrollment. Fail-closed:
// in a deployed environment a missing/invalid key REFUSES to store or read an
// MFA secret rather than silently persisting plaintext. A DB leak of ciphertext
// no longer hands an attacker working second factors.

const mfaSecretEncPrefix = "enc:v1:"

var errMFAEncryptionKeyMissing = errors.New(
	"AUTH_MFA_ENCRYPTION_KEY is required to protect TOTP secrets at rest in a deployed environment")

// mfaEncryptionKey returns the 32-byte AES key from the environment. ok=false
// (with nil error) means the key is unset; a set-but-malformed key is an error.
func mfaEncryptionKey() (key []byte, ok bool, err error) {
	raw := strings.TrimSpace(os.Getenv("AUTH_MFA_ENCRYPTION_KEY"))
	if raw == "" {
		return nil, false, nil
	}
	decoded, derr := base64.StdEncoding.DecodeString(raw)
	if derr != nil {
		return nil, true, fmt.Errorf("AUTH_MFA_ENCRYPTION_KEY must be base64: %w", derr)
	}
	if len(decoded) != 32 {
		return nil, true, fmt.Errorf("AUTH_MFA_ENCRYPTION_KEY must decode to 32 bytes for AES-256 (got %d)", len(decoded))
	}
	return decoded, true, nil
}

func newMFAGCM(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

// encryptMFASecret encrypts a TOTP secret for at-rest storage. With no key
// configured, a deployed environment errors (fail-closed) while a development
// environment returns the plaintext unchanged (local convenience only).
func encryptMFASecret(plaintext string) (string, error) {
	key, ok, err := mfaEncryptionKey()
	if err != nil {
		return "", err
	}
	if !ok {
		if deployedAuthEnvironment() {
			return "", errMFAEncryptionKeyMissing
		}
		return plaintext, nil
	}
	gcm, err := newMFAGCM(key)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return mfaSecretEncPrefix + base64.StdEncoding.EncodeToString(sealed), nil
}

// decryptMFASecret reverses encryptMFASecret. A value without the "enc:v1:"
// prefix is legacy plaintext and is returned unchanged; an encrypted value
// requires the key (and a deployed env without it fails closed).
func decryptMFASecret(stored string) (string, error) {
	if !strings.HasPrefix(stored, mfaSecretEncPrefix) {
		return stored, nil
	}
	key, ok, err := mfaEncryptionKey()
	if err != nil {
		return "", err
	}
	if !ok {
		return "", errMFAEncryptionKeyMissing
	}
	gcm, err := newMFAGCM(key)
	if err != nil {
		return "", err
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(stored, mfaSecretEncPrefix))
	if err != nil {
		return "", err
	}
	if len(raw) < gcm.NonceSize() {
		return "", errors.New("mfa secret ciphertext is too short")
	}
	nonce, ciphertext := raw[:gcm.NonceSize()], raw[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("mfa secret decrypt failed: %w", err)
	}
	return string(plaintext), nil
}
