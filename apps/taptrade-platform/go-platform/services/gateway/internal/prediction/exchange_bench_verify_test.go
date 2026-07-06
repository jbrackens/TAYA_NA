package prediction

import (
	"testing"
	"time"
)

// TestBench_VerifyFullCross_Produces100Trades is a sanity check on the
// FullCross benchmark — confirms it actually walks the whole book and
// produces N trades. Without this, a regression that short-circuited
// the match loop would silently make the bench look 10× faster.
func TestBench_VerifyFullCross_Produces100Trades(t *testing.T) {
	market := makeMarket()
	makers := buildBook(100, 10)
	takerPrice := 99
	taker := Order{
		ID:                "taker-1",
		UserID:            "taker-user",
		MarketID:          "market-x",
		Side:              OrderSideYes,
		Action:            OrderActionBuy,
		OrderType:         OrderTypeLimit,
		PriceCents:        &takerPrice,
		Quantity:          1000,
		RemainingQuantity: 1000,
		Status:            OrderStatusPending,
		TimeInForce:       TIFGTC,
		SelfMatchAction:   SelfMatchCancelTaker,
	}
	engine := NewExchangeEngine()
	plan, err := engine.BuildPlan(MatchInput{
		Market:          market,
		Taker:           taker,
		MakersSecondary: makers,
		Now:             time.Now(),
		IDFactory:       counterIDs(),
	})
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}
	if got := len(plan.Trades); got != 100 {
		t.Errorf("trades=%d, want 100", got)
	}
	if got := len(plan.MakerUpdates); got != 100 {
		t.Errorf("maker_updates=%d, want 100", got)
	}
	if plan.Taker.RemainingQuantity != 0 {
		t.Errorf("taker remaining=%d, want 0 (full fill)", plan.Taker.RemainingQuantity)
	}
	if plan.Taker.FilledQuantity != 1000 {
		t.Errorf("taker filled=%d, want 1000", plan.Taker.FilledQuantity)
	}
}
