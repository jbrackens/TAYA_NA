package discover

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// Row is the persisted shape — the user-safe subset of Market plus our own
// UUID. This is what the public API serves.
type Row struct {
	ID          string
	Title       string
	Description string
	ImagePath   *string
	EndTime     *time.Time
	Volume      float64
	Outcomes    []string
	Prices      []float64
}

// Repository persists imported markets and serves the read endpoint. SQL
// only; tests in phase 2.
type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// UpsertResult is what Upsert returns so the caller knows which UUID was
// assigned (needed before the image rehost runs, so the image filename
// matches the row id).
type UpsertResult struct {
	ID      string
	Created bool
}

// Reserve inserts a row keyed by the external_hash if it doesn't exist yet
// and returns the assigned UUID. Subsequent calls with the same hash return
// the same id. Title/volume/etc. are NOT updated here — that happens in
// Update once the image has (or hasn't) been rehosted, so we can write the
// final image_path in a single statement.
func (r *Repository) Reserve(ctx context.Context, externalHash string) (UpsertResult, error) {
	var id string
	var inserted bool
	err := r.db.QueryRowContext(ctx, `
		WITH ins AS (
			INSERT INTO imported_markets (external_hash, title, volume)
			VALUES ($1, '', 0)
			ON CONFLICT (external_hash) DO NOTHING
			RETURNING id
		)
		SELECT id, true AS inserted FROM ins
		UNION ALL
		SELECT id, false FROM imported_markets WHERE external_hash = $1
		LIMIT 1
	`, externalHash).Scan(&id, &inserted)
	if err != nil {
		return UpsertResult{}, fmt.Errorf("reserve: %w", err)
	}
	return UpsertResult{ID: id, Created: inserted}, nil
}

// Update writes the unified-shape fields for an already-reserved row. The
// caller passes nil for ImagePath if rehosting failed or no image existed.
func (r *Repository) Update(ctx context.Context, id string, row Row) error {
	outcomes, err := json.Marshal(row.Outcomes)
	if err != nil {
		outcomes = []byte("[]")
	}
	prices, err := json.Marshal(row.Prices)
	if err != nil {
		prices = []byte("[]")
	}
	_, err = r.db.ExecContext(ctx, `
		UPDATE imported_markets SET
			title = $2,
			description = $3,
			image_path = $4,
			end_time = $5,
			volume = $6,
			outcomes = $7::jsonb,
			prices = $8::jsonb,
			updated_at = now()
		WHERE id = $1
	`,
		id,
		row.Title,
		nullableText(row.Description),
		nullableText(ptrStr(row.ImagePath)),
		row.EndTime,
		row.Volume,
		string(outcomes),
		string(prices),
	)
	if err != nil {
		return fmt.Errorf("update: %w", err)
	}
	return nil
}

// List returns rows sorted by volume DESC, id DESC, with cursor-based
// pagination. Cursor is opaque; format is internal to encodeCursor /
// decodeCursor.
func (r *Repository) List(ctx context.Context, q string, limit int, cursor string) ([]Row, string, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	args := []any{}
	where := []string{}

	if trimmed := strings.TrimSpace(q); trimmed != "" {
		args = append(args, "%"+strings.ToLower(trimmed)+"%")
		where = append(where, fmt.Sprintf("lower(title) LIKE $%d", len(args)))
	}

	if cursor != "" {
		cv, cid, ok := decodeCursor(cursor)
		if ok {
			args = append(args, cv, cid)
			where = append(where,
				fmt.Sprintf("(volume, id) < ($%d, $%d::uuid)", len(args)-1, len(args)),
			)
		}
	}

	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}
	args = append(args, limit+1)
	limitArg := len(args)

	query := fmt.Sprintf(`
		SELECT id, title, COALESCE(description,''), image_path, end_time,
		       volume, outcomes, prices
		FROM imported_markets
		%s
		ORDER BY volume DESC, id DESC
		LIMIT $%d
	`, whereSQL, limitArg)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", fmt.Errorf("list: %w", err)
	}
	defer rows.Close()

	out := make([]Row, 0, limit)
	for rows.Next() {
		var (
			row             Row
			imagePath       sql.NullString
			endTime         sql.NullTime
			outcomesB       []byte
			pricesB         []byte
		)
		if err := rows.Scan(&row.ID, &row.Title, &row.Description,
			&imagePath, &endTime, &row.Volume, &outcomesB, &pricesB); err != nil {
			return nil, "", fmt.Errorf("scan: %w", err)
		}
		if imagePath.Valid {
			s := imagePath.String
			row.ImagePath = &s
		}
		if endTime.Valid {
			t := endTime.Time
			row.EndTime = &t
		}
		_ = json.Unmarshal(outcomesB, &row.Outcomes)
		_ = json.Unmarshal(pricesB, &row.Prices)
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	next := ""
	if len(out) > limit {
		last := out[limit-1]
		next = encodeCursor(last.Volume, last.ID)
		out = out[:limit]
	}
	return out, next, nil
}

func nullableText(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func ptrStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}
