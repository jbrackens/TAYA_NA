package outbox

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	commonkafka "github.com/phoenixbot/phoenix-common/pkg/kafka"
	"go.uber.org/zap"
)

type Config struct {
	Logger       *zap.Logger
	PollInterval time.Duration
	BatchSize    int
}

type Worker struct {
	db       *pgxpool.Pool
	producer *commonkafka.Producer
	config   Config
}

type row struct {
	ID         int64
	Topic      string
	Key        string
	Payload    []byte
	RetryCount int
}

func NewWorker(db *pgxpool.Pool, producer *commonkafka.Producer, cfg Config) *Worker {
	if cfg.Logger == nil {
		cfg.Logger = zap.NewNop()
	}
	if cfg.PollInterval <= 0 {
		cfg.PollInterval = time.Second
	}
	if cfg.BatchSize <= 0 {
		cfg.BatchSize = 50
	}
	return &Worker{db: db, producer: producer, config: cfg}
}

func (w *Worker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.config.PollInterval)
	defer ticker.Stop()
	for {
		if err := w.processBatch(ctx); err != nil && ctx.Err() == nil {
			w.config.Logger.Warn("outbox batch failed", zap.Error(err))
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (w *Worker) processBatch(ctx context.Context) error {
	tx, err := w.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	rows, err := tx.Query(ctx, `
		SELECT id, kafka_topic, COALESCE(kafka_key, ''), payload, retry_count
		FROM event_outbox
		WHERE published = FALSE
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`, w.config.BatchSize)
	if err != nil {
		return err
	}
	deferredClose := true
	defer func() {
		if deferredClose {
			rows.Close()
		}
	}()
	batch := make([]row, 0, w.config.BatchSize)
	for rows.Next() {
		var item row
		if err := rows.Scan(&item.ID, &item.Topic, &item.Key, &item.Payload, &item.RetryCount); err != nil {
			return err
		}
		batch = append(batch, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	rows.Close()
	deferredClose = false
	for _, item := range batch {
		if err := w.producer.Publish(ctx, item.Topic, []byte(item.Key), item.Payload); err != nil {
			if _, updateErr := tx.Exec(ctx, `UPDATE event_outbox SET retry_count = retry_count + 1, last_error = $2 WHERE id = $1`, item.ID, truncate(err.Error(), 2048)); updateErr != nil {
				return fmt.Errorf("publish failed: %w (also failed to update outbox: %v)", err, updateErr)
			}
			continue
		}
		if _, err := tx.Exec(ctx, `UPDATE event_outbox SET published = TRUE, published_at = NOW(), last_error = NULL WHERE id = $1`, item.ID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func truncate(value string, limit int) string {
	if len(value) <= limit {
		return value
	}
	return value[:limit]
}
