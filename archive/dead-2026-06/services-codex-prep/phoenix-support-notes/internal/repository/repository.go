package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/phoenixbot/phoenix-support-notes/internal/models"
)

var ErrNotFound = errors.New("not found")

type Repository interface {
	ListNotes(ctx context.Context, ownerUserID string, page, limit int) ([]*models.SupportNote, int, error)
	ListTimeline(ctx context.Context, ownerUserID string, page, limit int, filters models.TimelineFilters) ([]*models.SupportTimelineEntry, int, error)
	ExportTimeline(ctx context.Context, ownerUserID string, filters models.TimelineFilters) ([]*models.SupportTimelineEntry, error)
	CreateManualNote(ctx context.Context, ownerUserID, authorUserID, noteText string) error
}

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) ListNotes(ctx context.Context, ownerUserID string, page, limit int) ([]*models.SupportNote, int, error) {
	if exists, err := r.userExists(ctx, ownerUserID); err != nil {
		return nil, 0, err
	} else if !exists {
		return nil, 0, ErrNotFound
	}

	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM support_notes WHERE owner_user_id = $1`, ownerUserID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count notes: %w", err)
	}

	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `
		SELECT
			n.id,
			n.owner_user_id,
			n.created_at,
			n.note_text,
			n.note_type,
			n.author_user_id,
			CASE
				WHEN a.id IS NULL THEN NULL
				ELSE COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', a.first_name, a.last_name)), ''), NULLIF(a.username, ''), a.email)
			END AS author_name
		FROM support_notes n
		LEFT JOIN users a ON a.id = n.author_user_id
		WHERE n.owner_user_id = $1
		ORDER BY n.created_at DESC
		LIMIT $2 OFFSET $3
	`, ownerUserID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list notes: %w", err)
	}
	defer rows.Close()

	notes := make([]*models.SupportNote, 0, limit)
	for rows.Next() {
		var note models.SupportNote
		var authorID, authorName *string
		if err := rows.Scan(&note.NoteID, &note.OwnerUserID, &note.CreatedAt, &note.Text, &note.NoteType, &authorID, &authorName); err != nil {
			return nil, 0, fmt.Errorf("scan note: %w", err)
		}
		note.AuthorID = authorID
		note.AuthorName = authorName
		notes = append(notes, &note)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate notes: %w", err)
	}

	return notes, total, nil
}

func (r *PostgresRepository) ListTimeline(ctx context.Context, ownerUserID string, page, limit int, filters models.TimelineFilters) ([]*models.SupportTimelineEntry, int, error) {
	if exists, err := r.userExists(ctx, ownerUserID); err != nil {
		return nil, 0, err
	} else if !exists {
		return nil, 0, ErrNotFound
	}

	const timelineUnion = `
		SELECT
			n.id::text AS entry_id,
			'support_note' AS entry_type,
			n.created_at AS occurred_at,
			CASE WHEN n.note_type = 'manual' THEN 'Manual note' ELSE 'System note' END AS title,
			n.note_text AS description,
			n.note_type::text AS status,
			NULL::text AS amount,
			NULL::text AS currency,
			jsonb_build_object(
				'note_type', n.note_type,
				'author_user_id', n.author_user_id
			) AS metadata
		FROM support_notes n
		WHERE n.owner_user_id = $1

		UNION ALL

		SELECT
			wt.id::text AS entry_id,
			'wallet_transaction' AS entry_type,
			wt.created_at AS occurred_at,
			'Wallet ' || initcap(replace(wt.type::text, '_', ' ')) AS title,
			COALESCE(NULLIF(wt.reference, ''), 'Wallet transaction') AS description,
			NULL::text AS status,
			wt.amount::text AS amount,
			w.currency AS currency,
			COALESCE(wt.metadata, '{}'::jsonb) || jsonb_build_object(
				'transaction_type', wt.type::text,
				'wallet_id', w.id::text,
				'reference', wt.reference
			) AS metadata
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		WHERE w.user_id = $1

		UNION ALL

		SELECT
			b.id::text AS entry_id,
			'bet' AS entry_type,
			b.created_at AS occurred_at,
			'Bet placed' AS title,
			COALESCE(m.name, 'Bet on market') AS description,
			b.status::text AS status,
			b.stake::text AS amount,
			'USD' AS currency,
			jsonb_build_object(
				'market_id', b.market_id,
				'outcome_id', b.outcome_id,
				'odds_at_placement', b.odds_at_placement::text,
				'potential_payout', b.potential_payout::text,
				'settled_at', b.settled_at
			) AS metadata
		FROM bets b
		LEFT JOIN markets m ON m.id = b.market_id
		WHERE b.user_id = $1

		UNION ALL

		SELECT
			uvs.id::text AS entry_id,
			'verification_session' AS entry_type,
			uvs.updated_at AS occurred_at,
			'Verification ' || upper(uvs.flow_type) AS title,
			COALESCE(NULLIF(uvs.provider_case_id, ''), NULLIF(uvs.provider_reference, ''), 'Verification session') AS description,
			uvs.status AS status,
			NULL::text AS amount,
			NULL::text AS currency,
			jsonb_build_object(
				'flow_type', uvs.flow_type,
				'provider', uvs.provider,
				'provider_reference', uvs.provider_reference,
				'provider_case_id', uvs.provider_case_id,
				'provider_decision', uvs.provider_decision,
				'last_error_code', uvs.last_error_code,
				'completed_at', uvs.completed_at
			) AS metadata
		FROM user_verification_sessions uvs
		WHERE uvs.user_id = $1

		UNION ALL

		SELECT
			se.id::text AS entry_id,
			'self_exclusion' AS entry_type,
			se.created_at AS occurred_at,
			'Self-exclusion' AS title,
			initcap(se.exclusion_type::text) || ' exclusion: ' || replace(se.reason::text, '_', ' ') AS description,
			se.status::text AS status,
			NULL::text AS amount,
			NULL::text AS currency,
			jsonb_build_object(
				'effective_at', se.effective_at,
				'expires_at', se.expires_at,
				'duration_days', se.duration_days,
				'created_by', se.created_by
			) AS metadata
		FROM self_exclusions se
		WHERE se.user_id = $1

		UNION ALL

		SELECT
			cl.id::text AS entry_id,
			'compliance_limit' AS entry_type,
			cl.updated_at AS occurred_at,
			initcap(replace(cl.limit_type::text, '_', ' ')) || ' limit' AS title,
			'Set to ' || cl.limit_amount::text || ' ' || cl.currency AS description,
			'active' AS status,
			cl.limit_amount::text AS amount,
			cl.currency AS currency,
			jsonb_build_object(
				'limit_type', cl.limit_type::text,
				'effective_date', cl.effective_date,
				'created_by', cl.created_by
			) AS metadata
		FROM compliance_limits cl
		WHERE cl.user_id = $1

		UNION ALL

		SELECT
			rc.id::text AS entry_id,
			'responsibility_check' AS entry_type,
			rc.accepted_at AS occurred_at,
			'Responsibility check accepted' AS title,
			'User acknowledged responsible-gaming threshold' AS description,
			'accepted' AS status,
			NULL::text AS amount,
			NULL::text AS currency,
			jsonb_build_object(
				'accepted_by', rc.accepted_by,
				'created_at', rc.created_at
			) AS metadata
		FROM responsibility_checks rc
		WHERE rc.user_id = $1
	`

	countQuery, countArgs := buildTimelineCountQuery(timelineUnion, filters, ownerUserID)
	var total int
	if err := r.db.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count timeline: %w", err)
	}

	offset := (page - 1) * limit
	listQuery, listArgs := buildTimelineListQuery(timelineUnion, filters, ownerUserID, limit, offset)
	rows, err := r.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("list timeline: %w", err)
	}
	defer rows.Close()

	entries := make([]*models.SupportTimelineEntry, 0, limit)
	for rows.Next() {
		var entry models.SupportTimelineEntry
		var status, amount, currency *string
		var metadataRaw []byte
		if err := rows.Scan(
			&entry.EntryID,
			&entry.EntryType,
			&entry.OccurredAt,
			&entry.Title,
			&entry.Description,
			&status,
			&amount,
			&currency,
			&metadataRaw,
		); err != nil {
			return nil, 0, fmt.Errorf("scan timeline entry: %w", err)
		}
		entry.Status = status
		entry.Amount = amount
		entry.Currency = currency
		if len(metadataRaw) > 0 {
			if err := json.Unmarshal(metadataRaw, &entry.Metadata); err != nil {
				return nil, 0, fmt.Errorf("decode timeline metadata: %w", err)
			}
		}
		entries = append(entries, &entry)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate timeline: %w", err)
	}

	return entries, total, nil
}

func (r *PostgresRepository) ExportTimeline(ctx context.Context, ownerUserID string, filters models.TimelineFilters) ([]*models.SupportTimelineEntry, error) {
	if exists, err := r.userExists(ctx, ownerUserID); err != nil {
		return nil, err
	} else if !exists {
		return nil, ErrNotFound
	}

	const timelineUnion = `
		SELECT
			n.id::text AS entry_id,
			'support_note' AS entry_type,
			n.created_at AS occurred_at,
			CASE WHEN n.note_type = 'manual' THEN 'Manual note' ELSE 'System note' END AS title,
			n.note_text AS description,
			n.note_type::text AS status,
			NULL::text AS amount,
			NULL::text AS currency,
			jsonb_build_object(
				'note_type', n.note_type,
				'author_user_id', n.author_user_id
			) AS metadata
		FROM support_notes n
		WHERE n.owner_user_id = $1

		UNION ALL

		SELECT
			wt.id::text AS entry_id,
			'wallet_transaction' AS entry_type,
			wt.created_at AS occurred_at,
			'Wallet ' || initcap(replace(wt.type::text, '_', ' ')) AS title,
			COALESCE(NULLIF(wt.reference, ''), 'Wallet transaction') AS description,
			NULL::text AS status,
			wt.amount::text AS amount,
			w.currency AS currency,
			COALESCE(wt.metadata, '{}'::jsonb) || jsonb_build_object(
				'transaction_type', wt.type::text,
				'wallet_id', w.id::text,
				'reference', wt.reference
			) AS metadata
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		WHERE w.user_id = $1

		UNION ALL

		SELECT
			b.id::text AS entry_id,
			'bet' AS entry_type,
			b.created_at AS occurred_at,
			'Bet placed' AS title,
			COALESCE(m.name, 'Bet on market') AS description,
			b.status::text AS status,
			b.stake::text AS amount,
			'USD' AS currency,
			jsonb_build_object(
				'market_id', b.market_id,
				'outcome_id', b.outcome_id,
				'odds_at_placement', b.odds_at_placement::text,
				'potential_payout', b.potential_payout::text,
				'settled_at', b.settled_at
			) AS metadata
		FROM bets b
		LEFT JOIN markets m ON m.id = b.market_id
		WHERE b.user_id = $1

		UNION ALL

		SELECT
			uvs.id::text AS entry_id,
			'verification_session' AS entry_type,
			uvs.updated_at AS occurred_at,
			'Verification ' || upper(uvs.flow_type) AS title,
			COALESCE(NULLIF(uvs.provider_case_id, ''), NULLIF(uvs.provider_reference, ''), 'Verification session') AS description,
			uvs.status AS status,
			NULL::text AS amount,
			NULL::text AS currency,
			jsonb_build_object(
				'flow_type', uvs.flow_type,
				'provider', uvs.provider,
				'provider_reference', uvs.provider_reference,
				'provider_case_id', uvs.provider_case_id,
				'provider_decision', uvs.provider_decision,
				'last_error_code', uvs.last_error_code,
				'completed_at', uvs.completed_at
			) AS metadata
		FROM user_verification_sessions uvs
		WHERE uvs.user_id = $1

		UNION ALL

		SELECT
			se.id::text AS entry_id,
			'self_exclusion' AS entry_type,
			se.created_at AS occurred_at,
			'Self-exclusion' AS title,
			initcap(se.exclusion_type::text) || ' exclusion: ' || replace(se.reason::text, '_', ' ') AS description,
			se.status::text AS status,
			NULL::text AS amount,
			NULL::text AS currency,
			jsonb_build_object(
				'effective_at', se.effective_at,
				'expires_at', se.expires_at,
				'duration_days', se.duration_days,
				'created_by', se.created_by
			) AS metadata
		FROM self_exclusions se
		WHERE se.user_id = $1

		UNION ALL

		SELECT
			cl.id::text AS entry_id,
			'compliance_limit' AS entry_type,
			cl.updated_at AS occurred_at,
			initcap(replace(cl.limit_type::text, '_', ' ')) || ' limit' AS title,
			'Set to ' || cl.limit_amount::text || ' ' || cl.currency AS description,
			'active' AS status,
			cl.limit_amount::text AS amount,
			cl.currency AS currency,
			jsonb_build_object(
				'limit_type', cl.limit_type::text,
				'effective_date', cl.effective_date,
				'created_by', cl.created_by
			) AS metadata
		FROM compliance_limits cl
		WHERE cl.user_id = $1

		UNION ALL

		SELECT
			rc.id::text AS entry_id,
			'responsibility_check' AS entry_type,
			rc.accepted_at AS occurred_at,
			'Responsibility check accepted' AS title,
			'User acknowledged responsible-gaming threshold' AS description,
			'accepted' AS status,
			NULL::text AS amount,
			NULL::text AS currency,
			jsonb_build_object(
				'accepted_by', rc.accepted_by,
				'created_at', rc.created_at
			) AS metadata
		FROM responsibility_checks rc
		WHERE rc.user_id = $1
	`

	query, args := buildTimelineExportQuery(timelineUnion, filters, ownerUserID)
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("export timeline: %w", err)
	}
	defer rows.Close()

	return scanTimelineEntries(rows)
}

func buildTimelineFilterClause(filters models.TimelineFilters, ownerUserID string) (string, []any, int) {
	args := []any{ownerUserID}
	conditions := make([]string, 0, 3)
	next := 2
	if filters.EntryType != "" {
		conditions = append(conditions, fmt.Sprintf("entry_type = $%d", next))
		args = append(args, filters.EntryType)
		next++
	}
	if filters.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("occurred_at >= $%d", next))
		args = append(args, *filters.StartDate)
		next++
	}
	if filters.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("occurred_at <= $%d", next))
		args = append(args, *filters.EndDate)
		next++
	}
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}
	return whereClause, args, next
}

func buildTimelineCountQuery(timelineUnion string, filters models.TimelineFilters, ownerUserID string) (string, []any) {
	whereClause, args, _ := buildTimelineFilterClause(filters, ownerUserID)
	return fmt.Sprintf(`SELECT COUNT(*) FROM (%s) AS timeline_entries%s`, timelineUnion, whereClause), args
}

func buildTimelineListQuery(timelineUnion string, filters models.TimelineFilters, ownerUserID string, limit, offset int) (string, []any) {
	whereClause, args, next := buildTimelineFilterClause(filters, ownerUserID)
	query := fmt.Sprintf(`
		SELECT entry_id, entry_type, occurred_at, title, description, status, amount, currency, metadata
		FROM (%s) AS timeline_entries%s
		ORDER BY occurred_at DESC, entry_id DESC
		LIMIT $%d OFFSET $%d
	`, timelineUnion, whereClause, next, next+1)
	args = append(args, limit, offset)
	return query, args
}

func buildTimelineExportQuery(timelineUnion string, filters models.TimelineFilters, ownerUserID string) (string, []any) {
	whereClause, args, _ := buildTimelineFilterClause(filters, ownerUserID)
	return fmt.Sprintf(`
		SELECT entry_id, entry_type, occurred_at, title, description, status, amount, currency, metadata
		FROM (%s) AS timeline_entries%s
		ORDER BY occurred_at DESC, entry_id DESC
	`, timelineUnion, whereClause), args
}

func scanTimelineEntries(rows pgx.Rows) ([]*models.SupportTimelineEntry, error) {
	entries := make([]*models.SupportTimelineEntry, 0, 64)
	for rows.Next() {
		var entry models.SupportTimelineEntry
		var status, amount, currency *string
		var metadataRaw []byte
		if err := rows.Scan(
			&entry.EntryID,
			&entry.EntryType,
			&entry.OccurredAt,
			&entry.Title,
			&entry.Description,
			&status,
			&amount,
			&currency,
			&metadataRaw,
		); err != nil {
			return nil, fmt.Errorf("scan timeline entry: %w", err)
		}
		entry.Status = status
		entry.Amount = amount
		entry.Currency = currency
		if len(metadataRaw) > 0 {
			if err := json.Unmarshal(metadataRaw, &entry.Metadata); err != nil {
				return nil, fmt.Errorf("decode timeline metadata: %w", err)
			}
		}
		entries = append(entries, &entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate timeline: %w", err)
	}
	return entries, nil
}

func (r *PostgresRepository) CreateManualNote(ctx context.Context, ownerUserID, authorUserID, noteText string) error {
	return withTx(ctx, r.db, func(tx pgx.Tx) error {
		exists, err := userExistsTx(ctx, tx, ownerUserID)
		if err != nil {
			return err
		}
		if !exists {
			return ErrNotFound
		}

		var noteID string
		if err := tx.QueryRow(ctx, `
			INSERT INTO support_notes (owner_user_id, author_user_id, note_type, note_text)
			VALUES ($1, $2, 'manual', $3)
			RETURNING id
		`, ownerUserID, authorUserID, noteText).Scan(&noteID); err != nil {
			return fmt.Errorf("insert note: %w", err)
		}

		payload, err := json.Marshal(map[string]any{
			"note_id":        noteID,
			"owner_user_id":  ownerUserID,
			"author_user_id": authorUserID,
			"note_type":      "manual",
			"text":           noteText,
		})
		if err != nil {
			return fmt.Errorf("marshal audit payload: %w", err)
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
			VALUES (gen_random_uuid(), $1, $2, $3, $4, NULL, $5::jsonb, NULL, CURRENT_TIMESTAMP)
		`, authorUserID, "support.note.created", "support-note", noteID, string(payload)); err != nil {
			return fmt.Errorf("insert audit log: %w", err)
		}

		return nil
	})
}

func (r *PostgresRepository) userExists(ctx context.Context, userID string) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, userID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check user exists: %w", err)
	}
	return exists, nil
}

func userExistsTx(ctx context.Context, tx pgx.Tx, userID string) (bool, error) {
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, userID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check user exists in tx: %w", err)
	}
	return exists, nil
}

func withTx(ctx context.Context, db *pgxpool.Pool, fn func(tx pgx.Tx) error) error {
	tx, err := db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := fn(tx); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}
