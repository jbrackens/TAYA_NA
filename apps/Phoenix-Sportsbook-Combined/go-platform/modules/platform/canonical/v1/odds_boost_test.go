package v1

import (
	"encoding/json"
	"testing"
	"time"
)

func TestOddsBoostJSONRoundTrip(t *testing.T) {
	now := time.Date(2026, time.March, 4, 18, 0, 0, 0, time.UTC)
	acceptedAt := now.Add(10 * time.Minute)
	payload := OddsBoost{
		OddsBoostID:     "ob:local:001",
		PlayerID:        "u-1",
		CampaignID:      "campaign:odds-boost",
		MarketID:        "m:local:001",
		SelectionID:     "home",
		Currency:        "USD",
		OriginalOdds:    1.9,
		BoostedOdds:     2.1,
		MaxStakeCents:   2500,
		MinOddsDecimal:  1.5,
		Status:          OddsBoostStatusAccepted,
		ExpiresAt:       now.Add(2 * time.Hour),
		AcceptedAt:      &acceptedAt,
		AcceptRequestID: "odds-boost-accept-1",
		AcceptReason:    "user accepted boost",
		CreatedAt:       now,
		UpdatedAt:       acceptedAt,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	var decoded OddsBoost
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}

	if decoded.OddsBoostID != payload.OddsBoostID {
		t.Fatalf("expected oddsBoostId=%s, got %s", payload.OddsBoostID, decoded.OddsBoostID)
	}
	if decoded.Status != OddsBoostStatusAccepted {
		t.Fatalf("expected status=%s, got %s", OddsBoostStatusAccepted, decoded.Status)
	}
	if decoded.BoostedOdds != 2.1 {
		t.Fatalf("expected boosted odds=2.1, got %v", decoded.BoostedOdds)
	}
}

func TestOddsBoostEntityConstant(t *testing.T) {
	if EntityOddsBoost == "" {
		t.Fatalf("expected odds boost entity constant to be non-empty")
	}
	if string(EntityOddsBoost) != "odds_boost" {
		t.Fatalf("unexpected odds boost entity value: %s", EntityOddsBoost)
	}
}
