package webhooks

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

// SignatureHeader carries the HMAC signature on every delivery.
const SignatureHeader = "X-TNA-Signature"

// Sign returns the HMAC-SHA256 of body keyed by the endpoint secret, formatted
// as "sha256=<hex>" for the X-TNA-Signature header. A partner recomputes the
// same MAC over the exact raw request body and compares it in constant time
// (see Verify) to authenticate the sender and detect tampering.
func Sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// Verify reports whether signature equals Sign(secret, body), compared in
// constant time (hmac.Equal). This is the reference check a partner SDK
// implements; the gateway uses it in tests to prove deliveries are verifiable.
func Verify(secret string, body []byte, signature string) bool {
	expected := Sign(secret, body)
	return hmac.Equal([]byte(expected), []byte(signature))
}
