package notify

// DB-backed notification templates (PAM P1-6): the transactional copy
// (subject/body) that was hardcoded in Go now lives in a table an operator can
// edit, with {{placeholder}} interpolation. Callers that have no template fall
// back to their built-in copy, so a missing/empty store never blocks a
// notification.

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
)

const templateDBTimeout = 10 * time.Second

var (
	// ErrTemplateNotFound is returned by Get when no active template matches.
	ErrTemplateNotFound = errors.New("notification template not found")
	// ErrInvalidTemplate rejects empties at the write boundary.
	ErrInvalidTemplate = errors.New("template key, subject, and body are required")
)

// placeholderRe matches {{ name }} tokens (optional surrounding spaces).
var placeholderRe = regexp.MustCompile(`\{\{\s*([a-zA-Z0-9_]+)\s*\}\}`)

// Template is one editable message.
type Template struct {
	Key       string `json:"key"`
	Subject   string `json:"subject"`
	Body      string `json:"body"`
	UpdatedBy string `json:"updatedBy,omitempty"`
	UpdatedAt string `json:"updatedAt,omitempty"`
}

// Render substitutes {{placeholders}} from data; unknown placeholders are left
// verbatim (visible, not silently blanked, so a mistemplated message is caught
// in review rather than shipping empty).
func (t Template) Render(data map[string]string) (subject, body string) {
	return renderString(t.Subject, data), renderString(t.Body, data)
}

func renderString(s string, data map[string]string) string {
	return placeholderRe.ReplaceAllStringFunc(s, func(match string) string {
		name := strings.TrimSpace(match[2 : len(match)-2])
		if v, ok := data[name]; ok {
			return v
		}
		return match
	})
}

// TemplateStore persists templates.
type TemplateStore struct {
	db *sql.DB
}

// NewTemplateStore creates the store and ensures its schema.
func NewTemplateStore(db *sql.DB) (*TemplateStore, error) {
	s := &TemplateStore{db: db}
	if err := s.ensureSchema(); err != nil {
		return nil, fmt.Errorf("notification template schema init: %w", err)
	}
	return s, nil
}

func (s *TemplateStore) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), templateDBTimeout)
	defer cancel()
	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS notification_templates (
  template_key TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`)
	return err
}

// Get returns the template for key, or ErrTemplateNotFound.
func (s *TemplateStore) Get(ctx context.Context, key string) (*Template, error) {
	ctx, cancel := context.WithTimeout(ctx, templateDBTimeout)
	defer cancel()
	t := &Template{Key: key}
	var updatedBy sql.NullString
	err := s.db.QueryRowContext(ctx, `
SELECT subject, body, updated_by, CAST(updated_at AS TEXT)
FROM notification_templates WHERE template_key = $1`, key).
		Scan(&t.Subject, &t.Body, &updatedBy, &t.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrTemplateNotFound
	}
	if err != nil {
		return nil, err
	}
	if updatedBy.Valid {
		t.UpdatedBy = updatedBy.String
	}
	return t, nil
}

// Upsert creates or replaces a template.
func (s *TemplateStore) Upsert(ctx context.Context, t Template, updatedBy string) (*Template, error) {
	t.Key = strings.TrimSpace(t.Key)
	t.Subject = strings.TrimSpace(t.Subject)
	t.Body = strings.TrimSpace(t.Body)
	if t.Key == "" || t.Subject == "" || t.Body == "" {
		return nil, ErrInvalidTemplate
	}
	ctx, cancel := context.WithTimeout(ctx, templateDBTimeout)
	defer cancel()
	if _, err := s.db.ExecContext(ctx, `
INSERT INTO notification_templates (template_key, subject, body, updated_by, updated_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (template_key) DO UPDATE
SET subject = EXCLUDED.subject, body = EXCLUDED.body,
    updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
		t.Key, t.Subject, t.Body, nullString(updatedBy)); err != nil {
		return nil, err
	}
	return s.Get(ctx, t.Key)
}

// List returns all templates ordered by key.
func (s *TemplateStore) List(ctx context.Context) ([]Template, error) {
	ctx, cancel := context.WithTimeout(ctx, templateDBTimeout)
	defer cancel()
	rows, err := s.db.QueryContext(ctx, `
SELECT template_key, subject, body, COALESCE(updated_by,''), CAST(updated_at AS TEXT)
FROM notification_templates ORDER BY template_key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Template{}
	for rows.Next() {
		var t Template
		if err := rows.Scan(&t.Key, &t.Subject, &t.Body, &t.UpdatedBy, &t.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// RenderOrFallback fetches a template and renders it; if the store is nil, the
// template is missing, or a read fails, it returns the caller's fallback copy
// unchanged. A notification is never blocked on template availability. As a
// final guard, if rendering produces an empty subject or body (e.g. an
// operator authored a template whose only content is a placeholder that
// resolves empty for this event), the fallback is used instead — a
// notification is never shipped blank.
func RenderOrFallback(ctx context.Context, store *TemplateStore, key string, data map[string]string, fbSubject, fbBody string) (string, string) {
	if store == nil {
		return fbSubject, fbBody
	}
	t, err := store.Get(ctx, key)
	if err != nil || t == nil {
		return fbSubject, fbBody
	}
	subject, body := t.Render(data)
	if strings.TrimSpace(subject) == "" || strings.TrimSpace(body) == "" {
		return fbSubject, fbBody
	}
	return subject, body
}

func nullString(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}
