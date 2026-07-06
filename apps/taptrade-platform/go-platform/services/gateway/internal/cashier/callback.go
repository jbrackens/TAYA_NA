package cashier

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

func VerifyProviderCallbackSignature(rawBody []byte, signatureHeader string, secret string) bool {
	if len(rawBody) == 0 || strings.TrimSpace(signatureHeader) == "" || strings.TrimSpace(secret) == "" {
		return false
	}
	provided, err := decodeProviderCallbackSignature(signatureHeader)
	if err != nil {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(rawBody)
	return hmac.Equal(mac.Sum(nil), provided)
}

func ProviderCallbackRawBodySHA256(rawBody []byte) string {
	sum := sha256.Sum256(rawBody)
	return hex.EncodeToString(sum[:])
}

func SignProviderCallbackBodyForTest(rawBody []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(rawBody)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func decodeProviderCallbackSignature(signatureHeader string) ([]byte, error) {
	normalized := strings.TrimSpace(signatureHeader)
	normalized = strings.TrimPrefix(strings.ToLower(normalized), "sha256=")
	normalized = strings.TrimPrefix(normalized, "0x")
	return hex.DecodeString(normalized)
}
