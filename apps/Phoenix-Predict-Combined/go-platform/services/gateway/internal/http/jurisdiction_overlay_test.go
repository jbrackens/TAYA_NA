package http

import (
	stdhttp "net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/prediction"
)

// TestCheckMarketJurisdictionOverlay verifies the per-market overlay (P3-07)
// reads the trusted-edge country header and applies the policy: a deny-US market
// blocks a US user (who is allowed globally) but permits a GB user; a nil policy
// is always a no-op.
func TestCheckMarketJurisdictionOverlay(t *testing.T) {
	deny := &prediction.MarketJurisdictionPolicy{
		Mode:      prediction.JurisdictionDeny,
		Countries: []string{"US"},
	}

	withCountry := func(c string) *stdhttp.Request {
		r := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/orders", nil)
		r.Header.Set("CF-IPCountry", c)
		return r
	}

	if err := checkMarketJurisdiction(withCountry("US"), "u-1", "mkt-1", deny); err == nil {
		t.Fatal("US user must be denied by a deny-US market")
	}
	if err := checkMarketJurisdiction(withCountry("GB"), "u-1", "mkt-1", deny); err != nil {
		t.Fatalf("GB user must be allowed by a deny-US market: %v", err)
	}
	// nil policy: no overlay, always allowed (even for a country with no header).
	if err := checkMarketJurisdiction(withCountry("US"), "u-1", "mkt-1", nil); err != nil {
		t.Fatalf("nil policy must allow: %v", err)
	}

	allow := &prediction.MarketJurisdictionPolicy{
		Mode:      prediction.JurisdictionAllow,
		Countries: []string{"GB", "PH"},
	}
	if err := checkMarketJurisdiction(withCountry("US"), "u-1", "mkt-1", allow); err == nil {
		t.Fatal("US user must be denied by an allow-[GB,PH] market")
	}
	if err := checkMarketJurisdiction(withCountry("ph"), "u-1", "mkt-1", allow); err != nil {
		t.Fatalf("PH user must be allowed by an allow-[GB,PH] market (case-insensitive): %v", err)
	}
}
