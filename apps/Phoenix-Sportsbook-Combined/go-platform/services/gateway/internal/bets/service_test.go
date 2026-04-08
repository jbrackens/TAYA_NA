package bets

import (
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/freebets"
	"phoenix-revival/gateway/internal/loyalty"
	"phoenix-revival/gateway/internal/oddsboosts"
	"phoenix-revival/gateway/internal/wallet"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestPlaceBetSuccessAndIdempotentReplay(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()

	_, err := walletService.Credit(wallet.MutationRequest{
		UserID:         "u-bet-1",
		AmountCents:    5000,
		IdempotencyKey: "seed-balance",
	})
	if err != nil {
		t.Fatalf("seed credit: %v", err)
	}

	service := NewService(repository, walletService)
	request := PlaceBetRequest{
		UserID:         "u-bet-1",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           1.95,
		IdempotencyKey: "place-1",
	}

	first, err := service.Place(request)
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}
	if first.Status != statusPlaced {
		t.Fatalf("expected placed status, got %s", first.Status)
	}

	replay, err := service.Place(request)
	if err != nil {
		t.Fatalf("replay place bet: %v", err)
	}
	if replay.BetID != first.BetID {
		t.Fatalf("expected same bet id on idempotent replay")
	}
}

func TestPlaceBetRejectsOddsChangeWhenPolicyRejectOnChange(t *testing.T) {
	t.Setenv("BET_ODDS_CHANGE_POLICY", "reject_on_change")

	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-bet-odds-reject",
		AmountCents:    5000,
		IdempotencyKey: "seed",
	})

	service := NewService(repository, walletService)
	_, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-odds-reject",
		RequestID:      "req-odds-reject",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     500,
		Odds:           1.95,
		IdempotencyKey: "odds-reject",
	})
	if err == nil {
		t.Fatal("expected odds change rejection error")
	}
	if !errors.Is(err, ErrOddsChanged) {
		t.Fatalf("expected ErrOddsChanged, got %v", err)
	}
}

func TestPlaceBetAcceptLatestOddsWhenConfigured(t *testing.T) {
	t.Setenv("BET_ODDS_CHANGE_POLICY", "accept_latest")

	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-bet-odds-latest",
		AmountCents:    5000,
		IdempotencyKey: "seed",
	})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-odds-latest",
		RequestID:      "req-odds-latest",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     500,
		Odds:           1.95,
		IdempotencyKey: "odds-latest",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}
	if !sameOdds(placed.Odds, 1.8) {
		t.Fatalf("expected placed odds to use latest market odds 1.8, got %.3f", placed.Odds)
	}
	if !sameOdds(placed.RequestedOdds, 1.95) {
		t.Fatalf("expected requested odds 1.95, got %.3f", placed.RequestedOdds)
	}
	if placed.OddsChangePolicy != oddsPolicyAcceptLatest {
		t.Fatalf("expected odds policy %s, got %s", oddsPolicyAcceptLatest, placed.OddsChangePolicy)
	}
}

func TestPlaceBetAppliesInPlayLtdWhenEnabled(t *testing.T) {
	t.Setenv("BET_ALLOW_INPLAY", "true")
	t.Setenv("BET_LTD_ENABLED", "true")
	t.Setenv("BET_LTD_INPLAY_MS", "20")

	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-bet-ltd",
		AmountCents:    5000,
		IdempotencyKey: "seed",
	})

	service := NewService(repository, walletService)
	service.now = func() time.Time {
		return time.Date(2026, 4, 10, 21, 0, 0, 0, time.UTC)
	}

	started := time.Now()
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-ltd",
		RequestID:      "req-ltd",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     500,
		Odds:           1.8,
		IdempotencyKey: "ltd-test",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}
	elapsed := time.Since(started)
	if elapsed < 20*time.Millisecond {
		t.Fatalf("expected LTD delay >= 20ms, got %s", elapsed)
	}
	if placed.AppliedLTDMsec != 20 {
		t.Fatalf("expected applied LTD 20ms, got %d", placed.AppliedLTDMsec)
	}
	if !placed.InPlay {
		t.Fatal("expected in-play placement metadata to be true")
	}
}

func TestPrecheckReturnsAllowAndReasonCodes(t *testing.T) {
	t.Setenv("BET_ODDS_CHANGE_POLICY", "reject_on_change")

	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-precheck-1",
		AmountCents:    1000,
		IdempotencyKey: "seed-precheck",
	})
	service := NewService(repository, walletService)

	allowed, err := service.Precheck(PrecheckRequest{
		UserID:      "u-precheck-1",
		RequestID:   "req-precheck-1",
		MarketID:    "m:local:001",
		SelectionID: "home",
		StakeCents:  300,
		Odds:        1.8,
	})
	if err != nil {
		t.Fatalf("precheck allowed path failed: %v", err)
	}
	if !allowed.Allowed {
		t.Fatalf("expected allowed precheck, got %+v", allowed)
	}
	if allowed.AvailableBalanceCents != 1000 {
		t.Fatalf("expected availableBalanceCents=1000, got %d", allowed.AvailableBalanceCents)
	}
	if allowed.RequiredStakeCents != 300 {
		t.Fatalf("expected requiredStakeCents=300, got %d", allowed.RequiredStakeCents)
	}

	rejected, err := service.Precheck(PrecheckRequest{
		UserID:      "u-precheck-1",
		RequestID:   "req-precheck-2",
		MarketID:    "m:local:001",
		SelectionID: "home",
		StakeCents:  300,
		Odds:        1.95,
	})
	if err != nil {
		t.Fatalf("precheck reject path failed: %v", err)
	}
	if rejected.Allowed {
		t.Fatalf("expected rejected precheck, got %+v", rejected)
	}
	if rejected.ReasonCode != "odds_changed" {
		t.Fatalf("expected reasonCode odds_changed, got %s", rejected.ReasonCode)
	}

	fundsRejected, err := service.Precheck(PrecheckRequest{
		UserID:      "u-precheck-1",
		RequestID:   "req-precheck-3",
		MarketID:    "m:local:001",
		SelectionID: "home",
		StakeCents:  2000,
		Odds:        1.8,
	})
	if err != nil {
		t.Fatalf("precheck insufficient funds path failed: %v", err)
	}
	if fundsRejected.Allowed {
		t.Fatalf("expected insufficient funds precheck rejection, got %+v", fundsRejected)
	}
	if fundsRejected.ReasonCode != "insufficient_funds" {
		t.Fatalf("expected reasonCode insufficient_funds, got %s", fundsRejected.ReasonCode)
	}
}

func TestPrecheckValidatesPromotionEligibility(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	freebetService := freebets.NewService()
	oddsBoostService := oddsboosts.NewService()

	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-1",
		AmountCents:    1000,
		IdempotencyKey: "seed-precheck-promo",
	})

	service := NewService(repository, walletService)
	service.SetPromotionServices(freebetService, oddsBoostService)

	unacceptedBoost, err := service.Precheck(PrecheckRequest{
		UserID:      "u-1",
		RequestID:   "precheck-promo-1",
		MarketID:    "m:local:001",
		SelectionID: "home",
		StakeCents:  300,
		Odds:        2.05,
		OddsBoostID: "ob:local:001",
	})
	if err != nil {
		t.Fatalf("precheck with unaccepted odds boost failed: %v", err)
	}
	if unacceptedBoost.Allowed {
		t.Fatalf("expected unaccepted odds boost precheck to be rejected")
	}
	if unacceptedBoost.ReasonCode != "odds_boost_not_eligible" {
		t.Fatalf("expected reasonCode odds_boost_not_eligible, got %s", unacceptedBoost.ReasonCode)
	}

	_, err = oddsBoostService.Accept(oddsboosts.AcceptRequest{
		OddsBoostID: "ob:local:001",
		UserID:      "u-1",
		RequestID:   "precheck-promo-accept",
	})
	if err != nil {
		t.Fatalf("accept odds boost: %v", err)
	}

	freebetMismatch, err := service.Precheck(PrecheckRequest{
		UserID:      "u-1",
		RequestID:   "precheck-promo-2",
		MarketID:    "m:local:001",
		SelectionID: "home",
		StakeCents:  300,
		Odds:        1.2,
		FreebetID:   "fb:local:001",
	})
	if err != nil {
		t.Fatalf("precheck with freebet mismatch failed: %v", err)
	}
	if freebetMismatch.Allowed {
		t.Fatalf("expected freebet min-odds mismatch precheck to be rejected")
	}
	if freebetMismatch.ReasonCode != "freebet_not_eligible" {
		t.Fatalf("expected reasonCode freebet_not_eligible, got %s", freebetMismatch.ReasonCode)
	}
}

func TestPlaceBetRejectsInvalidSelection(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-4", AmountCents: 1000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	_, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-4",
		MarketID:       "m:local:001",
		SelectionID:    "invalid-selection",
		StakeCents:     100,
		Odds:           2.0,
		IdempotencyKey: "invalid-selection",
	})
	if err == nil {
		t.Fatalf("expected selection integrity error")
	}
	if !errors.Is(err, ErrSelectionNotFound) {
		t.Fatalf("expected ErrSelectionNotFound, got %v", err)
	}
}

func TestPlaceBetWithFreebetAndAcceptedOddsBoostAppliesPromotions(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	freebetService := freebets.NewService()
	oddsBoostService := oddsboosts.NewService()

	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-1",
		AmountCents:    1000,
		IdempotencyKey: "seed-promo-balance",
	})
	_, err := oddsBoostService.Accept(oddsboosts.AcceptRequest{
		OddsBoostID: "ob:local:001",
		UserID:      "u-1",
		RequestID:   "promo-accept-1",
	})
	if err != nil {
		t.Fatalf("accept odds boost: %v", err)
	}

	service := NewService(repository, walletService)
	service.SetPromotionServices(freebetService, oddsBoostService)

	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-1",
		RequestID:      "req-promo-place-1",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           2.05,
		FreebetID:      "fb:local:001",
		OddsBoostID:    "ob:local:001",
		IdempotencyKey: "promo-place-1",
	})
	if err != nil {
		t.Fatalf("place bet with promotions: %v", err)
	}
	if placed.FreebetID != "fb:local:001" {
		t.Fatalf("expected freebet id fb:local:001, got %s", placed.FreebetID)
	}
	if placed.FreebetAppliedCents != 1000 {
		t.Fatalf("expected freebetAppliedCents=1000, got %d", placed.FreebetAppliedCents)
	}
	if placed.OddsBoostID != "ob:local:001" {
		t.Fatalf("expected oddsBoostId ob:local:001, got %s", placed.OddsBoostID)
	}
	if !sameOdds(placed.Odds, 2.05) {
		t.Fatalf("expected placed odds 2.05, got %.2f", placed.Odds)
	}
	if placed.WalletBalanceCents != 1000 {
		t.Fatalf("expected wallet balance 1000 after freebet credit, got %d", placed.WalletBalanceCents)
	}

	freebet, exists := freebetService.GetByID("fb:local:001")
	if !exists {
		t.Fatal("expected freebet fb:local:001 to exist")
	}
	if freebet.RemainingAmountCents != 500 {
		t.Fatalf("expected freebet remainingAmountCents=500, got %d", freebet.RemainingAmountCents)
	}
	if freebet.Status != canonicalv1.FreebetStatusReserved {
		t.Fatalf("expected freebet status reserved, got %s", freebet.Status)
	}
}

func TestPlaceBetRejectsWhenOddsBoostNotAccepted(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	freebetService := freebets.NewService()
	oddsBoostService := oddsboosts.NewService()

	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-1",
		AmountCents:    1000,
		IdempotencyKey: "seed-promo-balance-2",
	})

	service := NewService(repository, walletService)
	service.SetPromotionServices(freebetService, oddsBoostService)

	_, err := service.Place(PlaceBetRequest{
		UserID:         "u-1",
		RequestID:      "req-promo-place-2",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     300,
		Odds:           2.05,
		OddsBoostID:    "ob:local:001",
		IdempotencyKey: "promo-place-2",
	})
	if err == nil {
		t.Fatal("expected odds boost eligibility error")
	}
	if !errors.Is(err, ErrOddsBoostNotEligible) {
		t.Fatalf("expected ErrOddsBoostNotEligible, got %v", err)
	}
}

func TestPlaceBetRejectsIneligibleFreebetAndRestoresDebit(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	freebetService := freebets.NewService()

	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-1",
		AmountCents:    300,
		IdempotencyKey: "seed-promo-balance-3",
	})

	service := NewService(repository, walletService)
	service.SetPromotionServices(freebetService, nil)

	_, err := service.Place(PlaceBetRequest{
		UserID:         "u-1",
		RequestID:      "req-promo-place-3",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     200,
		Odds:           1.2,
		FreebetID:      "fb:local:001",
		IdempotencyKey: "promo-place-3",
	})
	if err == nil {
		t.Fatal("expected freebet eligibility error")
	}
	if !errors.Is(err, ErrFreebetNotEligible) {
		t.Fatalf("expected ErrFreebetNotEligible, got %v", err)
	}
	if balance := walletService.Balance("u-1"); balance != 300 {
		t.Fatalf("expected wallet balance restored to 300, got %d", balance)
	}
}

func TestPlaceBetRejectsStakeOutOfRange(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-5", AmountCents: 1000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	_, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-5",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     50,
		Odds:           2.0,
		IdempotencyKey: "stake-low",
	})
	if err == nil {
		t.Fatalf("expected stake range error")
	}
	if !errors.Is(err, ErrStakeOutOfRange) {
		t.Fatalf("expected ErrStakeOutOfRange, got %v", err)
	}
}

func TestPlaceBetRejectsMarketNotOpen(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-2", AmountCents: 1000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	_, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-2",
		MarketID:       "m:local:003",
		SelectionID:    "yes",
		StakeCents:     100,
		Odds:           2.0,
		IdempotencyKey: "place-closed",
	})
	if err == nil {
		t.Fatalf("expected market not open error")
	}
	if !errors.Is(err, ErrMarketNotOpen) {
		t.Fatalf("expected ErrMarketNotOpen, got %v", err)
	}
}

func TestPlaceBetPropagatesInsufficientFunds(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()

	service := NewService(repository, walletService)
	_, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-3",
		MarketID:       "m:local:001",
		SelectionID:    "away",
		StakeCents:     1000,
		Odds:           2.2,
		IdempotencyKey: "place-insufficient",
	})
	if err == nil {
		t.Fatalf("expected insufficient funds path")
	}
	if !errors.Is(err, wallet.ErrInsufficientFunds) {
		t.Fatalf("expected wallet.ErrInsufficientFunds, got %v", err)
	}
}

func TestPlaceBetRejectsWhenMarketStartTimePassed(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-6", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	service.now = func() time.Time {
		return time.Date(2026, 4, 10, 21, 0, 0, 0, time.UTC)
	}

	_, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-6",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     300,
		Odds:           1.9,
		IdempotencyKey: "place-too-late",
	})
	if err == nil {
		t.Fatalf("expected market timing validation error")
	}
	if !errors.Is(err, ErrMarketNotOpen) {
		t.Fatalf("expected ErrMarketNotOpen for timing violation, got %v", err)
	}
}

func TestBetStatePersistsToFile(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-7", AmountCents: 5000, IdempotencyKey: "seed"})

	statePath := filepath.Join(t.TempDir(), "bets-state.json")
	service := NewServiceWithPath(repository, walletService, statePath)
	first, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-7",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     400,
		Odds:           1.8,
		IdempotencyKey: "persist-1",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	reloaded := NewServiceWithPath(repository, walletService, statePath)
	loaded, err := reloaded.GetByID(first.BetID)
	if err != nil {
		t.Fatalf("get persisted bet: %v", err)
	}
	if loaded.BetID != first.BetID {
		t.Fatalf("expected persisted bet id %s, got %s", first.BetID, loaded.BetID)
	}
}

func TestSettleBetWinCreditsWallet(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-8", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-8",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           2.0,
		IdempotencyKey: "settle-win",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	settled, err := service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "home",
		Reason:             "result confirmed",
	})
	if err != nil {
		t.Fatalf("settle bet: %v", err)
	}
	if settled.Status != statusSettledWon {
		t.Fatalf("expected status %s, got %s", statusSettledWon, settled.Status)
	}
	if settled.SettlementLedgerEntryID == "" {
		t.Fatalf("expected settlement ledger entry id on winning settlement")
	}
	if settled.WalletBalanceCents != 6000 {
		t.Fatalf("expected wallet balance 6000 after payout, got %d", settled.WalletBalanceCents)
	}
}

func TestSettleBetWinAccruesLoyaltyPoints(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-loyalty-1", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	loyaltyService := loyalty.NewService()
	service.SetLoyaltyService(loyaltyService)

	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-loyalty-1",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1200,
		Odds:           2.0,
		IdempotencyKey: "settle-loyalty-win",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	_, err = service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "home",
		Reason:             "result confirmed",
	})
	if err != nil {
		t.Fatalf("settle bet: %v", err)
	}

	account, ok := loyaltyService.GetAccount("u-bet-loyalty-1")
	if !ok {
		t.Fatal("expected loyalty account to exist after settlement")
	}
	if account.PointsBalance != 12 {
		t.Fatalf("expected 12 loyalty points from 1200-cent stake, got %d", account.PointsBalance)
	}

	ledger := loyaltyService.Ledger("u-bet-loyalty-1", 10)
	if len(ledger) != 1 {
		t.Fatalf("expected one loyalty ledger entry, got %d", len(ledger))
	}
	if ledger[0].SourceType != canonicalv1.LoyaltyLedgerSourceBetSettlement {
		t.Fatalf("expected settlement source type, got %s", ledger[0].SourceType)
	}
	if ledger[0].SourceID != placed.BetID {
		t.Fatalf("expected loyalty source id %s, got %s", placed.BetID, ledger[0].SourceID)
	}
}

func TestSettleBetLossDoesNotCreditWallet(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-9", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-9",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           2.0,
		IdempotencyKey: "settle-loss",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	settled, err := service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "away",
		Reason:             "result confirmed",
	})
	if err != nil {
		t.Fatalf("settle bet: %v", err)
	}
	if settled.Status != statusSettledLost {
		t.Fatalf("expected status %s, got %s", statusSettledLost, settled.Status)
	}
	if settled.SettlementLedgerEntryID != "" {
		t.Fatalf("did not expect settlement ledger entry id on losing settlement")
	}
	if settled.WalletBalanceCents != 4000 {
		t.Fatalf("expected wallet balance 4000 after losing settlement, got %d", settled.WalletBalanceCents)
	}
}

func TestSettleBetWinWithDeadHeatFactorCreditsFractionalPayout(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-deadheat-1", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-deadheat-1",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           2.0,
		IdempotencyKey: "settle-deadheat",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	factor := 0.5
	settled, err := service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "home,away",
		DeadHeatFactor:     &factor,
		Reason:             "dead heat confirmed",
	})
	if err != nil {
		t.Fatalf("settle bet with dead heat: %v", err)
	}
	if settled.Status != statusSettledWon {
		t.Fatalf("expected status %s, got %s", statusSettledWon, settled.Status)
	}
	if settled.WalletBalanceCents != 5000 {
		t.Fatalf("expected wallet balance 5000 after 50%% payout, got %d", settled.WalletBalanceCents)
	}
}

func TestSettleBetResettlementFromLostToWonAdjustsWallet(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-resettle-1", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-resettle-1",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           2.0,
		IdempotencyKey: "settle-resettle-loss-to-win",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	first, err := service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "away",
		Reason:             "initial settlement",
		ActorID:            "ops-1",
	})
	if err != nil {
		t.Fatalf("first settle: %v", err)
	}
	if first.Status != statusSettledLost {
		t.Fatalf("expected first status %s, got %s", statusSettledLost, first.Status)
	}
	if first.WalletBalanceCents != 4000 {
		t.Fatalf("expected balance 4000 after first loss settlement, got %d", first.WalletBalanceCents)
	}

	second, err := service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "home",
		Reason:             "resettlement correction",
		ActorID:            "ops-2",
	})
	if err != nil {
		t.Fatalf("resettle to win: %v", err)
	}
	if second.Status != statusSettledWon {
		t.Fatalf("expected second status %s, got %s", statusSettledWon, second.Status)
	}
	if second.WalletBalanceCents != 6000 {
		t.Fatalf("expected balance 6000 after resettlement to win, got %d", second.WalletBalanceCents)
	}

	events, err := service.ListEvents(10)
	if err != nil {
		t.Fatalf("list events: %v", err)
	}
	if len(events) != 3 {
		t.Fatalf("expected 3 events (placed + settled + resettled), got %d", len(events))
	}
}

func TestSettleBetResettlementFromWonToLostReversesWallet(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-resettle-2", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-resettle-2",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           2.0,
		IdempotencyKey: "settle-resettle-win-to-loss",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	first, err := service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "home",
		Reason:             "initial settlement",
		ActorID:            "ops-1",
	})
	if err != nil {
		t.Fatalf("first settle: %v", err)
	}
	if first.Status != statusSettledWon {
		t.Fatalf("expected first status %s, got %s", statusSettledWon, first.Status)
	}
	if first.WalletBalanceCents != 6000 {
		t.Fatalf("expected balance 6000 after first win settlement, got %d", first.WalletBalanceCents)
	}

	second, err := service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "away",
		Reason:             "resettlement correction",
		ActorID:            "ops-2",
	})
	if err != nil {
		t.Fatalf("resettle to loss: %v", err)
	}
	if second.Status != statusSettledLost {
		t.Fatalf("expected second status %s, got %s", statusSettledLost, second.Status)
	}
	if second.WalletBalanceCents != 4000 {
		t.Fatalf("expected balance 4000 after resettlement to loss, got %d", second.WalletBalanceCents)
	}
}

func TestCancelPlacedBetRefundsStake(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-10", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-10",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     700,
		Odds:           1.9,
		IdempotencyKey: "cancel-me",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	cancelled, err := service.Cancel(LifecycleBetRequest{
		BetID:  placed.BetID,
		Reason: "manual cancellation",
	})
	if err != nil {
		t.Fatalf("cancel bet: %v", err)
	}
	if cancelled.Status != statusCancelled {
		t.Fatalf("expected status %s, got %s", statusCancelled, cancelled.Status)
	}
	if cancelled.WalletBalanceCents != 5000 {
		t.Fatalf("expected full refund to restore balance 5000, got %d", cancelled.WalletBalanceCents)
	}
}

func TestRefundSettledLostBet(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-11", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-11",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     900,
		Odds:           1.9,
		IdempotencyKey: "refund-me",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	_, err = service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "away",
		Reason:             "result confirmed",
	})
	if err != nil {
		t.Fatalf("settle bet loss: %v", err)
	}

	refunded, err := service.Refund(LifecycleBetRequest{
		BetID:  placed.BetID,
		Reason: "operator goodwill",
	})
	if err != nil {
		t.Fatalf("refund bet: %v", err)
	}
	if refunded.Status != statusRefunded {
		t.Fatalf("expected status %s, got %s", statusRefunded, refunded.Status)
	}
	if refunded.WalletBalanceCents != 5000 {
		t.Fatalf("expected balance restored to 5000, got %d", refunded.WalletBalanceCents)
	}
}

func TestLifecycleEventsRecordedWithActorAndReasonCode(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-12", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-12",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     600,
		Odds:           1.9,
		IdempotencyKey: "event-settle",
		ActorID:        "u-bet-12",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	_, err = service.Settle(SettleBetRequest{
		BetID:                placed.BetID,
		WinningSelectionID:   "away",
		WinningSelectionName: "Away Team",
		ResultSource:         "supplier_feed",
		Reason:               "Result Confirmed",
		ActorID:              "admin-risk-1",
	})
	if err != nil {
		t.Fatalf("settle bet: %v", err)
	}

	events, err := service.ListEvents(10)
	if err != nil {
		t.Fatalf("list events: %v", err)
	}
	if len(events) != 2 {
		t.Fatalf("expected two events, got %d", len(events))
	}
	if events[0].Action != actionBetPlaced {
		t.Fatalf("expected first event action %s, got %s", actionBetPlaced, events[0].Action)
	}
	if events[1].Action != actionBetSettled {
		t.Fatalf("expected second event action %s, got %s", actionBetSettled, events[1].Action)
	}
	if events[1].ActorID != "admin-risk-1" {
		t.Fatalf("expected lifecycle actor admin-risk-1, got %s", events[1].ActorID)
	}
	if events[1].Reason != "result_confirmed" {
		t.Fatalf("expected reason code result_confirmed, got %s", events[1].Reason)
	}
	if !strings.Contains(events[1].Details, "winningSelectionName=Away Team") {
		t.Fatalf("expected settlement details to include winningSelectionName, got %s", events[1].Details)
	}
	if !strings.Contains(events[1].Details, "resultSource=supplier_feed") {
		t.Fatalf("expected settlement details to include resultSource, got %s", events[1].Details)
	}
}

func TestLifecycleEventsPersistToFile(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-13", AmountCents: 5000, IdempotencyKey: "seed"})

	statePath := filepath.Join(t.TempDir(), "bets-events-state.json")
	service := NewServiceWithPath(repository, walletService, statePath)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-13",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     500,
		Odds:           1.85,
		IdempotencyKey: "event-persist",
		ActorID:        "u-bet-13",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	_, err = service.Cancel(LifecycleBetRequest{
		BetID:   placed.BetID,
		Reason:  "manual cancellation",
		ActorID: "admin-ops-1",
	})
	if err != nil {
		t.Fatalf("cancel bet: %v", err)
	}

	reloaded := NewServiceWithPath(repository, walletService, statePath)
	events, err := reloaded.ListEvents(10)
	if err != nil {
		t.Fatalf("list events: %v", err)
	}
	if len(events) != 2 {
		t.Fatalf("expected two persisted events, got %d", len(events))
	}
	if events[1].Action != actionBetCancelled {
		t.Fatalf("expected last action %s, got %s", actionBetCancelled, events[1].Action)
	}
	if events[1].ActorID != "admin-ops-1" {
		t.Fatalf("expected last actor admin-ops-1, got %s", events[1].ActorID)
	}
}

func TestLifecycleIdempotentTransitionsDoNotDuplicateEvents(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-14", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-14",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     500,
		Odds:           2.0,
		IdempotencyKey: "idempotent-settle",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	_, err = service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "away",
		Reason:             "result confirmed",
		ActorID:            "admin-risk-1",
	})
	if err != nil {
		t.Fatalf("first settle bet: %v", err)
	}

	_, err = service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "away",
		Reason:             "result confirmed",
		ActorID:            "admin-risk-1",
	})
	if err != nil {
		t.Fatalf("idempotent settle bet: %v", err)
	}

	events, err := service.ListEvents(10)
	if err != nil {
		t.Fatalf("list events: %v", err)
	}
	if len(events) != 2 {
		t.Fatalf("expected two events (placed + settled), got %d", len(events))
	}
}

func TestLifecycleIdempotentResettlementReplayDoesNotDuplicateEvents(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-14b", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-14b",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     500,
		Odds:           2.0,
		IdempotencyKey: "idempotent-resettle",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	_, err = service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "away",
		Reason:             "initial settlement",
		ActorID:            "admin-risk-1",
	})
	if err != nil {
		t.Fatalf("first settle bet: %v", err)
	}

	_, err = service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "home",
		Reason:             "resettlement",
		ActorID:            "admin-risk-2",
	})
	if err != nil {
		t.Fatalf("resettle bet: %v", err)
	}

	_, err = service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "home",
		Reason:             "resettlement",
		ActorID:            "admin-risk-2",
	})
	if err != nil {
		t.Fatalf("idempotent resettle replay: %v", err)
	}

	events, err := service.ListEvents(10)
	if err != nil {
		t.Fatalf("list events: %v", err)
	}
	if len(events) != 3 {
		t.Fatalf("expected three events (placed + settled + resettled), got %d", len(events))
	}
}

func TestLifecycleRejectsInvalidRefundAfterWinningSettlement(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-bet-15", AmountCents: 5000, IdempotencyKey: "seed"})

	service := NewService(repository, walletService)
	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-bet-15",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     500,
		Odds:           2.0,
		IdempotencyKey: "winning-settle",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	_, err = service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "home",
		Reason:             "result confirmed",
		ActorID:            "admin-risk-1",
	})
	if err != nil {
		t.Fatalf("settle winning bet: %v", err)
	}

	_, err = service.Refund(LifecycleBetRequest{
		BetID:   placed.BetID,
		Reason:  "operator goodwill",
		ActorID: "admin-ops-1",
	})
	if err == nil {
		t.Fatalf("expected refund conflict after settled_won")
	}
	if !errors.Is(err, ErrBetStateConflict) {
		t.Fatalf("expected ErrBetStateConflict, got %v", err)
	}
}

func TestPromoUsageSummaryAggregatesPromoCounters(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	freebetService := freebets.NewService()
	oddsBoostService := oddsboosts.NewService()

	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-1",
		AmountCents:    10000,
		IdempotencyKey: "seed-summary-balance",
	})
	_, err := oddsBoostService.Accept(oddsboosts.AcceptRequest{
		OddsBoostID: "ob:local:001",
		UserID:      "u-1",
		RequestID:   "summary-accept-1",
	})
	if err != nil {
		t.Fatalf("accept odds boost: %v", err)
	}

	service := NewService(repository, walletService)
	service.SetPromotionServices(freebetService, oddsBoostService)

	_, err = service.Place(PlaceBetRequest{
		UserID:         "u-1",
		RequestID:      "summary-place-1",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           2.05,
		FreebetID:      "fb:local:001",
		OddsBoostID:    "ob:local:001",
		IdempotencyKey: "summary-place-1",
	})
	if err != nil {
		t.Fatalf("place promo bet: %v", err)
	}

	_, err = service.Place(PlaceBetRequest{
		UserID:         "u-1",
		RequestID:      "summary-place-2",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     500,
		Odds:           1.8,
		IdempotencyKey: "summary-place-2",
	})
	if err != nil {
		t.Fatalf("place plain bet: %v", err)
	}

	_, err = service.Place(PlaceBetRequest{
		UserID:         "u-1",
		RequestID:      "summary-place-3",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     300,
		Odds:           2.05,
		OddsBoostID:    "ob:local:001",
		IdempotencyKey: "summary-place-3",
	})
	if err != nil {
		t.Fatalf("place odds-boost bet: %v", err)
	}

	summary, err := service.PromoUsageSummary(PromoUsageFilter{UserID: "u-1"}, 20)
	if err != nil {
		t.Fatalf("promo usage summary: %v", err)
	}
	if summary.TotalBets != 3 {
		t.Fatalf("expected total bets 3, got %d", summary.TotalBets)
	}
	if summary.BetsWithFreebet != 1 {
		t.Fatalf("expected betsWithFreebet 1, got %d", summary.BetsWithFreebet)
	}
	if summary.BetsWithOddsBoost != 2 {
		t.Fatalf("expected betsWithOddsBoost 2, got %d", summary.BetsWithOddsBoost)
	}
	if summary.BetsWithBoth != 1 {
		t.Fatalf("expected betsWithBoth 1, got %d", summary.BetsWithBoth)
	}
	if summary.TotalFreebetAppliedCents != 1000 {
		t.Fatalf("expected totalFreebetAppliedCents 1000, got %d", summary.TotalFreebetAppliedCents)
	}
	if len(summary.Freebets) != 1 || summary.Freebets[0].ID != "fb:local:001" {
		t.Fatalf("expected freebet breakdown for fb:local:001, got %+v", summary.Freebets)
	}
	if len(summary.OddsBoosts) != 1 || summary.OddsBoosts[0].ID != "ob:local:001" {
		t.Fatalf("expected odds boost breakdown for ob:local:001, got %+v", summary.OddsBoosts)
	}
}
