// Package platformconfig is a DB-backed feature-flag / config store (PAM P2-1
// peripheral). It replaces scattered env-only flags with an auditable,
// operator-editable store. Reads fall back to a caller-supplied default (env or
// literal), so an unset/unavailable store never changes behavior — a flag that
// isn't in the DB reads exactly as it does today.
package platformconfig

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const dbTimeout = 10 * time.Second

// ErrNotFound is returned by Get when no flag matches the key.
var ErrNotFound = errors.New("config flag not found")

// ErrInvalidKey rejects empty keys at the write boundary.
var ErrInvalidKey = errors.New("config key is required")

// Flag is one editable configuration value.
type Flag struct {
	Key         string `json:"key"`
	Value       string `json:"value"`
	Description string `json:"description,omitempty"`
	UpdatedBy   string `json:"updatedBy,omitempty"`
	UpdatedAt   string `json:"updatedAt,omitempty"`
}

// Store persists flags.
type Store struct {
	db *sql.DB
}

// NewStore creates the store and ensures its schema.
func NewStore(db *sql.DB) (*Store, error) {
	s := &Store{db: db}
	if err := s.ensureSchema(); err != nil {
		return nil, fmt.Errorf("platform config schema init: %w", err)
	}
	return s, nil
}

func (s *Store) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS platform_config (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`)
	return err
}

// Get returns the flag for key, or ErrNotFound.
func (s *Store) Get(ctx context.Context, key string) (*Flag, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	f := &Flag{Key: key}
	var desc, updatedBy sql.NullString
	err := s.db.QueryRowContext(ctx, `
SELECT config_value, description, updated_by, CAST(updated_at AS TEXT)
FROM platform_config WHERE config_key = $1`, key).
		Scan(&f.Value, &desc, &updatedBy, &f.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if desc.Valid {
		f.Description = desc.String
	}
	if updatedBy.Valid {
		f.UpdatedBy = updatedBy.String
	}
	return f, nil
}

// GetString returns the stored value for key, or fallback when the store is
// nil, the key is absent, or a read fails. Never blocks on the store.
func (s *Store) GetString(ctx context.Context, key, fallback string) string {
	if s == nil {
		return fallback
	}
	f, err := s.Get(ctx, key)
	if err != nil || f == nil {
		return fallback
	}
	return f.Value
}

// GetBool interprets the stored value as a boolean ("true"/"1"/"yes"), or
// returns fallback when unset/unavailable.
func (s *Store) GetBool(ctx context.Context, key string, fallback bool) bool {
	if s == nil {
		return fallback
	}
	f, err := s.Get(ctx, key)
	if err != nil || f == nil {
		return fallback
	}
	switch strings.ToLower(strings.TrimSpace(f.Value)) {
	case "true", "1", "yes", "on":
		return true
	case "false", "0", "no", "off":
		return false
	default:
		return fallback
	}
}

// Upsert creates or replaces a flag.
func (s *Store) Upsert(ctx context.Context, f Flag, updatedBy string) (*Flag, error) {
	f.Key = strings.TrimSpace(f.Key)
	if f.Key == "" {
		return nil, ErrInvalidKey
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	if _, err := s.db.ExecContext(ctx, `
INSERT INTO platform_config (config_key, config_value, description, updated_by, updated_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (config_key) DO UPDATE
SET config_value = EXCLUDED.config_value, description = EXCLUDED.description,
    updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
		f.Key, f.Value, nullString(f.Description), nullString(updatedBy)); err != nil {
		return nil, err
	}
	return s.Get(ctx, f.Key)
}

// List returns all flags ordered by key.
func (s *Store) List(ctx context.Context) ([]Flag, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := s.db.QueryContext(ctx, `
SELECT config_key, config_value, COALESCE(description,''), COALESCE(updated_by,''), CAST(updated_at AS TEXT)
FROM platform_config ORDER BY config_key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Flag{}
	for rows.Next() {
		var f Flag
		if err := rows.Scan(&f.Key, &f.Value, &f.Description, &f.UpdatedBy, &f.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func nullString(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}
