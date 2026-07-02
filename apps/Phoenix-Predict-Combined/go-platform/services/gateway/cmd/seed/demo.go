package main

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// RunDemo orchestrates the demo seed phases on top of base data. Each
// phase is independently re-runnable thanks to idempotency-keyed writes
// in Service.PlaceOrder. The orchestrator stops at the first error
// rather than continuing — a half-applied demo state is worse than a
// clear failure pointing at the offending phase.
//
// Phase 0 runs unconditionally because it both unblocks subsequent
// phases (stuck pending orders pin reserved points) and is the only
// step shared with wipe mode.
func RunDemo(db *sql.DB, driver, dsn string) error {
	ctx := context.Background()

	fmt.Println("\n--- Demo Seed: Phase 0 (cleanup) ---")
	cleanup, err := RunPhase0Cleanup(db)
	if err != nil {
		return fmt.Errorf("phase 0: %w", err)
	}
	fmt.Printf("  stale pending cancelled: %d\n", cleanup.StalePendingCancelled)
	fmt.Printf("  expired reservations healed: %d\n", cleanup.ExpiredReservationsHealed)
	fmt.Printf("  demo orders deleted:     %d\n", cleanup.DemoOrdersDeleted)
	fmt.Printf("  demo trades deleted:     %d\n", cleanup.DemoTradesDeleted)
	fmt.Printf("  demo ledger deleted:     %d\n", cleanup.DemoLedgerDeleted)
	fmt.Printf("  demo settlements deleted: %d\n", cleanup.DemoSettlementsDeleted)
	fmt.Printf("  demo positions deleted:  %d\n", cleanup.DemoPositionsDeleted)
	fmt.Printf("  demo bonuses deleted:    %d\n", cleanup.DemoBonusesDeleted)
	fmt.Printf("  demo campaigns deleted:  %d\n", cleanup.DemoCampaignsDeleted)
	fmt.Printf("  orphan order reservations deleted: %d\n", cleanup.OrphanOrderReservationsDeleted)

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

	fmt.Println("\n--- Demo Seed: Reward History ---")
	rewardRows, err := RunPhase5RewardHistory(ctx, db, harness.Wallet, time.Now())
	if err != nil {
		return fmt.Errorf("reward history: %w", err)
	}
	fmt.Printf("  historical daily claims seeded: %d\n", rewardRows)

	fmt.Println("\n--- Demo Seed: Active Bonus ---")
	bonusRows, err := RunPhase5BonusDemo(ctx, db)
	if err != nil {
		return fmt.Errorf("active bonus: %w", err)
	}
	fmt.Printf("  active demo bonuses seeded: %d\n", bonusRows)

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

	// Phase 3 (price history backfill) intentionally skipped: the player
	// app's charts (heroChartPath in components/prediction/utils/spark.ts,
	// MarketChart.tsx) are client-side synthetic walks seeded by ticker
	// name. They do not read from prediction_trades, so writing 100k
	// synthetic backdated trade rows would bloat the DB without changing
	// any visible chart. Leaving this slot to make the phase numbers
	// match PLAN-demo-seed-data.md where the decision is recorded.

	fmt.Println("\n--- Demo Seed: Phase 4 (demo user portfolio) ---")
	p4, err := RunPhase4DemoUser(ctx, harness)
	if err != nil {
		return fmt.Errorf("phase 4: %w", err)
	}
	fmt.Printf("  markets touched: %d  |  orders placed: %d  |  skipped: %d  |  errors: %d\n",
		p4.MarketsTouched, p4.OrdersPlaced, p4.OrdersSkipped, p4.Errors)

	fmt.Println("\n--- Demo Seed: Phase 5 (settlements) ---")
	p5, err := RunPhase5Settle(ctx, harness)
	if err != nil {
		return fmt.Errorf("phase 5: %w", err)
	}
	fmt.Printf("  markets settled: %d  |  settlement credits created: %d  |  errors: %d\n",
		p5.MarketsTouched, p5.OrdersPlaced, p5.Errors)

	fmt.Println("\n--- Demo Seed: Phase 5b (leaderboard snapshots) ---")
	RunPhase5Leaderboards(ctx, db)
	fmt.Println("  leaderboard snapshots recomputed")

	fmt.Println("\n--- Demo Seed: Phase 6 (backoffice audit_logs + loyalty_accounts) ---")
	p6, err := RunPhase6Backoffice(db)
	if err != nil {
		return fmt.Errorf("phase 6: %w", err)
	}
	fmt.Printf("  audit_logs inserted: %d  |  loyalty_accounts inserted: %d\n",
		p6.AuditLogsInserted, p6.LoyaltyRowsInserted)

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
	fmt.Printf("  expired reservations healed: %d\n", cleanup.ExpiredReservationsHealed)
	fmt.Printf("  demo orders deleted:     %d\n", cleanup.DemoOrdersDeleted)
	fmt.Printf("  demo trades deleted:     %d\n", cleanup.DemoTradesDeleted)
	fmt.Printf("  demo ledger deleted:     %d\n", cleanup.DemoLedgerDeleted)
	fmt.Printf("  demo settlements deleted: %d\n", cleanup.DemoSettlementsDeleted)
	fmt.Printf("  demo positions deleted:  %d\n", cleanup.DemoPositionsDeleted)
	fmt.Printf("  demo bonuses deleted:    %d\n", cleanup.DemoBonusesDeleted)
	fmt.Printf("  demo campaigns deleted:  %d\n", cleanup.DemoCampaignsDeleted)
	fmt.Printf("  orphan order reservations deleted: %d\n", cleanup.OrphanOrderReservationsDeleted)

	fmt.Println("\n--- Wipe: removing demo backoffice rows ---")
	bo, err := RunPhase6WipeBackoffice(db)
	if err != nil {
		return fmt.Errorf("wipe backoffice: %w", err)
	}
	fmt.Printf("  audit_logs deleted:      %d\n", bo.AuditLogsDeleted)
	fmt.Printf("  loyalty_accounts deleted:%d\n", bo.LoyaltyAccountsDeleted)
	return nil
}
