package compliance

import (
	"strings"
	"testing"
)

// HasLaunchProhibitedCopy is the single predicate behind the payload scrub
// AND the SQL list-exclusion filter, so its semantics are contract:
// money/wagering vocabulary and bare dollar signs are prohibited;
// "non-redeemable" is the one allowed use of the redeemable stem.
func TestHasLaunchProhibitedCopy(t *testing.T) {
	cases := []struct {
		name       string
		value      string
		prohibited bool
	}{
		{"empty", "", false},
		{"clean_title", "Fed cuts at May FOMC?", false},
		{"points_wording", "Earn 500 points on settlement", false},
		{"dollar_sign", "Will BTC hit $200k?", true},
		{"cash_word", "Cash out before Friday", true},
		{"bets_plural", "Best bets for the finals", true},
		{"wagering", "Wagering closes at noon", true},
		{"usdc", "USDC depegs below 0.99?", true},
		{"crypto", "Crypto ETF approved in July?", true},
		{"case_insensitive", "DEPOSIT bonus doubled", true},
		{"substring_not_word", "Scashier is a brand", false},
		{"redeemable_alone", "Redeemable rewards drop", true},
		{"non_redeemable_allowed", "All points are non-redeemable", false},
		{"non_redeemable_plus_redeemable", "non-redeemable today, redeemable tomorrow", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := HasLaunchProhibitedCopy(tc.value); got != tc.prohibited {
				t.Fatalf("HasLaunchProhibitedCopy(%q) = %v, want %v", tc.value, got, tc.prohibited)
			}
		})
	}
}

// The SQL translation must be built from the same term list as the Go regex
// and mirror both rules (prohibited terms/dollar sign + the redeemable rule
// with the non-redeemable carve-out).
func TestLaunchProhibitedCopySQLConditionShape(t *testing.T) {
	cond := LaunchProhibitedCopySQLCondition("m.title")

	for _, fragment := range []string{
		`m.title ~* '(\$|\y(` + launchProhibitedTermsPattern + `)\y)'`,
		`regexp_replace(m.title, '\ynon-redeemable\y', '', 'gi') ~* '\yredeemable\y'`,
	} {
		if !strings.Contains(cond, fragment) {
			t.Fatalf("SQL condition missing %q; got %q", fragment, cond)
		}
	}
	if strings.Contains(cond, `\b`) {
		t.Fatalf("SQL condition must use Postgres \\y word boundaries, not Go \\b: %q", cond)
	}
	// The pattern is embedded in single-quoted SQL literals; a quote inside the
	// terms would break the statement.
	if strings.Contains(launchProhibitedTermsPattern, "'") {
		t.Fatalf("prohibited terms must not contain single quotes: %q", launchProhibitedTermsPattern)
	}
}

func TestRedactLaunchProhibitedComplianceTextUsesSentinel(t *testing.T) {
	if got := redactLaunchProhibitedComplianceText("cash prize"); got != LaunchRedactedText {
		t.Fatalf("expected sentinel, got %q", got)
	}
	if got := redactLaunchProhibitedComplianceText("clean copy"); got != "clean copy" {
		t.Fatalf("clean copy must pass through, got %q", got)
	}
}
