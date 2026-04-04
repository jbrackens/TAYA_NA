package repository

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
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

	"github.com/phoenixbot/phoenix-social/internal/models"
)

var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("conflict")
)

type Repository interface {
	GetProfile(ctx context.Context, viewerID, targetID string) (*models.UserProfile, error)
	FollowUser(ctx context.Context, followerID, targetID string) (*models.Follow, error)
	ListFollowers(ctx context.Context, userID string, page, limit int) ([]models.FollowerPreview, int, error)
	ListFeed(ctx context.Context, userID, feedType string, page, limit int) ([]models.FeedItem, error)
	CreateMessage(ctx context.Context, fromUserID string, req models.SendMessageRequest) (*models.Message, error)
	GetConversation(ctx context.Context, requesterID, conversationID string, page, limit int) (*models.Conversation, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) GetProfile(ctx context.Context, viewerID, targetID string) (*models.UserProfile, error) {
	const query = `
		SELECT
			u.id,
			u.username,
			COALESCE(NULLIF(sp.display_name, ''), NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.username),
			COALESCE(sp.avatar_url, ''),
			COALESCE(sp.bio, ''),
			(SELECT COUNT(*) FROM social_follows WHERE following_user_id = u.id) AS follower_count,
			(SELECT COUNT(*) FROM social_follows WHERE follower_user_id = u.id) AS following_count,
			(SELECT COUNT(*) FROM bets WHERE user_id = u.id) AS total_bets,
			COALESCE((SELECT COUNT(*) FROM bets WHERE user_id = u.id AND status = 'won'), 0) AS won_bets,
			COALESCE((
				SELECT SUM(
					CASE
						WHEN status = 'won' THEN potential_payout - stake
						WHEN status = 'lost' THEN -stake
						ELSE 0
					END
				)
				FROM bets WHERE user_id = u.id
			), 0) AS total_profit,
			CASE WHEN $2 <> '' THEN EXISTS (
				SELECT 1 FROM social_follows WHERE follower_user_id = $2::uuid AND following_user_id = u.id
			) ELSE FALSE END AS is_followed
		FROM users u
		LEFT JOIN social_profiles sp ON sp.user_id = u.id
		WHERE u.id = $1
	`
	var (
		profile models.UserProfile
		wonBets int
	)
	if err := r.pool.QueryRow(ctx, query, targetID, viewerID).Scan(
		&profile.UserID,
		&profile.Username,
		&profile.DisplayName,
		&profile.AvatarURL,
		&profile.Bio,
		&profile.FollowerCount,
		&profile.FollowingCount,
		&profile.Stats.TotalBets,
		&wonBets,
		&profile.Stats.TotalProfit,
		&profile.IsFollowed,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query profile: %w", err)
	}
	if profile.Stats.TotalBets > 0 {
		profile.Stats.WinRate = decimal.NewFromInt(int64(wonBets)).Div(decimal.NewFromInt(int64(profile.Stats.TotalBets)))
	} else {
		profile.Stats.WinRate = decimal.Zero
	}
	return &profile, nil
}

func (r *PostgresRepository) FollowUser(ctx context.Context, followerID, targetID string) (*models.Follow, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if _, err := ensureUserExists(ctx, tx, followerID); err != nil {
		return nil, err
	}
	if _, err := ensureUserExists(ctx, tx, targetID); err != nil {
		return nil, err
	}
	followedAt := time.Now().UTC()
	commandTag, err := tx.Exec(ctx, `
		INSERT INTO social_follows (follower_user_id, following_user_id, followed_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (follower_user_id, following_user_id) DO NOTHING
	`, followerID, targetID, followedAt)
	if err != nil {
		return nil, err
	}
	if commandTag.RowsAffected() == 0 {
		return nil, ErrConflict
	}
	if err := appendOutboxTx(ctx, tx, "social-follow", followerID, "UserFollowed", map[string]any{
		"follower_id":  followerID,
		"following_id": targetID,
		"followed_at":  followedAt.Format(time.RFC3339),
	}, "phoenix.social.followed"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.Follow{FollowerID: followerID, FollowingID: targetID, FollowedAt: followedAt}, nil
}

func (r *PostgresRepository) ListFollowers(ctx context.Context, userID string, page, limit int) ([]models.FollowerPreview, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM social_follows WHERE following_user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT
			u.id,
			u.username,
			COALESCE(sp.avatar_url, ''),
			CASE WHEN EXISTS (
				SELECT 1 FROM social_follows reciprocal
				WHERE reciprocal.follower_user_id = $1 AND reciprocal.following_user_id = sf.follower_user_id
			) THEN 'mutual' ELSE 'following' END AS follow_status
		FROM social_follows sf
		JOIN users u ON u.id = sf.follower_user_id
		LEFT JOIN social_profiles sp ON sp.user_id = u.id
		WHERE sf.following_user_id = $1
		ORDER BY sf.followed_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	followers := make([]models.FollowerPreview, 0, limit)
	for rows.Next() {
		var item models.FollowerPreview
		if err := rows.Scan(&item.UserID, &item.Username, &item.AvatarURL, &item.FollowStatus); err != nil {
			return nil, 0, err
		}
		followers = append(followers, item)
	}
	return followers, total, rows.Err()
}

func (r *PostgresRepository) ListFeed(ctx context.Context, userID, feedType string, page, limit int) ([]models.FeedItem, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	baseQuery := `
		SELECT
			b.id,
			u.id,
			u.username,
			COALESCE(e.name, m.name, 'Unknown market') AS market_name,
			COALESCE(o.name, '') AS outcome_name,
			b.stake,
			b.odds_at_placement,
			b.created_at
		FROM bets b
		JOIN users u ON u.id = b.user_id
		LEFT JOIN markets m ON m.id = b.market_id
		LEFT JOIN events e ON e.id = m.event_id
		LEFT JOIN outcomes o ON o.id = b.outcome_id
		WHERE %s
		ORDER BY b.created_at DESC
		LIMIT %s OFFSET %s
	`
	query := ""
	args := []any{}
	if strings.EqualFold(feedType, "friends") {
		query = fmt.Sprintf(baseQuery, `EXISTS (
			SELECT 1 FROM social_follows sf
			WHERE sf.follower_user_id = $1 AND sf.following_user_id = b.user_id
		)`, "$2", "$3")
		args = []any{userID, limit, offset}
	} else {
		query = fmt.Sprintf(baseQuery, "TRUE", "$1", "$2")
		args = []any{limit, offset}
	}
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.FeedItem, 0, limit)
	for rows.Next() {
		var item models.FeedItem
		item.ActivityType = "bet_placed"
		if err := rows.Scan(
			&item.ActivityID,
			&item.UserID,
			&item.Username,
			&item.Details.Market,
			&item.Details.Outcome,
			&item.Details.Stake,
			&item.Details.Odds,
			&item.Timestamp,
		); err != nil {
			return nil, err
		}
		item.Details.BetID = item.ActivityID
		item.ActivityID = "act_" + item.ActivityID
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PostgresRepository) CreateMessage(ctx context.Context, fromUserID string, req models.SendMessageRequest) (*models.Message, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if _, err := ensureUserExists(ctx, tx, fromUserID); err != nil {
		return nil, err
	}
	if _, err := ensureUserExists(ctx, tx, req.ToUserID); err != nil {
		return nil, err
	}
	messageID := uuid.NewString()
	conversationID := buildConversationID(fromUserID, req.ToUserID)
	sentAt := time.Now().UTC()
	if _, err := tx.Exec(ctx, `
		INSERT INTO social_messages (id, conversation_id, from_user_id, to_user_id, message, message_type, sent_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, messageID, conversationID, fromUserID, req.ToUserID, req.Message, req.MessageType, sentAt); err != nil {
		return nil, err
	}
	if err := appendOutboxTx(ctx, tx, "social-message", messageID, "MessageSent", map[string]any{
		"message_id":      messageID,
		"conversation_id": conversationID,
		"from_user_id":    fromUserID,
		"to_user_id":      req.ToUserID,
		"message_type":    req.MessageType,
		"sent_at":         sentAt.Format(time.RFC3339),
	}, "phoenix.social.message-sent"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.Message{MessageID: messageID, FromUserID: fromUserID, ToUserID: req.ToUserID, Message: req.Message, SentAt: sentAt, Read: false}, nil
}

func (r *PostgresRepository) GetConversation(ctx context.Context, requesterID, conversationID string, page, limit int) (*models.Conversation, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var fromID, toID string
	if err := tx.QueryRow(ctx, `
		SELECT from_user_id, to_user_id
		FROM social_messages
		WHERE conversation_id = $1
		ORDER BY sent_at ASC
		LIMIT 1
	`, conversationID).Scan(&fromID, &toID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if requesterID != fromID && requesterID != toID {
		return nil, ErrNotFound
	}
	if _, err := tx.Exec(ctx, `
		UPDATE social_messages
		SET read_at = CURRENT_TIMESTAMP
		WHERE conversation_id = $1 AND to_user_id = $2 AND read_at IS NULL
	`, conversationID, requesterID); err != nil {
		return nil, err
	}
	rows, err := tx.Query(ctx, `
		SELECT id, from_user_id, to_user_id, message, sent_at, read_at
		FROM social_messages
		WHERE conversation_id = $1
		ORDER BY sent_at ASC
		LIMIT $2 OFFSET $3
	`, conversationID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	conversation := &models.Conversation{ConversationID: conversationID}
	if requesterID == fromID {
		conversation.WithUserID = toID
	} else {
		conversation.WithUserID = fromID
	}
	conversation.Messages = make([]models.Message, 0, limit)
	for rows.Next() {
		var item models.Message
		var readAt *time.Time
		if err := rows.Scan(&item.MessageID, &item.FromUserID, &item.ToUserID, &item.Message, &item.SentAt, &readAt); err != nil {
			return nil, err
		}
		item.Read = readAt != nil
		conversation.Messages = append(conversation.Messages, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return conversation, nil
}

func ensureUserExists(ctx context.Context, tx pgx.Tx, userID string) (string, error) {
	var id string
	if err := tx.QueryRow(ctx, `SELECT id FROM users WHERE id = $1`, userID).Scan(&id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return id, nil
}

func appendOutboxTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any, topic string) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, aggregateType, aggregateID, eventType, body, topic, aggregateID)
	return err
}

func buildConversationID(a, b string) string {
	parts := []string{strings.TrimSpace(a), strings.TrimSpace(b)}
	sort.Strings(parts)
	hash := sha1.Sum([]byte(strings.Join(parts, ":")))
	return "conv_" + hex.EncodeToString(hash[:])
}
