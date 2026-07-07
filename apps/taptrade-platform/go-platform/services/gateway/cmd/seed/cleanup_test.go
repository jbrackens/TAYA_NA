package main

import (
	"os"
	"strings"
	"testing"
)

// TestStalePendingCutoff documents the invariant that the cutoff used
// by Phase 0 must be at least 1 minute — any shorter and routine in-flight
// orders during the seed run itself could be mistakenly cancelled. Any
// longer than 1 hour and the demo flow inherits stuck point reservations. One hour
// matches the runbook on the matcher's worst-case retry window.
func TestStalePendingCutoff(t *testing.T) {
	if stalePendingCutoff.Minutes() < 1 {
		t.Errorf("stalePendingCutoff = %v, must be >= 1 minute to avoid cancelling in-flight seed orders", stalePendingCutoff)
	}
	if stalePendingCutoff.Hours() > 1 {
		t.Errorf("stalePendingCutoff = %v, must be <= 1 hour so demo flow doesn't inherit stuck point reservations", stalePendingCutoff)
	}
}

func TestRunDemoRecomputesLeaderboardsAfterSettlements(t *testing.T) {
	src, err := os.ReadFile("demo.go")
	if err != nil {
		t.Fatalf("read demo.go: %v", err)
	}
	body := string(src)
	phase5 := strings.Index(body, "RunPhase5Settle(ctx, harness)")
	recompute := strings.Index(body, "RunPhase5Leaderboards(ctx, db)")
	phase6 := strings.Index(body, "RunPhase6Backoffice(db)")
	if phase5 < 0 {
		t.Fatal("RunDemo must call RunPhase5Settle")
	}
	if recompute < 0 {
		t.Fatal("RunDemo must recompute leaderboard snapshots after demo settlements")
	}
	if phase6 < 0 {
		t.Fatal("RunDemo must call RunPhase6Backoffice")
	}
	if !(phase5 < recompute && recompute < phase6) {
		t.Fatalf("leaderboard recompute must run after phase5 settlements and before phase6 backoffice rows: phase5=%d recompute=%d phase6=%d", phase5, recompute, phase6)
	}
}

func TestRunDemoSeedsRewardHistoryAfterWalletSchema(t *testing.T) {
	src, err := os.ReadFile("demo.go")
	if err != nil {
		t.Fatalf("read demo.go: %v", err)
	}
	body := string(src)
	walletTopup := strings.Index(body, "runWalletTopUp(harness.Wallet)")
	rewardHistory := strings.Index(body, "RunPhase5RewardHistory(ctx, db, harness.Wallet")
	activeBonus := strings.Index(body, "RunPhase5BonusDemo(ctx, db)")
	phase1 := strings.Index(body, "RunPhase1MarketMaker(ctx, harness)")
	if walletTopup < 0 {
		t.Fatal("RunDemo must create wallet schema and top up demo users before reward history")
	}
	if rewardHistory < 0 {
		t.Fatal("RunDemo must seed reward history so /rewards can prove live streak claiming")
	}
	if activeBonus < 0 {
		t.Fatal("RunDemo must seed an active bonus so /rewards can prove bonus progress")
	}
	if phase1 < 0 {
		t.Fatal("RunDemo must still call RunPhase1MarketMaker")
	}
	if !(walletTopup < rewardHistory && rewardHistory < activeBonus && activeBonus < phase1) {
		t.Fatalf("reward/bonus seeds must run after wallet topup/schema and before market-maker orders: topup=%d reward=%d bonus=%d phase1=%d", walletTopup, rewardHistory, activeBonus, phase1)
	}
}

func TestPhase0CleanupRemovesDemoBonusRowsBeforeCampaignRows(t *testing.T) {
	src, err := os.ReadFile("cleanup.go")
	if err != nil {
		t.Fatalf("read cleanup.go: %v", err)
	}
	body := string(src)
	deleteBonuses := strings.Index(body, "DELETE FROM player_bonuses")
	deleteCampaigns := strings.Index(body, "DELETE FROM campaigns")
	createdBy := strings.Index(body, "created_by = 'demo-seed'")
	if deleteBonuses < 0 {
		t.Fatal("phase 0 cleanup must delete demo player bonus rows")
	}
	if deleteCampaigns < 0 {
		t.Fatal("phase 0 cleanup must delete demo campaign rows")
	}
	if createdBy < 0 {
		t.Fatal("phase 0 cleanup must scope demo bonus cleanup to demo-seed campaigns")
	}
	if deleteBonuses > deleteCampaigns {
		t.Fatalf("player bonuses must be deleted before campaigns to satisfy FK constraints: bonuses=%d campaigns=%d", deleteBonuses, deleteCampaigns)
	}
}

func TestDemoActiveBonusSeedValuesArePointPlayOnly(t *testing.T) {
	if demoActiveBonusName != "Demo Point-Play Bonus" {
		t.Fatalf("unexpected demo active bonus name: %q", demoActiveBonusName)
	}
	if demoActiveBonusBudgetPoints <= 0 || demoActiveBonusGrantedPoints <= 0 {
		t.Fatalf("demo active bonus must use positive point amounts: budget=%d granted=%d", demoActiveBonusBudgetPoints, demoActiveBonusGrantedPoints)
	}
	if demoActiveBonusRemainingPoints >= demoActiveBonusGrantedPoints {
		t.Fatalf("demo active bonus should show partial use: remaining=%d granted=%d", demoActiveBonusRemainingPoints, demoActiveBonusGrantedPoints)
	}
	if demoActiveBonusPlayRequiredPoints <= 0 {
		t.Fatal("demo active bonus must have a point-play progress target")
	}
	progressPct := float64(demoActiveBonusPlayCompletedPoints) / float64(demoActiveBonusPlayRequiredPoints) * 100
	if progressPct != 25 {
		t.Fatalf("demo active bonus should show 25%% point-play progress, got %.2f", progressPct)
	}
}

func TestPhase0CleanupToleratesFreshDBBeforeWalletSchema(t *testing.T) {
	src, err := os.ReadFile("cleanup.go")
	if err != nil {
		t.Fatalf("read cleanup.go: %v", err)
	}
	body := string(src)
	guard := strings.Index(body, "to_regclass('public.wallet_ledger') IS NOT NULL")
	deleteWalletLedger := strings.Index(body, "DELETE FROM wallet_ledger")
	if guard < 0 {
		t.Fatal("phase 0 cleanup must guard wallet_ledger deletes; wallet service creates that table after cleanup on fresh DBs")
	}
	if deleteWalletLedger < 0 {
		t.Fatal("phase 0 cleanup must still delete prior demo settlement wallet_ledger rows on reseed")
	}
	if guard > deleteWalletLedger {
		t.Fatalf("wallet_ledger existence guard must come before DELETE FROM wallet_ledger: guard=%d delete=%d", guard, deleteWalletLedger)
	}
}

func TestSeedCLIVisibleAmountsUsePoints(t *testing.T) {
	for _, path := range []string{"main.go", "wallet_topup.go", "demo.go", "demo_phase5_settle.go"} {
		src, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read %s: %v", path, err)
		}
		body := string(src)
		for _, forbidden := range []string{"+$", "->$", "Vol:$", "payouts created", "payouts="} {
			if strings.Contains(body, forbidden) {
				t.Fatalf("%s seed CLI output must use point-native wording, found %q", path, forbidden)
			}
		}
	}
}

func TestSeedCleanupVisibleCommentsStayPointNative(t *testing.T) {
	for _, path := range []string{"demo.go", "cleanup.go", "demo_phase1_book.go"} {
		src, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read %s: %v", path, err)
		}
		body := string(src)
		for _, forbidden := range []string{
			"stuck cash",
			"reserved cash",
			"refund the cash",
			"delete demo payouts",
			"purge demo payout",
			"reset payout pool",
			"resting cash",
			"stakes",
			"insufficient funds",
		} {
			if strings.Contains(body, forbidden) {
				t.Fatalf("%s seed cleanup wording must be point-native, found %q", path, forbidden)
			}
		}
	}
}

func TestSeedMarketMakerVisibleWordingUsesPointPoints(t *testing.T) {
	src, err := os.ReadFile("demo_phase1_book.go")
	if err != nil {
		t.Fatalf("read demo_phase1_book.go: %v", err)
	}
	body := string(src)
	for _, forbidden := range []string{"$", "¢", "stakes", "resting cash", "insufficient funds"} {
		if strings.Contains(body, forbidden) {
			t.Fatalf("demo_phase1_book.go market-maker seed wording must use point-cents, found %q", forbidden)
		}
	}
	for _, required := range []string{"point-cents", "resting point bids", "YES@%d point-cents"} {
		if !strings.Contains(body, required) {
			t.Fatalf("demo_phase1_book.go must include point-native marker %q", required)
		}
	}
}

func TestDemoSeedLaunchVisiblePlansStayPointNative(t *testing.T) {
	for _, path := range []string{
		"demo_phase4_user.go",
		"demo_phase5_settle.go",
		"demo_phase6_backoffice.go",
	} {
		src, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read %s: %v", path, err)
		}
		body := string(src)
		for _, forbidden := range []string{
			"BTC",
			"ETH",
			"payout_pool_points",
			"yes_price_points",
			"oracle_feed",
		} {
			if strings.Contains(body, forbidden) {
				t.Fatalf("%s launch-visible demo seed data must stay point-native, found %q", path, forbidden)
			}
		}
	}

	src, err := os.ReadFile("demo_phase6_backoffice.go")
	if err != nil {
		t.Fatalf("read demo_phase6_backoffice.go: %v", err)
	}
	body := string(src)
	for _, required := range []string{
		"MLBB-FINAL-G1",
		"settlementPoints",
		"yesPricePoints",
	} {
		if !strings.Contains(body, required) {
			t.Fatalf("demo_phase6_backoffice.go must include point-native audit detail marker %q", required)
		}
	}
}
