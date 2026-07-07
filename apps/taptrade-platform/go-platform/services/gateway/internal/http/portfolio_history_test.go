package http

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"taptrade/gateway/internal/prediction"
)

func TestPortfolioHistoryItemsExposePointAliases(t *testing.T) {
	paidAt := time.Date(2026, 6, 24, 10, 0, 0, 0, time.UTC)
	items := portfolioHistoryItems([]prediction.Payout{{
		ID:           "pay-1",
		MarketID:     "m-1",
		UserID:       "u-1",
		Side:         prediction.OrderSideYes,
		Quantity:     3,
		PnlPoints:    125,
		PayoutPoints: 300,
		PaidAt:       paidAt,
	}})
	if len(items) != 1 {
		t.Fatalf("items len = %d, want 1", len(items))
	}
	if items[0].RealizedPoints != 125 {
		t.Fatalf("realizedPoints = %d", items[0].RealizedPoints)
	}
	if items[0].SettlementPoints != 300 {
		t.Fatalf("settlementPoints = %d", items[0].SettlementPoints)
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
		`"entryPricePoints":0`,
		`"exitPricePoints":0`,
		`"realizedPoints":125`,
		`"settlementPoints":300`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("portfolio history payload missing %s in %s", want, body)
		}
	}
	// Points unit-model (2026-07-07): entry/exitPricePoints are canonical;
	// retired spellings are the cents-era keys and the pnl/payout aliases.
	for _, retired := range []string{`"entryPricePointsCents"`, `"exitPricePointsCents"`, `"payoutPoints"`, `"pnlPoints"`} {
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
		ID:                "settlement-1",
		MarketID:          "m-1",
		Result:            prediction.MarketResultYes,
		TotalPayoutPoints: 700,
	}
	payload := settlementOperationPayload(settlement, []prediction.Payout{
		{ID: "pay-1", PnlPoints: 125, PayoutPoints: 300},
		{ID: "pay-2", PnlPoints: -75, PayoutPoints: 400},
	})

	if payload.Unit != "PTS" {
		t.Fatalf("unit = %q", payload.Unit)
	}
	if payload.Settlement.TotalSettlementPoints != 700 {
		t.Fatalf("settlement total points = %d", payload.Settlement.TotalSettlementPoints)
	}
	if payload.TotalSettlementPoints != 700 {
		t.Fatalf("payload total points = %d", payload.TotalSettlementPoints)
	}
	if len(payload.PointDisbursements) != 2 {
		t.Fatalf("expected pointDisbursements, got %+v", payload)
	}
	if payload.PointDisbursements[0].SettlementPoints != 300 || payload.PointDisbursements[0].RealizedPoints != 125 {
		t.Fatalf("unexpected first point disbursement: %+v", payload.PointDisbursements[0])
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	body := string(raw)
	for _, want := range []string{
		`"pointDisbursements"`,
		`"totalSettlementPoints":700`,
		`"entryPricePoints":0`,
		`"exitPricePoints":0`,
		`"settlementPoints":300`,
		`"realizedPoints":125`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("settlement response payload missing %s in %s", want, body)
		}
	}
	// Points unit-model (2026-07-07): entry/exitPricePoints are canonical;
	// retired spellings are the cents-era keys and the pnl/payout aliases.
	for _, retired := range []string{`"entryPricePointsCents"`, `"exitPricePointsCents"`, `"payouts"`, `"payoutPoints"`, `"pnlPoints"`} {
		if strings.Contains(body, retired) {
			t.Fatalf("settlement operation response should not emit %s: %s", retired, body)
		}
	}
}
