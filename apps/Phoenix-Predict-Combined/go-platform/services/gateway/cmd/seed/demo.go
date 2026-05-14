package main

import (
	"database/sql"
	"fmt"
)

// RunDemo orchestrates the demo seed phases on top of base data. Each
// phase is independently re-runnable thanks to idempotency-keyed writes
// in Service.PlaceOrder. The orchestrator stops at the first error
// rather than continuing — a half-applied demo state is worse than a
// clear failure pointing at the offending phase.
//
// Phase 0 runs unconditionally because it both unblocks subsequent
// phases (stuck pending orders pin user cash) and is the only step
// shared with wipe mode.
//
// Future commits will fill the phase stubs below. Today's commit
// (commit 1) lands the foundation: flag dispatch, harness, Phase 0
// cleanup. Running `-mode demo` against a clean DB therefore behaves
// like base seed + cleanup with a "phases 1-5 pending" notice.
func RunDemo(db *sql.DB, driver, dsn string) error {
	fmt.Println("\n--- Demo Seed: Phase 0 (cleanup) ---")
	cleanup, err := RunPhase0Cleanup(db)
	if err != nil {
		return fmt.Errorf("phase 0: %w", err)
	}
	fmt.Printf("  stale pending cancelled: %d\n", cleanup.StalePendingCancelled)
	fmt.Printf("  demo orders deleted:     %d\n", cleanup.DemoOrdersDeleted)
	fmt.Printf("  demo trades deleted:     %d\n", cleanup.DemoTradesDeleted)
	fmt.Printf("  demo ledger deleted:     %d\n", cleanup.DemoLedgerDeleted)
	fmt.Printf("  demo settlements deleted: %d\n", cleanup.DemoSettlementsDeleted)
	fmt.Printf("  demo positions deleted:  %d\n", cleanup.DemoPositionsDeleted)

	// Harness construction is deferred to the first phase that actually
	// needs Service. Phase 0 is pure SQL and does not call Service —
	// constructing the wallet service has a non-trivial startup cost,
	// so we delay it.
	harness, err := newHarness(driver, dsn)
	if err != nil {
		return fmt.Errorf("build harness: %w", err)
	}
	defer func() {
		if harness.Wallet != nil && harness.Wallet.DB() != nil {
			// The wallet service opened its own *sql.DB. Close it on
			// shutdown so the seed process exits cleanly without leaking
			// the connection back to Postgres on macOS.
			_ = harness.Wallet.DB().Close()
		}
	}()

	fmt.Println("\n--- Demo Seed: Phases 1-5 (pending in future commits) ---")
	fmt.Println("  Phase 1 (market-maker book) — TODO")
	fmt.Println("  Phase 2 (synthetic taker volume) — TODO")
	fmt.Println("  Phase 3 (price history backfill) — TODO")
	fmt.Println("  Phase 4 (demo user portfolio) — TODO")
	fmt.Println("  Phase 5 (settlements + leaderboard data) — TODO")
	_ = harness // silence unused until phases land

	return nil
}

// RunWipe undoes everything the demo phases wrote, leaving the base
// seed intact. Implementation lives in cleanup.go because the same
// SQL identifies "demo state" in both wipe and the cleanup step of
// the demo run.
func RunWipe(db *sql.DB) error {
	fmt.Println("\n--- Wipe: removing demo additions ---")
	cleanup, err := RunPhase0Cleanup(db)
	if err != nil {
		return fmt.Errorf("wipe: %w", err)
	}
	fmt.Printf("  stale pending cancelled: %d\n", cleanup.StalePendingCancelled)
	fmt.Printf("  demo orders deleted:     %d\n", cleanup.DemoOrdersDeleted)
	fmt.Printf("  demo trades deleted:     %d\n", cleanup.DemoTradesDeleted)
	fmt.Printf("  demo ledger deleted:     %d\n", cleanup.DemoLedgerDeleted)
	fmt.Printf("  demo settlements deleted: %d\n", cleanup.DemoSettlementsDeleted)
	fmt.Printf("  demo positions deleted:  %d\n", cleanup.DemoPositionsDeleted)
	return nil
}
