package http

import (
	"database/sql"
	"fmt"
	"os"
	"sync"
	"testing"

	_ "github.com/lib/pq"
)

// Opt-in live test for the GAP-13 audit hash chain: set AUDIT_LIVE_DSN to a
// scratch database. Skipped when unset (CI, plain go test).
//
// Note: the append-only DB trigger (migration 036) is NOT present in the
// scratch DB (only ensureSchema ran), which is exactly the point of GAP-13 —
// the hash chain provides tamper evidence independent of that trigger, so these
// tests can freely mutate rows to prove the chain detects tampering.

func openAuditChainStore(t *testing.T) (*providerOpsAuditDBStore, *sql.DB) {
	t.Helper()
	dsn := os.Getenv("AUDIT_LIVE_DSN")
	if dsn == "" {
		t.Skip("AUDIT_LIVE_DSN not set; skipping live Postgres audit-chain test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	store, err := newProviderOpsAuditDBStoreFromDB(db)
	if err != nil {
		t.Fatalf("init (ensureSchema must add chain columns): %v", err)
	}
	if _, err := db.Exec("DELETE FROM provider_ops_audit_log"); err != nil {
		t.Fatalf("reset: %v", err)
	}
	return store, db
}

type chainRow struct {
	entry     auditLogEntry
	prevHash  string
	entryHash string
}

func readChain(t *testing.T, db *sql.DB) []chainRow {
	t.Helper()
	rows, err := db.Query(`
SELECT id, action, actor_id, target_id, occurred_at, details,
       COALESCE(prev_hash,''), COALESCE(entry_hash,'')
FROM provider_ops_audit_log
WHERE entry_hash IS NOT NULL
ORDER BY seq ASC`)
	if err != nil {
		t.Fatalf("read chain: %v", err)
	}
	defer rows.Close()
	var out []chainRow
	for rows.Next() {
		var c chainRow
		if err := rows.Scan(&c.entry.ID, &c.entry.Action, &c.entry.ActorID, &c.entry.TargetID,
			&c.entry.OccurredAt, &c.entry.Details, &c.prevHash, &c.entryHash); err != nil {
			t.Fatalf("scan: %v", err)
		}
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows: %v", err)
	}
	return out
}

// verifyChain asserts the rows form one strictly-linear, self-consistent chain:
// genesis prev is empty, each prev links to the prior entry_hash, and every
// entry_hash recomputes from its stored fields.
func verifyChain(t *testing.T, chain []chainRow) {
	t.Helper()
	for i, c := range chain {
		want := computeAuditEntryHash(c.prevHash, c.entry)
		if c.entryHash != want {
			t.Fatalf("row %d (%s): stored hash %s != recomputed %s", i, c.entry.ID, c.entryHash, want)
		}
		if i == 0 {
			if c.prevHash != "" {
				t.Fatalf("genesis row must have empty prev_hash, got %q", c.prevHash)
			}
		} else if c.prevHash != chain[i-1].entryHash {
			t.Fatalf("row %d prev_hash %s != prior entry_hash %s (chain fork/break)", i, c.prevHash, chain[i-1].entryHash)
		}
	}
}

func TestAuditChainLinkageLive(t *testing.T) {
	store, db := openAuditChainStore(t)
	defer db.Close()

	for i := 0; i < 5; i++ {
		if err := store.Append(auditLogEntry{
			ID:         fmt.Sprintf("al:test:%d", i),
			Action:     "finance.adjustment_executed",
			ActorID:    fmt.Sprintf("admin-%d", i),
			TargetID:   fmt.Sprintf("u-%d", i),
			OccurredAt: "2026-07-03T00:00:0" + fmt.Sprint(i) + "Z",
			Details:    fmt.Sprintf(`{"n":%d}`, i),
		}, 0); err != nil {
			t.Fatalf("append %d: %v", i, err)
		}
	}
	chain := readChain(t, db)
	if len(chain) != 5 {
		t.Fatalf("expected 5 chained rows, got %d", len(chain))
	}
	verifyChain(t, chain)
}

func TestAuditChainDetectsTamperLive(t *testing.T) {
	store, db := openAuditChainStore(t)
	defer db.Close()

	for i := 0; i < 3; i++ {
		if err := store.Append(auditLogEntry{
			ID: fmt.Sprintf("al:tamper:%d", i), Action: "aml.case_updated",
			ActorID: "admin-x", TargetID: fmt.Sprintf("c-%d", i),
			OccurredAt: "2026-07-03T01:00:0" + fmt.Sprint(i) + "Z", Details: `{"ok":true}`,
		}, 0); err != nil {
			t.Fatalf("append %d: %v", i, err)
		}
	}
	// Tamper with the middle row's details (the trigger is absent in the scratch
	// DB, simulating a superuser who dropped it). The recompute must diverge.
	if _, err := db.Exec(`UPDATE provider_ops_audit_log SET details='{"ok":false}' WHERE id='al:tamper:1'`); err != nil {
		t.Fatalf("tamper: %v", err)
	}
	chain := readChain(t, db)
	broken := false
	for _, c := range chain {
		if computeAuditEntryHash(c.prevHash, c.entry) != c.entryHash {
			broken = true
			break
		}
	}
	if !broken {
		t.Fatal("tampering with a row's details must break the recomputed hash")
	}
}

func appendN(t *testing.T, store *providerOpsAuditDBStore, prefix string, n int) []string {
	t.Helper()
	ids := make([]string, n)
	for i := 0; i < n; i++ {
		id := fmt.Sprintf("al:%s:%d", prefix, i)
		ids[i] = id
		if err := store.Append(auditLogEntry{
			ID: id, Action: "finance.adjustment_executed", ActorID: "admin-v",
			TargetID: fmt.Sprintf("u-%d", i), OccurredAt: "2026-07-03T03:00:0" + fmt.Sprint(i) + "Z",
			Details: fmt.Sprintf(`{"n":%d}`, i),
		}, 0); err != nil {
			t.Fatalf("append %d: %v", i, err)
		}
	}
	return ids
}

func TestAuditVerifyChainCleanLive(t *testing.T) {
	store, db := openAuditChainStore(t)
	defer db.Close()
	appendN(t, store, "clean", 4)

	res, err := store.VerifyChain(t.Context())
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !res.OK || res.Checked != 4 {
		t.Fatalf("clean chain should verify: %+v", res)
	}
}

func TestAuditVerifyChainDetectsAlteredLive(t *testing.T) {
	store, db := openAuditChainStore(t)
	defer db.Close()
	ids := appendN(t, store, "alt", 4)

	// Alter the 2nd row (index 1) — the trigger is absent in the scratch DB.
	if _, err := db.Exec(`UPDATE provider_ops_audit_log SET details='{"n":999}' WHERE id=$1`, ids[1]); err != nil {
		t.Fatalf("tamper: %v", err)
	}
	res, err := store.VerifyChain(t.Context())
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if res.OK {
		t.Fatal("altered row must fail verification")
	}
	if res.BrokenAtID != ids[1] {
		t.Fatalf("break should be at the altered row %s, got %s", ids[1], res.BrokenAtID)
	}
}

func TestAuditVerifyChainDetectsDeletionLive(t *testing.T) {
	store, db := openAuditChainStore(t)
	defer db.Close()
	ids := appendN(t, store, "del", 4)

	// Delete a middle row → the successor's prev_hash no longer links.
	if _, err := db.Exec(`DELETE FROM provider_ops_audit_log WHERE id=$1`, ids[1]); err != nil {
		t.Fatalf("delete: %v", err)
	}
	res, err := store.VerifyChain(t.Context())
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if res.OK {
		t.Fatal("a deleted row must break the chain link")
	}
	if res.BrokenAtID != ids[2] {
		t.Fatalf("break should surface at the orphaned successor %s, got %s (%s)", ids[2], res.BrokenAtID, res.Reason)
	}
}

func TestAuditChainConcurrentAppendsStayLinearLive(t *testing.T) {
	store, db := openAuditChainStore(t)
	defer db.Close()

	const workers, per = 8, 12
	var wg sync.WaitGroup
	errs := make(chan error, workers)
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func(w int) {
			defer wg.Done()
			for i := 0; i < per; i++ {
				if err := store.Append(auditLogEntry{
					ID:         fmt.Sprintf("al:conc:%d:%d", w, i),
					Action:     "finance.adjustment_proposed",
					ActorID:    fmt.Sprintf("admin-%d", w),
					TargetID:   fmt.Sprintf("u-%d-%d", w, i),
					OccurredAt: "2026-07-03T02:00:00Z",
					Details:    fmt.Sprintf(`{"w":%d,"i":%d}`, w, i),
				}, 0); err != nil {
					errs <- err
					return
				}
			}
		}(w)
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Fatalf("concurrent append: %v", err)
	}

	chain := readChain(t, db)
	if len(chain) != workers*per {
		t.Fatalf("expected %d chained rows, got %d", workers*per, len(chain))
	}
	// The critical property: despite concurrency, exactly one strictly-linear
	// chain with no forks (advisory lock serialized every append).
	verifyChain(t, chain)
}
