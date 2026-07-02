// Package segmentation implements back-office user segmentation / CRM (PAM
// P2-2): admin-defined tags applied to users, so operators can group customers
// for review, targeting, and reporting. It owns only its own tables
// (crm_tags, crm_user_tags) and reads punters read-only for validation — it
// does not touch the trading/wallet core.
package segmentation

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const dbTimeout = 10 * time.Second

var (
	ErrNotFound        = errors.New("tag not found")
	ErrInvalidTag      = errors.New("tag name is required")
	ErrDuplicate       = errors.New("a tag with that name already exists")
	ErrCampaignInvalid = errors.New("campaign name, target tag, and a valid action type are required")
	ErrCampaignMissing = errors.New("campaign not found")
)

// validCampaignActions is the closed set of dispatch actions a campaign may
// carry. notification = send a templated message; bonus = grant a bonus.
var validCampaignActions = map[string]bool{"notification": true, "bonus": true}

var validCampaignStatuses = map[string]bool{"draft": true, "active": true, "archived": true}

// Tag is an admin-defined segment label.
type Tag struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	MemberCount int    `json:"memberCount"`
	CreatedAt   string `json:"createdAt"`
}

// Store persists tags and their user assignments.
type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) (*Store, error) {
	s := &Store{db: db}
	if err := s.ensureSchema(); err != nil {
		return nil, fmt.Errorf("segmentation schema init: %w", err)
	}
	return s, nil
}

func (s *Store) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	statements := []string{
		`CREATE TABLE IF NOT EXISTS crm_tags (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE TABLE IF NOT EXISTS crm_user_tags (
  tag_id BIGINT NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tag_id, user_id)
)`,
		`CREATE INDEX IF NOT EXISTS idx_crm_user_tags_user ON crm_user_tags (user_id)`,
		`CREATE TABLE IF NOT EXISTS crm_campaigns (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tag_id BIGINT NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('notification','bonus')),
  action_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','archived')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
	}
	for _, stmt := range statements {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

// CreateTag creates a new tag.
func (s *Store) CreateTag(ctx context.Context, name, description string) (*Tag, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, ErrInvalidTag
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	var id int64
	var createdAt string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO crm_tags (name, description) VALUES ($1, $2)
ON CONFLICT (name) DO NOTHING
RETURNING id, CAST(created_at AS TEXT)`, name, nullStr(description)).Scan(&id, &createdAt)
	if err == sql.ErrNoRows {
		return nil, ErrDuplicate
	}
	if err != nil {
		return nil, err
	}
	return &Tag{ID: id, Name: name, Description: description, CreatedAt: createdAt}, nil
}

// ListTags returns all tags with their member counts.
func (s *Store) ListTags(ctx context.Context) ([]Tag, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := s.db.QueryContext(ctx, `
SELECT t.id, t.name, COALESCE(t.description,''), CAST(t.created_at AS TEXT),
       (SELECT COUNT(*) FROM crm_user_tags ut WHERE ut.tag_id = t.id)
FROM crm_tags t ORDER BY t.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Tag{}
	for rows.Next() {
		var t Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Description, &t.CreatedAt, &t.MemberCount); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// DeleteTag removes a tag and (via cascade) its assignments.
func (s *Store) DeleteTag(ctx context.Context, tagID int64) error {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	res, err := s.db.ExecContext(ctx, `DELETE FROM crm_tags WHERE id = $1`, tagID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// AssignTag applies a tag to a user. Idempotent: re-assigning is a no-op.
func (s *Store) AssignTag(ctx context.Context, tagID int64, userID, assignedBy string) error {
	if strings.TrimSpace(userID) == "" {
		return ErrInvalidTag
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	_, err := s.db.ExecContext(ctx, `
INSERT INTO crm_user_tags (tag_id, user_id, assigned_by)
VALUES ($1, $2, $3) ON CONFLICT (tag_id, user_id) DO NOTHING`,
		tagID, userID, nullStr(assignedBy))
	// A bad tag_id surfaces as an FK violation; report as not-found.
	if err != nil {
		if strings.Contains(err.Error(), "crm_user_tags_tag_id_fkey") {
			return ErrNotFound
		}
		return err
	}
	return nil
}

// UnassignTag removes a tag from a user.
func (s *Store) UnassignTag(ctx context.Context, tagID int64, userID string) error {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	res, err := s.db.ExecContext(ctx,
		`DELETE FROM crm_user_tags WHERE tag_id = $1 AND user_id = $2`, tagID, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// UsersForTag lists the user ids assigned a tag (newest assignment first).
func (s *Store) UsersForTag(ctx context.Context, tagID int64, limit, offset int) ([]string, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := s.db.QueryContext(ctx, `
SELECT user_id FROM crm_user_tags WHERE tag_id = $1
ORDER BY assigned_at DESC LIMIT $2 OFFSET $3`, tagID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var uid string
		if err := rows.Scan(&uid); err != nil {
			return nil, err
		}
		out = append(out, uid)
	}
	return out, rows.Err()
}

// TagsForUser lists the tag names assigned to a user.
func (s *Store) TagsForUser(ctx context.Context, userID string) ([]Tag, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := s.db.QueryContext(ctx, `
SELECT t.id, t.name, COALESCE(t.description,''), CAST(t.created_at AS TEXT)
FROM crm_tags t JOIN crm_user_tags ut ON ut.tag_id = t.id
WHERE ut.user_id = $1 ORDER BY t.name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Tag{}
	for rows.Next() {
		var t Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Description, &t.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// Query is a segment query-builder filter: users matching ALL supplied
// criteria (AND semantics). Zero-value fields are ignored. Read-only over
// punters + crm_user_tags.
type Query struct {
	TagID        int64  // 0 = any tag
	Status       string // "" = any punter status
	CreatedAfter string // RFC3339/date; "" = no lower bound
	Limit        int
	Offset       int
}

// QueryResult is a page of matching user ids plus the total match count.
type QueryResult struct {
	UserIDs []string `json:"userIds"`
	Total   int      `json:"total"`
}

// RunQuery evaluates a segment query. It builds a parameterized WHERE from the
// supplied criteria — never string interpolation — and reads punters
// read-only (joining crm_user_tags only when a tag filter is set).
func (s *Store) RunQuery(ctx context.Context, q Query) (*QueryResult, error) {
	limit := q.Limit
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	offset := q.Offset
	if offset < 0 {
		offset = 0
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()

	from := "punters p"
	where := []string{}
	args := []any{}
	add := func(cond string, val any) {
		args = append(args, val)
		where = append(where, fmt.Sprintf(cond, len(args)))
	}
	if q.TagID > 0 {
		from = "punters p JOIN crm_user_tags ut ON ut.user_id = p.id"
		add("ut.tag_id = $%d", q.TagID)
	}
	if strings.TrimSpace(q.Status) != "" {
		add("p.status = $%d", strings.TrimSpace(q.Status))
	}
	if strings.TrimSpace(q.CreatedAfter) != "" {
		add("p.created_at >= $%d", strings.TrimSpace(q.CreatedAfter))
	}
	whereSQL := ""
	if len(where) > 0 {
		whereSQL = " WHERE " + strings.Join(where, " AND ")
	}

	// Total count first (same predicate, no paging).
	var total int
	countQ := "SELECT COUNT(DISTINCT p.id) FROM " + from + whereSQL
	if err := s.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, err
	}

	pageArgs := append(append([]any{}, args...), limit, offset)
	pageQ := "SELECT DISTINCT p.id FROM " + from + whereSQL +
		fmt.Sprintf(" ORDER BY p.id LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	rows, err := s.db.QueryContext(ctx, pageQ, pageArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &QueryResult{UserIDs: ids, Total: total}, nil
}

// Campaign targets a segment (tag) with a dispatch action. The definition and
// its preview are back-office data; actual dispatch is gated at the handler by
// a launch-safety flag.
type Campaign struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	TagID      int64  `json:"tagId"`
	ActionType string `json:"actionType"`
	ActionRef  string `json:"actionRef,omitempty"`
	Status     string `json:"status"`
	CreatedBy  string `json:"createdBy,omitempty"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

// CreateCampaign stores a new draft campaign. The target tag must exist (FK).
func (s *Store) CreateCampaign(ctx context.Context, name string, tagID int64, actionType, actionRef, createdBy string) (*Campaign, error) {
	name = strings.TrimSpace(name)
	if name == "" || tagID <= 0 || !validCampaignActions[actionType] {
		return nil, ErrCampaignInvalid
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	var id int64
	var createdAt, updatedAt string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO crm_campaigns (name, tag_id, action_type, action_ref, created_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, CAST(created_at AS TEXT), CAST(updated_at AS TEXT)`,
		name, tagID, actionType, nullStr(actionRef), nullStr(createdBy)).Scan(&id, &createdAt, &updatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "crm_campaigns_tag_id_fkey") {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &Campaign{ID: id, Name: name, TagID: tagID, ActionType: actionType, ActionRef: actionRef,
		Status: "draft", CreatedBy: createdBy, CreatedAt: createdAt, UpdatedAt: updatedAt}, nil
}

// ListCampaigns returns all campaigns newest first.
func (s *Store) ListCampaigns(ctx context.Context) ([]Campaign, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := s.db.QueryContext(ctx, `
SELECT id, name, tag_id, action_type, COALESCE(action_ref,''), status, COALESCE(created_by,''),
       CAST(created_at AS TEXT), CAST(updated_at AS TEXT)
FROM crm_campaigns ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Campaign{}
	for rows.Next() {
		var c Campaign
		if err := rows.Scan(&c.ID, &c.Name, &c.TagID, &c.ActionType, &c.ActionRef, &c.Status,
			&c.CreatedBy, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// GetCampaign returns one campaign or ErrCampaignMissing.
func (s *Store) GetCampaign(ctx context.Context, id int64) (*Campaign, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	c := &Campaign{}
	var ref, createdBy sql.NullString
	err := s.db.QueryRowContext(ctx, `
SELECT id, name, tag_id, action_type, action_ref, status, created_by,
       CAST(created_at AS TEXT), CAST(updated_at AS TEXT)
FROM crm_campaigns WHERE id = $1`, id).
		Scan(&c.ID, &c.Name, &c.TagID, &c.ActionType, &ref, &c.Status, &createdBy, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrCampaignMissing
	}
	if err != nil {
		return nil, err
	}
	if ref.Valid {
		c.ActionRef = ref.String
	}
	if createdBy.Valid {
		c.CreatedBy = createdBy.String
	}
	return c, nil
}

// UpdateCampaignStatus transitions a campaign's status.
func (s *Store) UpdateCampaignStatus(ctx context.Context, id int64, status string) (*Campaign, error) {
	if !validCampaignStatuses[status] {
		return nil, ErrCampaignInvalid
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	res, err := s.db.ExecContext(ctx,
		`UPDATE crm_campaigns SET status = $2, updated_at = NOW() WHERE id = $1`, id, status)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrCampaignMissing
	}
	return s.GetCampaign(ctx, id)
}

// PreviewCampaign resolves a campaign's target segment to a matching user
// count (read-only) — what a dispatch WOULD reach, without dispatching.
func (s *Store) PreviewCampaign(ctx context.Context, id int64) (int, error) {
	c, err := s.GetCampaign(ctx, id)
	if err != nil {
		return 0, err
	}
	res, err := s.RunQuery(ctx, Query{TagID: c.TagID, Limit: 1})
	if err != nil {
		return 0, err
	}
	return res.Total, nil
}

func nullStr(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}
