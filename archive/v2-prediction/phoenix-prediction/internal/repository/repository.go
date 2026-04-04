package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-prediction/internal/models"
)

var ErrNotFound = errors.New("not found")

type CreateOrderParams struct {
	UserID        string
	MarketID      string
	OutcomeID     string
	StakeUSD      decimal.Decimal
	PriceCents    int
	Shares        decimal.Decimal
	MaxPayoutUSD  decimal.Decimal
	MaxProfitUSD  decimal.Decimal
	ReservationID string
}

type LifecycleCommand struct {
	Action    string
	MarketID  string
	OutcomeID string
	ActorID   string
	Reason    string
}

type AuditLogEntry struct {
	ActorID    string
	Action     string
	EntityType string
	EntityID   string
	OldValue   any
	NewValue   any
	IPAddress  string
	CreatedAt  time.Time
}

type IssueBotAPIKeyParams struct {
	KeyID       string
	AccountKey  string
	DisplayName string
	Scopes      []string
	TokenHash   string
	IssuedAt    time.Time
	ExpiresAt   *time.Time
	CreatedBy   string
}

type Repository interface {
	GetOverview(ctx context.Context) (*models.PredictionOverviewResponse, error)
	ListCategories(ctx context.Context) ([]models.PredictionCategoryView, error)
	ListMarkets(ctx context.Context, filters models.PredictionMarketFilters) ([]*models.PredictionMarketView, error)
	GetMarketDetail(ctx context.Context, marketID string) (*models.PredictionMarketDetailResponse, error)
	PreviewTicket(ctx context.Context, req *models.PredictionTicketPreviewRequest) (*models.PredictionTicketPreviewResponse, error)
	CreateOrder(ctx context.Context, params CreateOrderParams) (*models.PredictionOrderView, error)
	CancelOrder(ctx context.Context, userID, orderID string, cancelledAt time.Time) (*models.PredictionOrderView, error)
	UpdateOrderReservationID(ctx context.Context, orderID, reservationID string, updatedAt time.Time) error
	ListUserOrders(ctx context.Context, userID, status, category string) ([]*models.PredictionOrderView, error)
	GetOrder(ctx context.Context, orderID string) (*models.PredictionOrderView, error)
	ListAllOrders(ctx context.Context, filters models.AdminOrderFilters) ([]*models.PredictionOrderView, error)
	GetAdminSummary(ctx context.Context) (*models.PredictionAdminSummaryResponse, error)
	GetLifecycleHistory(ctx context.Context, marketID string) (*models.PredictionLifecycleHistoryResponse, error)
	ExecuteLifecycle(ctx context.Context, cmd LifecycleCommand) (*models.PredictionMarketDetailResponse, error)
	IssueBotAPIKey(ctx context.Context, params IssueBotAPIKeyParams) error
	WriteAuditLog(ctx context.Context, entry AuditLogEntry) error
}

type PostgresRepository struct{ pool *pgxpool.Pool }

func NewRepository(pool *pgxpool.Pool) Repository { return &PostgresRepository{pool: pool} }

type rowQueryer interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

type predictionMarketRow struct {
	MarketID            string
	Slug                string
	Title               string
	ShortTitle          string
	CategoryKey         string
	CategoryLabel       string
	CategoryDescription string
	Accent              string
	Status              string
	Featured            bool
	Live                bool
	ClosesAt            time.Time
	ResolvesAt          time.Time
	VolumeUSD           decimal.Decimal
	LiquidityUSD        decimal.Decimal
	Participants        int
	Summary             string
	Insight             string
	Rules               []string
	Tags                []string
	ResolutionSource    string
	HeroMetricLabel     string
	HeroMetricValue     string
	ProbabilityPercent  int
	PriceChangePercent  decimal.Decimal
	WinningOutcomeID    *string
	SettlementNote      *string
}

type predictionOutcomeRow struct {
	OutcomeID  string
	MarketID   string
	Label      string
	PriceCents int
	Change1D   decimal.Decimal
	Status     string
	Result     string
	SortOrder  int
}

func (r *PostgresRepository) GetOverview(ctx context.Context) (*models.PredictionOverviewResponse, error) {
	categories, err := r.ListCategories(ctx)
	if err != nil {
		return nil, err
	}
	featuredTrue := true
	liveTrue := true
	featured, err := r.ListMarkets(ctx, models.PredictionMarketFilters{Featured: &featuredTrue})
	if err != nil {
		return nil, err
	}
	live, err := r.ListMarkets(ctx, models.PredictionMarketFilters{Live: &liveTrue})
	if err != nil {
		return nil, err
	}
	trending, err := r.topMarketsByVolume(ctx, 3)
	if err != nil {
		return nil, err
	}
	return &models.PredictionOverviewResponse{FeaturedMarkets: featured, LiveMarkets: live, TrendingMarkets: trending, Categories: categories}, nil
}

func (r *PostgresRepository) ListCategories(ctx context.Context) ([]models.PredictionCategoryView, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, key, label, description, accent, sort_order, created_at FROM prediction_categories ORDER BY sort_order ASC, label ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	categories := make([]models.PredictionCategoryView, 0)
	for rows.Next() {
		var category models.PredictionCategoryView
		if err := rows.Scan(&category.ID, &category.Key, &category.Label, &category.Description, &category.Accent, &category.SortOrder, &category.CreatedAt); err != nil {
			return nil, err
		}
		categories = append(categories, category)
	}
	return categories, rows.Err()
}

func (r *PostgresRepository) ListMarkets(ctx context.Context, filters models.PredictionMarketFilters) ([]*models.PredictionMarketView, error) {
	conditions := []string{"1=1"}
	args := []any{}
	argPos := 1
	if filters.Category = strings.TrimSpace(filters.Category); filters.Category != "" {
		conditions = append(conditions, fmt.Sprintf("c.key = $%d", argPos))
		args = append(args, filters.Category)
		argPos++
	}
	if filters.Status = strings.TrimSpace(filters.Status); filters.Status != "" {
		conditions = append(conditions, fmt.Sprintf("m.status = $%d", argPos))
		args = append(args, filters.Status)
		argPos++
	}
	if filters.Featured != nil {
		conditions = append(conditions, fmt.Sprintf("m.featured = $%d", argPos))
		args = append(args, *filters.Featured)
		argPos++
	}
	if filters.Live != nil {
		conditions = append(conditions, fmt.Sprintf("m.live = $%d", argPos))
		args = append(args, *filters.Live)
		argPos++
	}
	query := fmt.Sprintf(`
		SELECT m.id, m.slug, m.title, m.short_title, c.key, c.label, c.description, c.accent,
			m.status, m.featured, m.live, m.closes_at, m.resolves_at, m.volume_usd, m.liquidity_usd,
			m.participants, m.summary, m.insight, m.rules, m.tags, m.resolution_source, m.hero_metric_label,
			m.hero_metric_value, m.probability_percent, m.price_change_percent, m.winning_outcome_id::text, m.settlement_note
		FROM prediction_markets m
		JOIN prediction_categories c ON c.id = m.category_id
		WHERE %s
		ORDER BY m.featured DESC, m.live DESC, m.volume_usd DESC, m.created_at DESC
	`, strings.Join(conditions, " AND "))
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	markets := make([]*models.PredictionMarketView, 0)
	for rows.Next() {
		market, err := scanPredictionMarket(rows)
		if err != nil {
			return nil, err
		}
		outcomes, err := r.loadOutcomes(ctx, market.MarketID)
		if err != nil {
			return nil, err
		}
		market.Outcomes = outcomes
		market.RelatedMarketIDs, _ = r.loadRelatedMarketIDs(ctx, market.MarketID, market.CategoryKey, 3)
		markets = append(markets, market)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return markets, nil
}

func (r *PostgresRepository) GetMarketDetail(ctx context.Context, marketID string) (*models.PredictionMarketDetailResponse, error) {
	market, err := r.loadMarket(ctx, r.pool, marketID)
	if err != nil {
		return nil, err
	}
	related, err := r.loadRelatedMarkets(ctx, marketID, market.CategoryKey, 3)
	if err != nil {
		return nil, err
	}
	return &models.PredictionMarketDetailResponse{Market: market, RelatedMarkets: related}, nil
}

func (r *PostgresRepository) PreviewTicket(ctx context.Context, req *models.PredictionTicketPreviewRequest) (*models.PredictionTicketPreviewResponse, error) {
	if req == nil || req.StakeUSD.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("stake must be greater than zero")
	}
	market, outcome, err := r.getMarketAndOutcome(ctx, r.pool, req.MarketID, req.OutcomeID)
	if err != nil {
		return nil, err
	}
	if market.Status != "open" && market.Status != "live" {
		return nil, fmt.Errorf("prediction market not open")
	}
	shares, maxPayout, maxProfit := calculatePredictionTicket(req.StakeUSD, outcome.PriceCents)
	return &models.PredictionTicketPreviewResponse{MarketID: req.MarketID, OutcomeID: req.OutcomeID, PriceCents: outcome.PriceCents, StakeUSD: req.StakeUSD.Round(2), Shares: shares, MaxPayoutUSD: maxPayout, MaxProfitUSD: maxProfit}, nil
}

func (r *PostgresRepository) CreateOrder(ctx context.Context, params CreateOrderParams) (*models.PredictionOrderView, error) {
	now := time.Now().UTC()
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if _, _, err := r.getMarketAndOutcome(ctx, tx, params.MarketID, params.OutcomeID); err != nil {
		return nil, err
	}
	if err := ensureUserExists(ctx, tx, params.UserID); err != nil {
		return nil, err
	}
	categoryKey, err := r.lookupCategoryKey(ctx, tx, params.MarketID)
	if err != nil {
		return nil, err
	}
	orderID := uuid.NewString()
	if _, err := tx.Exec(ctx, `
		INSERT INTO prediction_orders (id, user_id, market_id, outcome_id, category_key, stake_usd, price_cents, shares, max_payout_usd, max_profit_usd, status, reservation_id, placed_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'open',NULLIF($11,'')::uuid,$12,$12,$12)
	`, orderID, params.UserID, params.MarketID, params.OutcomeID, categoryKey, params.StakeUSD, params.PriceCents, params.Shares, params.MaxPayoutUSD, params.MaxProfitUSD, params.ReservationID, now); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE prediction_markets SET volume_usd = volume_usd + $2, liquidity_usd = liquidity_usd + $2, participants = participants + 1, updated_at = $3 WHERE id = $1`, params.MarketID, params.StakeUSD, now); err != nil {
		return nil, err
	}
	if err := r.appendEventTx(ctx, tx, "prediction-order", orderID, "PredictionOrderPlaced", map[string]any{"order_id": orderID, "user_id": params.UserID, "market_id": params.MarketID, "outcome_id": params.OutcomeID, "stake_usd": params.StakeUSD.String(), "price_cents": params.PriceCents, "reservation_id": params.ReservationID, "placed_at": now.Format(time.RFC3339)}); err != nil {
		return nil, err
	}
	if err := r.appendOutboxTx(ctx, tx, "prediction-order", orderID, "PredictionOrderPlaced", map[string]any{"order_id": orderID, "market_id": params.MarketID, "status": "open"}, "phoenix.prediction.order-placed"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetOrder(ctx, orderID)
}

func (r *PostgresRepository) CancelOrder(ctx context.Context, userID, orderID string, cancelledAt time.Time) (*models.PredictionOrderView, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	order, err := r.getOrderRow(ctx, tx, orderID)
	if err != nil {
		return nil, err
	}
	if order.UserID != userID {
		return nil, ErrNotFound
	}
	if order.Status != "open" {
		return nil, fmt.Errorf("prediction order not cancellable")
	}
	if _, err := tx.Exec(ctx, `UPDATE prediction_orders SET status = 'cancelled', cancelled_at = $2, updated_at = $2, settlement_result = 'cancelled', settlement_note = 'cancelled by player' WHERE id = $1`, orderID, cancelledAt); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE prediction_markets SET liquidity_usd = GREATEST(liquidity_usd - $2, 0), updated_at = $3 WHERE id = $1`, order.MarketID, order.StakeUSD, cancelledAt); err != nil {
		return nil, err
	}
	if err := r.appendEventTx(ctx, tx, "prediction-order", orderID, "PredictionOrderCancelled", map[string]any{"order_id": orderID, "user_id": userID, "cancelled_at": cancelledAt.Format(time.RFC3339)}); err != nil {
		return nil, err
	}
	if err := r.appendOutboxTx(ctx, tx, "prediction-order", orderID, "PredictionOrderCancelled", map[string]any{"order_id": orderID, "status": "cancelled"}, "phoenix.prediction.order-cancelled"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetOrder(ctx, orderID)
}

func (r *PostgresRepository) UpdateOrderReservationID(ctx context.Context, orderID, reservationID string, updatedAt time.Time) error {
	command, err := r.pool.Exec(ctx, `UPDATE prediction_orders SET reservation_id = NULLIF($2,'')::uuid, updated_at = $3 WHERE id = $1`, orderID, reservationID, updatedAt)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresRepository) IssueBotAPIKey(ctx context.Context, params IssueBotAPIKeyParams) error {
	now := params.IssuedAt.UTC()
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	createdBy := nullableUUIDString(params.CreatedBy)
	newValue := map[string]any{
		"key_id":       params.KeyID,
		"account_key":  params.AccountKey,
		"display_name": params.DisplayName,
		"scopes":       params.Scopes,
		"issued_at":    now.Format(time.RFC3339),
		"expires_at":   nil,
	}
	if params.ExpiresAt != nil {
		newValue["expires_at"] = params.ExpiresAt.UTC().Format(time.RFC3339)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO prediction_bot_api_keys (
			id,
			account_key,
			display_name,
			scopes,
			token_hash,
			issued_at,
			expires_at,
			created_by,
			created_at,
			updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,NULLIF($8,'')::uuid,$6,$6)
	`, params.KeyID, params.AccountKey, params.DisplayName, params.Scopes, params.TokenHash, now, params.ExpiresAt, createdBy); err != nil {
		return err
	}

	if err := r.appendEventTx(ctx, tx, "prediction-bot-key", params.KeyID, "PredictionBotApiKeyIssued", map[string]any{
		"key_id":       params.KeyID,
		"account_key":  params.AccountKey,
		"display_name": params.DisplayName,
		"scopes":       params.Scopes,
		"issued_at":    now.Format(time.RFC3339),
		"expires_at":   newValue["expires_at"],
		"created_by":   createdBy,
	}); err != nil {
		return err
	}

	if err := r.appendOutboxTx(ctx, tx, "prediction-bot-key", params.KeyID, "PredictionBotApiKeyIssued", map[string]any{
		"key_id":      params.KeyID,
		"account_key": params.AccountKey,
		"issued_at":   now.Format(time.RFC3339),
	}, "phoenix.prediction.bot-key-issued"); err != nil {
		return err
	}

	newValuePayload, err := json.Marshal(newValue)
	if err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
		VALUES ($1, NULLIF($2,'')::uuid, $3, $4, NULLIF($5,''), NULL, $6, NULL, $7)
	`, uuid.NewString(), createdBy, "prediction.bot_key.issued", "prediction-bot-key", params.KeyID, newValuePayload, now); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) ListUserOrders(ctx context.Context, userID, status, category string) ([]*models.PredictionOrderView, error) {
	return r.queryOrders(ctx, models.AdminOrderFilters{UserID: userID, Status: status, Category: category})
}

func (r *PostgresRepository) GetOrder(ctx context.Context, orderID string) (*models.PredictionOrderView, error) {
	orders, err := r.queryOrdersByClause(ctx, r.pool, "po.id = $1", []any{orderID})
	if err != nil {
		return nil, err
	}
	if len(orders) == 0 {
		return nil, ErrNotFound
	}
	return orders[0], nil
}

func (r *PostgresRepository) ListAllOrders(ctx context.Context, filters models.AdminOrderFilters) ([]*models.PredictionOrderView, error) {
	return r.queryOrders(ctx, filters)
}

func (r *PostgresRepository) GetAdminSummary(ctx context.Context) (*models.PredictionAdminSummaryResponse, error) {
	response := &models.PredictionAdminSummaryResponse{}
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*),
			COUNT(*) FILTER (WHERE status = 'live'),
			COUNT(*) FILTER (WHERE featured = TRUE),
			COUNT(*) FILTER (WHERE status = 'resolved'),
			COALESCE(SUM(volume_usd), 0),
			COALESCE(SUM(liquidity_usd), 0)
		FROM prediction_markets
	`).Scan(&response.TotalMarkets, &response.LiveMarkets, &response.FeaturedMarkets, &response.ResolvedMarkets, &response.TotalVolumeUSD, &response.TotalLiquidityUSD); err != nil {
		return nil, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'open'), COUNT(*) FILTER (WHERE status = 'cancelled') FROM prediction_orders`).Scan(&response.TotalOrders, &response.OpenOrders, &response.CancelledOrders); err != nil {
		return nil, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT c.key, c.label,
			COUNT(m.*),
			COUNT(*) FILTER (WHERE m.live = TRUE),
			COUNT(*) FILTER (WHERE m.status = 'open'),
			COUNT(*) FILTER (WHERE m.status = 'resolved')
		FROM prediction_categories c
		LEFT JOIN prediction_markets m ON m.category_id = c.id
		GROUP BY c.key, c.label
		ORDER BY c.label ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	response.Categories = make([]models.PredictionAdminCategorySummary, 0)
	for rows.Next() {
		var item models.PredictionAdminCategorySummary
		if err := rows.Scan(&item.Key, &item.Label, &item.MarketCount, &item.LiveMarketCount, &item.OpenMarketCount, &item.ResolvedMarketCount); err != nil {
			return nil, err
		}
		response.Categories = append(response.Categories, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	response.TopMarkets, err = r.topMarketsByVolume(ctx, 5)
	if err != nil {
		return nil, err
	}
	return response, nil
}

func (r *PostgresRepository) GetLifecycleHistory(ctx context.Context, marketID string) (*models.PredictionLifecycleHistoryResponse, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT e.id, e.action, e.market_status_before, e.market_status_after, e.outcome_id::text, o.label, e.performed_by::text, e.reason, e.created_at
		FROM prediction_market_lifecycle_events e
		LEFT JOIN prediction_outcomes o ON o.id = e.outcome_id
		WHERE e.market_id = $1
		ORDER BY e.created_at DESC
	`, marketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.PredictionLifecycleEventView, 0)
	for rows.Next() {
		var item models.PredictionLifecycleEventView
		if err := rows.Scan(&item.ID, &item.Action, &item.MarketStatusBefore, &item.MarketStatusAfter, &item.OutcomeID, &item.OutcomeLabel, &item.PerformedBy, &item.Reason, &item.PerformedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(items) == 0 {
		if _, err := r.loadMarket(ctx, r.pool, marketID); err != nil {
			return nil, err
		}
	}
	return &models.PredictionLifecycleHistoryResponse{MarketID: marketID, TotalCount: len(items), Items: items}, nil
}

func (r *PostgresRepository) ExecuteLifecycle(ctx context.Context, cmd LifecycleCommand) (*models.PredictionMarketDetailResponse, error) {
	now := time.Now().UTC()
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	marketRow, err := r.loadMarketRow(ctx, tx, cmd.MarketID)
	if err != nil {
		return nil, err
	}
	previousStatus := marketRow.Status
	newStatus := previousStatus
	var winningOutcomeID *string
	var settlementNote *string

	switch cmd.Action {
	case "suspend":
		newStatus = "suspended"
		if _, err := tx.Exec(ctx, `UPDATE prediction_markets SET status = 'suspended', live = FALSE, updated_at = $2 WHERE id = $1`, cmd.MarketID, now); err != nil {
			return nil, err
		}
	case "open":
		newStatus = "open"
		if _, err := tx.Exec(ctx, `UPDATE prediction_markets SET status = 'open', live = FALSE, updated_at = $2 WHERE id = $1`, cmd.MarketID, now); err != nil {
			return nil, err
		}
	case "cancel":
		newStatus = "cancelled"
		note := strings.TrimSpace(cmd.Reason)
		settlementNote = &note
		if err := r.cancelOpenOrdersTx(ctx, tx, cmd.MarketID, now, note); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, `UPDATE prediction_markets SET status = 'cancelled', live = FALSE, liquidity_usd = 0, settlement_note = $2, updated_at = $3 WHERE id = $1`, cmd.MarketID, note, now); err != nil {
			return nil, err
		}
	case "resolve":
		if strings.TrimSpace(cmd.OutcomeID) == "" {
			return nil, fmt.Errorf("outcome_id is required")
		}
		newStatus = "resolved"
		winningOutcomeID = &cmd.OutcomeID
		note := strings.TrimSpace(cmd.Reason)
		settlementNote = &note
		if err := r.resolveOrdersTx(ctx, tx, cmd.MarketID, cmd.OutcomeID, now, false); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, `UPDATE prediction_markets SET status = 'resolved', live = FALSE, liquidity_usd = 0, winning_outcome_id = $2, settlement_note = $3, updated_at = $4 WHERE id = $1`, cmd.MarketID, cmd.OutcomeID, note, now); err != nil {
			return nil, err
		}
	case "resettle":
		if strings.TrimSpace(cmd.OutcomeID) == "" {
			return nil, fmt.Errorf("outcome_id is required")
		}
		newStatus = "resolved"
		winningOutcomeID = &cmd.OutcomeID
		note := strings.TrimSpace(cmd.Reason)
		settlementNote = &note
		if err := r.resolveOrdersTx(ctx, tx, cmd.MarketID, cmd.OutcomeID, now, true); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, `UPDATE prediction_markets SET status = 'resolved', live = FALSE, liquidity_usd = 0, winning_outcome_id = $2, settlement_note = $3, updated_at = $4 WHERE id = $1`, cmd.MarketID, cmd.OutcomeID, note, now); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported lifecycle action")
	}

	action := lifecycleActionName(cmd.Action)
	if _, err := tx.Exec(ctx, `
		INSERT INTO prediction_market_lifecycle_events (id, market_id, action, market_status_before, market_status_after, outcome_id, performed_by, reason, created_at)
		VALUES ($1,$2,$3,$4,$5,NULLIF($6,'')::uuid,NULLIF($7,'')::uuid,$8,$9)
	`, uuid.NewString(), cmd.MarketID, action, previousStatus, newStatus, strings.TrimSpace(cmd.OutcomeID), strings.TrimSpace(cmd.ActorID), defaultReason(cmd.Reason, cmd.Action), now); err != nil {
		return nil, err
	}
	if err := r.appendEventTx(ctx, tx, "prediction-market", cmd.MarketID, lifecycleEventName(cmd.Action), map[string]any{"market_id": cmd.MarketID, "previous_status": previousStatus, "status": newStatus, "outcome_id": cmd.OutcomeID, "performed_by": cmd.ActorID, "reason": defaultReason(cmd.Reason, cmd.Action), "performed_at": now.Format(time.RFC3339)}); err != nil {
		return nil, err
	}
	if err := r.appendOutboxTx(ctx, tx, "prediction-market", cmd.MarketID, lifecycleEventName(cmd.Action), map[string]any{"market_id": cmd.MarketID, "status": newStatus, "winning_outcome_id": winningOutcomeID, "settlement_note": settlementNote}, "phoenix.prediction.market-updated"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetMarketDetail(ctx, cmd.MarketID)
}

func (r *PostgresRepository) topMarketsByVolume(ctx context.Context, limit int) ([]*models.PredictionMarketView, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT m.id, m.slug, m.title, m.short_title, c.key, c.label, c.description, c.accent,
			m.status, m.featured, m.live, m.closes_at, m.resolves_at, m.volume_usd, m.liquidity_usd,
			m.participants, m.summary, m.insight, m.rules, m.tags, m.resolution_source, m.hero_metric_label,
			m.hero_metric_value, m.probability_percent, m.price_change_percent, m.winning_outcome_id::text, m.settlement_note
		FROM prediction_markets m
		JOIN prediction_categories c ON c.id = m.category_id
		ORDER BY m.volume_usd DESC, m.created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	markets := make([]*models.PredictionMarketView, 0, limit)
	for rows.Next() {
		market, err := scanPredictionMarket(rows)
		if err != nil {
			return nil, err
		}
		market.Outcomes, _ = r.loadOutcomes(ctx, market.MarketID)
		market.RelatedMarketIDs, _ = r.loadRelatedMarketIDs(ctx, market.MarketID, market.CategoryKey, 3)
		markets = append(markets, market)
	}
	return markets, rows.Err()
}

func (r *PostgresRepository) queryOrders(ctx context.Context, filters models.AdminOrderFilters) ([]*models.PredictionOrderView, error) {
	conditions := []string{"1=1"}
	args := []any{}
	argPos := 1
	if filters.UserID = strings.TrimSpace(filters.UserID); filters.UserID != "" {
		conditions = append(conditions, fmt.Sprintf("po.user_id = $%d", argPos))
		args = append(args, filters.UserID)
		argPos++
	}
	if filters.MarketID = strings.TrimSpace(filters.MarketID); filters.MarketID != "" {
		conditions = append(conditions, fmt.Sprintf("po.market_id = $%d", argPos))
		args = append(args, filters.MarketID)
		argPos++
	}
	if filters.Status = strings.TrimSpace(filters.Status); filters.Status != "" {
		conditions = append(conditions, fmt.Sprintf("po.status = $%d", argPos))
		args = append(args, filters.Status)
		argPos++
	}
	if filters.Category = strings.TrimSpace(filters.Category); filters.Category != "" {
		conditions = append(conditions, fmt.Sprintf("po.category_key = $%d", argPos))
		args = append(args, filters.Category)
		argPos++
	}
	return r.queryOrdersByClause(ctx, r.pool, strings.Join(conditions, " AND "), args)
}

func (r *PostgresRepository) queryOrdersByClause(ctx context.Context, querier rowQueryer, where string, args []any) ([]*models.PredictionOrderView, error) {
	query := fmt.Sprintf(`
		SELECT po.id, po.user_id, po.market_id, pm.title, po.category_key, po.outcome_id, o.label,
			po.stake_usd, po.price_cents, po.shares, po.max_payout_usd, po.max_profit_usd, po.status,
			po.reservation_id::text, po.placed_at, po.cancelled_at, po.settled_at, po.settlement_result,
			po.settlement_pnl, po.settlement_note
		FROM prediction_orders po
		JOIN prediction_markets pm ON pm.id = po.market_id
		JOIN prediction_outcomes o ON o.id = po.outcome_id
		WHERE %s
		ORDER BY po.placed_at DESC, po.created_at DESC
	`, where)
	rows, err := querier.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	orders := make([]*models.PredictionOrderView, 0)
	for rows.Next() {
		var order models.PredictionOrderView
		if err := rows.Scan(
			&order.OrderID,
			&order.UserID,
			&order.MarketID,
			&order.MarketTitle,
			&order.CategoryKey,
			&order.OutcomeID,
			&order.OutcomeLabel,
			&order.StakeUSD,
			&order.PriceCents,
			&order.Shares,
			&order.MaxPayoutUSD,
			&order.MaxProfitUSD,
			&order.Status,
			&order.ReservationID,
			&order.PlacedAt,
			&order.CancelledAt,
			&order.SettledAt,
			&order.SettlementResult,
			&order.SettlementPNL,
			&order.SettlementNote,
		); err != nil {
			return nil, err
		}
		orders = append(orders, &order)
	}
	return orders, rows.Err()
}

func (r *PostgresRepository) loadMarket(ctx context.Context, querier interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, marketID string) (*models.PredictionMarketView, error) {
	row := querier.QueryRow(ctx, `
		SELECT m.id, m.slug, m.title, m.short_title, c.key, c.label, c.description, c.accent,
			m.status, m.featured, m.live, m.closes_at, m.resolves_at, m.volume_usd, m.liquidity_usd,
			m.participants, m.summary, m.insight, m.rules, m.tags, m.resolution_source, m.hero_metric_label,
			m.hero_metric_value, m.probability_percent, m.price_change_percent, m.winning_outcome_id::text, m.settlement_note
		FROM prediction_markets m
		JOIN prediction_categories c ON c.id = m.category_id
		WHERE m.id = $1
	`, marketID)
	market, err := scanPredictionMarket(row)
	if err != nil {
		return nil, err
	}
	market.Outcomes, err = r.loadOutcomes(ctx, market.MarketID)
	if err != nil {
		return nil, err
	}
	market.RelatedMarketIDs, _ = r.loadRelatedMarketIDs(ctx, market.MarketID, market.CategoryKey, 3)
	return market, nil
}

func (r *PostgresRepository) loadMarketRow(ctx context.Context, querier interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, marketID string) (*predictionMarketRow, error) {
	row := querier.QueryRow(ctx, `
		SELECT m.id, m.slug, m.title, m.short_title, c.key, c.label, c.description, c.accent,
			m.status, m.featured, m.live, m.closes_at, m.resolves_at, m.volume_usd, m.liquidity_usd,
			m.participants, m.summary, m.insight, m.rules, m.tags, m.resolution_source, m.hero_metric_label,
			m.hero_metric_value, m.probability_percent, m.price_change_percent, m.winning_outcome_id::text, m.settlement_note
		FROM prediction_markets m
		JOIN prediction_categories c ON c.id = m.category_id
		WHERE m.id = $1
	`, marketID)
	return scanPredictionMarketRow(row)
}

func (r *PostgresRepository) loadRelatedMarketIDs(ctx context.Context, marketID, categoryKey string, limit int) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT m.id::text
		FROM prediction_markets m
		JOIN prediction_categories c ON c.id = m.category_id
		WHERE c.key = $1 AND m.id <> $2::uuid
		ORDER BY m.featured DESC, m.volume_usd DESC, m.created_at DESC
		LIMIT $3
	`, categoryKey, marketID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := make([]string, 0, limit)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *PostgresRepository) loadRelatedMarkets(ctx context.Context, marketID, categoryKey string, limit int) ([]*models.PredictionMarketView, error) {
	ids, err := r.loadRelatedMarketIDs(ctx, marketID, categoryKey, limit)
	if err != nil {
		return nil, err
	}
	markets := make([]*models.PredictionMarketView, 0, len(ids))
	for _, id := range ids {
		market, err := r.loadMarket(ctx, r.pool, id)
		if err != nil {
			return nil, err
		}
		markets = append(markets, market)
	}
	return markets, nil
}

func (r *PostgresRepository) loadOutcomes(ctx context.Context, marketID string) ([]models.PredictionOutcomeView, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, market_id, label, price_cents, change_1d, status, result, sort_order FROM prediction_outcomes WHERE market_id = $1 ORDER BY sort_order ASC, created_at ASC`, marketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	outcomes := make([]models.PredictionOutcomeView, 0)
	for rows.Next() {
		var row predictionOutcomeRow
		if err := rows.Scan(&row.OutcomeID, &row.MarketID, &row.Label, &row.PriceCents, &row.Change1D, &row.Status, &row.Result, &row.SortOrder); err != nil {
			return nil, err
		}
		outcomes = append(outcomes, models.PredictionOutcomeView{OutcomeID: row.OutcomeID, Label: row.Label, PriceCents: row.PriceCents, Change1D: row.Change1D, Status: row.Status, Result: row.Result})
	}
	return outcomes, rows.Err()
}

func (r *PostgresRepository) loadOutcome(ctx context.Context, querier interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, outcomeID string) (*predictionOutcomeRow, error) {
	row := querier.QueryRow(ctx, `SELECT id, market_id, label, price_cents, change_1d, status, result, sort_order FROM prediction_outcomes WHERE id = $1`, outcomeID)
	outcome := &predictionOutcomeRow{}
	if err := row.Scan(&outcome.OutcomeID, &outcome.MarketID, &outcome.Label, &outcome.PriceCents, &outcome.Change1D, &outcome.Status, &outcome.Result, &outcome.SortOrder); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return outcome, nil
}

func (r *PostgresRepository) getMarketAndOutcome(ctx context.Context, querier interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, marketID, outcomeID string) (*predictionMarketRow, *predictionOutcomeRow, error) {
	market, err := r.loadMarketRow(ctx, querier, marketID)
	if err != nil {
		return nil, nil, err
	}
	outcome, err := r.loadOutcome(ctx, querier, outcomeID)
	if err != nil {
		return nil, nil, err
	}
	if outcome.MarketID != marketID {
		return nil, nil, ErrNotFound
	}
	return market, outcome, nil
}

func (r *PostgresRepository) getOrderRow(ctx context.Context, querier rowQueryer, orderID string) (*models.PredictionOrderView, error) {
	orders, err := r.queryOrdersByClause(ctx, querier, "po.id = $1", []any{orderID})
	if err != nil {
		return nil, err
	}
	if len(orders) == 0 {
		return nil, ErrNotFound
	}
	return orders[0], nil
}

func (r *PostgresRepository) lookupCategoryKey(ctx context.Context, querier interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, marketID string) (string, error) {
	var key string
	if err := querier.QueryRow(ctx, `SELECT c.key FROM prediction_markets m JOIN prediction_categories c ON c.id = m.category_id WHERE m.id = $1`, marketID).Scan(&key); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return key, nil
}

func (r *PostgresRepository) cancelOpenOrdersTx(ctx context.Context, tx pgx.Tx, marketID string, now time.Time, reason string) error {
	rows, err := tx.Query(ctx, `SELECT id FROM prediction_orders WHERE market_id = $1 AND status = 'open' ORDER BY placed_at ASC`, marketID)
	if err != nil {
		return err
	}
	defer rows.Close()
	orderIDs := []string{}
	for rows.Next() {
		var orderID string
		if err := rows.Scan(&orderID); err != nil {
			return err
		}
		orderIDs = append(orderIDs, orderID)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, orderID := range orderIDs {
		order, err := r.getOrderRow(ctx, tx, orderID)
		if err != nil {
			return err
		}
		if err := r.releaseReservationTx(ctx, tx, order.UserID, stringValue(order.ReservationID), order.StakeUSD, order.OrderID, "prediction"); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE prediction_orders SET status = 'voided', settled_at = $2, updated_at = $2, settlement_result = 'cancelled', settlement_pnl = 0, settlement_note = $3 WHERE id = $1`, orderID, now, reason); err != nil {
			return err
		}
		if err := r.appendEventTx(ctx, tx, "prediction-order", orderID, "PredictionOrderVoided", map[string]any{"order_id": orderID, "market_id": marketID, "reason": reason, "settled_at": now.Format(time.RFC3339)}); err != nil {
			return err
		}
	}
	return nil
}

func (r *PostgresRepository) resolveOrdersTx(ctx context.Context, tx pgx.Tx, marketID, winningOutcomeID string, now time.Time, resettle bool) error {
	rows, err := tx.Query(ctx, `SELECT id FROM prediction_orders WHERE market_id = $1 AND status IN ('open','won','lost','voided') ORDER BY placed_at ASC`, marketID)
	if err != nil {
		return err
	}
	defer rows.Close()
	orderIDs := []string{}
	for rows.Next() {
		var orderID string
		if err := rows.Scan(&orderID); err != nil {
			return err
		}
		orderIDs = append(orderIDs, orderID)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, orderID := range orderIDs {
		order, err := r.getOrderRow(ctx, tx, orderID)
		if err != nil {
			return err
		}
		if resettle && order.SettlementPNL != nil && !order.SettlementPNL.IsZero() {
			if err := r.applyWalletTransactionTx(ctx, tx, order.UserID, "transfer", order.SettlementPNL.Neg(), order.OrderID, map[string]any{"reason": "prediction_resettle_reversal", "market_id": marketID}); err != nil {
				return err
			}
		}
		if order.Status == "open" {
			if err := r.releaseReservationTx(ctx, tx, order.UserID, stringValue(order.ReservationID), order.StakeUSD, order.OrderID, "prediction"); err != nil {
				return err
			}
		}
		result := "lost"
		newStatus := "lost"
		pnl := order.StakeUSD.Neg()
		if order.OutcomeID == winningOutcomeID {
			result = "won"
			newStatus = "won"
			pnl = order.MaxProfitUSD
		} else if winningOutcomeID == "" {
			result = "voided"
			newStatus = "voided"
			pnl = decimal.Zero
		}
		if pnl.IsPositive() {
			if err := r.applyWalletTransactionTx(ctx, tx, order.UserID, "bet_win", pnl, order.OrderID, map[string]any{"market_id": marketID, "outcome_id": order.OutcomeID, "result": result}); err != nil {
				return err
			}
		} else if pnl.IsNegative() {
			if err := r.applyWalletTransactionTx(ctx, tx, order.UserID, "bet_place", pnl, order.OrderID, map[string]any{"market_id": marketID, "outcome_id": order.OutcomeID, "result": result}); err != nil {
				return err
			}
		}
		if _, err := tx.Exec(ctx, `UPDATE prediction_orders SET status = $2, settled_at = $3, updated_at = $3, settlement_result = $4, settlement_pnl = $5, settlement_note = $6 WHERE id = $1`, order.OrderID, newStatus, now, result, pnl, defaultReason("", result)); err != nil {
			return err
		}
		if err := r.appendEventTx(ctx, tx, "prediction-order", order.OrderID, "PredictionOrderSettled", map[string]any{"order_id": order.OrderID, "market_id": marketID, "outcome_id": order.OutcomeID, "winning_outcome_id": winningOutcomeID, "result": result, "settlement_pnl": pnl.String(), "settled_at": now.Format(time.RFC3339)}); err != nil {
			return err
		}
	}
	return nil
}

func (r *PostgresRepository) releaseReservationTx(ctx context.Context, tx pgx.Tx, userID, reservationID string, amount decimal.Decimal, referenceID, referenceType string) error {
	if strings.TrimSpace(reservationID) == "" {
		return nil
	}
	wallet, err := r.getWalletForUpdate(ctx, tx, userID)
	if err != nil {
		return err
	}
	ledger, err := r.getReservationLedgerTx(ctx, tx, wallet.ID)
	if err != nil {
		return err
	}
	reservedAmount, ok := ledger[reservationID]
	if !ok || reservedAmount.LessThan(amount) {
		return fmt.Errorf("reservation not found or insufficient reserved amount")
	}
	return r.appendEventTx(ctx, tx, "wallet", wallet.ID, "WalletFundsReleased", map[string]any{"reservation_id": reservationID, "amount": amount.String(), "reference_id": referenceID, "reference_type": referenceType, "action": "release"})
}

func (r *PostgresRepository) applyWalletTransactionTx(ctx context.Context, tx pgx.Tx, userID, txType string, amount decimal.Decimal, reference string, metadata map[string]any) error {
	wallet, err := r.getWalletForUpdate(ctx, tx, userID)
	if err != nil {
		return err
	}
	before := wallet.Balance
	after := before.Add(amount)
	if after.LessThan(decimal.Zero) {
		return fmt.Errorf("wallet balance cannot go negative")
	}
	meta, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	transactionID := uuid.NewString()
	if _, err := tx.Exec(ctx, `UPDATE wallets SET balance = $2, updated_at = $3 WHERE id = $1`, wallet.ID, after, now); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO wallet_transactions (id, wallet_id, type, amount, balance_before, balance_after, reference, metadata, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, transactionID, wallet.ID, txType, amount, before, after, nullableString(reference), meta, now); err != nil {
		return err
	}
	if err := r.appendEventTx(ctx, tx, "wallet", wallet.ID, "WalletTransactionApplied", map[string]any{"transaction_id": transactionID, "type": txType, "amount": amount.String(), "balance_before": before.String(), "balance_after": after.String(), "reference": reference}); err != nil {
		return err
	}
	return r.appendOutboxTx(ctx, tx, "wallet", wallet.ID, "WalletTransactionApplied", map[string]any{"transaction_id": transactionID, "type": txType, "amount": amount.String(), "reference": reference}, "phoenix.wallet.transactions")
}

func (r *PostgresRepository) getWalletForUpdate(ctx context.Context, tx pgx.Tx, userID string) (*walletRecord, error) {
	wallet := &walletRecord{}
	if err := tx.QueryRow(ctx, `SELECT id, user_id, balance, currency, status FROM wallets WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE`, userID).Scan(&wallet.ID, &wallet.UserID, &wallet.Balance, &wallet.Currency, &wallet.Status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return wallet, nil
}

type walletRecord struct {
	ID       string
	UserID   string
	Balance  decimal.Decimal
	Currency string
	Status   string
}

func (r *PostgresRepository) getReservationLedgerTx(ctx context.Context, tx pgx.Tx, walletID string) (map[string]decimal.Decimal, error) {
	rows, err := tx.Query(ctx, `SELECT event_type, payload FROM event_store WHERE aggregate_type = 'wallet' AND aggregate_id = $1 AND event_type IN ('WalletFundsReserved', 'WalletFundsReleased') ORDER BY version ASC`, walletID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ledger := map[string]decimal.Decimal{}
	for rows.Next() {
		var eventType string
		var payloadBytes []byte
		if err := rows.Scan(&eventType, &payloadBytes); err != nil {
			return nil, err
		}
		var payload map[string]any
		if err := json.Unmarshal(payloadBytes, &payload); err != nil {
			return nil, err
		}
		reservationID, _ := payload["reservation_id"].(string)
		amountStr, _ := payload["amount"].(string)
		amount, err := decimal.NewFromString(amountStr)
		if err != nil {
			return nil, err
		}
		switch eventType {
		case "WalletFundsReserved":
			ledger[reservationID] = ledger[reservationID].Add(amount)
		case "WalletFundsReleased":
			ledger[reservationID] = ledger[reservationID].Sub(amount)
			if !ledger[reservationID].IsPositive() {
				delete(ledger, reservationID)
			}
		}
	}
	return ledger, rows.Err()
}

func ensureUserExists(ctx context.Context, tx pgx.Tx, userID string) error {
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM users WHERE id = $1)`, userID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	return nil
}

func nullableUUIDString(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if _, err := uuid.Parse(value); err != nil {
		return ""
	}
	return value
}

func (r *PostgresRepository) appendEventTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	var version int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(version), 0) + 1 FROM event_store WHERE aggregate_type = $1 AND aggregate_id = $2`, aggregateType, aggregateID).Scan(&version); err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO event_store (aggregate_type, aggregate_id, event_type, version, payload, metadata) VALUES ($1,$2,$3,$4,$5,'{}'::jsonb)`, aggregateType, aggregateID, eventType, version, body)
	return err
}

func (r *PostgresRepository) WriteAuditLog(ctx context.Context, entry AuditLogEntry) error {
	var oldValue any
	var newValue any
	if entry.OldValue != nil {
		payload, err := json.Marshal(entry.OldValue)
		if err != nil {
			return err
		}
		oldValue = payload
	}
	if entry.NewValue != nil {
		payload, err := json.Marshal(entry.NewValue)
		if err != nil {
			return err
		}
		newValue = payload
	}
	_, err := r.pool.Exec(ctx, `
		INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
		VALUES ($1, NULLIF($2,'')::uuid, $3, $4, NULLIF($5,''), $6, $7, NULLIF($8,'')::inet, $9)
	`, uuid.NewString(), strings.TrimSpace(entry.ActorID), entry.Action, entry.EntityType, entry.EntityID, oldValue, newValue, strings.TrimSpace(entry.IPAddress), entry.CreatedAt.UTC())
	return err
}

func (r *PostgresRepository) appendOutboxTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any, topic string) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key) VALUES ($1,$2,$3,$4,$5,$6)`, aggregateType, aggregateID, eventType, body, topic, aggregateID)
	return err
}

func scanPredictionMarket(scanner interface{ Scan(...any) error }) (*models.PredictionMarketView, error) {
	row, err := scanPredictionMarketRow(scanner)
	if err != nil {
		return nil, err
	}
	return &models.PredictionMarketView{
		MarketID:           row.MarketID,
		Slug:               row.Slug,
		Title:              row.Title,
		ShortTitle:         row.ShortTitle,
		CategoryKey:        row.CategoryKey,
		CategoryLabel:      row.CategoryLabel,
		Status:             row.Status,
		Featured:           row.Featured,
		Live:               row.Live,
		ClosesAt:           row.ClosesAt,
		ResolvesAt:         row.ResolvesAt,
		VolumeUSD:          row.VolumeUSD,
		LiquidityUSD:       row.LiquidityUSD,
		Participants:       row.Participants,
		Summary:            row.Summary,
		Insight:            row.Insight,
		Rules:              row.Rules,
		Tags:               row.Tags,
		ResolutionSource:   row.ResolutionSource,
		HeroMetricLabel:    row.HeroMetricLabel,
		HeroMetricValue:    row.HeroMetricValue,
		ProbabilityPercent: row.ProbabilityPercent,
		PriceChangePercent: row.PriceChangePercent,
		WinningOutcomeID:   row.WinningOutcomeID,
		SettlementNote:     row.SettlementNote,
		Outcomes:           []models.PredictionOutcomeView{},
		RelatedMarketIDs:   []string{},
	}, nil
}

func scanPredictionMarketRow(scanner interface{ Scan(...any) error }) (*predictionMarketRow, error) {
	var rulesBytes []byte
	var tagsBytes []byte
	row := &predictionMarketRow{}
	if err := scanner.Scan(&row.MarketID, &row.Slug, &row.Title, &row.ShortTitle, &row.CategoryKey, &row.CategoryLabel, &row.CategoryDescription, &row.Accent, &row.Status, &row.Featured, &row.Live, &row.ClosesAt, &row.ResolvesAt, &row.VolumeUSD, &row.LiquidityUSD, &row.Participants, &row.Summary, &row.Insight, &rulesBytes, &tagsBytes, &row.ResolutionSource, &row.HeroMetricLabel, &row.HeroMetricValue, &row.ProbabilityPercent, &row.PriceChangePercent, &row.WinningOutcomeID, &row.SettlementNote); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	_ = json.Unmarshal(rulesBytes, &row.Rules)
	_ = json.Unmarshal(tagsBytes, &row.Tags)
	return row, nil
}

func calculatePredictionTicket(stake decimal.Decimal, priceCents int) (decimal.Decimal, decimal.Decimal, decimal.Decimal) {
	price := decimal.NewFromInt(int64(priceCents)).Div(decimal.NewFromInt(100))
	shares := stake.Div(price).Round(4)
	maxPayout := shares.Round(2)
	maxProfit := maxPayout.Sub(stake).Round(2)
	return shares, maxPayout, maxProfit
}

func lifecycleActionName(action string) string {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "suspend":
		return "market_suspended"
	case "open":
		return "market_reopened"
	case "cancel":
		return "market_cancelled"
	case "resolve":
		return "market_resolved"
	case "resettle":
		return "market_resettled"
	default:
		return "market_created"
	}
}

func lifecycleEventName(action string) string {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "suspend":
		return "PredictionMarketSuspended"
	case "open":
		return "PredictionMarketReopened"
	case "cancel":
		return "PredictionMarketCancelled"
	case "resolve":
		return "PredictionMarketResolved"
	case "resettle":
		return "PredictionMarketResettled"
	default:
		return "PredictionMarketUpdated"
	}
}

func defaultReason(reason, fallback string) string {
	if strings.TrimSpace(reason) != "" {
		return strings.TrimSpace(reason)
	}
	return strings.TrimSpace(fallback)
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return strings.TrimSpace(value)
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
