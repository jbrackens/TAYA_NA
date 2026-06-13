package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/phoenixbot/phoenix-events/internal/models"
)

var (
	ErrNotFound  = errors.New("not found")
	ErrConflict  = errors.New("conflict")
	allowedState = map[string]struct{}{
		"scheduled": {},
		"live":      {},
		"postponed": {},
		"cancelled": {},
		"completed": {},
	}
)

type Repository interface {
	CreateEvent(ctx context.Context, req models.CreateEventRequest) (*models.Event, error)
	UpsertEvent(ctx context.Context, req models.CreateEventRequest) (*models.Event, bool, error)
	GetEvent(ctx context.Context, eventID string) (*models.Event, error)
	ListEvents(ctx context.Context, filters models.EventFilters) ([]*models.Event, int, error)
	UpdateFixtureStatus(ctx context.Context, eventID string, status string) (*models.Event, error)
	UpdateLiveScore(ctx context.Context, eventID string, req models.UpdateLiveScoreRequest) (*models.Event, error)
	UpdateResult(ctx context.Context, eventID string, req models.UpdateResultRequest) (*models.Event, error)
	ListSports(ctx context.Context) ([]models.SportSummary, error)
	ListLeagues(ctx context.Context, sport string) ([]models.LeagueSummary, error)
	ListTournaments(ctx context.Context, sport string) ([]models.TournamentSummary, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

type eventMetadata struct {
	HomeTeam     string                        `json:"home_team,omitempty"`
	AwayTeam     string                        `json:"away_team,omitempty"`
	Venue        string                        `json:"venue,omitempty"`
	Country      string                        `json:"country,omitempty"`
	LiveScore    *models.LiveScore             `json:"live_score,omitempty"`
	Result       *models.ResultInfo            `json:"result,omitempty"`
	Period       string                        `json:"period,omitempty"`
	ClockSeconds *int                          `json:"clock_seconds,omitempty"`
	Stats        models.EventStats             `json:"stats,omitempty"`
	Incidents    []models.MatchTrackerIncident `json:"incidents,omitempty"`
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateEvent(ctx context.Context, req models.CreateEventRequest) (*models.Event, error) {
	if strings.TrimSpace(req.ExternalEventID) != "" {
		var existing string
		err := r.pool.QueryRow(ctx, `SELECT id FROM events WHERE external_id = $1 LIMIT 1`, req.ExternalEventID).Scan(&existing)
		if err == nil {
			return nil, ErrConflict
		}
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	}
	metadata := eventMetadata{
		HomeTeam: req.HomeTeam,
		AwayTeam: req.AwayTeam,
		Venue:    req.Venue,
		Country:  req.Country,
	}
	payload, err := json.Marshal(metadata)
	if err != nil {
		return nil, err
	}
	id := uuid.NewString()
	now := time.Now().UTC()
	name := fmt.Sprintf("%s vs %s", strings.TrimSpace(req.HomeTeam), strings.TrimSpace(req.AwayTeam))
	if _, err := r.pool.Exec(ctx, `
		INSERT INTO events (id, name, sport, league, start_time, status, external_id, metadata, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $7, $8, $8)
	`, id, name, req.Sport, nullIfBlank(req.League), req.ScheduledStart.UTC(), nullIfBlank(req.ExternalEventID), payload, now); err != nil {
		return nil, err
	}
	if err := r.appendOutbox(ctx, "event", id, "EventCreated", map[string]any{
		"event_id":          id,
		"external_event_id": req.ExternalEventID,
		"sport":             req.Sport,
		"league":            req.League,
		"home_team":         req.HomeTeam,
		"away_team":         req.AwayTeam,
		"scheduled_start":   req.ScheduledStart.UTC().Format(time.RFC3339),
		"venue":             req.Venue,
		"country":           req.Country,
		"created_at":        now.Format(time.RFC3339),
	}, "phoenix.event.created"); err != nil {
		return nil, err
	}
	return r.GetEvent(ctx, id)
}

func (r *PostgresRepository) UpsertEvent(ctx context.Context, req models.CreateEventRequest) (*models.Event, bool, error) {
	if strings.TrimSpace(req.ExternalEventID) == "" {
		return nil, false, fmt.Errorf("external event id required")
	}

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback(ctx)

	var (
		eventID     string
		metadataRaw []byte
	)
	err = tx.QueryRow(ctx, `SELECT id, COALESCE(metadata, '{}'::jsonb) FROM events WHERE external_id = $1 FOR UPDATE`, req.ExternalEventID).Scan(&eventID, &metadataRaw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			tx.Rollback(ctx)
			created, createErr := r.CreateEvent(ctx, req)
			return created, true, createErr
		}
		return nil, false, err
	}

	meta := &eventMetadata{}
	if len(metadataRaw) > 0 {
		if err := json.Unmarshal(metadataRaw, meta); err != nil {
			return nil, false, err
		}
	}
	meta.HomeTeam = req.HomeTeam
	meta.AwayTeam = req.AwayTeam
	meta.Venue = req.Venue
	meta.Country = req.Country

	payload, err := json.Marshal(meta)
	if err != nil {
		return nil, false, err
	}
	now := time.Now().UTC()
	name := fmt.Sprintf("%s vs %s", strings.TrimSpace(req.HomeTeam), strings.TrimSpace(req.AwayTeam))
	if _, err := tx.Exec(ctx, `
		UPDATE events
		SET name = $2, sport = $3, league = $4, start_time = $5, metadata = $6, updated_at = $7
		WHERE id = $1
	`, eventID, name, req.Sport, nullIfBlank(req.League), req.ScheduledStart.UTC(), payload, now); err != nil {
		return nil, false, err
	}
	if err := r.appendOutboxTx(ctx, tx, "event", eventID, "EventUpserted", map[string]any{
		"event_id":          eventID,
		"external_event_id": req.ExternalEventID,
		"sport":             req.Sport,
		"league":            req.League,
		"home_team":         req.HomeTeam,
		"away_team":         req.AwayTeam,
		"scheduled_start":   req.ScheduledStart.UTC().Format(time.RFC3339),
		"venue":             req.Venue,
		"country":           req.Country,
		"updated_at":        now.Format(time.RFC3339),
	}, "phoenix.event.upserted"); err != nil {
		return nil, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, false, err
	}
	updated, err := r.GetEvent(ctx, eventID)
	return updated, false, err
}

func (r *PostgresRepository) GetEvent(ctx context.Context, eventID string) (*models.Event, error) {
	return r.scanEvent(ctx, r.pool.QueryRow(ctx, `
		SELECT id, name, sport, COALESCE(league, ''), start_time, status, COALESCE(external_id, ''), COALESCE(metadata, '{}'::jsonb), created_at, updated_at
		FROM events WHERE id = $1
	`, eventID))
}

func (r *PostgresRepository) ListEvents(ctx context.Context, filters models.EventFilters) ([]*models.Event, int, error) {
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit
	conditions := []string{"1=1"}
	args := make([]any, 0, 8)
	argPos := 1
	if strings.TrimSpace(filters.Sport) != "" {
		conditions = append(conditions, fmt.Sprintf("sport = $%d", argPos))
		args = append(args, filters.Sport)
		argPos++
	}
	if strings.TrimSpace(filters.League) != "" {
		conditions = append(conditions, fmt.Sprintf("league = $%d", argPos))
		args = append(args, filters.League)
		argPos++
	}
	if strings.TrimSpace(filters.Status) != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argPos))
		args = append(args, filters.Status)
		argPos++
	}
	if strings.TrimSpace(filters.ExternalID) != "" {
		conditions = append(conditions, fmt.Sprintf("external_id = $%d", argPos))
		args = append(args, filters.ExternalID)
		argPos++
	}
	if filters.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("start_time >= $%d", argPos))
		args = append(args, filters.StartDate.UTC())
		argPos++
	}
	if filters.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("start_time <= $%d", argPos))
		args = append(args, filters.EndDate.UTC())
		argPos++
	}
	whereClause := strings.Join(conditions, " AND ")
	var total int
	if err := r.pool.QueryRow(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM events WHERE %s`, whereClause), args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, fmt.Sprintf(`
		SELECT id, name, sport, COALESCE(league, ''), start_time, status, COALESCE(external_id, ''), COALESCE(metadata, '{}'::jsonb), created_at, updated_at
		FROM events
		WHERE %s
		ORDER BY start_time ASC, created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argPos, argPos+1), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]*models.Event, 0, limit)
	for rows.Next() {
		item, err := r.scanEventRow(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *PostgresRepository) UpdateFixtureStatus(ctx context.Context, eventID string, status string) (*models.Event, error) {
	return r.updateEventMetadata(ctx, eventID, status, func(_ *eventMetadata) {})
}

func (r *PostgresRepository) UpdateLiveScore(ctx context.Context, eventID string, req models.UpdateLiveScoreRequest) (*models.Event, error) {
	return r.updateEventMetadata(ctx, eventID, req.Status, func(meta *eventMetadata) {
		meta.LiveScore = &models.LiveScore{HomeScore: req.HomeScore, AwayScore: req.AwayScore, ElapsedMinutes: req.ElapsedMinutes, LastUpdate: req.LastUpdate.UTC()}
		if strings.TrimSpace(req.Period) != "" {
			meta.Period = strings.TrimSpace(req.Period)
		}
		if req.ClockSeconds != nil {
			value := *req.ClockSeconds
			meta.ClockSeconds = &value
		}
		if len(req.Stats) > 0 {
			meta.Stats = req.Stats
		}
		if len(req.Incidents) > 0 {
			meta.Incidents = req.Incidents
		}
	})
}

func (r *PostgresRepository) UpdateResult(ctx context.Context, eventID string, req models.UpdateResultRequest) (*models.Event, error) {
	return r.updateEventMetadata(ctx, eventID, req.Status, func(meta *eventMetadata) {
		completedAt := req.CompletedAt.UTC()
		meta.Result = &models.ResultInfo{Outcome: req.Result, HomeScore: req.HomeScore, AwayScore: req.AwayScore, CompletedAt: &completedAt}
		meta.LiveScore = &models.LiveScore{HomeScore: req.HomeScore, AwayScore: req.AwayScore, LastUpdate: completedAt}
	})
}

func (r *PostgresRepository) ListSports(ctx context.Context) ([]models.SportSummary, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT sport, ARRAY_REMOVE(ARRAY_AGG(DISTINCT league), NULL), COUNT(*)
		FROM events
		GROUP BY sport
		ORDER BY sport ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]models.SportSummary, 0)
	for rows.Next() {
		var item models.SportSummary
		if err := rows.Scan(&item.ID, &item.Leagues, &item.EventsCount); err != nil {
			return nil, err
		}
		item.Name = humanizeSport(item.ID)
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *PostgresRepository) ListLeagues(ctx context.Context, sport string) ([]models.LeagueSummary, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT COALESCE(league, ''), COALESCE(metadata->>'country', ''), COUNT(*)
		FROM events
		WHERE sport = $1
		GROUP BY league, metadata->>'country'
		ORDER BY league ASC
	`, sport)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]models.LeagueSummary, 0)
	for rows.Next() {
		var item models.LeagueSummary
		if err := rows.Scan(&item.Name, &item.Country, &item.EventsCount); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *PostgresRepository) ListTournaments(ctx context.Context, sport string) ([]models.TournamentSummary, error) {
	query := `
		SELECT
			sport,
			COALESCE(league, ''),
			COALESCE(metadata->>'country', ''),
			COUNT(*) AS fixtures,
			COUNT(*) FILTER (WHERE status = 'live') AS live_count,
			COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled_count,
			COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
			COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
			COUNT(*) FILTER (WHERE status = 'postponed') AS postponed_count
		FROM events
		WHERE ($1 = '' OR sport = $1)
		GROUP BY sport, league, metadata->>'country'
		ORDER BY sport ASC, league ASC
	`
	rows, err := r.pool.Query(ctx, query, strings.TrimSpace(sport))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]models.TournamentSummary, 0)
	for rows.Next() {
		var item models.TournamentSummary
		if err := rows.Scan(
			&item.Sport,
			&item.League,
			&item.Country,
			&item.Fixtures,
			&item.LiveCount,
			&item.Scheduled,
			&item.Completed,
			&item.Cancelled,
			&item.Postponed,
		); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *PostgresRepository) updateEventMetadata(ctx context.Context, eventID, status string, mutate func(*eventMetadata)) (*models.Event, error) {
	if _, ok := allowedState[status]; !ok {
		return nil, fmt.Errorf("invalid event status")
	}
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var raw []byte
	var currentStatus string
	if err := tx.QueryRow(ctx, `SELECT COALESCE(metadata, '{}'::jsonb), status FROM events WHERE id = $1 FOR UPDATE`, eventID).Scan(&raw, &currentStatus); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	meta := &eventMetadata{}
	if err := json.Unmarshal(raw, meta); err != nil {
		return nil, err
	}
	mutate(meta)
	payload, err := json.Marshal(meta)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, `UPDATE events SET status = $2, metadata = $3, updated_at = $4 WHERE id = $1`, eventID, status, payload, now); err != nil {
		return nil, err
	}
	topic := "phoenix.event.live-score-updated"
	eventType := "EventLiveScoreUpdated"
	if status == "completed" {
		topic = "phoenix.event.completed"
		eventType = "EventCompleted"
	}
	if err := r.appendOutboxTx(ctx, tx, "event", eventID, eventType, map[string]any{
		"event_id":   eventID,
		"status":     status,
		"updated_at": now.Format(time.RFC3339),
		"metadata":   meta,
	}, topic); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetEvent(ctx, eventID)
}

func (r *PostgresRepository) scanEvent(ctx context.Context, row pgx.Row) (*models.Event, error) {
	var (
		eventID     string
		name        string
		sport       string
		league      string
		startTime   time.Time
		status      string
		externalID  string
		metadataRaw []byte
		createdAt   time.Time
		updatedAt   time.Time
	)
	if err := row.Scan(&eventID, &name, &sport, &league, &startTime, &status, &externalID, &metadataRaw, &createdAt, &updatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return mapEvent(eventID, name, sport, league, startTime, status, externalID, metadataRaw, createdAt, updatedAt)
}

func (r *PostgresRepository) scanEventRow(rows pgx.Rows) (*models.Event, error) {
	var (
		eventID     string
		name        string
		sport       string
		league      string
		startTime   time.Time
		status      string
		externalID  string
		metadataRaw []byte
		createdAt   time.Time
		updatedAt   time.Time
	)
	if err := rows.Scan(&eventID, &name, &sport, &league, &startTime, &status, &externalID, &metadataRaw, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	return mapEvent(eventID, name, sport, league, startTime, status, externalID, metadataRaw, createdAt, updatedAt)
}

func mapEvent(eventID, name, sport, league string, startTime time.Time, status string, externalID string, metadataRaw []byte, createdAt, updatedAt time.Time) (*models.Event, error) {
	meta := &eventMetadata{}
	if len(metadataRaw) > 0 {
		if err := json.Unmarshal(metadataRaw, meta); err != nil {
			return nil, err
		}
	}
	return &models.Event{
		EventID:         eventID,
		ExternalEventID: externalID,
		Name:            name,
		Sport:           sport,
		League:          league,
		HomeTeam:        meta.HomeTeam,
		AwayTeam:        meta.AwayTeam,
		ScheduledStart:  startTime,
		Venue:           meta.Venue,
		Status:          status,
		LiveScore:       meta.LiveScore,
		Result:          meta.Result,
		Period:          meta.Period,
		ClockSeconds:    meta.ClockSeconds,
		Stats:           meta.Stats,
		Incidents:       meta.Incidents,
		CreatedAt:       createdAt,
		UpdatedAt:       updatedAt,
	}, nil
}

func (r *PostgresRepository) appendOutbox(ctx context.Context, aggregateType, aggregateID, eventType string, payload map[string]any, topic string) error {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key) VALUES ($1, $2, $3, $4, $5, $6)`, aggregateType, aggregateID, eventType, payloadBytes, topic, aggregateID)
	return err
}

func (r *PostgresRepository) appendOutboxTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any, topic string) error {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key) VALUES ($1, $2, $3, $4, $5, $6)`, aggregateType, aggregateID, eventType, payloadBytes, topic, aggregateID)
	return err
}

func nullIfBlank(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func humanizeSport(sport string) string {
	parts := strings.FieldsFunc(strings.TrimSpace(sport), func(r rune) bool { return r == '_' || r == '-' || r == ' ' })
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
	}
	return strings.Join(parts, " ")
}
