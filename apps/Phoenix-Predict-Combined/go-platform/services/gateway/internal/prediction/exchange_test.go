package prediction

import (
	"errors"
	"fmt"
	"testing"
	"time"
)

// --- Helpers ---

func intPtr(v int) *int { return &v }

// counterIDs returns an IDFactory producing "id-1", "id-2", ... for stable
// assertions.
func counterIDs() func() string {
	n := 0
	return func() string {
		n++
		return fmt.Sprintf("id-%d", n)
	}
}

func makeMarket() Market {
	return Market{
		ID:            "market-x",
		Status:        MarketStatusOpen,
		ExecutionMode: ExecutionModeOrderBook,
		FeeRateBps:    500,
	}
}

func makeOrder(id, userID string, side OrderSide, action OrderAction, ot OrderType, price *int, qty int) Order {
	o := Order{
		ID:                id,
		UserID:            userID,
		MarketID:          "market-x",
		Side:              side,
		Action:            action,
		OrderType:         ot,
		PriceCents:        price,
		Quantity:          qty,
		FilledQuantity:    0,
		RemainingQuantity: qty,
		Status:            OrderStatusPending,
		TimeInForce:       TIFGTC,
		SelfMatchAction:   SelfMatchCancelTaker,
	}
	return o
}

// --- Validation ---

func TestValidate_ClosedMarket(t *testing.T) {
	market := makeMarket()
	market.Status = MarketStatusClosed
	err := ValidatePlaceOrderRequest(PlaceOrderRequest{
		OrderType: OrderTypeLimit, PriceCents: intPtr(50), Quantity: 10, Action: OrderActionBuy,
	}, &market, nil)
	if !errors.Is(err, ErrClosedMarket) {
		t.Errorf("want ErrClosedMarket, got %v", err)
	}
}

func TestValidate_AMMMode(t *testing.T) {
	market := makeMarket()
	market.ExecutionMode = ExecutionModeAMM
	err := ValidatePlaceOrderRequest(PlaceOrderRequest{
		OrderType: OrderTypeLimit, PriceCents: intPtr(50), Quantity: 10, Action: OrderActionBuy,
	}, &market, nil)
	if !errors.Is(err, ErrClosedMarket) {
		t.Errorf("want ErrClosedMarket for AMM-mode market, got %v", err)
	}
}

func TestValidate_PriceBandViolation(t *testing.T) {
	market := makeMarket()
	for _, p := range []int{0, 100, -1, 1000} {
		err := ValidatePlaceOrderRequest(PlaceOrderRequest{
			OrderType: OrderTypeLimit, PriceCents: intPtr(p), Quantity: 1, Action: OrderActionBuy,
		}, &market, nil)
		if !errors.Is(err, ErrPriceBandViolation) {
			t.Errorf("price=%d: want ErrPriceBandViolation, got %v", p, err)
		}
	}
}

func TestValidate_SellWithoutPosition(t *testing.T) {
	market := makeMarket()
	err := ValidatePlaceOrderRequest(PlaceOrderRequest{
		OrderType: OrderTypeLimit, PriceCents: intPtr(50), Quantity: 10, Action: OrderActionSell,
	}, &market, nil)
	if !errors.Is(err, ErrInsufficientPosition) {
		t.Errorf("want ErrInsufficientPosition, got %v", err)
	}
}

func TestValidate_SellExceedsAvailable(t *testing.T) {
	market := makeMarket()
	pos := &Position{Quantity: 10, ReservedQuantity: 5} // available = 5
	err := ValidatePlaceOrderRequest(PlaceOrderRequest{
		OrderType: OrderTypeLimit, PriceCents: intPtr(50), Quantity: 10, Action: OrderActionSell,
	}, &market, pos)
	if !errors.Is(err, ErrInsufficientPosition) {
		t.Errorf("want ErrInsufficientPosition, got %v", err)
	}
}

// --- Match loop ---

func TestBuildPlan_LimitRestsWhenNoMatch(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("taker-1", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(40), 10)

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		Now: time.Now(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plan.Trades) != 0 {
		t.Errorf("expected 0 trades, got %d", len(plan.Trades))
	}
	if plan.Taker.Status != OrderStatusOpen {
		t.Errorf("expected status=open, got %s", plan.Taker.Status)
	}
	if plan.Taker.RemainingQuantity != 10 {
		t.Errorf("expected remaining=10, got %d", plan.Taker.RemainingQuantity)
	}
}

func TestBuildPlan_BuyYesMatchesSellYesAtMakerPrice(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(60), 10)
	maker := makeOrder("m", "bob", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(55), 10)

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{maker},
		Now:             time.Now(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plan.Trades) != 1 {
		t.Fatalf("expected 1 trade, got %d", len(plan.Trades))
	}
	tr := plan.Trades[0]
	if tr.PriceCents != 55 {
		t.Errorf("expected fill at maker price 55, got %d", tr.PriceCents)
	}
	if tr.TradeKind != TradeKindSecondary {
		t.Errorf("expected secondary, got %s", tr.TradeKind)
	}
	if plan.Taker.Status != OrderStatusFilled {
		t.Errorf("expected status=filled, got %s", plan.Taker.Status)
	}
	// 5% × 55 × 45 × 10 / 1_000_000 = 12 (floor of 12.375)
	wantFee := int64(12)
	if int64(tr.FeeCents) != wantFee {
		t.Errorf("expected taker fee %d, got %d", wantFee, tr.FeeCents)
	}
	// Maker is the seller here (bob) — must be credited proceeds too
	// (10 × 55 = 550). Pre-fix, no secondary fill credited any seller.
	if len(plan.SellerCredits) != 1 || plan.SellerCredits[0].UserID != "bob" || plan.SellerCredits[0].AmountCents != 550 {
		t.Errorf("expected seller credit bob/550, got %+v", plan.SellerCredits)
	}
}

// Regression (UAT 2026-05-16 D-1): a SELL taker must cross resting BUY
// makers on the same side via the secondary path. BuildPlan previously
// gated the secondary loop behind `if taker.Action == OrderActionBuy`, so
// a market sell of a held position returned 0 fill and IOC-cancelled even
// with resting bids in the book (reproduced 2/2 on UCL-BARCA-2526).
func TestBuildPlan_SellYesMatchesRestingBuyYes(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionSell, OrderTypeMarket, nil, 10)
	maker := makeOrder("m", "bob", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(55), 10)

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{maker},
		Now:             time.Now(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plan.Trades) != 1 {
		t.Fatalf("expected 1 trade, got %d", len(plan.Trades))
	}
	tr := plan.Trades[0]
	if tr.TradeKind != TradeKindSecondary {
		t.Errorf("expected secondary, got %s", tr.TradeKind)
	}
	if tr.PriceCents != 55 {
		t.Errorf("expected fill at maker price 55, got %d", tr.PriceCents)
	}
	if tr.SellerID == nil || *tr.SellerID != "alice" {
		t.Errorf("expected seller=alice (taker), got %v", tr.SellerID)
	}
	if tr.BuyerID != "bob" {
		t.Errorf("expected buyer=bob (maker), got %s", tr.BuyerID)
	}
	if plan.Taker.Status != OrderStatusFilled {
		t.Errorf("expected taker status=filled, got %s", plan.Taker.Status)
	}
	if plan.Taker.RemainingQuantity != 0 {
		t.Errorf("expected remaining=0, got %d", plan.Taker.RemainingQuantity)
	}
	// Seller (taker alice) must be credited proceeds = 10 × 55 = 550.
	if len(plan.SellerCredits) != 1 {
		t.Fatalf("expected 1 seller credit, got %d", len(plan.SellerCredits))
	}
	sc := plan.SellerCredits[0]
	if sc.UserID != "alice" || sc.AmountCents != 550 {
		t.Errorf("expected seller credit alice/550, got %s/%d", sc.UserID, sc.AmountCents)
	}
	if sc.CreditKey == "" {
		t.Errorf("seller credit must have an idempotency key")
	}
}

// Regression (UAT 2026-05-16 D-1): a SELL taker larger than the resting
// bid depth fills what it can and IOC-cancels the remainder — it must NOT
// return a 0-fill cancel. Mirrors the smoke partial (req=35, thin bids).
func TestBuildPlan_SellYesPartialFillThenIOCCancel(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionSell, OrderTypeMarket, nil, 35)
	taker.TimeInForce = TIFIOC
	maker := makeOrder("m", "bob", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(13), 20)

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{maker},
		Now:             time.Now(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plan.Trades) != 1 {
		t.Fatalf("expected 1 partial trade, got %d", len(plan.Trades))
	}
	if plan.Trades[0].Quantity != 20 {
		t.Errorf("expected 20 filled, got %d", plan.Trades[0].Quantity)
	}
	if plan.Taker.FilledQuantity != 20 {
		t.Errorf("expected taker filled=20, got %d", plan.Taker.FilledQuantity)
	}
	if plan.Taker.Status != OrderStatusCancelled {
		t.Errorf("expected status=cancelled (IOC remainder), got %s", plan.Taker.Status)
	}
	// Seller credited only for the filled portion: 20 × 13 = 260.
	if len(plan.SellerCredits) != 1 {
		t.Fatalf("expected 1 seller credit, got %d", len(plan.SellerCredits))
	}
	if plan.SellerCredits[0].AmountCents != 260 {
		t.Errorf("expected seller credit 260 (20×13), got %d", plan.SellerCredits[0].AmountCents)
	}
}

func TestBuildPlan_BuyYesMatchesBuyNoIssuance(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(65), 10)
	maker := makeOrder("m", "bob", OrderSideNo, OrderActionBuy, OrderTypeLimit, intPtr(40), 10)

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersIssuance: []Order{maker},
		Now:            time.Now(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Two trade rows for issuance, sharing match_id.
	if len(plan.Trades) != 2 {
		t.Fatalf("expected 2 trades for issuance, got %d", len(plan.Trades))
	}
	if plan.Trades[0].MatchID != plan.Trades[1].MatchID {
		t.Errorf("issuance trades must share match_id")
	}
	if plan.Trades[0].TradeKind != TradeKindIssuance || plan.Trades[1].TradeKind != TradeKindIssuance {
		t.Errorf("expected both rows trade_kind=issuance")
	}
	// Taker pays 100 - 40 = 60 (price improvement vs limit 65).
	var takerRow, makerRow Trade
	for _, tr := range plan.Trades {
		if tr.BuyerID == "alice" {
			takerRow = tr
		} else {
			makerRow = tr
		}
	}
	if takerRow.PriceCents != 60 {
		t.Errorf("taker should pay 60 (=100-40), got %d", takerRow.PriceCents)
	}
	if makerRow.PriceCents != 40 {
		t.Errorf("maker should pay 40, got %d", makerRow.PriceCents)
	}
	// Maker fee always 0 in v1.
	if makerRow.FeeCents != 0 {
		t.Errorf("maker fee must be 0 in v1, got %d", makerRow.FeeCents)
	}
	// Taker fee = 5% × 60 × 40 × 10 / 1e6 = 12
	if takerRow.FeeCents != 12 {
		t.Errorf("expected taker fee 12, got %d", takerRow.FeeCents)
	}
	// Collateral pool grows by 100 × 10 = 1000.
	if plan.Market.CollateralPoolCents != 1000 {
		t.Errorf("expected collateral pool +1000, got %d", plan.Market.CollateralPoolCents)
	}
}

func TestBuildPlan_BuyYesNoIssuanceWhenSumBelow100(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(50), 10)
	maker := makeOrder("m", "bob", OrderSideNo, OrderActionBuy, OrderTypeLimit, intPtr(40), 10)

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersIssuance: []Order{maker},
		Now:            time.Now(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plan.Trades) != 0 {
		t.Errorf("expected no trades when 50+40<100, got %d", len(plan.Trades))
	}
	if plan.Taker.Status != OrderStatusOpen {
		t.Errorf("expected status=open, got %s", plan.Taker.Status)
	}
}

func TestBuildPlan_PartialFillRestsGTCRemainder(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(60), 20)
	maker := makeOrder("m", "bob", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(55), 10)

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{maker},
		Now:             time.Now(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if plan.Taker.FilledQuantity != 10 {
		t.Errorf("expected filled 10, got %d", plan.Taker.FilledQuantity)
	}
	if plan.Taker.RemainingQuantity != 10 {
		t.Errorf("expected remaining 10, got %d", plan.Taker.RemainingQuantity)
	}
	if plan.Taker.Status != OrderStatusPartial {
		t.Errorf("expected status=partial, got %s", plan.Taker.Status)
	}
}

func TestBuildPlan_IOCCancelsRemainder(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(60), 20)
	taker.TimeInForce = TIFIOC
	maker := makeOrder("m", "bob", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(55), 10)

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{maker},
		Now:             time.Now(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if plan.Taker.Status != OrderStatusCancelled {
		t.Errorf("expected status=cancelled, got %s", plan.Taker.Status)
	}
	if len(plan.ReleaseReservations) != 1 {
		t.Errorf("expected 1 release reservation for IOC remainder, got %d", len(plan.ReleaseReservations))
	}
}

func TestBuildPlan_FOKAllOrNothing(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(60), 20)
	taker.TimeInForce = TIFFOK
	maker := makeOrder("m", "bob", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(55), 10)

	_, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{maker},
		Now:             time.Now(), IDFactory: counterIDs(),
	})
	if !errors.Is(err, ErrFOKUnavailable) {
		t.Errorf("expected ErrFOKUnavailable, got %v", err)
	}
}

func TestBuildPlan_MarketOrderNeverRests(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeMarket, nil, 20)
	maker := makeOrder("m", "bob", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(55), 10)

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{maker},
		Now:             time.Now(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if plan.Taker.Status != OrderStatusCancelled {
		t.Errorf("market order remainder should cancel, got %s", plan.Taker.Status)
	}
	if plan.Taker.FilledQuantity != 10 {
		t.Errorf("expected filled 10, got %d", plan.Taker.FilledQuantity)
	}
}

func TestBuildPlan_SelfMatchCancelTaker(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(60), 10)
	maker := makeOrder("m", "alice", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(55), 10)
	// Same user → cancel_taker default → should reject.

	_, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{maker},
		Now:             time.Now(), IDFactory: counterIDs(),
	})
	if !errors.Is(err, ErrSelfMatchRejected) {
		t.Errorf("expected ErrSelfMatchRejected, got %v", err)
	}
}

func TestBuildPlan_SelfMatchCancelMakerSkips(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(60), 10)
	taker.SelfMatchAction = SelfMatchCancelMaker
	makerSelf := makeOrder("m1", "alice", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(55), 10)
	makerOther := makeOrder("m2", "bob", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(56), 10)

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{makerSelf, makerOther},
		Now:             time.Now(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plan.Trades) != 1 {
		t.Fatalf("expected 1 trade (skip self, fill against bob), got %d", len(plan.Trades))
	}
	if plan.Trades[0].SellerID == nil || *plan.Trades[0].SellerID != "bob" {
		t.Errorf("expected fill against bob, got seller=%v", plan.Trades[0].SellerID)
	}
}

func TestBuildPlan_PostOnlyRejectsTakingOrder(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(60), 10)
	taker.PostOnly = true
	maker := makeOrder("m", "bob", OrderSideYes, OrderActionSell, OrderTypeLimit, intPtr(55), 10)

	_, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		MakersSecondary: []Order{maker},
		Now:             time.Now(), IDFactory: counterIDs(),
	})
	if !errors.Is(err, ErrPostOnlyWouldTake) {
		t.Errorf("expected ErrPostOnlyWouldTake, got %v", err)
	}
}

func TestBuildPlan_PostOnlyAcceptsRestingOrder(t *testing.T) {
	e := NewExchangeEngine()
	market := makeMarket()
	taker := makeOrder("t", "alice", OrderSideYes, OrderActionBuy, OrderTypeLimit, intPtr(40), 10)
	taker.PostOnly = true
	// No matching makers; taker should rest cleanly.

	plan, err := e.BuildPlan(MatchInput{
		Market: market, Taker: taker,
		Now: time.Now(), IDFactory: counterIDs(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if plan.Taker.Status != OrderStatusOpen {
		t.Errorf("post_only with no immediate match should rest, got %s", plan.Taker.Status)
	}
}
