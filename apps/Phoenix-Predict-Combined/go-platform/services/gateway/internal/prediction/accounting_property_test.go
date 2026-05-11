package prediction

// Property-based tests for the pure-math accounting helpers. These are the
// functions that move money: a sign error or off-by-one here means real
// dollars lost to or stolen from users. The point isn't to cover every
// example case (that's accounting_test.go's job) — it's to randomly explore
// the input space and verify invariants that MUST hold for every input.
//
// Uses testing/quick from stdlib so we don't add a dependency. Each test
// runs 10_000 cases by default; bump via go test -v if you want more.

import (
	"math/rand"
	"testing"
	"testing/quick"
)

const propIterations = 10_000

func propConfig() *quick.Config {
	return &quick.Config{
		MaxCount: propIterations,
		Rand:     rand.New(rand.NewSource(20260511)),
	}
}

// --- CalculateTakerFeeCents ---

// Property: fee is never negative.
//
// Why this matters: the gateway debits the fee from the taker's wallet on
// every fill. A negative fee would silently credit them, which is the
// finance-team-calls-you-at-3am kind of bug.
func TestProp_TakerFee_NonNegative(t *testing.T) {
	f := func(bpsRaw, priceRaw, qtyRaw uint16) bool {
		bps := int(bpsRaw % 1001)   // 0..1000
		price := int(priceRaw % 200) // 0..199 (incl. out-of-band)
		qty := int(qtyRaw % 1000)    // 0..999
		fee := CalculateTakerFeeCents(bps, price, qty)
		return fee >= 0
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// Property: fee is zero at price extremes (0 and 100) — the
// price-band-violation guard short-circuits.
func TestProp_TakerFee_ZeroAtExtremes(t *testing.T) {
	f := func(bpsRaw, qtyRaw uint16) bool {
		bps := int(bpsRaw % 1001)
		qty := int(qtyRaw % 1000)
		// Prices 0 and 100 are outside the [1,99] band.
		if CalculateTakerFeeCents(bps, 0, qty) != 0 {
			return false
		}
		if CalculateTakerFeeCents(bps, 100, qty) != 0 {
			return false
		}
		return true
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// Property: the fee never exceeds the mathematical upper bound
// (bps × qty × 2500) / 1_000_000, which is bps × qty / 400.
//
// Derivation: fee = bps × p × (100-p) × qty / 1_000_000. The product
// p × (100-p) is maximised at p=50 where it equals 2500. So the per-share
// max fee is bps × 2500 / 1_000_000 = bps/400 cents. Multiplying by qty
// gives the bound for the whole fill. A regression that, say, drops the
// 1_000_000 divisor would be caught here.
func TestProp_TakerFee_BoundedByMathMax(t *testing.T) {
	f := func(bpsRaw, priceRaw, qtyRaw uint16) bool {
		bps := int(bpsRaw % 1001)
		price := int(priceRaw%99) + 1 // 1..99 (in-band)
		qty := int(qtyRaw%999) + 1    // 1..999
		fee := CalculateTakerFeeCents(bps, price, qty)
		// Closed-form upper bound, rounded up by 1¢ to account for the
		// integer division's worst-case truncation behaviour.
		bound := int64(bps)*int64(qty)/400 + 1
		return fee <= bound
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// Property: fee is monotonic in quantity — doubling qty at fixed bps+price
// gives at least the same fee, never less.
//
// Why: if a malformed division ever truncated more on larger qty than smaller
// (e.g., a bps tier kicks in), this would catch it.
func TestProp_TakerFee_MonotonicInQty(t *testing.T) {
	f := func(bpsRaw, priceRaw, qtyRaw uint16) bool {
		bps := int(bpsRaw%1000) + 1   // 1..1000
		price := int(priceRaw%99) + 1 // 1..99
		qty := int(qtyRaw%500) + 1    // 1..500
		fee1 := CalculateTakerFeeCents(bps, price, qty)
		fee2 := CalculateTakerFeeCents(bps, price, qty*2)
		return fee2 >= fee1
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// --- AverageCostAfterBuy ---

// Property: the new average lies between the existing average and the new
// price (within integer-rounding tolerance of 1¢ for truncation).
//
// Why: this is the definition of a weighted mean. If the formula ever
// produces a value outside [min, max] of its inputs it's a bug. The ±1
// tolerance accounts for integer-division truncation toward zero.
func TestProp_AvgCost_LiesBetweenInputs(t *testing.T) {
	f := func(eqRaw, eaRaw, aqRaw, apRaw uint16) bool {
		eq := int(eqRaw%500) + 1   // 1..500 existing qty
		ea := int(eaRaw%99) + 1    // 1..99 existing avg
		aq := int(aqRaw%500) + 1   // 1..500 add qty
		ap := int(apRaw%99) + 1    // 1..99 add price
		got := AverageCostAfterBuy(eq, ea, aq, ap)
		lo, hi := ea, ap
		if hi < lo {
			lo, hi = hi, lo
		}
		// Integer truncation can push got 1¢ below lo at worst.
		return got >= lo-1 && got <= hi+1
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// Property: buying into an empty position sets avg = add price.
func TestProp_AvgCost_EmptyPositionEqualsAddPrice(t *testing.T) {
	f := func(eaRaw, aqRaw, apRaw uint16) bool {
		ea := int(eaRaw % 100) // doesn't matter when qty is 0
		aq := int(aqRaw%500) + 1
		ap := int(apRaw%99) + 1
		return AverageCostAfterBuy(0, ea, aq, ap) == ap
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// Property: adding zero quantity leaves the existing average unchanged.
func TestProp_AvgCost_ZeroAddIsNoop(t *testing.T) {
	f := func(eqRaw, eaRaw, apRaw uint16) bool {
		eq := int(eqRaw%500) + 1
		ea := int(eaRaw%99) + 1
		ap := int(apRaw % 100)
		return AverageCostAfterBuy(eq, ea, 0, ap) == ea
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// --- RealizedPnLOnSell ---

// Property: PnL sign matches the direction of the price move.
//
// Why: this is the user-facing P&L on a sell. A sign flip would show
// "+ $10" when the user actually lost $10, which destroys trust the moment
// they reconcile it against a screenshot.
func TestProp_RealizedPnL_SignMatchesDirection(t *testing.T) {
	f := func(qtyRaw, eaRaw, spRaw uint16) bool {
		qty := int(qtyRaw%500) + 1
		ea := int(eaRaw%99) + 1
		sp := int(spRaw%99) + 1
		pnl := RealizedPnLOnSell(qty, ea, sp)
		switch {
		case sp > ea:
			return pnl > 0
		case sp < ea:
			return pnl < 0
		default:
			return pnl == 0
		}
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// Property: PnL on zero qty is zero.
func TestProp_RealizedPnL_ZeroQtyIsZero(t *testing.T) {
	f := func(eaRaw, spRaw uint16) bool {
		ea := int(eaRaw%99) + 1
		sp := int(spRaw%99) + 1
		return RealizedPnLOnSell(0, ea, sp) == 0
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// Property: PnL is linear in qty — selling 2x qty at the same prices yields
// exactly 2x the PnL.
func TestProp_RealizedPnL_LinearInQty(t *testing.T) {
	f := func(qtyRaw, eaRaw, spRaw uint16) bool {
		qty := int(qtyRaw%500) + 1
		ea := int(eaRaw%99) + 1
		sp := int(spRaw%99) + 1
		pnl1 := RealizedPnLOnSell(qty, ea, sp)
		pnl2 := RealizedPnLOnSell(qty*2, ea, sp)
		return pnl2 == 2*pnl1
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// --- IssuanceFillFeasible / ComplementaryTakerPriceCents ---

// Property: when feasible, the complementary taker price plus the maker
// limit equals par (100). The collateral pool grows by exactly 100¢ per
// share in this case — the invariant the reconciler checks.
func TestProp_Issuance_ComplementaryEqualsPar(t *testing.T) {
	f := func(tlRaw, mlRaw uint16) bool {
		tl := int(tlRaw%99) + 1
		ml := int(mlRaw%99) + 1
		if !IssuanceFillFeasible(tl, ml) {
			return true // vacuous
		}
		takerPx := ComplementaryTakerPriceCents(ml)
		return takerPx+ml == ParPriceCents
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// --- ApplyPositionMutation ---

// Property: after a buy mutation, the TotalCostCents (authoritative cumulative
// spend) is within one Quantity-worth of the displayed Quantity × AvgPriceCents
// product. Exact equality is impossible because AvgPriceCents is an integer
// derived as TotalCost / Quantity, which truncates. The truncation residue is
// bounded above by Quantity cents (one cent per share lost to floor()), which
// is what this property asserts.
//
// The reconciler's cross-user collateral invariant doesn't care about this
// per-position residue — it sums TotalCostCents directly. AvgPriceCents is a
// display-layer value.
func TestProp_ApplyPositionMutation_BuyInvariant(t *testing.T) {
	f := func(startQtyRaw, startAvgRaw, fillQtyRaw, fillPxRaw uint16) bool {
		p := Position{
			UserID:        "u",
			MarketID:      "m",
			Side:          OrderSideYes,
			Quantity:      int(startQtyRaw % 1000),
			AvgPriceCents: int(startAvgRaw%99) + 1,
		}
		p.TotalCostCents = int64(p.Quantity) * int64(p.AvgPriceCents)
		fq := int(fillQtyRaw%500) + 1
		fp := int(fillPxRaw%99) + 1
		ApplyPositionMutation(&p, PositionMutation{
			UserID: "u", MarketID: "m", Side: OrderSideYes,
			DeltaQty: fq, FillPriceCents: fp, IsSell: false,
		})
		// TotalCost is the truth. Displayed avg × qty must be within one
		// qty-worth of it (truncation residue ≤ qty cents).
		displayed := int64(p.Quantity) * int64(p.AvgPriceCents)
		residue := p.TotalCostCents - displayed
		return residue >= 0 && residue < int64(p.Quantity+1)
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// Property: after a sell mutation, total_cost == quantity × avg_price AND
// quantity never goes negative.
func TestProp_ApplyPositionMutation_SellInvariant(t *testing.T) {
	f := func(startQtyRaw, startAvgRaw, sellQtyRaw, sellPxRaw uint16) bool {
		startQty := int(startQtyRaw%1000) + 1
		p := Position{
			UserID:        "u",
			MarketID:      "m",
			Side:          OrderSideYes,
			Quantity:      startQty,
			AvgPriceCents: int(startAvgRaw%99) + 1,
		}
		p.TotalCostCents = int64(p.Quantity) * int64(p.AvgPriceCents)
		sq := int(sellQtyRaw % uint16(startQty+200)) // sometimes oversell
		if sq == 0 {
			sq = 1
		}
		sp := int(sellPxRaw%99) + 1
		ApplyPositionMutation(&p, PositionMutation{
			UserID: "u", MarketID: "m", Side: OrderSideYes,
			DeltaQty: -sq, FillPriceCents: sp, IsSell: true,
		})
		if p.Quantity < 0 {
			return false
		}
		return p.TotalCostCents == int64(p.Quantity)*int64(p.AvgPriceCents)
	}
	if err := quick.Check(f, propConfig()); err != nil {
		t.Error(err)
	}
}

// Property: applying N identical buys is equivalent (within ±1¢ rounding)
// to one buy of N × qty. The exchange engine emits one PositionMutation per
// fill; if a 100-fill match produced a materially different avg-cost than
// the single-shot equivalent, users would see strange numbers for orders
// that fragment across the book.
func TestProp_ApplyPositionMutation_FillFragmentationStable(t *testing.T) {
	rng := rand.New(rand.NewSource(42))
	for i := 0; i < 500; i++ {
		startQty := rng.Intn(500) + 1
		startAvg := rng.Intn(99) + 1
		fillQty := rng.Intn(100) + 2
		fillPx := rng.Intn(99) + 1
		n := rng.Intn(10) + 2

		// Path A: n separate fills of fillQty each.
		a := Position{Quantity: startQty, AvgPriceCents: startAvg,
			TotalCostCents: int64(startQty) * int64(startAvg)}
		for j := 0; j < n; j++ {
			ApplyPositionMutation(&a, PositionMutation{
				DeltaQty: fillQty, FillPriceCents: fillPx, IsSell: false,
			})
		}
		// Path B: one fill of n*fillQty.
		b := Position{Quantity: startQty, AvgPriceCents: startAvg,
			TotalCostCents: int64(startQty) * int64(startAvg)}
		ApplyPositionMutation(&b, PositionMutation{
			DeltaQty: n * fillQty, FillPriceCents: fillPx, IsSell: false,
		})

		if a.Quantity != b.Quantity {
			t.Fatalf("qty differs: split=%d single=%d", a.Quantity, b.Quantity)
		}
		// Avg may differ by 1 due to repeated integer truncation. Anything
		// more than that is a real divergence.
		diff := a.AvgPriceCents - b.AvgPriceCents
		if diff < 0 {
			diff = -diff
		}
		if diff > 1 {
			t.Fatalf("avg differs by %d: split=%d single=%d (startQty=%d startAvg=%d fillQty=%d n=%d fillPx=%d)",
				diff, a.AvgPriceCents, b.AvgPriceCents, startQty, startAvg, fillQty, n, fillPx)
		}
	}
}
