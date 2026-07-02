// Package surveillance implements market-integrity monitoring (PAM: wash /
// spoof / collusion detection → alerts → cases). Detectors read the
// prediction trade/order log read-only and never mutate the trading or
// settlement core; findings are written to surveillance_alerts, which a
// back-office analyst triages into surveillance_cases.
package surveillance

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/lib/pq"
)

const dbTimeout = 10 * time.Second

// Alert is one detector finding about one subject over one window.
type Alert struct {
	ID          int64          `json:"id"`
	Kind        string         `json:"kind"` // wash_self_trade, spoofing, collusion
	Severity    string         `json:"severity"`
	SubjectID   string         `json:"subjectId"`   // primary user under suspicion
	MarketID    string         `json:"marketId"`    // "" if cross-market
	Summary     string         `json:"summary"`
	Detail      map[string]any `json:"detail"`
	DedupeKey   string         `json:"dedupeKey"`
	Status      string         `json:"status"` // open, linked, dismissed
	CaseID      *int64         `json:"caseId,omitempty"`
	DetectedAt  string         `json:"detectedAt"`
}

// Case groups alerts for investigation and disposition.
type Case struct {
	ID         int64  `json:"id"`
	Title      string `json:"title"`
	Status     string `json:"status"` // open, investigating, closed_action, closed_no_action
	Priority   string `json:"priority"`
	OpenedBy   string `json:"openedBy"`
	Resolution string `json:"resolution,omitempty"`
	AlertCount int    `json:"alertCount"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

// Store persists alerts and cases.
type Store struct {
	db *sql.DB
}

// NewStore creates the store and ensures its schema. Detectors and the admin
// API share it. Distinct tables (surveillance_*) — no financial-core schema
// is touched.
func NewStore(db *sql.DB) (*Store, error) {
	s := &Store{db: db}
	if err := s.ensureSchema(); err != nil {
		return nil, fmt.Errorf("surveillance schema init: %w", err)
	}
	return s, nil
}

func (s *Store) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	statements := []string{
		`CREATE TABLE IF NOT EXISTS surveillance_cases (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','investigating','closed_action','closed_no_action')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high')),
  opened_by TEXT NOT NULL,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE TABLE IF NOT EXISTS surveillance_alerts (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high')),
  subject_id TEXT NOT NULL,
  market_id TEXT,
  summary TEXT NOT NULL,
  detail JSONB,
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','linked','dismissed')),
  case_id BIGINT REFERENCES surveillance_cases(id) ON DELETE SET NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE INDEX IF NOT EXISTS idx_surv_alerts_status ON surveillance_alerts (status, detected_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_surv_alerts_subject ON surveillance_alerts (subject_id, detected_at DESC)`,
	}
	for _, stmt := range statements {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

// InsertAlert records a finding. The dedupe key makes re-runs idempotent: a
// repeated scan over the same window will not create duplicate alerts.
// Returns (inserted, error) — inserted is false when the alert already
// existed.
func (s *Store) InsertAlert(ctx context.Context, a Alert) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	detail, err := marshalDetail(a.Detail)
	if err != nil {
		return false, err
	}
	res, err := s.db.ExecContext(ctx, `
INSERT INTO surveillance_alerts (kind, severity, subject_id, market_id, summary, detail, dedupe_key)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (dedupe_key) DO NOTHING`,
		a.Kind, severityOrDefault(a.Severity), a.SubjectID, nullIfEmpty(a.MarketID),
		a.Summary, detail, a.DedupeKey)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// ListAlerts returns alerts filtered by status (empty = all), newest first.
func (s *Store) ListAlerts(ctx context.Context, status string, limit, offset int) ([]Alert, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()

	query := `
SELECT id, kind, severity, subject_id, COALESCE(market_id,''), summary, COALESCE(detail::text,'{}'),
       dedupe_key, status, case_id, CAST(detected_at AS TEXT)
FROM surveillance_alerts`
	args := []any{}
	if status != "" {
		query += ` WHERE status = $1`
		args = append(args, status)
		query += ` ORDER BY detected_at DESC LIMIT $2 OFFSET $3`
	} else {
		query += ` ORDER BY detected_at DESC LIMIT $1 OFFSET $2`
	}
	args = append(args, limit, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	alerts := []Alert{}
	for rows.Next() {
		var a Alert
		var detailJSON string
		var caseID sql.NullInt64
		if err := rows.Scan(&a.ID, &a.Kind, &a.Severity, &a.SubjectID, &a.MarketID,
			&a.Summary, &detailJSON, &a.DedupeKey, &a.Status, &caseID, &a.DetectedAt); err != nil {
			return nil, err
		}
		a.Detail = unmarshalDetail(detailJSON)
		if caseID.Valid {
			a.CaseID = &caseID.Int64
		}
		alerts = append(alerts, a)
	}
	return alerts, rows.Err()
}

// DismissAlert marks an alert dismissed (a false positive an analyst cleared).
func (s *Store) DismissAlert(ctx context.Context, alertID int64) error {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	res, err := s.db.ExecContext(ctx,
		`UPDATE surveillance_alerts SET status = 'dismissed' WHERE id = $1 AND status = 'open'`, alertID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// OpenCase creates a case from one or more open alerts, linking them.
func (s *Store) OpenCase(ctx context.Context, title, priority, openedBy string, alertIDs []int64) (*Case, error) {
	if title == "" {
		return nil, ErrInvalidInput
	}
	if len(alertIDs) == 0 {
		return nil, ErrInvalidInput
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var id int64
	var createdAt, updatedAt string
	if err := tx.QueryRowContext(ctx, `
INSERT INTO surveillance_cases (title, priority, opened_by)
VALUES ($1, $2, $3)
RETURNING id, CAST(created_at AS TEXT), CAST(updated_at AS TEXT)`,
		title, priorityOrDefault(priority), openedBy).Scan(&id, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	// Link only currently-open alerts; report how many actually linked.
	res, err := tx.ExecContext(ctx, `
UPDATE surveillance_alerts SET status = 'linked', case_id = $1
WHERE id = ANY($2) AND status = 'open'`, id, pq.Array(alertIDs))
	if err != nil {
		return nil, err
	}
	linked, _ := res.RowsAffected()
	if linked == 0 {
		return nil, ErrInvalidInput // no open alerts to link — do not create an empty case
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &Case{
		ID: id, Title: title, Status: "open", Priority: priorityOrDefault(priority),
		OpenedBy: openedBy, AlertCount: int(linked), CreatedAt: createdAt, UpdatedAt: updatedAt,
	}, nil
}

// GetCase returns a case with its current linked-alert count.
func (s *Store) GetCase(ctx context.Context, caseID int64) (*Case, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	c := &Case{}
	var resolution sql.NullString
	err := s.db.QueryRowContext(ctx, `
SELECT c.id, c.title, c.status, c.priority, c.opened_by, c.resolution,
       CAST(c.created_at AS TEXT), CAST(c.updated_at AS TEXT),
       (SELECT COUNT(*) FROM surveillance_alerts a WHERE a.case_id = c.id)
FROM surveillance_cases c WHERE c.id = $1`, caseID).
		Scan(&c.ID, &c.Title, &c.Status, &c.Priority, &c.OpenedBy, &resolution,
			&c.CreatedAt, &c.UpdatedAt, &c.AlertCount)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if resolution.Valid {
		c.Resolution = resolution.String
	}
	return c, nil
}

// UpdateCaseStatus transitions a case and records a resolution note. Closing
// requires a resolution so a disposition is never silent.
func (s *Store) UpdateCaseStatus(ctx context.Context, caseID int64, status, resolution string) (*Case, error) {
	if !validCaseStatus[status] {
		return nil, ErrInvalidInput
	}
	if (status == "closed_action" || status == "closed_no_action") && resolution == "" {
		return nil, ErrResolutionRequired
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	res, err := s.db.ExecContext(ctx, `
UPDATE surveillance_cases SET status = $2, resolution = $3, updated_at = NOW() WHERE id = $1`,
		caseID, status, nullIfEmpty(resolution))
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	return s.GetCase(ctx, caseID)
}

// ListCases returns cases newest first.
func (s *Store) ListCases(ctx context.Context, limit, offset int) ([]Case, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := s.db.QueryContext(ctx, `
SELECT c.id, c.title, c.status, c.priority, c.opened_by, COALESCE(c.resolution,''),
       CAST(c.created_at AS TEXT), CAST(c.updated_at AS TEXT),
       (SELECT COUNT(*) FROM surveillance_alerts a WHERE a.case_id = c.id)
FROM surveillance_cases c ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cases := []Case{}
	for rows.Next() {
		var c Case
		if err := rows.Scan(&c.ID, &c.Title, &c.Status, &c.Priority, &c.OpenedBy,
			&c.Resolution, &c.CreatedAt, &c.UpdatedAt, &c.AlertCount); err != nil {
			return nil, err
		}
		cases = append(cases, c)
	}
	return cases, rows.Err()
}
