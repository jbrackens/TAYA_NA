package prediction

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

// fakeCompliance is a controllable ComplianceChecker for gate tests. It models
// the real RG service's actual return shape, which is the subtle part: a
// deliberate denial comes back as (allowed=false, reason, sentinelErr) — the
// error is a *decision*, not an outage. A genuine "could not evaluate" infra
// failure is modelled separately as (allowed=true, "", infraErr).
type fakeCompliance struct {
	deny          bool
	denyAtOrAbove int64 // if >0, deny only when stakePoints >= this (stake-aware)
	reason        string
	denyErr       error // returned alongside allowed=false on a deliberate deny
	infraErr      error // returned alongside allowed=true (could not evaluate)
	checkCalls    []int64
	recordErr     error
	recordCalls   []int64
	releaseErr    error
	releaseCalls  []int64
}

func (f *fakeCompliance) CheckBetAllowed(_ context.Context, _ string, stakePoints int64) (bool, string, error) {
	f.checkCalls = append(f.checkCalls, stakePoints)
	if f.deny {
		return false, f.reason, f.denyErr
	}
	if f.denyAtOrAbove > 0 && stakePoints >= f.denyAtOrAbove {
		return false, f.reason, f.denyErr
	}
	if f.infraErr != nil {
		return true, "", f.infraErr
	}
	return true, "", nil
}

func (f *fakeCompliance) RecordBet(_ context.Context, _ string, stakePoints int64) error {
	f.recordCalls = append(f.recordCalls, stakePoints)
	return f.recordErr
}

func (f *fakeCompliance) ReleaseBet(_ context.Context, _ string, amountPoints int64, _ time.Time) error {
	f.releaseCalls = append(f.releaseCalls, amountPoints)
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

	pricePoints := 50
	_, _, err := svc.PlaceOrder(context.Background(), PlaceOrderRequest{
		MarketID:    "mkt-1",
		Side:        OrderSideYes,
		Action:      OrderActionBuy,
		OrderType:   OrderTypeLimit,
		PricePoints: &pricePoints,
		Quantity:    10,
	}, "user1")

	if err == nil {
		t.Fatal("expected PlaceOrder to be blocked by the compliance gate, got nil error")
	}
	if got := err.Error(); got != "Prediction limit exceeded for daily period" {
		t.Fatalf("expected launch-safe RG reason surfaced, got %q", got)
	}
	if strings.Contains(err.Error(), "Bet limit") || strings.Contains(err.Error(), "bet limit") {
		t.Fatalf("order error must not expose inherited bet-limit wording, got %q", err.Error())
	}
	if len(rg.checkCalls) != 1 {
		t.Fatalf("expected exactly 1 CheckBetAllowed call, got %d", len(rg.checkCalls))
	}
	if rg.checkCalls[0] != int64(pricePoints)*10 {
		t.Errorf("gate stake mismatch: want %d (price×qty), got %d", pricePoints*10, rg.checkCalls[0])
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
		MarketID:          "mkt-1",
		Side:              OrderSideYes,
		Action:            OrderActionBuy,
		OrderType:         OrderTypeMarket,
		Quantity:          200,
		NotionalCapPoints: &notionalCap,
	}, "user1")

	if err == nil {
		t.Fatal("deny carrying a sentinel error must still block in dev, got nil (LC-17 regression)")
	}
	if got := err.Error(); got != "Prediction limit exceeded for daily period" {
		t.Fatalf("expected the launch-safe RG reason, not the sentinel, surfaced; got %q", got)
	}
	if strings.Contains(err.Error(), "Bet limit") || strings.Contains(err.Error(), "bet limit") {
		t.Fatalf("order error must not expose inherited bet-limit wording, got %q", err.Error())
	}
	if len(wallet.debitCalls) != 0 {
		t.Errorf("blocked order must not debit wallet; got %d", len(wallet.debitCalls))
	}
}

// An allowed gate must let the order through and record realized stake for
// cumulative period-limit tracking.
// No checker wired = no behavior change (regression guard for the pre-LC-17
// path used by tests and any deployment that has not enabled RG).
// realizedStakePoints must report cash actually staked, never the reserved
// notional — over-counting a thin/partial fill would wrongly lock a user out
// for the rest of the RG period (UAT 2026-05-16 LC-17).
func TestRealizedStakePoints(t *testing.T) {
	cases := []struct {
		name string
		o    *Order
		want int64
	}{
		{"nil order", nil, 0},
		{"nothing filled (rejected/resting)", &Order{FilledQuantity: 0, TotalCostPoints: 2500}, 0},
		{"order-book partial fill uses captured, not reserved cap",
			&Order{FilledQuantity: 136, TotalCostPoints: 2500, CapturedCashPoints: 2494}, 2494},
		{"order-book tiny fill: $0.50 cap, $0.19 captured",
			&Order{FilledQuantity: 1, TotalCostPoints: 50, CapturedCashPoints: 19}, 19},
		{"AMM fill (no captured field) falls back to realized TotalCostPoints",
			&Order{FilledQuantity: 10, TotalCostPoints: 480, CapturedCashPoints: 0}, 480},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := realizedStakePoints(c.o); got != c.want {
				t.Fatalf("realizedStakePoints = %d, want %d", got, c.want)
			}
		})
	}
}

// D-5 codex review P1 #1: an AMM market buy whose real LMSR cost exceeds the
// caller-supplied notionalCapPoints must be rejected BEFORE execution. The RG
// gate evaluates worstCaseSpend (= the cap for a market buy); the order-book
// path clamps fills to that cap, but the AMM path did not — so a tiny cap let
// a large LMSR spend both fat-finger the wallet and slip the RG gate (the gate
// saw the small cap, the wallet was debited the real cost). Fails on pre-fix
// code (order filled, wallet debited > cap, stake recorded > cap).
// D-5 codex re-review P1 #1: a capless AMM buy has worstCaseSpend == 0, so
// the initial RG gate evaluates stake 0 and a per-bet/period limit cannot
// block it. The HTTP handler rejects capless market buys but the bot path
// calls PlaceOrder directly and bypasses that. The fix re-gates on the
// actual LMSR cost before executing. Stake-aware checker: allows 0, denies
// at/above 100c. Pre-fix (no re-gate) the order filled (under-gated).
// Guard: a legitimate AMM market buy whose cost is within the cap still fills
// (the fix must not block valid orders — only those that exceed their cap).
// D-5 codex review P1 #2: the reserve+reconcile decision. The bypass was that
// recording only realizedStakePoints let a resting limit order (realized 0)
// pass the gate without ever counting toward the period, and a maker fill was
// never recorded. The fix records the committed worst-case at placement and
// reconciles terminal orders to realized. The "resting order" rows below are
// the regression: pre-fix record was realizedStakePoints(o) == 0; post-fix it
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
			&Order{Status: OrderStatusPartial, FilledQuantity: 3, CapturedCashPoints: 1500}, 5000, 0},

		// Terminal taker: record committed, release the uncaptured remainder
		// so the net equals realized captured points.
		{"filled taker nets to realized (5000 committed, 4994 captured)", 5000,
			&Order{Status: OrderStatusFilled, FilledQuantity: 136, CapturedCashPoints: 4994}, 5000, 6},
		{"market IOC cancelled remainder nets to realized (2500 cap, 190 captured)", 2500,
			&Order{Status: OrderStatusCancelled, FilledQuantity: 1, CapturedCashPoints: 190}, 2500, 2310},
		{"expired unfilled releases the whole committed (net 0)", 2500,
			&Order{Status: OrderStatusExpired, FilledQuantity: 0}, 2500, 2500},
		{"fully captured terminal releases nothing", 1900,
			&Order{Status: OrderStatusFilled, FilledQuantity: 10, CapturedCashPoints: 1900}, 1900, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec, rel := rgPlacementAccounting(c.committed, c.o)
			if rec != c.wantRecord || rel != c.wantRelease {
				t.Fatalf("rgPlacementAccounting(%d, %+v) = (record %d, release %d), want (%d, %d)",
					c.committed, c.o, rec, rel, c.wantRecord, c.wantRelease)
			}
			// Regression guard: a resting order under the OLD model recorded
			// realizedStakePoints (0 here) — i.e. the bypass. The new model
			// must record the full committed for a non-terminal order.
			if c.o != nil && c.committed > 0 && c.o.Status == OrderStatusOpen {
				if rec == realizedStakePoints(c.o) {
					t.Fatalf("resting order still records realized (%d) — bypass not closed", rec)
				}
			}
		})
	}
}

// The resting-order expiry sweep worker is wired in every deployment,
// including memory/test mode where the wallet is not an
// ExchangeWalletAdapter and the DB-backed repo query is unavailable. It
// MUST no-op cleanly there (return 0,0,nil) — never error the worker loop
// or panic — so a non-DB process can run the worker harmlessly.
func TestSweepExpiredRestingOrders_SafeInMemoryMode(t *testing.T) {
	svc := NewService(newMemRepo(), newFakeWallet(0))
	expired, failed, err := svc.SweepExpiredRestingOrders(context.Background())
	if err != nil {
		t.Fatalf("memory-mode sweep must not error, got %v", err)
	}
	if expired != 0 || failed != 0 {
		t.Fatalf("memory-mode sweep must be a no-op, got expired=%d failed=%d", expired, failed)
	}
}

// codex-#4: on the AtomicBetGate path the committed stake is recorded
// atomically AT the gate, so placement never records again — it only
// RELEASES the portion that didn't become realized spend. This locks the
// reconcile math: a failed placement or a concurrent idempotent replay
// releases the whole committed (order didn't stand / original already
// counts it); a terminal order releases committed−realized; a resting
// order releases nothing (its full committed stays counted until
// cancel/expire — the D-5 invariant, preserved).
func TestRGReleaseAfterAtomicGate(t *testing.T) {
	cases := []struct {
		name        string
		committed   int64
		o           *Order
		replayed    bool
		hadErr      bool
		wantRelease int64
	}{
		{"zero committed releases nothing", 0, &Order{Status: OrderStatusFilled}, false, false, 0},
		{"placement error releases whole committed", 5000,
			&Order{Status: OrderStatusOpen}, false, true, 5000},
		{"idempotent replay releases whole committed (original counts it)", 5000,
			&Order{Status: OrderStatusFilled, CapturedCashPoints: 5000}, true, false, 5000},
		{"nil order releases whole committed", 5000, nil, false, false, 5000},
		{"never-reserved reject releases whole committed", 5000,
			&Order{Status: OrderStatusRejected}, false, false, 5000},
		{"resting open releases nothing (committed stays counted)", 5000,
			&Order{Status: OrderStatusOpen, FilledQuantity: 0}, false, false, 0},
		{"resting partial releases nothing", 5000,
			&Order{Status: OrderStatusPartial, FilledQuantity: 3, CapturedCashPoints: 1500}, false, false, 0},
		{"filled taker releases committed−realized", 5000,
			&Order{Status: OrderStatusFilled, FilledQuantity: 136, CapturedCashPoints: 4994}, false, false, 6},
		{"IOC cancelled remainder releases committed−realized", 2500,
			&Order{Status: OrderStatusCancelled, FilledQuantity: 1, CapturedCashPoints: 190}, false, false, 2310},
		{"expired unfilled releases whole committed", 2500,
			&Order{Status: OrderStatusExpired, FilledQuantity: 0}, false, false, 2500},
		{"fully captured terminal releases nothing", 1900,
			&Order{Status: OrderStatusFilled, FilledQuantity: 10, CapturedCashPoints: 1900}, false, false, 0},
		{"error wins over a resting status", 5000,
			&Order{Status: OrderStatusOpen}, false, true, 5000},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := rgReleaseAfterAtomicGate(c.committed, c.o, c.replayed, c.hadErr)
			if got != c.wantRelease {
				t.Fatalf("rgReleaseAfterAtomicGate(%d, %+v, replayed=%v, hadErr=%v) = %d, want %d",
					c.committed, c.o, c.replayed, c.hadErr, got, c.wantRelease)
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
		if _, err := svc.checkComplianceForOrder(context.Background(), "u", 500); err != nil {
			t.Fatalf("dev must fail open on infra error, got %v", err)
		}
	})
	t.Run("production fails closed", func(t *testing.T) {
		t.Setenv("ENVIRONMENT", "production")
		if _, err := svc.checkComplianceForOrder(context.Background(), "u", 500); err == nil {
			t.Fatal("production must fail closed on infra error, got nil")
		}
	})
	t.Run("staging fails closed", func(t *testing.T) {
		t.Setenv("ENVIRONMENT", "staging")
		if _, err := svc.checkComplianceForOrder(context.Background(), "u", 500); err == nil {
			t.Fatal("staging must fail closed on infra error, got nil")
		}
	})
}
