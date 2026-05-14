package main

import (
	"context"
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
func RunDemo(db *sql.DB, driver, dsn string) error {
	ctx := context.Background()

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
	// needs Service. Phase 0 is pure SQL; phases 1+ go through Service.
	harness, err := newHarness(driver, dsn)
	if err != nil {
		return fmt.Errorf("build harness: %w", err)
	}
	defer func() {
		if harness.Wallet != nil && harness.Wallet.DB() != nil {
			_ = harness.Wallet.DB().Close()
		}
	}()

	fmt.Println("\n--- Demo Seed: Wallet Top-Up ---")
	if err := runWalletTopUp(harness.Wallet); err != nil {
		return fmt.Errorf("wallet topup: %w", err)
	}

	fmt.Println("\n--- Demo Seed: Phase 1 (market-maker book) ---")
	p1, err := RunPhase1MarketMaker(ctx, harness)
	if err != nil {
		return fmt.Errorf("phase 1: %w", err)
	}
	fmt.Printf("  markets touched: %d  |  orders placed: %d  |  errors: %d\n",
		p1.MarketsTouched, p1.OrdersPlaced, p1.Errors)

	fmt.Println("\n--- Demo Seed: Phase 2 (synthetic taker volume) ---")
	p2, err := RunPhase2Volume(ctx, harness, db)
	if err != nil {
		return fmt.Errorf("phase 2: %w", err)
	}
	fmt.Printf("  markets touched: %d  |  orders placed: %d  |  errors: %d\n",
		p2.MarketsTouched, p2.OrdersPlaced, p2.Errors)

	fmt.Println("\n--- Demo Seed: Phases 3-5 (pending in future commits) ---")
	fmt.Println("  Phase 3 (price history backfill) — TODO")
	fmt.Println("  Phase 4 (demo user portfolio) — TODO")
	fmt.Println("  Phase 5 (settlements + leaderboard data) — TODO")

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
