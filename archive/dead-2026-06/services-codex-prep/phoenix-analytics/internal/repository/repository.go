package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-analytics/internal/models"
)

var ErrNotFound = errors.New("not found")

type Repository interface {
	TrackEvent(ctx context.Context, actorID string, req models.TrackEventRequest) (*models.TrackEventResponse, error)
	GetUserReport(ctx context.Context, userID string, startDate, endDate time.Time) (*models.UserReportResponse, error)
	GetPlatformDashboard(ctx context.Context, date time.Time) (*models.PlatformDashboardResponse, error)
	GetMarketReport(ctx context.Context, startDate, endDate time.Time, limit int) (*models.MarketReportResponse, error)
	GetCohorts(ctx context.Context, cohortType string, startDate, endDate time.Time) (*models.CohortsResponse, error)
	ExportUserTransactions(ctx context.Context, userID, txType, product string, startDate, endDate time.Time) ([]models.TransactionExportRow, error)
	ExportExcludedPunters(ctx context.Context) ([]models.ExcludedPunterExportRow, error)
	GetDailyTransactionSummary(ctx context.Context, startDate, endDate time.Time) (*models.DailyTransactionSummary, error)
	CountActiveExclusions(ctx context.Context, startDate, endDate time.Time) (int, error)
	ListWalletCorrectionTasks(ctx context.Context, userID, status string, limit int) ([]models.WalletCorrectionTask, error)
	GetPromoUsageSummary(ctx context.Context, filter models.PromoUsageFilters) (*models.PromoUsageSummary, error)
	GetRiskFeatureSnapshot(ctx context.Context, userID string) (*models.RiskFeatureSnapshot, error)
	DiscoverRiskUserIDs(ctx context.Context, limit int) ([]string, error)
	GetProviderFeedHealth(ctx context.Context, thresholds models.ProviderFeedThresholds) (*models.FeedHealthResponse, error)
	ListProviderStreamAcknowledgements(ctx context.Context) ([]models.ProviderStreamAcknowledgement, error)
	UpsertProviderStreamAcknowledgement(ctx context.Context, actorID string, req models.ProviderStreamAcknowledgementRequest) (*models.ProviderStreamAcknowledgement, error)
	GetProviderAcknowledgementSLASettings(ctx context.Context) (*models.ProviderAcknowledgementSLASettingsResponse, error)
	UpsertProviderAcknowledgementSLASetting(ctx context.Context, actorID string, req models.ProviderAcknowledgementSLAUpdateRequest) (*models.ProviderAcknowledgementSLASetting, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) TrackEvent(ctx context.Context, actorID string, req models.TrackEventRequest) (*models.TrackEventResponse, error) {
	now := time.Now().UTC()
	if req.Timestamp.IsZero() {
		req.Timestamp = now
	}
	eventID := uuid.NewString()
	payload, err := json.Marshal(req.Properties)
	if err != nil {
		return nil, err
	}
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if strings.TrimSpace(req.UserID) != "" {
		if err := ensureUserExists(ctx, tx, req.UserID); err != nil {
			return nil, err
		}
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO analytics_events (id, event_type, user_id, properties, event_timestamp, received_at)
		VALUES ($1, $2, NULLIF($3, '')::uuid, $4, $5, $6)
	`, eventID, req.EventType, req.UserID, payload, req.Timestamp.UTC(), now)
	if err != nil {
		return nil, err
	}
	if err := appendEventTx(ctx, tx, "analytics-event", eventID, "AnalyticsEventTracked", map[string]any{
		"event_type": req.EventType,
		"user_id":    req.UserID,
		"properties": req.Properties,
		"timestamp":  req.Timestamp.UTC().Format(time.RFC3339),
		"actor_id":   actorID,
	}); err != nil {
		return nil, err
	}
	if err := appendOutboxTx(ctx, tx, "analytics-event", eventID, "AnalyticsEventTracked", map[string]any{
		"event_id":   eventID,
		"event_type": req.EventType,
		"user_id":    req.UserID,
		"timestamp":  req.Timestamp.UTC().Format(time.RFC3339),
	}, "phoenix.analytics.event-tracked"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.TrackEventResponse{EventID: eventID, Status: "queued", ReceivedAt: now}, nil
}

func (r *PostgresRepository) GetUserReport(ctx context.Context, userID string, startDate, endDate time.Time) (*models.UserReportResponse, error) {
	if err := ensureUserExistsPool(ctx, r.pool, userID); err != nil {
		return nil, err
	}
	var totalBets int
	var totalStake decimal.Decimal
	var totalReturns decimal.Decimal
	var wonBets int
	if err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COALESCE(SUM(stake), 0),
			COALESCE(SUM(CASE WHEN status IN ('won', 'settled') THEN potential_payout ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN status IN ('won', 'settled') THEN 1 ELSE 0 END), 0)
		FROM bets
		WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
	`, userID, startDate, endDate).Scan(&totalBets, &totalStake, &totalReturns, &wonBets); err != nil {
		return nil, err
	}
	profit := totalReturns.Sub(totalStake)
	winRate := decimal.Zero
	roi := decimal.Zero
	if totalBets > 0 {
		winRate = decimal.NewFromInt(int64(wonBets)).Div(decimal.NewFromInt(int64(totalBets)))
	}
	if totalStake.GreaterThan(decimal.Zero) {
		roi = profit.Div(totalStake)
	}
	return &models.UserReportResponse{
		UserID: userID,
		Period: fmt.Sprintf("%s to %s", startDate.Format("2006-01-02"), endDate.Add(-time.Nanosecond).Format("2006-01-02")),
		Stats:  models.UserStats{TotalBets: totalBets, TotalStake: totalStake, TotalReturns: totalReturns, Profit: profit, WinRate: winRate, ROI: roi},
	}, nil
}

func (r *PostgresRepository) GetPlatformDashboard(ctx context.Context, date time.Time) (*models.PlatformDashboardResponse, error) {
	start := time.Date(date.UTC().Year(), date.UTC().Month(), date.UTC().Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(24 * time.Hour)
	var activeUsers int
	var newUsers int
	var totalBets int
	var totalMatched decimal.Decimal
	var totalReturns decimal.Decimal
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT user_id) FROM bets WHERE created_at >= $1 AND created_at < $2
	`, start, end).Scan(&activeUsers); err != nil {
		return nil, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE created_at >= $1 AND created_at < $2`, start, end).Scan(&newUsers); err != nil {
		return nil, err
	}
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(stake), 0), COALESCE(SUM(CASE WHEN status IN ('won', 'settled') THEN potential_payout ELSE 0 END), 0)
		FROM bets WHERE created_at >= $1 AND created_at < $2
	`, start, end).Scan(&totalBets, &totalMatched, &totalReturns); err != nil {
		return nil, err
	}
	return &models.PlatformDashboardResponse{
		Date:    start.Format("2006-01-02"),
		Metrics: models.PlatformMetrics{ActiveUsers: activeUsers, NewUsers: newUsers, TotalBets: totalBets, TotalMatched: totalMatched, TotalReturns: totalReturns, PlatformProfit: totalMatched.Sub(totalReturns)},
	}, nil
}

func (r *PostgresRepository) GetMarketReport(ctx context.Context, startDate, endDate time.Time, limit int) (*models.MarketReportResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx, `
		SELECT
			b.market_id,
			COALESCE(m.type, ''),
			COALESCE(b.outcome_id::text, ''),
			COUNT(*) AS total_bets,
			COALESCE(SUM(b.stake), 0) AS total_stake,
			COALESCE(SUM(CASE WHEN b.status IN ('won', 'settled') THEN b.potential_payout ELSE 0 END), 0) AS total_returns
		FROM bets b
		LEFT JOIN markets m ON m.id = b.market_id
		WHERE b.created_at >= $1 AND b.created_at < $2
		GROUP BY b.market_id, m.type, b.outcome_id
		ORDER BY total_stake DESC
	`, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	aggregate := map[string]*models.MarketReportItem{}
	ordered := make([]string, 0)
	for rows.Next() {
		var marketID, marketType, outcomeID string
		var totalBets int
		var totalStake, totalReturns decimal.Decimal
		if err := rows.Scan(&marketID, &marketType, &outcomeID, &totalBets, &totalStake, &totalReturns); err != nil {
			return nil, err
		}
		item, ok := aggregate[marketID]
		if !ok {
			item = &models.MarketReportItem{MarketID: marketID, MarketType: marketType, MatchedByOutcome: map[string]decimal.Decimal{}}
			aggregate[marketID] = item
			ordered = append(ordered, marketID)
		}
		item.TotalBets += totalBets
		item.TotalMatched = item.TotalMatched.Add(totalStake)
		item.HouseProfit = item.HouseProfit.Add(totalStake.Sub(totalReturns))
		if outcomeID != "" {
			item.MatchedByOutcome[outcomeID] = item.MatchedByOutcome[outcomeID].Add(totalStake)
		}
	}
	items := make([]models.MarketReportItem, 0, len(ordered))
	for _, marketID := range ordered {
		items = append(items, *aggregate[marketID])
		if len(items) == limit {
			break
		}
	}
	return &models.MarketReportResponse{Data: items}, rows.Err()
}

func (r *PostgresRepository) GetCohorts(ctx context.Context, cohortType string, startDate, endDate time.Time) (*models.CohortsResponse, error) {
	cohortType = strings.ToLower(strings.TrimSpace(cohortType))
	if cohortType == "" {
		cohortType = "signup_date"
	}
	users, err := r.loadCohortUsers(ctx, cohortType, startDate, endDate)
	if err != nil {
		return nil, err
	}
	items := make([]models.CohortItem, 0, len(users))
	for cohortID, members := range users {
		count := len(members)
		if count == 0 {
			continue
		}
		day1, day7, day30, ltv, err := r.cohortMetrics(ctx, members)
		if err != nil {
			return nil, err
		}
		items = append(items, models.CohortItem{CohortID: cohortID, UsersCount: count, Retention: models.CohortRetention{Day1: day1, Day7: day7, Day30: day30}, LTV: ltv})
	}
	return &models.CohortsResponse{Cohorts: items}, nil
}

func (r *PostgresRepository) ExportUserTransactions(ctx context.Context, userID, txType, product string, startDate, endDate time.Time) ([]models.TransactionExportRow, error) {
	if err := ensureUserExistsPool(ctx, r.pool, userID); err != nil {
		return nil, err
	}

	filters := []string{"u.id = $1", "wt.created_at >= $2", "wt.created_at < $3"}
	args := []any{userID, startDate, endDate}
	argIndex := 4

	if txType != "" {
		filters = append(filters, fmt.Sprintf("wt.type = $%d", argIndex))
		args = append(args, txType)
		argIndex++
	}
	if product != "" {
		filters = append(filters, fmt.Sprintf(`(
			CASE
				WHEN po.id IS NOT NULL THEN 'prediction'
				WHEN wt.type IN ('bet_place', 'bet_win', 'bet_refund') THEN 'sportsbook'
				ELSE 'wallet'
			END
		) = $%d`, argIndex))
		args = append(args, product)
		argIndex++
	}

	query := fmt.Sprintf(`
		SELECT
			wt.id,
			u.id,
			u.username,
			u.email,
			wt.type,
			CASE
				WHEN po.id IS NOT NULL THEN 'prediction'
				WHEN wt.type IN ('bet_place', 'bet_win', 'bet_refund') THEN 'sportsbook'
				ELSE 'wallet'
			END AS product,
			wt.amount,
			COALESCE(wt.reference, ''),
			wt.created_at
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		JOIN users u ON u.id = w.user_id
		LEFT JOIN prediction_orders po ON po.id::text = wt.reference
		WHERE %s
		ORDER BY wt.created_at DESC, wt.id DESC
	`, strings.Join(filters, " AND "))

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]models.TransactionExportRow, 0)
	for rows.Next() {
		var row models.TransactionExportRow
		if err := rows.Scan(
			&row.TransactionID,
			&row.UserID,
			&row.Username,
			&row.Email,
			&row.Type,
			&row.Product,
			&row.Amount,
			&row.Reference,
			&row.CreatedAt,
		); err != nil {
			return nil, err
		}
		row.Type = externalAnalyticsTransactionType(row.Type)
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *PostgresRepository) ExportExcludedPunters(ctx context.Context) ([]models.ExcludedPunterExportRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			u.id,
			u.username,
			u.email,
			se.exclusion_type,
			se.reason,
			se.status,
			se.effective_at,
			se.expires_at
		FROM self_exclusions se
		JOIN users u ON u.id = se.user_id
		ORDER BY se.created_at DESC, se.id DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]models.ExcludedPunterExportRow, 0)
	for rows.Next() {
		var row models.ExcludedPunterExportRow
		if err := rows.Scan(
			&row.UserID,
			&row.Username,
			&row.Email,
			&row.ExclusionType,
			&row.Reason,
			&row.Status,
			&row.EffectiveAt,
			&row.ExpiresAt,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (r *PostgresRepository) GetDailyTransactionSummary(ctx context.Context, startDate, endDate time.Time) (*models.DailyTransactionSummary, error) {
	var summary models.DailyTransactionSummary
	if err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE type = 'deposit'),
			COALESCE(SUM(amount) FILTER (WHERE type = 'deposit'), 0),
			COUNT(*) FILTER (WHERE type = 'withdrawal'),
			COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal'), 0)
		FROM wallet_transactions
		WHERE created_at >= $1 AND created_at < $2
	`, startDate, endDate).Scan(
		&summary.DepositsCount,
		&summary.DepositsAmount,
		&summary.WithdrawalsCount,
		&summary.WithdrawalsAmount,
	); err != nil {
		return nil, err
	}
	summary.NetCash = summary.DepositsAmount.Sub(summary.WithdrawalsAmount)
	return &summary, nil
}

func (r *PostgresRepository) CountActiveExclusions(ctx context.Context, startDate, endDate time.Time) (int, error) {
	var count int
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM self_exclusions
		WHERE status = 'active'
			AND effective_at < $2
			AND (expires_at IS NULL OR expires_at >= $1)
	`, startDate, endDate).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (r *PostgresRepository) ListWalletCorrectionTasks(ctx context.Context, userID, status string, limit int) ([]models.WalletCorrectionTask, error) {
	normalizedStatus := normalizeCorrectionStatus(status)
	if normalizedStatus == "resolved" {
		return []models.WalletCorrectionTask{}, nil
	}

	tasks := make([]models.WalletCorrectionTask, 0)

	negativeBalanceRows, err := r.pool.Query(ctx, `
		SELECT w.user_id::text, w.balance, w.updated_at
		FROM wallets w
		WHERE w.balance < 0
		  AND ($1 = '' OR w.user_id::text = $1)
		ORDER BY w.updated_at DESC, w.user_id::text ASC
	`, strings.TrimSpace(userID))
	if err != nil {
		return nil, err
	}
	for negativeBalanceRows.Next() {
		var (
			taskUserID string
			balance    decimal.Decimal
			updatedAt  time.Time
		)
		if err := negativeBalanceRows.Scan(&taskUserID, &balance, &updatedAt); err != nil {
			negativeBalanceRows.Close()
			return nil, err
		}
		tasks = append(tasks, models.WalletCorrectionTask{
			TaskID:                   "negative_balance:" + taskUserID,
			UserID:                   taskUserID,
			Type:                     "negative_balance",
			Status:                   "open",
			CurrentBalanceCents:      decimalToCents(balance),
			SuggestedAdjustmentCents: decimalToCents(balance.Abs()),
			Reason:                   "wallet balance is below zero",
			UpdatedAt:                updatedAt.UTC(),
		})
	}
	if err := negativeBalanceRows.Err(); err != nil {
		negativeBalanceRows.Close()
		return nil, err
	}
	negativeBalanceRows.Close()

	ledgerDriftRows, err := r.pool.Query(ctx, `
		WITH latest_wallet_transaction AS (
			SELECT DISTINCT ON (wt.wallet_id)
				wt.wallet_id,
				wt.id::text AS transaction_id,
				wt.balance_after,
				COALESCE(wt.provider_updated_at, wt.created_at) AS updated_at
			FROM wallet_transactions wt
			ORDER BY wt.wallet_id, COALESCE(wt.provider_updated_at, wt.created_at) DESC, wt.id DESC
		)
		SELECT w.user_id::text, w.balance, lwt.transaction_id, lwt.balance_after, lwt.updated_at
		FROM wallets w
		JOIN latest_wallet_transaction lwt ON lwt.wallet_id = w.id
		WHERE lwt.balance_after <> w.balance
		  AND ($1 = '' OR w.user_id::text = $1)
		ORDER BY lwt.updated_at DESC, w.user_id::text ASC
	`, strings.TrimSpace(userID))
	if err != nil {
		return nil, err
	}
	for ledgerDriftRows.Next() {
		var (
			taskUserID    string
			walletBalance decimal.Decimal
			transactionID string
			balanceAfter  decimal.Decimal
			updatedAt     time.Time
		)
		if err := ledgerDriftRows.Scan(&taskUserID, &walletBalance, &transactionID, &balanceAfter, &updatedAt); err != nil {
			ledgerDriftRows.Close()
			return nil, err
		}
		diff := walletBalance.Sub(balanceAfter).Abs()
		tasks = append(tasks, models.WalletCorrectionTask{
			TaskID:                   "ledger_drift:" + transactionID,
			UserID:                   taskUserID,
			Type:                     "ledger_drift",
			Status:                   "open",
			CurrentBalanceCents:      decimalToCents(walletBalance),
			SuggestedAdjustmentCents: decimalToCents(diff),
			Reason:                   "wallet balance does not match latest ledger entry",
			UpdatedAt:                updatedAt.UTC(),
		})
	}
	if err := ledgerDriftRows.Err(); err != nil {
		ledgerDriftRows.Close()
		return nil, err
	}
	ledgerDriftRows.Close()

	manualReviewRows, err := r.pool.Query(ctx, `
		SELECT
			wt.id::text,
			w.user_id::text,
			w.balance,
			wt.type,
			COALESCE(wt.status, ''),
			COALESCE(wt.provider, ''),
			COALESCE(wt.provider_reference, ''),
			COALESCE(wt.reference, ''),
			COALESCE(wt.provider_updated_at, wt.created_at) AS updated_at
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		WHERE wt.type IN ('deposit', 'withdrawal')
		  AND COALESCE(wt.status, '') = ANY($1)
		  AND ($2 = '' OR w.user_id::text = $2)
		ORDER BY COALESCE(wt.provider_updated_at, wt.created_at) DESC, wt.id DESC
	`, adminReviewableStatuses(), strings.TrimSpace(userID))
	if err != nil {
		return nil, err
	}
	for manualReviewRows.Next() {
		var (
			transactionID string
			taskUserID    string
			balance       decimal.Decimal
			txType        string
			txStatus      string
			provider      string
			providerRef   string
			reference     string
			updatedAt     time.Time
		)
		if err := manualReviewRows.Scan(&transactionID, &taskUserID, &balance, &txType, &txStatus, &provider, &providerRef, &reference, &updatedAt); err != nil {
			manualReviewRows.Close()
			return nil, err
		}
		tasks = append(tasks, models.WalletCorrectionTask{
			TaskID:                   "manual_review:" + transactionID,
			UserID:                   taskUserID,
			Type:                     "manual_review",
			Status:                   "open",
			CurrentBalanceCents:      decimalToCents(balance),
			SuggestedAdjustmentCents: 0,
			Reason:                   buildManualReviewReason(txType, txStatus, provider, providerRef, reference),
			UpdatedAt:                updatedAt.UTC(),
		})
	}
	if err := manualReviewRows.Err(); err != nil {
		manualReviewRows.Close()
		return nil, err
	}
	manualReviewRows.Close()

	sort.SliceStable(tasks, func(i, j int) bool {
		if tasks[i].UpdatedAt.Equal(tasks[j].UpdatedAt) {
			return tasks[i].TaskID < tasks[j].TaskID
		}
		return tasks[i].UpdatedAt.After(tasks[j].UpdatedAt)
	})

	if normalizedStatus == "open" || normalizedStatus == "" || normalizedStatus == "all" {
		return tasks, nil
	}
	return []models.WalletCorrectionTask{}, nil
}

func (r *PostgresRepository) GetPromoUsageSummary(ctx context.Context, filter models.PromoUsageFilters) (*models.PromoUsageSummary, error) {
	query := `
		SELECT user_id::text, stake, COALESCE(freebet_id, ''), freebet_applied_cents, COALESCE(odds_boost_id, '')
		FROM bets
		WHERE 1=1`
	args := make([]any, 0, 6)
	argPos := 1
	if userID := strings.TrimSpace(filter.UserID); userID != "" {
		query += fmt.Sprintf(" AND user_id = $%d::uuid", argPos)
		args = append(args, userID)
		argPos++
	}
	if freebetID := strings.TrimSpace(filter.FreebetID); freebetID != "" {
		query += fmt.Sprintf(" AND freebet_id = $%d", argPos)
		args = append(args, freebetID)
		argPos++
	}
	if oddsBoostID := strings.TrimSpace(filter.OddsBoostID); oddsBoostID != "" {
		query += fmt.Sprintf(" AND odds_boost_id = $%d", argPos)
		args = append(args, oddsBoostID)
		argPos++
	}
	if filter.From != nil {
		query += fmt.Sprintf(" AND created_at >= $%d", argPos)
		args = append(args, filter.From.UTC())
		argPos++
	}
	if filter.To != nil {
		query += fmt.Sprintf(" AND created_at <= $%d", argPos)
		args = append(args, filter.To.UTC())
		argPos++
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	accumulator := newPromoUsageAccumulator()
	for rows.Next() {
		var (
			userID              string
			stake               decimal.Decimal
			freebetID           string
			freebetAppliedCents int64
			oddsBoostID         string
		)
		if err := rows.Scan(&userID, &stake, &freebetID, &freebetAppliedCents, &oddsBoostID); err != nil {
			return nil, err
		}
		accumulator.Add(userID, decimalToCents(stake), strings.TrimSpace(freebetID), freebetAppliedCents, strings.TrimSpace(oddsBoostID))
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	summary := accumulator.Finalize(filter.BreakdownLimit)
	return &summary, nil
}

type promoUsageAccumulator struct {
	summary      models.PromoUsageSummary
	uniqueUsers  map[string]struct{}
	freebetStats map[string]models.PromoUsageBreakdown
	boostStats   map[string]models.PromoUsageBreakdown
}

func newPromoUsageAccumulator() *promoUsageAccumulator {
	return &promoUsageAccumulator{
		summary: models.PromoUsageSummary{
			Freebets:   []models.PromoUsageBreakdown{},
			OddsBoosts: []models.PromoUsageBreakdown{},
		},
		uniqueUsers:  map[string]struct{}{},
		freebetStats: map[string]models.PromoUsageBreakdown{},
		boostStats:   map[string]models.PromoUsageBreakdown{},
	}
}

func (a *promoUsageAccumulator) Add(userID string, stakeCents int64, freebetID string, freebetAppliedCents int64, oddsBoostID string) {
	a.summary.TotalBets++
	a.summary.TotalStakeCents += stakeCents
	if userID != "" {
		a.uniqueUsers[userID] = struct{}{}
	}
	hasFreebet := freebetID != ""
	hasBoost := oddsBoostID != ""
	if hasFreebet {
		a.summary.BetsWithFreebet++
		a.summary.TotalFreebetAppliedCents += freebetAppliedCents
		entry := a.freebetStats[freebetID]
		entry.ID = freebetID
		entry.BetCount++
		entry.TotalStakeCents += stakeCents
		entry.TotalFreebetAppliedCents += freebetAppliedCents
		a.freebetStats[freebetID] = entry
	}
	if hasBoost {
		a.summary.BetsWithOddsBoost++
		a.summary.TotalBoostedStakeCents += stakeCents
		entry := a.boostStats[oddsBoostID]
		entry.ID = oddsBoostID
		entry.BetCount++
		entry.TotalStakeCents += stakeCents
		a.boostStats[oddsBoostID] = entry
	}
	if hasFreebet && hasBoost {
		a.summary.BetsWithBoth++
	}
}

func (a *promoUsageAccumulator) Finalize(limit int) models.PromoUsageSummary {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	a.summary.UniqueUsers = int64(len(a.uniqueUsers))
	a.summary.UniqueFreebets = int64(len(a.freebetStats))
	a.summary.UniqueOddsBoosts = int64(len(a.boostStats))
	a.summary.Freebets = sortedPromoUsageBreakdowns(a.freebetStats, limit)
	a.summary.OddsBoosts = sortedPromoUsageBreakdowns(a.boostStats, limit)
	return a.summary
}

func sortedPromoUsageBreakdowns(values map[string]models.PromoUsageBreakdown, limit int) []models.PromoUsageBreakdown {
	if len(values) == 0 {
		return []models.PromoUsageBreakdown{}
	}
	items := make([]models.PromoUsageBreakdown, 0, len(values))
	for _, entry := range values {
		items = append(items, entry)
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].BetCount == items[j].BetCount {
			return items[i].ID < items[j].ID
		}
		return items[i].BetCount > items[j].BetCount
	})
	if len(items) > limit {
		items = items[:limit]
	}
	return items
}

func (r *PostgresRepository) GetRiskFeatureSnapshot(ctx context.Context, userID string) (*models.RiskFeatureSnapshot, error) {
	if err := ensureUserExistsPool(ctx, r.pool, userID); err != nil {
		return nil, err
	}

	var snapshot models.RiskFeatureSnapshot
	snapshot.UserID = strings.TrimSpace(userID)
	if err := r.pool.QueryRow(ctx, `
		SELECT
			COALESCE(sb.placed_count, 0),
			COALESCE(sb.settled_count, 0),
			COALESCE(sb.voided_count, 0),
			COALESCE(po.placed_count, 0),
			COALESCE(po.settled_count, 0),
			COALESCE(po.cancelled_count, 0),
			COALESCE(sb.total_stake, 0) + COALESCE(po.total_stake, 0),
			COALESCE(wt.deposit_total, 0),
			COALESCE(wallet.balance, 0),
			COALESCE(wt.pending_review_count, 0),
			GREATEST(
				u.created_at,
				COALESCE(sb.last_activity_at, u.created_at),
				COALESCE(po.last_activity_at, u.created_at),
				COALESCE(wt.last_activity_at, u.created_at)
			)
		FROM users u
		LEFT JOIN LATERAL (
			SELECT
				COUNT(*) AS placed_count,
				COUNT(*) FILTER (WHERE status IN ('won', 'lost', 'settled', 'cashed_out')) AS settled_count,
				COUNT(*) FILTER (WHERE status = 'voided') AS voided_count,
				COALESCE(SUM(stake), 0) AS total_stake,
				MAX(COALESCE(settled_at, updated_at, created_at)) AS last_activity_at
			FROM bets
			WHERE user_id = u.id
		) sb ON true
		LEFT JOIN LATERAL (
			SELECT
				COUNT(*) AS placed_count,
				COUNT(*) FILTER (WHERE status NOT IN ('open', 'cancelled')) AS settled_count,
				COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
				COALESCE(SUM(stake_usd), 0) AS total_stake,
				MAX(COALESCE(settled_at, cancelled_at, updated_at, placed_at, created_at)) AS last_activity_at
			FROM prediction_orders
			WHERE user_id = u.id
		) po ON true
		LEFT JOIN LATERAL (
			SELECT
				COALESCE(SUM(amount) FILTER (WHERE type = 'deposit'), 0) AS deposit_total,
				COUNT(*) FILTER (WHERE COALESCE(status, '') = ANY($2)) AS pending_review_count,
				MAX(COALESCE(provider_updated_at, created_at)) AS last_activity_at
			FROM wallet_transactions wt
			JOIN wallets w ON w.id = wt.wallet_id
			WHERE w.user_id = u.id
		) wt ON true
		LEFT JOIN LATERAL (
			SELECT balance
			FROM wallets
			WHERE user_id = u.id
			ORDER BY created_at ASC
			LIMIT 1
		) wallet ON true
		WHERE u.id = $1
	`, strings.TrimSpace(userID), adminReviewableStatuses()).Scan(
		&snapshot.SportsbookPlacedCount,
		&snapshot.SportsbookSettledCount,
		&snapshot.SportsbookVoidedCount,
		&snapshot.PredictionPlacedCount,
		&snapshot.PredictionSettledCount,
		&snapshot.PredictionCancelledCount,
		&snapshot.TotalStake,
		&snapshot.LifetimeDeposits,
		&snapshot.CurrentBalance,
		&snapshot.PendingReviewCount,
		&snapshot.LastActivityAt,
	); err != nil {
		return nil, err
	}
	return &snapshot, nil
}

func (r *PostgresRepository) DiscoverRiskUserIDs(ctx context.Context, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}

	rows, err := r.pool.Query(ctx, `
		SELECT user_id
		FROM (
			SELECT
				u.id::text AS user_id,
				GREATEST(
					u.created_at,
					COALESCE(sb.last_activity_at, u.created_at),
					COALESCE(po.last_activity_at, u.created_at),
					COALESCE(wt.last_activity_at, u.created_at)
				) AS last_activity_at
			FROM users u
			LEFT JOIN LATERAL (
				SELECT MAX(COALESCE(settled_at, updated_at, created_at)) AS last_activity_at
				FROM bets
				WHERE user_id = u.id
			) sb ON true
			LEFT JOIN LATERAL (
				SELECT MAX(COALESCE(settled_at, cancelled_at, updated_at, placed_at, created_at)) AS last_activity_at
				FROM prediction_orders
				WHERE user_id = u.id
			) po ON true
			LEFT JOIN LATERAL (
				SELECT MAX(COALESCE(provider_updated_at, created_at)) AS last_activity_at
				FROM wallet_transactions wt
				JOIN wallets w ON w.id = wt.wallet_id
				WHERE w.user_id = u.id
			) wt ON true
		) activity
		ORDER BY last_activity_at DESC, user_id ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	userIDs := make([]string, 0, limit)
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, userID)
	}
	return userIDs, rows.Err()
}

func (r *PostgresRepository) GetProviderFeedHealth(ctx context.Context, thresholds models.ProviderFeedThresholds) (*models.FeedHealthResponse, error) {
	rows, err := r.pool.Query(ctx, `
		WITH event_streams AS (
			SELECT
				split_part(external_id, ':', 1) AS adapter,
				'events'::text AS stream,
				COUNT(*)::int AS applied,
				0::int AS skipped,
				0::int AS replay_count,
				0::int AS duplicate_count,
				0::int AS gap_count,
				0::int AS error_count,
				0::int AS last_revision,
				0::int AS last_sequence,
				''::text AS last_bet_id,
				''::text AS last_player_id,
				''::text AS last_request_id,
				MAX(updated_at) AS last_event_at,
				MAX(updated_at) AS updated_at,
				''::text AS last_error
			FROM events
			WHERE COALESCE(external_id, '') <> '' AND position(':' in external_id) > 0
			GROUP BY 1
		),
		market_streams AS (
			SELECT
				split_part(external_id, ':', 1) AS adapter,
				'markets'::text AS stream,
				COUNT(*)::int AS applied,
				0::int AS skipped,
				0::int AS replay_count,
				0::int AS duplicate_count,
				0::int AS gap_count,
				0::int AS error_count,
				0::int AS last_revision,
				0::int AS last_sequence,
				''::text AS last_bet_id,
				''::text AS last_player_id,
				''::text AS last_request_id,
				MAX(updated_at) AS last_event_at,
				MAX(updated_at) AS updated_at,
				''::text AS last_error
			FROM markets
			WHERE COALESCE(external_id, '') <> '' AND position(':' in external_id) > 0
			GROUP BY 1
		),
		payment_latest AS (
			SELECT DISTINCT ON (lower(COALESCE(pte.provider, wt.provider, '')))
				lower(COALESCE(pte.provider, wt.provider, '')) AS adapter,
				COALESCE(w.user_id::text, '') AS last_player_id,
				COALESCE(pte.provider_reference, wt.provider_reference, '') AS last_request_id,
				COALESCE(NULLIF(pte.reason, ''), COALESCE(pte.payload->>'provider_message', ''), '') AS last_error,
				COALESCE(pte.created_at, wt.provider_updated_at, wt.created_at) AS last_event_at
			FROM wallet_transactions wt
			JOIN wallets w ON w.id = wt.wallet_id
			LEFT JOIN payment_transaction_events pte ON pte.transaction_id = wt.id
			WHERE COALESCE(wt.provider, '') <> ''
			ORDER BY lower(COALESCE(pte.provider, wt.provider, '')), COALESCE(pte.created_at, wt.provider_updated_at, wt.created_at) DESC, wt.id DESC
		),
		payment_streams AS (
			SELECT
				lower(wt.provider) AS adapter,
				'payments'::text AS stream,
				COUNT(*)::int AS applied,
				COUNT(*) FILTER (WHERE wt.status IN ('PENDING_REVIEW', 'PENDING_APPROVAL', 'ACTION_REQUIRED'))::int AS skipped,
				COUNT(*) FILTER (WHERE wt.status = 'RETRYING')::int AS replay_count,
				0::int AS duplicate_count,
				0::int AS gap_count,
				COUNT(*) FILTER (
					WHERE COALESCE(wt.provider_updated_at, wt.created_at) >= NOW() - INTERVAL '24 hours'
					  AND wt.status IN ('DECLINED', 'EXPIRED', 'CHARGEBACK')
				)::int AS error_count,
				0::int AS last_revision,
				0::int AS last_sequence,
				''::text AS last_bet_id,
				COALESCE(pl.last_player_id, '') AS last_player_id,
				COALESCE(pl.last_request_id, '') AS last_request_id,
				COALESCE(pl.last_event_at, MAX(COALESCE(wt.provider_updated_at, wt.created_at))) AS last_event_at,
				MAX(COALESCE(wt.provider_updated_at, wt.created_at)) AS updated_at,
				COALESCE(pl.last_error, '') AS last_error
			FROM wallet_transactions wt
			LEFT JOIN payment_latest pl ON pl.adapter = lower(wt.provider)
			WHERE COALESCE(wt.provider, '') <> ''
			GROUP BY lower(wt.provider), pl.last_player_id, pl.last_request_id, pl.last_event_at, pl.last_error
		)
		SELECT
			adapter,
			stream,
			applied,
			skipped,
			replay_count,
			duplicate_count,
			gap_count,
			error_count,
			last_revision,
			last_sequence,
			last_bet_id,
			last_player_id,
			last_request_id,
			last_event_at,
			updated_at,
			last_error
		FROM event_streams
		UNION ALL
		SELECT
			adapter,
			stream,
			applied,
			skipped,
			replay_count,
			duplicate_count,
			gap_count,
			error_count,
			last_revision,
			last_sequence,
			last_bet_id,
			last_player_id,
			last_request_id,
			last_event_at,
			updated_at,
			last_error
		FROM market_streams
		UNION ALL
		SELECT
			adapter,
			stream,
			applied,
			skipped,
			replay_count,
			duplicate_count,
			gap_count,
			error_count,
			last_revision,
			last_sequence,
			last_bet_id,
			last_player_id,
			last_request_id,
			last_event_at,
			updated_at,
			last_error
		FROM payment_streams
		ORDER BY adapter ASC, stream ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	response := &models.FeedHealthResponse{
		Thresholds: thresholds,
		Streams:    make([]models.ProviderFeedStreamStatus, 0),
	}
	now := time.Now().UTC()
	for rows.Next() {
		var (
			stream                 models.ProviderFeedStreamStatus
			lastEventAt, updatedAt time.Time
		)
		if err := rows.Scan(
			&stream.Adapter,
			&stream.Stream,
			&stream.Applied,
			&stream.Skipped,
			&stream.ReplayCount,
			&stream.DuplicateCount,
			&stream.GapCount,
			&stream.ErrorCount,
			&stream.LastRevision,
			&stream.LastSequence,
			&stream.LastBetID,
			&stream.LastPlayerID,
			&stream.LastRequestID,
			&lastEventAt,
			&updatedAt,
			&stream.LastError,
		); err != nil {
			return nil, err
		}
		stream.LastLagMs = int(now.Sub(updatedAt.UTC()).Milliseconds())
		if stream.LastLagMs < 0 {
			stream.LastLagMs = 0
		}
		stream.LastEventAt = lastEventAt.UTC().Format(time.RFC3339)
		stream.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		stream.State = providerStreamState(stream, thresholds)
		response.Streams = append(response.Streams, stream)
		response.Summary.StreamCount++
		response.Summary.TotalApplied += stream.Applied
		response.Summary.TotalErrors += stream.ErrorCount
		if stream.LastLagMs > response.Summary.MaxLagMs {
			response.Summary.MaxLagMs = stream.LastLagMs
		}
		if isProviderStreamUnhealthy(stream, thresholds) {
			response.Summary.UnhealthyStreams++
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	cancelMetrics, err := r.loadProviderCancelMetrics(ctx)
	if err != nil {
		return nil, err
	}
	response.Cancel = cancelMetrics
	response.Enabled = len(response.Streams) > 0

	return response, nil
}

func (r *PostgresRepository) ListProviderStreamAcknowledgements(ctx context.Context) ([]models.ProviderStreamAcknowledgement, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT stream_key, adapter, stream, operator, note, status, last_action, acknowledged_at, updated_by
		FROM provider_stream_acknowledgements
		ORDER BY updated_at DESC, stream_key ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.ProviderStreamAcknowledgement, 0)
	for rows.Next() {
		var item models.ProviderStreamAcknowledgement
		var acknowledgedAt time.Time
		if err := rows.Scan(
			&item.StreamKey,
			&item.Adapter,
			&item.Stream,
			&item.Operator,
			&item.Note,
			&item.Status,
			&item.LastAction,
			&acknowledgedAt,
			&item.UpdatedBy,
		); err != nil {
			return nil, err
		}
		item.AcknowledgedAt = acknowledgedAt.UTC().Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) UpsertProviderStreamAcknowledgement(ctx context.Context, actorID string, req models.ProviderStreamAcknowledgementRequest) (*models.ProviderStreamAcknowledgement, error) {
	now := time.Now().UTC()
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	previous, err := scanProviderStreamAcknowledgement(tx.QueryRow(ctx, `
		SELECT stream_key, adapter, stream, operator, note, status, last_action, acknowledged_at, updated_by
		FROM provider_stream_acknowledgements
		WHERE stream_key = $1
	`, req.StreamKey))
	if err != nil && !errors.Is(err, ErrNotFound) {
		return nil, err
	}
	if errors.Is(err, ErrNotFound) {
		previous = nil
	}

	status, lastAction := normalizeProviderAcknowledgementAction(req.Action)
	updatedBy := strings.TrimSpace(actorID)
	if updatedBy == "" {
		updatedBy = strings.TrimSpace(req.Operator)
	}

	current, err := scanProviderStreamAcknowledgement(tx.QueryRow(ctx, `
		INSERT INTO provider_stream_acknowledgements (
			stream_key,
			adapter,
			stream,
			operator,
			note,
			status,
			last_action,
			acknowledged_at,
			updated_at,
			updated_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9)
		ON CONFLICT (stream_key) DO UPDATE SET
			adapter = EXCLUDED.adapter,
			stream = EXCLUDED.stream,
			operator = EXCLUDED.operator,
			note = EXCLUDED.note,
			status = EXCLUDED.status,
			last_action = EXCLUDED.last_action,
			acknowledged_at = EXCLUDED.acknowledged_at,
			updated_at = EXCLUDED.updated_at,
			updated_by = EXCLUDED.updated_by
		RETURNING stream_key, adapter, stream, operator, note, status, last_action, acknowledged_at, updated_by
	`, req.StreamKey, req.Adapter, req.Stream, req.Operator, req.Note, status, lastAction, now, updatedBy))
	if err != nil {
		return nil, err
	}

	action := "provider.stream.acknowledged"
	switch lastAction {
	case "reassigned":
		action = "provider.stream.reassigned"
	case "resolved":
		action = "provider.stream.resolved"
	case "reopened":
		action = "provider.stream.reopened"
	}
	if err := writeAuditLogTx(ctx, tx, auditLogEntry{
		ActorID:    updatedBy,
		Action:     action,
		EntityType: "provider_stream",
		EntityID:   current.StreamKey,
		OldValue:   previous,
		NewValue:   current,
		CreatedAt:  now,
	}); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return current, nil
}

func (r *PostgresRepository) GetProviderAcknowledgementSLASettings(ctx context.Context) (*models.ProviderAcknowledgementSLASettingsResponse, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT adapter, warning_minutes, critical_minutes, updated_at, updated_by
		FROM provider_acknowledgement_sla_settings
		ORDER BY adapter ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	response := &models.ProviderAcknowledgementSLASettingsResponse{
		Default: models.ProviderAcknowledgementSLASetting{
			Adapter:         "",
			WarningMinutes:  15,
			CriticalMinutes: 30,
			UpdatedAt:       "",
			UpdatedBy:       "",
			Source:          "default",
		},
		Overrides: make([]models.ProviderAcknowledgementSLASetting, 0),
		Effective: make([]models.ProviderAcknowledgementSLASetting, 0),
	}
	for rows.Next() {
		var (
			adapter   string
			warning   int
			critical  int
			updatedAt time.Time
			updatedBy string
		)
		if err := rows.Scan(&adapter, &warning, &critical, &updatedAt, &updatedBy); err != nil {
			return nil, err
		}
		setting := models.ProviderAcknowledgementSLASetting{
			Adapter:         strings.TrimSpace(adapter),
			WarningMinutes:  warning,
			CriticalMinutes: critical,
			UpdatedAt:       updatedAt.UTC().Format(time.RFC3339),
			UpdatedBy:       strings.TrimSpace(updatedBy),
		}
		if setting.Adapter == "" {
			setting.Source = "default"
			response.Default = setting
			continue
		}
		setting.Source = "override"
		response.Overrides = append(response.Overrides, setting)
		response.Effective = append(response.Effective, setting)
	}
	return response, rows.Err()
}

func (r *PostgresRepository) UpsertProviderAcknowledgementSLASetting(ctx context.Context, actorID string, req models.ProviderAcknowledgementSLAUpdateRequest) (*models.ProviderAcknowledgementSLASetting, error) {
	now := time.Now().UTC()
	adapter := strings.TrimSpace(req.Adapter)
	updatedBy := strings.TrimSpace(actorID)

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	previous, err := scanProviderAcknowledgementSLASetting(tx.QueryRow(ctx, `
		SELECT adapter, warning_minutes, critical_minutes, updated_at, updated_by
		FROM provider_acknowledgement_sla_settings
		WHERE adapter = $1
	`, adapter))
	if err != nil && !errors.Is(err, ErrNotFound) {
		return nil, err
	}
	if errors.Is(err, ErrNotFound) {
		previous = nil
	}

	current, err := scanProviderAcknowledgementSLASetting(tx.QueryRow(ctx, `
		INSERT INTO provider_acknowledgement_sla_settings (
			adapter,
			warning_minutes,
			critical_minutes,
			updated_at,
			updated_by
		)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (adapter) DO UPDATE SET
			warning_minutes = EXCLUDED.warning_minutes,
			critical_minutes = EXCLUDED.critical_minutes,
			updated_at = EXCLUDED.updated_at,
			updated_by = EXCLUDED.updated_by
		RETURNING adapter, warning_minutes, critical_minutes, updated_at, updated_by
	`, adapter, req.WarningMinutes, req.CriticalMinutes, now, updatedBy))
	if err != nil {
		return nil, err
	}

	action := "provider.stream.sla.default.updated"
	entityID := "provider.stream.sla.default"
	if current.Adapter != "" {
		action = "provider.stream.sla.adapter.updated"
		entityID = current.Adapter
	}
	if err := writeAuditLogTx(ctx, tx, auditLogEntry{
		ActorID:    updatedBy,
		Action:     action,
		EntityType: "provider_stream_sla",
		EntityID:   entityID,
		OldValue:   previous,
		NewValue:   current,
		CreatedAt:  now,
	}); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return current, nil
}

func (r *PostgresRepository) loadCohortUsers(ctx context.Context, cohortType string, startDate, endDate time.Time) (map[string][]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, created_at, COALESCE(country, ''), COALESCE(role::text, '') FROM users WHERE created_at >= $1 AND created_at < $2`, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cohorts := map[string][]string{}
	for rows.Next() {
		var userID string
		var createdAt time.Time
		var country, role string
		if err := rows.Scan(&userID, &createdAt, &country, &role); err != nil {
			return nil, err
		}
		cohortID := "unknown"
		switch cohortType {
		case "signup_date":
			cohortID = createdAt.UTC().Format("2006-01")
		case "region":
			if country != "" {
				cohortID = country
			}
		case "vip_status":
			cohortID = "standard"
			if role == "admin" || role == "moderator" {
				cohortID = "vip"
			}
		default:
			cohortID = createdAt.UTC().Format("2006-01")
		}
		cohorts[cohortID] = append(cohorts[cohortID], userID)
	}
	return cohorts, rows.Err()
}

func (r *PostgresRepository) cohortMetrics(ctx context.Context, userIDs []string) (decimal.Decimal, decimal.Decimal, decimal.Decimal, decimal.Decimal, error) {
	ids := make([]string, 0, len(userIDs))
	ids = append(ids, userIDs...)
	var day1Users, day7Users, day30Users int
	var totalStake decimal.Decimal
	query := `
		WITH cohort_users AS (
			SELECT id, created_at FROM users WHERE id = ANY($1::uuid[])
		)
		SELECT
			COUNT(DISTINCT CASE WHEN b.created_at >= cu.created_at + INTERVAL '1 day' THEN cu.id END),
			COUNT(DISTINCT CASE WHEN b.created_at >= cu.created_at + INTERVAL '7 day' THEN cu.id END),
			COUNT(DISTINCT CASE WHEN b.created_at >= cu.created_at + INTERVAL '30 day' THEN cu.id END),
			COALESCE(SUM(b.stake), 0)
		FROM cohort_users cu
		LEFT JOIN bets b ON b.user_id = cu.id
	`
	if err := r.pool.QueryRow(ctx, query, ids).Scan(&day1Users, &day7Users, &day30Users, &totalStake); err != nil {
		return decimal.Zero, decimal.Zero, decimal.Zero, decimal.Zero, err
	}
	count := decimal.NewFromInt(int64(len(ids)))
	if count.IsZero() {
		return decimal.Zero, decimal.Zero, decimal.Zero, decimal.Zero, nil
	}
	return decimal.NewFromInt(int64(day1Users)).Div(count), decimal.NewFromInt(int64(day7Users)).Div(count), decimal.NewFromInt(int64(day30Users)).Div(count), totalStake.Div(count), nil
}

func ensureUserExists(ctx context.Context, tx pgx.Tx, userID string) error {
	var id string
	if err := tx.QueryRow(ctx, `SELECT id FROM users WHERE id = $1`, userID).Scan(&id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func ensureUserExistsPool(ctx context.Context, pool *pgxpool.Pool, userID string) error {
	var id string
	if err := pool.QueryRow(ctx, `SELECT id FROM users WHERE id = $1`, userID).Scan(&id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func appendEventTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	var version int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(version), 0) + 1 FROM event_store WHERE aggregate_type = $1 AND aggregate_id = $2`, aggregateType, aggregateID).Scan(&version); err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO event_store (aggregate_type, aggregate_id, event_type, version, payload, metadata) VALUES ($1, $2, $3, $4, $5, '{}'::jsonb)`, aggregateType, aggregateID, eventType, version, body)
	return err
}

func appendOutboxTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any, topic string) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key) VALUES ($1, $2, $3, $4, $5, $6)`, aggregateType, aggregateID, eventType, body, topic, aggregateID)
	return err
}

func externalAnalyticsTransactionType(value string) string {
	switch strings.TrimSpace(value) {
	case "bet_place":
		return "bet_placed"
	default:
		return value
	}
}

func normalizeCorrectionStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "all":
		return ""
	case "open":
		return "open"
	case "resolved":
		return "resolved"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func adminReviewableStatuses() []string {
	return []string{"PENDING_APPROVAL", "PENDING_REVIEW", "RETRYING", "ACTION_REQUIRED", "CHARGEBACK_REVIEW", "REFUND_PENDING"}
}

func buildManualReviewReason(txType, status, provider, providerRef, reference string) string {
	parts := []string{strings.ToLower(strings.TrimSpace(txType))}
	if provider != "" {
		parts = append(parts, "via "+strings.TrimSpace(provider))
	}
	parts = append(parts, "awaiting operator review")
	if status != "" {
		parts = append(parts, "(status "+strings.ToUpper(strings.TrimSpace(status))+")")
	}
	if providerRef != "" {
		parts = append(parts, "providerRef="+strings.TrimSpace(providerRef))
	} else if reference != "" {
		parts = append(parts, "reference="+strings.TrimSpace(reference))
	}
	return strings.Join(parts, " ")
}

func decimalToCents(value decimal.Decimal) int64 {
	return value.Shift(2).IntPart()
}

type auditLogEntry struct {
	ActorID    string
	Action     string
	EntityType string
	EntityID   string
	OldValue   any
	NewValue   any
	IPAddress  string
	CreatedAt  time.Time
}

func scanProviderStreamAcknowledgement(row pgx.Row) (*models.ProviderStreamAcknowledgement, error) {
	var (
		item           models.ProviderStreamAcknowledgement
		acknowledgedAt time.Time
	)
	if err := row.Scan(
		&item.StreamKey,
		&item.Adapter,
		&item.Stream,
		&item.Operator,
		&item.Note,
		&item.Status,
		&item.LastAction,
		&acknowledgedAt,
		&item.UpdatedBy,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	item.AcknowledgedAt = acknowledgedAt.UTC().Format(time.RFC3339)
	return &item, nil
}

func scanProviderAcknowledgementSLASetting(row pgx.Row) (*models.ProviderAcknowledgementSLASetting, error) {
	var (
		item      models.ProviderAcknowledgementSLASetting
		updatedAt time.Time
	)
	if err := row.Scan(
		&item.Adapter,
		&item.WarningMinutes,
		&item.CriticalMinutes,
		&updatedAt,
		&item.UpdatedBy,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	if item.Adapter == "" {
		item.Source = "default"
	} else {
		item.Source = "override"
	}
	return &item, nil
}

func normalizeProviderAcknowledgementAction(value string) (status string, lastAction string) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "resolve", "resolved":
		return "resolved", "resolved"
	case "reassign", "reassigned":
		return "acknowledged", "reassigned"
	case "reopen", "reopened":
		return "acknowledged", "reopened"
	default:
		return "acknowledged", "acknowledged"
	}
}

func providerStreamState(stream models.ProviderFeedStreamStatus, thresholds models.ProviderFeedThresholds) string {
	if strings.TrimSpace(stream.LastError) != "" || stream.ErrorCount > 0 {
		return "error"
	}
	if thresholds.MaxLagMs > 0 && stream.LastLagMs > thresholds.MaxLagMs*2 {
		return "stopped"
	}
	if stream.Applied > 0 {
		return "connected"
	}
	return "stopped"
}

func isProviderStreamUnhealthy(stream models.ProviderFeedStreamStatus, thresholds models.ProviderFeedThresholds) bool {
	return stream.LastLagMs > thresholds.MaxLagMs ||
		stream.GapCount > thresholds.MaxGapCount ||
		stream.DuplicateCount > thresholds.MaxDuplicateCount ||
		stream.ErrorCount > 0 ||
		strings.TrimSpace(stream.LastError) != ""
}

func (r *PostgresRepository) loadProviderCancelMetrics(ctx context.Context) (models.ProviderCancelMetrics, error) {
	var metrics models.ProviderCancelMetrics
	if err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (
				WHERE created_at >= NOW() - INTERVAL '30 days'
				  AND (source = 'admin-reconcile' OR status IN ('RETRYING', 'REFUNDED', 'REVERSED', 'DECLINED', 'EXPIRED', 'CHARGEBACK'))
			)::int,
			COUNT(*) FILTER (
				WHERE created_at >= NOW() - INTERVAL '30 days'
				  AND status = 'RETRYING'
			)::int,
			COUNT(*) FILTER (
				WHERE created_at >= NOW() - INTERVAL '30 days'
				  AND source = 'admin-reconcile'
			)::int,
			COUNT(*) FILTER (
				WHERE created_at >= NOW() - INTERVAL '30 days'
				  AND status IN ('REFUNDED', 'REVERSED')
			)::int,
			COUNT(*) FILTER (
				WHERE created_at >= NOW() - INTERVAL '30 days'
				  AND status IN ('DECLINED', 'EXPIRED', 'CHARGEBACK')
			)::int
		FROM payment_transaction_events
	`).Scan(
		&metrics.TotalAttempts,
		&metrics.TotalRetries,
		&metrics.TotalFallback,
		&metrics.TotalSuccess,
		&metrics.TotalFailed,
	); err != nil {
		return models.ProviderCancelMetrics{}, err
	}
	return metrics, nil
}

func writeAuditLogTx(ctx context.Context, tx pgx.Tx, entry auditLogEntry) error {
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
	_, err := tx.Exec(ctx, `
		INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
		VALUES ($1, NULLIF($2,'')::uuid, $3, $4, NULLIF($5,''), $6, $7, NULLIF($8,'')::inet, $9)
	`, uuid.NewString(), strings.TrimSpace(entry.ActorID), entry.Action, entry.EntityType, strings.TrimSpace(entry.EntityID), oldValue, newValue, strings.TrimSpace(entry.IPAddress), entry.CreatedAt.UTC())
	return err
}
