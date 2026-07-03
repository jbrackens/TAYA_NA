package http

import "testing"

// TestRegistrationCapturesAffiliateAndSignupCountry (GAP-36, PAM §11) asserts
// registration persists the client-attested affiliate tag and signup country
// (country normalized to upper-case), and captures nothing when none is provided.
func TestRegistrationCapturesAffiliateAndSignupCountry(t *testing.T) {
	auth := NewAuthService()

	u, err := auth.RegisterWithAcceptance("gap36player", "StrongPass123!", "", "terms-v1", "disc-v1", "aff-partner-7", "ph")
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if u.AffiliateTag != "aff-partner-7" {
		t.Fatalf("affiliate tag not captured, got %q", u.AffiliateTag)
	}
	if u.SignupCountry != "PH" {
		t.Fatalf("signup country not captured/normalized, got %q", u.SignupCountry)
	}

	u2, err := auth.RegisterWithAcceptance("gap36noattr", "StrongPass123!", "", "terms-v1", "disc-v1", "", "")
	if err != nil {
		t.Fatalf("register (no attribution): %v", err)
	}
	if u2.AffiliateTag != "" || u2.SignupCountry != "" {
		t.Fatalf("no attribution expected, got affiliate=%q country=%q", u2.AffiliateTag, u2.SignupCountry)
	}
}
