package prediction

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/lib/pq"
)

// Prediction-native admin read models. These intentionally do NOT reuse the
// sportsbook-era admin handlers in internal/http/admin_handlers.go — that
// file is bound to the legacy `domain` package (fixtures, bets, freebets)
// which the prediction fork deliberately left unwired (CLAUDE.md rule #2).
// Instead these query the shared punters + audit_logs tables (migrations
// 001 + 009, kept across the fork) and return the minimal shape the office
// App-Router /users and /audit-logs pages consume.

// AdminPunter is the admin user-management view of a punter (= platform
// user). Field set matches what app/(dashboard)/users/page.tsx reads:
// id, email, status, lastLoginAt. createdAt + countryCode are included
// because they're free to surface and useful for the list.
type AdminPunter struct {
	ID          string  `json:"id"`
	Email       string  `json:"email"`
	Username    *string `json:"username,omitempty"`
	Status      string  `json:"status"`
	CountryCode *string `json:"countryCode,omitempty"`
	CreatedAt   string  `json:"createdAt"`
	LastLoginAt *string `json:"lastLoginAt,omitempty"`
}

// AdminPunterFilter narrows the punter list. Both fields optional; empty
// strings mean "no filter".
type AdminPunterFilter struct {
	Status string
	Search string
}

// AdminPunterDetail is the full admin user-detail view: identity (AdminPunter)
// plus the player's point-account balance and prediction portfolio summary.
// Returned by GET /api/v1/admin/punters/{id}; the list endpoint stays
// identity-only.
type AdminPunterDetail struct {
	AdminPunter
	PointAccountBalancePoints int64            `json:"pointAccountBalancePoints"`
	Portfolio                 PortfolioSummary `json:"portfolio"`
	Unit                      string           `json:"unit"`
}

// AdminPunterListItem is one row of the admin punter list: identity plus the
// point-account balance and realized prediction result. Both are batch-fetched
// for the whole page, not per-row.
type AdminPunterListItem struct {
	AdminPunter
	PointAccountBalancePoints int64  `json:"pointAccountBalancePoints"`
	RealizedPoints            int64  `json:"realizedPoints"`
	Unit                      string `json:"unit"`
}

// AdminAuditLog is the admin view of an audit_logs row. Field names match
// what app/(dashboard)/audit-logs/page.tsx reads: id, occurredAt, actorId,
// action, targetId, details.
type AdminAuditLog struct {
	ID           string          `json:"id"`
	ActorID      *string         `json:"actorId,omitempty"`
	Action       string          `json:"action"`
	ResourceType *string         `json:"resourceType,omitempty"`
	TargetID     *string         `json:"targetId,omitempty"`
	Status       string          `json:"status"`
	Details      json.RawMessage `json:"details,omitempty"`
	OccurredAt   string          `json:"occurredAt"`
}

// AdminAuditLogFilter narrows the audit-log list. All fields optional.
type AdminAuditLogFilter struct {
	Action       string
	ResourceType string
	ActorID      string
}

// AdminPunterNote is an admin CRM note on a punter. Field names match what the
// office /users/[id] notes panel reads.
type AdminPunterNote struct {
	ID        int64   `json:"id"`
	PunterID  string  `json:"punterId"`
	AuthorID  *string `json:"authorId,omitempty"`
	Category  string  `json:"category"`
	Content   string  `json:"content"`
	CreatedAt string  `json:"createdAt"`
}

// clampPage normalizes page (1-based) and pageSize into safe bounds and
// returns the SQL LIMIT/OFFSET.
func clampPage(page, pageSize int) (limit, offset int) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}
	if pageSize > 200 {
		pageSize = 200
	}
	return pageSize, (page - 1) * pageSize
}

// ListPuntersAdmin returns a paginated punter list for the admin users page.
func (r *SQLRepository) ListPuntersAdmin(
	ctx context.Context,
	filter AdminPunterFilter,
	page, pageSize int,
) ([]AdminPunter, PageMeta, error) {
	limit, offset := clampPage(page, pageSize)

	countQ := `
		SELECT COUNT(*) FROM punters
		WHERE ($1 = '' OR status = $1)
		  AND ($2 = '' OR email ILIKE '%' || $2 || '%' OR username ILIKE '%' || $2 || '%')`
	var total int
	if err := r.db.QueryRowContext(ctx, countQ, filter.Status, filter.Search).Scan(&total); err != nil {
		return nil, PageMeta{}, err
	}

	q := `
		SELECT id, email, username, status, country_code, created_at, last_login_at
		FROM punters
		WHERE ($1 = '' OR status = $1)
		  AND ($2 = '' OR email ILIKE '%' || $2 || '%' OR username ILIKE '%' || $2 || '%')
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`
	rows, err := r.db.QueryContext(ctx, q, filter.Status, filter.Search, limit, offset)
	if err != nil {
		return nil, PageMeta{}, err
	}
	defer rows.Close()

	// Empty slice (not nil) so JSON encodes [] for zero-row results — the
	// office maps over `data.items` directly and would crash on null.
	items := []AdminPunter{}
	for rows.Next() {
		var (
			p           AdminPunter
			username    sql.NullString
			countryCode sql.NullString
			createdAt   sql.NullTime
			lastLoginAt sql.NullTime
		)
		if err := rows.Scan(&p.ID, &p.Email, &username, &p.Status, &countryCode, &createdAt, &lastLoginAt); err != nil {
			return nil, PageMeta{}, err
		}
		if username.Valid {
			p.Username = &username.String
		}
		if countryCode.Valid {
			p.CountryCode = &countryCode.String
		}
		if createdAt.Valid {
			s := createdAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
			p.CreatedAt = s
		}
		if lastLoginAt.Valid {
			s := lastLoginAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
			p.LastLoginAt = &s
		}
		items = append(items, p)
	}
	if err := rows.Err(); err != nil {
		return nil, PageMeta{}, err
	}

	meta := PageMeta{
		Page:     page,
		PageSize: limit,
		Total:    total,
		HasNext:  offset+len(items) < total,
	}
	return items, meta, nil
}

// GetAdminPunter returns a single punter by id for the admin detail page, or
// (nil, nil) when not found so the handler can 404 cleanly.
func (r *SQLRepository) GetAdminPunter(ctx context.Context, id string) (*AdminPunter, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, email, username, status, country_code, created_at, last_login_at
		FROM punters
		WHERE id = $1`, id)
	return scanAdminPunter(row)
}

// UpdatePunterStatus sets a punter's status and returns the updated row.
// Returns (nil, nil) if the id doesn't exist.
func (r *SQLRepository) UpdatePunterStatus(ctx context.Context, id, status string) (*AdminPunter, error) {
	row := r.db.QueryRowContext(ctx, `
		UPDATE punters SET status = $2, updated_at = now()
		WHERE id = $1
		RETURNING id, email, username, status, country_code, created_at, last_login_at`,
		id, status)
	return scanAdminPunter(row)
}

// scanAdminPunter scans one punter row (shared by GetAdminPunter +
// UpdatePunterStatus). Returns (nil, nil) on no rows.
func scanAdminPunter(row interface{ Scan(...any) error }) (*AdminPunter, error) {
	var (
		p           AdminPunter
		username    sql.NullString
		countryCode sql.NullString
		createdAt   sql.NullTime
		lastLoginAt sql.NullTime
	)
	err := row.Scan(&p.ID, &p.Email, &username, &p.Status, &countryCode, &createdAt, &lastLoginAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if username.Valid {
		p.Username = &username.String
	}
	if countryCode.Valid {
		p.CountryCode = &countryCode.String
	}
	if createdAt.Valid {
		p.CreatedAt = createdAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
	}
	if lastLoginAt.Valid {
		s := lastLoginAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
		p.LastLoginAt = &s
	}
	return &p, nil
}

// ListAuditLogsAdmin returns a paginated audit-log list for the admin
// audit-logs page, newest first.
func (r *SQLRepository) ListAuditLogsAdmin(
	ctx context.Context,
	filter AdminAuditLogFilter,
	page, pageSize int,
) ([]AdminAuditLog, PageMeta, error) {
	limit, offset := clampPage(page, pageSize)

	countQ := `
		SELECT COUNT(*) FROM audit_logs
		WHERE ($1 = '' OR action = $1)
		  AND ($2 = '' OR resource_type = $2)
		  AND ($3 = '' OR punter_id = $3)`
	var total int
	if err := r.db.QueryRowContext(ctx, countQ, filter.Action, filter.ResourceType, filter.ActorID).Scan(&total); err != nil {
		return nil, PageMeta{}, err
	}

	q := `
		SELECT id, punter_id, action, resource_type, resource_id, status, details, created_at
		FROM audit_logs
		WHERE ($1 = '' OR action = $1)
		  AND ($2 = '' OR resource_type = $2)
		  AND ($3 = '' OR punter_id = $3)
		ORDER BY created_at DESC
		LIMIT $4 OFFSET $5`
	rows, err := r.db.QueryContext(ctx, q, filter.Action, filter.ResourceType, filter.ActorID, limit, offset)
	if err != nil {
		return nil, PageMeta{}, err
	}
	defer rows.Close()

	items := []AdminAuditLog{}
	for rows.Next() {
		var (
			a            AdminAuditLog
			actorID      sql.NullString
			resourceType sql.NullString
			targetID     sql.NullString
			details      []byte
			occurredAt   sql.NullTime
		)
		if err := rows.Scan(&a.ID, &actorID, &a.Action, &resourceType, &targetID, &a.Status, &details, &occurredAt); err != nil {
			return nil, PageMeta{}, err
		}
		if actorID.Valid {
			a.ActorID = &actorID.String
		}
		if resourceType.Valid {
			a.ResourceType = &resourceType.String
		}
		if targetID.Valid {
			a.TargetID = &targetID.String
		}
		if len(details) > 0 {
			a.Details = json.RawMessage(details)
		}
		if occurredAt.Valid {
			a.OccurredAt = occurredAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
		}
		items = append(items, a)
	}
	if err := rows.Err(); err != nil {
		return nil, PageMeta{}, err
	}

	meta := PageMeta{
		Page:     page,
		PageSize: limit,
		Total:    total,
		HasNext:  offset+len(items) < total,
	}
	return items, meta, nil
}

// AddPunterNote inserts an admin note on a punter and returns the created row.
// authorID may be empty (stored NULL). category defaults to "general".
func (r *SQLRepository) AddPunterNote(ctx context.Context, punterID, authorID, category, content string) (*AdminPunterNote, error) {
	var author any
	if authorID != "" {
		author = authorID
	}
	if category == "" {
		category = "general"
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO user_notes (punter_id, author_id, category, content)
		VALUES ($1, $2, $3, $4)
		RETURNING id, punter_id, author_id, category, content, created_at`,
		punterID, author, category, content)
	return scanPunterNote(row)
}

// ListPunterNotes returns a punter's admin notes, newest first.
func (r *SQLRepository) ListPunterNotes(ctx context.Context, punterID string) ([]AdminPunterNote, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, punter_id, author_id, category, content, created_at
		FROM user_notes
		WHERE punter_id = $1
		ORDER BY created_at DESC`, punterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Empty slice (not nil) so JSON encodes [] for zero notes.
	items := []AdminPunterNote{}
	for rows.Next() {
		n, err := scanPunterNote(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *n)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

// ListPuntersRealizedPnl returns realized P&L (cents) per user for the given
// IDs in a single query, to enrich the admin punter list. Users with no
// settled payouts are absent from the map (caller treats missing as 0).
func (r *SQLRepository) ListPuntersRealizedPnl(ctx context.Context, userIDs []string) (map[string]int64, error) {
	out := make(map[string]int64, len(userIDs))
	if len(userIDs) == 0 {
		return out, nil
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT user_id, COALESCE(SUM(pnl_points), 0)
		 FROM prediction_payouts WHERE user_id = ANY($1) GROUP BY user_id`,
		pq.Array(userIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		var pnl int64
		if err := rows.Scan(&id, &pnl); err != nil {
			return nil, err
		}
		out[id] = pnl
	}
	return out, rows.Err()
}

// scanPunterNote scans one user_notes row.
func scanPunterNote(row interface{ Scan(...any) error }) (*AdminPunterNote, error) {
	var (
		n         AdminPunterNote
		author    sql.NullString
		createdAt sql.NullTime
	)
	if err := row.Scan(&n.ID, &n.PunterID, &author, &n.Category, &n.Content, &createdAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if author.Valid {
		n.AuthorID = &author.String
	}
	if createdAt.Valid {
		n.CreatedAt = createdAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
	}
	return &n, nil
}
