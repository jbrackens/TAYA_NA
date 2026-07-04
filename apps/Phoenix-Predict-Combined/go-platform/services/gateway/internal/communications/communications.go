// Package communications implements the back-office per-player sent-communication
// history (PAM spec §20 Notes, Documents, and Communication History; Scenario 12).
// It owns only its own table (player_communications) and never touches the
// trading/wallet/prediction core — it shares the *sql.DB like the AML and
// surveillance stores. Slice 1 provides the durable history (Record) and the
// admin read (ListForUser); the agent-initiated templated send that populates it
// is slice 2.
package communications

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const dbTimeout = 10 * time.Second

// defaultListLimit bounds a history page when the caller passes a non-positive
// limit; maxListLimit caps an over-large one.
const (
	defaultListLimit = 50
	maxListLimit     = 200
)

var (
	ErrInvalid           = errors.New("communication requires a user id, channel, and status")
	ErrRecipientNotFound = errors.New("no such player")
)

// Communication is a single record of a message sent (or attempted) to a player.
// Body is retained for the full sent-content history the spec requires.
type Communication struct {
	ID          int64  `json:"id"`
	UserID      string `json:"userId"`
	Channel     string `json:"channel"`
	TemplateKey string `json:"templateKey,omitempty"`
	Subject     string `json:"subject,omitempty"`
	Body        string `json:"body,omitempty"`
	Status      string `json:"status"`
	ActorID     string `json:"actorId,omitempty"`
	CreatedAt   string `json:"createdAt"`
}

// Store persists the player communication history.
type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) (*Store, error) {
	s := &Store{db: db}
	if err := s.ensureSchema(); err != nil {
		return nil, fmt.Errorf("communications schema init: %w", err)
	}
	return s, nil
}

func (s *Store) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	statements := []string{
		`CREATE TABLE IF NOT EXISTS player_communications (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  template_key TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  actor_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE INDEX IF NOT EXISTS idx_player_communications_user ON player_communications (user_id, id DESC)`,
	}
	for _, stmt := range statements {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

// Record durably appends a communication to a player's history and returns it
// with its assigned id and timestamp. user_id, channel, and status are required.
func (s *Store) Record(ctx context.Context, c Communication) (Communication, error) {
	c.UserID = strings.TrimSpace(c.UserID)
	c.Channel = strings.TrimSpace(c.Channel)
	c.Status = strings.TrimSpace(c.Status)
	if c.UserID == "" || c.Channel == "" || c.Status == "" {
		return Communication{}, ErrInvalid
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	var id int64
	var createdAt time.Time
	err := s.db.QueryRowContext(ctx, `
INSERT INTO player_communications (user_id, channel, template_key, subject, body, status, actor_id)
VALUES ($1,$2,$3,$4,$5,$6,$7)
RETURNING id, created_at`,
		c.UserID, c.Channel, c.TemplateKey, c.Subject, c.Body, c.Status, c.ActorID,
	).Scan(&id, &createdAt)
	if err != nil {
		return Communication{}, err
	}
	c.ID = id
	c.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	return c, nil
}

// ListForUser returns a player's communication history, most recent first.
func (s *Store) ListForUser(ctx context.Context, userID string, limit, offset int) ([]Communication, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, ErrInvalid
	}
	if limit <= 0 {
		limit = defaultListLimit
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	if offset < 0 {
		offset = 0
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := s.db.QueryContext(ctx, `
SELECT id, user_id, channel, template_key, subject, body, status, actor_id, CAST(created_at AS TEXT)
FROM player_communications
WHERE user_id = $1
ORDER BY id DESC
LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Communication{}
	for rows.Next() {
		var c Communication
		if err := rows.Scan(&c.ID, &c.UserID, &c.Channel, &c.TemplateKey, &c.Subject, &c.Body, &c.Status, &c.ActorID, &c.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// RecipientEmail resolves a player's contact email for dispatch. Read-only over
// the shared punters table (the same read-only-punters pattern the segmentation
// store uses) — it never touches the prediction/wallet core. Returns
// ErrRecipientNotFound if the player does not exist.
func (s *Store) RecipientEmail(ctx context.Context, userID string) (string, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return "", ErrRecipientNotFound
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	var email string
	err := s.db.QueryRowContext(ctx, `SELECT email FROM punters WHERE id = $1`, userID).Scan(&email)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrRecipientNotFound
	}
	if err != nil {
		return "", err
	}
	return email, nil
}
