package prediction

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

// SQLRepository implements Repository backed by PostgreSQL.
type SQLRepository struct {
	db *sql.DB
}

// NewSQLRepository creates a new PostgreSQL-backed repository.
func NewSQLRepository(db *sql.DB) *SQLRepository {
	return &SQLRepository{db: db}
}

// DB exposes the underlying database connection.
func (r *SQLRepository) DB() *sql.DB { return r.db }

// --- Categories ---

func (r *SQLRepository) ListCategories(ctx context.Context, activeOnly bool) ([]Category, error) {
	q := `SELECT id, slug, name, icon, sort_order, active, created_at, updated_at
	      FROM prediction_categories`
	if activeOnly {
		q += ` WHERE active = true`
	}
	q += ` ORDER BY sort_order`

	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cats []Category
	for rows.Next() {
		var c Category
		var icon sql.NullString
		if err := rows.Scan(&c.ID, &c.Slug, &c.Name, &icon, &c.SortOrder, &c.Active, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.Icon = icon.String
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

func (r *SQLRepository) GetCategory(ctx context.Context, slug string) (*Category, error) {
	var c Category
	var icon sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, slug, name, icon, sort_order, active, created_at, updated_at
		 FROM prediction_categories WHERE slug = $1`, slug,
	).Scan(&c.ID, &c.Slug, &c.Name, &icon, &c.SortOrder, &c.Active, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.Icon = icon.String
	return &c, nil
}

func (r *SQLRepository) CreateCategory(ctx context.Context, cat *Category) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO prediction_categories (slug, name, icon, sort_order, active)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at`,
		cat.Slug, cat.Name, nullStr(cat.Icon), cat.SortOrder, cat.Active,
	).Scan(&cat.ID, &cat.CreatedAt, &cat.UpdatedAt)
}

// --- Series ---

func (r *SQLRepository) ListSeries(ctx context.Context, categoryID *string) ([]Series, error) {
	q := `SELECT id, slug, title, description, category_id, frequency, tags, active, created_at, updated_at
	      FROM prediction_series WHERE active = true`
	var args []interface{}
	if categoryID != nil {
		q += ` AND category_id = $1`
		args = append(args, *categoryID)
	}
	q += ` ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Series
	for rows.Next() {
		var s Series
		var desc, freq sql.NullString
		if err := rows.Scan(&s.ID, &s.Slug, &s.Title, &desc, &s.CategoryID, &freq, pq.Array(&s.Tags), &s.Active, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.Description = desc.String
		s.Frequency = freq.String
		result = append(result, s)
	}
	return result, rows.Err()
}

func (r *SQLRepository) GetSeries(ctx context.Context, id string) (*Series, error) {
	var s Series
	var desc, freq sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, slug, title, description, category_id, frequency, tags, active, created_at, updated_at
		 FROM prediction_series WHERE id = $1`, id,
	).Scan(&s.ID, &s.Slug, &s.Title, &desc, &s.CategoryID, &freq, pq.Array(&s.Tags), &s.Active, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	s.Description = desc.String
	s.Frequency = freq.String
	return &s, nil
}

func (r *SQLRepository) CreateSeries(ctx context.Context, s *Series) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO prediction_series (slug, title, description, category_id, frequency, tags, active)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at, updated_at`,
		s.Slug, s.Title, nullStr(s.Description), s.CategoryID, nullStr(s.Frequency), pq.Array(s.Tags), s.Active,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
}

// --- Events ---

func (r *SQLRepository) ListEvents(ctx context.Context, filter EventFilter) ([]Event, int, error) {
	where, args := buildEventWhere(filter)
	countQ := `SELECT COUNT(*) FROM prediction_events` + where
	var total int
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	q := `SELECT id, series_id, title, description, category_id, status, featured,
	             open_at, close_at, settle_at, settled_at, metadata, created_by, created_at, updated_at
	      FROM prediction_events` + where + ` ORDER BY close_at ASC`
	q += fmt.Sprintf(` LIMIT %d OFFSET %d`, filter.PageSize, (filter.Page-1)*filter.PageSize)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		e, err := scanEvent(rows)
		if err != nil {
			return nil, 0, err
		}
		events = append(events, *e)
	}
	return events, total, rows.Err()
}

func (r *SQLRepository) GetEvent(ctx context.Context, id string) (*Event, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, series_id, title, description, category_id, status, featured,
		        open_at, close_at, settle_at, settled_at, metadata, created_by, created_at, updated_at
		 FROM prediction_events WHERE id = $1`, id)

	var e Event
	var seriesID, desc, createdBy sql.NullString
	var openAt, settleAt, settledAt sql.NullTime
	err := row.Scan(&e.ID, &seriesID, &e.Title, &desc, &e.CategoryID, &e.Status, &e.Featured,
		&openAt, &e.CloseAt, &settleAt, &settledAt, &e.Metadata, &createdBy, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if seriesID.Valid {
		e.SeriesID = &seriesID.String
	}
	e.Description = desc.String
	if openAt.Valid {
		e.OpenAt = &openAt.Time
	}
	if settleAt.Valid {
		e.SettleAt = &settleAt.Time
	}
	if settledAt.Valid {
		e.SettledAt = &settledAt.Time
	}
	if createdBy.Valid {
		e.CreatedBy = &createdBy.String
	}
	return &e, nil
}

func (r *SQLRepository) CreateEvent(ctx context.Context, e *Event) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO prediction_events (series_id, title, description, category_id, status, featured,
		  open_at, close_at, settle_at, metadata, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		 RETURNING id, created_at, updated_at`,
		e.SeriesID, e.Title, nullStr(e.Description), e.CategoryID, e.Status, e.Featured,
		e.OpenAt, e.CloseAt, e.SettleAt, e.Metadata, e.CreatedBy,
	).Scan(&e.ID, &e.CreatedAt, &e.UpdatedAt)
}

func (r *SQLRepository) UpdateEventStatus(ctx context.Context, id string, status EventStatus) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE prediction_events SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, id)
	return err
}

// --- Markets ---

func (r *SQLRepository) ListMarkets(ctx context.Context, filter MarketFilter) ([]Market, int, error) {
	where, args := buildMarketWhere(filter)
	countQ := `SELECT COUNT(*) FROM prediction_markets` + where
	var total int
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	q := `SELECT id, event_id, ticker, title, description, status, result,
	             yes_price_cents, no_price_cents, last_trade_price_cents,
	             volume_cents, open_interest_cents, liquidity_cents,
	             amm_yes_shares, amm_no_shares, amm_liquidity_param, amm_subsidy_cents,
	             settlement_source_key, settlement_cutoff_at, settlement_rule, settlement_params,
	             fallback_source_key, fee_rate_bps, maker_rebate_bps,
	             open_at, close_at, created_at, updated_at
	      FROM prediction_markets` + where + ` ORDER BY close_at ASC`
	q += fmt.Sprintf(` LIMIT %d OFFSET %d`, filter.PageSize, (filter.Page-1)*filter.PageSize)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var markets []Market
	for rows.Next() {
		m, err := scanMarket(rows)
		if err != nil {
			return nil, 0, err
		}
		markets = append(markets, *m)
	}
	return markets, total, rows.Err()
}

func (r *SQLRepository) GetMarket(ctx context.Context, id string) (*Market, error) {
	row := r.db.QueryRowContext(ctx, marketSelectQuery()+` WHERE id = $1`, id)
	return scanMarketRow(row)
}

func (r *SQLRepository) GetMarketByTicker(ctx context.Context, ticker string) (*Market, error) {
	row := r.db.QueryRowContext(ctx, marketSelectQuery()+` WHERE ticker = $1`, ticker)
	return scanMarketRow(row)
}

func (r *SQLRepository) CreateMarket(ctx context.Context, m *Market) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO prediction_markets
		 (event_id, ticker, title, description, status,
		  yes_price_cents, no_price_cents, amm_yes_shares, amm_no_shares,
		  amm_liquidity_param, amm_subsidy_cents,
		  settlement_source_key, settlement_cutoff_at, settlement_rule, settlement_params,
		  fallback_source_key, fee_rate_bps, maker_rebate_bps, open_at, close_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
		 RETURNING id, created_at, updated_at`,
		m.EventID, m.Ticker, m.Title, nullStr(m.Description), m.Status,
		m.YesPriceCents, m.NoPriceCents, m.AMMYesShares, m.AMMNoShares,
		m.AMMLiquidityParam, m.AMMSubsidyCents,
		m.SettlementSourceKey, m.SettlementCutoffAt, m.SettlementRule, m.SettlementParams,
		m.FallbackSourceKey, m.FeeRateBps, m.MakerRebateBps, m.OpenAt, m.CloseAt,
	).Scan(&m.ID, &m.CreatedAt, &m.UpdatedAt)
}

func (r *SQLRepository) UpdateMarket(ctx context.Context, m *Market) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE prediction_markets SET
		  status=$1, result=$2, yes_price_cents=$3, no_price_cents=$4,
		  last_trade_price_cents=$5, volume_cents=$6, open_interest_cents=$7,
		  liquidity_cents=$8, amm_yes_shares=$9, amm_no_shares=$10,
		  updated_at=NOW()
		 WHERE id=$11`,
		m.Status, m.Result, m.YesPriceCents, m.NoPriceCents,
		m.LastTradePriceCents, m.VolumeCents, m.OpenInterestCents,
		m.LiquidityCents, m.AMMYesShares, m.AMMNoShares,
		m.ID)
	return err
}

func (r *SQLRepository) UpdateMarketStatus(ctx context.Context, id string, status MarketStatus) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE prediction_markets SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, id)
	return err
}

func (r *SQLRepository) ListMarketsToClose(ctx context.Context) ([]Market, error) {
	rows, err := r.db.QueryContext(ctx,
		marketSelectQuery()+` WHERE status = 'open' AND close_at <= $1`, time.Now().UTC())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMarkets(rows)
}

func (r *SQLRepository) ListMarketsToSettle(ctx context.Context) ([]Market, error) {
	rows, err := r.db.QueryContext(ctx,
		marketSelectQuery()+` WHERE status = 'closed' AND settlement_cutoff_at <= $1
		  AND id NOT IN (SELECT market_id FROM prediction_settlements)`,
		time.Now().UTC())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMarkets(rows)
}

// --- Orders ---

func (r *SQLRepository) ListOrders(ctx context.Context, filter OrderFilter) ([]Order, int, error) {
	where := ` WHERE user_id = $1`
	args := []interface{}{filter.UserID}
	idx := 2
	if filter.MarketID != nil {
		where += fmt.Sprintf(` AND market_id = $%d`, idx)
		args = append(args, *filter.MarketID)
		idx++
	}
	if filter.Status != nil {
		where += fmt.Sprintf(` AND status = $%d`, idx)
		args = append(args, *filter.Status)
		idx++
	}

	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM prediction_orders`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	q := `SELECT id, user_id, market_id, side, action, order_type, price_cents,
	             quantity, filled_quantity, remaining_quantity, total_cost_cents,
	             status, wallet_reservation_id, idempotency_key,
	             expires_at, filled_at, cancelled_at, created_at, updated_at
	      FROM prediction_orders` + where + ` ORDER BY created_at DESC`
	q += fmt.Sprintf(` LIMIT %d OFFSET %d`, filter.PageSize, (filter.Page-1)*filter.PageSize)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []Order
	for rows.Next() {
		o, err := scanOrder(rows)
		if err != nil {
			return nil, 0, err
		}
		orders = append(orders, *o)
	}
	return orders, total, rows.Err()
}

func (r *SQLRepository) GetOrder(ctx context.Context, id string) (*Order, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, market_id, side, action, order_type, price_cents,
		        quantity, filled_quantity, remaining_quantity, total_cost_cents,
		        status, wallet_reservation_id, idempotency_key,
		        expires_at, filled_at, cancelled_at, created_at, updated_at
		 FROM prediction_orders WHERE id = $1`, id)
	return scanOrderRow(row)
}

func (r *SQLRepository) GetOrderByIdempotencyKey(ctx context.Context, key string) (*Order, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, market_id, side, action, order_type, price_cents,
		        quantity, filled_quantity, remaining_quantity, total_cost_cents,
		        status, wallet_reservation_id, idempotency_key,
		        expires_at, filled_at, cancelled_at, created_at, updated_at
		 FROM prediction_orders WHERE idempotency_key = $1`, key)
	return scanOrderRow(row)
}

func (r *SQLRepository) CreateOrder(ctx context.Context, o *Order) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO prediction_orders
		 (user_id, market_id, side, action, order_type, price_cents,
		  quantity, filled_quantity, remaining_quantity, total_cost_cents,
		  status, wallet_reservation_id, idempotency_key, expires_at, filled_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		 RETURNING id, created_at, updated_at`,
		o.UserID, o.MarketID, o.Side, o.Action, o.OrderType, o.PriceCents,
		o.Quantity, o.FilledQuantity, o.RemainingQuantity, o.TotalCostCents,
		o.Status, o.WalletReservationID, o.IdempotencyKey, o.ExpiresAt, o.FilledAt,
	).Scan(&o.ID, &o.CreatedAt, &o.UpdatedAt)
}

func (r *SQLRepository) UpdateOrder(ctx context.Context, o *Order) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE prediction_orders SET
		  filled_quantity=$1, remaining_quantity=$2, status=$3,
		  filled_at=$4, cancelled_at=$5, updated_at=NOW()
		 WHERE id=$6`,
		o.FilledQuantity, o.RemainingQuantity, o.Status,
		o.FilledAt, o.CancelledAt, o.ID)
	return err
}

// --- Positions ---

func (r *SQLRepository) ListPositions(ctx context.Context, userID string) ([]Position, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, market_id, side, quantity, avg_price_cents, total_cost_cents,
		        realized_pnl_cents, created_at, updated_at
		 FROM prediction_positions WHERE user_id = $1 AND quantity > 0
		 ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var positions []Position
	for rows.Next() {
		var p Position
		if err := rows.Scan(&p.ID, &p.UserID, &p.MarketID, &p.Side, &p.Quantity,
			&p.AvgPriceCents, &p.TotalCostCents, &p.RealizedPnlCents, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		positions = append(positions, p)
	}
	return positions, rows.Err()
}

func (r *SQLRepository) GetPosition(ctx context.Context, userID, marketID string, side OrderSide) (*Position, error) {
	var p Position
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, market_id, side, quantity, avg_price_cents, total_cost_cents,
		        realized_pnl_cents, created_at, updated_at
		 FROM prediction_positions WHERE user_id = $1 AND market_id = $2 AND side = $3`,
		userID, marketID, side,
	).Scan(&p.ID, &p.UserID, &p.MarketID, &p.Side, &p.Quantity,
		&p.AvgPriceCents, &p.TotalCostCents, &p.RealizedPnlCents, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *SQLRepository) UpsertPosition(ctx context.Context, p *Position) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO prediction_positions (user_id, market_id, side, quantity, avg_price_cents, total_cost_cents, realized_pnl_cents)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (user_id, market_id, side) DO UPDATE SET
		   quantity = EXCLUDED.quantity,
		   avg_price_cents = EXCLUDED.avg_price_cents,
		   total_cost_cents = EXCLUDED.total_cost_cents,
		   realized_pnl_cents = EXCLUDED.realized_pnl_cents,
		   updated_at = NOW()
		 RETURNING id, created_at, updated_at`,
		p.UserID, p.MarketID, p.Side, p.Quantity, p.AvgPriceCents, p.TotalCostCents, p.RealizedPnlCents,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (r *SQLRepository) ListPositionsByMarket(ctx context.Context, marketID string) ([]Position, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, market_id, side, quantity, avg_price_cents, total_cost_cents,
		        realized_pnl_cents, created_at, updated_at
		 FROM prediction_positions WHERE market_id = $1 AND quantity > 0`, marketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var positions []Position
	for rows.Next() {
		var p Position
		if err := rows.Scan(&p.ID, &p.UserID, &p.MarketID, &p.Side, &p.Quantity,
			&p.AvgPriceCents, &p.TotalCostCents, &p.RealizedPnlCents, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		positions = append(positions, p)
	}
	return positions, rows.Err()
}

// --- Trades ---

func (r *SQLRepository) ListTrades(ctx context.Context, marketID string, limit int) ([]Trade, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, market_id, buy_order_id, sell_order_id, buyer_id, seller_id,
		        side, price_cents, quantity, fee_cents, is_amm_trade, traded_at
		 FROM prediction_trades WHERE market_id = $1 ORDER BY traded_at DESC LIMIT $2`,
		marketID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trades []Trade
	for rows.Next() {
		var t Trade
		var buyOID, sellOID, sellerID sql.NullString
		if err := rows.Scan(&t.ID, &t.MarketID, &buyOID, &sellOID, &t.BuyerID, &sellerID,
			&t.Side, &t.PriceCents, &t.Quantity, &t.FeeCents, &t.IsAMMTrade, &t.TradedAt); err != nil {
			return nil, err
		}
		if buyOID.Valid {
			t.BuyOrderID = &buyOID.String
		}
		if sellOID.Valid {
			t.SellOrderID = &sellOID.String
		}
		if sellerID.Valid {
			t.SellerID = &sellerID.String
		}
		trades = append(trades, t)
	}
	return trades, rows.Err()
}

func (r *SQLRepository) CreateTrade(ctx context.Context, t *Trade) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO prediction_trades
		 (market_id, buy_order_id, sell_order_id, buyer_id, seller_id,
		  side, price_cents, quantity, fee_cents, is_amm_trade)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		 RETURNING id, traded_at`,
		t.MarketID, t.BuyOrderID, t.SellOrderID, t.BuyerID, t.SellerID,
		t.Side, t.PriceCents, t.Quantity, t.FeeCents, t.IsAMMTrade,
	).Scan(&t.ID, &t.TradedAt)
}

// --- Settlements ---

func (r *SQLRepository) GetSettlement(ctx context.Context, marketID string) (*Settlement, error) {
	var s Settlement
	var attID, attDigest, settledBy sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, market_id, result, attestation_source, attestation_id,
		        attestation_digest, attestation_data, settled_by, settled_at,
		        total_payout_cents, positions_settled
		 FROM prediction_settlements WHERE market_id = $1`, marketID,
	).Scan(&s.ID, &s.MarketID, &s.Result, &s.AttestationSource, &attID,
		&attDigest, &s.AttestationData, &settledBy, &s.SettledAt,
		&s.TotalPayoutCents, &s.PositionsSettled)
	if err != nil {
		return nil, err
	}
	if attID.Valid {
		s.AttestationID = &attID.String
	}
	if attDigest.Valid {
		s.AttestationDigest = &attDigest.String
	}
	if settledBy.Valid {
		s.SettledBy = &settledBy.String
	}
	return &s, nil
}

func (r *SQLRepository) CreateSettlement(ctx context.Context, s *Settlement) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO prediction_settlements
		 (market_id, result, attestation_source, attestation_id,
		  attestation_digest, attestation_data, settled_by, total_payout_cents, positions_settled)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		 RETURNING id, settled_at`,
		s.MarketID, s.Result, s.AttestationSource, s.AttestationID,
		s.AttestationDigest, s.AttestationData, s.SettledBy,
		s.TotalPayoutCents, s.PositionsSettled,
	).Scan(&s.ID, &s.SettledAt)
}

func (r *SQLRepository) CreatePayout(ctx context.Context, p *Payout) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO prediction_payouts
		 (settlement_id, position_id, user_id, market_id, side,
		  quantity, entry_price_cents, exit_price_cents, pnl_cents, payout_cents)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		 RETURNING id, paid_at`,
		p.SettlementID, p.PositionID, p.UserID, p.MarketID, p.Side,
		p.Quantity, p.EntryPriceCents, p.ExitPriceCents, p.PnlCents, p.PayoutCents,
	).Scan(&p.ID, &p.PaidAt)
}

// --- Lifecycle Events ---

func (r *SQLRepository) ListLifecycleEvents(ctx context.Context, marketID string) ([]LifecycleEvent, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, market_id, event_type, actor_id, actor_type, reason, metadata, occurred_at
		 FROM prediction_lifecycle_events WHERE market_id = $1 ORDER BY occurred_at ASC`, marketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []LifecycleEvent
	for rows.Next() {
		var e LifecycleEvent
		var actorID, reason sql.NullString
		if err := rows.Scan(&e.ID, &e.MarketID, &e.EventType, &actorID, &e.ActorType, &reason, &e.Metadata, &e.OccurredAt); err != nil {
			return nil, err
		}
		if actorID.Valid {
			e.ActorID = &actorID.String
		}
		if reason.Valid {
			e.Reason = &reason.String
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

func (r *SQLRepository) CreateLifecycleEvent(ctx context.Context, e *LifecycleEvent) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO prediction_lifecycle_events
		 (market_id, event_type, actor_id, actor_type, reason, metadata)
		 VALUES ($1,$2,$3,$4,$5,$6)
		 RETURNING id, occurred_at`,
		e.MarketID, e.EventType, e.ActorID, e.ActorType, e.Reason, e.Metadata,
	).Scan(&e.ID, &e.OccurredAt)
}

// --- API Keys ---

func (r *SQLRepository) ListAPIKeys(ctx context.Context, userID string) ([]APIKey, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, name, key_prefix, scopes, active, expires_at, last_used_at, created_at
		 FROM prediction_api_keys WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []APIKey
	for rows.Next() {
		var k APIKey
		var expiresAt, lastUsed sql.NullTime
		if err := rows.Scan(&k.ID, &k.UserID, &k.Name, &k.KeyPrefix, pq.Array(&k.Scopes),
			&k.Active, &expiresAt, &lastUsed, &k.CreatedAt); err != nil {
			return nil, err
		}
		if expiresAt.Valid {
			k.ExpiresAt = &expiresAt.Time
		}
		if lastUsed.Valid {
			k.LastUsedAt = &lastUsed.Time
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

func (r *SQLRepository) GetAPIKeyByPrefix(ctx context.Context, prefix string) (*APIKey, error) {
	var k APIKey
	var expiresAt, lastUsed sql.NullTime
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, name, key_hash, key_prefix, scopes, active, expires_at, last_used_at, created_at
		 FROM prediction_api_keys WHERE key_prefix = $1 AND active = true`, prefix,
	).Scan(&k.ID, &k.UserID, &k.Name, &k.KeyHash, &k.KeyPrefix, pq.Array(&k.Scopes),
		&k.Active, &expiresAt, &lastUsed, &k.CreatedAt)
	if err != nil {
		return nil, err
	}
	if expiresAt.Valid {
		k.ExpiresAt = &expiresAt.Time
	}
	if lastUsed.Valid {
		k.LastUsedAt = &lastUsed.Time
	}
	return &k, nil
}

func (r *SQLRepository) CreateAPIKey(ctx context.Context, k *APIKey) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO prediction_api_keys (user_id, name, key_hash, key_prefix, scopes, active, expires_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
		k.UserID, k.Name, k.KeyHash, k.KeyPrefix, pq.Array(k.Scopes), k.Active, k.ExpiresAt,
	).Scan(&k.ID, &k.CreatedAt)
}

func (r *SQLRepository) DeactivateAPIKey(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE prediction_api_keys SET active = false WHERE id = $1`, id)
	return err
}

func (r *SQLRepository) TouchAPIKeyLastUsed(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE prediction_api_keys SET last_used_at = NOW() WHERE id = $1`, id)
	return err
}

// --- Portfolio ---

func (r *SQLRepository) GetPortfolioSummary(ctx context.Context, userID string) (*PortfolioSummary, error) {
	var s PortfolioSummary

	// Open positions count and value
	err := r.db.QueryRowContext(ctx,
		`SELECT COALESCE(COUNT(*), 0), COALESCE(SUM(total_cost_cents), 0)
		 FROM prediction_positions WHERE user_id = $1 AND quantity > 0`, userID,
	).Scan(&s.OpenPositions, &s.TotalValueCents)
	if err != nil {
		return nil, err
	}

	// Realized PnL from settled payouts
	err = r.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(pnl_cents), 0) FROM prediction_payouts WHERE user_id = $1`, userID,
	).Scan(&s.RealizedPnlCents)
	if err != nil {
		return nil, err
	}

	// Accuracy: correct predictions / total predictions
	err = r.db.QueryRowContext(ctx,
		`SELECT COALESCE(COUNT(*), 0),
		        COALESCE(SUM(CASE WHEN exit_price_cents = 100 THEN 1 ELSE 0 END), 0)
		 FROM prediction_payouts WHERE user_id = $1`, userID,
	).Scan(&s.TotalPredictions, &s.CorrectPredictions)
	if err != nil {
		return nil, err
	}

	if s.TotalPredictions > 0 {
		s.AccuracyPct = float64(s.CorrectPredictions) / float64(s.TotalPredictions) * 100
	}

	return &s, nil
}

func (r *SQLRepository) ListSettledPositions(ctx context.Context, userID string, page, pageSize int) ([]Payout, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM prediction_payouts WHERE user_id = $1`, userID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, settlement_id, position_id, user_id, market_id, side,
		        quantity, entry_price_cents, exit_price_cents, pnl_cents, payout_cents, paid_at
		 FROM prediction_payouts WHERE user_id = $1
		 ORDER BY paid_at DESC LIMIT $2 OFFSET $3`,
		userID, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var payouts []Payout
	for rows.Next() {
		var p Payout
		if err := rows.Scan(&p.ID, &p.SettlementID, &p.PositionID, &p.UserID, &p.MarketID, &p.Side,
			&p.Quantity, &p.EntryPriceCents, &p.ExitPriceCents, &p.PnlCents, &p.PayoutCents, &p.PaidAt); err != nil {
			return nil, 0, err
		}
		payouts = append(payouts, p)
	}
	return payouts, total, rows.Err()
}

// --- Discovery ---

func (r *SQLRepository) GetDiscovery(ctx context.Context) (*DiscoveryResponse, error) {
	d := &DiscoveryResponse{}

	// Featured: markets flagged in featured events
	rows, err := r.db.QueryContext(ctx,
		marketSelectQuery()+` WHERE m.status = 'open'
		  AND m.event_id IN (SELECT id FROM prediction_events WHERE featured = true)
		  ORDER BY m.volume_cents DESC LIMIT 6`)
	if err == nil {
		d.Featured, _ = scanMarkets(rows)
		rows.Close()
	}

	// Trending: highest volume in last hour
	rows, err = r.db.QueryContext(ctx,
		marketSelectQuery()+` WHERE m.status = 'open'
		  ORDER BY m.volume_cents DESC LIMIT 6`)
	if err == nil {
		d.Trending, _ = scanMarkets(rows)
		rows.Close()
	}

	// Closing soon: markets closing within 24h
	rows, err = r.db.QueryContext(ctx,
		marketSelectQuery()+` WHERE m.status = 'open'
		  AND m.close_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
		  ORDER BY m.close_at ASC LIMIT 6`)
	if err == nil {
		d.ClosingSoon, _ = scanMarkets(rows)
		rows.Close()
	}

	// Recent: newest markets
	rows, err = r.db.QueryContext(ctx,
		marketSelectQuery()+` WHERE m.status = 'open'
		  ORDER BY m.created_at DESC LIMIT 6`)
	if err == nil {
		d.Recent, _ = scanMarkets(rows)
		rows.Close()
	}

	return d, nil
}

// --- Helpers ---

func marketSelectQuery() string {
	return `SELECT m.id, m.event_id, m.ticker, m.title, m.description, m.status, m.result,
	               m.yes_price_cents, m.no_price_cents, m.last_trade_price_cents,
	               m.volume_cents, m.open_interest_cents, m.liquidity_cents,
	               m.amm_yes_shares, m.amm_no_shares, m.amm_liquidity_param, m.amm_subsidy_cents,
	               m.settlement_source_key, m.settlement_cutoff_at, m.settlement_rule, m.settlement_params,
	               m.fallback_source_key, m.fee_rate_bps, m.maker_rebate_bps,
	               m.open_at, m.close_at, m.created_at, m.updated_at
	        FROM prediction_markets m`
}

type scannable interface {
	Scan(dest ...interface{}) error
}

func scanMarketRow(row scannable) (*Market, error) {
	var m Market
	var desc sql.NullString
	var result, fallback sql.NullString
	var lastTradePrice sql.NullInt64
	var settleCutoff, openAt sql.NullTime

	err := row.Scan(&m.ID, &m.EventID, &m.Ticker, &m.Title, &desc, &m.Status, &result,
		&m.YesPriceCents, &m.NoPriceCents, &lastTradePrice,
		&m.VolumeCents, &m.OpenInterestCents, &m.LiquidityCents,
		&m.AMMYesShares, &m.AMMNoShares, &m.AMMLiquidityParam, &m.AMMSubsidyCents,
		&m.SettlementSourceKey, &settleCutoff, &m.SettlementRule, &m.SettlementParams,
		&fallback, &m.FeeRateBps, &m.MakerRebateBps,
		&openAt, &m.CloseAt, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	m.Description = desc.String
	if result.Valid {
		r := MarketResult(result.String)
		m.Result = &r
	}
	if lastTradePrice.Valid {
		ltp := int(lastTradePrice.Int64)
		m.LastTradePriceCents = &ltp
	}
	if settleCutoff.Valid {
		m.SettlementCutoffAt = &settleCutoff.Time
	}
	if fallback.Valid {
		m.FallbackSourceKey = &fallback.String
	}
	if openAt.Valid {
		m.OpenAt = &openAt.Time
	}
	return &m, nil
}

func scanMarket(rows *sql.Rows) (*Market, error) {
	return scanMarketRow(rows)
}

func scanMarkets(rows *sql.Rows) ([]Market, error) {
	var markets []Market
	for rows.Next() {
		m, err := scanMarket(rows)
		if err != nil {
			return nil, err
		}
		markets = append(markets, *m)
	}
	return markets, rows.Err()
}

func scanEvent(rows *sql.Rows) (*Event, error) {
	var e Event
	var seriesID, desc, createdBy sql.NullString
	var openAt, settleAt, settledAt sql.NullTime
	err := rows.Scan(&e.ID, &seriesID, &e.Title, &desc, &e.CategoryID, &e.Status, &e.Featured,
		&openAt, &e.CloseAt, &settleAt, &settledAt, &e.Metadata, &createdBy, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if seriesID.Valid {
		e.SeriesID = &seriesID.String
	}
	e.Description = desc.String
	if openAt.Valid {
		e.OpenAt = &openAt.Time
	}
	if settleAt.Valid {
		e.SettleAt = &settleAt.Time
	}
	if settledAt.Valid {
		e.SettledAt = &settledAt.Time
	}
	if createdBy.Valid {
		e.CreatedBy = &createdBy.String
	}
	return &e, nil
}

func scanOrderRow(row scannable) (*Order, error) {
	var o Order
	var priceCents sql.NullInt64
	var walletRes, idemp sql.NullString
	var expiresAt, filledAt, cancelledAt sql.NullTime

	err := row.Scan(&o.ID, &o.UserID, &o.MarketID, &o.Side, &o.Action, &o.OrderType, &priceCents,
		&o.Quantity, &o.FilledQuantity, &o.RemainingQuantity, &o.TotalCostCents,
		&o.Status, &walletRes, &idemp, &expiresAt, &filledAt, &cancelledAt, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if priceCents.Valid {
		pc := int(priceCents.Int64)
		o.PriceCents = &pc
	}
	if walletRes.Valid {
		o.WalletReservationID = &walletRes.String
	}
	if idemp.Valid {
		o.IdempotencyKey = &idemp.String
	}
	if expiresAt.Valid {
		o.ExpiresAt = &expiresAt.Time
	}
	if filledAt.Valid {
		o.FilledAt = &filledAt.Time
	}
	if cancelledAt.Valid {
		o.CancelledAt = &cancelledAt.Time
	}
	return &o, nil
}

func scanOrder(rows *sql.Rows) (*Order, error) {
	return scanOrderRow(rows)
}

func buildEventWhere(f EventFilter) (string, []interface{}) {
	var conds []string
	var args []interface{}
	idx := 1

	if f.CategoryID != nil {
		conds = append(conds, fmt.Sprintf("category_id = $%d", idx))
		args = append(args, *f.CategoryID)
		idx++
	}
	if f.Status != nil {
		conds = append(conds, fmt.Sprintf("status = $%d", idx))
		args = append(args, *f.Status)
		idx++
	}
	if f.Featured != nil {
		conds = append(conds, fmt.Sprintf("featured = $%d", idx))
		args = append(args, *f.Featured)
		idx++
	}
	if f.SeriesID != nil {
		conds = append(conds, fmt.Sprintf("series_id = $%d", idx))
		args = append(args, *f.SeriesID)
		idx++
	}

	if len(conds) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(conds, " AND "), args
}

func buildMarketWhere(f MarketFilter) (string, []interface{}) {
	var conds []string
	var args []interface{}
	idx := 1

	if f.EventID != nil {
		conds = append(conds, fmt.Sprintf("event_id = $%d", idx))
		args = append(args, *f.EventID)
		idx++
	}
	if f.Status != nil {
		conds = append(conds, fmt.Sprintf("status = $%d", idx))
		args = append(args, *f.Status)
		idx++
	}
	if f.Ticker != nil {
		conds = append(conds, fmt.Sprintf("ticker = $%d", idx))
		args = append(args, *f.Ticker)
		idx++
	}

	if len(conds) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(conds, " AND "), args
}

func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
