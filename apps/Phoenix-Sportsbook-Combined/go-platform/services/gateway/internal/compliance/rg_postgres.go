package compliance

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
	"time"
)

const rgDBTimeout = 5 * time.Second

// PostgresResponsibleGamblingService implements ResponsibleGamblingService
// with PostgreSQL-backed persistence for limits, restrictions, and activity.
type PostgresResponsibleGamblingService struct {
	db *sql.DB
}

// NewPostgresResponsibleGamblingService creates a new DB-backed RG service.
// It ensures the schema exists on startup.
func NewPostgresResponsibleGamblingService(db *sql.DB) (*PostgresResponsibleGamblingService, error) {
	svc := &PostgresResponsibleGamblingService{db: db}
	if err := svc.ensureSchema(); err != nil {
		return nil, fmt.Errorf("rg schema init: %w", err)
	}
	return svc, nil
}

func (s *PostgresResponsibleGamblingService) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), rgDBTimeout)
	defer cancel()

	statements := []string{
		`CREATE TABLE IF NOT EXISTS player_bet_limits (
  user_id TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily','weekly','monthly')),
  limit_cents BIGINT NOT NULL CHECK (limit_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, period)
)`,
		`CREATE TABLE IF NOT EXISTS player_deposit_limits (
  user_id TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily','weekly','monthly')),
  limit_cents BIGINT NOT NULL CHECK (limit_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, period)
)`,
		`CREATE TABLE IF NOT EXISTS player_restrictions (
  user_id TEXT PRIMARY KEY,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  block_reason TEXT,
  self_excluded BOOLEAN NOT NULL DEFAULT FALSE,
  self_exclusion_permanent BOOLEAN NOT NULL DEFAULT FALSE,
  self_exclusion_until TIMESTAMPTZ,
  cool_off_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE TABLE IF NOT EXISTS player_activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE INDEX IF NOT EXISTS idx_activity_user_type_time ON player_activity_log (user_id, activity_type, created_at)`,
	}

	for _, stmt := range statements {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

// ── Bet Limits ────────────────────────────────────────────────────

func (s *PostgresResponsibleGamblingService) SetBetLimit(ctx context.Context, userID string, period string, amountCents int64) error {
	if userID == "" {
		return ErrInvalidUserID
	}
	if !isValidLimitPeriod(period) {
		return ErrInvalidLimitPeriod
	}
	ctx, cancel := context.WithTimeout(ctx, rgDBTimeout)
	defer cancel()

	_, err := s.db.ExecContext(ctx, `
INSERT INTO player_bet_limits (user_id, period, limit_cents, updated_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, period) DO UPDATE
SET limit_cents = EXCLUDED.limit_cents, updated_at = NOW()`,
		userID, period, amountCents)
	return err
}

func (s *PostgresResponsibleGamblingService) GetBetLimits(ctx context.Context, userID string) ([]BetLimit, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	ctx, cancel := context.WithTimeout(ctx, rgDBTimeout)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, `
SELECT user_id, period, limit_cents, CAST(created_at AS TEXT)
FROM player_bet_limits
WHERE user_id = $1
ORDER BY period`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var limits []BetLimit
	for rows.Next() {
		var l BetLimit
		if err := rows.Scan(&l.UserID, &l.Period, &l.LimitCents, &l.CreatedAt); err != nil {
			return nil, err
		}
		// Calculate usage within the current period
		l.UsedCents = s.usageInPeriod(ctx, userID, "bet", l.Period)
		l.RemainingCents = l.LimitCents - l.UsedCents
		if l.RemainingCents < 0 {
			l.RemainingCents = 0
		}
		l.ResetsAt = periodResetTime(l.Period).Format(time.RFC3339)
		limits = append(limits, l)
	}
	return limits, rows.Err()
}

func (s *PostgresResponsibleGamblingService) CheckBetAllowed(ctx context.Context, userID string, stakeCents int64) (bool, string, error) {
	if userID == "" {
		return false, "", ErrInvalidUserID
	}

	// Check restrictions first (self-exclusion, cool-off, blocked)
	restrictions, err := s.GetPlayerRestrictions(ctx, userID)
	if err != nil {
		return false, "", err
	}
	if restrictions.IsBlocked {
		return false, "account_blocked", nil
	}
	if restrictions.IsExcluded {
		return false, "self_excluded", nil
	}
	if restrictions.IsOnCoolOff {
		return false, "cool_off_active", nil
	}

	// Check bet limits for each period
	ctx2, cancel := context.WithTimeout(ctx, rgDBTimeout)
	defer cancel()

	rows, err := s.db.QueryContext(ctx2, `
SELECT period, limit_cents
FROM player_bet_limits
WHERE user_id = $1`, userID)
	if err != nil {
		return false, "", err
	}
	defer rows.Close()

	for rows.Next() {
		var period string
		var limitCents int64
		if err := rows.Scan(&period, &limitCents); err != nil {
			return false, "", err
		}
		used := s.usageInPeriod(ctx, userID, "bet", period)
		if used+stakeCents > limitCents {
			return false, fmt.Sprintf("%s_bet_limit_exceeded", period), nil
		}
	}
	if err := rows.Err(); err != nil {
		return false, "", err
	}

	return true, "", nil
}

// ── Deposit Limits ────────────────────────────────────────────────

func (s *PostgresResponsibleGamblingService) SetDepositLimit(ctx context.Context, userID string, period string, amountCents int64) error {
	if userID == "" {
		return ErrInvalidUserID
	}
	if !isValidLimitPeriod(period) {
		return ErrInvalidLimitPeriod
	}
	ctx, cancel := context.WithTimeout(ctx, rgDBTimeout)
	defer cancel()

	_, err := s.db.ExecContext(ctx, `
INSERT INTO player_deposit_limits (user_id, period, limit_cents, updated_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, period) DO UPDATE
SET limit_cents = EXCLUDED.limit_cents, updated_at = NOW()`,
		userID, period, amountCents)
	return err
}

func (s *PostgresResponsibleGamblingService) GetDepositLimits(ctx context.Context, userID string) ([]DepositLimit, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	ctx, cancel := context.WithTimeout(ctx, rgDBTimeout)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, `
SELECT user_id, period, limit_cents, CAST(created_at AS TEXT)
FROM player_deposit_limits
WHERE user_id = $1
ORDER BY period`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var limits []DepositLimit
	for rows.Next() {
		var l DepositLimit
		if err := rows.Scan(&l.UserID, &l.Period, &l.LimitCents, &l.CreatedAt); err != nil {
			return nil, err
		}
		l.UsedCents = s.usageInPeriod(ctx, userID, "deposit", l.Period)
		l.RemainingCents = l.LimitCents - l.UsedCents
		if l.RemainingCents < 0 {
			l.RemainingCents = 0
		}
		l.ResetsAt = periodResetTime(l.Period).Format(time.RFC3339)
		limits = append(limits, l)
	}
	return limits, rows.Err()
}

func (s *PostgresResponsibleGamblingService) CheckDepositAllowed(ctx context.Context, userID string, amountCents int64) (bool, string, error) {
	if userID == "" {
		return false, "", ErrInvalidUserID
	}

	restrictions, err := s.GetPlayerRestrictions(ctx, userID)
	if err != nil {
		return false, "", err
	}
	if restrictions.IsBlocked {
		return false, "account_blocked", nil
	}
	if restrictions.IsExcluded {
		return false, "self_excluded", nil
	}

	ctx2, cancel := context.WithTimeout(ctx, rgDBTimeout)
	defer cancel()

	rows, err := s.db.QueryContext(ctx2, `
SELECT period, limit_cents
FROM player_deposit_limits
WHERE user_id = $1`, userID)
	if err != nil {
		return false, "", err
	}
	defer rows.Close()

	for rows.Next() {
		var period string
		var limitCents int64
		if err := rows.Scan(&period, &limitCents); err != nil {
			return false, "", err
		}
		used := s.usageInPeriod(ctx, userID, "deposit", period)
		if used+amountCents > limitCents {
			return false, fmt.Sprintf("%s_deposit_limit_exceeded", period), nil
		}
	}
	return true, "", rows.Err()
}

// ── Self-Exclusion & Cool-Off ─────────────────────────────────────

func (s *PostgresResponsibleGamblingService) SetSelfExclusion(ctx context.Context, userID string, permanent bool) error {
	if userID == "" {
		return ErrInvalidUserID
	}
	ctx, cancel := context.WithTimeout(ctx, rgDBTimeout)
	defer cancel()

	var exclusionUntil *time.Time
	if !permanent {
		t := time.Now().UTC().AddDate(0, 6, 0) // 6-month default
		exclusionUntil = &t
	}

	_, err := s.db.ExecContext(ctx, `
INSERT INTO player_restrictions (user_id, self_excluded, self_exclusion_permanent, self_exclusion_until, updated_at)
VALUES ($1, TRUE, $2, $3, NOW())
ON CONFLICT (user_id) DO UPDATE
SET self_excluded = TRUE,
    self_exclusion_permanent = EXCLUDED.self_exclusion_permanent,
    self_exclusion_until = EXCLUDED.self_exclusion_until,
    updated_at = NOW()`,
		userID, permanent, exclusionUntil)
	return err
}

func (s *PostgresResponsibleGamblingService) SetCoolOff(ctx context.Context, userID string, durationHours int) error {
	if userID == "" {
		return ErrInvalidUserID
	}
	if durationHours <= 0 {
		durationHours = 24
	}
	ctx, cancel := context.WithTimeout(ctx, rgDBTimeout)
	defer cancel()

	coolOffUntil := time.Now().UTC().Add(time.Duration(durationHours) * time.Hour)
	_, err := s.db.ExecContext(ctx, `
INSERT INTO player_restrictions (user_id, cool_off_until, updated_at)
VALUES ($1, $2, NOW())
ON CONFLICT (user_id) DO UPDATE
SET cool_off_until = EXCLUDED.cool_off_until, updated_at = NOW()`,
		userID, coolOffUntil)
	return err
}

func (s *PostgresResponsibleGamblingService) GetPlayerRestrictions(ctx context.Context, userID string) (*PlayerRestrictions, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	ctx, cancel := context.WithTimeout(ctx, rgDBTimeout)
	defer cancel()

	result := &PlayerRestrictions{UserID: userID}
	now := time.Now().UTC()

	var blocked bool
	var selfExcluded bool
	var selfExclusionPermanent bool
	var selfExclusionUntil sql.NullTime
	var coolOffUntil sql.NullTime
	var updatedAt sql.NullString

	err := s.db.QueryRowContext(ctx, `
SELECT blocked, self_excluded, self_exclusion_permanent,
       self_exclusion_until, cool_off_until, CAST(updated_at AS TEXT)
FROM player_restrictions
WHERE user_id = $1`, userID).Scan(
		&blocked, &selfExcluded, &selfExclusionPermanent,
		&selfExclusionUntil, &coolOffUntil, &updatedAt)

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	if err == nil {
		result.IsBlocked = blocked

		// Self-exclusion: permanent or not-yet-expired
		if selfExcluded {
			if selfExclusionPermanent {
				result.IsExcluded = true
				result.ExclusionType = "permanent"
			} else if selfExclusionUntil.Valid && selfExclusionUntil.Time.After(now) {
				result.IsExcluded = true
				result.ExclusionType = "temporary"
				result.ExcludedUntil = selfExclusionUntil.Time.Format(time.RFC3339)
			}
			// If temporary and expired, not excluded
		}

		// Cool-off: only active if not expired
		if coolOffUntil.Valid && coolOffUntil.Time.After(now) {
			result.IsOnCoolOff = true
			result.CoolOffUntil = coolOffUntil.Time.Format(time.RFC3339)
		}

		if updatedAt.Valid {
			result.LastUpdated = updatedAt.String
		}
	}

	// Attach current limits
	betLimits, _ := s.GetBetLimits(ctx, userID)
	result.BetLimits = betLimits
	depositLimits, _ := s.GetDepositLimits(ctx, userID)
	result.DepositLimits = depositLimits

	return result, nil
}

// ── Activity Recording ────────────────────────────────────────────

func (s *PostgresResponsibleGamblingService) RecordBet(ctx context.Context, userID string, stakeCents int64) error {
	return s.recordActivity(ctx, userID, "bet", stakeCents)
}

func (s *PostgresResponsibleGamblingService) RecordDeposit(ctx context.Context, userID string, amountCents int64) error {
	return s.recordActivity(ctx, userID, "deposit", amountCents)
}

func (s *PostgresResponsibleGamblingService) recordActivity(ctx context.Context, userID string, activityType string, amountCents int64) error {
	ctx, cancel := context.WithTimeout(ctx, rgDBTimeout)
	defer cancel()

	_, err := s.db.ExecContext(ctx, `
INSERT INTO player_activity_log (user_id, activity_type, amount_cents)
VALUES ($1, $2, $3)`, userID, activityType, amountCents)
	return err
}

// ── Period Helpers ─────────────────────────────────────────────────

func (s *PostgresResponsibleGamblingService) usageInPeriod(ctx context.Context, userID string, activityType string, period string) int64 {
	start := periodStart(period)
	ctx2, cancel := context.WithTimeout(ctx, rgDBTimeout)
	defer cancel()

	var total sql.NullInt64
	err := s.db.QueryRowContext(ctx2, `
SELECT COALESCE(SUM(amount_cents), 0)
FROM player_activity_log
WHERE user_id = $1 AND activity_type = $2 AND created_at >= $3`,
		userID, activityType, start).Scan(&total)
	if err != nil {
		slog.Error("rg: failed to query usage", "user_id", userID, "activity_type", activityType, "period", period, "error", err)
		return 0
	}
	if total.Valid {
		return total.Int64
	}
	return 0
}

func isValidLimitPeriod(period string) bool {
	switch strings.ToLower(period) {
	case "daily", "weekly", "monthly":
		return true
	}
	return false
}

func periodStart(period string) time.Time {
	now := time.Now().UTC()
	switch strings.ToLower(period) {
	case "daily":
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	case "weekly":
		// Start of the current ISO week (Monday)
		weekday := now.Weekday()
		if weekday == time.Sunday {
			weekday = 7
		}
		start := now.AddDate(0, 0, -int(weekday-time.Monday))
		return time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, time.UTC)
	case "monthly":
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	}
	return now
}

func periodResetTime(period string) time.Time {
	now := time.Now().UTC()
	switch strings.ToLower(period) {
	case "daily":
		return time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
	case "weekly":
		start := periodStart("weekly")
		return start.AddDate(0, 0, 7)
	case "monthly":
		return time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, time.UTC)
	}
	return now.Add(24 * time.Hour)
}
