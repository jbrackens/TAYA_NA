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

	"github.com/phoenixbot/phoenix-config/internal/models"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrAlreadyExists = errors.New("already exists")
)

type Repository interface {
	GetCurrentTerms(ctx context.Context) (*models.TermsDocument, error)
	CreateTerms(ctx context.Context, authorUserID, version, content string, daysThreshold int) error
}

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) Repository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) GetCurrentTerms(ctx context.Context) (*models.TermsDocument, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, current_terms_version, terms_content, terms_days_threshold, COALESCE(created_by::text, ''), created_at
		FROM terms_documents
		ORDER BY created_at DESC
		LIMIT 1
	`)
	var doc models.TermsDocument
	if err := row.Scan(&doc.ID, &doc.CurrentTermsVersion, &doc.TermsContent, &doc.TermsDaysThreshold, &doc.CreatedBy, &doc.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get current terms: %w", err)
	}
	return &doc, nil
}

func (r *PostgresRepository) CreateTerms(ctx context.Context, authorUserID, version, content string, daysThreshold int) error {
	return withTx(ctx, r.db, func(tx pgx.Tx) error {
		if strings.TrimSpace(authorUserID) != "" {
			exists, err := userExistsTx(ctx, tx, authorUserID)
			if err != nil {
				return err
			}
			if !exists {
				return ErrNotFound
			}
		}

		var termsID string
		err := tx.QueryRow(ctx, `
			INSERT INTO terms_documents (current_terms_version, terms_content, terms_days_threshold, created_by)
			VALUES ($1, $2, $3, NULLIF($4, '')::uuid)
			RETURNING id
		`, version, content, daysThreshold, authorUserID).Scan(&termsID)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
				return ErrAlreadyExists
			}
			return fmt.Errorf("insert terms: %w", err)
		}

		payload, err := json.Marshal(map[string]any{
			"terms_id":              termsID,
			"current_terms_version": version,
			"terms_days_threshold":  daysThreshold,
			"created_by":            authorUserID,
		})
		if err != nil {
			return fmt.Errorf("marshal audit payload: %w", err)
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
			VALUES (gen_random_uuid(), NULLIF($1, '')::uuid, $2, $3, $4, NULL, $5::jsonb, NULL, CURRENT_TIMESTAMP)
		`, authorUserID, "config.terms.created", "terms-document", termsID, string(payload)); err != nil {
			return fmt.Errorf("insert audit log: %w", err)
		}

		return nil
	})
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

func nowUTC() time.Time {
	return time.Now().UTC()
}
