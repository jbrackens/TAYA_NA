package compliance

import (
	"testing"
	"time"
)

// TestKYCStatusExpired (GAP-17): only a real, past ExpiresAt is treated as
// expired; empty/unparseable timestamps are not, so legacy/pending records are
// never spuriously blocked.
func TestKYCStatusExpired(t *testing.T) {
	now := time.Date(2026, 7, 3, 12, 0, 0, 0, time.UTC)
	cases := []struct {
		name      string
		expiresAt string
		want      bool
	}{
		{"empty (no expiry) not expired", "", false},
		{"future not expired", now.Add(24 * time.Hour).Format(time.RFC3339), false},
		{"past is expired", now.Add(-time.Second).Format(time.RFC3339), true},
		{"unparseable not expired", "not-a-timestamp", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			st := &KYCStatus{Status: "approved", ExpiresAt: tc.expiresAt}
			if got := st.Expired(now); got != tc.want {
				t.Fatalf("Expired(%q) = %v, want %v", tc.expiresAt, got, tc.want)
			}
		})
	}
	// A nil status is safely not-expired.
	var nilSt *KYCStatus
	if nilSt.Expired(now) {
		t.Fatal("nil status must not report expired")
	}
}
