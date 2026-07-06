package webhooks

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/lib/pq"
)

// Store persists the endpoint registry and the delivery outbox (migration 039).
// The dispatch worker drives it: Enqueue at commit time, then ClaimDue → send →
// MarkDelivered / Reschedule / DeadLetter. Defined as an interface so the worker
// can be unit-tested against a fake (the SQL round-trip is covered separately by
// a GATEWAY_DB_DSN-gated integration test).
type Store interface {
	// CreateEndpoint registers a receiver and returns it with ID + timestamps set.
	CreateEndpoint(ctx context.Context, ep Endpoint) (Endpoint, error)
	// ListEndpoints returns a partner's endpoints, newest first.
	ListEndpoints(ctx context.Context, userID string) ([]Endpoint, error)
	// SetEndpointActive toggles an endpoint, scoped to its owner so a partner
	// can only pause/resume their own. Returns sql.ErrNoRows if nothing matched.
	SetEndpointActive(ctx context.Context, id, userID string, active bool) error

	// Enqueue fans an event out to every active endpoint that Wants its type,
	// inserting one pending delivery row each. Returns the number enqueued.
	Enqueue(ctx context.Context, eventType string, data json.RawMessage) (int, error)

	// ClaimDue leases up to limit due deliveries (pending, next_attempt_at <=
	// now) for leaseFor, returning each joined with its endpoint's URL + secret
	// so the worker can send without a second query. The lease pushes
	// next_attempt_at forward so a crash mid-send re-surfaces the row rather
	// than losing it; a successful/failed finalize overwrites it.
	ClaimDue(ctx context.Context, limit int, leaseFor time.Duration) ([]DueDelivery, error)

	// MarkDelivered closes a delivery as succeeded (terminal).
	MarkDelivered(ctx context.Context, id string, statusCode int) error
	// Reschedule records a transient failure and sets the next backoff time.
	Reschedule(ctx context.Context, id string, nextAttemptAt time.Time, statusCode int, errMsg string) error
	// DeadLetter closes a delivery as permanently failed (terminal).
	DeadLetter(ctx context.Context, id string, statusCode int, errMsg string) error
}

// DueDelivery is a claimed outbox row joined with the endpoint coordinates the
// worker needs to actually send it. Attempts is the count BEFORE this attempt —
// the worker uses it to decide retry-vs-dead-letter.
type DueDelivery struct {
	ID        string
	EventType string
	Payload   json.RawMessage
	Attempts  int
	CreatedAt time.Time
	URL       string
	Secret    string
}

// Event reconstructs the signed wire envelope from a claimed row. The delivery
// id doubles as the event id (receivers dedupe on it).
func (d DueDelivery) Event() Event {
	return Event{ID: d.ID, Type: d.EventType, CreatedAt: d.CreatedAt, Data: d.Payload}
}

// SQLStore is the PostgreSQL-backed Store.
type SQLStore struct{ db *sql.DB }

// NewSQLStore wraps an open *sql.DB.
func NewSQLStore(db *sql.DB) *SQLStore { return &SQLStore{db: db} }

func (s *SQLStore) CreateEndpoint(ctx context.Context, ep Endpoint) (Endpoint, error) {
	events := ep.Events
	if events == nil {
		events = []string{}
	}
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO webhook_endpoints (user_id, url, secret, events, active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`,
		ep.PartnerID, ep.URL, ep.Secret, pq.Array(events), ep.Active,
	).Scan(&ep.ID)
	if err != nil {
		return Endpoint{}, err
	}
	ep.Events = events
	return ep, nil
}

func (s *SQLStore) ListEndpoints(ctx context.Context, userID string) ([]Endpoint, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, url, secret, events, active
		FROM webhook_endpoints
		WHERE user_id = $1
		ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []Endpoint
	for rows.Next() {
		var ep Endpoint
		if err := rows.Scan(&ep.ID, &ep.PartnerID, &ep.URL, &ep.Secret, pq.Array(&ep.Events), &ep.Active); err != nil {
			return nil, err
		}
		out = append(out, ep)
	}
	return out, rows.Err()
}

func (s *SQLStore) SetEndpointActive(ctx context.Context, id, userID string, active bool) error {
	res, err := s.db.ExecContext(ctx, `
		UPDATE webhook_endpoints SET active = $3, updated_at = now()
		WHERE id = $1 AND user_id = $2`, id, userID, active)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *SQLStore) Enqueue(ctx context.Context, eventType string, data json.RawMessage) (int, error) {
	if len(data) == 0 {
		data = json.RawMessage(`{}`)
	}
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO webhook_deliveries (endpoint_id, event_type, payload)
		SELECT id, $1, $2::jsonb
		FROM webhook_endpoints
		WHERE active = true
		  AND ($1 = ANY(events) OR cardinality(events) = 0)`,
		eventType, []byte(data))
	if err != nil {
		return 0, err
	}
	n, err := res.RowsAffected()
	return int(n), err
}

func (s *SQLStore) ClaimDue(ctx context.Context, limit int, leaseFor time.Duration) ([]DueDelivery, error) {
	rows, err := s.db.QueryContext(ctx, `
		UPDATE webhook_deliveries d
		SET next_attempt_at = now() + make_interval(secs => $2::double precision)
		FROM webhook_endpoints e
		WHERE d.endpoint_id = e.id
		  AND d.id IN (
		      SELECT id FROM webhook_deliveries
		      WHERE status = 'pending' AND next_attempt_at <= now()
		      ORDER BY next_attempt_at
		      LIMIT $1
		      FOR UPDATE SKIP LOCKED
		  )
		RETURNING d.id, d.event_type, d.payload, d.attempts, d.created_at, e.url, e.secret`,
		limit, leaseFor.Seconds())
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []DueDelivery
	for rows.Next() {
		var d DueDelivery
		var payload []byte
		if err := rows.Scan(&d.ID, &d.EventType, &payload, &d.Attempts, &d.CreatedAt, &d.URL, &d.Secret); err != nil {
			return nil, err
		}
		d.Payload = json.RawMessage(payload)
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *SQLStore) MarkDelivered(ctx context.Context, id string, statusCode int) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE webhook_deliveries
		SET status = 'delivered', attempts = attempts + 1,
		    last_status_code = $2, last_error = NULL, delivered_at = now()
		WHERE id = $1`, id, statusCode)
	return err
}

func (s *SQLStore) Reschedule(ctx context.Context, id string, nextAttemptAt time.Time, statusCode int, errMsg string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE webhook_deliveries
		SET attempts = attempts + 1, next_attempt_at = $2,
		    last_status_code = $3, last_error = $4
		WHERE id = $1`, id, nextAttemptAt.UTC(), nullableCode(statusCode), errMsg)
	return err
}

func (s *SQLStore) DeadLetter(ctx context.Context, id string, statusCode int, errMsg string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE webhook_deliveries
		SET status = 'failed', attempts = attempts + 1,
		    last_status_code = $2, last_error = $3
		WHERE id = $1`, id, nullableCode(statusCode), errMsg)
	return err
}

// nullableCode maps a 0 status (no HTTP response — network/timeout) to NULL so
// the column reflects "no status received" rather than a bogus 0.
func nullableCode(code int) any {
	if code == 0 {
		return nil
	}
	return code
}
