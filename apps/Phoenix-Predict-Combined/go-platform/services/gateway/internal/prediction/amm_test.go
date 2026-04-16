package prediction

import (
	"math"
	"testing"
)

func TestAMMPriceYesStartsAt50(t *testing.T) {
	amm := &AMMEngine{}
	// Equal shares → 50/50 price
	p := amm.PriceYes(0, 0, 100)
	if math.Abs(p-0.5) > 0.001 {
		t.Errorf("expected ~0.5, got %f", p)
	}
}

func TestAMMPriceMovesWithShares(t *testing.T) {
	amm := &AMMEngine{}
	b := 100.0

	// More YES shares → higher YES price
	p1 := amm.PriceYes(50, 0, b)
	p2 := amm.PriceYes(0, 0, b)
	if p1 <= p2 {
		t.Errorf("expected YES price to increase with more YES shares: %f <= %f", p1, p2)
	}

	// More NO shares → lower YES price
	p3 := amm.PriceYes(0, 50, b)
	if p3 >= p2 {
		t.Errorf("expected YES price to decrease with more NO shares: %f >= %f", p3, p2)
	}
}

func TestAMMPricesSumTo100Cents(t *testing.T) {
	amm := &AMMEngine{}
	cases := []struct {
		qYes, qNo, b float64
	}{
		{0, 0, 100},
		{50, 0, 100},
		{0, 50, 100},
		{25, 75, 100},
		{100, 10, 50},
		{0, 0, 1},
	}
	for _, tc := range cases {
		yes := amm.PriceCentsYes(tc.qYes, tc.qNo, tc.b)
		no := amm.PriceCentsNo(tc.qYes, tc.qNo, tc.b)
		if yes+no != 100 {
			t.Errorf("prices don't sum to 100: YES=%d NO=%d (qYes=%f qNo=%f b=%f)",
				yes, no, tc.qYes, tc.qNo, tc.b)
		}
	}
}

func TestAMMCostPositive(t *testing.T) {
	amm := &AMMEngine{}
	cost, err := amm.CostForTrade(0, 0, 100, OrderSideYes, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cost <= 0 {
		t.Errorf("expected positive cost, got %d", cost)
	}
}

func TestAMMCostInvalidInputs(t *testing.T) {
	amm := &AMMEngine{}

	_, err := amm.CostForTrade(0, 0, 100, OrderSideYes, 0)
	if err == nil {
		t.Error("expected error for zero quantity")
	}

	_, err = amm.CostForTrade(0, 0, 0, OrderSideYes, 10)
	if err == nil {
		t.Error("expected error for zero liquidity param")
	}

	_, err = amm.CostForTrade(0, 0, 100, "invalid", 10)
	if err == nil {
		t.Error("expected error for invalid side")
	}
}

func TestAMMCostSymmetric(t *testing.T) {
	amm := &AMMEngine{}
	// At 50/50, buying YES and NO should cost the same
	costYes, _ := amm.CostForTrade(0, 0, 100, OrderSideYes, 10)
	costNo, _ := amm.CostForTrade(0, 0, 100, OrderSideNo, 10)
	if costYes != costNo {
		t.Errorf("expected symmetric cost at 50/50: YES=%d NO=%d", costYes, costNo)
	}
}

func TestAMMCostIncreasesWithQuantity(t *testing.T) {
	amm := &AMMEngine{}
	cost1, _ := amm.CostForTrade(0, 0, 100, OrderSideYes, 1)
	cost10, _ := amm.CostForTrade(0, 0, 100, OrderSideYes, 10)
	cost100, _ := amm.CostForTrade(0, 0, 100, OrderSideYes, 100)

	if cost10 <= cost1 {
		t.Errorf("expected cost10 > cost1: %d <= %d", cost10, cost1)
	}
	if cost100 <= cost10 {
		t.Errorf("expected cost100 > cost10: %d <= %d", cost100, cost10)
	}
}

func TestAMMSlippageIncreasesWithLargerOrders(t *testing.T) {
	amm := &AMMEngine{}
	b := 100.0

	// Per-unit cost should increase for larger orders (slippage)
	cost1, _ := amm.CostForTrade(0, 0, b, OrderSideYes, 1)
	cost10, _ := amm.CostForTrade(0, 0, b, OrderSideYes, 10)

	perUnit1 := float64(cost1)
	perUnit10 := float64(cost10) / 10.0

	if perUnit10 <= perUnit1 {
		t.Errorf("expected higher per-unit cost for larger order (slippage): %f <= %f",
			perUnit10, perUnit1)
	}
}

func TestAMMHigherBMeansLowerSlippage(t *testing.T) {
	amm := &AMMEngine{}
	qty := 50

	costLowB, _ := amm.CostForTrade(0, 0, 10, OrderSideYes, qty)
	costHighB, _ := amm.CostForTrade(0, 0, 1000, OrderSideYes, qty)

	// Higher b → more liquidity → lower cost for same quantity
	if costHighB >= costLowB {
		t.Errorf("expected lower cost with higher b: highB=%d >= lowB=%d", costHighB, costLowB)
	}
}

func TestAMMFeeCalculation(t *testing.T) {
	amm := &AMMEngine{}

	// Zero fee rate → zero fee
	fee := amm.CalculateFee(50, 10, 0)
	if fee != 0 {
		t.Errorf("expected 0 fee for 0 bps, got %d", fee)
	}

	// At 50¢ (0.5), min(p, 1-p) = 0.5
	// Fee = 200/10000 * 0.5 * 10 * 100 = 10
	fee = amm.CalculateFee(50, 10, 200)
	if fee != 10 {
		t.Errorf("expected fee=10, got %d", fee)
	}

	// Fee is symmetric: at 20¢ vs 80¢, min is the same
	fee20 := amm.CalculateFee(20, 10, 200)
	fee80 := amm.CalculateFee(80, 10, 200)
	if fee20 != fee80 {
		t.Errorf("expected symmetric fees: fee20=%d fee80=%d", fee20, fee80)
	}
}

func TestAMMExecuteTrade(t *testing.T) {
	amm := &AMMEngine{}
	market := &Market{
		Ticker:            "TEST-YES",
		Status:            MarketStatusOpen,
		YesPriceCents:     50,
		NoPriceCents:      50,
		AMMYesShares:      0,
		AMMNoShares:       0,
		AMMLiquidityParam: 100,
		FeeRateBps:        0,
	}

	cost, fee, err := amm.ExecuteTrade(market, OrderSideYes, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cost <= 0 {
		t.Errorf("expected positive cost, got %d", cost)
	}
	if fee != 0 {
		t.Errorf("expected 0 fee (0 bps), got %d", fee)
	}
	if market.AMMYesShares != 10 {
		t.Errorf("expected 10 YES shares, got %f", market.AMMYesShares)
	}
	if market.YesPriceCents <= 50 {
		t.Errorf("expected YES price to increase above 50, got %d", market.YesPriceCents)
	}
	if market.YesPriceCents+market.NoPriceCents != 100 {
		t.Errorf("prices don't sum to 100: %d + %d", market.YesPriceCents, market.NoPriceCents)
	}
	if market.VolumeCents != cost {
		t.Errorf("expected volume=%d, got %d", cost, market.VolumeCents)
	}
}

func TestAMMExecuteTradeRejectsClosedMarket(t *testing.T) {
	amm := &AMMEngine{}
	market := &Market{
		Status:            MarketStatusClosed,
		AMMLiquidityParam: 100,
	}

	_, _, err := amm.ExecuteTrade(market, OrderSideYes, 10)
	if err == nil {
		t.Error("expected error for closed market")
	}
}

func TestAMMPreviewTrade(t *testing.T) {
	amm := &AMMEngine{}
	market := &Market{
		Status:            MarketStatusOpen,
		YesPriceCents:     50,
		NoPriceCents:      50,
		AMMYesShares:      0,
		AMMNoShares:       0,
		AMMLiquidityParam: 100,
		FeeRateBps:        0,
	}

	preview, err := amm.PreviewTrade(market, OrderSideYes, OrderActionBuy, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if preview.TotalCost <= 0 {
		t.Errorf("expected positive total cost, got %d", preview.TotalCost)
	}
	if preview.MaxProfit <= 0 {
		t.Errorf("expected positive max profit, got %d", preview.MaxProfit)
	}
	if preview.NewYesPrice <= 50 {
		t.Errorf("expected new YES price > 50, got %d", preview.NewYesPrice)
	}
	if preview.NewYesPrice+preview.NewNoPrice != 100 {
		t.Errorf("new prices don't sum to 100: %d + %d", preview.NewYesPrice, preview.NewNoPrice)
	}
}
