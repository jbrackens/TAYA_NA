package http

import "testing"

// TestPasswordPolicyConfigurable (GAP-37, §11/§27) covers the env-configurable
// password policy: the shipped defaults (len 7, 2 of upper/lower/digit), a
// stricter operator policy (len 12, 3 classes), and fail-safe fallback when the
// env is invalid. Critically it locks in that the DEFAULT is unchanged from the
// pre-GAP-37 rule — symbols and non-ASCII runes are NOT a class, so they can
// neither weaken the default nor inflate the class count.
func TestPasswordPolicyConfigurable(t *testing.T) {
	// --- Default policy (no env): min length 7, min 2 of {upper,lower,digit}. ---
	if err := validatePasswordStrength("Aa12345"); err != nil {
		t.Fatalf("default: a 7-char 3-class password must pass: %v", err)
	}
	if err := validatePasswordStrength("Aa1234"); err == nil {
		t.Fatal("default: a 6-char password must fail min-length 7")
	}
	if err := validatePasswordStrength("aaaaaaa"); err == nil {
		t.Fatal("default: a single-class password must fail min-2-classes")
	}
	// Regression (verification #19 MED): a symbol is NOT a class — a lowercase+
	// symbol password was rejected pre-GAP-37 and must STILL be rejected (the
	// default must not silently loosen).
	if err := validatePasswordStrength("aaaaaa!"); err == nil {
		t.Fatal("default must NOT count symbols as a class (aaaaaa! = 1 class, reject)")
	}
	// Non-ASCII letters are ignored (not counted as a symbol): straße1 = lower +
	// digit = 2 classes, so it passes on its ASCII merits, not by a symbol inflation.
	if err := validatePasswordStrength("straße1"); err != nil {
		t.Fatalf("non-ASCII must be ignored, straße1 = lower+digit = 2 classes: %v", err)
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

	// --- Fail-safe: invalid / out-of-range env falls back to default (never looser). ---
	t.Setenv("AUTH_PASSWORD_MIN_LENGTH", "notanumber")
	t.Setenv("AUTH_PASSWORD_MIN_CLASSES", "99") // out of the 1..3 range
	if err := validatePasswordStrength("Aa12345"); err != nil {
		t.Fatalf("invalid env must fall back to default (len 7 / 2 classes): %v", err)
	}
	if err := validatePasswordStrength("Aa1234"); err == nil {
		t.Fatal("invalid env must still enforce the default min-length 7")
	}
	if err := validatePasswordStrength("aaaaaaa"); err == nil {
		t.Fatal("invalid env must still enforce the default min-2-classes")
	}
}
