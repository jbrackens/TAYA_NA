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

	"github.com/phoenixbot/phoenix-betting-engine/internal/models"
)

var ErrNotFound = errors.New("not found")

type CreateBetParams struct {
	UserID          string
	MarketID        string
	OutcomeID       string
	FreebetID       *string
	FreebetApplied  int64
	OddsBoostID     *string
	Stake           decimal.Decimal
	Odds            decimal.Decimal
	PotentialPayout decimal.Decimal
	ReservationID   string
}

type CreateParlayParams struct {
	UserID          string
	FreebetID       *string
	FreebetApplied  int64
	OddsBoostID     *string
	Stake           decimal.Decimal
	TotalOdds       decimal.Decimal
	PotentialPayout decimal.Decimal
	ReservationID   string
	Legs            []CreateParlayLegParams
}

type CreateParlayLegParams struct {
	MarketID  string
	OutcomeID string
	Odds      decimal.Decimal
}

type CreateAdvancedQuoteParams struct {
	QuoteID              string
	QuoteType            string
	UserID               string
	RequestID            string
	ComboType            *string
	ExoticType           *string
	StakeCents           *int64
	CombinedOdds         *decimal.Decimal
	ImpliedProbability   *decimal.Decimal
	PotentialPayoutCents *int64
	EncodedTicket        *string
	Combinable           bool
	ReasonCode           *string
	Status               string
	ExpiresAt            *time.Time
	LastReason           *string
	Legs                 []CreateAdvancedQuoteLegParams
}

type CreateAdvancedQuoteLegParams struct {
	Position      *int
	MarketID      string
	OutcomeID     string
	FixtureID     string
	RequestedOdds *decimal.Decimal
	CurrentOdds   decimal.Decimal
}

type AcceptAdvancedQuoteAsParlayParams struct {
	QuoteID              string
	UserID               string
	AcceptRequestID      string
	AcceptIdempotencyKey *string
	Reason               *string
	Stake                decimal.Decimal
	TotalOdds            decimal.Decimal
	PotentialPayout      decimal.Decimal
	ReservationID        string
	Legs                 []CreateParlayLegParams
}

type CancelBetParams struct {
	BetID              string
	CancellationReason string
	CancelledAt        time.Time
	ActorID            string
	ActorRole          string
}

type SettleBetParams struct {
	BetID                string
	Result               string
	Reason               string
	WinningSelectionID   string
	WinningSelectionName string
	ResultSource         string
	SettledAt            time.Time
	ActorID              string
	ActorRole            string
}

type RefundBetParams struct {
	BetID      string
	Reason     string
	RefundedAt time.Time
	ActorID    string
	ActorRole  string
}

type BettingRepository interface {
	CreateSingleBet(ctx context.Context, params CreateBetParams) (*models.Bet, error)
	CreateParlayBet(ctx context.Context, params CreateParlayParams) (*models.Bet, error)
	CreateAdvancedQuote(ctx context.Context, params CreateAdvancedQuoteParams) (*models.AdvancedQuote, error)
	GetAdvancedQuote(ctx context.Context, quoteID string) (*models.AdvancedQuote, error)
	AcceptAdvancedQuoteAsParlay(ctx context.Context, params AcceptAdvancedQuoteAsParlayParams) (*models.Bet, *models.AdvancedQuote, error)
	GetBet(ctx context.Context, betID string) (*models.Bet, error)
	ListBets(ctx context.Context, filters models.BetFilters) ([]*models.Bet, int, error)
	ListUserBets(ctx context.Context, userID string, filters models.BetFilters) ([]*models.Bet, int, error)
	GetBetLegContext(ctx context.Context, marketID, outcomeID string) (*models.BetLegContext, error)
	CancelBet(ctx context.Context, params CancelBetParams) (*models.Bet, error)
	SettleBet(ctx context.Context, params SettleBetParams) (*models.Bet, error)
	RefundBet(ctx context.Context, params RefundBetParams) (*models.Bet, error)
	MarkCashedOut(ctx context.Context, betID string, cashoutAmount decimal.Decimal, cashedOutAt time.Time) (*models.Bet, error)
	GetReservationID(ctx context.Context, betID string) (string, error)
	UpdateReservationID(ctx context.Context, betID, reservationID, reason string, updatedAt time.Time) error
}

type postgresBettingRepository struct {
	pool *pgxpool.Pool
}

func NewBettingRepository(pool *pgxpool.Pool) BettingRepository {
	return &postgresBettingRepository{pool: pool}
}

func (r *postgresBettingRepository) CreateSingleBet(ctx context.Context, params CreateBetParams) (*models.Bet, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	betID := uuid.NewString()
	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, `
		INSERT INTO bets (id, user_id, market_id, outcome_id, freebet_id, freebet_applied_cents, odds_boost_id, stake, odds_at_placement, potential_payout, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $11)
	`, betID, params.UserID, params.MarketID, params.OutcomeID, nullableTrimmedString(params.FreebetID), params.FreebetApplied, nullableTrimmedString(params.OddsBoostID), params.Stake, params.Odds, params.PotentialPayout, now); err != nil {
		return nil, err
	}
	payload := map[string]any{
		"bet_id":           betID,
		"reservation_id":   params.ReservationID,
		"user_id":          params.UserID,
		"market_id":        params.MarketID,
		"outcome_id":       params.OutcomeID,
		"stake":            params.Stake.String(),
		"odds":             params.Odds.String(),
		"potential_payout": params.PotentialPayout.String(),
		"bet_type":         "single",
		"status":           "matched",
		"placed_at":        now.Format(time.RFC3339),
	}
	if freebetID := stringPointerValue(params.FreebetID); freebetID != "" {
		payload["freebet_id"] = freebetID
		payload["freebet_applied_cents"] = params.FreebetApplied
	}
	if oddsBoostID := stringPointerValue(params.OddsBoostID); oddsBoostID != "" {
		payload["odds_boost_id"] = oddsBoostID
	}
	if err := r.appendBetEventTx(ctx, tx, betID, "BetPlaced", payload, map[string]any{"user_id": params.UserID, "bet_type": "single"}, "phoenix.bet.placed"); err != nil {
		return nil, err
	}
	bet, err := r.loadBet(ctx, tx, betID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return bet, nil
}

func (r *postgresBettingRepository) CreateParlayBet(ctx context.Context, params CreateParlayParams) (*models.Bet, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	betID := uuid.NewString()
	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, `
		INSERT INTO bets (id, user_id, market_id, outcome_id, freebet_id, freebet_applied_cents, odds_boost_id, stake, odds_at_placement, potential_payout, status, created_at, updated_at)
		VALUES ($1, $2, NULL, NULL, $3, $4, $5, $6, $7, $8, 'pending', $9, $9)
	`, betID, params.UserID, nullableTrimmedString(params.FreebetID), params.FreebetApplied, nullableTrimmedString(params.OddsBoostID), params.Stake, params.TotalOdds, params.PotentialPayout, now); err != nil {
		return nil, err
	}
	for _, leg := range params.Legs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO bet_legs (id, bet_id, market_id, outcome_id, odds, status, created_at)
			VALUES ($1, $2, $3, $4, $5, 'pending', $6)
		`, uuid.NewString(), betID, leg.MarketID, leg.OutcomeID, leg.Odds, now); err != nil {
			return nil, err
		}
	}
	payload := map[string]any{
		"bet_id":           betID,
		"parlay_id":        betID,
		"reservation_id":   params.ReservationID,
		"user_id":          params.UserID,
		"stake":            params.Stake.String(),
		"odds":             params.TotalOdds.String(),
		"potential_payout": params.PotentialPayout.String(),
		"bet_type":         "parlay",
		"status":           "matched",
		"placed_at":        now.Format(time.RFC3339),
		"legs":             params.Legs,
	}
	if freebetID := stringPointerValue(params.FreebetID); freebetID != "" {
		payload["freebet_id"] = freebetID
		payload["freebet_applied_cents"] = params.FreebetApplied
	}
	if oddsBoostID := stringPointerValue(params.OddsBoostID); oddsBoostID != "" {
		payload["odds_boost_id"] = oddsBoostID
	}
	if err := r.appendBetEventTx(ctx, tx, betID, "BetPlaced", payload, map[string]any{"user_id": params.UserID, "bet_type": "parlay"}, "phoenix.bet.placed"); err != nil {
		return nil, err
	}
	bet, err := r.loadBet(ctx, tx, betID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return bet, nil
}

func (r *postgresBettingRepository) CreateAdvancedQuote(ctx context.Context, params CreateAdvancedQuoteParams) (*models.AdvancedQuote, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	now := time.Now().UTC()
	status := params.Status
	if strings.TrimSpace(status) == "" {
		status = "open"
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO advanced_bet_quotes (
			id, quote_type, user_id, request_id, combo_type, exotic_type, stake_cents,
			combined_odds, implied_probability, potential_payout_cents, encoded_ticket,
			combinable, reason_code, status, expires_at, last_reason, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11,
			$12, $13, $14, $15, $16, $17, $17
		)
	`,
		params.QuoteID,
		params.QuoteType,
		params.UserID,
		params.RequestID,
		params.ComboType,
		params.ExoticType,
		params.StakeCents,
		nullableDecimalParam(params.CombinedOdds),
		nullableDecimalParam(params.ImpliedProbability),
		params.PotentialPayoutCents,
		params.EncodedTicket,
		params.Combinable,
		params.ReasonCode,
		status,
		params.ExpiresAt,
		params.LastReason,
		now,
	); err != nil {
		return nil, err
	}
	for _, leg := range params.Legs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO advanced_bet_quote_legs (
				quote_id, position, market_id, outcome_id, fixture_id, requested_odds, current_odds
			) VALUES ($1, $2, $3, $4, $5, $6, $7)
		`,
			params.QuoteID,
			leg.Position,
			leg.MarketID,
			leg.OutcomeID,
			leg.FixtureID,
			nullableDecimalParam(leg.RequestedOdds),
			leg.CurrentOdds,
		); err != nil {
			return nil, err
		}
	}
	quote, err := r.loadAdvancedQuote(ctx, tx, params.QuoteID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return quote, nil
}

func (r *postgresBettingRepository) GetAdvancedQuote(ctx context.Context, quoteID string) (*models.AdvancedQuote, error) {
	return r.loadAdvancedQuote(ctx, r.pool, quoteID)
}

func (r *postgresBettingRepository) AcceptAdvancedQuoteAsParlay(ctx context.Context, params AcceptAdvancedQuoteAsParlayParams) (*models.Bet, *models.AdvancedQuote, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	quote, err := r.loadAdvancedQuoteForUpdate(ctx, tx, params.QuoteID)
	if err != nil {
		return nil, nil, err
	}
	if quote.UserID != params.UserID {
		return nil, nil, ErrNotFound
	}
	if quote.Status == "accepted" && quote.AcceptedBetID != nil {
		bet, err := r.loadBet(ctx, tx, *quote.AcceptedBetID)
		if err != nil {
			return nil, nil, err
		}
		return bet, quote, nil
	}
	if quote.Status != "open" {
		return nil, nil, fmt.Errorf("quote is not open")
	}

	betID := uuid.NewString()
	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, `
		INSERT INTO bets (id, user_id, market_id, outcome_id, stake, odds_at_placement, potential_payout, status, created_at, updated_at)
		VALUES ($1, $2, NULL, NULL, $3, $4, $5, 'pending', $6, $6)
	`, betID, params.UserID, params.Stake, params.TotalOdds, params.PotentialPayout, now); err != nil {
		return nil, nil, err
	}
	for _, leg := range params.Legs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO bet_legs (id, bet_id, market_id, outcome_id, odds, status, created_at)
			VALUES ($1, $2, $3, $4, $5, 'pending', $6)
		`, uuid.NewString(), betID, leg.MarketID, leg.OutcomeID, leg.Odds, now); err != nil {
			return nil, nil, err
		}
	}
	payload := map[string]any{
		"bet_id":           betID,
		"parlay_id":        betID,
		"reservation_id":   params.ReservationID,
		"user_id":          params.UserID,
		"stake":            params.Stake.String(),
		"odds":             params.TotalOdds.String(),
		"potential_payout": params.PotentialPayout.String(),
		"bet_type":         "parlay",
		"status":           "matched",
		"placed_at":        now.Format(time.RFC3339),
		"legs":             params.Legs,
		"quote_id":         params.QuoteID,
	}
	if err := r.appendBetEventTx(ctx, tx, betID, "BetPlaced", payload, map[string]any{"user_id": params.UserID, "bet_type": "parlay", "quote_id": params.QuoteID}, "phoenix.bet.placed"); err != nil {
		return nil, nil, err
	}
	reason := nullableTrimmedString(params.Reason)
	if reason == nil {
		reason = quote.LastReason
	}
	if _, err := tx.Exec(ctx, `
		UPDATE advanced_bet_quotes
		SET status = 'accepted',
			accepted_at = $2,
			accepted_bet_id = $3,
			accept_request_id = $4,
			accept_idempotency_key = $5,
			last_reason = $6,
			updated_at = $2
		WHERE id = $1
	`, params.QuoteID, now, betID, params.AcceptRequestID, params.AcceptIdempotencyKey, reason); err != nil {
		return nil, nil, err
	}
	bet, err := r.loadBet(ctx, tx, betID)
	if err != nil {
		return nil, nil, err
	}
	updatedQuote, err := r.loadAdvancedQuote(ctx, tx, params.QuoteID)
	if err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}
	return bet, updatedQuote, nil
}

func (r *postgresBettingRepository) GetBet(ctx context.Context, betID string) (*models.Bet, error) {
	return r.loadBet(ctx, r.pool, betID)
}

func (r *postgresBettingRepository) ListUserBets(ctx context.Context, userID string, filters models.BetFilters) ([]*models.Bet, int, error) {
	filters.UserID = userID
	return r.listBets(ctx, filters)
}

func (r *postgresBettingRepository) ListBets(ctx context.Context, filters models.BetFilters) ([]*models.Bet, int, error) {
	return r.listBets(ctx, filters)
}

func (r *postgresBettingRepository) GetBetLegContext(ctx context.Context, marketID, outcomeID string) (*models.BetLegContext, error) {
	const query = `
		SELECT
			m.id,
			m.name,
			COALESCE(o.id::text, ''),
			COALESCE(o.name, ''),
			e.id,
			e.name,
			e.sport,
			COALESCE(e.league, ''),
			e.start_time
		FROM markets m
		JOIN events e ON e.id = m.event_id
		LEFT JOIN outcomes o ON o.market_id = m.id AND o.id = $2
		WHERE m.id = $1
	`
	contextRow := &models.BetLegContext{}
	if err := r.pool.QueryRow(ctx, query, marketID, outcomeID).Scan(
		&contextRow.MarketID,
		&contextRow.MarketName,
		&contextRow.OutcomeID,
		&contextRow.OutcomeName,
		&contextRow.EventID,
		&contextRow.EventName,
		&contextRow.SportName,
		&contextRow.LeagueName,
		&contextRow.EventStartAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return contextRow, nil
}

func (r *postgresBettingRepository) listBets(ctx context.Context, filters models.BetFilters) ([]*models.Bet, int, error) {
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	conditions := []string{"1=1"}
	args := make([]any, 0, 5)
	argPos := 1
	if strings.TrimSpace(filters.UserID) != "" {
		conditions = append(conditions, fmt.Sprintf("user_id = $%d", argPos))
		args = append(args, filters.UserID)
		argPos++
	}
	if status := normalizeStoredStatus(filters.Status); status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argPos))
		args = append(args, status)
		argPos++
	}
	if filters.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argPos))
		args = append(args, *filters.StartDate)
		argPos++
	}
	if filters.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argPos))
		args = append(args, *filters.EndDate)
		argPos++
	}
	whereClause := strings.Join(conditions, " AND ")
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM bets WHERE %s`, whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	query := fmt.Sprintf(`SELECT id FROM bets WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, whereClause, argPos, argPos+1)
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	bets := make([]*models.Bet, 0, limit)
	for rows.Next() {
		var betID string
		if err := rows.Scan(&betID); err != nil {
			return nil, 0, err
		}
		bet, err := r.loadBet(ctx, r.pool, betID)
		if err != nil {
			return nil, 0, err
		}
		bets = append(bets, bet)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return bets, total, nil
}

func (r *postgresBettingRepository) CancelBet(ctx context.Context, params CancelBetParams) (*models.Bet, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	bet, err := r.loadBetForUpdate(ctx, tx, params.BetID)
	if err != nil {
		return nil, err
	}
	if bet.Status != "pending" && bet.Status != "matched" {
		return nil, fmt.Errorf("bet is not eligible for cancellation")
	}
	if _, err := tx.Exec(ctx, `UPDATE bets SET status = 'cancelled', settled_at = $1, updated_at = $1 WHERE id = $2`, params.CancelledAt, params.BetID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE bet_legs SET status = 'cancelled' WHERE bet_id = $1 AND status = 'pending'`, params.BetID); err != nil {
		return nil, err
	}
	payload := map[string]any{
		"bet_id":         params.BetID,
		"user_id":        bet.UserID,
		"market_id":      stringPointerValue(bet.MarketID),
		"cancelled_at":   params.CancelledAt.Format(time.RFC3339),
		"reason":         strings.TrimSpace(params.CancellationReason),
		"cancelled_by":   strings.TrimSpace(params.ActorID),
		"cancelled_role": strings.TrimSpace(params.ActorRole),
	}
	if bet.ParlayID != nil {
		payload["parlay_id"] = *bet.ParlayID
	}
	metadata := map[string]any{
		"user_id":        bet.UserID,
		"reason":         strings.TrimSpace(params.CancellationReason),
		"cancelled_by":   strings.TrimSpace(params.ActorID),
		"cancelled_role": strings.TrimSpace(params.ActorRole),
	}
	if err := r.appendBetEventTx(ctx, tx, params.BetID, "BetCancelled", payload, metadata, "phoenix.bet.cancelled"); err != nil {
		return nil, err
	}
	updated, err := r.loadBet(ctx, tx, params.BetID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

func (r *postgresBettingRepository) MarkCashedOut(ctx context.Context, betID string, cashoutAmount decimal.Decimal, cashedOutAt time.Time) (*models.Bet, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	bet, err := r.loadBetForUpdate(ctx, tx, betID)
	if err != nil {
		return nil, err
	}
	if bet.Status != "pending" {
		return nil, fmt.Errorf("bet is not eligible for cashout")
	}
	if _, err := tx.Exec(ctx, `UPDATE bets SET status = 'cashed_out', settled_at = $1, updated_at = $1 WHERE id = $2`, cashedOutAt, betID); err != nil {
		return nil, err
	}
	payload := map[string]any{
		"bet_id":         betID,
		"user_id":        bet.UserID,
		"original_stake": bet.Stake.String(),
		"original_odds":  bet.Odds.String(),
		"cashout_price":  cashoutAmount.String(),
		"profit":         cashoutAmount.Sub(bet.Stake).String(),
		"market_id":      stringPointerValue(bet.MarketID),
		"cashed_out_at":  cashedOutAt.Format(time.RFC3339),
		"reason":         "user_requested",
	}
	if err := r.appendBetEventTx(ctx, tx, betID, "BetCashedOut", payload, map[string]any{"user_id": bet.UserID, "bet_type": bet.BetType}, "phoenix.bet.cashed-out"); err != nil {
		return nil, err
	}
	updated, err := r.loadBet(ctx, tx, betID)
	if err != nil {
		return nil, err
	}
	cashout := cashoutAmount
	updated.CashoutAmount = &cashout
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

func (r *postgresBettingRepository) SettleBet(ctx context.Context, params SettleBetParams) (*models.Bet, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	bet, err := r.loadBetForUpdate(ctx, tx, params.BetID)
	if err != nil {
		return nil, err
	}
	result := normalizeSettledResult(params.Result)
	if result == "" {
		return nil, fmt.Errorf("invalid settlement result")
	}
	if bet.Status != "pending" && bet.Status != "matched" {
		return nil, fmt.Errorf("bet is not eligible for settlement")
	}
	if _, err := tx.Exec(ctx, `UPDATE bets SET status = $1, settled_at = $2, updated_at = $2 WHERE id = $3`, result, params.SettledAt, params.BetID); err != nil {
		return nil, err
	}
	if len(bet.Legs) > 0 {
		if _, err := tx.Exec(ctx, `UPDATE bet_legs SET status = $2 WHERE bet_id = $1 AND status = 'pending'`, params.BetID, result); err != nil {
			return nil, err
		}
	}
	payload := map[string]any{
		"bet_id":                 params.BetID,
		"user_id":                bet.UserID,
		"market_id":              stringPointerValue(bet.MarketID),
		"result":                 result,
		"reason":                 strings.TrimSpace(params.Reason),
		"settled_at":             params.SettledAt.Format(time.RFC3339),
		"settled_by":             strings.TrimSpace(params.ActorID),
		"settled_role":           strings.TrimSpace(params.ActorRole),
		"winning_selection_id":   strings.TrimSpace(params.WinningSelectionID),
		"winning_selection_name": strings.TrimSpace(params.WinningSelectionName),
		"result_source":          strings.TrimSpace(params.ResultSource),
	}
	if bet.ParlayID != nil {
		payload["parlay_id"] = *bet.ParlayID
	}
	metadata := map[string]any{
		"user_id":       bet.UserID,
		"result":        result,
		"reason":        strings.TrimSpace(params.Reason),
		"settled_by":    strings.TrimSpace(params.ActorID),
		"settled_role":  strings.TrimSpace(params.ActorRole),
		"result_source": strings.TrimSpace(params.ResultSource),
	}
	if err := r.appendBetEventTx(ctx, tx, params.BetID, "BetSettled", payload, metadata, "phoenix.bet.settled"); err != nil {
		return nil, err
	}
	updated, err := r.loadBet(ctx, tx, params.BetID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

func (r *postgresBettingRepository) RefundBet(ctx context.Context, params RefundBetParams) (*models.Bet, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	bet, err := r.loadBetForUpdate(ctx, tx, params.BetID)
	if err != nil {
		return nil, err
	}
	if bet.Status != "pending" && bet.Status != "matched" {
		return nil, fmt.Errorf("bet is not eligible for refund")
	}
	if _, err := tx.Exec(ctx, `UPDATE bets SET status = 'voided', settled_at = $1, updated_at = $1 WHERE id = $2`, params.RefundedAt, params.BetID); err != nil {
		return nil, err
	}
	if len(bet.Legs) > 0 {
		if _, err := tx.Exec(ctx, `UPDATE bet_legs SET status = 'voided' WHERE bet_id = $1 AND status = 'pending'`, params.BetID); err != nil {
			return nil, err
		}
	}
	payload := map[string]any{
		"bet_id":        params.BetID,
		"user_id":       bet.UserID,
		"market_id":     stringPointerValue(bet.MarketID),
		"reason":        strings.TrimSpace(params.Reason),
		"refunded_at":   params.RefundedAt.Format(time.RFC3339),
		"refunded_by":   strings.TrimSpace(params.ActorID),
		"refunded_role": strings.TrimSpace(params.ActorRole),
	}
	if bet.ParlayID != nil {
		payload["parlay_id"] = *bet.ParlayID
	}
	metadata := map[string]any{
		"user_id":       bet.UserID,
		"reason":        strings.TrimSpace(params.Reason),
		"refunded_by":   strings.TrimSpace(params.ActorID),
		"refunded_role": strings.TrimSpace(params.ActorRole),
	}
	if err := r.appendBetEventTx(ctx, tx, params.BetID, "BetRefunded", payload, metadata, "phoenix.bet.refunded"); err != nil {
		return nil, err
	}
	updated, err := r.loadBet(ctx, tx, params.BetID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

func (r *postgresBettingRepository) GetReservationID(ctx context.Context, betID string) (string, error) {
	var reservationID string
	if err := r.pool.QueryRow(ctx, latestReservationIDQuery, betID).Scan(&reservationID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	if strings.TrimSpace(reservationID) == "" {
		return "", ErrNotFound
	}
	return reservationID, nil
}

func (r *postgresBettingRepository) UpdateReservationID(ctx context.Context, betID, reservationID, reason string, updatedAt time.Time) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	bet, err := r.loadBetForUpdate(ctx, tx, betID)
	if err != nil {
		return err
	}

	payload := map[string]any{
		"bet_id":         betID,
		"user_id":        bet.UserID,
		"reservation_id": reservationID,
		"reason":         reason,
		"updated_at":     updatedAt.Format(time.RFC3339),
	}
	metadata := map[string]any{
		"user_id": bet.UserID,
		"reason":  reason,
	}
	if err := r.appendBetEventTx(ctx, tx, betID, "BetReservationUpdated", payload, metadata, "phoenix.bet.updated"); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *postgresBettingRepository) loadBet(ctx context.Context, querier queryer, betID string) (*models.Bet, error) {
	const query = `
		SELECT id, user_id, market_id, outcome_id, freebet_id, freebet_applied_cents, odds_boost_id, stake, odds_at_placement, potential_payout, status, created_at, settled_at
		FROM bets
		WHERE id = $1
	`
	bet := &models.Bet{}
	var marketID *string
	var outcomeID *string
	var freebetID *string
	var oddsBoostID *string
	var settledAt *time.Time
	if err := querier.QueryRow(ctx, query, betID).Scan(&bet.BetID, &bet.UserID, &marketID, &outcomeID, &freebetID, &bet.FreebetApplied, &oddsBoostID, &bet.Stake, &bet.Odds, &bet.PotentialPayout, &bet.Status, &bet.PlacedAt, &settledAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	bet.MarketID = marketID
	bet.OutcomeID = outcomeID
	bet.FreebetID = freebetID
	bet.OddsBoostID = oddsBoostID
	bet.SettledAt = settledAt
	bet.BetType = "single"
	if bet.Status == "won" || bet.Status == "lost" || bet.Status == "voided" || bet.Status == "cashed_out" {
		result := bet.Status
		bet.Result = &result
	}
	legsRows, err := querier.Query(ctx, `SELECT id, market_id, outcome_id, odds, status FROM bet_legs WHERE bet_id = $1 ORDER BY created_at ASC`, betID)
	if err != nil {
		return nil, err
	}
	defer legsRows.Close()
	for legsRows.Next() {
		leg := models.BetLeg{}
		if err := legsRows.Scan(&leg.LegID, &leg.MarketID, &leg.OutcomeID, &leg.Odds, &leg.Status); err != nil {
			return nil, err
		}
		bet.Legs = append(bet.Legs, leg)
	}
	if err := legsRows.Err(); err != nil {
		return nil, err
	}
	if len(bet.Legs) > 0 {
		bet.BetType = "parlay"
		parlayID := bet.BetID
		bet.ParlayID = &parlayID
	}
	if reservationID, err := r.getReservationIDWithQuerier(ctx, querier, betID); err == nil {
		bet.ReservationID = reservationID
	}
	return bet, nil
}

func (r *postgresBettingRepository) loadBetForUpdate(ctx context.Context, tx pgx.Tx, betID string) (*models.Bet, error) {
	const query = `
		SELECT id, user_id, market_id, outcome_id, freebet_id, freebet_applied_cents, odds_boost_id, stake, odds_at_placement, potential_payout, status, created_at, settled_at
		FROM bets
		WHERE id = $1
		FOR UPDATE
	`
	bet := &models.Bet{}
	var marketID *string
	var outcomeID *string
	var freebetID *string
	var oddsBoostID *string
	var settledAt *time.Time
	if err := tx.QueryRow(ctx, query, betID).Scan(&bet.BetID, &bet.UserID, &marketID, &outcomeID, &freebetID, &bet.FreebetApplied, &oddsBoostID, &bet.Stake, &bet.Odds, &bet.PotentialPayout, &bet.Status, &bet.PlacedAt, &settledAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	bet.MarketID = marketID
	bet.OutcomeID = outcomeID
	bet.FreebetID = freebetID
	bet.OddsBoostID = oddsBoostID
	bet.SettledAt = settledAt
	bet.BetType = "single"
	return bet, nil
}

func (r *postgresBettingRepository) loadAdvancedQuote(ctx context.Context, querier queryer, quoteID string) (*models.AdvancedQuote, error) {
	const query = `
		SELECT
			id,
			quote_type,
			user_id::text,
			request_id,
			combo_type,
			exotic_type,
			combinable,
			reason_code,
			combined_odds::text,
			implied_probability::text,
			stake_cents,
			potential_payout_cents,
			encoded_ticket,
			expires_at,
			status,
			created_at,
			updated_at,
			accepted_at,
			accepted_bet_id::text,
			accept_request_id,
			accept_idempotency_key,
			last_reason
		FROM advanced_bet_quotes
		WHERE id = $1
	`
	quote := &models.AdvancedQuote{}
	var combinedOddsText *string
	var impliedProbabilityText *string
	if err := querier.QueryRow(ctx, query, quoteID).Scan(
		&quote.QuoteID,
		&quote.QuoteType,
		&quote.UserID,
		&quote.RequestID,
		&quote.ComboType,
		&quote.ExoticType,
		&quote.Combinable,
		&quote.ReasonCode,
		&combinedOddsText,
		&impliedProbabilityText,
		&quote.StakeCents,
		&quote.PotentialPayoutCents,
		&quote.EncodedTicket,
		&quote.ExpiresAt,
		&quote.Status,
		&quote.CreatedAt,
		&quote.UpdatedAt,
		&quote.AcceptedAt,
		&quote.AcceptedBetID,
		&quote.AcceptRequestID,
		&quote.AcceptIdempotencyKey,
		&quote.LastReason,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	quote.CombinedOdds = parseOptionalDecimal(combinedOddsText)
	quote.ImpliedProbability = parseOptionalDecimal(impliedProbabilityText)
	rows, err := querier.Query(ctx, `
		SELECT position, market_id::text, outcome_id::text, fixture_id::text, requested_odds::text, current_odds::text
		FROM advanced_bet_quote_legs
		WHERE quote_id = $1
		ORDER BY position NULLS LAST, created_at ASC
	`, quoteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var leg models.AdvancedQuoteLeg
		var requestedOddsText *string
		var currentOddsText string
		if err := rows.Scan(
			&leg.Position,
			&leg.MarketID,
			&leg.SelectionID,
			&leg.FixtureID,
			&requestedOddsText,
			&currentOddsText,
		); err != nil {
			return nil, err
		}
		leg.RequestedOdds = parseOptionalDecimal(requestedOddsText)
		currentOdds, err := decimal.NewFromString(currentOddsText)
		if err != nil {
			return nil, err
		}
		leg.CurrentOdds = currentOdds
		quote.Legs = append(quote.Legs, leg)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return quote, nil
}

func (r *postgresBettingRepository) loadAdvancedQuoteForUpdate(ctx context.Context, tx pgx.Tx, quoteID string) (*models.AdvancedQuote, error) {
	const query = `
		SELECT
			id,
			quote_type,
			user_id::text,
			request_id,
			combo_type,
			exotic_type,
			combinable,
			reason_code,
			combined_odds::text,
			implied_probability::text,
			stake_cents,
			potential_payout_cents,
			encoded_ticket,
			expires_at,
			status,
			created_at,
			updated_at,
			accepted_at,
			accepted_bet_id::text,
			accept_request_id,
			accept_idempotency_key,
			last_reason
		FROM advanced_bet_quotes
		WHERE id = $1
		FOR UPDATE
	`
	quote := &models.AdvancedQuote{}
	var combinedOddsText *string
	var impliedProbabilityText *string
	if err := tx.QueryRow(ctx, query, quoteID).Scan(
		&quote.QuoteID,
		&quote.QuoteType,
		&quote.UserID,
		&quote.RequestID,
		&quote.ComboType,
		&quote.ExoticType,
		&quote.Combinable,
		&quote.ReasonCode,
		&combinedOddsText,
		&impliedProbabilityText,
		&quote.StakeCents,
		&quote.PotentialPayoutCents,
		&quote.EncodedTicket,
		&quote.ExpiresAt,
		&quote.Status,
		&quote.CreatedAt,
		&quote.UpdatedAt,
		&quote.AcceptedAt,
		&quote.AcceptedBetID,
		&quote.AcceptRequestID,
		&quote.AcceptIdempotencyKey,
		&quote.LastReason,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	quote.CombinedOdds = parseOptionalDecimal(combinedOddsText)
	quote.ImpliedProbability = parseOptionalDecimal(impliedProbabilityText)
	rows, err := tx.Query(ctx, `
		SELECT position, market_id::text, outcome_id::text, fixture_id::text, requested_odds::text, current_odds::text
		FROM advanced_bet_quote_legs
		WHERE quote_id = $1
		ORDER BY position NULLS LAST, created_at ASC
	`, quoteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var leg models.AdvancedQuoteLeg
		var requestedOddsText *string
		var currentOddsText string
		if err := rows.Scan(
			&leg.Position,
			&leg.MarketID,
			&leg.SelectionID,
			&leg.FixtureID,
			&requestedOddsText,
			&currentOddsText,
		); err != nil {
			return nil, err
		}
		leg.RequestedOdds = parseOptionalDecimal(requestedOddsText)
		currentOdds, err := decimal.NewFromString(currentOddsText)
		if err != nil {
			return nil, err
		}
		leg.CurrentOdds = currentOdds
		quote.Legs = append(quote.Legs, leg)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return quote, nil
}

func (r *postgresBettingRepository) getReservationIDWithQuerier(ctx context.Context, querier queryRower, betID string) (string, error) {
	var reservationID string
	if err := querier.QueryRow(ctx, latestReservationIDQuery, betID).Scan(&reservationID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return reservationID, nil
}

const latestReservationIDQuery = `
	SELECT payload->>'reservation_id'
	FROM event_store
	WHERE aggregate_type = 'bet'
	  AND aggregate_id = $1
	  AND payload ? 'reservation_id'
	ORDER BY version DESC
	LIMIT 1
`

func (r *postgresBettingRepository) appendBetEventTx(ctx context.Context, tx pgx.Tx, betID, eventType string, payload, metadata map[string]any, kafkaTopic string) error {
	version, err := r.nextEventVersion(ctx, tx, betID)
	if err != nil {
		return err
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_store (aggregate_type, aggregate_id, event_type, version, payload, metadata)
		VALUES ('bet', $1, $2, $3, $4, $5)
	`, betID, eventType, version, payloadBytes, metadataBytes); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key)
		VALUES ('bet', $1, $2, $3, $4, $5)
	`, betID, eventType, payloadBytes, kafkaTopic, betID); err != nil {
		return err
	}
	return nil
}

func (r *postgresBettingRepository) nextEventVersion(ctx context.Context, tx pgx.Tx, betID string) (int, error) {
	var version int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(version), 0) + 1 FROM event_store WHERE aggregate_type = 'bet' AND aggregate_id = $1`, betID).Scan(&version); err != nil {
		return 0, err
	}
	return version, nil
}

func normalizeStoredStatus(status string) string {
	switch strings.TrimSpace(strings.ToLower(status)) {
	case "", "all":
		return ""
	case "matched", "open":
		return "pending"
	default:
		return strings.TrimSpace(strings.ToLower(status))
	}
}

func normalizeSettledResult(result string) string {
	switch strings.TrimSpace(strings.ToLower(result)) {
	case "won", "lost", "voided":
		return strings.TrimSpace(strings.ToLower(result))
	default:
		return ""
	}
}

func stringPointerValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func nullableDecimalParam(value *decimal.Decimal) any {
	if value == nil {
		return nil
	}
	return *value
}

func parseOptionalDecimal(value *string) *decimal.Decimal {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil
	}
	parsed, err := decimal.NewFromString(*value)
	if err != nil {
		return nil
	}
	return &parsed
}

func nullableTrimmedString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

type queryRower interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type queryer interface {
	queryRower
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}
