package prediction

import "testing"

func TestPriceWithinBounds(t *testing.T) {
	cases := []struct {
		in   int
		want bool
	}{
		{0, false}, {1, true}, {50, true}, {99, true}, {100, false}, {-1, false},
	}
	for _, c := range cases {
		if got := PriceWithinBounds(c.in); got != c.want {
			t.Errorf("PriceWithinBounds(%d) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestCalculateTakerFeeCents(t *testing.T) {
	// Default Hula Na rate: 500 bps (5%). Peak fee at p=50.
	// floor(500 * 50 * 50 * q / 1_000_000) = floor(1.25 * q)
	cases := []struct {
		name                    string
		bps, price, qty         int
		want                    int64
	}{
		{"peak at p=50, q=10", 500, 50, 10, 12},   // floor(12.5) = 12
		{"peak at p=50, q=1", 500, 50, 1, 1},      // floor(1.25) = 1
		{"low p=10, q=100", 500, 10, 100, 45},     // 500*10*90*100/1e6 = 45
		{"zero qty", 500, 50, 0, 0},
		{"zero rate", 0, 50, 100, 0},
		{"price at lower bound (still valid)", 500, 1, 100, 4}, // 500*1*99*100/1e6=4 (floor)
		{"price out of bounds high", 500, 100, 10, 0},
		{"price out of bounds low", 500, 0, 10, 0},
		{"negative qty", 500, 50, -10, 0},
		{"3% taker rate", 300, 50, 10, 7}, // 300*50*50*10/1e6 = 7 (floor 7.5)
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := CalculateTakerFeeCents(c.bps, c.price, c.qty)
			if got != c.want {
				t.Errorf("CalculateTakerFeeCents(%d,%d,%d) = %d, want %d",
					c.bps, c.price, c.qty, got, c.want)
			}
		})
	}
}

func TestAverageCostAfterBuy(t *testing.T) {
	cases := []struct {
		name                                                   string
		existingQty, existingAvg, addQty, addPrice, want int
	}{
		{"empty position", 0, 0, 10, 50, 50},
		{"add to empty avg", 0, 99, 5, 30, 30}, // existingAvg ignored when qty=0
		{"zero-add", 10, 50, 0, 99, 50},
		{"equal-weight add", 10, 50, 10, 60, 55},
		{"weighted heavier existing", 100, 50, 10, 60, 50}, // floor(5600/110)=50
		{"weighted heavier new", 10, 50, 100, 60, 59},      // floor(6500/110)=59
		{"negative-add", 10, 50, -5, 99, 50},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := AverageCostAfterBuy(c.existingQty, c.existingAvg, c.addQty, c.addPrice)
			if got != c.want {
				t.Errorf("AverageCostAfterBuy(%d,%d,%d,%d) = %d, want %d",
					c.existingQty, c.existingAvg, c.addQty, c.addPrice, got, c.want)
			}
		})
	}
}

func TestRealizedPnLOnSell(t *testing.T) {
	cases := []struct {
		name                                  string
		qty, avgCents, sellPrice int
		want                     int64
	}{
		{"profit", 10, 30, 50, 200},
		{"loss", 10, 70, 50, -200},
		{"breakeven", 10, 50, 50, 0},
		{"zero qty", 0, 50, 99, 0},
		{"negative qty", -1, 50, 99, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := RealizedPnLOnSell(c.qty, c.avgCents, c.sellPrice)
			if got != c.want {
				t.Errorf("RealizedPnLOnSell(%d,%d,%d) = %d, want %d",
					c.qty, c.avgCents, c.sellPrice, got, c.want)
			}
		})
	}
}

func TestIssuanceFillFeasible(t *testing.T) {
	cases := []struct {
		name             string
		taker, maker int
		want         bool
	}{
		{"sum exactly 100", 60, 40, true},
		{"sum > 100", 65, 40, true},
		{"sum < 100", 55, 40, false},
		{"both at extremes (1+99=100)", 1, 99, true},
		{"taker out of bounds", 0, 99, false},
		{"maker out of bounds", 99, 100, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := IssuanceFillFeasible(c.taker, c.maker); got != c.want {
				t.Errorf("IssuanceFillFeasible(%d,%d) = %v, want %v",
					c.taker, c.maker, got, c.want)
			}
		})
	}
}

func TestComplementaryTakerPriceCents(t *testing.T) {
	if got := ComplementaryTakerPriceCents(42); got != 58 {
		t.Errorf("ComplementaryTakerPriceCents(42) = %d, want 58", got)
	}
	if got := ComplementaryTakerPriceCents(30); got != 70 {
		t.Errorf("ComplementaryTakerPriceCents(30) = %d, want 70", got)
	}
}

func TestSecondaryTransferCanCross(t *testing.T) {
	if !SecondaryTransferCanCross(60, 55) {
		t.Error("buy 60 should cross sell 55")
	}
	if SecondaryTransferCanCross(50, 60) {
		t.Error("buy 50 should not cross sell 60")
	}
	if !SecondaryTransferCanCross(60, 60) {
		t.Error("buy 60 should cross sell 60 (equal)")
	}
}

func TestCollateralPoolDelta(t *testing.T) {
	if got := CollateralPoolDelta(TradeKindIssuance, 10); got != 1000 {
		t.Errorf("issuance × 10 = %d, want 1000", got)
	}
	if got := CollateralPoolDelta(TradeKindSecondary, 10); got != 0 {
		t.Errorf("secondary × 10 = %d, want 0", got)
	}
	if got := CollateralPoolDelta(TradeKindIssuance, 0); got != 0 {
		t.Errorf("issuance × 0 = %d, want 0", got)
	}
}

func TestApplyPositionMutation_BuyAccumulatesAvg(t *testing.T) {
	// Existing 10 shares at avg 40. Buy 10 more at 60 → new avg = 50.
	p := &Position{Quantity: 10, AvgPriceCents: 40, TotalCostCents: 400}
	ApplyPositionMutation(p, PositionMutation{DeltaQty: 10, FillPriceCents: 60, IsSell: false})
	if p.Quantity != 20 || p.AvgPriceCents != 50 {
		t.Errorf("after buy: qty=%d avg=%d, want 20/50", p.Quantity, p.AvgPriceCents)
	}
	if p.TotalCostCents != 1000 {
		t.Errorf("total_cost = %d, want 1000", p.TotalCostCents)
	}
}

func TestApplyPositionMutation_SellRealizesPnL(t *testing.T) {
	// Existing 20 shares at avg 50. Sell 10 at 65 → +150 PnL, qty=10, avg unchanged.
	p := &Position{Quantity: 20, AvgPriceCents: 50, TotalCostCents: 1000}
	ApplyPositionMutation(p, PositionMutation{DeltaQty: -10, FillPriceCents: 65, IsSell: true})
	if p.Quantity != 10 || p.AvgPriceCents != 50 {
		t.Errorf("after sell: qty=%d avg=%d, want 10/50", p.Quantity, p.AvgPriceCents)
	}
	if p.RealizedPnlCents != 150 {
		t.Errorf("realised pnl = %d, want 150", p.RealizedPnlCents)
	}
	if p.TotalCostCents != 500 {
		t.Errorf("total_cost = %d, want 500", p.TotalCostCents)
	}
}

func TestApplyPositionMutation_SellLossPnL(t *testing.T) {
	// Existing 10 at avg 70. Sell 10 at 50 → -200 PnL.
	p := &Position{Quantity: 10, AvgPriceCents: 70, TotalCostCents: 700}
	ApplyPositionMutation(p, PositionMutation{DeltaQty: -10, FillPriceCents: 50, IsSell: true})
	if p.Quantity != 0 {
		t.Errorf("qty after full sell = %d, want 0", p.Quantity)
	}
	if p.RealizedPnlCents != -200 {
		t.Errorf("realised pnl = %d, want -200", p.RealizedPnlCents)
	}
}

func TestApplyPositionMutation_MultipleBuysProgressive(t *testing.T) {
	// Three buys layered: 10@40, then 10@50, then 10@60.
	// After 1st: qty=10, avg=40
	// After 2nd: qty=20, avg=45
	// After 3rd: qty=30, avg=50
	p := &Position{}
	ApplyPositionMutation(p, PositionMutation{DeltaQty: 10, FillPriceCents: 40})
	ApplyPositionMutation(p, PositionMutation{DeltaQty: 10, FillPriceCents: 50})
	ApplyPositionMutation(p, PositionMutation{DeltaQty: 10, FillPriceCents: 60})
	if p.Quantity != 30 || p.AvgPriceCents != 50 {
		t.Errorf("after 3 buys: qty=%d avg=%d, want 30/50", p.Quantity, p.AvgPriceCents)
	}
}

func TestAvailableQuantity(t *testing.T) {
	p := &Position{Quantity: 100, ReservedQuantity: 30}
	if got := AvailableQuantity(p); got != 70 {
		t.Errorf("100 - 30 = %d, want 70", got)
	}
	if got := AvailableQuantity(nil); got != 0 {
		t.Errorf("nil position = %d, want 0", got)
	}
	overReserved := &Position{Quantity: 10, ReservedQuantity: 50}
	if got := AvailableQuantity(overReserved); got != 0 {
		t.Errorf("over-reserved = %d, want 0 (clamped)", got)
	}
}
