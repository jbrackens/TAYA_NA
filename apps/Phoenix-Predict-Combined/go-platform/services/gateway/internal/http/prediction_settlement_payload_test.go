package http

import (
	"testing"
	"time"

	"phoenix-revival/gateway/internal/prediction"
)

func TestSettlementRecordPayloadRedactsLegacyUnsafeOverrideReason(t *testing.T) {
	overrideReason := "cash payout override"
	settledAt := time.Date(2026, 6, 30, 18, 12, 0, 0, time.UTC)

	payload := settlementRecordPayload(&prediction.Settlement{
		ID:                "settlement-legacy-copy",
		MarketID:          "market-1",
		Result:            prediction.MarketResultYes,
		AttestationSource: "admin-manual",
		SettledAt:         settledAt,
		PositionsSettled:  2,
		OverrideReason:    &overrideReason,
		TotalPayoutCents:  2500,
	})

	if payload.OverrideReason == nil || *payload.OverrideReason != launchRedactedUserText {
		t.Fatalf("expected unsafe override reason redacted, got %+v", payload.OverrideReason)
	}
	if payload.TotalSettlementPointsCents != 2500 || payload.Unit != "PTS" {
		t.Fatalf("expected point settlement fields preserved, got %+v", payload)
	}
}
