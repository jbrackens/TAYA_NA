package prediction

import (
	"errors"
	"fmt"
	"time"
)

// ExchangeEngine matches orders against the order book. The engine is pure:
// it takes a snapshot of market + book + taker state and produces a MatchPlan
// describing trades, position updates, ledger entries, and reservation moves.
// Persistence is the repository's job (see SQLRepository.PersistMatchAtomic).
//
// The engine assumes the caller has already:
//   - opened a tx at READ COMMITTED
//   - taken pg_advisory_xact_lock on the market
//   - locked the market row, the taker's wallet/position rows, and the
//     candidate maker order rows FOR UPDATE
//   - validated the request shape (priceCents in [1,99] for limits,
//     notionalCapCents present for markets, idempotency/client_order_id
//     deduped at the SQL layer)
//
// Within those guarantees, BuildPlan is deterministic and side-effect-free.
type ExchangeEngine struct{}

// NewExchangeEngine constructs an engine. No config in v1.
func NewExchangeEngine() *ExchangeEngine { return &ExchangeEngine{} }

// MatchInput is the snapshot fed into BuildPlan.
type MatchInput struct {
	Market Market
	// Taker is the incoming order with status=pending. ID and timestamps must
	// already be assigned by the caller (so trade rows can reference them).
	Taker Order
	// MakersSecondary are resting orders on the opposite ACTION, same side
	// (e.g., taker is Buy YES → makers are resting Sell YES). Ordered by
	// price-time priority (best price first; FIFO ties).
	MakersSecondary []Order
	// MakersIssuance are resting orders on the opposite SIDE, same action
	// (e.g., taker is Buy YES → makers are resting Buy NO). Ordered by
	// price-time priority.
	MakersIssuance []Order
	// TakerPosition is the taker's existing position on the order's side
	// (used for sell available-qty checks). nil if no position.
	TakerPosition *Position
	// Now is the timestamp to stamp on trades and updates.
	Now time.Time
	// IDFactory generates UUIDs for new trades and ledger entries.
	IDFactory func() string
}

// MatchPlan is the structured output of BuildPlan — pure data describing
// what should be persisted.
type MatchPlan struct {
	// Taker is the post-match version of the taker order (updated status,
	// filled_quantity, remaining_quantity, captured_cash_cents, etc.).
	Taker Order
	// MakerUpdates are the post-match versions of any makers touched.
	MakerUpdates []Order
	// MakerPreFill records each touched maker's filled_quantity as it was when
	// the plan was built (before this plan's fills). The persistence layer
	// re-asserts it under the per-market lock with a guarded UPDATE so a maker
	// that another taker advanced between plan-build and commit is detected
	// (ErrBookChanged) instead of being regressed to stale absolute values
	// (audit COR-02). Keyed by maker order ID.
	MakerPreFill map[string]int
	// Trades are the immutable fill records to insert. For issuance fills,
	// two rows share a match_id and trade_kind='issuance'.
	Trades []Trade
	// PositionMutations describe per-fill position effects. The persistence
	// layer aggregates them by (user_id, market_id, side), reads the existing
	// position FOR UPDATE, applies each mutation in order via
	// ApplyPositionMutation, and upserts the final state. This keeps the
	// engine pure (no DB reads needed) while still computing correct
	// avg-cost and realised PnL against the user's prior position.
	PositionMutations []PositionMutation
	// LedgerEntries are collateral ledger inserts. balance_after_cents is
	// not yet computed here; the repository fills it in under the lock.
	LedgerEntries []CollateralLedgerEntry
	// Market is the post-match market with updated collateral_pool, quote
	// snapshot, last_quote_at, etc.
	Market Market
	// Reservation operations the persistence layer should apply:
	HoldReservation     *ReservationHold     // taker's cash reservation
	CaptureReservations []ReservationCapture // per-fill captures from holds
	ReleaseReservations []ReservationRef     // refund the unfilled portion
	// SellerCredits pay the seller's cash proceeds on secondary (same-side
	// transfer) fills. The buyer's cash is captured via CaptureReservations;
	// the matching credit to the seller goes here. Issuance fills mint
	// contracts (both sides pay) and produce no SellerCredits.
	SellerCredits []SellerCredit
	// PositionReservationDeltas locks shares for newly resting sell orders
	// and releases those locks as resting sell makers fill.
	PositionReservationDeltas []PositionReservationDelta
	// FillSummary is a succinct human-readable summary for logs/WS.
	FillSummary string
}

// SellerCredit is a cash credit to a seller for proceeds on a secondary
// fill. CreditKey is unique per trade for wallet idempotency (a retried
// PersistMatchAtomic must not double-credit).
type SellerCredit struct {
	UserID      string
	AmountCents int64
	CreditKey   string
}

// ReservationRef identifies a wallet reservation by (type, id).
type ReservationRef struct {
	Type string
	ID   string
}

// ReservationCapture is a partial capture against an existing reservation.
type ReservationCapture struct {
	Type        string
	ID          string
	AmountCents int64
	CaptureKey  string
}

// ReservationHold is a new reservation to be created at plan time.
type ReservationHold struct {
	UserID      string
	AmountCents int64
	Type        string
	ID          string
	ExpiresIn   time.Duration
}

// PositionReservationDelta changes prediction_positions.reserved_quantity.
// Positive values lock shares for a resting sell order; negative values
// release shares that a resting sell maker just delivered.
type PositionReservationDelta struct {
	UserID   string
	MarketID string
	Side     OrderSide
	Delta    int
}

// --- Validation ---

// ErrPriceBandViolation is returned when priceCents is out of [1,99].
var ErrPriceBandViolation = errors.New(FailurePriceBandViolation)

// ErrPostOnlyWouldTake is returned when a post-only limit would take any
// quantity at submission.
var ErrPostOnlyWouldTake = errors.New(FailurePostOnlyWouldTake)

// ErrBookChanged is returned by the persistence layer when a maker's on-disk
// fill state no longer matches what the plan was built against — another taker
// matched it first. The caller re-loads the book and re-plans (audit COR-02).
var ErrBookChanged = errors.New("order book changed during match; replan required")

// recordMakerPreFill captures a maker's filled_quantity the first time it is
// touched in a plan, so the persistence layer can re-assert it under the lock.
func recordMakerPreFill(plan *MatchPlan, maker *Order) {
	if plan.MakerPreFill == nil {
		plan.MakerPreFill = map[string]int{}
	}
	if _, seen := plan.MakerPreFill[maker.ID]; !seen {
		plan.MakerPreFill[maker.ID] = maker.FilledQuantity
	}
}

// ErrSelfMatchRejected is returned when the taker's first crossing maker
// belongs to the same user and self_match_action='cancel_taker'.
var ErrSelfMatchRejected = errors.New(FailureSelfMatchRejected)

// ErrClosedMarket is returned when the market is not in 'open' status.
var ErrClosedMarket = errors.New(FailureClosedMarket)

// ErrInsufficientPosition is returned when a sell exceeds available shares
// (after subtracting reserved).
var ErrInsufficientPosition = errors.New(FailureInsufficientPosition)

// ErrNotionalCapMissing is returned when a market order has no notional cap.
var ErrNotionalCapMissing = errors.New(FailureNotionalCapMissing)

// ErrFOKUnavailable is returned when a FOK order cannot fully fill against
// the current book.
var ErrFOKUnavailable = errors.New(FailureFOKUnavailable)

// ValidatePlaceOrderRequest checks request invariants that don't require
// the book — bounds, order-type-specific required fields, market state.
// Returns one of the typed errors above (sentinels match failure_reason).
func ValidatePlaceOrderRequest(req PlaceOrderRequest, market *Market, position *Position) error {
	if market == nil {
		return ErrClosedMarket
	}
	if market.Status != MarketStatusOpen {
		return ErrClosedMarket
	}
	if market.ExecutionMode != ExecutionModeOrderBook {
		return ErrClosedMarket // engine only services order_book markets
	}
	if req.Quantity <= 0 {
		return fmt.Errorf("quantity must be positive")
	}

	switch req.OrderType {
	case OrderTypeLimit:
		if req.PriceCents == nil {
			return fmt.Errorf("limit order requires priceCents")
		}
		if !PriceWithinBounds(*req.PriceCents) {
			return ErrPriceBandViolation
		}
	case OrderTypeMarket:
		// Notional cap requirement is enforced upstream (handler) since the
		// MatchInput already has a fully populated Order; this validation
		// catches mis-wired callers.
	default:
		return fmt.Errorf("unknown order type: %s", req.OrderType)
	}

	if req.Action == OrderActionSell {
		avail := AvailableQuantity(position)
		if avail < req.Quantity {
			return ErrInsufficientPosition
		}
	}
	return nil
}

// --- Match loop ---

// BuildPlan walks the maker book and produces a MatchPlan. It does not write
// to the database; the caller persists the plan atomically.
func (e *ExchangeEngine) BuildPlan(input MatchInput) (*MatchPlan, error) {
	// Snapshot copies so we can mutate freely without aliasing the input.
	taker := input.Taker
	market := input.Market

	plan := &MatchPlan{
		Taker:             taker,
		Market:            market,
		Trades:            []Trade{},
		PositionMutations: []PositionMutation{},
		LedgerEntries:     []CollateralLedgerEntry{},
		MakerPreFill:      map[string]int{},
	}

	// Secondary matching (same-side transfer) runs for BOTH buy and sell
	// takers. canCrossSecondary and LoadMakersForSecondary handle the role
	// inversion: a Sell taker crosses resting Buy makers on the same side
	// (taker sell vs maker buy). Sells never generate issuance (no naked
	// shorts) — they only transfer existing shares via this path.
	for i := range input.MakersSecondary {
		if takerDone(&taker) {
			break
		}
		maker := &input.MakersSecondary[i]
		if !canCrossSecondary(&taker, maker) {
			break // book ordered by price-time; no further crossing possible
		}
		if blocked, blockErr := applySelfMatch(&taker, maker); blockErr != nil {
			return nil, blockErr
		} else if blocked {
			continue
		}
		if taker.PostOnly {
			// Limit order set to post_only would take here — reject.
			return nil, ErrPostOnlyWouldTake
		}
		fillQty := minInt(taker.RemainingQuantity, maker.RemainingQuantity)
		fillQty = capFillQtyByNotionalCap(&taker, fillQty, *maker.PriceCents)
		if fillQty <= 0 {
			continue
		}
		fillPrice := *maker.PriceCents // maker price wins on secondary
		fillSecondary(plan, &taker, maker, fillQty, fillPrice, input.Now, input.IDFactory)
	}

	// Complementary issuance is Buy-only: a Buy taker mints new contracts
	// against opposite-side Buy makers. A Sell taker has no issuance path
	// (no naked shorts) — it is fully serviced by the secondary loop above.
	//
	// For limit orders the taker's PriceCents bounds feasibility:
	// `taker_limit + maker_limit >= par`. For market orders the taker
	// has no explicit limit, so we use par-1 (MaxTickPriceCents) as the
	// implied taker price. That makes every in-band maker
	// (price >= 1) feasible — the notional cap on the request limits
	// total dollar exposure upstream.
	//
	// SMM Phase 1 surfaced that without this market-order issuance
	// path, the default trade ticket got "cancelled — no matching
	// liquidity" on every order_book market with only SMM-provided
	// Buy-NO quotes. Users had to switch to Limit mode to get fills.
	// Fixed here so market buys cross issuance correctly.
	if taker.Action == OrderActionBuy && !takerDone(&taker) {
		takerPriceForIssuance := MaxTickPriceCents
		if taker.PriceCents != nil {
			takerPriceForIssuance = *taker.PriceCents
		}
		for i := range input.MakersIssuance {
			if takerDone(&taker) {
				break
			}
			maker := &input.MakersIssuance[i]
			if maker.PriceCents == nil {
				continue
			}
			if !IssuanceFillFeasible(takerPriceForIssuance, *maker.PriceCents) {
				break // book ordered by maker price; no further matches
			}
			if blocked, blockErr := applySelfMatch(&taker, maker); blockErr != nil {
				return nil, blockErr
			} else if blocked {
				continue
			}
			if taker.PostOnly {
				return nil, ErrPostOnlyWouldTake
			}
			fillQty := minInt(taker.RemainingQuantity, maker.RemainingQuantity)
			// Issuance fills cost the taker (100 - maker_limit) per share,
			// not the maker's limit price. Cap-check at the actual taker
			// cost so a market BUY with notionalCapCents=N can't overshoot
			// the reservation.
			fillQty = capFillQtyByNotionalCap(&taker, fillQty, ComplementaryTakerPriceCents(*maker.PriceCents))
			if fillQty <= 0 {
				continue
			}
			fillIssuance(plan, &taker, maker, fillQty, input.Now, input.IDFactory)
		}
	}

	// Apply TIF to remainder.
	if err := applyTIF(plan, &taker); err != nil {
		return nil, err
	}

	plan.Taker = taker
	// Do not overwrite plan.Market here — fillIssuance mutates it in-place
	// (e.g., CollateralPoolCents, LastQuoteAt, VolumeCents).
	plan.FillSummary = fmt.Sprintf("filled %d/%d of order %s",
		taker.FilledQuantity, taker.Quantity, taker.ID)
	return plan, nil
}

// --- Match helpers (private) ---

// takerDone reports whether the taker has nothing left to fill.
func takerDone(o *Order) bool { return o.RemainingQuantity <= 0 }

// canCrossSecondary reports whether a taker can cross the next maker on the
// book in a secondary same-side transfer. For market orders (no priceCents)
// this is always true (subject to notional cap, enforced separately).
func canCrossSecondary(taker, maker *Order) bool {
	if maker.PriceCents == nil {
		return false
	}
	if taker.PriceCents == nil {
		return true // market order
	}
	if taker.Action == OrderActionBuy && maker.Action == OrderActionSell {
		return *taker.PriceCents >= *maker.PriceCents
	}
	if taker.Action == OrderActionSell && maker.Action == OrderActionBuy {
		return *taker.PriceCents <= *maker.PriceCents
	}
	return false
}

// applySelfMatch checks whether maker belongs to the same user as taker and
// applies the taker's SelfMatchAction. Returns (blocked, err):
//   - cancel_taker → err = ErrSelfMatchRejected (caller must abort).
//   - cancel_maker → blocked=true (skip this maker, continue).
//   - cancel_both  → err = ErrSelfMatchRejected (taker cancelled, maker
//     cancelled by repo at persist time via the plan; v1 simplification:
//     same as cancel_taker for now).
func applySelfMatch(taker, maker *Order) (bool, error) {
	if taker.UserID != maker.UserID {
		return false, nil
	}
	switch taker.SelfMatchAction {
	case SelfMatchCancelTaker, SelfMatchCancelBoth, "":
		return false, ErrSelfMatchRejected
	case SelfMatchCancelMaker:
		return true, nil
	default:
		return false, ErrSelfMatchRejected
	}
}

// fillSecondary applies a same-side transfer fill: buyer pays seller, position
// moves, no collateral pool change.
func fillSecondary(plan *MatchPlan, taker, maker *Order, fillQty, fillPrice int, now time.Time, idFactory func() string) {
	recordMakerPreFill(plan, maker)
	tradeID := idFactory()
	matchID := tradeID // secondary: match_id = trade id

	var buyOrderID, sellOrderID *string
	var buyerID string
	var sellerID *string
	if taker.Action == OrderActionBuy {
		buyOrderID = stringPointer(taker.ID)
		sellOrderID = stringPointer(maker.ID)
		buyerID = taker.UserID
		s := maker.UserID
		sellerID = &s
	} else {
		buyOrderID = stringPointer(maker.ID)
		sellOrderID = stringPointer(taker.ID)
		buyerID = maker.UserID
		s := taker.UserID
		sellerID = &s
	}

	takerFee := CalculateTakerFeeCents(plan.Market.FeeRateBps, fillPrice, fillQty)
	trade := Trade{
		ID:          tradeID,
		MarketID:    plan.Market.ID,
		BuyOrderID:  buyOrderID,
		SellOrderID: sellOrderID,
		BuyerID:     buyerID,
		SellerID:    sellerID,
		Side:        taker.Side,
		PriceCents:  fillPrice,
		Quantity:    fillQty,
		FeeCents:    int(takerFee), // v1: fee_cents column carries taker fee
		MatchID:     matchID,
		TradeKind:   TradeKindSecondary,
		EngineKind:  EngineKindOrderBook,
		TradedAt:    now,
	}
	plan.Trades = append(plan.Trades, trade)

	// Update taker: filled, captured cash for buys.
	taker.FilledQuantity += fillQty
	taker.RemainingQuantity -= fillQty
	if taker.Action == OrderActionBuy {
		taker.CapturedCashCents += int64(fillQty) * int64(fillPrice)
	}
	taker.FilledCostCents += int64(fillQty) * int64(fillPrice)

	// Update maker: same fields, mirrored.
	maker.FilledQuantity += fillQty
	maker.RemainingQuantity -= fillQty
	if maker.Action == OrderActionBuy {
		maker.CapturedCashCents += int64(fillQty) * int64(fillPrice)
	}
	maker.FilledCostCents += int64(fillQty) * int64(fillPrice)
	if taker.Action == OrderActionBuy && maker.Action == OrderActionSell {
		maker.ReservedQuantity -= fillQty
		if maker.ReservedQuantity < 0 {
			maker.ReservedQuantity = 0
		}
		plan.PositionReservationDeltas = append(plan.PositionReservationDeltas, PositionReservationDelta{
			UserID: maker.UserID, MarketID: plan.Market.ID, Side: maker.Side, Delta: -fillQty,
		})
	}
	if maker.RemainingQuantity == 0 {
		maker.Status = OrderStatusFilled
		filled := now
		maker.FilledAt = &filled
	} else {
		maker.Status = OrderStatusPartial
	}
	plan.MakerUpdates = append(plan.MakerUpdates, *maker)

	// Capture buyer's cash from their reservation (per-fill).
	buyer := taker
	if taker.Action != OrderActionBuy {
		buyer = maker
	}
	plan.CaptureReservations = append(plan.CaptureReservations, ReservationCapture{
		Type:        "prediction_order",
		ID:          buyer.ID,
		AmountCents: int64(fillQty) * int64(fillPrice),
		CaptureKey:  "prediction_fill:" + tradeID,
	})

	// Credit the seller's proceeds. A secondary fill is a same-side
	// transfer: the buyer's captured cash (above) is paid to the seller.
	// Without this the seller's position decrements but they receive
	// nothing — silent value loss (UAT 2026-05-16 D-1, second-order).
	if sellerID != nil {
		plan.SellerCredits = append(plan.SellerCredits, SellerCredit{
			UserID:      *sellerID,
			AmountCents: int64(fillQty) * int64(fillPrice),
			CreditKey:   "prediction_fill_proceeds:" + tradeID,
		})
	}

	// Fee ledger entry (taker pays fee in v1; maker fee = 0).
	if takerFee > 0 {
		feeReason := "taker fee on secondary fill"
		plan.LedgerEntries = append(plan.LedgerEntries, CollateralLedgerEntry{
			MarketID:    plan.Market.ID,
			TradeID:     &tradeID,
			OrderID:     &taker.ID,
			UserID:      &taker.UserID,
			EntryType:   CollateralFee,
			AmountCents: takerFee,
			Reason:      feeReason,
		})
	}

	// Position mutations: buyer gains, seller loses.
	plan.PositionMutations = append(plan.PositionMutations, PositionMutation{
		UserID: buyerID, MarketID: plan.Market.ID, Side: taker.Side,
		DeltaQty: fillQty, FillPriceCents: fillPrice, IsSell: false,
	})
	if sellerID != nil {
		plan.PositionMutations = append(plan.PositionMutations, PositionMutation{
			UserID: *sellerID, MarketID: plan.Market.ID, Side: taker.Side,
			DeltaQty: -fillQty, FillPriceCents: fillPrice, IsSell: true,
		})
	}

	// Market quote snapshot: last trade price.
	lp := fillPrice
	plan.Market.LastTradePriceCents = &lp
	plan.Market.LastQuoteAt = &now
	plan.Market.VolumeCents += int64(fillQty) * int64(fillPrice)
}

// fillIssuance applies a complementary issuance fill: maker pays maker_limit,
// taker pays (100 - maker_limit). Both sides receive a position; collateral
// pool grows by 100¢ × fillQty.
func fillIssuance(plan *MatchPlan, taker, maker *Order, fillQty int, now time.Time, idFactory func() string) {
	recordMakerPreFill(plan, maker)
	matchID := idFactory()
	makerLimit := *maker.PriceCents
	takerPrice := ComplementaryTakerPriceCents(makerLimit)

	takerFee := CalculateTakerFeeCents(plan.Market.FeeRateBps, takerPrice, fillQty)
	takerTradeID := idFactory()
	makerTradeID := idFactory()

	// Two trade rows, one per side. Both sides "buy" — sellerID is nil for
	// issuance because no one sells; the collateral pool is the counterparty.
	takerTrade := Trade{
		ID:         takerTradeID,
		MarketID:   plan.Market.ID,
		BuyOrderID: stringPointer(taker.ID),
		BuyerID:    taker.UserID,
		Side:       taker.Side,
		PriceCents: takerPrice,
		Quantity:   fillQty,
		FeeCents:   int(takerFee),
		MatchID:    matchID,
		TradeKind:  TradeKindIssuance,
		EngineKind: EngineKindOrderBook,
		TradedAt:   now,
	}
	makerTrade := Trade{
		ID:         makerTradeID,
		MarketID:   plan.Market.ID,
		BuyOrderID: stringPointer(maker.ID),
		BuyerID:    maker.UserID,
		Side:       maker.Side,
		PriceCents: makerLimit,
		Quantity:   fillQty,
		FeeCents:   0, // maker fee = 0 in v1
		MatchID:    matchID,
		TradeKind:  TradeKindIssuance,
		EngineKind: EngineKindOrderBook,
		TradedAt:   now,
	}
	plan.Trades = append(plan.Trades, takerTrade, makerTrade)

	// Taker cost (taker pays takerPrice * qty).
	takerCost := int64(fillQty) * int64(takerPrice)
	taker.FilledQuantity += fillQty
	taker.RemainingQuantity -= fillQty
	taker.CapturedCashCents += takerCost
	taker.FilledCostCents += takerCost

	plan.CaptureReservations = append(plan.CaptureReservations, ReservationCapture{
		Type:        "prediction_order",
		ID:          taker.ID,
		AmountCents: takerCost,
		CaptureKey:  "prediction_fill:" + takerTradeID,
	})

	// Maker cost (maker pays makerLimit * qty).
	makerCost := int64(fillQty) * int64(makerLimit)
	maker.FilledQuantity += fillQty
	maker.RemainingQuantity -= fillQty
	maker.CapturedCashCents += makerCost
	maker.FilledCostCents += makerCost
	if maker.RemainingQuantity == 0 {
		maker.Status = OrderStatusFilled
		filled := now
		maker.FilledAt = &filled
	} else {
		maker.Status = OrderStatusPartial
	}
	plan.MakerUpdates = append(plan.MakerUpdates, *maker)

	plan.CaptureReservations = append(plan.CaptureReservations, ReservationCapture{
		Type:        "prediction_order",
		ID:          maker.ID,
		AmountCents: makerCost,
		CaptureKey:  "prediction_fill:" + makerTradeID,
	})

	// Issuance grows the collateral pool by 100¢ × qty.
	delta := CollateralPoolDelta(TradeKindIssuance, fillQty)
	plan.Market.CollateralPoolCents += delta
	plan.LedgerEntries = append(plan.LedgerEntries, CollateralLedgerEntry{
		MarketID:    plan.Market.ID,
		TradeID:     &takerTradeID,
		EntryType:   CollateralIssue,
		AmountCents: delta,
		Reason:      "complementary issuance",
	})
	if takerFee > 0 {
		plan.LedgerEntries = append(plan.LedgerEntries, CollateralLedgerEntry{
			MarketID:    plan.Market.ID,
			TradeID:     &takerTradeID,
			OrderID:     &taker.ID,
			UserID:      &taker.UserID,
			EntryType:   CollateralFee,
			AmountCents: takerFee,
			Reason:      "taker fee on issuance fill",
		})
	}

	// Both buyers gain a position on their respective sides.
	plan.PositionMutations = append(plan.PositionMutations, PositionMutation{
		UserID: taker.UserID, MarketID: plan.Market.ID, Side: taker.Side,
		DeltaQty: fillQty, FillPriceCents: takerPrice, IsSell: false,
	})
	plan.PositionMutations = append(plan.PositionMutations, PositionMutation{
		UserID: maker.UserID, MarketID: plan.Market.ID, Side: maker.Side,
		DeltaQty: fillQty, FillPriceCents: makerLimit, IsSell: false,
	})

	plan.Market.LastQuoteAt = &now
	plan.Market.VolumeCents += int64(fillQty) * int64(ParPriceCents)
}

// applyTIF resolves the taker's remainder per its time-in-force. Returns
// ErrFOKUnavailable if FOK couldn't fully fill (caller must reject the order
// without persisting any fills).
func applyTIF(plan *MatchPlan, taker *Order) error {
	if takerDone(taker) {
		taker.Status = OrderStatusFilled
		filled := plan.Market.LastQuoteAt
		if filled != nil {
			taker.FilledAt = filled
		}
		return nil
	}
	switch taker.TimeInForce {
	case TIFFOK:
		return ErrFOKUnavailable
	case TIFIOC:
		taker.Status = OrderStatusCancelled
		// Release uncaptured remainder of the taker's reservation.
		plan.ReleaseReservations = append(plan.ReleaseReservations, ReservationRef{
			Type: "prediction_order", ID: taker.ID,
		})
		return nil
	case TIFGTC, "":
		// Market orders never rest.
		if taker.OrderType == OrderTypeMarket {
			taker.Status = OrderStatusCancelled
			plan.ReleaseReservations = append(plan.ReleaseReservations, ReservationRef{
				Type: "prediction_order", ID: taker.ID,
			})
			return nil
		}
		// Limit GTC: the remainder rests.
		if taker.FilledQuantity > 0 {
			taker.Status = OrderStatusPartial
		} else {
			taker.Status = OrderStatusOpen
		}
		if taker.Action == OrderActionSell {
			taker.ReservedQuantity = taker.RemainingQuantity
			plan.PositionReservationDeltas = append(plan.PositionReservationDeltas, PositionReservationDelta{
				UserID: taker.UserID, MarketID: plan.Market.ID, Side: taker.Side, Delta: taker.RemainingQuantity,
			})
		}
		return nil
	default:
		return fmt.Errorf("unknown TIF: %s", taker.TimeInForce)
	}
}

// stringPointer is a small helper for taking the address of a string literal.
func stringPointer(s string) *string { return &s }

// minInt returns the smaller of two ints.
func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// capFillQtyByNotionalCap clamps a proposed fillQty so the resulting
// capture stays within the taker's remaining cash budget. Market BUYs
// reserve `notionalCapCents` up front; if the matching loop tries to
// fill more than that budget allows, the wallet's CaptureReservation
// rejects with "capture N exceeds remaining M".
//
// The cap is the floor of `remainingBudget / takerPriceCents`. Integer
// division rounds down which is the safe direction — fillQty never
// causes a budget overshoot. Orders without a notional cap (regular
// limit BUYs, sells) pass through unchanged.
//
// Captures already applied in this match plan are tracked in
// taker.CapturedCashCents (mutated by each fillSecondary / fillIssuance
// call), so consecutive fills correctly consume the budget.
func capFillQtyByNotionalCap(taker *Order, proposedQty, takerPriceCents int) int {
	if taker.NotionalCapCents == nil || *taker.NotionalCapCents <= 0 {
		return proposedQty
	}
	if takerPriceCents <= 0 {
		return proposedQty
	}
	remaining := *taker.NotionalCapCents - taker.CapturedCashCents
	if remaining <= 0 {
		return 0
	}
	maxByBudget := int(remaining / int64(takerPriceCents))
	if maxByBudget < proposedQty {
		return maxByBudget
	}
	return proposedQty
}
