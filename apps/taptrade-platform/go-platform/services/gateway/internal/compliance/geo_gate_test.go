package compliance

import "testing"

func TestGeoGateDisabledIsNoOp(t *testing.T) {
	// Default (no env) is disabled -> everything allowed, including US and an
	// unknown jurisdiction. This is the safe ship-default until legal sets policy.
	g := NewGeoGateFromEnv()
	if g.Enabled() {
		t.Fatal("gate must default to disabled")
	}
	for _, c := range []string{"US", "PH", "", "xx"} {
		if allowed, _ := g.Evaluate(c); !allowed {
			t.Fatalf("disabled gate must allow %q", c)
		}
	}
	// A nil gate is also treated as disabled (no panic).
	var nilGate *GeoGate
	if nilGate.Enabled() {
		t.Fatal("nil gate must report disabled")
	}
}

func TestGeoGateBlocklist(t *testing.T) {
	g := &GeoGate{enabled: true, blocked: parseCountrySet("US,CU")}
	cases := map[string]bool{ // country -> allowed?
		"US": false, "us": false, // case-insensitive deny
		"CU": false,
		"PH": true, "GB": true,
		"": false, // missing geo signal fails closed
	}
	for country, want := range cases {
		if allowed, reason := g.Evaluate(country); allowed != want {
			t.Fatalf("Evaluate(%q): allowed=%v want=%v (reason=%q)", country, allowed, want, reason)
		}
	}
}

func TestGeoGateAllowlistModeOverridesBlocklist(t *testing.T) {
	// A non-empty allowlist switches to allowlist mode: only listed countries
	// pass, regardless of the blocklist.
	g := &GeoGate{enabled: true, blocked: parseCountrySet("US"), allowed: parseCountrySet("PH,CA")}
	cases := map[string]bool{
		"PH": true, "ca": true,
		"US": false, "GB": false,
		"": false,
	}
	for country, want := range cases {
		if allowed, _ := g.Evaluate(country); allowed != want {
			t.Fatalf("Evaluate(%q): allowed=%v want=%v", country, allowed, want)
		}
	}
}

func TestGeoGateEnvWiring(t *testing.T) {
	t.Setenv("GEO_GATE_ENABLED", "true")
	t.Setenv("GEO_BLOCKED_COUNTRIES", "US,GB")
	g := NewGeoGateFromEnv()
	if !g.Enabled() {
		t.Fatal("GEO_GATE_ENABLED=true should enable the gate")
	}
	if allowed, _ := g.Evaluate("GB"); allowed {
		t.Fatal("GB should be blocked per env blocklist")
	}
	if allowed, _ := g.Evaluate("PH"); !allowed {
		t.Fatal("PH should be allowed (not on blocklist)")
	}
}
