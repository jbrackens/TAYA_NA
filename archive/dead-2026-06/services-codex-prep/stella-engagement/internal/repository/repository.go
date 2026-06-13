package repository

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/phoenixbot/stella-engagement/internal/models"
)

var ErrNotFound = errors.New("not found")

type Repository interface {
	RecordAchievement(ctx context.Context, actorID string, req models.AchievementStreamRequest) (*models.AchievementStreamResponse, error)
	CalculatePoints(ctx context.Context, actorID string, req models.PointsCalculateRequest) (*models.PointsCalculateResponse, error)
	ComputeAggregation(ctx context.Context, actorID string, req models.AggregationComputeRequest) (*models.AggregationComputeResponse, error)
	GetEngagementScore(ctx context.Context, userID string) (*models.EngagementScoreResponse, error)
	GetLeaderboard(ctx context.Context, limit int) ([]models.LeaderboardEntry, error)
}

type PostgresRepository struct { pool *pgxpool.Pool; redis *redis.Client }

func NewRepository(pool *pgxpool.Pool, redisClient *redis.Client) Repository { return &PostgresRepository{pool: pool, redis: redisClient} }

func (r *PostgresRepository) RecordAchievement(ctx context.Context, actorID string, req models.AchievementStreamRequest) (*models.AchievementStreamResponse, error) {
	now := time.Now().UTC()
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil { return nil, err }
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, req.UserID); err != nil { return nil, err }
	_, err = tx.Exec(ctx, `INSERT INTO engagement_achievement_events (id, achievement_id, user_id, reward_points, created_at) VALUES ($1,$2,$3,$4,$5)`, uuid.NewString(), req.AchievementID, req.UserID, req.RewardPoints, now)
	if err != nil { return nil, err }
	score, err := upsertScoreTx(ctx, tx, req.UserID, 0, 0, req.RewardPoints, now)
	if err != nil { return nil, err }
	if err := appendEventTx(ctx, tx, "engagement", req.UserID, "AchievementUnlocked", map[string]any{"achievement_id": req.AchievementID, "reward_points": req.RewardPoints, "actor_id": actorID, "timestamp": now.Format(time.RFC3339)}); err != nil { return nil, err }
	if err := appendOutboxTx(ctx, tx, "engagement", req.UserID, "AchievementUnlocked", map[string]any{"achievement_id": req.AchievementID, "user_id": req.UserID, "reward_points": req.RewardPoints}, "stella.achievements.unlocked"); err != nil { return nil, err }
	if err := tx.Commit(ctx); err != nil { return nil, err }
	if err := r.updateLeaderboard(ctx, req.UserID, score.EngagementScore); err != nil { return nil, err }
	return &models.AchievementStreamResponse{EventType: defaultString(req.EventType, "achievement_unlocked"), AchievementID: req.AchievementID, UserID: req.UserID, RewardPoints: req.RewardPoints, Timestamp: now}, nil
}

func (r *PostgresRepository) CalculatePoints(ctx context.Context, actorID string, req models.PointsCalculateRequest) (*models.PointsCalculateResponse, error) {
	now := time.Now().UTC()
	calculationID := uuid.NewString()
	points := calculatePoints(req.EventType, req.EventData)
	betting, social, achievements := componentDelta(req.EventType, points)
	body, err := json.Marshal(defaultMap(req.EventData))
	if err != nil { return nil, err }
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil { return nil, err }
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, req.UserID); err != nil { return nil, err }
	_, err = tx.Exec(ctx, `INSERT INTO engagement_point_calculations (id, user_id, event_type, event_data, points_awarded, created_at) VALUES ($1,$2,$3,$4,$5,$6)`, calculationID, req.UserID, req.EventType, body, points, now)
	if err != nil { return nil, err }
	score, err := upsertScoreTx(ctx, tx, req.UserID, betting, social, achievements, now)
	if err != nil { return nil, err }
	if err := appendEventTx(ctx, tx, "engagement", req.UserID, "PointsCalculated", map[string]any{"calculation_id": calculationID, "event_type": req.EventType, "points_awarded": points, "actor_id": actorID, "timestamp": now.Format(time.RFC3339)}); err != nil { return nil, err }
	if err := appendOutboxTx(ctx, tx, "engagement", req.UserID, "PointsCalculated", map[string]any{"calculation_id": calculationID, "user_id": req.UserID, "event_type": req.EventType, "points_awarded": points}, "stella.points.calculated"); err != nil { return nil, err }
	if err := appendOutboxTx(ctx, tx, "engagement", req.UserID, "LeaderboardUpdated", map[string]any{"user_id": req.UserID, "value": score.EngagementScore}, "stella.leaderboard.updated"); err != nil { return nil, err }
	if err := tx.Commit(ctx); err != nil { return nil, err }
	if err := r.updateLeaderboard(ctx, req.UserID, score.EngagementScore); err != nil { return nil, err }
	return &models.PointsCalculateResponse{UserID: req.UserID, PointsAwarded: points, CalculationID: calculationID}, nil
}

func (r *PostgresRepository) ComputeAggregation(ctx context.Context, actorID string, req models.AggregationComputeRequest) (*models.AggregationComputeResponse, error) {
	now := time.Now().UTC()
	aggID := uuid.NewString()
	period, err := time.Parse("2006-01-02", req.Period)
	if err != nil { return nil, err }
	var achievementCount, pointCount, totalPoints int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM engagement_achievement_events WHERE user_id = $1 AND created_at::date = $2`, req.UserID, period).Scan(&achievementCount); err != nil { return nil, err }
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*), COALESCE(SUM(points_awarded),0) FROM engagement_point_calculations WHERE user_id = $1 AND created_at::date = $2`, req.UserID, period).Scan(&pointCount, &totalPoints); err != nil { return nil, err }
	result := map[string]any{"achievement_count": achievementCount, "point_events": pointCount, "points_awarded": totalPoints}
	body, err := json.Marshal(result)
	if err != nil { return nil, err }
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil { return nil, err }
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, req.UserID); err != nil { return nil, err }
	_, err = tx.Exec(ctx, `INSERT INTO engagement_aggregations (id, user_id, aggregation_type, period, status, result, created_at, updated_at) VALUES ($1,$2,$3,$4,'completed',$5,$6,$6)`, aggID, req.UserID, req.AggregationType, period, body, now)
	if err != nil { return nil, err }
	if err := appendEventTx(ctx, tx, "engagement-aggregation", aggID, "AggregationComputed", map[string]any{"aggregation_id": aggID, "user_id": req.UserID, "aggregation_type": req.AggregationType, "period": req.Period, "actor_id": actorID}); err != nil { return nil, err }
	if err := appendOutboxTx(ctx, tx, "engagement-aggregation", aggID, "AggregationComputed", map[string]any{"aggregation_id": aggID, "user_id": req.UserID, "status": "completed"}, "stella.aggregations.updated"); err != nil { return nil, err }
	if err := tx.Commit(ctx); err != nil { return nil, err }
	return &models.AggregationComputeResponse{AggregationID: aggID, UserID: req.UserID, Status: "processing"}, nil
}

func (r *PostgresRepository) GetEngagementScore(ctx context.Context, userID string) (*models.EngagementScoreResponse, error) {
	resp := &models.EngagementScoreResponse{Components: map[string]int{}}
	var betting, social, achievements int
	if err := r.pool.QueryRow(ctx, `SELECT user_id, betting_activity, social_engagement, achievements, last_updated FROM engagement_scores WHERE user_id = $1`, userID).Scan(&resp.UserID, &betting, &social, &achievements, &resp.LastUpdated); err != nil {
		if errors.Is(err, pgx.ErrNoRows) { return nil, ErrNotFound }
		return nil, err
	}
	resp.Components["betting_activity"] = betting
	resp.Components["social_engagement"] = social
	resp.Components["achievements"] = achievements
	resp.EngagementScore = betting + social + achievements
	return resp, nil
}

func (r *PostgresRepository) GetLeaderboard(ctx context.Context, limit int) ([]models.LeaderboardEntry, error) {
	if limit <= 0 { limit = 10 }
	items, err := r.redis.ZRevRangeWithScores(ctx, leaderboardKey(), 0, int64(limit-1)).Result()
	if err != nil { return nil, err }
	entries := make([]models.LeaderboardEntry, 0, len(items))
	now := time.Now().UTC()
	for idx, item := range items {
		userID, _ := item.Member.(string)
		username := r.lookupUsername(ctx, userID)
		entries = append(entries, models.LeaderboardEntry{Rank: idx + 1, UserID: userID, Username: username, Value: int(math.Round(item.Score)), Timestamp: now})
	}
	return entries, nil
}

func (r *PostgresRepository) updateLeaderboard(ctx context.Context, userID string, value int) error {
	return r.redis.ZAdd(ctx, leaderboardKey(), redis.Z{Score: float64(value), Member: userID}).Err()
}

func (r *PostgresRepository) lookupUsername(ctx context.Context, userID string) string {
	var username string
	if err := r.pool.QueryRow(ctx, `SELECT username FROM users WHERE id = $1`, userID).Scan(&username); err != nil { return userID }
	return username
}

type scoreSnapshot struct { EngagementScore int }

func upsertScoreTx(ctx context.Context, tx pgx.Tx, userID string, bettingDelta, socialDelta, achievementDelta int, now time.Time) (*scoreSnapshot, error) {
	_, err := tx.Exec(ctx, `INSERT INTO engagement_scores (user_id, betting_activity, social_engagement, achievements, last_updated) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO UPDATE SET betting_activity = engagement_scores.betting_activity + EXCLUDED.betting_activity, social_engagement = engagement_scores.social_engagement + EXCLUDED.social_engagement, achievements = engagement_scores.achievements + EXCLUDED.achievements, last_updated = EXCLUDED.last_updated`, userID, bettingDelta, socialDelta, achievementDelta, now)
	if err != nil { return nil, err }
	var betting, social, achievements int
	if err := tx.QueryRow(ctx, `SELECT betting_activity, social_engagement, achievements FROM engagement_scores WHERE user_id = $1`, userID).Scan(&betting, &social, &achievements); err != nil { return nil, err }
	return &scoreSnapshot{EngagementScore: betting + social + achievements}, nil
}

func ensureUserExists(ctx context.Context, tx pgx.Tx, userID string) error {
	var id string
	if err := tx.QueryRow(ctx, `SELECT id FROM users WHERE id = $1`, userID).Scan(&id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) { return ErrNotFound }
		return err
	}
	return nil
}

func appendEventTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any) error {
	body, err := json.Marshal(payload)
	if err != nil { return err }
	var version int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(version), 0) + 1 FROM event_store WHERE aggregate_type = $1 AND aggregate_id = $2`, aggregateType, aggregateID).Scan(&version); err != nil { return err }
	_, err = tx.Exec(ctx, `INSERT INTO event_store (aggregate_type, aggregate_id, event_type, version, payload, metadata) VALUES ($1,$2,$3,$4,$5,'{}'::jsonb)`, aggregateType, aggregateID, eventType, version, body)
	return err
}

func appendOutboxTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any, topic string) error {
	body, err := json.Marshal(payload)
	if err != nil { return err }
	_, err = tx.Exec(ctx, `INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key) VALUES ($1,$2,$3,$4,$5,$6)`, aggregateType, aggregateID, eventType, body, topic, aggregateID)
	return err
}

func calculatePoints(eventType string, eventData map[string]any) int {
	stake := numberFromMap(eventData, "stake")
	switch strings.ToLower(strings.TrimSpace(eventType)) {
	case "bet_placed":
		return int(math.Round(stake * 1.5))
	case "follow_created", "message_sent", "social_action":
		return 25
	default:
		if stake > 0 { return int(math.Round(stake)) }
		return 10
	}
}

func componentDelta(eventType string, points int) (int, int, int) {
	switch strings.ToLower(strings.TrimSpace(eventType)) {
	case "follow_created", "message_sent", "social_action":
		return 0, points, 0
	default:
		return points, 0, 0
	}
}

func numberFromMap(values map[string]any, key string) float64 {
	if values == nil { return 0 }
	raw, ok := values[key]
	if !ok { return 0 }
	switch value := raw.(type) {
	case float64:
		return value
	case float32:
		return float64(value)
	case int:
		return float64(value)
	case int64:
		return float64(value)
	case json.Number:
		parsed, _ := value.Float64(); return parsed
	case string:
		parsed, _ := strconv.ParseFloat(strings.TrimSpace(value), 64); return parsed
	default:
		return 0
	}
}

func leaderboardKey() string { return "stella:leaderboard:weekly_points" }
func defaultString(value, fallback string) string { if strings.TrimSpace(value) == "" { return fallback }; return strings.TrimSpace(value) }
func defaultMap(value map[string]any) map[string]any { if value == nil { return map[string]any{} }; return value }
