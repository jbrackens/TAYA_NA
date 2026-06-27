package http

import (
	"strings"
	"testing"
	"time"
)

// rfc6238Secret is the shared secret from RFC 6238 Appendix B (ASCII
// "12345678901234567890"), base32-encoded the way our code stores it.
func rfc6238Secret() string {
	return totpEncoding.EncodeToString([]byte("12345678901234567890"))
}

// TestTOTPCodeMatchesRFC6238Vectors verifies the HOTP/TOTP core against the
// published RFC 6238 Appendix B test vectors (SHA1, 8 digits).
func TestTOTPCodeMatchesRFC6238Vectors(t *testing.T) {
	secret := rfc6238Secret()
	cases := []struct {
		unix int64
		want string
	}{
		{59, "94287082"},
		{1111111109, "07081804"},
		{1111111111, "14050471"},
		{1234567890, "89005924"},
		{2000000000, "69279037"},
		{20000000000, "65353130"},
	}
	for _, tc := range cases {
		got, err := totpCodeAt(secret, time.Unix(tc.unix, 0), totpPeriodSeconds, 8)
		if err != nil {
			t.Fatalf("totpCodeAt(%d): unexpected error %v", tc.unix, err)
		}
		if got != tc.want {
			t.Errorf("totpCodeAt(%d) = %s, want %s", tc.unix, got, tc.want)
		}
	}
}

// TestTOTPVerifyWindow checks acceptance of the current step, the ±1 skew
// window, and rejection of stale codes and malformed input.
func TestTOTPVerifyWindow(t *testing.T) {
	secret, err := generateTOTPSecret()
	if err != nil {
		t.Fatalf("generateTOTPSecret: %v", err)
	}
	now := time.Unix(1700000000, 0) // arbitrary fixed instant

	current, _ := totpCode(secret, now)
	if !totpVerify(secret, current, now) {
		t.Fatalf("current code should verify")
	}
	// Previous and next steps are within the skew window.
	if !totpVerify(secret, current, now.Add(-totpPeriodSeconds*time.Second)) {
		t.Errorf("code should verify one step in the future (server clock behind)")
	}
	if !totpVerify(secret, current, now.Add(totpPeriodSeconds*time.Second)) {
		t.Errorf("code should verify one step in the past (server clock ahead)")
	}
	// Two steps away is outside the window.
	if totpVerify(secret, current, now.Add(2*totpPeriodSeconds*time.Second)) {
		t.Errorf("code two steps away must be rejected")
	}
	// Wrong / malformed codes are rejected.
	if totpVerify(secret, "000000", now) && current != "000000" {
		t.Errorf("an unrelated code must not verify")
	}
	if totpVerify(secret, "12345", now) {
		t.Errorf("short code must be rejected")
	}
	if totpVerify(secret, "", now) {
		t.Errorf("empty code must be rejected")
	}
	if totpVerify("!!!not-base32!!!", current, now) {
		t.Errorf("malformed secret must not verify")
	}
}

// TestOTPAuthURI checks the provisioning URI carries the expected parameters.
func TestOTPAuthURI(t *testing.T) {
	secret := "JBSWY3DPEHPK3PXP"
	uri := otpauthURI("Taya NA Predict", "admin@phoenix.local", secret)
	if !strings.HasPrefix(uri, "otpauth://totp/") {
		t.Fatalf("uri missing scheme/type: %s", uri)
	}
	for _, want := range []string{"secret=" + secret, "issuer=Taya", "digits=6", "period=30", "algorithm=SHA1"} {
		if !strings.Contains(uri, want) {
			t.Errorf("uri missing %q: %s", want, uri)
		}
	}
}
