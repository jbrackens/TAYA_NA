package http

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/prediction"
)

func TestMarketUpdatePayloadExposesPointAliases(t *testing.T) {
	last := 63
	payload := buildMarketUpdatePayload(&prediction.Market{
		ID:                  "market-1",
		Ticker:              "MLBB-FINAL-G1",
		Status:              prediction.MarketStatusOpen,
		YesPriceCents:       64,
		NoPriceCents:        36,
		LastTradePriceCents: &last,
		VolumeCents:         12500,
		OpenInterestCents:   5400,
	})

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal market update payload: %v", err)
	}
	body := string(data)

	for _, want := range []string{
		`"marketId":"market-1"`,
		`"yesPricePointsCents":64`,
		`"noPricePointsCents":36`,
		`"lastTradePricePointsCents":63`,
		`"volumePointsCents":12500`,
		`"openInterestPointsCents":5400`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("market update payload missing %s in %s", want, body)
		}
	}
	for _, retired := range []string{
		`"yesPriceCents"`,
		`"noPriceCents"`,
		`"lastTradePriceCents"`,
		`"volumeCents"`,
		`"openInterestCents"`,
	} {
		if strings.Contains(body, retired) {
			t.Fatalf("market update payload should not emit retired alias %s in %s", retired, body)
		}
	}
}

func TestOrderBookHintPayloadExposesPointAliases(t *testing.T) {
	bestYesBid := 63
	bestYesAsk := 65
	bestNoBid := 34
	bestNoAsk := 37
	lastQuoteAt := time.Date(2026, 6, 25, 12, 0, 0, 0, time.UTC)
	payload := buildOrderBookHintPayload(&prediction.Market{
		ID:              "market-1",
		BestYesBidCents: &bestYesBid,
		BestYesAskCents: &bestYesAsk,
		BestNoBidCents:  &bestNoBid,
		BestNoAskCents:  &bestNoAsk,
		LastQuoteAt:     &lastQuoteAt,
	})

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal order book hint payload: %v", err)
	}
	body := string(data)

	for _, want := range []string{
		`"marketId":"market-1"`,
		`"bestYesBidPointsCents":63`,
		`"bestYesAskPointsCents":65`,
		`"bestNoBidPointsCents":34`,
		`"bestNoAskPointsCents":37`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("order book hint payload missing %s in %s", want, body)
		}
	}
	for _, retired := range []string{
		`"bestYesBidCents"`,
		`"bestYesAskCents"`,
		`"bestNoBidCents"`,
		`"bestNoAskCents"`,
	} {
		if strings.Contains(body, retired) {
			t.Fatalf("order book hint payload should not emit retired alias %s in %s", retired, body)
		}
	}
}

func TestTradeFillPayloadExposesPointAliases(t *testing.T) {
	payload := buildTradeFillPayload(&prediction.Trade{
		ID:         "trade-1",
		MarketID:   "market-1",
		BuyerID:    "buyer-1",
		Side:       prediction.OrderSideYes,
		PriceCents: 64,
		Quantity:   12,
		FeeCents:   5,
		IsAMMTrade: false,
		TradedAt:   time.Unix(1700000000, 0).UTC(),
	})

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal trade fill payload: %v", err)
	}
	body := string(data)

	for _, want := range []string{
		`"tradeId":"trade-1"`,
		`"marketId":"market-1"`,
		`"pricePointsCents":64`,
		`"quantity":12`,
		`"feePointsCents":5`,
		`"notionalPointsCents":768`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("trade fill payload missing %s in %s", want, body)
		}
	}
	for _, retired := range []string{`"priceCents"`, `"feeCents"`} {
		if strings.Contains(body, retired) {
			t.Fatalf("trade fill payload should not emit retired alias %s in %s", retired, body)
		}
	}
}
