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

	"github.com/phoenixbot/phoenix-compliance/internal/models"
)

var (
	ErrNotFound = errors.New("not found")
)

type Repository interface {
	SetLimit(ctx context.Context, actorID, userID string, req models.SetLimitRequest) (*models.Limit, error)
	GetLimits(ctx context.Context, userID string) (*models.LimitsResponse, error)
	GetLimitHistory(ctx context.Context, userID string, page, itemsPerPage int) (*models.LimitHistoryResponse, error)
	CreateSelfExclusion(ctx context.Context, actorID, userID string, req models.SelfExcludeRequest) (*models.SelfExclusion, error)
	DisableActiveCoolOff(ctx context.Context, actorID, userID, reason string) (*models.SelfExclusion, error)
	GetCoolOffHistory(ctx context.Context, userID string, page, itemsPerPage int) (*models.CoolOffHistoryResponse, error)
	AcceptResponsibilityCheck(ctx context.Context, actorID, userID string) (*models.ResponsibilityCheckAcceptance, error)
	GetRestrictions(ctx context.Context, userID string) (*models.RestrictionsResponse, error)
	CreateAMLCheck(ctx context.Context, actorID string, req models.AMLCheckRequest) (*models.AMLCheck, error)
	GetAMLCheck(ctx context.Context, checkID string) (*models.AMLCheck, error)
	CreateComplianceAlert(ctx context.Context, actorID string, req models.ComplianceAlertRequest) (*models.ComplianceAlert, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) SetLimit(ctx context.Context, actorID, userID string, req models.SetLimitRequest) (*models.Limit, error) {
	now := time.Now().UTC()
	limitID := uuid.NewString()
	setAt := now
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, userID); err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO compliance_limits (id, user_id, limit_type, limit_amount, currency, effective_date, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::uuid, $8, $8)
		ON CONFLICT (user_id, limit_type)
		DO UPDATE SET limit_amount = EXCLUDED.limit_amount, currency = EXCLUDED.currency, effective_date = EXCLUDED.effective_date, created_by = EXCLUDED.created_by, updated_at = EXCLUDED.updated_at
	`, limitID, userID, req.LimitType, req.LimitAmount, strings.ToUpper(req.Currency), req.EffectiveDate.UTC(), actorID, now)
	if err != nil {
		return nil, err
	}
	if err := appendEventTx(ctx, tx, "compliance-limit", limitID, "ComplianceLimitSet", map[string]any{
		"user_id": userID, "limit_type": req.LimitType, "limit_amount": req.LimitAmount.String(), "currency": strings.ToUpper(req.Currency), "effective_date": req.EffectiveDate.UTC().Format(time.RFC3339), "actor_id": actorID,
	}); err != nil {
		return nil, err
	}
	if err := appendOutboxTx(ctx, tx, "compliance-limit", limitID, "ComplianceLimitSet", map[string]any{
		"user_id": userID, "limit_id": limitID, "limit_type": req.LimitType, "limit_amount": req.LimitAmount.String(), "currency": strings.ToUpper(req.Currency), "set_at": setAt.Format(time.RFC3339),
	}, "phoenix.compliance.limit-set"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	current, periodStart, err := r.currentPeriodValue(ctx, userID, req.LimitType, req.EffectiveDate.UTC())
	if err != nil {
		return nil, err
	}
	return &models.Limit{UserID: userID, LimitID: limitID, LimitType: req.LimitType, LimitAmount: req.LimitAmount, CurrentPeriodLoss: current, PeriodStart: &periodStart, SetAt: &setAt, Currency: strings.ToUpper(req.Currency)}, nil
}

func (r *PostgresRepository) GetLimits(ctx context.Context, userID string) (*models.LimitsResponse, error) {
	if err := ensureUserExistsPool(ctx, r.pool, userID); err != nil {
		return nil, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, limit_type, limit_amount, currency, effective_date, created_at
		FROM compliance_limits
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	response := &models.LimitsResponse{UserID: userID, Limits: []models.Limit{}}
	for rows.Next() {
		var item models.Limit
		var effectiveDate time.Time
		var createdAt time.Time
		if err := rows.Scan(&item.LimitID, &item.LimitType, &item.LimitAmount, &item.Currency, &effectiveDate, &createdAt); err != nil {
			return nil, err
		}
		current, periodStart, err := r.currentPeriodValue(ctx, userID, item.LimitType, effectiveDate)
		if err != nil {
			return nil, err
		}
		item.UserID = userID
		item.CurrentPeriodLoss = current
		item.PeriodStart = &periodStart
		item.SetAt = &createdAt
		response.Limits = append(response.Limits, item)
	}
	return response, rows.Err()
}

func (r *PostgresRepository) GetLimitHistory(ctx context.Context, userID string, page, itemsPerPage int) (*models.LimitHistoryResponse, error) {
	if err := ensureUserExistsPool(ctx, r.pool, userID); err != nil {
		return nil, err
	}
	offset := paginationOffset(page, itemsPerPage)
	var totalCount int
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM event_store
		WHERE event_type = 'ComplianceLimitSet'
		  AND payload->>'user_id' = $1
	`, userID).Scan(&totalCount); err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT payload, created_at
		FROM event_store
		WHERE event_type = 'ComplianceLimitSet'
		  AND payload->>'user_id' = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, itemsPerPage, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type limitEventPayload struct {
		LimitType     string `json:"limit_type"`
		LimitAmount   string `json:"limit_amount"`
		EffectiveDate string `json:"effective_date"`
	}

	response := &models.LimitHistoryResponse{
		Data:         []models.LimitHistoryEntry{},
		HasNextPage:  offset+itemsPerPage < totalCount,
		ItemsPerPage: itemsPerPage,
		TotalCount:   totalCount,
	}
	for rows.Next() {
		var payloadBytes []byte
		var createdAt time.Time
		if err := rows.Scan(&payloadBytes, &createdAt); err != nil {
			return nil, err
		}
		var payload limitEventPayload
		if err := json.Unmarshal(payloadBytes, &payload); err != nil {
			return nil, err
		}
		effectiveFrom, err := time.Parse(time.RFC3339, payload.EffectiveDate)
		if err != nil {
			return nil, fmt.Errorf("parse effective date: %w", err)
		}
		limitTypeLabel, period := normalizeLimitHistoryType(payload.LimitType)
		response.Data = append(response.Data, models.LimitHistoryEntry{
			Period:        period,
			Limit:         payload.LimitAmount,
			EffectiveFrom: effectiveFrom.UTC(),
			LimitType:     limitTypeLabel,
			RequestedAt:   createdAt.UTC(),
		})
	}
	return response, rows.Err()
}

func (r *PostgresRepository) CreateSelfExclusion(ctx context.Context, actorID, userID string, req models.SelfExcludeRequest) (*models.SelfExclusion, error) {
	now := time.Now().UTC()
	exclusionID := uuid.NewString()
	var expiresAt *time.Time
	if req.DurationDays != nil {
		ts := now.Add(time.Duration(*req.DurationDays) * 24 * time.Hour)
		expiresAt = &ts
	}
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, userID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET is_active = FALSE, updated_at = $2 WHERE id = $1`, userID, now); err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO self_exclusions (id, user_id, exclusion_type, reason, duration_days, effective_at, expires_at, status, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NULLIF($8, '')::uuid, $6, $6)
	`, exclusionID, userID, req.ExclusionType, req.Reason, req.DurationDays, now, expiresAt, actorID)
	if err != nil {
		return nil, err
	}
	if err := appendEventTx(ctx, tx, "self-exclusion", exclusionID, "SelfExclusionCreated", map[string]any{
		"user_id": userID, "exclusion_type": req.ExclusionType, "reason": req.Reason, "duration_days": req.DurationDays, "effective_at": now.Format(time.RFC3339), "actor_id": actorID,
	}); err != nil {
		return nil, err
	}
	if err := appendOutboxTx(ctx, tx, "self-exclusion", exclusionID, "SelfExclusionCreated", map[string]any{
		"user_id": userID, "exclusion_id": exclusionID, "exclusion_type": req.ExclusionType, "effective_at": now.Format(time.RFC3339), "status": "active",
	}, "phoenix.compliance.self-excluded"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.SelfExclusion{UserID: userID, ExclusionID: exclusionID, ExclusionType: req.ExclusionType, EffectiveAt: now, Status: "active"}, nil
}

func (r *PostgresRepository) DisableActiveCoolOff(ctx context.Context, actorID, userID, reason string) (*models.SelfExclusion, error) {
	now := time.Now().UTC()
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, userID); err != nil {
		return nil, err
	}

	var exclusionID string
	var effectiveAt time.Time
	err = tx.QueryRow(ctx, `
		WITH updated AS (
			UPDATE self_exclusions
			SET status = 'cancelled', expires_at = $2, updated_at = $2
			WHERE user_id = $1
			  AND exclusion_type = 'temporary'
			  AND status = 'active'
			RETURNING id, effective_at
		)
		SELECT id, effective_at
		FROM updated
		ORDER BY effective_at DESC
		LIMIT 1
	`, userID, now).Scan(&exclusionID, &effectiveAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE users
		SET is_active = NOT EXISTS (
			SELECT 1
			FROM self_exclusions
			WHERE user_id = $1
			  AND status = 'active'
		), updated_at = $2
		WHERE id = $1
	`, userID, now); err != nil {
		return nil, err
	}

	if err := appendEventTx(ctx, tx, "self-exclusion", exclusionID, "SelfExclusionCancelled", map[string]any{
		"user_id": userID, "exclusion_id": exclusionID, "exclusion_type": "temporary", "reason": reason, "cancelled_at": now.Format(time.RFC3339), "actor_id": actorID,
	}); err != nil {
		return nil, err
	}
	if err := appendOutboxTx(ctx, tx, "self-exclusion", exclusionID, "SelfExclusionCancelled", map[string]any{
		"user_id": userID, "exclusion_id": exclusionID, "exclusion_type": "temporary", "status": "cancelled", "cancelled_at": now.Format(time.RFC3339),
	}, "phoenix.compliance.self-exclusion-cancelled"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &models.SelfExclusion{
		UserID:        userID,
		ExclusionID:   exclusionID,
		ExclusionType: "temporary",
		EffectiveAt:   effectiveAt.UTC(),
		Status:        "cancelled",
	}, nil
}

func (r *PostgresRepository) GetCoolOffHistory(ctx context.Context, userID string, page, itemsPerPage int) (*models.CoolOffHistoryResponse, error) {
	if err := ensureUserExistsPool(ctx, r.pool, userID); err != nil {
		return nil, err
	}
	offset := paginationOffset(page, itemsPerPage)
	var totalCount int
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM self_exclusions
		WHERE user_id = $1 AND exclusion_type = 'temporary'
	`, userID).Scan(&totalCount); err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT reason, effective_at, expires_at
		FROM self_exclusions
		WHERE user_id = $1 AND exclusion_type = 'temporary'
		ORDER BY effective_at DESC
		LIMIT $2 OFFSET $3
	`, userID, itemsPerPage, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	response := &models.CoolOffHistoryResponse{
		Data:         []models.CoolOffHistoryEntry{},
		HasNextPage:  offset+itemsPerPage < totalCount,
		ItemsPerPage: itemsPerPage,
		TotalCount:   totalCount,
	}
	for rows.Next() {
		var item models.CoolOffHistoryEntry
		if err := rows.Scan(&item.Reason, &item.CoolOffStart, &item.CoolOffEnd); err != nil {
			return nil, err
		}
		item.CoolOffStart = item.CoolOffStart.UTC()
		if item.CoolOffEnd != nil {
			end := item.CoolOffEnd.UTC()
			item.CoolOffEnd = &end
		}
		response.Data = append(response.Data, item)
	}
	return response, rows.Err()
}

func (r *PostgresRepository) AcceptResponsibilityCheck(ctx context.Context, actorID, userID string) (*models.ResponsibilityCheckAcceptance, error) {
	now := time.Now().UTC()
	checkID := uuid.NewString()
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, userID); err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO responsibility_checks (id, user_id, accepted_at, accepted_by, created_at, updated_at)
		VALUES ($1, $2, $3, NULLIF($4, '')::uuid, $3, $3)
		ON CONFLICT (user_id)
		DO UPDATE SET accepted_at = EXCLUDED.accepted_at, accepted_by = EXCLUDED.accepted_by, updated_at = EXCLUDED.updated_at
	`, checkID, userID, now, actorID)
	if err != nil {
		return nil, err
	}
	if err := appendEventTx(ctx, tx, "responsibility-check", checkID, "ResponsibilityCheckAccepted", map[string]any{
		"user_id": userID, "accepted_at": now.Format(time.RFC3339), "actor_id": actorID,
	}); err != nil {
		return nil, err
	}
	if err := appendOutboxTx(ctx, tx, "responsibility-check", checkID, "ResponsibilityCheckAccepted", map[string]any{
		"user_id": userID, "accepted_at": now.Format(time.RFC3339),
	}, "phoenix.compliance.responsibility-check-accepted"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.ResponsibilityCheckAcceptance{UserID: userID, AcceptedAt: now}, nil
}

func (r *PostgresRepository) GetRestrictions(ctx context.Context, userID string) (*models.RestrictionsResponse, error) {
	limits, err := r.GetLimits(ctx, userID)
	if err != nil {
		return nil, err
	}
	response := &models.RestrictionsResponse{UserID: userID, Restrictions: make([]models.Restriction, 0, len(limits.Limits)+1)}
	for _, limit := range limits.Limits {
		response.Restrictions = append(response.Restrictions, models.Restriction{Type: limit.LimitType, Value: limit.LimitAmount, Exceeded: limit.CurrentPeriodLoss.GreaterThan(limit.LimitAmount)})
	}
	var exclusionType string
	var status string
	err = r.pool.QueryRow(ctx, `
		SELECT exclusion_type, status
		FROM self_exclusions
		WHERE user_id = $1 AND status = 'active'
		ORDER BY effective_at DESC
		LIMIT 1
	`, userID).Scan(&exclusionType, &status)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		response.Restrictions = append(response.Restrictions, models.Restriction{Type: "self_excluded", Value: exclusionType, Exceeded: status == "active"})
	}
	return response, nil
}

func (r *PostgresRepository) CreateAMLCheck(ctx context.Context, actorID string, req models.AMLCheckRequest) (*models.AMLCheck, error) {
	now := time.Now().UTC()
	checkID := uuid.NewString()
	result, risk := amlAssessment(req.Country, req.DateOfBirth)
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, req.UserID); err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO aml_checks (id, user_id, full_name, date_of_birth, country, status, result, risk_level, initiated_by, initiated_at, checked_at)
		VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, NULLIF($8, '')::uuid, $9, $9)
	`, checkID, req.UserID, req.FullName, req.DateOfBirth, strings.ToUpper(req.Country), result, risk, actorID, now)
	if err != nil {
		return nil, err
	}
	if err := appendEventTx(ctx, tx, "aml-check", checkID, "AMLCheckInitiated", map[string]any{
		"user_id": req.UserID, "full_name": req.FullName, "country": strings.ToUpper(req.Country), "actor_id": actorID, "initiated_at": now.Format(time.RFC3339),
	}); err != nil {
		return nil, err
	}
	if err := appendOutboxTx(ctx, tx, "aml-check", checkID, "AMLCheckInitiated", map[string]any{
		"check_id": checkID, "user_id": req.UserID, "status": "in_progress", "initiated_at": now.Format(time.RFC3339),
	}, "phoenix.compliance.aml-check-initiated"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.AMLCheck{CheckID: checkID, UserID: req.UserID, Status: "in_progress", InitiatedAt: now}, nil
}

func (r *PostgresRepository) GetAMLCheck(ctx context.Context, checkID string) (*models.AMLCheck, error) {
	item := &models.AMLCheck{}
	if err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, status, COALESCE(result::text, ''), COALESCE(risk_level::text, ''), initiated_at, checked_at
		FROM aml_checks WHERE id = $1
	`, checkID).Scan(&item.CheckID, &item.UserID, &item.Status, &item.Result, &item.RiskLevel, &item.InitiatedAt, &item.CheckedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return item, nil
}

func (r *PostgresRepository) CreateComplianceAlert(ctx context.Context, actorID string, req models.ComplianceAlertRequest) (*models.ComplianceAlert, error) {
	now := time.Now().UTC()
	alertID := uuid.NewString()
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
		INSERT INTO compliance_alerts (id, alert_type, user_id, description, severity, status, created_by, created_at, updated_at)
		VALUES ($1, $2, NULLIF($3, '')::uuid, $4, $5, 'open', NULLIF($6, '')::uuid, $7, $7)
	`, alertID, req.AlertType, req.UserID, req.Description, req.Severity, actorID, now)
	if err != nil {
		return nil, err
	}
	if err := appendEventTx(ctx, tx, "compliance-alert", alertID, "ComplianceAlertCreated", map[string]any{
		"user_id": req.UserID, "alert_type": req.AlertType, "severity": req.Severity, "actor_id": actorID, "created_at": now.Format(time.RFC3339),
	}); err != nil {
		return nil, err
	}
	if err := appendOutboxTx(ctx, tx, "compliance-alert", alertID, "ComplianceAlertCreated", map[string]any{
		"alert_id": alertID, "user_id": req.UserID, "status": "open", "created_at": now.Format(time.RFC3339),
	}, "phoenix.compliance.alert"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.ComplianceAlert{AlertID: alertID, Status: "open", CreatedAt: now}, nil
}

func (r *PostgresRepository) currentPeriodValue(ctx context.Context, userID, limitType string, effectiveDate time.Time) (decimal.Decimal, time.Time, error) {
	periodStart := periodStartFor(limitType, effectiveDate)
	var query string
	var value decimal.Decimal
	switch {
	case strings.Contains(limitType, "loss"):
		query = `SELECT COALESCE(SUM(stake), 0) FROM bets WHERE user_id = $1 AND status = 'lost' AND created_at >= $2`
	case strings.Contains(limitType, "deposit"):
		query = `SELECT COALESCE(SUM(wt.amount), 0) FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = $1 AND wt.type = 'deposit' AND wt.created_at >= $2`
	case strings.Contains(limitType, "stake"):
		query = `SELECT COALESCE(SUM(stake), 0) FROM bets WHERE user_id = $1 AND created_at >= $2`
	case strings.Contains(limitType, "session"):
		query = `
			SELECT COALESCE(
				SUM(
					EXTRACT(
						EPOCH FROM (
							LEAST(COALESCE(ended_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
							- GREATEST(started_at, $2)
						)
					) / 3600.0
				),
				0
			)::numeric
			FROM user_sessions
			WHERE user_id = $1
			  AND started_at < CURRENT_TIMESTAMP
			  AND COALESCE(ended_at, CURRENT_TIMESTAMP) > $2
		`
	default:
		return decimal.Zero, periodStart, nil
	}
	if err := r.pool.QueryRow(ctx, query, userID, periodStart).Scan(&value); err != nil {
		return decimal.Zero, periodStart, err
	}
	return value, periodStart, nil
}

func periodStartFor(limitType string, reference time.Time) time.Time {
	reference = reference.UTC()
	year, month, day := reference.Date()
	switch {
	case strings.HasPrefix(limitType, "daily"):
		return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	case strings.HasPrefix(limitType, "weekly"):
		weekday := int(reference.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		start := reference.AddDate(0, 0, -(weekday - 1))
		sy, sm, sd := start.Date()
		return time.Date(sy, sm, sd, 0, 0, 0, 0, time.UTC)
	case strings.HasPrefix(limitType, "monthly"):
		return time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	default:
		return reference
	}
}

func paginationOffset(page, itemsPerPage int) int {
	if page <= 1 {
		return 0
	}
	return (page - 1) * itemsPerPage
}

func normalizeLimitHistoryType(limitType string) (string, string) {
	parts := strings.Split(strings.TrimSpace(limitType), "_")
	base := strings.TrimSpace(limitType)
	period := "CUSTOM"
	if len(parts) >= 2 {
		switch strings.ToLower(parts[0]) {
		case "daily":
			period = "DAILY"
		case "weekly":
			period = "WEEKLY"
		case "monthly":
			period = "MONTHLY"
		}
		base = strings.Join(parts[1:], "_")
	}

	switch strings.ToLower(base) {
	case "session":
		return "SessionTime", period
	case "deposit":
		return "Deposit", period
	case "stake":
		return "Stake", period
	default:
		return strings.TrimSpace(base), period
	}
}

func amlAssessment(country string, dob time.Time) (string, string) {
	country = strings.ToUpper(strings.TrimSpace(country))
	highRisk := map[string]struct{}{"IR": {}, "KP": {}, "SY": {}, "RU": {}}
	if _, ok := highRisk[country]; ok {
		return "blocked", "high"
	}
	age := int(time.Since(dob).Hours() / 24 / 365)
	if age < 21 {
		return "review", "medium"
	}
	return "clear", "low"
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
	_, err = tx.Exec(ctx, `
		INSERT INTO event_store (aggregate_type, aggregate_id, event_type, version, payload, metadata)
		VALUES ($1, $2, $3, $4, $5, '{}'::jsonb)
	`, aggregateType, aggregateID, eventType, version, body)
	return err
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
