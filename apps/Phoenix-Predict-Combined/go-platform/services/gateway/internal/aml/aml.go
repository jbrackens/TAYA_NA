// Package aml implements money-flow anti-money-laundering monitoring (PAM spec
// §12 KYC, AML, Risk, and Compliance + §18/§19). It is DELIBERATELY separate
// from internal/surveillance (market-integrity): AML watches the money path
// (deposits/withdrawals/adjustments) while surveillance watches the trade
// book. This is the regime-AGNOSTIC plumbing decided 2026-07-02: the rules
// that fire are DATA (aml_rules), loaded when compliance counsel names the
// regime and thresholds; with no rules loaded, nothing fires. The
// alert -> case -> disposition -> SAR-export workflow is regime-independent.
//
// The store owns its own tables (aml_*) and never touches the trading,
// settlement, or wallet core.
package aml

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"
)

const dbTimeout = 10 * time.Second

var (
	ErrNotFound           = errors.New("not found")
	ErrInvalidInput       = errors.New("invalid input")
	ErrResolutionRequired = errors.New("a resolution is required to close a case")
	ErrCaseClosed         = errors.New("case is already closed and cannot be changed")
)

// Rule is a data-driven monitoring rule. Rules are loaded, not compiled: a
// regime's thresholds land as rows in aml_rules, so encoding the wrong regime
// is a data edit, not a code change. Kind selects the evaluation shape; Params
// carries kind-specific numbers.
type Rule struct {
	ID         int64          `json:"id"`
	Name       string         `json:"name"`
	Kind       string         `json:"kind"` // amount_threshold, velocity, aggregate
	Params     map[string]any `json:"params"`
	RiskPoints int            `json:"riskPoints"`
	Severity   string         `json:"severity"`
	Enabled    bool           `json:"enabled"`
}

// Alert is one rule firing about one subject. RiskPoints accrue per subject;
// crossing the case-open threshold opens a case (spec §32 Scenario 5).
type Alert struct {
	ID         int64          `json:"id"`
	RuleID     int64          `json:"ruleId"`
	RuleName   string         `json:"ruleName"`
	Severity   string         `json:"severity"`
	SubjectID  string         `json:"subjectId"`
	RiskPoints int            `json:"riskPoints"`
	Summary    string         `json:"summary"`
	Detail     map[string]any `json:"detail"`
	DedupeKey  string         `json:"dedupeKey"`
	Status     string         `json:"status"` // open, linked, dismissed
	CaseID     *int64         `json:"caseId,omitempty"`
	DetectedAt string         `json:"detectedAt"`
}

// Case groups alerts for investigation and SAR disposition.
type Case struct {
	ID           int64  `json:"id"`
	Title        string `json:"title"`
	Status       string `json:"status"` // open, investigating, closed_sar_filed, closed_no_action
	Priority     string `json:"priority"`
	SubjectID    string `json:"subjectId"`
	OpenedBy     string `json:"openedBy"`
	Resolution   string `json:"resolution,omitempty"`
	SARReference string `json:"sarReference,omitempty"`
	AlertCount   int    `json:"alertCount"`
	RiskPoints   int    `json:"riskPoints"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

// Store persists rules, alerts, and cases.
type Store struct {
	db *sql.DB
}

// NewStore creates the store and ensures its schema. Distinct tables (aml_*) —
// no financial-core schema is touched.
func NewStore(db *sql.DB) (*Store, error) {
	s := &Store{db: db}
	if err := s.ensureSchema(); err != nil {
		return nil, fmt.Errorf("aml schema init: %w", err)
	}
	return s, nil
}

func (s *Store) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	statements := []string{
		`CREATE TABLE IF NOT EXISTS aml_rules (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('amount_threshold','velocity','aggregate')),
  params JSONB NOT NULL DEFAULT '{}',
  risk_points INT NOT NULL DEFAULT 0 CHECK (risk_points >= 0),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE TABLE IF NOT EXISTS aml_cases (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','investigating','closed_sar_filed','closed_no_action')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  subject_id TEXT NOT NULL,
  opened_by TEXT NOT NULL,
  resolution TEXT,
  sar_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE TABLE IF NOT EXISTS aml_alerts (
  id BIGSERIAL PRIMARY KEY,
  rule_id BIGINT NOT NULL,
  rule_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  subject_id TEXT NOT NULL,
  risk_points INT NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  detail JSONB,
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','linked','dismissed')),
  case_id BIGINT REFERENCES aml_cases(id) ON DELETE SET NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE INDEX IF NOT EXISTS idx_aml_alerts_status ON aml_alerts (status, detected_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_aml_alerts_subject ON aml_alerts (subject_id, detected_at DESC)`,
		// Single-row watermark for the incremental wallet_ledger scanner
		// (slice 2). The scanner only READS wallet_ledger; this table is the
		// only place it writes its cursor.
		`CREATE TABLE IF NOT EXISTS aml_scan_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_ledger_id BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`INSERT INTO aml_scan_state (id, last_ledger_id) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`,
	}
	for _, stmt := range statements {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

// UpsertRule creates or (by id) updates a rule. Used by the admin rule editor
// (slice 3) and by tests/seed to load a regime's thresholds as data.
func (s *Store) UpsertRule(ctx context.Context, r Rule) (int64, error) {
	if r.Name == "" || !validRuleKind(r.Kind) {
		return 0, ErrInvalidInput
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	params, err := marshalJSON(r.Params)
	if err != nil {
		return 0, err
	}
	if r.ID == 0 {
		var id int64
		err := s.db.QueryRowContext(ctx, `
INSERT INTO aml_rules (name, kind, params, risk_points, severity, enabled)
VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
			r.Name, r.Kind, params, r.RiskPoints, severityOrDefault(r.Severity), r.Enabled).Scan(&id)
		return id, err
	}
	res, err := s.db.ExecContext(ctx, `
UPDATE aml_rules SET name=$2, kind=$3, params=$4, risk_points=$5, severity=$6, enabled=$7, updated_at=NOW()
WHERE id=$1`, r.ID, r.Name, r.Kind, params, r.RiskPoints, severityOrDefault(r.Severity), r.Enabled)
	if err != nil {
		return 0, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return 0, ErrNotFound
	}
	return r.ID, nil
}

// ListRules returns every rule (enabled and disabled) for the admin editor.
func (s *Store) ListRules(ctx context.Context) ([]Rule, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := s.db.QueryContext(ctx, `
SELECT id, name, kind, COALESCE(params::text,'{}'), risk_points, severity, enabled
FROM aml_rules ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Rule{}
	for rows.Next() {
		var r Rule
		var params string
		if err := rows.Scan(&r.ID, &r.Name, &r.Kind, &params, &r.RiskPoints, &r.Severity, &r.Enabled); err != nil {
			return nil, err
		}
		r.Params = unmarshalJSON(params)
		out = append(out, r)
	}
	return out, rows.Err()
}

// EnabledRules loads the currently-active rules. Empty until counsel supplies a
// threshold sheet — the fail-safe default is "monitor nothing" rather than
// "monitor with a guessed regime".
func (s *Store) EnabledRules(ctx context.Context) ([]Rule, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := s.db.QueryContext(ctx, `
SELECT id, name, kind, COALESCE(params::text,'{}'), risk_points, severity, enabled
FROM aml_rules WHERE enabled = TRUE ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Rule{}
	for rows.Next() {
		var r Rule
		var params string
		if err := rows.Scan(&r.ID, &r.Name, &r.Kind, &params, &r.RiskPoints, &r.Severity, &r.Enabled); err != nil {
			return nil, err
		}
		r.Params = unmarshalJSON(params)
		out = append(out, r)
	}
	return out, rows.Err()
}

// InsertAlert records a rule firing. The dedupe key makes re-scans idempotent.
// Returns (inserted, alertID, error); inserted is false when it already existed.
func (s *Store) InsertAlert(ctx context.Context, a Alert) (bool, int64, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	detail, err := marshalJSON(a.Detail)
	if err != nil {
		return false, 0, err
	}
	var id int64
	err = s.db.QueryRowContext(ctx, `
INSERT INTO aml_alerts (rule_id, rule_name, severity, subject_id, risk_points, summary, detail, dedupe_key)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
ON CONFLICT (dedupe_key) DO NOTHING
RETURNING id`,
		a.RuleID, a.RuleName, severityOrDefault(a.Severity), a.SubjectID, a.RiskPoints,
		a.Summary, detail, a.DedupeKey).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return false, 0, nil // already existed
	}
	if err != nil {
		return false, 0, err
	}
	return true, id, nil
}

// OpenAlertRiskPoints sums risk points of a subject's currently-OPEN (unlinked,
// undismissed) alerts — the accrual that gates case opening (§32 Scenario 5).
func (s *Store) OpenAlertRiskPoints(ctx context.Context, subjectID string) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	var total sql.NullInt64
	err := s.db.QueryRowContext(ctx, `
SELECT SUM(risk_points) FROM aml_alerts WHERE subject_id = $1 AND status = 'open'`, subjectID).Scan(&total)
	if err != nil {
		return 0, err
	}
	return int(total.Int64), nil
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
SELECT id, rule_id, rule_name, severity, subject_id, risk_points, summary,
       COALESCE(detail::text,'{}'), dedupe_key, status, case_id, CAST(detected_at AS TEXT)
FROM aml_alerts`
	args := []any{}
	if status != "" {
		query += ` WHERE status = $1 ORDER BY detected_at DESC LIMIT $2 OFFSET $3`
		args = append(args, status, limit, offset)
	} else {
		query += ` ORDER BY detected_at DESC LIMIT $1 OFFSET $2`
		args = append(args, limit, offset)
	}
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
		if err := rows.Scan(&a.ID, &a.RuleID, &a.RuleName, &a.Severity, &a.SubjectID, &a.RiskPoints,
			&a.Summary, &detailJSON, &a.DedupeKey, &a.Status, &caseID, &a.DetectedAt); err != nil {
			return nil, err
		}
		a.Detail = unmarshalJSON(detailJSON)
		if caseID.Valid {
			a.CaseID = &caseID.Int64
		}
		alerts = append(alerts, a)
	}
	return alerts, rows.Err()
}

// DismissAlert marks an open alert dismissed (analyst-cleared false positive).
func (s *Store) DismissAlert(ctx context.Context, alertID int64) error {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	res, err := s.db.ExecContext(ctx,
		`UPDATE aml_alerts SET status='dismissed' WHERE id=$1 AND status='open'`, alertID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// OpenCase creates a case for a subject from one or more open alerts, linking
// them. Mirrors the surveillance store: never creates an empty case.
func (s *Store) OpenCase(ctx context.Context, title, priority, subjectID, openedBy string, alertIDs []int64) (*Case, error) {
	if title == "" || subjectID == "" || len(alertIDs) == 0 {
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
INSERT INTO aml_cases (title, priority, subject_id, opened_by)
VALUES ($1,$2,$3,$4)
RETURNING id, CAST(created_at AS TEXT), CAST(updated_at AS TEXT)`,
		title, priorityOrDefault(priority), subjectID, openedBy).Scan(&id, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	res, err := tx.ExecContext(ctx, `
UPDATE aml_alerts SET status='linked', case_id=$1
WHERE id = ANY($2) AND status='open' AND subject_id=$3`, id, pq.Array(alertIDs), subjectID)
	if err != nil {
		return nil, err
	}
	linked, _ := res.RowsAffected()
	if linked == 0 {
		return nil, ErrInvalidInput // no open alerts for this subject — do not create an empty case
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &Case{
		ID: id, Title: title, Status: "open", Priority: priorityOrDefault(priority),
		SubjectID: subjectID, OpenedBy: openedBy, AlertCount: int(linked),
		CreatedAt: createdAt, UpdatedAt: updatedAt,
	}, nil
}

// UpdateCaseStatus advances a case. Closing requires a resolution; a closed
// case is terminal. Filing a SAR (closed_sar_filed) records the SAR reference.
func (s *Store) UpdateCaseStatus(ctx context.Context, caseID int64, status, resolution, sarReference string) (*Case, error) {
	if !validCaseStatus(status) {
		return nil, ErrInvalidInput
	}
	closing := status == "closed_sar_filed" || status == "closed_no_action"
	if closing && resolution == "" {
		return nil, ErrResolutionRequired
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var cur string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM aml_cases WHERE id=$1 FOR UPDATE`, caseID).Scan(&cur); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if cur == "closed_sar_filed" || cur == "closed_no_action" {
		return nil, ErrCaseClosed
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE aml_cases SET status=$2, resolution=NULLIF($3,''), sar_reference=NULLIF($4,''), updated_at=NOW()
WHERE id=$1`, caseID, status, resolution, sarReference); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetCase(ctx, caseID)
}

// GetCase returns a case with its linked-alert count and accrued risk points.
func (s *Store) GetCase(ctx context.Context, caseID int64) (*Case, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	var c Case
	var resolution, sarRef sql.NullString
	err := s.db.QueryRowContext(ctx, `
SELECT c.id, c.title, c.status, c.priority, c.subject_id, c.opened_by,
       c.resolution, c.sar_reference,
       CAST(c.created_at AS TEXT), CAST(c.updated_at AS TEXT),
       COALESCE((SELECT COUNT(*) FROM aml_alerts a WHERE a.case_id=c.id),0),
       COALESCE((SELECT SUM(risk_points) FROM aml_alerts a WHERE a.case_id=c.id),0)
FROM aml_cases c WHERE c.id=$1`, caseID).Scan(
		&c.ID, &c.Title, &c.Status, &c.Priority, &c.SubjectID, &c.OpenedBy,
		&resolution, &sarRef, &c.CreatedAt, &c.UpdatedAt, &c.AlertCount, &c.RiskPoints)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	c.Resolution = resolution.String
	c.SARReference = sarRef.String
	return &c, nil
}

// ListCases returns cases filtered by status (empty = all), newest first.
func (s *Store) ListCases(ctx context.Context, status string, limit, offset int) ([]Case, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	query := `
SELECT c.id, c.title, c.status, c.priority, c.subject_id, c.opened_by,
       COALESCE(c.resolution,''), COALESCE(c.sar_reference,''),
       CAST(c.created_at AS TEXT), CAST(c.updated_at AS TEXT),
       COALESCE((SELECT COUNT(*) FROM aml_alerts a WHERE a.case_id=c.id),0),
       COALESCE((SELECT SUM(risk_points) FROM aml_alerts a WHERE a.case_id=c.id),0)
FROM aml_cases c`
	args := []any{}
	if status != "" {
		query += ` WHERE c.status=$1 ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`
		args = append(args, status, limit, offset)
	} else {
		query += ` ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`
		args = append(args, limit, offset)
	}
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cases := []Case{}
	for rows.Next() {
		var c Case
		if err := rows.Scan(&c.ID, &c.Title, &c.Status, &c.Priority, &c.SubjectID, &c.OpenedBy,
			&c.Resolution, &c.SARReference, &c.CreatedAt, &c.UpdatedAt, &c.AlertCount, &c.RiskPoints); err != nil {
			return nil, err
		}
		cases = append(cases, c)
	}
	return cases, rows.Err()
}

// Watermark returns the last wallet_ledger id the scanner processed.
func (s *Store) Watermark(ctx context.Context) (int64, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	var id int64
	err := s.db.QueryRowContext(ctx, `SELECT last_ledger_id FROM aml_scan_state WHERE id = 1`).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return id, err
}

// SetWatermark advances the scanner cursor. Monotonic: never moves backward.
func (s *Store) SetWatermark(ctx context.Context, ledgerID int64) error {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	_, err := s.db.ExecContext(ctx, `
UPDATE aml_scan_state SET last_ledger_id = $1, updated_at = NOW()
WHERE id = 1 AND $1 > last_ledger_id`, ledgerID)
	return err
}

// --- helpers ---

func validRuleKind(k string) bool {
	return k == "amount_threshold" || k == "velocity" || k == "aggregate"
}

func validCaseStatus(s string) bool {
	switch s {
	case "open", "investigating", "closed_sar_filed", "closed_no_action":
		return true
	}
	return false
}

func severityOrDefault(s string) string {
	switch s {
	case "low", "medium", "high":
		return s
	default:
		return "medium"
	}
}

func priorityOrDefault(p string) string {
	switch p {
	case "low", "medium", "high":
		return p
	default:
		return "medium"
	}
}

func marshalJSON(m map[string]any) (any, error) {
	if len(m) == 0 {
		return "{}", nil
	}
	raw, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	return string(raw), nil
}

func unmarshalJSON(s string) map[string]any {
	if s == "" {
		return map[string]any{}
	}
	out := map[string]any{}
	_ = json.Unmarshal([]byte(s), &out)
	return out
}
