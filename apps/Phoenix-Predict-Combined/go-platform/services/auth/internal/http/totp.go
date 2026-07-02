package http

// Dependency-free TOTP (RFC 6238 / RFC 4226) used by admin/staff multi-factor
// auth. Implemented in-house with the standard library so the auth service
// carries no third-party crypto dependency; verified against the RFC 6238
// Appendix B test vectors in totp_test.go.

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/subtle"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	totpPeriodSeconds = 30 // RFC 6238 default time step
	totpDigits        = 6  // 6-digit codes (authenticator standard)
	totpSkewSteps     = 1  // accept the adjacent step on each side (±30s clock skew)
	totpSecretBytes   = 20 // 160-bit shared secret (RFC 4226 recommended minimum)
)

// totpEncoding is unpadded, upper-case base32 — the encoding authenticator apps
// expect for the otpauth `secret` parameter.
var totpEncoding = base32.StdEncoding.WithPadding(base32.NoPadding)

// generateTOTPSecret returns a fresh random base32-encoded shared secret.
func generateTOTPSecret() (string, error) {
	buf := make([]byte, totpSecretBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return totpEncoding.EncodeToString(buf), nil
}

// decodeTOTPSecret normalizes and base32-decodes a shared secret.
func decodeTOTPSecret(s string) ([]byte, error) {
	s = strings.ToUpper(strings.TrimSpace(strings.ReplaceAll(s, " ", "")))
	return totpEncoding.DecodeString(s)
}

// hotpCode computes the RFC 4226 HOTP value for a key and counter.
func hotpCode(key []byte, counter uint64, digits int) string {
	var msg [8]byte
	binary.BigEndian.PutUint64(msg[:], counter)
	mac := hmac.New(sha1.New, key)
	mac.Write(msg[:])
	sum := mac.Sum(nil)

	offset := sum[len(sum)-1] & 0x0f
	bin := (uint32(sum[offset]&0x7f) << 24) |
		(uint32(sum[offset+1]) << 16) |
		(uint32(sum[offset+2]) << 8) |
		uint32(sum[offset+3])

	mod := uint32(1)
	for i := 0; i < digits; i++ {
		mod *= 10
	}
	return fmt.Sprintf("%0*d", digits, bin%mod)
}

// totpCodeAt computes the TOTP value for an arbitrary period/digit count. Used
// by tests to exercise the RFC 6238 vectors; production paths use totpCode.
func totpCodeAt(secretB32 string, t time.Time, period, digits int) (string, error) {
	key, err := decodeTOTPSecret(secretB32)
	if err != nil {
		return "", err
	}
	counter := uint64(t.Unix() / int64(period))
	return hotpCode(key, counter, digits), nil
}

// totpCode computes the standard 6-digit / 30-second TOTP value at time t.
func totpCode(secretB32 string, t time.Time) (string, error) {
	return totpCodeAt(secretB32, t, totpPeriodSeconds, totpDigits)
}

// totpVerifyStep reports whether code is valid for secret at time t and, when
// valid, the timestep counter that matched. It accepts the adjacent step on
// each side to tolerate clock skew; comparison is constant-time. Callers use
// the returned step to enforce single-use (GAP-2): a code whose step has
// already been consumed must be rejected, so a captured code cannot be
// replayed within the ~90s skew window. A malformed secret or wrong-length
// code returns (0, false).
func totpVerifyStep(secretB32, code string, t time.Time) (int64, bool) {
	code = strings.TrimSpace(code)
	if len(code) != totpDigits {
		return 0, false
	}
	key, err := decodeTOTPSecret(secretB32)
	if err != nil || len(key) == 0 {
		return 0, false
	}
	counter := int64(t.Unix() / int64(totpPeriodSeconds))
	for d := -totpSkewSteps; d <= totpSkewSteps; d++ {
		step := counter + int64(d)
		expected := hotpCode(key, uint64(step), totpDigits)
		if subtle.ConstantTimeCompare([]byte(expected), []byte(code)) == 1 {
			return step, true
		}
	}
	return 0, false
}

// totpVerify reports whether code is valid for secret at time t, with no
// single-use enforcement. Used where replay is naturally bounded (enrollment
// activation flips state, disable deletes the record). Constant-time.
func totpVerify(secretB32, code string, t time.Time) bool {
	_, ok := totpVerifyStep(secretB32, code, t)
	return ok
}

// otpauthURI builds the otpauth:// provisioning URI an authenticator app scans.
func otpauthURI(issuer, account, secretB32 string) string {
	label := url.PathEscape(issuer + ":" + account)
	v := url.Values{}
	v.Set("secret", secretB32)
	v.Set("issuer", issuer)
	v.Set("algorithm", "SHA1")
	v.Set("digits", fmt.Sprintf("%d", totpDigits))
	v.Set("period", fmt.Sprintf("%d", totpPeriodSeconds))
	return "otpauth://totp/" + label + "?" + v.Encode()
}

// mfaIssuer is the label shown in the authenticator app.
func mfaIssuer() string {
	if v := strings.TrimSpace(os.Getenv("AUTH_MFA_ISSUER")); v != "" {
		return v
	}
	return "Taya NA Predict"
}
