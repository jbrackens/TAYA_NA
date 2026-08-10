package prediction

// Repricing contract (markTradePrice): every exchange fill restamps the
// plan's market snapshot — yes/no headline price, YES-terms last-trade
// price, and quote timestamp — so PersistMatchAtomic commits the new
// price with the fills and the `market:<id>` broadcast carries a moved
// price to subscribers. Before this, no exchange fill ever changed
// yes_price_points (only the retired AMM repriced), so the frontend's
// live-motion system had no events to render: the market said 1¢ forever
// no matter what traded.

import (
	"testing"
	"time"
)

func repriceNow() time.Time {
	return time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)
}

func TestReprice_SecondaryYesFillSetsYesTermsPrice(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	market.YesPricePoints = 50
	market.NoPricePoints = 50
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(60), 10)
	maker := makeOrder("m", "bob", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(60), 10)
	maker.ReservedQuantity = 10

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{maker},
		Now:             repriceNow(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}
	if len(plan.Trades) != 1 {
		t.Fatalf("expected 1 trade, got %d", len(plan.Trades))
	}
	if plan.Market.YesPricePoints != 60 || plan.Market.NoPricePoints != 40 {
		t.Errorf("expected market repriced to YES 60 / NO 40, got %d/%d",
			plan.Market.YesPricePoints, plan.Market.NoPricePoints)
	}
	if plan.Market.LastTradePricePoints == nil || *plan.Market.LastTradePricePoints != 60 {
		t.Errorf("expected last trade 60 (YES terms), got %v", plan.Market.LastTradePricePoints)
	}
	if plan.Market.LastQuoteAt == nil || !plan.Market.LastQuoteAt.Equal(repriceNow()) {
		t.Errorf("expected last quote at fill time, got %v", plan.Market.LastQuoteAt)
	}
}

func TestReprice_SecondaryNoFillConvertsToYesTerms(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	market.YesPricePoints = 50
	market.NoPricePoints = 50
	taker := makeOrder("t", "alice", OrderSideNo, OrderActionBuy, OrderTypeLimit, intPtr(30), 10)
	maker := makeOrder("m", "bob", OrderSideNo, OrderActionSell, OrderTypeLimit, intPtr(30), 10)
	maker.ReservedQuantity = 10

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{maker},
		Now:             repriceNow(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}
	if len(plan.Trades) != 1 {
		t.Fatalf("expected 1 trade, got %d", len(plan.Trades))
	}
	// A NO trade at 30 IS a YES trade at 70 — headline and last-trade both
	// speak YES terms, whichever side traded.
	if plan.Market.YesPricePoints != 70 || plan.Market.NoPricePoints != 30 {
		t.Errorf("expected market repriced to YES 70 / NO 30, got %d/%d",
			plan.Market.YesPricePoints, plan.Market.NoPricePoints)
	}
	if plan.Market.LastTradePricePoints == nil || *plan.Market.LastTradePricePoints != 70 {
		t.Errorf("expected last trade 70 (YES terms), got %v", plan.Market.LastTradePricePoints)
	}
}

func TestReprice_IssuanceFillStampsImpliedYesPrice(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	market.YesPricePoints = 50
	market.NoPricePoints = 50
	// Market Buy-YES taker crosses a Buy-NO maker at 95 via issuance:
	// implied YES price = par - 95 = 5.
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeMarket, nil, 10)
	taker.TimeInForce = TIFIOC
	maker := makeOrder("m", "bob", OrderSideNo, OrderActionBuy, OrderTypeLimit, intPtr(95), 25)
	maker.Status = OrderStatusOpen

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersIssuance: []Order{maker},
		Now:            repriceNow(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}
	if plan.Taker.FilledQuantity != 10 {
		t.Fatalf("expected filled 10, got %d", plan.Taker.FilledQuantity)
	}
	if plan.Market.YesPricePoints != 5 || plan.Market.NoPricePoints != 95 {
		t.Errorf("expected market repriced to YES 5 / NO 95, got %d/%d",
			plan.Market.YesPricePoints, plan.Market.NoPricePoints)
	}
	// Issuance fills stamp last-trade too — before markTradePrice they left
	// it untouched, which is why a filled market buy still showed no last
	// trade anywhere.
	if plan.Market.LastTradePricePoints == nil || *plan.Market.LastTradePricePoints != 5 {
		t.Errorf("expected last trade 5 (YES terms), got %v", plan.Market.LastTradePricePoints)
	}
}

func TestReprice_LastFillWinsAcrossPriceLevels(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	market.YesPricePoints = 50
	market.NoPricePoints = 50
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(60), 20)
	m1 := makeOrder("m1", "bob", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(55), 10)
	m1.ReservedQuantity = 10
	m2 := makeOrder("m2", "carol", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(58), 10)
	m2.ReservedQuantity = 10

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{m1, m2},
		Now:             repriceNow(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}
	if len(plan.Trades) != 2 {
		t.Fatalf("expected 2 trades, got %d", len(plan.Trades))
	}
	// Price-time priority walks 55 then 58; the mark is the LAST fill.
	if plan.Market.YesPricePoints != 58 {
		t.Errorf("expected final mark at last fill 58, got %d", plan.Market.YesPricePoints)
	}
	if plan.Market.LastTradePricePoints == nil || *plan.Market.LastTradePricePoints != 58 {
		t.Errorf("expected last trade 58, got %v", plan.Market.LastTradePricePoints)
	}
}

func TestReprice_NoFillLeavesSnapshotUntouched(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	market.YesPricePoints = 41
	market.NoPricePoints = 59
	stale := 77
	market.LastTradePricePoints = &stale // historical trade, must not move

	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(40), 10)
	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		Now: repriceNow(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("BuildPlan: %v", err)
	}
	if len(plan.Trades) != 0 {
		t.Fatalf("expected no trades, got %d", len(plan.Trades))
	}
	if plan.Market.YesPricePoints != 41 || plan.Market.NoPricePoints != 59 {
		t.Errorf("expected untouched prices 41/59, got %d/%d",
			plan.Market.YesPricePoints, plan.Market.NoPricePoints)
	}
	if plan.Market.LastTradePricePoints == nil || *plan.Market.LastTradePricePoints != 77 {
		t.Errorf("expected untouched last trade 77, got %v", plan.Market.LastTradePricePoints)
	}
}

// Regression: ISSUE-002 — exchange fills never tracked open interest (only
// the retired AMM did). Issuance mints pairs → OI grows by par notional;
// secondary transfers move holders → OI unchanged.
// Found by /qa on 2026-08-10.
func TestOpenInterest_IssuanceGrowsSecondaryDoesNot(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	market.YesPricePoints = 50
	market.NoPricePoints = 50

	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeMarket, nil, 10)
	taker.TimeInForce = TIFIOC
	maker := makeOrder("m", "bob", OrderSideNo, OrderActionBuy, OrderTypeLimit, intPtr(95), 25)
	maker.Status = OrderStatusOpen

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersIssuance: []Order{maker},
		Now:            repriceNow(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("BuildPlan (issuance): %v", err)
	}
	if plan.Market.OpenInterestPoints != int64(10*ParPricePoints) {
		t.Errorf("issuance OI: want %d, got %d", 10*ParPricePoints, plan.Market.OpenInterestPoints)
	}

	// Secondary transfer: same-side buyer meets seller — no minting.
	market2 := makeMarket()
	taker2 := makeOrder("t2", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(60), 10)
	maker2 := makeOrder("m2", "bob", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(60), 10)
	maker2.ReservedQuantity = 10
	plan2, err := e.BuildPlan(MatchInput{
		Market: market2, Taker: taker2,
		MakersSecondary: []Order{maker2},
		Now:             repriceNow(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("BuildPlan (secondary): %v", err)
	}
	if plan2.Market.OpenInterestPoints != 0 {
		t.Errorf("secondary OI: want 0 (transfer, no minting), got %d", plan2.Market.OpenInterestPoints)
	}
}
