package prediction

// Regression: market buy must issuance-match against opposite-side Buy
// makers. Before this path was opened, the engine had a
// `taker.PricePoints != nil` guard that silently skipped the issuance
// loop for market orders — every market buy on a market with only
// SMM-provided Buy-NO quotes returned "cancelled — no matching
// liquidity" even when feasible fills were sitting on the book.
//
// Surfaced during /qa on 2026-05-11 against an SMM-quoted local market.
// Fix: treat a market buy as having an implied taker_limit =
// MaxTickPricePoints (99) for the IssuanceFillFeasible check.

import (
	"testing"
	"time"
)

// TestBuildPlan_MarketBuyIssuanceCrossesBuyNoMaker is the headline
// regression test: a market Buy-YES taker should cross a Buy-NO maker
// at 70¢ via complementary issuance, filling at par - 70 = 30¢ per
// share. The collateral pool grows by 100 × qty.
func TestBuildPlan_MarketBuyIssuanceCrossesBuyNoMaker(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	// Taker: market Buy YES, qty 5. No PricePoints.
	taker := Order{
		ID:                "taker-1",
		UserID:            "alice",
		MarketID:          "market-x",
		Side:              OrderSideYes,
		Action:            OrderActionBuy,
		OrderType:         OrderTypeMarket,
		PricePoints:       nil, // <-- the critical input
		Quantity:          5,
		RemainingQuantity: 5,
		Status:            OrderStatusPending,
		TimeInForce:       TIFIOC, // market orders behave as IOC
		SelfMatchAction:   SelfMatchCancelTaker,
	}
	// Maker: Buy NO at 70¢, qty 100 (plenty of depth).
	makerPrice := 70
	maker := Order{
		ID:                "maker-1",
		UserID:            "smm-bot",
		MarketID:          "market-x",
		Side:              OrderSideNo,
		Action:            OrderActionBuy,
		OrderType:         OrderTypeLimit,
		PricePoints:       &makerPrice,
		Quantity:          100,
		RemainingQuantity: 100,
		Status:            OrderStatusOpen,
		TimeInForce:       TIFGTC,
		SelfMatchAction:   SelfMatchCancelTaker,
	}

	plan, err := e.BuildPlan(MatchInput{
		Market:         market,
		Taker:          taker,
		MakersIssuance: []Order{maker},
		Now:            time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC),
		IDFactory:      counterIDs(),
	})
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}

	if plan.Taker.FilledQuantity != 5 {
		t.Errorf("expected filledQuantity=5, got %d", plan.Taker.FilledQuantity)
	}
	if plan.Taker.Status != OrderStatusFilled {
		t.Errorf("expected status=filled, got %s", plan.Taker.Status)
	}
	if len(plan.Trades) != 2 {
		t.Fatalf("expected 2 trade rows (issuance pair), got %d", len(plan.Trades))
	}
	// Find the taker's trade row (Side=yes) and verify the implied price.
	var takerTrade *Trade
	for i := range plan.Trades {
		if plan.Trades[i].Side == OrderSideYes {
			takerTrade = &plan.Trades[i]
		}
	}
	if takerTrade == nil {
		t.Fatal("no taker trade row (side=yes)")
	}
	// Taker pays par - makerLimit = 100 - 70 = 30¢
	if takerTrade.PricePoints != 30 {
		t.Errorf("taker should pay 30 (=100-70), got %d", takerTrade.PricePoints)
	}
	if takerTrade.TradeKind != TradeKindIssuance {
		t.Errorf("expected TradeKindIssuance, got %s", takerTrade.TradeKind)
	}
	// Collateral pool grows by 100 × 5 = 500.
	if plan.Market.CollateralPoolPoints != 500 {
		t.Errorf("expected pool delta +500, got %d", plan.Market.CollateralPoolPoints)
	}
}

// TestBuildPlan_MarketBuyIssuance_NoMakers — market buy with empty
// issuance book still returns gracefully (no panic, no fill). Catches
// a regression where the new code path forgets the empty-slice case.
func TestBuildPlan_MarketBuyIssuance_NoMakers(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := Order{
		ID:                "taker-2",
		UserID:            "alice",
		MarketID:          "market-x",
		Side:              OrderSideYes,
		Action:            OrderActionBuy,
		OrderType:         OrderTypeMarket,
		PricePoints:       nil,
		Quantity:          5,
		RemainingQuantity: 5,
		Status:            OrderStatusPending,
		TimeInForce:       TIFIOC,
		SelfMatchAction:   SelfMatchCancelTaker,
	}
	plan, err := e.BuildPlan(MatchInput{
		Market:         market,
		Taker:          taker,
		MakersIssuance: nil,
		Now:            time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC),
		IDFactory:      counterIDs(),
	})
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}
	if len(plan.Trades) != 0 {
		t.Errorf("expected 0 trades on empty book, got %d", len(plan.Trades))
	}
	// IOC with no fill should be cancelled, not left pending.
	if plan.Taker.Status != OrderStatusCancelled {
		t.Errorf("expected cancelled (IOC + no liquidity), got %s", plan.Taker.Status)
	}
}

// TestBuildPlan_LimitBuyIssuance_StillWorks — sanity check that the
// existing limit-order issuance path didn't regress. The new
// implementation reads the original PricePoints when set.
func TestBuildPlan_LimitBuyIssuance_StillWorks(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	takerPrice := 35
	taker := Order{
		ID:                "taker-3",
		UserID:            "alice",
		MarketID:          "market-x",
		Side:              OrderSideYes,
		Action:            OrderActionBuy,
		OrderType:         OrderTypeLimit,
		PricePoints:       &takerPrice, // explicit, the legacy path
		Quantity:          5,
		RemainingQuantity: 5,
		Status:            OrderStatusPending,
		TimeInForce:       TIFGTC,
		SelfMatchAction:   SelfMatchCancelTaker,
	}
	makerPrice := 70
	maker := Order{
		ID:                "maker-3",
		UserID:            "bob",
		MarketID:          "market-x",
		Side:              OrderSideNo,
		Action:            OrderActionBuy,
		OrderType:         OrderTypeLimit,
		PricePoints:       &makerPrice,
		Quantity:          100,
		RemainingQuantity: 100,
		Status:            OrderStatusOpen,
		TimeInForce:       TIFGTC,
		SelfMatchAction:   SelfMatchCancelTaker,
	}
	plan, err := e.BuildPlan(MatchInput{
		Market:         market,
		Taker:          taker,
		MakersIssuance: []Order{maker},
		Now:            time.Date(2026, 5, 11, 0, 0, 0, 0, time.UTC),
		IDFactory:      counterIDs(),
	})
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}
	if plan.Taker.FilledQuantity != 5 {
		t.Errorf("limit-issuance regression: filled=%d, want 5", plan.Taker.FilledQuantity)
	}
}
