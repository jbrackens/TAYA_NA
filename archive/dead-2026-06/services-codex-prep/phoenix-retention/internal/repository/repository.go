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

	"github.com/phoenixbot/phoenix-retention/internal/models"
)

var ErrNotFound = errors.New("not found")
var ErrConflict = errors.New("conflict")

type Repository interface {
	ValidateUserExists(ctx context.Context, userID string) error
	UnlockAchievement(ctx context.Context, userID string, req models.UnlockAchievementRequest) (*models.UnlockAchievementResponse, error)
	ListUserAchievements(ctx context.Context, userID string) ([]models.AchievementRecord, error)
	ListLeaderboard(ctx context.Context, filters models.LeaderboardFilters) (*models.LeaderboardResponse, error)
	CreateCampaign(ctx context.Context, req models.CreateCampaignRequest, actorID string) (*models.CreateCampaignResponse, error)
	GetLoyaltyState(ctx context.Context, userID string, limit int) (*models.LoyaltyPointsResponse, error)
	RedeemLoyaltyPoints(ctx context.Context, userID string, req models.RedeemPointsRequest, rewardValue decimal.Decimal) (*models.RedeemPointsResponse, error)
	ListFreebets(ctx context.Context, userID, status string) (*models.FreebetListResponse, error)
	GetFreebet(ctx context.Context, freebetID string) (*models.FreebetResponse, error)
	ListOddsBoosts(ctx context.Context, userID, status string) (*models.OddsBoostListResponse, error)
	GetOddsBoost(ctx context.Context, oddsBoostID string) (*models.OddsBoostResponse, error)
	AcceptOddsBoost(ctx context.Context, oddsBoostID string, req models.OddsBoostAcceptRequest) (*models.OddsBoostResponse, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

type queryable interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) ValidateUserExists(ctx context.Context, userID string) error {
	var exists bool
	if err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND is_active = TRUE)`, userID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresRepository) UnlockAchievement(ctx context.Context, userID string, req models.UnlockAchievementRequest) (*models.UnlockAchievementResponse, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if err := r.validateUserExistsTx(ctx, tx, userID); err != nil {
		return nil, err
	}
	achievementUUID, err := r.getOrCreateAchievement(ctx, tx, req)
	if err != nil {
		return nil, err
	}

	var existingCompletedAt *time.Time
	var existingClaimed bool
	_ = tx.QueryRow(ctx, `SELECT completed_at, reward_claimed FROM user_achievements WHERE user_id = $1 AND achievement_id = $2`, userUUID, achievementUUID).Scan(&existingCompletedAt, &existingClaimed)

	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, `
		INSERT INTO user_achievements (id, user_id, achievement_id, progress, completed_at, reward_claimed, created_at, updated_at)
		VALUES ($1, $2, $3, 1, $4, TRUE, $4, $4)
		ON CONFLICT (user_id, achievement_id)
		DO UPDATE SET progress = GREATEST(user_achievements.progress, 1), completed_at = COALESCE(user_achievements.completed_at, EXCLUDED.completed_at), reward_claimed = TRUE, updated_at = EXCLUDED.updated_at
	`, uuid.NewString(), userUUID, achievementUUID, now); err != nil {
		return nil, err
	}

	if existingCompletedAt == nil && req.RewardPoints > 0 {
		if err := r.appendLoyaltyEventTx(ctx, tx, userUUID, "LoyaltyPointsEarned", map[string]any{
			"event":          "achievement_unlocked",
			"achievement_id": req.AchievementID,
			"points":         req.RewardPoints,
			"multiplier":     1.0,
			"earned_at":      now.Format(time.RFC3339),
		}); err != nil {
			return nil, err
		}
	}

	if err := r.appendOutboxTx(ctx, tx, "achievement", achievementUUID, "AchievementUnlocked", map[string]any{
		"user_id":        userID,
		"achievement_id": req.AchievementID,
		"reward_points":  req.RewardPoints,
		"unlocked_at":    now.Format(time.RFC3339),
	}, "stella.achievements.unlocked"); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.UnlockAchievementResponse{UserID: userID, AchievementID: req.AchievementID, UnlockedAt: now, RewardPoints: req.RewardPoints}, nil
}

func (r *PostgresRepository) ListUserAchievements(ctx context.Context, userID string) ([]models.AchievementRecord, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT a.name, COALESCE(a.description, ''), a.reward_points, COALESCE(a.icon_url, ''), ua.completed_at
		FROM user_achievements ua
		JOIN achievements a ON a.id = ua.achievement_id
		WHERE ua.user_id = $1
		ORDER BY ua.completed_at DESC NULLS LAST, a.name ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.AchievementRecord, 0)
	for rows.Next() {
		var item models.AchievementRecord
		if err := rows.Scan(&item.AchievementID, &item.Description, &item.RewardPoints, &item.BadgeImage, &item.UnlockedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) ListLeaderboard(ctx context.Context, filters models.LeaderboardFilters) (*models.LeaderboardResponse, error) {
	period := normalizePeriod(filters.Period)
	metric := normalizeMetric(filters.Metric)
	var leaderboardID string
	var startDate *time.Time
	var endDate *time.Time
	err := r.pool.QueryRow(ctx, `
		SELECT id, start_date, end_date
		FROM leaderboards
		WHERE period = $1 AND type = $2 AND is_active = TRUE
		ORDER BY COALESCE(start_date, created_at) DESC
		LIMIT 1
	`, period, metric).Scan(&leaderboardID, &startDate, &endDate)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &models.LeaderboardResponse{LeaderboardType: filters.Period, Metric: filters.Metric, Entries: []models.LeaderboardEntry{}}, nil
		}
		return nil, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT COALESCE(le.rank, 0), le.user_id::text, u.username, le.score, le.updated_at
		FROM leaderboard_entries le
		JOIN users u ON u.id = le.user_id
		WHERE le.leaderboard_id = $1
		ORDER BY COALESCE(le.rank, 2147483647), le.score DESC
		LIMIT $2 OFFSET $3
	`, leaderboardID, filters.Limit, filters.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	entries := make([]models.LeaderboardEntry, 0, filters.Limit)
	for rows.Next() {
		var entry models.LeaderboardEntry
		var score decimal.Decimal
		if err := rows.Scan(&entry.Rank, &entry.UserID, &entry.Username, &score, &entry.LastUpdate); err != nil {
			return nil, err
		}
		value, _ := score.Float64()
		entry.Value = value
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &models.LeaderboardResponse{
		LeaderboardType: filters.Period,
		Metric:          filters.Metric,
		Entries:         entries,
		Period:          models.LeaderboardPeriod{Start: startDate, End: endDate},
	}, nil
}

func (r *PostgresRepository) CreateCampaign(ctx context.Context, req models.CreateCampaignRequest, actorID string) (*models.CreateCampaignResponse, error) {
	now := time.Now().UTC()
	status := "draft"
	if !req.StartDate.After(now) {
		status = "active"
	}
	campaignID := uuid.NewString()
	targetingRules, err := json.Marshal(map[string]any{"description": req.Description, "rules": req.Rules})
	if err != nil {
		return nil, err
	}
	rewardConfig, err := json.Marshal(map[string]any{"campaign_type": req.CampaignType})
	if err != nil {
		return nil, err
	}
	if _, err := r.pool.Exec(ctx, `
		INSERT INTO campaigns (id, name, type, start_date, end_date, targeting_rules, reward_config, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
	`, campaignID, req.Name, mapCampaignType(req.CampaignType), req.StartDate, req.EndDate, targetingRules, rewardConfig, status, now); err != nil {
		return nil, err
	}
	if err := r.appendOutbox(ctx, "campaign", campaignID, "CampaignCreated", map[string]any{
		"campaign_id":   campaignID,
		"name":          req.Name,
		"campaign_type": req.CampaignType,
		"actor_id":      actorID,
		"created_at":    now.Format(time.RFC3339),
	}, "stella.campaign.triggered"); err != nil {
		return nil, err
	}
	responseStatus := status
	if status == "draft" && req.StartDate.After(now) {
		responseStatus = "scheduled"
	}
	return &models.CreateCampaignResponse{CampaignID: campaignID, Name: req.Name, Status: responseStatus, CreatedAt: now}, nil
}

func (r *PostgresRepository) GetLoyaltyState(ctx context.Context, userID string, limit int) (*models.LoyaltyPointsResponse, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}
	if err := r.ValidateUserExists(ctx, userID); err != nil {
		return nil, err
	}
	state, err := r.replayLoyaltyEvents(ctx, r.pool, userUUID, limit)
	if err != nil {
		return nil, err
	}
	return &models.LoyaltyPointsResponse{UserID: userID, TotalPoints: state.TotalPoints, AvailablePoints: state.AvailablePoints, ReservedPoints: state.ReservedPoints, PointsHistory: state.History}, nil
}

func (r *PostgresRepository) RedeemLoyaltyPoints(ctx context.Context, userID string, req models.RedeemPointsRequest, rewardValue decimal.Decimal) (*models.RedeemPointsResponse, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}
	state, err := r.replayLoyaltyEvents(ctx, r.pool, userUUID, 20)
	if err != nil {
		return nil, err
	}
	if state.AvailablePoints < req.PointsToRedeem {
		return nil, fmt.Errorf("insufficient loyalty points")
	}
	now := time.Now().UTC()
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := r.appendLoyaltyEventTx(ctx, tx, userUUID, "LoyaltyPointsRedeemed", map[string]any{
		"event":        "reward_redeemed",
		"reward_id":    req.RewardID,
		"points":       req.PointsToRedeem,
		"reward_value": rewardValue.StringFixed(2),
		"earned_at":    now.Format(time.RFC3339),
	}); err != nil {
		return nil, err
	}
	if err := r.appendOutboxTx(ctx, tx, "loyalty_points", userUUID.String(), "LoyaltyPointsRedeemed", map[string]any{
		"user_id":         userID,
		"reward_id":       req.RewardID,
		"points_redeemed": req.PointsToRedeem,
		"reward_value":    rewardValue.StringFixed(2),
		"redeemed_at":     now.Format(time.RFC3339),
	}, "stella.points.calculated"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.RedeemPointsResponse{UserID: userID, RewardID: req.RewardID, PointsRedeemed: req.PointsToRedeem, RewardValue: rewardValue, RemainingPoints: state.AvailablePoints - req.PointsToRedeem, RedeemedAt: now}, nil
}

func (r *PostgresRepository) ListFreebets(ctx context.Context, userID, status string) (*models.FreebetListResponse, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}
	if err := r.ValidateUserExists(ctx, userID); err != nil {
		return nil, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id::text, campaign_id, currency, total_amount_cents, remaining_amount_cents,
		       COALESCE(min_odds_decimal::text, ''), applies_to_sport_ids, applies_to_tournament_ids,
		       expires_at, status, created_at, updated_at
		FROM freebets
		WHERE user_id = $1 AND ($2 = '' OR lower(status) = lower($2))
		ORDER BY created_at DESC, id ASC
	`, userUUID, strings.TrimSpace(status))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.FreebetResponse, 0)
	for rows.Next() {
		item, err := scanFreebet(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &models.FreebetListResponse{Items: items, TotalCount: len(items)}, nil
}

func (r *PostgresRepository) GetFreebet(ctx context.Context, freebetID string) (*models.FreebetResponse, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id::text, campaign_id, currency, total_amount_cents, remaining_amount_cents,
		       COALESCE(min_odds_decimal::text, ''), applies_to_sport_ids, applies_to_tournament_ids,
		       expires_at, status, created_at, updated_at
		FROM freebets
		WHERE id = $1
	`, strings.TrimSpace(freebetID))
	item, err := scanFreebet(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &item, nil
}

func (r *PostgresRepository) ListOddsBoosts(ctx context.Context, userID, status string) (*models.OddsBoostListResponse, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}
	if err := r.ValidateUserExists(ctx, userID); err != nil {
		return nil, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id::text, campaign_id, market_id, selection_id, currency,
		       original_odds::text, boosted_odds::text, max_stake_cents, COALESCE(min_odds_decimal::text, ''),
		       status, expires_at, accepted_at, accept_request_id, created_at, updated_at
		FROM odds_boosts
		WHERE user_id = $1 AND ($2 = '' OR lower(status) = lower($2))
		ORDER BY created_at DESC, id ASC
	`, userUUID, strings.TrimSpace(status))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.OddsBoostResponse, 0)
	for rows.Next() {
		item, err := scanOddsBoost(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &models.OddsBoostListResponse{Items: items, TotalCount: len(items)}, nil
}

func (r *PostgresRepository) GetOddsBoost(ctx context.Context, oddsBoostID string) (*models.OddsBoostResponse, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id::text, campaign_id, market_id, selection_id, currency,
		       original_odds::text, boosted_odds::text, max_stake_cents, COALESCE(min_odds_decimal::text, ''),
		       status, expires_at, accepted_at, accept_request_id, created_at, updated_at
		FROM odds_boosts
		WHERE id = $1
	`, strings.TrimSpace(oddsBoostID))
	item, err := scanOddsBoost(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &item, nil
}

func (r *PostgresRepository) AcceptOddsBoost(ctx context.Context, oddsBoostID string, req models.OddsBoostAcceptRequest) (*models.OddsBoostResponse, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	now := time.Now().UTC()
	row := tx.QueryRow(ctx, `
		UPDATE odds_boosts
		SET status = 'accepted',
		    accepted_at = $2,
		    accept_request_id = $3,
		    accept_reason = NULLIF($4, ''),
		    updated_at = $2
		WHERE id = $1 AND status = 'available'
		RETURNING id, user_id::text, campaign_id, market_id, selection_id, currency,
		          original_odds::text, boosted_odds::text, max_stake_cents, COALESCE(min_odds_decimal::text, ''),
		          status, expires_at, accepted_at, accept_request_id, created_at, updated_at
	`, strings.TrimSpace(oddsBoostID), now, strings.TrimSpace(req.RequestID), strings.TrimSpace(req.Reason))
	item, err := scanOddsBoost(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrConflict
		}
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *PostgresRepository) validateUserExistsTx(ctx context.Context, tx pgx.Tx, userID string) error {
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND is_active = TRUE)`, userID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresRepository) getOrCreateAchievement(ctx context.Context, tx pgx.Tx, req models.UnlockAchievementRequest) (string, error) {
	var achievementID string
	err := tx.QueryRow(ctx, `SELECT id::text FROM achievements WHERE name = $1`, req.AchievementID).Scan(&achievementID)
	if err == nil {
		if _, execErr := tx.Exec(ctx, `UPDATE achievements SET description = $2, reward_points = $3, icon_url = $4, updated_at = $5 WHERE id = $1`, achievementID, req.Description, req.RewardPoints, nullIfEmpty(req.BadgeImage), time.Now().UTC()); execErr != nil {
			return "", execErr
		}
		return achievementID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}
	criteria, err := json.Marshal(map[string]any{"source": "manual_unlock_api"})
	if err != nil {
		return "", err
	}
	achievementID = uuid.NewString()
	if _, err := tx.Exec(ctx, `
		INSERT INTO achievements (id, name, description, type, criteria, reward_points, icon_url, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, 'manual', $4, $5, $6, TRUE, $7, $7)
	`, achievementID, req.AchievementID, req.Description, criteria, req.RewardPoints, nullIfEmpty(req.BadgeImage), time.Now().UTC()); err != nil {
		return "", err
	}
	return achievementID, nil
}

func (r *PostgresRepository) replayLoyaltyEvents(ctx context.Context, q queryable, userUUID uuid.UUID, limit int) (*models.LoyaltyState, error) {
	rows, err := q.Query(ctx, `
		SELECT event_type, payload, created_at
		FROM event_store
		WHERE aggregate_type = 'loyalty_points' AND aggregate_id = $1
		ORDER BY version ASC
	`, userUUID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	state := &models.LoyaltyState{History: []models.LoyaltyHistoryItem{}}
	fullHistory := make([]models.LoyaltyHistoryItem, 0)
	for rows.Next() {
		var eventType string
		var payloadBytes []byte
		var createdAt time.Time
		if err := rows.Scan(&eventType, &payloadBytes, &createdAt); err != nil {
			return nil, err
		}
		var payload map[string]any
		if err := json.Unmarshal(payloadBytes, &payload); err != nil {
			return nil, err
		}
		points := intFromAny(payload["points"])
		switch eventType {
		case "LoyaltyPointsEarned":
			state.TotalPoints += points
			state.AvailablePoints += points
		case "LoyaltyPointsRedeemed":
			state.AvailablePoints -= points
		}
		item := models.LoyaltyHistoryItem{
			Event:       eventString(payload, "event", eventType),
			Points:      points,
			Multiplier:  floatFromAny(payload["multiplier"], 1.0),
			EarnedAt:    createdAt,
			RewardID:    stringFromAny(payload["reward_id"]),
			RewardValue: stringFromAny(payload["reward_value"]),
		}
		fullHistory = append(fullHistory, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > len(fullHistory) {
		limit = len(fullHistory)
	}
	for i := len(fullHistory) - 1; i >= 0 && len(state.History) < limit; i-- {
		state.History = append(state.History, fullHistory[i])
	}
	return state, nil
}

func (r *PostgresRepository) appendLoyaltyEventTx(ctx context.Context, tx pgx.Tx, userUUID uuid.UUID, eventType string, payload map[string]any) error {
	version, err := r.nextVersion(ctx, tx, "loyalty_points", userUUID.String())
	if err != nil {
		return err
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	metadata, _ := json.Marshal(map[string]any{"source": "phoenix-retention"})
	_, err = tx.Exec(ctx, `
		INSERT INTO event_store (aggregate_type, aggregate_id, event_type, version, payload, metadata, created_at)
		VALUES ('loyalty_points', $1, $2, $3, $4, $5, $6)
	`, userUUID, eventType, version, payloadBytes, metadata, time.Now().UTC())
	return err
}

func (r *PostgresRepository) appendOutbox(ctx context.Context, aggregateType, aggregateID, eventType string, payload map[string]any, topic string) error {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key) VALUES ($1, $2, $3, $4, $5, $6)`, aggregateType, aggregateID, eventType, payloadBytes, topic, aggregateID)
	return err
}

func (r *PostgresRepository) appendOutboxTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any, topic string) error {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key) VALUES ($1, $2, $3, $4, $5, $6)`, aggregateType, aggregateID, eventType, payloadBytes, topic, aggregateID)
	return err
}

func (r *PostgresRepository) nextVersion(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID string) (int, error) {
	var version int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(version), 0) + 1 FROM event_store WHERE aggregate_type = $1 AND aggregate_id = $2`, aggregateType, aggregateID).Scan(&version); err != nil {
		return 0, err
	}
	return version, nil
}

func normalizePeriod(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "daily", "weekly", "monthly":
		return strings.ToLower(strings.TrimSpace(value))
	case "all_time", "alltime":
		return "alltime"
	default:
		return "weekly"
	}
}

func normalizeMetric(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "points"
	}
	return value
}

func mapCampaignType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "seasonal":
		return "seasonal"
	case "loyalty", "points_multiplier":
		return "loyalty"
	case "retention":
		return "retention"
	default:
		return "promotional"
	}
}

func intFromAny(value any) int {
	switch typed := value.(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	case string:
		parsed, _ := decimal.NewFromString(typed)
		return int(parsed.IntPart())
	default:
		return 0
	}
}

func floatFromAny(value any, fallback float64) float64 {
	switch typed := value.(type) {
	case float64:
		return typed
	case string:
		parsed, err := decimal.NewFromString(typed)
		if err == nil {
			result, _ := parsed.Float64()
			return result
		}
	}
	return fallback
}

func stringFromAny(value any) string {
	if value == nil {
		return ""
	}
	if typed, ok := value.(string); ok {
		return typed
	}
	return fmt.Sprint(value)
}

func eventString(payload map[string]any, key, fallback string) string {
	if value := stringFromAny(payload[key]); value != "" {
		return value
	}
	return fallback
}

func nullIfEmpty(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return value
}

func scanFreebet(row interface{ Scan(dest ...any) error }) (models.FreebetResponse, error) {
	var item models.FreebetResponse
	var campaignID *string
	var minOddsText string
	var sportIDsBytes []byte
	var tournamentIDsBytes []byte
	var expiresAt time.Time
	var createdAt time.Time
	var updatedAt time.Time
	if err := row.Scan(
		&item.FreebetID,
		&item.PlayerID,
		&campaignID,
		&item.Currency,
		&item.TotalAmountCents,
		&item.RemainingAmountCents,
		&minOddsText,
		&sportIDsBytes,
		&tournamentIDsBytes,
		&expiresAt,
		&item.Status,
		&createdAt,
		&updatedAt,
	); err != nil {
		return models.FreebetResponse{}, err
	}
	item.CampaignID = campaignID
	if minOddsText != "" {
		if parsed, err := decimal.NewFromString(minOddsText); err == nil {
			value, _ := parsed.Float64()
			item.MinOddsDecimal = &value
		}
	}
	item.AppliesToSportIDs = parseJSONTextArray(sportIDsBytes)
	item.AppliesToTournamentIDs = parseJSONTextArray(tournamentIDsBytes)
	item.ExpiresAt = expiresAt.UTC().Format(time.RFC3339)
	item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	return item, nil
}

func scanOddsBoost(row interface{ Scan(dest ...any) error }) (models.OddsBoostResponse, error) {
	var item models.OddsBoostResponse
	var campaignID *string
	var originalOddsText string
	var boostedOddsText string
	var maxStakeCents *int
	var minOddsText string
	var expiresAt time.Time
	var acceptedAt *time.Time
	var acceptRequestID *string
	var createdAt time.Time
	var updatedAt time.Time
	if err := row.Scan(
		&item.OddsBoostID,
		&item.PlayerID,
		&campaignID,
		&item.MarketID,
		&item.SelectionID,
		&item.Currency,
		&originalOddsText,
		&boostedOddsText,
		&maxStakeCents,
		&minOddsText,
		&item.Status,
		&expiresAt,
		&acceptedAt,
		&acceptRequestID,
		&createdAt,
		&updatedAt,
	); err != nil {
		return models.OddsBoostResponse{}, err
	}
	item.CampaignID = campaignID
	item.MaxStakeCents = maxStakeCents
	item.AcceptRequestID = acceptRequestID
	if originalOddsText != "" {
		if parsed, err := decimal.NewFromString(originalOddsText); err == nil {
			item.OriginalOdds, _ = parsed.Float64()
		}
	}
	if boostedOddsText != "" {
		if parsed, err := decimal.NewFromString(boostedOddsText); err == nil {
			item.BoostedOdds, _ = parsed.Float64()
		}
	}
	if minOddsText != "" {
		if parsed, err := decimal.NewFromString(minOddsText); err == nil {
			value, _ := parsed.Float64()
			item.MinOddsDecimal = &value
		}
	}
	item.ExpiresAt = expiresAt.UTC().Format(time.RFC3339)
	if acceptedAt != nil {
		value := acceptedAt.UTC().Format(time.RFC3339)
		item.AcceptedAt = &value
	}
	item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	return item, nil
}

func parseJSONTextArray(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var items []string
	if err := json.Unmarshal(raw, &items); err != nil {
		return []string{}
	}
	return items
}
