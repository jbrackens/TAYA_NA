package http

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/prediction"
)

func TestPortfolioHistoryItemsExposePointAliases(t *testing.T) {
	paidAt := time.Date(2026, 6, 24, 10, 0, 0, 0, time.UTC)
	items := portfolioHistoryItems([]prediction.Payout{{
		ID:          "pay-1",
		MarketID:    "m-1",
		UserID:      "u-1",
		Side:        prediction.OrderSideYes,
		Quantity:    3,
		PnlCents:    125,
		PayoutCents: 300,
		PaidAt:      paidAt,
	}})
	if len(items) != 1 {
		t.Fatalf("items len = %d, want 1", len(items))
	}
	if items[0].RealizedPointsCents != 125 {
		t.Fatalf("realizedPointsCents = %d", items[0].RealizedPointsCents)
	}
	if items[0].SettlementPointsCents != 300 {
		t.Fatalf("settlementPointsCents = %d", items[0].SettlementPointsCents)
	}
	if items[0].Unit != "PTS" {
		t.Fatalf("unit = %q", items[0].Unit)
	}

	raw, err := json.Marshal(items[0])
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	body := string(raw)
	for _, want := range []string{
		`"entryPricePointsCents":0`,
		`"exitPricePointsCents":0`,
		`"realizedPointsCents":125`,
		`"settlementPointsCents":300`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("portfolio history payload missing %s in %s", want, body)
		}
	}
	for _, retired := range []string{`"entryPriceCents"`, `"exitPriceCents"`, `"payoutCents"`, `"pnlCents"`} {
		if strings.Contains(body, retired) {
			t.Fatalf("portfolio history payload should not emit %s: %s", retired, body)
		}
	}
}

func TestPortfolioHistoryItemsNilIsEmptySlice(t *testing.T) {
	items := portfolioHistoryItems(nil)
	if items == nil {
		t.Fatal("nil payouts should encode as an empty JSON array, not null")
	}
	if len(items) != 0 {
		t.Fatalf("items len = %d, want 0", len(items))
	}
}

func TestSettlementOperationPayloadExposesPointAliases(t *testing.T) {
	settlement := &prediction.Settlement{
		ID:               "settlement-1",
		MarketID:         "m-1",
		Result:           prediction.MarketResultYes,
		TotalPayoutCents: 700,
	}
	payload := settlementOperationPayload(settlement, []prediction.Payout{
		{ID: "pay-1", PnlCents: 125, PayoutCents: 300},
		{ID: "pay-2", PnlCents: -75, PayoutCents: 400},
	})

	if payload.Unit != "PTS" {
		t.Fatalf("unit = %q", payload.Unit)
	}
	if payload.Settlement.TotalSettlementPointsCents != 700 {
		t.Fatalf("settlement total points = %d", payload.Settlement.TotalSettlementPointsCents)
	}
	if payload.TotalSettlementPointsCents != 700 {
		t.Fatalf("payload total points = %d", payload.TotalSettlementPointsCents)
	}
	if len(payload.PointDisbursements) != 2 {
		t.Fatalf("expected pointDisbursements, got %+v", payload)
	}
	if payload.PointDisbursements[0].SettlementPointsCents != 300 || payload.PointDisbursements[0].RealizedPointsCents != 125 {
		t.Fatalf("unexpected first point disbursement: %+v", payload.PointDisbursements[0])
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	body := string(raw)
	for _, want := range []string{
		`"pointDisbursements"`,
		`"totalSettlementPointsCents":700`,
		`"entryPricePointsCents":0`,
		`"exitPricePointsCents":0`,
		`"settlementPointsCents":300`,
		`"realizedPointsCents":125`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("settlement response payload missing %s in %s", want, body)
		}
	}
	for _, retired := range []string{`"entryPriceCents"`, `"exitPriceCents"`, `"payouts"`, `"payoutCents"`, `"pnlCents"`} {
		if strings.Contains(body, retired) {
			t.Fatalf("settlement operation response should not emit %s: %s", retired, body)
		}
	}
}
