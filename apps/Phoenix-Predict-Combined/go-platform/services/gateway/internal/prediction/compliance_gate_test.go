package prediction

import (
	"context"
	"errors"
	"strings"
	"testing"
)

// fakeCompliance is a controllable ComplianceChecker for gate tests. It models
// the real RG service's actual return shape, which is the subtle part: a
// deliberate denial comes back as (allowed=false, reason, sentinelErr) — the
// error is a *decision*, not an outage. A genuine "could not evaluate" infra
// failure is modelled separately as (allowed=true, "", infraErr).
type fakeCompliance struct {
	deny        bool
	reason      string
	denyErr     error // returned alongside allowed=false on a deliberate deny
	infraErr    error // returned alongside allowed=true (could not evaluate)
	checkCalls   []int64
	recordErr    error
	recordCalls  []int64
	releaseErr   error
	releaseCalls []int64
}

func (f *fakeCompliance) CheckBetAllowed(_ context.Context, _ string, stakeCents int64) (bool, string, error) {
	f.checkCalls = append(f.checkCalls, stakeCents)
	if f.deny {
		return false, f.reason, f.denyErr
	}
	if f.infraErr != nil {
		return true, "", f.infraErr
	}
	return true, "", nil
}

func (f *fakeCompliance) RecordBet(_ context.Context, _ string, stakeCents int64) error {
	f.recordCalls = append(f.recordCalls, stakeCents)
	return f.recordErr
}

func (f *fakeCompliance) ReleaseBet(_ context.Context, _ string, amountCents int64) error {
	f.releaseCalls = append(f.releaseCalls, amountCents)
	return f.releaseErr
}

// A denied gate must stop the order before any wallet debit or persistence.
// Fails on the pre-fix code (no gate existed → order went through).
func TestPlaceOrder_BlockedByComplianceGate(t *testing.T) {
	repo := newMemRepo()
	seedMarket(t, repo)
	wallet := newFakeWallet(10000)
	svc := NewService(repo, wallet)

	rg := &fakeCompliance{deny: true, reason: "Bet limit exceeded for daily period"}
	svc.SetComplianceChecker(rg)

	priceCents := 50
	_, _, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:   "mkt-1",
		Side:       OrderSideYes,
		Action:     OrderActionBuy,
		OrderType:  OrderTypeLimit,
		PriceCents: &priceCents,
		Quantity:   10,
	}, "user1")

	if err == nil {
		t.Fatal("expected PlaceOrder to be blocked by the compliance gate, got nil error")
	}
	if got := err.Error(); got != "Bet limit exceeded for daily period" {
		t.Fatalf("expected RG reason surfaced verbatim, got %q", got)
	}
	if len(rg.checkCalls) != 1 {
		t.Fatalf("expected exactly 1 CheckBetAllowed call, got %d", len(rg.checkCalls))
	}
	if rg.checkCalls[0] != int64(priceCents)*10 {
		t.Errorf("gate stake mismatch: want %d (price×qty), got %d", priceCents*10, rg.checkCalls[0])
	}
	if len(wallet.debitCalls) != 0 {
		t.Errorf("blocked order must not debit wallet; got %d debit calls", len(wallet.debitCalls))
	}
	if repo.persistCalls != 0 {
		t.Errorf("blocked order must not persist; got %d persist calls", repo.persistCalls)
	}
	if len(rg.recordCalls) != 0 {
		t.Errorf("blocked order must not record stake; got %d record calls", len(rg.recordCalls))
	}
}

// LC-17 live regression: the wired RG service returns a sentinel error
// *alongside* allowed=false on a real bet-limit block. The gate must still
// block — even in development — and must NOT treat the sentinel as an infra
// error and fail open. (Failing open here is exactly what let a $25 order
// through a $1 limit in the running stack on 2026-05-16.)
func TestPlaceOrder_DenyWithSentinelError_BlocksEvenInDev(t *testing.T) {
	t.Setenv("ENVIRONMENT", "") // development

	repo := newMemRepo()
	seedMarket(t, repo)
	wallet := newFakeWallet(10000)
	svc := NewService(repo, wallet)

	svc.SetComplianceChecker(&fakeCompliance{
		deny:    true,
		reason:  "Bet limit exceeded for daily period",
		denyErr: errors.New("bet limit exceeded"), // sentinel, mirrors real RG svc
	})

	notionalCap := int64(2500)
	_, _, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:         "mkt-1",
		Side:             OrderSideYes,
		Action:           OrderActionBuy,
		OrderType:        OrderTypeMarket,
		Quantity:         200,
		NotionalCapCents: &notionalCap,
	}, "user1")

	if err == nil {
		t.Fatal("deny carrying a sentinel error must still block in dev, got nil (LC-17 regression)")
	}
	if got := err.Error(); got != "Bet limit exceeded for daily period" {
		t.Fatalf("expected the RG reason, not the sentinel, surfaced; got %q", got)
	}
	if len(wallet.debitCalls) != 0 {
		t.Errorf("blocked order must not debit wallet; got %d", len(wallet.debitCalls))
	}
}

// An allowed gate must let the order through and record realized stake for
// cumulative period-limit tracking.
func TestPlaceOrder_RecordsRealizedStakeOnComplianceSuccess(t *testing.T) {
	repo := newMemRepo()
	seedMarket(t, repo)
	wallet := newFakeWallet(10000)
	svc := NewService(repo, wallet)

	rg := &fakeCompliance{deny: false}
	svc.SetComplianceChecker(rg)

	order, trade, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  10,
	}, "user1")
	if err != nil {
		t.Fatalf("PlaceOrder failed: %v", err)
	}
	if order == nil || trade == nil {
		t.Fatal("expected order and trade to be non-nil")
	}
	if len(rg.checkCalls) != 1 {
		t.Fatalf("expected exactly 1 CheckBetAllowed call, got %d", len(rg.checkCalls))
	}
	if len(rg.recordCalls) != 1 {
		t.Fatalf("expected exactly 1 RecordBet call on success, got %d", len(rg.recordCalls))
	}
	if rg.recordCalls[0] != order.TotalCostCents {
		t.Errorf("RecordBet stake mismatch: want realized cost %d, got %d",
			order.TotalCostCents, rg.recordCalls[0])
	}
}

// No checker wired = no behavior change (regression guard for the pre-LC-17
// path used by tests and any deployment that has not enabled RG).
func TestPlaceOrder_NilComplianceChecker_NoOp(t *testing.T) {
	repo := newMemRepo()
	seedMarket(t, repo)
	wallet := newFakeWallet(10000)
	svc := NewService(repo, wallet) // no SetComplianceChecker

	order, _, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:  "mkt-1",
		Side:      OrderSideYes,
		Action:    OrderActionBuy,
		OrderType: OrderTypeMarket,
		Quantity:  10,
	}, "user1")
	if err != nil {
		t.Fatalf("PlaceOrder with nil compliance checker must behave as before: %v", err)
	}
	if order == nil {
		t.Fatal("expected order to be placed")
	}
	if len(wallet.debitCalls) != 1 {
		t.Errorf("expected normal debit with nil checker, got %d", len(wallet.debitCalls))
	}
}

// realizedStakeCents must report cash actually staked, never the reserved
// notional — over-counting a thin/partial fill would wrongly lock a user out
// for the rest of the RG period (UAT 2026-05-16 LC-17).
func TestRealizedStakeCents(t *testing.T) {
	cases := []struct {
		name string
		o    *Order
		want int64
	}{
		{"nil order", nil, 0},
		{"nothing filled (rejected/resting)", &Order{FilledQuantity: 0, TotalCostCents: 2500}, 0},
		{"order-book partial fill uses captured, not reserved cap",
			&Order{FilledQuantity: 136, TotalCostCents: 2500, CapturedCashCents: 2494}, 2494},
		{"order-book tiny fill: $0.50 cap, $0.19 captured",
			&Order{FilledQuantity: 1, TotalCostCents: 50, CapturedCashCents: 19}, 19},
		{"AMM fill (no captured field) falls back to realized TotalCostCents",
			&Order{FilledQuantity: 10, TotalCostCents: 480, CapturedCashCents: 0}, 480},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := realizedStakeCents(c.o); got != c.want {
				t.Fatalf("realizedStakeCents = %d, want %d", got, c.want)
			}
		})
	}
}

// D-5 codex review P1 #1: an AMM market buy whose real LMSR cost exceeds the
// caller-supplied notionalCapCents must be rejected BEFORE execution. The RG
// gate evaluates worstCaseSpend (= the cap for a market buy); the order-book
// path clamps fills to that cap, but the AMM path did not — so a tiny cap let
// a large LMSR spend both fat-finger the wallet and slip the RG gate (the gate
// saw the small cap, the wallet was debited the real cost). Fails on pre-fix
// code (order filled, wallet debited > cap, stake recorded > cap).
func TestPlaceOrder_AMMMarketBuy_RejectedWhenCostExceedsNotionalCap(t *testing.T) {
	repo := newMemRepo()
	seedMarket(t, repo) // mkt-1: ExecutionMode unset → AMM path
	wallet := newFakeWallet(1_000_000) // ample balance, so balance is not the blocker
	svc := NewService(repo, wallet)

	rg := &fakeCompliance{deny: false}
	svc.SetComplianceChecker(rg)

	tinyCap := int64(1) // 1 cent — far below the LMSR cost of qty 50
	_, _, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:         "mkt-1",
		Side:             OrderSideYes,
		Action:           OrderActionBuy,
		OrderType:        OrderTypeMarket,
		Quantity:         50,
		NotionalCapCents: &tinyCap,
	}, "user1")

	if err == nil {
		t.Fatal("AMM market buy whose cost exceeds notionalCapCents must be rejected (D-5 P1 #1)")
	}
	if got := err.Error(); !strings.Contains(got, "exceeds notional cap") {
		t.Fatalf("expected a notional-cap rejection, got %q", got)
	}
	if len(wallet.debitCalls) != 0 {
		t.Errorf("rejected over-cap order must not debit the wallet; got %d", len(wallet.debitCalls))
	}
	if repo.persistCalls != 0 {
		t.Errorf("rejected over-cap order must not persist; got %d", repo.persistCalls)
	}
	// The RG-soundness crux: the gate was evaluated on the under-estimated cap,
	// but the order is now stopped before any debit, so the under-estimate can
	// no longer be a vector to slip a large AMM spend past RG accounting.
	if len(rg.checkCalls) != 1 || rg.checkCalls[0] != tinyCap {
		t.Fatalf("expected gate evaluated once on the cap (%d); got %v", tinyCap, rg.checkCalls)
	}
	if len(rg.recordCalls) != 0 {
		t.Errorf("rejected order must not record stake; got %v", rg.recordCalls)
	}
}

// Guard: a legitimate AMM market buy whose cost is within the cap still fills
// (the fix must not block valid orders — only those that exceed their cap).
func TestPlaceOrder_AMMMarketBuy_WithinNotionalCap_StillFills(t *testing.T) {
	repo := newMemRepo()
	seedMarket(t, repo)
	wallet := newFakeWallet(1_000_000)
	svc := NewService(repo, wallet)
	svc.SetComplianceChecker(&fakeCompliance{deny: false})

	bigCap := int64(1_000_000) // generously above the LMSR cost of qty 10
	order, trade, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:         "mkt-1",
		Side:             OrderSideYes,
		Action:           OrderActionBuy,
		OrderType:        OrderTypeMarket,
		Quantity:         10,
		NotionalCapCents: &bigCap,
	}, "user1")
	if err != nil {
		t.Fatalf("AMM market buy within the notional cap must still fill, got %v", err)
	}
	if order == nil || trade == nil {
		t.Fatal("expected a filled order and trade")
	}
	if order.TotalCostCents > bigCap {
		t.Fatalf("filled cost %d must not exceed cap %d", order.TotalCostCents, bigCap)
	}
}

// D-5 codex review P1 #2: the reserve+reconcile decision. The bypass was that
// recording only realizedStakeCents let a resting limit order (realized 0)
// pass the gate without ever counting toward the period, and a maker fill was
// never recorded. The fix records the committed worst-case at placement and
// reconciles terminal orders to realized. The "resting order" rows below are
// the regression: pre-fix record was realizedStakeCents(o) == 0; post-fix it
// is the full committed.
func TestRGPlacementAccounting(t *testing.T) {
	cases := []struct {
		name        string
		committed   int64
		o           *Order
		wantRecord  int64
		wantRelease int64
	}{
		{"nil order", 5000, nil, 0, 0},
		{"zero committed", 0, &Order{Status: OrderStatusOpen}, 0, 0},
		{"never-reserved reject records nothing", 5000,
			&Order{Status: OrderStatusRejected}, 0, 0},

		// THE bypass-closure case: a resting limit order now counts its full
		// committed stake immediately and releases nothing (pre-fix: 0 / 0).
		{"resting open limit counts committed, releases nothing", 5000,
			&Order{Status: OrderStatusOpen, FilledQuantity: 0}, 5000, 0},
		{"resting partial limit counts full committed, releases nothing", 5000,
			&Order{Status: OrderStatusPartial, FilledQuantity: 3, CapturedCashCents: 1500}, 5000, 0},

		// Terminal taker: record committed, release the uncaptured remainder
		// so the net equals realized captured cash.
		{"filled taker nets to realized (5000 committed, 4994 captured)", 5000,
			&Order{Status: OrderStatusFilled, FilledQuantity: 136, CapturedCashCents: 4994}, 5000, 6},
		{"market IOC cancelled remainder nets to realized (2500 cap, 190 captured)", 2500,
			&Order{Status: OrderStatusCancelled, FilledQuantity: 1, CapturedCashCents: 190}, 2500, 2310},
		{"expired unfilled releases the whole committed (net 0)", 2500,
			&Order{Status: OrderStatusExpired, FilledQuantity: 0}, 2500, 2500},
		{"fully captured terminal releases nothing", 1900,
			&Order{Status: OrderStatusFilled, FilledQuantity: 10, CapturedCashCents: 1900}, 1900, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec, rel := rgPlacementAccounting(c.committed, c.o)
			if rec != c.wantRecord || rel != c.wantRelease {
				t.Fatalf("rgPlacementAccounting(%d, %+v) = (record %d, release %d), want (%d, %d)",
					c.committed, c.o, rec, rel, c.wantRecord, c.wantRelease)
			}
			// Regression guard: a resting order under the OLD model recorded
			// realizedStakeCents (0 here) — i.e. the bypass. The new model
			// must record the full committed for a non-terminal order.
			if c.o != nil && c.committed > 0 && c.o.Status == OrderStatusOpen {
				if rec == realizedStakeCents(c.o) {
					t.Fatalf("resting order still records realized (%d) — bypass not closed", rec)
				}
			}
		})
	}
}

// A genuine "could not evaluate" infra error (allowed=true + err) fails open
// in development (so a misconfigured local RG does not block testing) and
// fails closed in production/staging (so an outage cannot silently disable
// the control).
func TestCheckComplianceForOrder_InfraError_FailOpenDevFailClosedProd(t *testing.T) {
	svc := NewService(newMemRepo(), newFakeWallet(0))
	svc.SetComplianceChecker(&fakeCompliance{infraErr: errors.New("rg backend down")})

	t.Run("dev fails open", func(t *testing.T) {
		t.Setenv("ENVIRONMENT", "")
		if err := svc.checkComplianceForOrder(context.Background(), "u", 500); err != nil {
			t.Fatalf("dev must fail open on infra error, got %v", err)
		}
	})
	t.Run("production fails closed", func(t *testing.T) {
		t.Setenv("ENVIRONMENT", "production")
		if err := svc.checkComplianceForOrder(context.Background(), "u", 500); err == nil {
			t.Fatal("production must fail closed on infra error, got nil")
		}
	})
	t.Run("staging fails closed", func(t *testing.T) {
		t.Setenv("ENVIRONMENT", "staging")
		if err := svc.checkComplianceForOrder(context.Background(), "u", 500); err == nil {
			t.Fatal("staging must fail closed on infra error, got nil")
		}
	})
}
