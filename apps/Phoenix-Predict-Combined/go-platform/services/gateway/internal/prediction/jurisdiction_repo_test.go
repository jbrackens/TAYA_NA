package prediction

import (
	"context"
	"testing"
)

// TestMarketJurisdictionPolicyRoundTrip exercises the JSONB store: set, read
// back, enforce, clear, and the unknown-market behavior.
//
// Run with: GATEWAY_DB_DSN=... go test ./internal/prediction/ -run TestMarketJurisdictionPolicyRoundTrip -v
func TestMarketJurisdictionPolicyRoundTrip(t *testing.T) {
	db := raceTestDB(t)
	repo := NewSQLRepository(db)
	ctx := context.Background()
	marketID := seedClosedMarketWithPositions(t, db, "jpolicy")

	// No policy initially.
	if p, err := repo.GetMarketJurisdictionPolicy(ctx, marketID); err != nil || p != nil {
		t.Fatalf("initial get: want (nil,nil), got (%+v,%v)", p, err)
	}

	// Set deny US/FR, read back.
	want := &MarketJurisdictionPolicy{Mode: JurisdictionDeny, Countries: []string{"US", "FR"}}
	if err := repo.SetMarketJurisdictionPolicy(ctx, marketID, want); err != nil {
		t.Fatalf("set: %v", err)
	}
	got, err := repo.GetMarketJurisdictionPolicy(ctx, marketID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil || got.Mode != JurisdictionDeny || len(got.Countries) != 2 {
		t.Fatalf("round-trip mismatch: %+v", got)
	}

	// Enforcement against the stored policy: US denied, GB allowed.
	if allowed, _ := EvaluateMarketJurisdiction(got, "US"); allowed {
		t.Fatal("US must be denied by the deny-US/FR market")
	}
	if allowed, _ := EvaluateMarketJurisdiction(got, "GB"); !allowed {
		t.Fatal("GB must be allowed by the deny-US/FR market")
	}

	// Clear it.
	if err := repo.SetMarketJurisdictionPolicy(ctx, marketID, nil); err != nil {
		t.Fatalf("clear: %v", err)
	}
	if cleared, err := repo.GetMarketJurisdictionPolicy(ctx, marketID); err != nil || cleared != nil {
		t.Fatalf("after clear: want (nil,nil), got (%+v,%v)", cleared, err)
	}

	// Unknown market: Get → (nil,nil); Set → error.
	const missing = "00000000-0000-0000-0000-000000000000"
	if p, err := repo.GetMarketJurisdictionPolicy(ctx, missing); err != nil || p != nil {
		t.Fatalf("unknown-market get: want (nil,nil), got (%+v,%v)", p, err)
	}
	if err := repo.SetMarketJurisdictionPolicy(ctx, missing, want); err == nil {
		t.Fatal("set on unknown market must error")
	}
}
