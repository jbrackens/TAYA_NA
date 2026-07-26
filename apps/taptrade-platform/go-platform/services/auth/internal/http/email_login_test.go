package http

import "testing"

// Regression: ISSUE-023 (QA 2026-07-26) — the player app always sent an
// email at signup, but registerRequest dropped it at decode and Login
// matched username only, so the "USERNAME OR EMAIL" field silently
// failed for every register-created account's address.

func TestRegisterStoresEmailAndLoginMatchesIt(t *testing.T) {
	a := NewAuthService()
	if _, err := a.RegisterWithAcceptance(
		"emailuser", "Sup3rSecretPw!", "Email.User@Test.DEV",
		taptradeLaunchTermsVersion, taptradeDisclosureVersion,
	); err != nil {
		t.Fatalf("register: %v", err)
	}

	// Address is lowercased on write and matched case-insensitively.
	if _, err := a.Login("email.user@test.dev", "Sup3rSecretPw!"); err != nil {
		t.Fatalf("email login must succeed: %v", err)
	}
	if _, err := a.Login("EMAIL.USER@TEST.DEV", "Sup3rSecretPw!"); err != nil {
		t.Fatalf("email login must be case-insensitive: %v", err)
	}
	// Username login keeps working.
	if _, err := a.Login("emailuser", "Sup3rSecretPw!"); err != nil {
		t.Fatalf("username login must keep working: %v", err)
	}
	// Wrong password via email stays rejected.
	if _, err := a.Login("email.user@test.dev", "wrong-password"); err == nil {
		t.Fatal("email login with a bad password must fail")
	}
}

func TestRegisterRejectsDuplicateEmail(t *testing.T) {
	a := NewAuthService()
	if _, err := a.RegisterWithAcceptance(
		"first", "Sup3rSecretPw!", "same@test.dev",
		taptradeLaunchTermsVersion, taptradeDisclosureVersion,
	); err != nil {
		t.Fatalf("register: %v", err)
	}
	if _, err := a.RegisterWithAcceptance(
		"second", "Sup3rSecretPw!", "Same@Test.Dev",
		taptradeLaunchTermsVersion, taptradeDisclosureVersion,
	); err == nil {
		t.Fatal("second registration with the same address must conflict")
	}
}

func TestRegisterRejectsMalformedEmail(t *testing.T) {
	a := NewAuthService()
	if _, err := a.RegisterWithAcceptance(
		"badmail", "Sup3rSecretPw!", "not-an-address",
		taptradeLaunchTermsVersion, taptradeDisclosureVersion,
	); err == nil {
		t.Fatal("register must reject an address without '@'")
	}
}

func TestRegisterWithoutEmailStillWorks(t *testing.T) {
	// Legacy/seed path: no address on file, username login only.
	a := NewAuthService()
	if _, err := a.RegisterWithAcceptance(
		"noemail", "Sup3rSecretPw!", "",
		taptradeLaunchTermsVersion, taptradeDisclosureVersion,
	); err != nil {
		t.Fatalf("register without email must stay valid: %v", err)
	}
	if _, err := a.Login("noemail", "Sup3rSecretPw!"); err != nil {
		t.Fatalf("username login: %v", err)
	}
}
