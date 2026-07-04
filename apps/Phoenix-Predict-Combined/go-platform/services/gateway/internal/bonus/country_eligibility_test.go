package bonus

import "testing"

// TestCheckCountryEligibility (GAP-83, §21) locks the jurisdiction rule: an empty
// allowlist imposes no restriction; a set allowlist admits only listed countries
// (case-insensitively) and fails closed on an unknown/empty punter country.
func TestCheckCountryEligibility(t *testing.T) {
	cases := []struct {
		name    string
		country string
		allowed []string
		wantErr bool
	}{
		{"no restriction admits anyone", "US", nil, false},
		{"no restriction admits unknown country", "", []string{}, false},
		{"listed country admitted", "PH", []string{"PH", "SG"}, false},
		{"case-insensitive match", "ph", []string{"PH"}, false},
		{"allowlist entry lowercase", "PH", []string{"ph", "sg"}, false},
		{"unlisted country refused", "US", []string{"PH", "SG"}, true},
		{"unknown country refused when restricted", "", []string{"PH"}, true},
		{"whitespace-only country refused when restricted", "  ", []string{"PH"}, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := checkCountryEligibility(tc.country, tc.allowed)
			if tc.wantErr && err == nil {
				t.Fatalf("country=%q allowed=%v: expected ineligible, got nil", tc.country, tc.allowed)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("country=%q allowed=%v: expected eligible, got %v", tc.country, tc.allowed, err)
			}
		})
	}
}

// TestEligibilityConfigHasCheckable confirms AllowedCountries / AllowedTagIDs
// each activate the eligibility gate (so a country- or tag-only-restricted
// campaign is enforced).
func TestEligibilityConfigHasCheckable(t *testing.T) {
	if (EligibilityConfig{}).hasCheckableEligibility() {
		t.Fatal("empty config should have nothing to check")
	}
	if !(EligibilityConfig{AllowedCountries: []string{"PH"}}).hasCheckableEligibility() {
		t.Fatal("a country allowlist must activate the eligibility gate")
	}
	if !(EligibilityConfig{AllowedTagIDs: []int64{7}}).hasCheckableEligibility() {
		t.Fatal("a tag allowlist must activate the eligibility gate")
	}
	if !(EligibilityConfig{NewPlayersOnly: true}).hasCheckableEligibility() {
		t.Fatal("new-players-only must activate the eligibility gate")
	}
}

// TestCheckTagEligibility (GAP-83 slice 2, §21) locks the segmentation-tag rule:
// empty allowlist imposes no restriction; a set allowlist admits a punter who
// carries ANY listed tag and fails closed for a punter carrying none.
func TestCheckTagEligibility(t *testing.T) {
	cases := []struct {
		name       string
		punterTags []int64
		required   []int64
		wantErr    bool
	}{
		{"no restriction admits anyone", nil, nil, false},
		{"no restriction admits tagless punter", nil, []int64{}, false},
		{"member of the required tag admitted", []int64{5}, []int64{5}, false},
		{"any-match: has one of several required", []int64{9, 5}, []int64{5, 7}, false},
		{"not a member refused", []int64{1, 2}, []int64{5}, true},
		{"tagless punter refused when restricted", nil, []int64{5}, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := checkTagEligibility(tc.punterTags, tc.required)
			if tc.wantErr && err == nil {
				t.Fatalf("punterTags=%v required=%v: expected ineligible, got nil", tc.punterTags, tc.required)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("punterTags=%v required=%v: expected eligible, got %v", tc.punterTags, tc.required, err)
			}
		})
	}
}
