package repository

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/phoenixbot/phoenix-notification/internal/models"
)

var ErrNotFound = errors.New("not found")

type Repository interface {
	CreateNotification(ctx context.Context, actorID string, req models.SendNotificationRequest) (*models.SendNotificationResponse, error)
	ListTemplates(ctx context.Context) (*models.TemplatesResponse, error)
	UpdateNotificationStatus(ctx context.Context, actorID, notificationID string, req models.UpdateNotificationStatusRequest) (*models.UpdateNotificationStatusResponse, error)
	GetPreferences(ctx context.Context, userID string) (*models.NotificationPreferencesResponse, error)
	UpdatePreferences(ctx context.Context, userID string, req models.UpdateNotificationPreferencesRequest) (*models.UpdateNotificationPreferencesResponse, error)
	GetNotification(ctx context.Context, notificationID string) (*models.NotificationDetail, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateNotification(ctx context.Context, actorID string, req models.SendNotificationRequest) (*models.SendNotificationResponse, error) {
	now := time.Now().UTC()
	notificationID := uuid.NewString()
	prefs, err := r.loadPreferences(ctx, req.UserID)
	if err != nil {
		return nil, err
	}
	channelStatuses := applyPreferences(req.NotificationType, req.Channels, prefs)
	overallStatus := overallStatus(channelStatuses)
	payload, err := json.Marshal(defaultMap(req.Variables))
	if err != nil {
		return nil, err
	}

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, req.UserID); err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO notifications (id, user_id, notification_type, template_id, variables, priority, status, queued_at, sent_at, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, $7, $8, $8, NULLIF($9, '')::uuid, $8, $8)
	`, notificationID, req.UserID, req.NotificationType, req.TemplateID, payload, req.Priority, overallStatus, now, actorID)
	if err != nil {
		return nil, err
	}
	for _, channel := range orderedChannels(channelStatuses) {
		status := channelStatuses[channel]
		_, err = tx.Exec(ctx, `
			INSERT INTO notification_channel_statuses (notification_id, channel, status, updated_at)
			VALUES ($1, $2, $3, $4)
		`, notificationID, channel, status, now)
		if err != nil {
			return nil, err
		}
	}
	if err := appendEventTx(ctx, tx, "notification", notificationID, "NotificationQueued", map[string]any{
		"notification_id":   notificationID,
		"user_id":           req.UserID,
		"notification_type": req.NotificationType,
		"channels":          orderedChannels(channelStatuses),
		"template_id":       req.TemplateID,
		"priority":          req.Priority,
		"status":            overallStatus,
		"actor_id":          actorID,
		"queued_at":         now.Format(time.RFC3339),
	}); err != nil {
		return nil, err
	}
	if err := appendOutboxTx(ctx, tx, "notification", notificationID, "NotificationQueued", map[string]any{
		"notification_id":   notificationID,
		"user_id":           req.UserID,
		"notification_type": req.NotificationType,
		"status":            overallStatus,
		"queued_at":         now.Format(time.RFC3339),
	}, "phoenix.notification.send"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.SendNotificationResponse{NotificationID: notificationID, UserID: req.UserID, Status: overallStatus, QueuedAt: now}, nil
}

func (r *PostgresRepository) ListTemplates(ctx context.Context) (*models.TemplatesResponse, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT type, COALESCE(name, type), COALESCE(subject_template, ''), body_template, COALESCE(push_title, ''), COALESCE(push_body, ''), COALESCE(sms_body, '')
		FROM notification_templates
		WHERE is_active = TRUE
		ORDER BY type
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	resp := &models.TemplatesResponse{Data: []models.Template{}}
	for rows.Next() {
		var item models.Template
		if err := rows.Scan(&item.TemplateID, &item.Name, &item.Subject, &item.EmailBody, &item.PushTitle, &item.PushBody, &item.SMSBody); err != nil {
			return nil, err
		}
		resp.Data = append(resp.Data, item)
	}
	return resp, rows.Err()
}

func (r *PostgresRepository) UpdateNotificationStatus(ctx context.Context, actorID, notificationID string, req models.UpdateNotificationStatusRequest) (*models.UpdateNotificationStatusResponse, error) {
	now := time.Now().UTC()
	deliveredAt := req.DeliveredAt
	if deliveredAt == nil && req.Status == "delivered" {
		deliveredAt = &now
	}
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := ensureNotificationExists(ctx, tx, notificationID); err != nil {
		return nil, err
	}
	commandTag, err := tx.Exec(ctx, `
		UPDATE notification_channel_statuses
		SET status = $3, delivered_at = $4, updated_at = $5
		WHERE notification_id = $1 AND channel = $2
	`, notificationID, req.Channel, req.Status, deliveredAt, now)
	if err != nil {
		return nil, err
	}
	if commandTag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	statuses, finalDeliveredAt, overall, err := loadChannelStatusesTx(ctx, tx, notificationID)
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `
		UPDATE notifications
		SET status = $2, delivered_at = $3, updated_at = $4
		WHERE id = $1
	`, notificationID, overall, finalDeliveredAt, now)
	if err != nil {
		return nil, err
	}
	if err := appendEventTx(ctx, tx, "notification", notificationID, "NotificationStatusUpdated", map[string]any{
		"notification_id": notificationID,
		"channel":         req.Channel,
		"status":          req.Status,
		"delivered_at":    formatTimePtr(deliveredAt),
		"actor_id":        actorID,
	}); err != nil {
		return nil, err
	}
	if err := appendOutboxTx(ctx, tx, "notification", notificationID, "NotificationStatusUpdated", map[string]any{
		"notification_id": notificationID,
		"channel":         req.Channel,
		"status":          req.Status,
		"delivered_at":    formatTimePtr(deliveredAt),
	}, "phoenix.notification.delivered"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.UpdateNotificationStatusResponse{NotificationID: notificationID, ChannelStatuses: statuses}, nil
}

func (r *PostgresRepository) GetPreferences(ctx context.Context, userID string) (*models.NotificationPreferencesResponse, error) {
	prefs, err := r.loadPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &models.NotificationPreferencesResponse{UserID: userID, Preferences: prefs}, nil
}

func (r *PostgresRepository) UpdatePreferences(ctx context.Context, userID string, req models.UpdateNotificationPreferencesRequest) (*models.UpdateNotificationPreferencesResponse, error) {
	now := time.Now().UTC()
	existing, err := r.loadPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}
	updated := mergePreferences(existing, req)
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, userID); err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO notification_preferences (user_id, marketing_emails, bet_notifications, promotional_sms, push_notifications, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::time, NULLIF($8, '')::time, $9)
		ON CONFLICT (user_id)
		DO UPDATE SET marketing_emails = EXCLUDED.marketing_emails,
			bet_notifications = EXCLUDED.bet_notifications,
			promotional_sms = EXCLUDED.promotional_sms,
			push_notifications = EXCLUDED.push_notifications,
			quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
			quiet_hours_start = EXCLUDED.quiet_hours_start,
			quiet_hours_end = EXCLUDED.quiet_hours_end,
			updated_at = EXCLUDED.updated_at
	`, userID, updated.MarketingEmails, updated.BetNotifications, updated.PromotionalSMS, updated.PushNotifications, updated.QuietHours.Enabled, emptyIfDisabled(updated.QuietHours.Start, updated.QuietHours.Enabled), emptyIfDisabled(updated.QuietHours.End, updated.QuietHours.Enabled), now)
	if err != nil {
		return nil, err
	}
	if err := appendEventTx(ctx, tx, "notification-preferences", userID, "NotificationPreferencesUpdated", map[string]any{
		"user_id":             userID,
		"marketing_emails":    updated.MarketingEmails,
		"bet_notifications":   updated.BetNotifications,
		"promotional_sms":     updated.PromotionalSMS,
		"push_notifications":  updated.PushNotifications,
		"quiet_hours_enabled": updated.QuietHours.Enabled,
		"updated_at":          now.Format(time.RFC3339),
	}); err != nil {
		return nil, err
	}
	if err := appendOutboxTx(ctx, tx, "notification-preferences", userID, "NotificationPreferencesUpdated", map[string]any{
		"user_id":    userID,
		"updated_at": now.Format(time.RFC3339),
	}, "phoenix.notification.preferences-updated"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.UpdateNotificationPreferencesResponse{UserID: userID, UpdatedAt: now}, nil
}

func (r *PostgresRepository) GetNotification(ctx context.Context, notificationID string) (*models.NotificationDetail, error) {
	item := &models.NotificationDetail{ChannelStatuses: map[string]string{}}
	if err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, notification_type, status, sent_at, delivered_at
		FROM notifications WHERE id = $1
	`, notificationID).Scan(&item.NotificationID, &item.UserID, &item.NotificationType, &item.Status, &item.SentAt, &item.DeliveredAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT channel, status FROM notification_channel_statuses WHERE notification_id = $1 ORDER BY channel
	`, notificationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var channel, status string
		if err := rows.Scan(&channel, &status); err != nil {
			return nil, err
		}
		item.ChannelStatuses[channel] = status
	}
	return item, rows.Err()
}

func (r *PostgresRepository) loadPreferences(ctx context.Context, userID string) (models.NotificationPreferences, error) {
	if err := ensureUserExistsPool(ctx, r.pool, userID); err != nil {
		return models.NotificationPreferences{}, err
	}
	prefs := defaultPreferences()
	var start, end *string
	err := r.pool.QueryRow(ctx, `
		SELECT marketing_emails, bet_notifications, promotional_sms, push_notifications, quiet_hours_enabled,
			CASE WHEN quiet_hours_start IS NULL THEN NULL ELSE TO_CHAR(quiet_hours_start, 'HH24:MI') END,
			CASE WHEN quiet_hours_end IS NULL THEN NULL ELSE TO_CHAR(quiet_hours_end, 'HH24:MI') END
		FROM notification_preferences WHERE user_id = $1
	`, userID).Scan(&prefs.MarketingEmails, &prefs.BetNotifications, &prefs.PromotionalSMS, &prefs.PushNotifications, &prefs.QuietHours.Enabled, &start, &end)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return prefs, nil
		}
		return models.NotificationPreferences{}, err
	}
	if start != nil {
		prefs.QuietHours.Start = *start
	}
	if end != nil {
		prefs.QuietHours.End = *end
	}
	return prefs, nil
}

func loadChannelStatusesTx(ctx context.Context, tx pgx.Tx, notificationID string) (map[string]string, *time.Time, string, error) {
	rows, err := tx.Query(ctx, `
		SELECT channel, status, delivered_at
		FROM notification_channel_statuses
		WHERE notification_id = $1
	`, notificationID)
	if err != nil {
		return nil, nil, "", err
	}
	defer rows.Close()
	statuses := map[string]string{}
	var deliveredAt *time.Time
	for rows.Next() {
		var channel, status string
		var channelDeliveredAt *time.Time
		if err := rows.Scan(&channel, &status, &channelDeliveredAt); err != nil {
			return nil, nil, "", err
		}
		statuses[channel] = status
		if channelDeliveredAt != nil && (deliveredAt == nil || channelDeliveredAt.After(*deliveredAt)) {
			ts := channelDeliveredAt.UTC()
			deliveredAt = &ts
		}
	}
	if err := rows.Err(); err != nil {
		return nil, nil, "", err
	}
	return statuses, deliveredAt, overallStatus(statuses), nil
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

func ensureNotificationExists(ctx context.Context, tx pgx.Tx, notificationID string) error {
	var id string
	if err := tx.QueryRow(ctx, `SELECT id FROM notifications WHERE id = $1`, notificationID).Scan(&id); err != nil {
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

func defaultPreferences() models.NotificationPreferences {
	return models.NotificationPreferences{
		MarketingEmails:   true,
		BetNotifications:  true,
		PromotionalSMS:    false,
		PushNotifications: true,
		QuietHours:        models.QuietHours{Enabled: false},
	}
}

func mergePreferences(existing models.NotificationPreferences, req models.UpdateNotificationPreferencesRequest) models.NotificationPreferences {
	updated := existing
	if req.MarketingEmails != nil {
		updated.MarketingEmails = *req.MarketingEmails
	}
	if req.BetNotifications != nil {
		updated.BetNotifications = *req.BetNotifications
	}
	if req.PromotionalSMS != nil {
		updated.PromotionalSMS = *req.PromotionalSMS
	}
	if req.PushNotifications != nil {
		updated.PushNotifications = *req.PushNotifications
	}
	if req.QuietHours != nil {
		updated.QuietHours = *req.QuietHours
	}
	return updated
}

func applyPreferences(notificationType string, channels []string, prefs models.NotificationPreferences) map[string]string {
	statuses := map[string]string{}
	nType := strings.ToLower(strings.TrimSpace(notificationType))
	isBet := strings.Contains(nType, "bet")
	isPromo := strings.Contains(nType, "promo") || strings.Contains(nType, "marketing") || strings.Contains(nType, "campaign") || strings.Contains(nType, "bonus")
	for _, channel := range uniqueChannels(channels) {
		status := "queued"
		switch channel {
		case "email":
			if isBet && !prefs.BetNotifications {
				status = "suppressed"
			}
			if isPromo && !prefs.MarketingEmails {
				status = "suppressed"
			}
		case "push":
			if !prefs.PushNotifications || (isBet && !prefs.BetNotifications) {
				status = "suppressed"
			}
		case "sms":
			if isPromo && !prefs.PromotionalSMS {
				status = "suppressed"
			}
		default:
			status = "suppressed"
		}
		statuses[channel] = status
	}
	return statuses
}

func uniqueChannels(channels []string) []string {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(channels))
	for _, channel := range channels {
		normalized := strings.ToLower(strings.TrimSpace(channel))
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	sort.Strings(result)
	return result
}

func orderedChannels(statuses map[string]string) []string {
	result := make([]string, 0, len(statuses))
	for channel := range statuses {
		result = append(result, channel)
	}
	sort.Strings(result)
	return result
}

func overallStatus(statuses map[string]string) string {
	if len(statuses) == 0 {
		return "queued"
	}
	allSuppressed := true
	allDeliveredOrSuppressed := true
	anyDelivered := false
	anyFailed := false
	for _, status := range statuses {
		if status != "suppressed" {
			allSuppressed = false
		}
		if status != "delivered" && status != "suppressed" {
			allDeliveredOrSuppressed = false
		}
		if status == "delivered" {
			anyDelivered = true
		}
		if status == "failed" {
			anyFailed = true
		}
	}
	if allSuppressed {
		return "suppressed"
	}
	if allDeliveredOrSuppressed && anyDelivered {
		return "delivered"
	}
	if anyFailed && !anyDelivered {
		return "failed"
	}
	if anyDelivered {
		return "partial"
	}
	return "queued"
}

func emptyIfDisabled(value string, enabled bool) string {
	if !enabled {
		return ""
	}
	return strings.TrimSpace(value)
}

func defaultMap(value map[string]any) map[string]any {
	if value == nil {
		return map[string]any{}
	}
	return value
}

func formatTimePtr(value *time.Time) any {
	if value == nil {
		return nil
	}
	return value.UTC().Format(time.RFC3339)
}
