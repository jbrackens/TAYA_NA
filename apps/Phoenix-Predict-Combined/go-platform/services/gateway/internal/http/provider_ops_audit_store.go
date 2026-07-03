package http

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// auditChainLockKey serializes hash-chain appends cluster-wide (GAP-13). It is
// passed to pg_advisory_xact_lock(hashtext(...)) so concurrent appenders cannot
// read the same predecessor hash and fork the chain.
const auditChainLockKey = "provider_ops_audit_chain"

// computeAuditEntryHash returns the tamper-evidence hash for one audit row:
// sha256 over the predecessor's hash plus every identifying field, each
// length-prefixed so no field boundary is forgeable (a value containing a
// separator cannot masquerade as a different record). The chain is broken by
// any post-hoc edit or deletion, independent of the append-only DB trigger.
func computeAuditEntryHash(prevHash string, e auditLogEntry) string {
	h := sha256.New()
	for _, f := range []string{prevHash, e.ID, e.Action, e.ActorID, e.TargetID, e.OccurredAt, e.Details} {
		fmt.Fprintf(h, "%d:", len(f))
		_, _ = h.Write([]byte(f))
	}
	return hex.EncodeToString(h.Sum(nil))
}

func (s *providerOpsAuditDBStore) isPostgres() bool {
	return s.driver == "postgres" || s.driver == "pgx"
}

const (
	defaultProviderOpsAuditPath = ".runtime/provider_ops_audit.json"
	providerOpsAuditLimit       = 500
	providerOpsAuditDBTimeout   = 5 * time.Second
)

type providerOpsAuditStoreBackend interface {
	Load(limit int) ([]auditLogEntry, error)
	Append(entry auditLogEntry, limit int) error
	// VerifyChain walks the tamper-evidence hash chain and reports the first
	// break (GAP-13). File/non-Postgres stores report the chain as not enabled.
	VerifyChain(ctx context.Context) (auditChainResult, error)
}

// auditChainResult is the outcome of a hash-chain integrity check.
type auditChainResult struct {
	OK          bool   `json:"ok"`
	Checked     int    `json:"checked"`
	BrokenAtID  string `json:"brokenAtId,omitempty"`
	BrokenAtSeq int64  `json:"brokenAtSeq,omitempty"`
	Reason      string `json:"reason,omitempty"`
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

func (s *providerOpsAuditFileStore) VerifyChain(context.Context) (auditChainResult, error) {
	// The file store is the dev fallback and carries no hash chain.
	return auditChainResult{OK: true, Reason: "hash chain requires the database audit store (file-mode store is not chained)"}, nil
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

	// Hash-chaining is a Postgres (production) tamper-evidence control. Other
	// drivers (e.g. a dev sqlite) keep the plain insert without a chain.
	if !s.isPostgres() {
		return s.appendPlain(ctx, entry)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	// Serialize appends cluster-wide so the chain stays strictly linear — a
	// concurrent appender cannot read the same predecessor hash and fork the
	// chain. Auto-released on commit/rollback (same idiom as the wallet path).
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, auditChainLockKey); err != nil {
		return err
	}

	// The predecessor is the highest-seq chained row (entry_hash IS NOT NULL);
	// its hash is empty for the genesis entry.
	var prevHash sql.NullString
	err = tx.QueryRowContext(ctx, `
SELECT entry_hash FROM provider_ops_audit_log
WHERE entry_hash IS NOT NULL
ORDER BY seq DESC LIMIT 1`).Scan(&prevHash)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	prev := prevHash.String
	entryHash := computeAuditEntryHash(prev, entry)

	if _, err := tx.ExecContext(ctx, `
INSERT INTO provider_ops_audit_log (id, action, actor_id, target_id, occurred_at, details, prev_hash, entry_hash)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		entry.ID, entry.Action, entry.ActorID, entry.TargetID, entry.OccurredAt, entry.Details, prev, entryHash); err != nil {
		return err
	}
	return tx.Commit()
}

// appendPlain is the pre-hash-chain insert, retained for non-Postgres drivers.
func (s *providerOpsAuditDBStore) appendPlain(ctx context.Context, entry auditLogEntry) error {
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

// VerifyChain walks the chained rows in append (seq) order, recomputing each
// row's hash and confirming each links to its predecessor. It returns the FIRST
// break — an altered row (hash mismatch), a deleted predecessor (broken link),
// or deleted history (non-empty genesis prev_hash) — none of which the
// append-only trigger can detect once dropped.
func (s *providerOpsAuditDBStore) VerifyChain(ctx context.Context) (auditChainResult, error) {
	if !s.isPostgres() {
		return auditChainResult{OK: true, Reason: "hash chain is a Postgres-store control; not enabled for this driver"}, nil
	}
	qctx, cancel := context.WithTimeout(ctx, providerOpsAuditDBTimeout)
	defer cancel()

	rows, err := s.db.QueryContext(qctx, `
SELECT id, action, actor_id, target_id, occurred_at, details, COALESCE(prev_hash,''), COALESCE(entry_hash,''), seq
FROM provider_ops_audit_log
WHERE entry_hash IS NOT NULL
ORDER BY seq ASC`)
	if err != nil {
		return auditChainResult{}, err
	}
	defer rows.Close()

	prev := ""
	checked := 0
	for rows.Next() {
		var e auditLogEntry
		var prevHash, entryHash string
		var seq int64
		if err := rows.Scan(&e.ID, &e.Action, &e.ActorID, &e.TargetID, &e.OccurredAt, &e.Details, &prevHash, &entryHash, &seq); err != nil {
			return auditChainResult{}, err
		}
		if want := computeAuditEntryHash(prevHash, e); entryHash != want {
			return auditChainResult{OK: false, Checked: checked, BrokenAtID: e.ID, BrokenAtSeq: seq, Reason: "entry hash mismatch — row was altered"}, nil
		}
		if checked == 0 {
			if prevHash != "" {
				return auditChainResult{OK: false, Checked: checked, BrokenAtID: e.ID, BrokenAtSeq: seq, Reason: "genesis row has a non-empty prev_hash — earlier entries were deleted"}, nil
			}
		} else if prevHash != prev {
			return auditChainResult{OK: false, Checked: checked, BrokenAtID: e.ID, BrokenAtSeq: seq, Reason: "prev_hash does not match the predecessor — a row was deleted or reordered"}, nil
		}
		prev = entryHash
		checked++
	}
	if err := rows.Err(); err != nil {
		return auditChainResult{}, err
	}
	return auditChainResult{OK: true, Checked: checked}, nil
}

func (s *providerOpsAuditDBStore) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), providerOpsAuditDBTimeout)
	defer cancel()

	if _, err := s.db.ExecContext(ctx, `
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
CREATE INDEX IF NOT EXISTS idx_provider_ops_audit_actor_id ON provider_ops_audit_log(actor_id);`); err != nil {
		return err
	}

	// GAP-13 (PAM §24 Audit Logs and Compliance Evidence): tamper-evidence
	// hash chain. seq gives a monotonic append order (the id/occurred_at
	// columns are not insert-ordered); prev_hash/entry_hash link each row to
	// its predecessor so any post-hoc edit or deletion breaks the chain,
	// independent of the append-only trigger. Postgres-only (production); added
	// idempotently so existing deployments gain the columns on boot.
	if s.isPostgres() {
		if _, err := s.db.ExecContext(ctx, `
ALTER TABLE provider_ops_audit_log ADD COLUMN IF NOT EXISTS seq BIGSERIAL;
ALTER TABLE provider_ops_audit_log ADD COLUMN IF NOT EXISTS prev_hash TEXT;
ALTER TABLE provider_ops_audit_log ADD COLUMN IF NOT EXISTS entry_hash TEXT;`); err != nil {
			return err
		}
	}
	return nil
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
