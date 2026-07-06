package prediction

import "testing"

func TestEvaluateMarketJurisdiction(t *testing.T) {
	allow := &MarketJurisdictionPolicy{Mode: JurisdictionAllow, Countries: []string{"GB", "PH"}}
	deny := &MarketJurisdictionPolicy{Mode: JurisdictionDeny, Countries: []string{"US", "FR"}}

	cases := []struct {
		name    string
		policy  *MarketJurisdictionPolicy
		country string
		allowed bool
	}{
		{"nil policy allows", nil, "US", true},
		{"allow: listed country ok", allow, "GB", true},
		{"allow: listed country case-insensitive", allow, "ph", true},
		{"allow: unlisted country denied", allow, "US", false},
		{"deny: listed country denied", deny, "US", false},
		{"deny: listed country case-insensitive", deny, "fr", false},
		{"deny: unlisted country ok", deny, "GB", true},
		{"empty country defers to global (allow-mode)", allow, "", true},
		{"empty country defers to global (deny-mode)", deny, "", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, reason := EvaluateMarketJurisdiction(tc.policy, tc.country)
			if got != tc.allowed {
				t.Fatalf("allowed=%v, want %v (reason=%q)", got, tc.allowed, reason)
			}
			if !got && reason == "" {
				t.Fatal("denied result must carry a reason")
			}
		})
	}
}

func TestParseMarketJurisdictionPolicy(t *testing.T) {
	cases := []struct {
		name    string
		raw     string
		wantNil bool
		wantErr bool
	}{
		{"empty string → nil", ``, true, false},
		{"null → nil", `null`, true, false},
		{"empty object → nil", `{}`, true, false},
		{"valid allow", `{"mode":"allow","countries":["GB"]}`, false, false},
		{"valid deny", `{"mode":"deny","countries":["US","FR"]}`, false, false},
		{"unknown mode → nil (fail open to global)", `{"mode":"block","countries":["US"]}`, true, false},
		{"empty countries → nil", `{"mode":"deny","countries":[]}`, true, false},
		{"malformed json → error", `{"mode":`, false, true},
		{"mode case-normalized", `{"mode":"ALLOW","countries":["gb"]}`, false, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p, err := ParseMarketJurisdictionPolicy([]byte(tc.raw))
			if tc.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tc.wantNil && p != nil {
				t.Fatalf("expected nil policy, got %+v", p)
			}
			if !tc.wantNil && p == nil {
				t.Fatal("expected non-nil policy, got nil")
			}
		})
	}
}
