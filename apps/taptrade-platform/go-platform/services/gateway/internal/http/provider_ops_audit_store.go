package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	defaultProviderOpsAuditPath = ".runtime/provider_ops_audit.json"
	providerOpsAuditLimit       = 500
	providerOpsAuditDBTimeout   = 5 * time.Second
)

type providerOpsAuditStoreBackend interface {
	Load(limit int) ([]auditLogEntry, error)
	Append(entry auditLogEntry, limit int) error
}

type providerOpsAuditFileStore struct {
	path string
}

func newProviderOpsAuditFileStore(path string) *providerOpsAuditFileStore {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		trimmed = defaultProviderOpsAuditPath
	}
	return &providerOpsAuditFileStore{path: trimmed}
}

func (s *providerOpsAuditFileStore) Load(limit int) ([]auditLogEntry, error) {
	raw, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []auditLogEntry{}, nil
		}
		return nil, err
	}
	if len(raw) == 0 {
		return []auditLogEntry{}, nil
	}

	var entries []auditLogEntry
	if err := json.Unmarshal(raw, &entries); err != nil {
		return nil, err
	}
	return trimAuditEntries(entries, limit), nil
}

func (s *providerOpsAuditFileStore) Append(entry auditLogEntry, limit int) error {
	entries, err := s.Load(limit)
	if err != nil {
		return err
	}
	entries = append(entries, entry)
	entries = trimAuditEntries(entries, limit)
	return writeAuditEntriesFile(s.path, entries)
}

func writeAuditEntriesFile(path string, entries []auditLogEntry) error {
	dir := filepath.Dir(path)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}

	raw, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return err
	}
	tempPath := path + ".tmp"
	if err := os.WriteFile(tempPath, raw, 0o600); err != nil {
		return err
	}
	return os.Rename(tempPath, path)
}

type providerOpsAuditDBStore struct {
	driver string
	db     *sql.DB
}

func newProviderOpsAuditDBStore(driver string, dsn string) (*providerOpsAuditDBStore, error) {
	driver = strings.TrimSpace(driver)
	dsn = strings.TrimSpace(dsn)
	if driver == "" {
		driver = "postgres"
	}
	if dsn == "" {
		return nil, fmt.Errorf("provider ops audit dsn is empty")
	}

	db, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), providerOpsAuditDBTimeout)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	store := &providerOpsAuditDBStore{driver: strings.ToLower(driver), db: db}
	if err := store.ensureSchema(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *providerOpsAuditDBStore) Load(limit int) ([]auditLogEntry, error) {
	if limit <= 0 {
		limit = providerOpsAuditLimit
	}
	if limit > providerOpsAuditLimit {
		limit = providerOpsAuditLimit
	}

	ctx, cancel := context.WithTimeout(context.Background(), providerOpsAuditDBTimeout)
	defer cancel()

	placeholder := s.placeholder(1)
	query := fmt.Sprintf(`
SELECT id, action, actor_id, target_id, occurred_at, details
FROM provider_ops_audit_log
ORDER BY occurred_at DESC, id DESC
LIMIT %s`, placeholder)

	rows, err := s.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := make([]auditLogEntry, 0, limit)
	for rows.Next() {
		var entry auditLogEntry
		if err := rows.Scan(
			&entry.ID,
			&entry.Action,
			&entry.ActorID,
			&entry.TargetID,
			&entry.OccurredAt,
			&entry.Details,
		); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Keep historical chronological order in memory/cache.
	for left, right := 0, len(entries)-1; left < right; left, right = left+1, right-1 {
		entries[left], entries[right] = entries[right], entries[left]
	}
	return entries, nil
}

func (s *providerOpsAuditDBStore) Append(entry auditLogEntry, _ int) error {
	ctx, cancel := context.WithTimeout(context.Background(), providerOpsAuditDBTimeout)
	defer cancel()

	query := fmt.Sprintf(`
INSERT INTO provider_ops_audit_log (
  id,
  action,
  actor_id,
  target_id,
  occurred_at,
  details
) VALUES (
  %s, %s, %s, %s, %s, %s
)`, s.placeholder(1), s.placeholder(2), s.placeholder(3), s.placeholder(4), s.placeholder(5), s.placeholder(6))

	_, err := s.db.ExecContext(ctx, query,
		entry.ID,
		entry.Action,
		entry.ActorID,
		entry.TargetID,
		entry.OccurredAt,
		entry.Details,
	)
	return err
}

func (s *providerOpsAuditDBStore) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), providerOpsAuditDBTimeout)
	defer cancel()

	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS provider_ops_audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  details TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_ops_audit_occurred_at ON provider_ops_audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_ops_audit_action ON provider_ops_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_provider_ops_audit_actor_id ON provider_ops_audit_log(actor_id);`)
	return err
}

func (s *providerOpsAuditDBStore) placeholder(index int) string {
	if s.driver == "postgres" || s.driver == "pgx" {
		return fmt.Sprintf("$%d", index)
	}
	return "?"
}

// sharedAuditDB allows injecting an existing *sql.DB (e.g., from the wallet
// service) so the audit store reuses the same connection pool instead of
// opening a second one.
var sharedAuditDB *sql.DB

// SetSharedAuditDB should be called before initializeProviderOpsAuditStore to
// provide a shared database connection for audit persistence.
func SetSharedAuditDB(db *sql.DB) {
	sharedAuditDB = db
}

func newProviderOpsAuditDBStoreFromDB(db *sql.DB) (*providerOpsAuditDBStore, error) {
	store := &providerOpsAuditDBStore{driver: "postgres", db: db}
	if err := store.ensureSchema(); err != nil {
		return nil, err
	}
	return store, nil
}

func buildProviderOpsAuditStoreFromEnv() (providerOpsAuditStoreBackend, string, string, error) {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("PROVIDER_OPS_AUDIT_STORE_MODE")))
	driver := strings.TrimSpace(os.Getenv("PROVIDER_OPS_AUDIT_DB_DRIVER"))
	if driver == "" {
		driver = strings.TrimSpace(os.Getenv("GATEWAY_DB_DRIVER"))
	}
	dsn := strings.TrimSpace(os.Getenv("PROVIDER_OPS_AUDIT_DB_DSN"))
	if dsn == "" {
		dsn = strings.TrimSpace(os.Getenv("GATEWAY_DB_DSN"))
	}

	// Prefer shared wallet DB when available (avoids opening a second connection)
	if sharedAuditDB != nil {
		store, err := newProviderOpsAuditDBStoreFromDB(sharedAuditDB)
		if err == nil {
			return store, "db(shared)", "", nil
		}
		slog.Warn("failed to use shared DB for audit store; falling back to env config", "error", err)
	}

	wantsDB := mode == "db" || mode == "sql" || mode == "postgres" || mode == "shared" || (mode == "" && dsn != "")
	if wantsDB {
		store, err := newProviderOpsAuditDBStore(driver, dsn)
		if err == nil {
			return store, "db", "", nil
		}
		if mode == "db" || mode == "sql" || mode == "postgres" || mode == "shared" {
			return nil, "", "", err
		}
	}

	path := strings.TrimSpace(os.Getenv("PROVIDER_OPS_AUDIT_FILE"))
	if path == "" {
		path = defaultProviderOpsAuditPath
	}
	return newProviderOpsAuditFileStore(path), "file", path, nil
}

func trimAuditEntries(entries []auditLogEntry, limit int) []auditLogEntry {
	if limit <= 0 {
		limit = providerOpsAuditLimit
	}
	if len(entries) <= limit {
		return entries
	}
	return append([]auditLogEntry{}, entries[len(entries)-limit:]...)
}
