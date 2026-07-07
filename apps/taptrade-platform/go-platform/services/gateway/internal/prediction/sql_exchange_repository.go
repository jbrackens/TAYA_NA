package prediction

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"time"
)

// Compile-time check: SQLRepository implements ExchangeRepository. If the
// interface or a method signature drifts, the build fails here.
var _ ExchangeRepository = (*SQLRepository)(nil)
var _ RestingOrderFinalizer = (*SQLRepository)(nil)

type positionKey struct {
	UserID string
	Side   OrderSide
}

// PersistMatchAtomic applies a MatchPlan to the database in a single
// transaction held under a per-market advisory lock.
//
// Order of operations within the tx:
//  1. BEGIN at READ COMMITTED via wallet.BeginExchangeTx
//  2. pg_advisory_xact_lock(hashtext(market_id))
//  3. Re-lock and verify market is still open (defends against drift)
//  4. Apply HoldReservation (taker's cash hold) if present
//  5. Apply CaptureReservations (per-fill partial debits — buyer)
//  6. Apply ReleaseReservations (free uncaptured remainder)
//     6b. Apply SellerCredits (secondary-fill proceeds — seller)
//  7. INSERT trades
//  8. UPDATE maker orders + taker order (fill state)
//  9. Apply position mutations (group, load, mutate, upsert)
//  10. INSERT collateral ledger entries with running balance_after
//  11. UPDATE market quote snapshot + collateral_pool
//  12. COMMIT
//
// Returns nil on success. On any failure the transaction rolls back; the
// caller must surface the error to the user (and may persist a rejected
// order separately if appropriate).
func (r *SQLRepository) PersistMatchAtomic(ctx context.Context, walletAdapter ExchangeWalletAdapter, plan *MatchPlan) error {
	if plan == nil {
		return fmt.Errorf("nil plan")
	}
	tx, err := walletAdapter.BeginExchangeTx(ctx)
	if err != nil {
		return fmt.Errorf("begin exchange tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx,
		"SELECT pg_advisory_xact_lock(hashtext($1))", plan.Market.ID,
	); err != nil {
		return fmt.Errorf("acquire market lock: %w", err)
	}

	// Re-lock the market row and verify it's still open. Guards against an
	// admin halting/closing the market between plan construction and persist.
	var marketStatus string
	if err := tx.QueryRowContext(ctx,
		"SELECT status FROM prediction_markets WHERE id = $1 FOR UPDATE",
		plan.Market.ID,
	).Scan(&marketStatus); err != nil {
		return fmt.Errorf("re-lock market: %w", err)
	}
	if marketStatus != string(MarketStatusOpen) {
		return ErrClosedMarket
	}

	// Authoritative oversell guard for every seller and every new resting
	// sell reservation. Pre-trade validation read a snapshot that can go
	// stale before commit; this check runs under the per-market advisory lock
	// and row locks. Existing resting sell makers consume reserved shares
	// first, while new taker sells and newly resting sell remainders consume
	// currently available shares.
	soldByPosition := AggregateSoldQty(plan.PositionMutations)
	reservationDeltas := aggregateReservationDeltas(plan.PositionReservationDeltas)
	if len(soldByPosition) > 0 || len(reservationDeltas) > 0 {
		keys := positionKeys(soldByPosition, reservationDeltas)
		for _, k := range keys {
			var owned, reserved int
			err := tx.QueryRowContext(ctx,
				`SELECT quantity, reserved_quantity
				   FROM prediction_positions
				  WHERE user_id = $1 AND market_id = $2 AND side = $3
				  FOR UPDATE`,
				k.UserID, plan.Market.ID, string(k.Side),
			).Scan(&owned, &reserved)
			delta := reservationDeltas[k]
			reserveIncrease := positiveInt(delta)
			reserveRelease := positiveInt(-delta)
			reservedReleaseApplied := minInt(reserveRelease, reserved)
			requiredAvailable := soldByPosition[SellerPositionKey{UserID: k.UserID, Side: k.Side}] + reserveIncrease - reservedReleaseApplied
			if requiredAvailable < 0 {
				requiredAvailable = 0
			}
			if err == sql.ErrNoRows {
				if requiredAvailable > 0 {
					return ErrInsufficientPosition
				}
				continue
			}
			if err != nil {
				return fmt.Errorf("revalidate sell position: %w", err)
			}
			if SellExceedsOwned(requiredAvailable, owned, reserved) {
				return ErrInsufficientPosition
			}
		}
	}

	if plan.HoldReservation != nil {
		h := plan.HoldReservation
		if err := walletAdapter.HoldWithTx(ctx, tx, h.UserID, h.AmountPoints, h.Type, h.ID, h.ExpiresIn); err != nil {
			return fmt.Errorf("hold reservation: %w", err)
		}
	}

	for _, c := range plan.CaptureReservations {
		if err := walletAdapter.CaptureReservationWithTx(ctx, tx, c.Type, c.ID, c.AmountPoints, c.CaptureKey); err != nil {
			return fmt.Errorf("capture %s:%s: %w", c.Type, c.ID, err)
		}
	}
	for _, rel := range plan.ReleaseReservations {
		if err := walletAdapter.ReleaseReservationWithTx(ctx, tx, rel.Type, rel.ID); err != nil {
			return fmt.Errorf("release %s:%s: %w", rel.Type, rel.ID, err)
		}
	}

	// Seller proceeds on secondary fills: the buyer's captured point reservation
	// is credited to the seller. CreditKey is unique per trade so a retried
	// persist is idempotent.
	for _, sc := range plan.SellerCredits {
		if err := walletAdapter.CreditWithTx(ctx, tx, sc.UserID, sc.AmountPoints, sc.CreditKey, "secondary fill proceeds"); err != nil {
			return fmt.Errorf("credit seller %s: %w", sc.UserID, err)
		}
	}

	for i := range plan.Trades {
		if err := r.insertExchangeTradeWithTx(ctx, tx, &plan.Trades[i]); err != nil {
			return fmt.Errorf("insert trade %s: %w", plan.Trades[i].ID, err)
		}
	}

	for i := range plan.MakerUpdates {
		maker := &plan.MakerUpdates[i]
		// Guard on the fill state the plan was built against (audit COR-02):
		// if another taker advanced this maker between plan-build and now, the
		// guarded UPDATE matches 0 rows and we abort to re-plan rather than
		// writing stale absolute fill values that would regress the maker.
		prev, ok := plan.MakerPreFill[maker.ID]
		if !ok {
			// No recorded pre-fill — fall back to the unguarded write to stay
			// safe for any maker the engine touched without recording (should
			// not happen; fillSecondary/fillIssuance always record).
			if err := r.updateOrderFillStateWithTx(ctx, tx, maker); err != nil {
				return fmt.Errorf("update maker %s: %w", maker.ID, err)
			}
			continue
		}
		if err := r.updateMakerFillStateGuardedWithTx(ctx, tx, maker, prev); err != nil {
			return err
		}
	}
	if err := r.updateOrderFillStateWithTx(ctx, tx, &plan.Taker); err != nil {
		return fmt.Errorf("update taker %s: %w", plan.Taker.ID, err)
	}

	if err := r.applyPositionChangesWithTx(ctx, tx, plan.Market.ID, plan.PositionMutations, plan.PositionReservationDeltas); err != nil {
		return fmt.Errorf("apply positions: %w", err)
	}

	if err := r.insertLedgerEntriesWithTx(ctx, tx, plan.Market.ID, plan.LedgerEntries); err != nil {
		return fmt.Errorf("insert ledger: %w", err)
	}

	if err := r.updateMarketAfterMatchWithTx(ctx, tx, &plan.Market); err != nil {
		return fmt.Errorf("update market: %w", err)
	}

	return tx.Commit()
}

// FinalizeRestingOrderAtomic cancels or expires a resting exchange order in
// the same transaction that releases wallet point reservations and sell-side
// share reservations.
func (r *SQLRepository) FinalizeRestingOrderAtomic(
	ctx context.Context,
	walletAdapter ExchangeWalletAdapter,
	order *Order,
	terminal OrderStatus,
) (reservedPoints int64, capturedPoints int64, placedAt time.Time, err error) {
	tx, err := walletAdapter.BeginExchangeTx(ctx)
	if err != nil {
		return 0, 0, time.Time{}, fmt.Errorf("begin %s tx: %w", terminal, err)
	}
	defer func() { _ = tx.Rollback() }()

	// Release the uncaptured point reservation. Idempotent: if the order
	// never had a reservation (e.g., a sell), this is a no-op at the wallet.
	if err := walletAdapter.ReleaseReservationWithTx(ctx, tx, "prediction_order", order.ID); err != nil {
		return 0, 0, time.Time{}, fmt.Errorf("release reservation: %w", err)
	}
	if order.Action == OrderActionSell && order.RemainingQuantity > 0 {
		if _, err := tx.ExecContext(ctx,
			`UPDATE prediction_positions
			    SET reserved_quantity = GREATEST(reserved_quantity - $4, 0),
			        updated_at = NOW()
			  WHERE user_id = $1 AND market_id = $2 AND side = $3`,
			order.UserID, order.MarketID, string(order.Side), order.RemainingQuantity,
		); err != nil {
			return 0, 0, time.Time{}, fmt.Errorf("release reserved shares: %w", err)
		}
	}

	// cancelled_at is only meaningful for a user cancel; an expiry leaves it
	// NULL (the order was not cancelled — its market closed under it).
	now := time.Now().UTC()
	var cancelledAt interface{}
	if terminal == OrderStatusCancelled {
		cancelledAt = now
	}
	if err := tx.QueryRowContext(ctx,
		`UPDATE prediction_orders
		   SET status = $2,
		       reserved_quantity = 0,
		       cancelled_at = $3,
		       updated_at = NOW()
		 WHERE id = $1
		 RETURNING reserved_points, captured_points, created_at`,
		order.ID, string(terminal), cancelledAt,
	).Scan(&reservedPoints, &capturedPoints, &placedAt); err != nil {
		return 0, 0, time.Time{}, fmt.Errorf("update order to %s: %w", terminal, err)
	}

	if err := tx.Commit(); err != nil {
		return 0, 0, time.Time{}, fmt.Errorf("commit %s tx: %w", terminal, err)
	}
	return reservedPoints, capturedPoints, placedAt, nil
}

// insertExchangeTradeWithTx inserts a trade row with the engine-supplied ID
// and the new exchange columns (match_id, trade_kind, engine_kind). Differs
// from createTradeWithExec which DB-generates the ID for AMM trades.
func (r *SQLRepository) insertExchangeTradeWithTx(ctx context.Context, tx *sql.Tx, t *Trade) error {
	if err := r.ensurePunterExistsWithExec(ctx, tx, t.BuyerID); err != nil {
		return err
	}
	if t.SellerID != nil {
		if err := r.ensurePunterExistsWithExec(ctx, tx, *t.SellerID); err != nil {
			return err
		}
	}
	_, err := tx.ExecContext(ctx,
		`INSERT INTO prediction_trades
		 (id, market_id, buy_order_id, sell_order_id, buyer_id, seller_id,
		  side, price_points, quantity, fee_points, is_amm_trade,
		  match_id, trade_kind, engine_kind, traded_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
		t.ID, t.MarketID, t.BuyOrderID, t.SellOrderID, t.BuyerID, t.SellerID,
		string(t.Side), t.PricePoints, t.Quantity, t.FeePoints, t.IsAMMTrade,
		t.MatchID, string(t.TradeKind), string(t.EngineKind), t.TradedAt,
	)
	return err
}

// updateMakerFillStateGuardedWithTx writes a maker's post-match fill state but
// only if its current filled_quantity still equals expectedPrev — the value
// the plan was built against. Zero rows updated means a concurrent taker moved
// this maker first, so we return ErrBookChanged and the caller re-plans
// (audit COR-02). Runs under the per-market advisory lock, so the check and
// the write are atomic with respect to other matches on this market.
func (r *SQLRepository) updateMakerFillStateGuardedWithTx(ctx context.Context, tx *sql.Tx, o *Order, expectedPrev int) error {
	res, err := tx.ExecContext(ctx,
		`UPDATE prediction_orders SET
		   filled_quantity = $2,
		   remaining_quantity = $3,
		   status = $4,
		   captured_points = $5,
		   released_points = $6,
		   filled_cost_points = $7,
		   average_fill_price_points = $8,
		   reserved_quantity = $9,
		   failure_reason = $10,
		   filled_at = $11,
		   cancelled_at = $12,
		   updated_at = NOW()
		 WHERE id = $1 AND filled_quantity = $13`,
		o.ID, o.FilledQuantity, o.RemainingQuantity, string(o.Status),
		o.CapturedCashPoints, o.ReleasedCashPoints, o.FilledCostPoints,
		o.AverageFillPricePoints, o.ReservedQuantity, o.FailureReason, o.FilledAt, o.CancelledAt,
		expectedPrev)
	if err != nil {
		return fmt.Errorf("update maker %s: %w", o.ID, err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("update maker %s rows: %w", o.ID, err)
	}
	if n != 1 {
		return ErrBookChanged
	}
	return nil
}

// updateOrderFillStateWithTx writes the post-match fill state for an order.
// Updates only fields the match engine touches; leaves the rest alone.
func (r *SQLRepository) updateOrderFillStateWithTx(ctx context.Context, tx *sql.Tx, o *Order) error {
	_, err := tx.ExecContext(ctx,
		`UPDATE prediction_orders SET
		   filled_quantity = $2,
		   remaining_quantity = $3,
		   status = $4,
		   captured_points = $5,
		   released_points = $6,
		   filled_cost_points = $7,
		   average_fill_price_points = $8,
		   reserved_quantity = $9,
		   failure_reason = $10,
		   filled_at = $11,
		   cancelled_at = $12,
		   updated_at = NOW()
		 WHERE id = $1`,
		o.ID, o.FilledQuantity, o.RemainingQuantity, string(o.Status),
		o.CapturedCashPoints, o.ReleasedCashPoints, o.FilledCostPoints,
		o.AverageFillPricePoints, o.ReservedQuantity, o.FailureReason, o.FilledAt, o.CancelledAt,
	)
	return err
}

// applyPositionChangesWithTx groups position mutations and share-reservation
// deltas by (user_id, side), loads each position FOR UPDATE, then applies:
// released reserved shares, fills, and newly reserved resting sell shares.
func (r *SQLRepository) applyPositionChangesWithTx(ctx context.Context, tx *sql.Tx, marketID string, mutations []PositionMutation, reservationDeltas []PositionReservationDelta) error {
	groups := make(map[positionKey][]PositionMutation)
	for _, m := range mutations {
		k := positionKey{m.UserID, m.Side}
		groups[k] = append(groups[k], m)
	}
	reservations := aggregateReservationDeltas(reservationDeltas)

	for _, k := range positionChangeKeys(groups, reservations) {
		ms := groups[k]
		var p Position
		err := tx.QueryRowContext(ctx,
			`SELECT id, user_id, market_id, side, quantity, avg_price_points,
			        total_cost_points, realized_pnl_points, reserved_quantity,
			        created_at, updated_at
			 FROM prediction_positions
			 WHERE user_id = $1 AND market_id = $2 AND side = $3
			 FOR UPDATE`,
			k.UserID, marketID, string(k.Side),
		).Scan(
			&p.ID, &p.UserID, &p.MarketID, &p.Side, &p.Quantity, &p.AvgPricePoints,
			&p.TotalCostPoints, &p.RealizedPnlPoints, &p.ReservedQuantity,
			&p.CreatedAt, &p.UpdatedAt,
		)
		if errors.Is(err, sql.ErrNoRows) {
			p = Position{UserID: k.UserID, MarketID: marketID, Side: k.Side}
		} else if err != nil {
			return fmt.Errorf("load position %s/%s: %w", k.UserID, k.Side, err)
		}

		delta := reservations[k]
		if delta < 0 {
			p.ReservedQuantity -= -delta
			if p.ReservedQuantity < 0 {
				p.ReservedQuantity = 0
			}
		}

		for _, m := range ms {
			ApplyPositionMutation(&p, m)
		}

		if delta > 0 {
			if AvailableQuantity(&p) < delta {
				return ErrInsufficientPosition
			}
			p.ReservedQuantity += delta
		}
		if p.ReservedQuantity > p.Quantity {
			return ErrInsufficientPosition
		}

		if err := r.upsertPositionWithReservedWithExec(ctx, tx, &p); err != nil {
			return fmt.Errorf("upsert position %s/%s: %w", k.UserID, k.Side, err)
		}
	}
	return nil
}

func aggregateReservationDeltas(deltas []PositionReservationDelta) map[positionKey]int {
	out := make(map[positionKey]int)
	for _, d := range deltas {
		if d.Delta == 0 {
			continue
		}
		out[positionKey{UserID: d.UserID, Side: d.Side}] += d.Delta
	}
	return out
}

func positionKeys(sold map[SellerPositionKey]int, reservations map[positionKey]int) []positionKey {
	seen := make(map[positionKey]struct{}, len(sold)+len(reservations))
	for k := range sold {
		seen[positionKey{UserID: k.UserID, Side: k.Side}] = struct{}{}
	}
	for k := range reservations {
		seen[k] = struct{}{}
	}
	keys := make([]positionKey, 0, len(seen))
	for k := range seen {
		keys = append(keys, k)
	}
	sortPositionKeys(keys)
	return keys
}

func positionChangeKeys(groups map[positionKey][]PositionMutation, reservations map[positionKey]int) []positionKey {
	seen := make(map[positionKey]struct{}, len(groups)+len(reservations))
	for k := range groups {
		seen[k] = struct{}{}
	}
	for k := range reservations {
		seen[k] = struct{}{}
	}
	keys := make([]positionKey, 0, len(seen))
	for k := range seen {
		keys = append(keys, k)
	}
	sortPositionKeys(keys)
	return keys
}

func sortPositionKeys(keys []positionKey) {
	sort.Slice(keys, func(i, j int) bool {
		if keys[i].UserID != keys[j].UserID {
			return keys[i].UserID < keys[j].UserID
		}
		return keys[i].Side < keys[j].Side
	})
}

func positiveInt(v int) int {
	if v > 0 {
		return v
	}
	return 0
}

// insertLedgerEntriesWithTx writes ledger rows in order, computing
// balance_after_points as a running sum of pool-affecting entries against
// the current market collateral_pool_points.
//
// Entry types that affect the pool: issue_collateral, settlement_payout,
// refund, adjustment. Fee and rebate entries record amount_points but leave
// the running balance unchanged (those flow through wallet ledgers, not
// the collateral pool).
func (r *SQLRepository) insertLedgerEntriesWithTx(ctx context.Context, tx *sql.Tx, marketID string, entries []CollateralLedgerEntry) error {
	if len(entries) == 0 {
		return nil
	}
	var poolBalance int64
	if err := tx.QueryRowContext(ctx,
		"SELECT collateral_pool_points FROM prediction_markets WHERE id = $1",
		marketID,
	).Scan(&poolBalance); err != nil {
		return fmt.Errorf("read pool balance: %w", err)
	}

	for i := range entries {
		e := &entries[i]
		if entryAffectsPool(e.EntryType) {
			poolBalance += e.AmountPoints
		}
		e.BalanceAfterPoints = poolBalance
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO prediction_collateral_ledger
			 (market_id, trade_id, order_id, user_id, entry_type,
			  amount_points, balance_after_points, reason)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			e.MarketID, e.TradeID, e.OrderID, e.UserID,
			string(e.EntryType), e.AmountPoints, e.BalanceAfterPoints, e.Reason,
		); err != nil {
			return fmt.Errorf("insert ledger row: %w", err)
		}
	}
	return nil
}

// entryAffectsPool reports whether a ledger entry should change the
// running collateral pool balance. Fee and rebate entries are recorded for
// audit but flow through wallet ledgers, not the pool.
func entryAffectsPool(t CollateralEntryType) bool {
	switch t {
	case CollateralIssue, CollateralSettlementPayout, CollateralRefund, CollateralAdjustment:
		return true
	default:
		return false
	}
}

// LoadMakersForSecondary returns resting orders that could fill an incoming
// taker via secondary same-side transfer (Buy YES taker → Sell YES makers).
// Ordered by price-time priority. Limit is the depth to consider.
//
// For Buy taker: makers are SELLs on the same side, sorted price ASC (lowest
// ask first). Crossing condition: maker.price <= taker.limit (or any price
// for market-order takers).
//
// For Sell taker: makers are BUYs on the same side, sorted price DESC
// (highest bid first). Crossing condition: maker.price >= taker.limit.
//
// The query lands on idx_pred_orders_book_{sell,buy}_{yes,no} partial indexes.
func (r *SQLRepository) LoadMakersForSecondary(ctx context.Context, marketID string, takerSide OrderSide, takerAction OrderAction, takerLimit *int, limit int) ([]Order, error) {
	if limit <= 0 {
		limit = 100
	}
	makerAction := OrderActionSell
	direction := "ASC"
	if takerAction == OrderActionSell {
		makerAction = OrderActionBuy
		direction = "DESC"
	}

	args := []any{marketID, string(takerSide), string(makerAction)}
	priceFilter := ""
	if takerLimit != nil {
		args = append(args, *takerLimit)
		if takerAction == OrderActionBuy {
			priceFilter = " AND price_points <= $4"
		} else {
			priceFilter = " AND price_points >= $4"
		}
	}
	args = append(args, limit)
	limitParam := fmt.Sprintf("$%d", len(args))

	q := `SELECT id, user_id, market_id, side, action, order_type, price_points,
	             quantity, filled_quantity, remaining_quantity, total_cost_points,
	             status, time_in_force, reserved_points, captured_points,
	             released_points, reserved_quantity, filled_cost_points,
	             post_only, COALESCE(self_match_action, 'cancel_taker') AS self_match_action,
	             created_at, updated_at
	      FROM prediction_orders
	      WHERE market_id = $1 AND side = $2 AND action = $3
	        AND status IN ('open','partial')
	        AND price_points IS NOT NULL` + priceFilter + `
	      ORDER BY price_points ` + direction + `, created_at ASC
	      LIMIT ` + limitParam

	return r.scanOrderRows(ctx, q, args...)
}

// LoadMakersForIssuance returns resting Buy orders on the OPPOSITE side that
// could fill the incoming taker via complementary issuance.
//
// Taker is Buy YES with limit L → makers are resting Buy NO orders with
// price >= 100-L (so the sum is >= 100). Sorted price DESC (highest NO bid
// first; satisfies the issuance feasibility condition with the smallest
// surplus to release).
//
// The query lands on idx_pred_orders_book_buy_{yes,no} partial indexes.
func (r *SQLRepository) LoadMakersForIssuance(ctx context.Context, marketID string, otherSide OrderSide, takerLimit int, limit int) ([]Order, error) {
	if limit <= 0 {
		limit = 100
	}
	minMakerPrice := ParPricePoints - takerLimit
	if minMakerPrice < MinTickPricePoints {
		minMakerPrice = MinTickPricePoints
	}

	q := `SELECT id, user_id, market_id, side, action, order_type, price_points,
	             quantity, filled_quantity, remaining_quantity, total_cost_points,
	             status, time_in_force, reserved_points, captured_points,
	             released_points, reserved_quantity, filled_cost_points,
	             post_only, COALESCE(self_match_action, 'cancel_taker') AS self_match_action,
	             created_at, updated_at
	      FROM prediction_orders
	      WHERE market_id = $1 AND side = $2 AND action = 'buy'
	        AND status IN ('open','partial')
	        AND price_points IS NOT NULL
	        AND price_points >= $3
	      ORDER BY price_points DESC, created_at ASC
	      LIMIT $4`

	return r.scanOrderRows(ctx, q, marketID, string(otherSide), minMakerPrice, limit)
}

// scanOrderRows is a shared scan helper for the two maker-loading queries.
func (r *SQLRepository) scanOrderRows(ctx context.Context, q string, args ...any) ([]Order, error) {
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := make([]Order, 0, 32)
	for rows.Next() {
		var o Order
		var price sql.NullInt64
		var tif, sma sql.NullString
		if err := rows.Scan(
			&o.ID, &o.UserID, &o.MarketID, &o.Side, &o.Action, &o.OrderType, &price,
			&o.Quantity, &o.FilledQuantity, &o.RemainingQuantity, &o.TotalCostPoints,
			&o.Status, &tif, &o.ReservedCashPoints, &o.CapturedCashPoints,
			&o.ReleasedCashPoints, &o.ReservedQuantity, &o.FilledCostPoints,
			&o.PostOnly, &sma,
			&o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if price.Valid {
			p := int(price.Int64)
			o.PricePoints = &p
		}
		if tif.Valid {
			o.TimeInForce = TimeInForce(tif.String)
		}
		if sma.Valid {
			o.SelfMatchAction = SelfMatchAction(sma.String)
		}
		orders = append(orders, o)
	}
	return orders, rows.Err()
}

// ListRecentDriftAlerts aggregates `adjustment` ledger rows since `since`
// per market. Joins to prediction_markets for the ticker and (left-)joins
// to the most recent reason via DISTINCT ON. Single query, indexed on
// idx_pred_coll_ledger_market_time.
//
// Sort: most recent adjustment first, since ops typically wants to see
// fresh drift at the top of the page.
func (r *SQLRepository) ListRecentDriftAlerts(ctx context.Context, since time.Time) ([]CollateralDriftAlert, error) {
	q := `
WITH latest AS (
  SELECT DISTINCT ON (market_id)
    market_id, reason, created_at
  FROM prediction_collateral_ledger
  WHERE entry_type = 'adjustment' AND created_at >= $1
  ORDER BY market_id, created_at DESC
)
SELECT
  l.market_id,
  COALESCE(m.ticker, '') AS ticker,
  COUNT(*) FILTER (WHERE l.entry_type = 'adjustment')::int AS adjustment_count,
  COALESCE(MAX(ABS(l.amount_points)), 0) AS max_drift,
  COALESCE(SUM(l.amount_points), 0) AS total_drift,
  MAX(l.created_at) AS latest_at,
  COALESCE(latest.reason, '') AS latest_reason
FROM prediction_collateral_ledger l
LEFT JOIN prediction_markets m ON m.id = l.market_id
LEFT JOIN latest ON latest.market_id = l.market_id
WHERE l.entry_type = 'adjustment' AND l.created_at >= $1
GROUP BY l.market_id, m.ticker, latest.reason
ORDER BY MAX(l.created_at) DESC`

	rows, err := r.db.QueryContext(ctx, q, since)
	if err != nil {
		return nil, fmt.Errorf("list drift alerts: %w", err)
	}
	defer rows.Close()

	out := make([]CollateralDriftAlert, 0, 8)
	for rows.Next() {
		var a CollateralDriftAlert
		if err := rows.Scan(
			&a.MarketID, &a.Ticker, &a.AdjustmentCount,
			&a.MaxDriftPoints, &a.TotalDriftPoints,
			&a.LatestAdjustedAt, &a.LatestReason,
		); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// updateMarketAfterMatchWithTx writes the post-match market state. Touches
// only fields the match engine changes: collateral_pool_points,
// last_trade_price_points, last_quote_at, volume_points.
//
// best_yes/no_bid/ask_points are deliberately NOT written here — those are
// refreshed by a separate background job that re-aggregates the book after
// the match commits. Computing them inside the match tx requires re-querying
// the (now-updated) book, which adds latency without correctness benefit.
func (r *SQLRepository) updateMarketAfterMatchWithTx(ctx context.Context, tx *sql.Tx, m *Market) error {
	_, err := tx.ExecContext(ctx,
		`UPDATE prediction_markets SET
		   collateral_pool_points = $2,
		   last_trade_price_points = $3,
		   last_quote_at = $4,
		   volume_points = $5,
		   updated_at = NOW()
		 WHERE id = $1`,
		m.ID, m.CollateralPoolPoints, m.LastTradePricePoints,
		m.LastQuoteAt, m.VolumePoints,
	)
	return err
}

// GetOrderBook returns the L2 order book for a market, summing
// remaining_quantity per price level for each (side, action) and computing
// running totals. Resolves four queries against the partial indexes built in
// migration 019:
//
//	idx_pred_orders_book_buy_yes  (yes bids, price DESC)
//	idx_pred_orders_book_sell_yes (yes asks, price ASC)
//	idx_pred_orders_book_buy_no   (no bids, price DESC)
//	idx_pred_orders_book_sell_no  (no asks, price ASC)
//
// depth is server-side clamped to [1, MaxOrderBookDepth] (100). Caller passes
// the user-supplied depth; clamping is done here defensively even if the
// handler already validated.
//
// Empty book is returned with non-nil empty slices so JSON marshalling is
// stable (`[]` not `null`).
func (r *SQLRepository) GetOrderBook(ctx context.Context, marketID string, depth int) (*OrderBook, error) {
	if depth < 1 {
		depth = 1
	}
	if depth > MaxOrderBookDepth {
		depth = MaxOrderBookDepth
	}

	yesBidsRows, err := r.aggregateOrders(ctx, marketID, OrderSideYes, OrderActionBuy, depth)
	if err != nil {
		return nil, fmt.Errorf("aggregate yes bids: %w", err)
	}
	yesAsksRows, err := r.aggregateOrders(ctx, marketID, OrderSideYes, OrderActionSell, depth)
	if err != nil {
		return nil, fmt.Errorf("aggregate yes asks: %w", err)
	}
	noBidsRows, err := r.aggregateOrders(ctx, marketID, OrderSideNo, OrderActionBuy, depth)
	if err != nil {
		return nil, fmt.Errorf("aggregate no bids: %w", err)
	}
	noAsksRows, err := r.aggregateOrders(ctx, marketID, OrderSideNo, OrderActionSell, depth)
	if err != nil {
		return nil, fmt.Errorf("aggregate no asks: %w", err)
	}

	return AssembleOrderBook(
		marketID,
		BookLevels(yesBidsRows, depth),
		BookLevels(yesAsksRows, depth),
		BookLevels(noBidsRows, depth),
		BookLevels(noAsksRows, depth),
	), nil
}

// aggregateOrders runs the GROUP BY price_points query for one (side, action)
// against the prediction_orders table. ORDER BY direction matches the partial
// index on which the planner should land:
//   - Buy:  price DESC (best bid first)
//   - Sell: price ASC  (best ask first)
//
// Status filter `('open','partial')` matches the partial-index predicates so
// the planner picks the right index (verified in test 61 of the test plan).
func (r *SQLRepository) aggregateOrders(ctx context.Context, marketID string, side OrderSide, action OrderAction, limit int) ([]AggregatedLevel, error) {
	direction := "DESC"
	if action == OrderActionSell {
		direction = "ASC"
	}

	q := `SELECT price_points, COALESCE(SUM(remaining_quantity), 0)::int AS qty
	      FROM prediction_orders
	      WHERE market_id = $1
	        AND side = $2
	        AND action = $3
	        AND status IN ('open','partial')
	        AND price_points IS NOT NULL
	      GROUP BY price_points
	      ORDER BY price_points ` + direction + `
	      LIMIT $4`

	rows, err := r.db.QueryContext(ctx, q, marketID, string(side), string(action), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]AggregatedLevel, 0, limit)
	for rows.Next() {
		var lvl AggregatedLevel
		if err := rows.Scan(&lvl.PricePoints, &lvl.Quantity); err != nil {
			return nil, err
		}
		out = append(out, lvl)
	}
	return out, rows.Err()
}
