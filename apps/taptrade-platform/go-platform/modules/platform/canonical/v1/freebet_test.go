package v1

import (
	"encoding/json"
	"testing"
	"time"
)

func TestFreebetJSONRoundTrip(t *testing.T) {
	now := time.Date(2026, time.March, 4, 17, 0, 0, 0, time.UTC)
	payload := Freebet{
		FreebetID:            "fb:local:001",
		PlayerID:             "u-1",
		CampaignID:           "campaign:welcome",
		Currency:             "USD",
		TotalAmountCents:     1500,
		RemainingAmountCents: 1500,
		MinOddsDecimal:       1.5,
		AppliesToSportIDs:    []string{"sport:football"},
		ExpiresAt:            now.Add(24 * time.Hour),
		Status:               FreebetStatusAvailable,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	var decoded Freebet
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}

	if decoded.FreebetID != payload.FreebetID {
		t.Fatalf("expected freebetId=%s, got %s", payload.FreebetID, decoded.FreebetID)
	}
	if decoded.Status != FreebetStatusAvailable {
		t.Fatalf("expected status=%s, got %s", FreebetStatusAvailable, decoded.Status)
	}
	if decoded.TotalAmountCents != 1500 || decoded.RemainingAmountCents != 1500 {
		t.Fatalf(
			"expected total/remaining amount 1500, got total=%d remaining=%d",
			decoded.TotalAmountCents,
			decoded.RemainingAmountCents,
		)
	}
}

func TestFreebetEntityConstant(t *testing.T) {
	if EntityFreebet == "" {
		t.Fatalf("expected freebet entity constant to be non-empty")
	}
	if string(EntityFreebet) != "freebet" {
		t.Fatalf("unexpected freebet entity value: %s", EntityFreebet)
	}
}
