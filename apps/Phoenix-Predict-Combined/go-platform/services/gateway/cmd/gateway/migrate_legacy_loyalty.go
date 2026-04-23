package main

// Migrate legacy sportsbook loyalty state (.data/loyalty-state.json produced
// by internal/loyalty/persist.go) into the Predict-native Postgres schema
// (migration 015: loyalty_accounts + loyalty_ledger).
//
// Dispatched via `go run ./cmd/gateway migrate-legacy-loyalty --from <path>
// [--dry-run] [--from-lb <path>] [--db <dsn>]`. An explicit operator command
// (not a boot-time import) per PLAN-loyalty-leaderboards.md §8 — startup-time
// migration risks silently pulling demo-seed data into production.
//
// Leaderboard snapshots are intentionally NOT migrated. The sportsbook board
// metrics (qualified_stake_cents, net_profit_cents over indefinite windows)
// don't translate to Predict's Accuracy / Weekly P&L / Sharpness / Category
// Champions shape. The PredictRecomputer repopulates boards from
// prediction_payouts on its 5-minute tick — no historical import needed.

import (
	"context"
	"crypto/sha1"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"phoenix-revival/gateway/internal/loyalty"
)

// legacyLoyaltySnapshot mirrors the shape in
// internal/loyalty/persist.go:loyaltySnapshot. Only the fields we actually
// migrate are listed here — we tolerate extra fields in the JSON.
type legacyLoyaltySnapshot struct {
	Accounts map[string]legacyAccount              `json:"accounts"`
	Ledger   map[string][]legacyLedgerEntry        `json:"ledger"`
	_        map[string]any                        `json:"accrualByKey,omitempty"`
	_        map[string]any                        `json:"adjustByKey,omitempty"`
	_        map[string]any                        `json:"referralsByID,omitempty"`
}

type legacyAccount struct {
	PlayerID             string    `json:"playerId"`
	PointsBalance        int64     `json:"pointsBalance"`
	PointsEarnedLifetime int64     `json:"pointsEarnedLifetime"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

type legacyLedgerEntry struct {
	EntryID      string            `json:"entryId"`
	PlayerID     string            `json:"playerId"`
	EntryType    string            `json:"entryType"`
	EntrySubtype string            `json:"entrySubtype,omitempty"`
	PointsDelta  int64             `json:"pointsDelta"`
	BalanceAfter int64             `json:"balanceAfter"`
	Metadata     map[string]string `json:"metadata,omitempty"`
	CreatedAt    time.Time         `json:"createdAt"`
}

// runMigrateLegacyLoyalty executes the subcommand and returns a process
// exit code. Call sites in main() should `os.Exit(runMigrateLegacyLoyalty(...))`
// without falling through to the server startup.
func runMigrateLegacyLoyalty(args []string) int {
	fs := flag.NewFlagSet("migrate-legacy-loyalty", flag.ContinueOnError)
	from := fs.String("from", "", "path to legacy loyalty-state.json (required)")
	fromLB := fs.String("from-lb", "", "path to legacy leaderboard-state.json (accepted + logged, not imported; see file comment)")
	dryRun := fs.Bool("dry-run", false, "print what would happen without writing")
	dsn := fs.String("db", "", "Postgres DSN; defaults to GATEWAY_DB_DSN env")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	if *from == "" {
		fmt.Fprintln(os.Stderr, "migrate-legacy-loyalty: --from is required")
		fs.Usage()
		return 2
	}

	abs, err := filepath.Abs(*from)
	if err != nil {
		fmt.Fprintf(os.Stderr, "migrate-legacy-loyalty: resolve %s: %v\n", *from, err)
		return 1
	}

	raw, err := os.ReadFile(abs)
	if err != nil {
		fmt.Fprintf(os.Stderr, "migrate-legacy-loyalty: read %s: %v\n", abs, err)
		return 1
	}

	var snap legacyLoyaltySnapshot
	if err := json.Unmarshal(raw, &snap); err != nil {
		fmt.Fprintf(os.Stderr, "migrate-legacy-loyalty: parse %s: %v\n", abs, err)
		return 1
	}

	if *fromLB != "" {
		fmt.Fprintf(os.Stderr,
			"migrate-legacy-loyalty: --from-lb %s ignored — leaderboards are rebuilt from prediction_payouts by the recomputer\n",
			*fromLB)
	}

	// Validate + summarize up front so operators see the plan before any writes.
	userIDs := sortedKeys(snap.Accounts)
	totalLedger := 0
	for _, entries := range snap.Ledger {
		totalLedger += len(entries)
	}

	fmt.Fprintf(os.Stderr, "migrate-legacy-loyalty: %d accounts, %d ledger entries from %s\n",
		len(userIDs), totalLedger, abs)

	if *dryRun {
		for _, uid := range userIDs {
			acct := snap.Accounts[uid]
			tier := loyalty.PredictTierForPoints(acct.PointsBalance)
			fmt.Fprintf(os.Stdout,
				"  would upsert loyalty_accounts: user_id=%s points=%d tier=%d (%s)\n",
				uid, acct.PointsBalance, int(tier), loyalty.PredictTierName(tier))
		}
		for _, uid := range userIDs {
			for _, entry := range snap.Ledger[uid] {
				fmt.Fprintf(os.Stdout,
					"  would insert loyalty_ledger: user_id=%s delta=%d balance_after=%d reason=%q idempotency=%s\n",
					uid, entry.PointsDelta, entry.BalanceAfter,
					ledgerReason(entry), migrationIdempotencyKey(entry))
			}
		}
		fmt.Fprintln(os.Stderr, "migrate-legacy-loyalty: dry run complete — no writes")
		return 0
	}

	resolvedDSN := *dsn
	if resolvedDSN == "" {
		resolvedDSN = os.Getenv("GATEWAY_DB_DSN")
	}
	if resolvedDSN == "" {
		fmt.Fprintln(os.Stderr, "migrate-legacy-loyalty: need --db or GATEWAY_DB_DSN")
		return 2
	}

	db, err := sql.Open("postgres", resolvedDSN)
	if err != nil {
		fmt.Fprintf(os.Stderr, "migrate-legacy-loyalty: open db: %v\n", err)
		return 1
	}
	defer func() { _ = db.Close() }()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "migrate-legacy-loyalty: ping db: %v\n", err)
		return 1
	}

	accountsInserted, ledgerInserted, skipped, err := writeLegacyState(ctx, db, snap, userIDs)
	if err != nil {
		fmt.Fprintf(os.Stderr, "migrate-legacy-loyalty: write failed: %v\n", err)
		return 1
	}

	fmt.Fprintf(os.Stderr, "migrate-legacy-loyalty: done — %d accounts inserted, %d ledger rows inserted, %d ledger rows skipped (idempotency collision)\n",
		accountsInserted, ledgerInserted, skipped)
	return 0
}

// writeLegacyState performs the upsert pass inside a single transaction so a
// partial failure rolls back cleanly. Each ledger row uses an explicit
// "migration:sportsbook:<entryID>" idempotency_key; re-running is safe.
func writeLegacyState(ctx context.Context, db *sql.DB, snap legacyLoyaltySnapshot, userIDs []string) (int, int, int, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, 0, 0, err
	}
	defer func() { _ = tx.Rollback() }()

	accountsInserted := 0
	for _, uid := range userIDs {
		// loyalty_accounts has an FK to punters(id). Sportsbook users that
		// don't yet exist on Predict need a minimal punter row before their
		// loyalty row can land. Match the shape of
		// prediction/sql_repository.go:ensurePunterExistsWithExec — null
		// username so the leaderboard display-name fallback kicks in.
		emailDigest := fmt.Sprintf("%x", sha1.Sum([]byte(uid)))
		email := fmt.Sprintf("%s@predict.local", emailDigest)
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO punters (id, email, status)
			VALUES ($1, $2, 'active')
			ON CONFLICT (id) DO NOTHING`, uid, email); err != nil {
			return 0, 0, 0, fmt.Errorf("ensure punter %s: %w", uid, err)
		}

		acct := snap.Accounts[uid]
		tier := int(loyalty.PredictTierForPoints(acct.PointsBalance))
		updated := acct.UpdatedAt
		if updated.IsZero() {
			updated = time.Now().UTC()
		}
		// ON CONFLICT DO NOTHING: re-running the migration against an
		// already-migrated row leaves it alone. Operators who need to
		// force-overwrite should truncate first.
		res, err := tx.ExecContext(ctx, `
			INSERT INTO loyalty_accounts
			  (user_id, points_balance, tier, last_activity, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $4, $4)
			ON CONFLICT (user_id) DO NOTHING`,
			uid, acct.PointsBalance, tier, updated,
		)
		if err != nil {
			return 0, 0, 0, fmt.Errorf("insert account %s: %w", uid, err)
		}
		n, _ := res.RowsAffected()
		accountsInserted += int(n)
	}

	ledgerInserted := 0
	skipped := 0
	for _, uid := range userIDs {
		entries := snap.Ledger[uid]
		// Replay in chronological order so balance_after values track forward.
		sort.SliceStable(entries, func(i, j int) bool {
			return entries[i].CreatedAt.Before(entries[j].CreatedAt)
		})
		for _, entry := range entries {
			key := migrationIdempotencyKey(entry)
			res, err := tx.ExecContext(ctx, `
				INSERT INTO loyalty_ledger
				  (user_id, event_type, delta_points, balance_after, reason, idempotency_key, created_at)
				VALUES ($1, 'migration', $2, $3, $4, $5, $6)
				ON CONFLICT (idempotency_key) DO NOTHING`,
				uid, entry.PointsDelta, entry.BalanceAfter,
				ledgerReason(entry), key, entry.CreatedAt,
			)
			if err != nil {
				return 0, 0, 0, fmt.Errorf("insert ledger %s: %w", key, err)
			}
			n, _ := res.RowsAffected()
			if n > 0 {
				ledgerInserted++
			} else {
				skipped++
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, 0, 0, err
	}
	return accountsInserted, ledgerInserted, skipped, nil
}

func migrationIdempotencyKey(entry legacyLedgerEntry) string {
	return "migration:sportsbook:" + entry.EntryID
}

func ledgerReason(entry legacyLedgerEntry) string {
	if reason, ok := entry.Metadata["reason"]; ok && reason != "" {
		return reason
	}
	if entry.EntrySubtype != "" {
		return entry.EntrySubtype
	}
	return entry.EntryType
}

func sortedKeys(m map[string]legacyAccount) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
