package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/phoenixbot/phoenix-audit/internal/models"
)

var ErrNotFound = errors.New("not found")

type Repository interface {
	GetAuditLogs(ctx context.Context, filters models.AuditLogFilters) (*models.AuditLogsResponse, error)
	ExportAuditLogs(ctx context.Context, filters models.AuditLogFilters) ([]models.AuditLogEntry, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) GetAuditLogs(ctx context.Context, filters models.AuditLogFilters) (*models.AuditLogsResponse, error) {
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	sortBy := normalizeSortBy(filters.SortBy)
	sortDir := normalizeSortDir(filters.SortDir)

	whereClause, args, argPos := buildAuditLogFilter(filters)
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM audit_log WHERE %s`, whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT id::text, user_id::text, action, entity_type, entity_id, old_value, new_value, ip_address::text, created_at
		FROM audit_log
		WHERE %s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortBy, sortDir, argPos, argPos+1)
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items, err := scanAuditLogRows(rows)
	if err != nil {
		return nil, err
	}

	return &models.AuditLogsResponse{
		Data: items,
		Pagination: models.Pagination{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	}, nil
}

func (r *PostgresRepository) ExportAuditLogs(ctx context.Context, filters models.AuditLogFilters) ([]models.AuditLogEntry, error) {
	sortBy := normalizeSortBy(filters.SortBy)
	sortDir := normalizeSortDir(filters.SortDir)
	whereClause, args, _ := buildAuditLogFilter(filters)

	query := fmt.Sprintf(`
		SELECT id::text, user_id::text, action, entity_type, entity_id, old_value, new_value, ip_address::text, created_at
		FROM audit_log
		WHERE %s
		ORDER BY %s %s
	`, whereClause, sortBy, sortDir)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanAuditLogRows(rows)
}

func buildAuditLogFilter(filters models.AuditLogFilters) (string, []any, int) {
	conditions := []string{"1=1"}
	args := []any{}
	argPos := 1

	if action := strings.TrimSpace(filters.Action); action != "" {
		conditions = append(conditions, fmt.Sprintf("action = $%d", argPos))
		args = append(args, action)
		argPos++
	}
	if actorID := strings.TrimSpace(filters.ActorID); actorID != "" {
		conditions = append(conditions, fmt.Sprintf("user_id = $%d::uuid", argPos))
		args = append(args, actorID)
		argPos++
	}
	if targetID := strings.TrimSpace(filters.TargetID); targetID != "" {
		conditions = append(conditions, fmt.Sprintf("entity_id = $%d", argPos))
		args = append(args, targetID)
		argPos++
	}
	if userID := strings.TrimSpace(filters.UserID); userID != "" {
		conditions = append(conditions, fmt.Sprintf("(user_id = $%d::uuid OR entity_id = $%d)", argPos, argPos))
		args = append(args, userID)
		argPos++
	}
	if product := normalizeProduct(filters.Product); product != "" {
		switch product {
		case "prediction":
			conditions = append(conditions, "(entity_type LIKE 'prediction%' OR action LIKE 'prediction.%')")
		case "sportsbook":
			conditions = append(conditions, "NOT (entity_type LIKE 'prediction%' OR action LIKE 'prediction.%')")
		}
	}

	return strings.Join(conditions, " AND "), args, argPos
}

func scanAuditLogRows(rows pgx.Rows) ([]models.AuditLogEntry, error) {
	items := make([]models.AuditLogEntry, 0)
	for rows.Next() {
		var (
			entry       models.AuditLogEntry
			actorID     *string
			entityID    *string
			ipAddress   *string
			oldValueRaw []byte
			newValueRaw []byte
		)
		if err := rows.Scan(&entry.ID, &actorID, &entry.Action, &entry.EntityType, &entityID, &oldValueRaw, &newValueRaw, &ipAddress, &entry.CreatedAt); err != nil {
			return nil, err
		}
		entry.ActorID = actorID
		entry.EntityID = entityID
		entry.IPAddress = ipAddress
		entry.Product = deriveProduct(entry.EntityType, entry.Action)
		entry.OldValue = decodeJSON(oldValueRaw)
		entry.NewValue = decodeJSON(newValueRaw)
		items = append(items, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func decodeJSON(value []byte) any {
	if len(value) == 0 {
		return nil
	}
	var decoded any
	if err := json.Unmarshal(value, &decoded); err != nil {
		return map[string]any{"raw": string(value)}
	}
	return decoded
}

func deriveProduct(entityType, action string) string {
	if strings.HasPrefix(entityType, "prediction") || strings.HasPrefix(action, "prediction.") {
		return "prediction"
	}
	return "sportsbook"
}

func normalizeProduct(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "prediction", "prediction-market", "prediction_markets":
		return "prediction"
	case "sportsbook", "sports", "betting":
		return "sportsbook"
	default:
		return ""
	}
}

func normalizeSortBy(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "action":
		return "action"
	case "entity_type":
		return "entity_type"
	case "created_at", "":
		return "created_at"
	default:
		return "created_at"
	}
}

func normalizeSortDir(value string) string {
	if strings.EqualFold(strings.TrimSpace(value), "asc") {
		return "ASC"
	}
	return "DESC"
}

func appendAuditLogTx(ctx context.Context, tx pgx.Tx, entry models.AuditLogEntry) error {
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
	`, entry.ID, valueOrEmpty(entry.ActorID), entry.Action, entry.EntityType, valueOrEmpty(entry.EntityID), oldValue, newValue, valueOrEmpty(entry.IPAddress), entry.CreatedAt.UTC())
	return err
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func pointer(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	trimmed := strings.TrimSpace(value)
	return &trimmed
}

var _ = time.Now
