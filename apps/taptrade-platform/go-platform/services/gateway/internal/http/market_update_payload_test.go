package http

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"taptrade/gateway/internal/prediction"
)

func TestMarketUpdatePayloadExposesPointAliases(t *testing.T) {
	last := 63
	payload := buildMarketUpdatePayload(&prediction.Market{
		ID:                   "market-1",
		Ticker:               "MLBB-FINAL-G1",
		Status:               prediction.MarketStatusOpen,
		YesPricePoints:       64,
		NoPricePoints:        36,
		LastTradePricePoints: &last,
		VolumePoints:         12500,
		OpenInterestPoints:   5400,
	})

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal market update payload: %v", err)
	}
	body := string(data)

	for _, want := range []string{
		`"marketId":"market-1"`,
		`"yesPricePoints":64`,
		`"noPricePoints":36`,
		`"lastTradePricePoints":63`,
		`"volumePoints":12500`,
		`"openInterestPoints":5400`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("market update payload missing %s in %s", want, body)
		}
	}
	for _, retired := range []string{
		`"yesPricePointsCents"`,
		`"noPricePointsCents"`,
		`"lastTradePricePointsCents"`,
		`"volumePointsCents"`,
		`"openInterestPointsCents"`,
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
		ID:               "market-1",
		BestYesBidPoints: &bestYesBid,
		BestYesAskPoints: &bestYesAsk,
		BestNoBidPoints:  &bestNoBid,
		BestNoAskPoints:  &bestNoAsk,
		LastQuoteAt:      &lastQuoteAt,
	})

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal order book hint payload: %v", err)
	}
	body := string(data)

	for _, want := range []string{
		`"marketId":"market-1"`,
		`"bestYesBidPoints":63`,
		`"bestYesAskPoints":65`,
		`"bestNoBidPoints":34`,
		`"bestNoAskPoints":37`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("order book hint payload missing %s in %s", want, body)
		}
	}
	for _, retired := range []string{
		`"bestYesBidPointsCents"`,
		`"bestYesAskPointsCents"`,
		`"bestNoBidPointsCents"`,
		`"bestNoAskPointsCents"`,
	} {
		if strings.Contains(body, retired) {
			t.Fatalf("order book hint payload should not emit retired alias %s in %s", retired, body)
		}
	}
}

func TestTradeFillPayloadExposesPointAliases(t *testing.T) {
	payload := buildTradeFillPayload(&prediction.Trade{
		ID:          "trade-1",
		MarketID:    "market-1",
		BuyerID:     "buyer-1",
		Side:        prediction.OrderSideYes,
		PricePoints: 64,
		Quantity:    12,
		FeePoints:   5,
		IsAMMTrade:  false,
		TradedAt:    time.Unix(1700000000, 0).UTC(),
	})

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal trade fill payload: %v", err)
	}
	body := string(data)

	for _, want := range []string{
		`"tradeId":"trade-1"`,
		`"marketId":"market-1"`,
		`"pricePoints":64`,
		`"quantity":12`,
		`"feePoints":5`,
		`"notionalPoints":768`,
		`"unit":"PTS"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("trade fill payload missing %s in %s", want, body)
		}
	}
	for _, retired := range []string{`"pricePointsCents"`, `"feePointsCents"`} {
		if strings.Contains(body, retired) {
			t.Fatalf("trade fill payload should not emit retired alias %s in %s", retired, body)
		}
	}
}
