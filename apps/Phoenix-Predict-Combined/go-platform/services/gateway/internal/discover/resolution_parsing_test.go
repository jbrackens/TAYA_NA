package discover

import "testing"

// These tests cover the per-source resolution parsing logic that lives
// inside the fetchers. Each test exercises the small piece without HTTP:
// we feed a single upstream-shape map[string]any and check that the
// fetcher's parsing branch produces the right Resolution. Round 2 P0-4
// fixed the upstream URL paths so resolved markets actually flow in;
// these tests cover the parsing branch that runs on each row.

// TestPolymarketWinningOutcome covers the threshold logic. Polymarket's
// UMA-style resolutions sometimes leave dust on the loser side, so
// strict ==1.0 misses real resolutions.
func TestPolymarketWinningOutcome(t *testing.T) {
	cases := []struct {
		name     string
		prices   []float64
		want     string
	}{
		{"clean_yes", []float64{1.0, 0.0}, "yes"},
		{"clean_no", []float64{0.0, 1.0}, "no"},
		{"dust_yes", []float64{0.97, 0.03}, "yes"},
		{"dust_no", []float64{0.04, 0.96}, "no"},
		{"below_threshold", []float64{0.85, 0.15}, ""},
		{"actual_50_50", []float64{0.5, 0.5}, ""},
		{"empty", []float64{}, ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := pickWinningOutcome(c.prices, 0.95)
			if got != c.want {
				t.Errorf("pickWinningOutcome(%v) = %q, want %q", c.prices, got, c.want)
			}
		})
	}
}

// TestNormalizeUpstreamCategory covers the alias map + substring fallback.
// Specifically, the substring path catches compound categories like
// "us-politics-2028" that don't match any exact alias key.
func TestNormalizeUpstreamCategory(t *testing.T) {
	cases := []struct {
		raw  string
		want string
	}{
		// exact matches
		{"politics", CatPolitics},
		{"crypto", CatCrypto},
		{"sports", CatSports},
		{"entertainment", CatEntertainment},
		{"tech", CatTech},
		{"economics", CatEconomics},
		// case + whitespace
		{"  Politics  ", CatPolitics},
		{"BUSINESS", CatEconomics},
		// compound (substring)
		{"us-politics-2028", CatPolitics},
		{"crypto-alt-coins", CatCrypto},
		{"sports-betting", CatSports},
		// no match
		{"recipes", ""},
		{"", ""},
		{"  ", ""},
	}
	for _, c := range cases {
		got := normalizeUpstreamCategory(c.raw)
		if got != c.want {
			t.Errorf("normalizeUpstreamCategory(%q) = %q, want %q", c.raw, got, c.want)
		}
	}
}
