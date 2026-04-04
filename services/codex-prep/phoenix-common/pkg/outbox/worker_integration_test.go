package outbox

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	commonkafka "github.com/phoenixbot/phoenix-common/pkg/kafka"
	"go.uber.org/zap"
)

func TestProcessBatchRetriesAndPublishesRecoveredRows(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	root := codexPrepRoot(t)
	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_common_outbox_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))

	insertOutboxRow(t, ctx, testDSN, "11111111-2222-3333-4444-555555555555")

	pool, err := pgxpool.New(ctx, testDSN)
	if err != nil {
		t.Fatalf("connect test db: %v", err)
	}
	defer pool.Close()

	badProducer, err := commonkafka.NewProducer("127.0.0.1:1", &commonkafka.ProducerConfig{Logger: zap.NewNop(), Timeout: 250})
	if err != nil {
		t.Fatalf("create bad producer: %v", err)
	}
	badWorker := NewWorker(pool, badProducer, Config{Logger: zap.NewNop(), PollInterval: 50 * time.Millisecond, BatchSize: 10})
	if err := badWorker.processBatch(ctx); err != nil {
		t.Fatalf("process bad outbox batch: %v", err)
	}

	state := loadOutboxState(t, ctx, testDSN)
	if state.Published || state.RetryCount == 0 || strings.TrimSpace(state.LastError) == "" {
		t.Fatalf("expected retry metadata after failed publish, got %+v", state)
	}

	goodProducer, err := commonkafka.NewProducer(getenv("PHOENIX_INTEGRATION_KAFKA_BROKERS", "localhost:9092"), &commonkafka.ProducerConfig{Logger: zap.NewNop(), Timeout: 5000})
	if err != nil {
		t.Fatalf("create good producer: %v", err)
	}
	defer goodProducer.Close()

	goodWorker := NewWorker(pool, goodProducer, Config{Logger: zap.NewNop(), PollInterval: 50 * time.Millisecond, BatchSize: 10})
	if err := goodWorker.processBatch(ctx); err != nil {
		t.Fatalf("process recovered outbox batch: %v", err)
	}

	state = loadOutboxState(t, ctx, testDSN)
	if !state.Published {
		t.Fatalf("expected published outbox row after broker recovery, got %+v", state)
	}
}

func TestProcessBatchBackpressureRetriesAcrossMultipleRows(t *testing.T) {
	if os.Getenv("PHOENIX_COMPOSE_INTEGRATION") != "1" {
		t.Skip("set PHOENIX_COMPOSE_INTEGRATION=1 to run compose-backed integration")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	root := codexPrepRoot(t)
	adminDSN := getenv("PHOENIX_INTEGRATION_ADMIN_DSN", "postgres://phoenix:phoenix_dev@localhost:5432/postgres?sslmode=disable")
	testDBName := fmt.Sprintf("phoenix_common_outbox_backpressure_%d", time.Now().UnixNano())
	testDSN := recreateDatabase(t, ctx, adminDSN, testDBName)
	applyMigrations(t, ctx, testDSN, filepath.Join(root, "migrations"))

	ids := []string{
		"10000000-0000-0000-0000-000000000001",
		"10000000-0000-0000-0000-000000000002",
		"10000000-0000-0000-0000-000000000003",
	}
	insertOutboxRows(t, ctx, testDSN, ids...)

	pool, err := pgxpool.New(ctx, testDSN)
	if err != nil {
		t.Fatalf("connect test db: %v", err)
	}
	defer pool.Close()

	badProducer, err := commonkafka.NewProducer("127.0.0.1:1", &commonkafka.ProducerConfig{Logger: zap.NewNop(), Timeout: 250})
	if err != nil {
		t.Fatalf("create bad producer: %v", err)
	}
	badWorker := NewWorker(pool, badProducer, Config{Logger: zap.NewNop(), PollInterval: 50 * time.Millisecond, BatchSize: 2})
	if err := badWorker.processBatch(ctx); err != nil {
		t.Fatalf("first backpressure batch failed: %v", err)
	}
	if err := badWorker.processBatch(ctx); err != nil {
		t.Fatalf("second backpressure batch failed: %v", err)
	}

	states := loadAllOutboxStates(t, ctx, testDSN)
	if len(states) != 3 {
		t.Fatalf("expected three outbox rows, got %d", len(states))
	}
	if states[0].RetryCount != 2 || states[1].RetryCount != 2 {
		t.Fatalf("expected first two rows to be retried twice, got %+v", states)
	}
	if states[2].RetryCount != 0 {
		t.Fatalf("expected third row to remain untouched under batch backpressure, got %+v", states[2])
	}

	goodProducer, err := commonkafka.NewProducer(getenv("PHOENIX_INTEGRATION_KAFKA_BROKERS", "localhost:9092"), &commonkafka.ProducerConfig{Logger: zap.NewNop(), Timeout: 5000})
	if err != nil {
		t.Fatalf("create good producer: %v", err)
	}
	defer goodProducer.Close()

	goodWorker := NewWorker(pool, goodProducer, Config{Logger: zap.NewNop(), PollInterval: 50 * time.Millisecond, BatchSize: 2})
	for i := 0; i < 3; i++ {
		if err := goodWorker.processBatch(ctx); err != nil {
			t.Fatalf("recover backpressure batch %d: %v", i+1, err)
		}
	}

	for _, state := range loadAllOutboxStates(t, ctx, testDSN) {
		if !state.Published {
			t.Fatalf("expected all rows published after recovery, got %+v", state)
		}
	}
}

type outboxState struct {
	ID         int64
	Published  bool
	RetryCount int
	LastError  string
}

func insertOutboxRow(t *testing.T, ctx context.Context, dsn, aggregateID string) {
	t.Helper()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connect outbox db: %v", err)
	}
	defer pool.Close()

	if _, err := pool.Exec(ctx, `
		INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key, published, retry_count)
		VALUES ('wallet', $1::uuid, 'WalletDepositCreated', '{"amount":"10.00"}'::jsonb, 'phoenix.wallet.transactions', $1, FALSE, 0)
	`, aggregateID); err != nil {
		t.Fatalf("insert outbox row: %v", err)
	}
}

func insertOutboxRows(t *testing.T, ctx context.Context, dsn string, aggregateIDs ...string) {
	t.Helper()
	for _, aggregateID := range aggregateIDs {
		insertOutboxRow(t, ctx, dsn, aggregateID)
	}
}

func loadOutboxState(t *testing.T, ctx context.Context, dsn string) outboxState {
	t.Helper()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connect outbox db: %v", err)
	}
	defer pool.Close()

	var state outboxState
	if err := pool.QueryRow(ctx, `
		SELECT id, published, retry_count, COALESCE(last_error, '')
		FROM event_outbox
		ORDER BY id DESC
		LIMIT 1
	`).Scan(&state.ID, &state.Published, &state.RetryCount, &state.LastError); err != nil {
		t.Fatalf("load outbox state: %v", err)
	}
	return state
}

func loadAllOutboxStates(t *testing.T, ctx context.Context, dsn string) []outboxState {
	t.Helper()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connect outbox db: %v", err)
	}
	defer pool.Close()

	rows, err := pool.Query(ctx, `
		SELECT id, published, retry_count, COALESCE(last_error, '')
		FROM event_outbox
		ORDER BY id ASC
	`)
	if err != nil {
		t.Fatalf("query outbox state: %v", err)
	}
	defer rows.Close()

	var states []outboxState
	for rows.Next() {
		var state outboxState
		if err := rows.Scan(&state.ID, &state.Published, &state.RetryCount, &state.LastError); err != nil {
			t.Fatalf("scan outbox state: %v", err)
		}
		states = append(states, state)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iterate outbox state: %v", err)
	}
	return states
}

func codexPrepRoot(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("unable to resolve current file path")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", ".."))
}

func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func recreateDatabase(t *testing.T, ctx context.Context, adminDSN, dbName string) string {
	t.Helper()
	adminPool, err := pgxpool.New(ctx, adminDSN)
	if err != nil {
		t.Fatalf("connect admin db: %v", err)
	}
	defer adminPool.Close()
	_, _ = adminPool.Exec(ctx, fmt.Sprintf("DROP DATABASE IF EXISTS %s WITH (FORCE)", quoteIdentifier(dbName)))
	if _, err := adminPool.Exec(ctx, fmt.Sprintf("CREATE DATABASE %s", quoteIdentifier(dbName))); err != nil {
		t.Fatalf("create test db: %v", err)
	}
	base := adminDSN
	if idx := strings.LastIndex(base, "/"); idx != -1 {
		if q := strings.Index(base[idx+1:], "?"); q != -1 {
			base = base[:idx+1] + dbName + base[idx+1+q:]
		} else {
			base = base[:idx+1] + dbName
		}
	}
	return base
}

func quoteIdentifier(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}

func applyMigrations(t *testing.T, ctx context.Context, dsn string, migrationsDir string) {
	t.Helper()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connect test db: %v", err)
	}
	defer pool.Close()
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		t.Fatalf("read migrations: %v", err)
	}
	files := make([]string, 0)
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, ".sql") || len(name) < 3 || name[0] < '0' || name[0] > '9' {
			continue
		}
		files = append(files, name)
	}
	sort.Strings(files)
	for _, name := range files {
		content, err := os.ReadFile(filepath.Join(migrationsDir, name))
		if err != nil {
			t.Fatalf("read migration %s: %v", name, err)
		}
		sql := string(content)
		if idx := strings.Index(sql, "-- Down"); idx != -1 {
			sql = sql[:idx]
		}
		if _, err := pool.Exec(ctx, sql); err != nil {
			t.Fatalf("apply migration %s: %v", name, err)
		}
	}
}
