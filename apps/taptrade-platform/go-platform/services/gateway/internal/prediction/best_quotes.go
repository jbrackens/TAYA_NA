package prediction

import (
	"context"
	"database/sql"
	"fmt"
)

// RefreshMarketBestQuotes recomputes a market's best_yes_bid_cents,
// best_yes_ask_cents, best_no_bid_cents, best_no_ask_cents columns from the
// current open-order partial indexes. Called after a successful match
// commits, so subscribers see the new top-of-book on `market:<id>` without
// re-aggregating the whole book client-side.
//
// Runs as a single short transaction with no advisory lock — the four
// reads are independent and consistent enough at READ COMMITTED for a
// snapshot column. Writers serialize per market via the match advisory
// lock; this refresher tolerates being slightly behind a concurrent match.
//
// Cheap (4 indexed lookups + 1 update). Safe to call frequently.
func (r *SQLRepository) RefreshMarketBestQuotes(ctx context.Context, marketID string) error {
	yesBid, err := r.bestPrice(ctx, marketID, OrderSideYes, OrderActionBuy)
	if err != nil {
		return fmt.Errorf("best yes bid: %w", err)
	}
	yesAsk, err := r.bestPrice(ctx, marketID, OrderSideYes, OrderActionSell)
	if err != nil {
		return fmt.Errorf("best yes ask: %w", err)
	}
	noBid, err := r.bestPrice(ctx, marketID, OrderSideNo, OrderActionBuy)
	if err != nil {
		return fmt.Errorf("best no bid: %w", err)
	}
	noAsk, err := r.bestPrice(ctx, marketID, OrderSideNo, OrderActionSell)
	if err != nil {
		return fmt.Errorf("best no ask: %w", err)
	}
	if _, err := r.db.ExecContext(ctx,
		`UPDATE prediction_markets SET
		   best_yes_bid_cents = $2,
		   best_yes_ask_cents = $3,
		   best_no_bid_cents  = $4,
		   best_no_ask_cents  = $5,
		   last_quote_at = NOW(),
		   updated_at = NOW()
		 WHERE id = $1`,
		marketID, nullInt(yesBid), nullInt(yesAsk), nullInt(noBid), nullInt(noAsk),
	); err != nil {
		return fmt.Errorf("write best quotes: %w", err)
	}
	return nil
}

// bestPrice returns the top-of-book price for one (side, action) or nil if
// the book is empty on that side. Direction matches the partial indexes:
// Buy = highest bid, Sell = lowest ask.
func (r *SQLRepository) bestPrice(ctx context.Context, marketID string, side OrderSide, action OrderAction) (*int, error) {
	direction := "DESC"
	if action == OrderActionSell {
		direction = "ASC"
	}
	q := `SELECT price_cents
	      FROM prediction_orders
	      WHERE market_id = $1 AND side = $2 AND action = $3
	        AND status IN ('open','partial')
	        AND price_cents IS NOT NULL
	      ORDER BY price_cents ` + direction + `
	      LIMIT 1`
	var price sql.NullInt64
	err := r.db.QueryRowContext(ctx, q, marketID, string(side), string(action)).Scan(&price)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if !price.Valid {
		return nil, nil
	}
	p := int(price.Int64)
	return &p, nil
}

// nullInt converts a *int into a sql.NullInt64 for parameterized queries.
// nil → NULL; non-nil → valid int.
func nullInt(p *int) sql.NullInt64 {
	if p == nil {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: int64(*p), Valid: true}
}
