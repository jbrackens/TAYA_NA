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

	"github.com/phoenixbot/phoenix-market-engine/internal/models"
)

var (
	ErrNotFound          = errors.New("not found")
	ErrInvalidTransition = errors.New("invalid market status transition")
)

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

type CreateMarketParams struct {
	EventID    string
	ExternalID string
	MarketType string
	Status     string
	Outcomes   []CreateOutcomeParams
}

type UpsertProviderMarketParams struct {
	EventExternalID string
	ExternalID      string
	MarketType      string
	Status          string
	Outcomes        []CreateOutcomeParams
}

type CreateOutcomeParams struct {
	OutcomeID string
	Name      string
	Odds      decimal.Decimal
}

type MarketRepository interface {
	GetEvent(ctx context.Context, eventID string) (*models.MarketEvent, error)
	GetEventByExternalID(ctx context.Context, externalID string) (*models.MarketEvent, error)
	CreateMarket(ctx context.Context, params CreateMarketParams) (*models.Market, error)
	UpsertProviderMarket(ctx context.Context, params UpsertProviderMarketParams) (*models.Market, bool, error)
	GetMarket(ctx context.Context, marketID string) (*models.Market, error)
	ListMarkets(ctx context.Context, filters models.MarketFilters) ([]*models.Market, int, error)
	UpdateOdds(ctx context.Context, marketID string, odds map[string]decimal.Decimal) (*models.Market, map[string]decimal.Decimal, error)
	UpdateStatus(ctx context.Context, marketID, status string, validateTransition func(from, to string) error) (*models.Market, string, error)
	SettleMarket(ctx context.Context, marketID, winningOutcomeID string, settledAt time.Time) (*models.Market, error)
	GetLiquidity(ctx context.Context, marketID string) (*models.LiquidityResponse, error)
	WriteAuditLog(ctx context.Context, entry AuditLogEntry) error
}

type postgresMarketRepository struct {
	pool *pgxpool.Pool
}

func NewMarketRepository(pool *pgxpool.Pool) MarketRepository {
	return &postgresMarketRepository{pool: pool}
}

func (r *postgresMarketRepository) GetEvent(ctx context.Context, eventID string) (*models.MarketEvent, error) {
	return r.getEventRow(ctx, r.pool, eventID)
}

func (r *postgresMarketRepository) GetEventByExternalID(ctx context.Context, externalID string) (*models.MarketEvent, error) {
	return r.getEventByExternalIDRow(ctx, r.pool, externalID)
}

func (r *postgresMarketRepository) CreateMarket(ctx context.Context, params CreateMarketParams) (*models.Market, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	event, err := r.getEventRow(ctx, tx, params.EventID)
	if err != nil {
		return nil, err
	}

	marketID := uuid.NewString()
	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, `
		INSERT INTO markets (id, event_id, external_id, name, type, status, created_at, updated_at)
		VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, $7, $8)
	`, marketID, params.EventID, strings.TrimSpace(params.ExternalID), params.MarketType, params.MarketType, params.Status, now, now); err != nil {
		return nil, err
	}

	for _, outcome := range params.Outcomes {
		outcomeID := outcome.OutcomeID
		if _, err := uuid.Parse(outcomeID); err != nil {
			outcomeID = uuid.NewString()
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO outcomes (id, market_id, name, odds, status, result, created_at)
			VALUES ($1, $2, $3, $4, 'active', 'pending', $5)
		`, outcomeID, marketID, outcome.Name, outcome.Odds, now); err != nil {
			return nil, err
		}
	}

	market, err := r.loadMarket(ctx, tx, marketID)
	if err != nil {
		return nil, err
	}
	market.EventName = event.Name
	market.Sport = event.Sport
	market.League = event.League
	market.ScheduledStart = &event.StartTime

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return market, nil
}

func (r *postgresMarketRepository) UpsertProviderMarket(ctx context.Context, params UpsertProviderMarketParams) (*models.Market, bool, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback(ctx)

	event, err := r.getEventByExternalIDRow(ctx, tx, params.EventExternalID)
	if err != nil {
		return nil, false, err
	}

	var marketID string
	err = tx.QueryRow(ctx, `SELECT id FROM markets WHERE external_id = $1 FOR UPDATE`, params.ExternalID).Scan(&marketID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, false, err
	}

	now := time.Now().UTC()
	if errors.Is(err, pgx.ErrNoRows) {
		marketID = uuid.NewString()
		if _, err := tx.Exec(ctx, `
			INSERT INTO markets (id, event_id, external_id, name, type, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
		`, marketID, event.ID, params.ExternalID, params.MarketType, params.MarketType, params.Status, now); err != nil {
			return nil, false, err
		}
		for _, outcome := range params.Outcomes {
			outcomeID := outcome.OutcomeID
			if _, err := uuid.Parse(outcomeID); err != nil {
				outcomeID = uuid.NewString()
			}
			if _, err := tx.Exec(ctx, `
				INSERT INTO outcomes (id, market_id, name, odds, status, result, created_at)
				VALUES ($1, $2, $3, $4, 'active', 'pending', $5)
			`, outcomeID, marketID, outcome.Name, outcome.Odds, now); err != nil {
				return nil, false, err
			}
		}
		market, err := r.loadMarket(ctx, tx, marketID)
		if err != nil {
			return nil, false, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, false, err
		}
		return market, true, nil
	}

	existing, err := r.loadMarket(ctx, tx, marketID)
	if err != nil {
		return nil, false, err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE markets
		SET event_id = $1, name = $2, type = $3, status = $4, updated_at = $5
		WHERE id = $6
	`, event.ID, params.MarketType, params.MarketType, params.Status, now, marketID); err != nil {
		return nil, false, err
	}

	existingByName := make(map[string]models.MarketOutcome, len(existing.Outcomes))
	for _, outcome := range existing.Outcomes {
		existingByName[normalizeKey(outcome.Name)] = outcome
	}
	for _, outcome := range params.Outcomes {
		if current, ok := existingByName[normalizeKey(outcome.Name)]; ok {
			if _, err := tx.Exec(ctx, `
				UPDATE outcomes SET odds = $1, status = 'active' WHERE id = $2 AND market_id = $3
			`, outcome.Odds, current.OutcomeID, marketID); err != nil {
				return nil, false, err
			}
			continue
		}
		outcomeID := outcome.OutcomeID
		if _, err := uuid.Parse(outcomeID); err != nil {
			outcomeID = uuid.NewString()
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO outcomes (id, market_id, name, odds, status, result, created_at)
			VALUES ($1, $2, $3, $4, 'active', 'pending', $5)
		`, outcomeID, marketID, outcome.Name, outcome.Odds, now); err != nil {
			return nil, false, err
		}
	}

	market, err := r.loadMarket(ctx, tx, marketID)
	if err != nil {
		return nil, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, false, err
	}
	return market, false, nil
}

func (r *postgresMarketRepository) GetMarket(ctx context.Context, marketID string) (*models.Market, error) {
	return r.loadMarket(ctx, r.pool, marketID)
}

func (r *postgresMarketRepository) ListMarkets(ctx context.Context, filters models.MarketFilters) ([]*models.Market, int, error) {
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	conditions := []string{"1=1"}
	args := make([]any, 0, 5)
	argPos := 1
	if strings.TrimSpace(filters.EventID) != "" {
		conditions = append(conditions, fmt.Sprintf("m.event_id = $%d", argPos))
		args = append(args, filters.EventID)
		argPos++
	}
	if strings.TrimSpace(filters.Status) != "" {
		conditions = append(conditions, fmt.Sprintf("m.status = $%d", argPos))
		args = append(args, filters.Status)
		argPos++
	}
	if strings.TrimSpace(filters.MarketType) != "" {
		conditions = append(conditions, fmt.Sprintf("m.type = $%d", argPos))
		args = append(args, filters.MarketType)
		argPos++
	}
	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM markets m WHERE %s`, whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT m.id
		FROM markets m
		JOIN events e ON e.id = m.event_id
		WHERE %s
		ORDER BY e.start_time ASC, m.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argPos, argPos+1)
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	markets := make([]*models.Market, 0, limit)
	for rows.Next() {
		var marketID string
		if err := rows.Scan(&marketID); err != nil {
			return nil, 0, err
		}
		market, err := r.loadMarket(ctx, r.pool, marketID)
		if err != nil {
			return nil, 0, err
		}
		markets = append(markets, market)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return markets, total, nil
}

func (r *postgresMarketRepository) UpdateOdds(ctx context.Context, marketID string, odds map[string]decimal.Decimal) (*models.Market, map[string]decimal.Decimal, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	market, err := r.loadMarket(ctx, tx, marketID)
	if err != nil {
		return nil, nil, err
	}
	previousOdds := make(map[string]decimal.Decimal, len(market.Outcomes))
	for _, outcome := range market.Outcomes {
		previousOdds[outcome.OutcomeID] = outcome.Odds
	}
	for outcomeID, value := range odds {
		commandTag, err := tx.Exec(ctx, `UPDATE outcomes SET odds = $1 WHERE id = $2 AND market_id = $3`, value, outcomeID, marketID)
		if err != nil {
			return nil, nil, err
		}
		if commandTag.RowsAffected() == 0 {
			return nil, nil, ErrNotFound
		}
	}
	if _, err := tx.Exec(ctx, `UPDATE markets SET updated_at = $1 WHERE id = $2`, time.Now().UTC(), marketID); err != nil {
		return nil, nil, err
	}
	updated, err := r.loadMarket(ctx, tx, marketID)
	if err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}
	return updated, previousOdds, nil
}

func (r *postgresMarketRepository) UpdateStatus(ctx context.Context, marketID, status string, validateTransition func(from, to string) error) (*models.Market, string, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, "", err
	}
	defer tx.Rollback(ctx)

	// Lock the market row first to prevent concurrent status changes.
	var previousStatus string
	if err := tx.QueryRow(ctx,
		`SELECT status FROM markets WHERE id = $1 FOR UPDATE`, marketID,
	).Scan(&previousStatus); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", ErrNotFound
		}
		return nil, "", err
	}
	if validateTransition != nil {
		if err := validateTransition(previousStatus, status); err != nil {
			return nil, "", fmt.Errorf("%w: %v", ErrInvalidTransition, err)
		}
	}
	if _, err := tx.Exec(ctx, `UPDATE markets SET status = $1, updated_at = $2 WHERE id = $3`, status, time.Now().UTC(), marketID); err != nil {
		return nil, "", err
	}
	updated, err := r.loadMarket(ctx, tx, marketID)
	if err != nil {
		return nil, "", err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, "", err
	}
	return updated, previousStatus, nil
}

func (r *postgresMarketRepository) SettleMarket(ctx context.Context, marketID, winningOutcomeID string, settledAt time.Time) (*models.Market, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Lock the market row and validate it can be settled.
	var currentStatus string
	if err := tx.QueryRow(ctx,
		`SELECT status FROM markets WHERE id = $1 FOR UPDATE`, marketID,
	).Scan(&currentStatus); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	switch currentStatus {
	case "open", "suspended":
		// allowed — market can be settled from open or suspended
	default:
		return nil, fmt.Errorf("%w: cannot settle market in %q state", ErrInvalidTransition, currentStatus)
	}

	market, err := r.loadMarket(ctx, tx, marketID)
	if err != nil {
		return nil, err
	}
	winningFound := false
	for _, outcome := range market.Outcomes {
		result := "lose"
		if outcome.OutcomeID == winningOutcomeID {
			winningFound = true
			result = "win"
		}
		if _, err := tx.Exec(ctx, `UPDATE outcomes SET result = $1, status = 'settled' WHERE id = $2 AND market_id = $3`, result, outcome.OutcomeID, marketID); err != nil {
			return nil, err
		}
	}
	if !winningFound {
		return nil, ErrNotFound
	}
	if _, err := tx.Exec(ctx, `UPDATE markets SET status = 'settled', updated_at = $1 WHERE id = $2`, settledAt, marketID); err != nil {
		return nil, err
	}
	updated, err := r.loadMarket(ctx, tx, marketID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

func (r *postgresMarketRepository) GetLiquidity(ctx context.Context, marketID string) (*models.LiquidityResponse, error) {
	market, err := r.loadMarket(ctx, r.pool, marketID)
	if err != nil {
		return nil, err
	}
	response := &models.LiquidityResponse{
		MarketID:         marketID,
		TotalMatched:     decimal.Zero,
		MatchedByOutcome: make(map[string]decimal.Decimal, len(market.Outcomes)),
		UnmatchedOrders:  0,
		EffectiveSpread:  decimal.Zero,
	}
	for _, outcome := range market.Outcomes {
		response.MatchedByOutcome[outcome.OutcomeID] = decimal.Zero
	}
	var totalMatched decimal.Decimal
	if err := r.pool.QueryRow(ctx, `SELECT COALESCE(SUM(stake), 0) FROM bets WHERE market_id = $1`, marketID).Scan(&totalMatched); err != nil {
		return nil, err
	}
	response.TotalMatched = totalMatched

	rows, err := r.pool.Query(ctx, `SELECT outcome_id, COALESCE(SUM(stake), 0) FROM bets WHERE market_id = $1 GROUP BY outcome_id`, marketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var outcomeID string
		var amount decimal.Decimal
		if err := rows.Scan(&outcomeID, &amount); err != nil {
			return nil, err
		}
		response.MatchedByOutcome[outcomeID] = amount
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(market.Outcomes) >= 2 {
		minOdds := market.Outcomes[0].Odds
		maxOdds := market.Outcomes[0].Odds
		for _, outcome := range market.Outcomes[1:] {
			if outcome.Odds.LessThan(minOdds) {
				minOdds = outcome.Odds
			}
			if outcome.Odds.GreaterThan(maxOdds) {
				maxOdds = outcome.Odds
			}
		}
		if !maxOdds.IsZero() {
			response.EffectiveSpread = maxOdds.Sub(minOdds).Div(maxOdds).Round(4)
		}
	}
	return response, nil
}

func (r *postgresMarketRepository) WriteAuditLog(ctx context.Context, entry AuditLogEntry) error {
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

func (r *postgresMarketRepository) loadMarket(ctx context.Context, querier queryer, marketID string) (*models.Market, error) {
	const marketQuery = `
		SELECT m.id, COALESCE(m.external_id, ''), m.event_id, e.name, e.sport, e.league, e.start_time, m.type, m.status, m.created_at, m.updated_at
		FROM markets m
		JOIN events e ON e.id = m.event_id
		WHERE m.id = $1
	`
	market := &models.Market{}
	var scheduledStart time.Time
	if err := querier.QueryRow(ctx, marketQuery, marketID).Scan(
		&market.MarketID,
		&market.ExternalID,
		&market.EventID,
		&market.EventName,
		&market.Sport,
		&market.League,
		&scheduledStart,
		&market.MarketType,
		&market.Status,
		&market.CreatedAt,
		&market.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	market.ScheduledStart = &scheduledStart
	market.Outcomes = make([]models.MarketOutcome, 0, 4)
	market.Odds = make(map[string]decimal.Decimal)

	outcomesRows, err := querier.Query(ctx, `SELECT id, name, odds, status, result FROM outcomes WHERE market_id = $1 ORDER BY created_at ASC`, marketID)
	if err != nil {
		return nil, err
	}
	defer outcomesRows.Close()
	for outcomesRows.Next() {
		outcome := models.MarketOutcome{}
		if err := outcomesRows.Scan(&outcome.OutcomeID, &outcome.Name, &outcome.Odds, &outcome.Status, &outcome.Result); err != nil {
			return nil, err
		}
		market.Outcomes = append(market.Outcomes, outcome)
		market.Odds[outcome.OutcomeID] = outcome.Odds
	}
	if err := outcomesRows.Err(); err != nil {
		return nil, err
	}

	if err := querier.QueryRow(ctx, `SELECT COALESCE(SUM(stake), 0) FROM bets WHERE market_id = $1`, marketID).Scan(&market.TotalMatched); err != nil {
		return nil, err
	}
	return market, nil
}

func (r *postgresMarketRepository) getEventRow(ctx context.Context, querier queryRower, eventID string) (*models.MarketEvent, error) {
	const query = `SELECT id, name, sport, COALESCE(league, ''), start_time, status, COALESCE(external_id, ''), metadata FROM events WHERE id = $1`
	event := &models.MarketEvent{}
	var metadataBytes []byte
	if err := querier.QueryRow(ctx, query, eventID).Scan(
		&event.ID,
		&event.Name,
		&event.Sport,
		&event.League,
		&event.StartTime,
		&event.Status,
		&event.ExternalID,
		&metadataBytes,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if len(metadataBytes) > 0 {
		_ = json.Unmarshal(metadataBytes, &event.Metadata)
	}
	return event, nil
}

func (r *postgresMarketRepository) getEventByExternalIDRow(ctx context.Context, querier queryRower, externalID string) (*models.MarketEvent, error) {
	const query = `SELECT id, name, sport, COALESCE(league, ''), start_time, status, COALESCE(external_id, ''), metadata FROM events WHERE external_id = $1`
	event := &models.MarketEvent{}
	var metadataBytes []byte
	if err := querier.QueryRow(ctx, query, externalID).Scan(
		&event.ID,
		&event.Name,
		&event.Sport,
		&event.League,
		&event.StartTime,
		&event.Status,
		&event.ExternalID,
		&metadataBytes,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if len(metadataBytes) > 0 {
		_ = json.Unmarshal(metadataBytes, &event.Metadata)
	}
	return event, nil
}

type queryRower interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type queryer interface {
	queryRower
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func normalizeKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}
