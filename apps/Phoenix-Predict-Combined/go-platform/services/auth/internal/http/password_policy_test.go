package http

import "testing"

// TestPasswordPolicyConfigurable (GAP-37, §11/§27) covers the env-configurable
// password policy: the shipped defaults (len 7, 2 classes), a stricter operator
// policy (len 12, 3 classes), symbol as a 4th class, and fail-safe fallback when
// the env is invalid (never silently weakens below the default).
func TestPasswordPolicyConfigurable(t *testing.T) {
	// --- Default policy (no env): min length 7, min 2 classes. ---
	if err := validatePasswordStrength("Aa12345"); err != nil {
		t.Fatalf("default: a 7-char 3-class password must pass: %v", err)
	}
	if err := validatePasswordStrength("Aa1234"); err == nil {
		t.Fatal("default: a 6-char password must fail min-length 7")
	}
	if err := validatePasswordStrength("aaaaaaa"); err == nil {
		t.Fatal("default: a single-class password must fail min-2-classes")
	}

	// --- Stricter operator policy: length 12, 3 classes. ---
	t.Setenv("AUTH_PASSWORD_MIN_LENGTH", "12")
	t.Setenv("AUTH_PASSWORD_MIN_CLASSES", "3")
	if err := validatePasswordStrength("Aa123456"); err == nil {
		t.Fatal("strict: an 8-char password must fail min-length 12")
	}
	if err := validatePasswordStrength("abcdefghij12"); err == nil {
		t.Fatal("strict: a 2-class (lower+digit) password must fail min-3-classes")
	}
	if err := validatePasswordStrength("Abcdefghij12"); err != nil {
		t.Fatalf("strict: a 12-char 3-class password must pass: %v", err)
	}
	// Symbols count as a distinct class.
	if err := validatePasswordStrength("abcdefghij1!"); err != nil {
		t.Fatalf("strict: lower+digit+symbol = 3 classes must pass: %v", err)
	}

	// --- Fail-safe: invalid env falls back to the default (does NOT loosen). ---
	t.Setenv("AUTH_PASSWORD_MIN_LENGTH", "notanumber")
	t.Setenv("AUTH_PASSWORD_MIN_CLASSES", "99")
	if err := validatePasswordStrength("Aa12345"); err != nil {
		t.Fatalf("invalid env must fall back to default (len 7 / 2 classes): %v", err)
	}
	if err := validatePasswordStrength("Aa1234"); err == nil {
		t.Fatal("invalid env must still enforce the default min-length 7")
	}
}
