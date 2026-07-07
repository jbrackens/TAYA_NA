package discover

import (
	"os"
	"testing"
)

// TestFetchKalshi_Live hits the real Kalshi API. Opt-in only (network,
// upstream-dependent): KALSHI_LIVE_TEST=1 go test ./internal/discover -run Live
//
// Exists because the 2026-07-07 incident was invisible to offline tests:
// the code was "correct" against the old /markets shape while upstream
// content drifted to 100% MVE parlays. When the catalog zeroes out again,
// run this first — it answers "is it us or them" in one command.
func TestFetchKalshi_Live(t *testing.T) {
	if os.Getenv("KALSHI_LIVE_TEST") == "" {
		t.Skip("set KALSHI_LIVE_TEST=1 to hit the real Kalshi API")
	}
	resetBudget()

	ms, err := FetchKalshi(200)
	if err != nil {
		t.Fatalf("FetchKalshi(200): %v", err)
	}
	if len(ms) < 50 {
		t.Fatalf("suspiciously few markets from live API: %d (want ≥50)", len(ms))
	}

	var withPrices, withCategory, resolved int
	for _, m := range ms {
		if m.ExternalID == "" {
			t.Fatalf("market with empty ExternalID: %+v", m)
		}
		if len(m.Prices) > 0 {
			withPrices++
		}
		if m.Category != "" {
			withCategory++
		}
		if m.Resolution != nil {
			resolved++
		}
	}
	t.Logf("live: %d markets, %d with prices, %d with category, %d resolved",
		len(ms), withPrices, withCategory, resolved)
	if resolved == 0 {
		t.Error("settled pass returned no resolutions — resolution drip is broken")
	}
	if withCategory == 0 {
		t.Error("no market carried a category — event-level category injection broken")
	}
}
