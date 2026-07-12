package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"taptrade/gateway/internal/compliance"
)

// fakeWallet counts credits per idempotency key so tests can prove
// exactly-once fulfillment.
type fakeWallet struct {
	mu      sync.Mutex
	counts  map[string]int
	amounts map[string]int64
	reasons map[string]string
	users   map[string]string
	err     error
}

func newFakeWallet() *fakeWallet {
	return &fakeWallet{
		counts:  make(map[string]int),
		amounts: make(map[string]int64),
		reasons: make(map[string]string),
		users:   make(map[string]string),
	}
}

func (f *fakeWallet) CreditWithTx(_ context.Context, _ *sql.Tx, userID string, amountPoints int64, idempotencyKey, reason string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.err != nil {
		return f.err
	}
	f.counts[idempotencyKey]++
	f.amounts[idempotencyKey] = amountPoints
	f.reasons[idempotencyKey] = reason
	f.users[idempotencyKey] = userID
	return nil
}

func (f *fakeWallet) totalCredits() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	total := 0
	for _, count := range f.counts {
		total += count
	}
	return total
}

type serviceFixture struct {
	svc    *Service
	repo   *MemoryRepository
	wallet *fakeWallet
	clock  *fakeClock
}

type fakeClock struct {
	mu  sync.Mutex
	now time.Time
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = c.now.Add(d)
}

func newFixture(t *testing.T, cfg Config, packs ...PointPack) *serviceFixture {
	t.Helper()
	if len(packs) == 0 {
		packs = DefaultCatalogue()
	}
	if cfg.Provider == "" {
		cfg.Provider = ProviderDemo
	}
	cfg.Enabled = true
	clock := &fakeClock{now: time.Date(2026, 7, 12, 12, 0, 0, 0, time.UTC)}
	repo := NewMemoryRepository(packs...)
	walletFake := newFakeWallet()
	provider := NewDemoProvider(10*time.Second, clock.Now)
	svc := NewService(cfg, repo, walletFake, provider)
	svc.SetClock(clock.Now)
	return &serviceFixture{svc: svc, repo: repo, wallet: walletFake, clock: clock}
}

func checkoutSuccess(t *testing.T, f *serviceFixture, userID, packID, key string) *Purchase {
	t.Helper()
	purchase, session, created, err := f.svc.CreateCheckout(context.Background(), userID, packID, key)
	if err != nil {
		t.Fatalf("checkout failed: %v", err)
	}
	if !created {
		t.Fatalf("expected a fresh purchase for key %q", key)
	}
	if session == nil || session.ProviderSessionID == "" {
		t.Fatalf("expected a provider session, got %+v", session)
	}
	return purchase
}

func TestCatalogueFiltersPacks(t *testing.T) {
	now := time.Date(2026, 7, 12, 12, 0, 0, 0, time.UTC)
	past := now.Add(-time.Hour)
	future := now.Add(time.Hour)
	packs := []PointPack{
		{ID: "active", Name: "Active", PriceUsdCents: 500, BasePoints: 500, Active: true, DisplayOrder: 1},
		{ID: "inactive", Name: "Inactive", PriceUsdCents: 500, BasePoints: 500, Active: false, DisplayOrder: 2},
		{ID: "promo_live", Name: "Promo Live", PriceUsdCents: 500, BasePoints: 500, Active: true, DisplayOrder: 3, PromoStartsAt: &past, PromoEndsAt: &future},
		{ID: "promo_future", Name: "Promo Future", PriceUsdCents: 500, BasePoints: 500, Active: true, DisplayOrder: 4, PromoStartsAt: &future},
		{ID: "promo_over", Name: "Promo Over", PriceUsdCents: 500, BasePoints: 500, Active: true, DisplayOrder: 5, PromoEndsAt: &past},
		{ID: "intro", Name: "Intro", PriceUsdCents: 500, BasePoints: 500, Active: true, DisplayOrder: 6, IntroOnly: true},
	}
	f := newFixture(t, Config{}, packs...)

	served, firstPurchase, err := f.svc.Catalogue(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("catalogue: %v", err)
	}
	if !firstPurchase {
		t.Fatalf("fresh user must be first-purchase eligible")
	}
	ids := make([]string, 0, len(served))
	for _, pack := range served {
		ids = append(ids, pack.ID)
	}
	want := "active,promo_live,intro"
	if got := strings.Join(ids, ","); got != want {
		t.Fatalf("catalogue mismatch: got %q want %q", got, want)
	}

	// After a completed purchase, intro-only packs disappear and the
	// first-purchase flag drops.
	purchase := checkoutSuccess(t, f, "u-1", "active", "key-1")
	if _, _, err := f.svc.Confirm(context.Background(), purchase, DemoOutcomeSuccess); err != nil {
		t.Fatalf("confirm: %v", err)
	}
	served, firstPurchase, err = f.svc.Catalogue(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("catalogue after purchase: %v", err)
	}
	if firstPurchase {
		t.Fatalf("first-purchase flag must drop after a completed purchase")
	}
	for _, pack := range served {
		if pack.ID == "intro" {
			t.Fatalf("intro-only pack must not be served after the first completed purchase")
		}
	}
}

func TestCreateCheckoutResolvesPackServerSide(t *testing.T) {
	f := newFixture(t, Config{})
	purchase := checkoutSuccess(t, f, "u-1", "popular", "key-1")

	if purchase.PriceUsdCents != 2500 || purchase.BasePoints != 2500 || purchase.BonusPoints != 250 {
		t.Fatalf("purchase snapshot must come from the server-side pack row, got %+v", purchase)
	}
	if purchase.Status != StatusPendingPayment {
		t.Fatalf("new purchase must be pending_payment, got %s", purchase.Status)
	}
	if purchase.UserID != "u-1" || purchase.Provider != ProviderDemo {
		t.Fatalf("purchase identity mismatch: %+v", purchase)
	}
	if !strings.HasPrefix(purchase.ID, "sp_") {
		t.Fatalf("purchase id must carry the sp_ prefix, got %q", purchase.ID)
	}
}

func TestCreateCheckoutRejectsUnknownAndInactivePacks(t *testing.T) {
	f := newFixture(t, Config{}, []PointPack{
		{ID: "active", Name: "Active", PriceUsdCents: 500, BasePoints: 500, Active: true},
		{ID: "inactive", Name: "Inactive", PriceUsdCents: 500, BasePoints: 500, Active: false},
	}...)

	if _, _, _, err := f.svc.CreateCheckout(context.Background(), "u-1", "missing", "key-1"); !errors.Is(err, ErrPackNotFound) {
		t.Fatalf("expected ErrPackNotFound for unknown pack, got %v", err)
	}
	if _, _, _, err := f.svc.CreateCheckout(context.Background(), "u-1", "inactive", "key-2"); !errors.Is(err, ErrPackUnavailable) {
		t.Fatalf("expected ErrPackUnavailable for inactive pack, got %v", err)
	}
	if _, _, _, err := f.svc.CreateCheckout(context.Background(), "u-1", "active", "  "); !errors.Is(err, ErrIdempotencyKeyRequired) {
		t.Fatalf("expected ErrIdempotencyKeyRequired for blank key, got %v", err)
	}
}

func TestCreateCheckoutIdempotentReplay(t *testing.T) {
	f := newFixture(t, Config{})
	first := checkoutSuccess(t, f, "u-1", "starter", "key-1")

	second, _, created, err := f.svc.CreateCheckout(context.Background(), "u-1", "starter", "key-1")
	if err != nil {
		t.Fatalf("replayed checkout: %v", err)
	}
	if created {
		t.Fatalf("replayed checkout must not create a second purchase")
	}
	if second.ID != first.ID {
		t.Fatalf("replayed checkout must return the same purchase: %s vs %s", second.ID, first.ID)
	}
	purchases, err := f.svc.PurchasesForUser(context.Background(), "u-1", 10)
	if err != nil {
		t.Fatalf("list purchases: %v", err)
	}
	if len(purchases) != 1 {
		t.Fatalf("expected exactly one purchase after replay, got %d", len(purchases))
	}
}

func TestFulfillmentCreditsBaseAndBonusExactlyOnce(t *testing.T) {
	f := newFixture(t, Config{})
	purchase := checkoutSuccess(t, f, "u-1", "popular", "key-1")

	updated, alreadyFulfilled, err := f.svc.Confirm(context.Background(), purchase, DemoOutcomeSuccess)
	if err != nil {
		t.Fatalf("confirm success: %v", err)
	}
	if alreadyFulfilled {
		t.Fatalf("first confirmation must not report alreadyFulfilled")
	}
	if updated.Status != StatusCompleted || updated.CompletedAt == nil {
		t.Fatalf("expected completed purchase with completion time, got %+v", updated)
	}

	baseKey := PurchaseCreditKey(purchase.ID)
	bonusKey := PurchaseBonusCreditKey(purchase.ID)
	if f.wallet.counts[baseKey] != 1 {
		t.Fatalf("base credit count for %s = %d, want 1", baseKey, f.wallet.counts[baseKey])
	}
	if f.wallet.counts[bonusKey] != 1 {
		t.Fatalf("bonus credit count for %s = %d, want 1", bonusKey, f.wallet.counts[bonusKey])
	}
	if f.wallet.amounts[baseKey] != 2500 || f.wallet.amounts[bonusKey] != 250 {
		t.Fatalf("credit amounts mismatch: base=%d bonus=%d", f.wallet.amounts[baseKey], f.wallet.amounts[bonusKey])
	}
	if f.wallet.reasons[baseKey] != ReasonPointPackPurchase {
		t.Fatalf("base reason = %q, want %q", f.wallet.reasons[baseKey], ReasonPointPackPurchase)
	}
	if f.wallet.reasons[bonusKey] != ReasonPromoBonus {
		t.Fatalf("bonus reason = %q, want %q", f.wallet.reasons[bonusKey], ReasonPromoBonus)
	}
	if f.wallet.users[baseKey] != "u-1" || f.wallet.users[bonusKey] != "u-1" {
		t.Fatalf("credits must target the purchase owner")
	}
}

func TestZeroBonusPackCreditsBaseOnly(t *testing.T) {
	f := newFixture(t, Config{})
	purchase := checkoutSuccess(t, f, "u-1", "starter", "key-1")
	if _, _, err := f.svc.Confirm(context.Background(), purchase, DemoOutcomeSuccess); err != nil {
		t.Fatalf("confirm: %v", err)
	}
	if f.wallet.totalCredits() != 1 {
		t.Fatalf("zero-bonus pack must produce exactly one credit, got %d", f.wallet.totalCredits())
	}
	if _, exists := f.wallet.counts[PurchaseBonusCreditKey(purchase.ID)]; exists {
		t.Fatalf("zero-bonus pack must not write a bonus credit")
	}
}

func TestDuplicateConfirmationIsIdempotentNoSecondCredit(t *testing.T) {
	f := newFixture(t, Config{})
	purchase := checkoutSuccess(t, f, "u-1", "popular", "key-1")

	if _, _, err := f.svc.Confirm(context.Background(), purchase, DemoOutcomeSuccess); err != nil {
		t.Fatalf("first confirm: %v", err)
	}
	creditsAfterFirst := f.wallet.totalCredits()

	replayed, alreadyFulfilled, err := f.svc.Confirm(context.Background(), purchase, DemoOutcomeSuccess)
	if err != nil {
		t.Fatalf("replayed confirm must be an idempotent success, got %v", err)
	}
	if !alreadyFulfilled {
		t.Fatalf("replayed confirm must report alreadyFulfilled")
	}
	if replayed.Status != StatusCompleted {
		t.Fatalf("replayed confirm status = %s, want completed", replayed.Status)
	}
	if f.wallet.totalCredits() != creditsAfterFirst {
		t.Fatalf("replayed confirm must not move points: %d -> %d credits", creditsAfterFirst, f.wallet.totalCredits())
	}
}

func TestFailedAndCanceledOutcomesMakeNoWalletCalls(t *testing.T) {
	cases := []struct {
		outcome    string
		wantStatus PurchaseStatus
	}{
		{DemoOutcomeFailure, StatusFailed},
		{DemoOutcomeCancel, StatusCanceled},
	}
	for _, tc := range cases {
		t.Run(tc.outcome, func(t *testing.T) {
			f := newFixture(t, Config{})
			purchase := checkoutSuccess(t, f, "u-1", "popular", "key-1")

			updated, _, err := f.svc.Confirm(context.Background(), purchase, tc.outcome)
			if err != nil {
				t.Fatalf("confirm %s: %v", tc.outcome, err)
			}
			if updated.Status != tc.wantStatus {
				t.Fatalf("status = %s, want %s", updated.Status, tc.wantStatus)
			}
			if updated.FailureReason == "" {
				t.Fatalf("terminal non-success purchase must carry a failure reason")
			}
			if f.wallet.totalCredits() != 0 {
				t.Fatalf("%s outcome must make zero wallet calls, got %d", tc.outcome, f.wallet.totalCredits())
			}

			// Terminal states are final: a later success confirm is refused
			// and still moves no points.
			if _, _, err := f.svc.Confirm(context.Background(), updated, DemoOutcomeSuccess); !errors.Is(err, ErrInvalidTransition) {
				t.Fatalf("expected ErrInvalidTransition after terminal state, got %v", err)
			}
			if f.wallet.totalCredits() != 0 {
				t.Fatalf("refused transition must not move points")
			}
		})
	}
}

func TestDelayedOutcomeStaysPendingThenCompletesAfterClockAdvance(t *testing.T) {
	f := newFixture(t, Config{})
	purchase := checkoutSuccess(t, f, "u-1", "player", "key-1")

	pending, alreadyFulfilled, err := f.svc.Confirm(context.Background(), purchase, DemoOutcomeDelayed)
	if err != nil {
		t.Fatalf("confirm delayed: %v", err)
	}
	if alreadyFulfilled || pending.Status != StatusPendingPayment {
		t.Fatalf("delayed confirm must leave the purchase pending, got %+v", pending)
	}
	if f.wallet.totalCredits() != 0 {
		t.Fatalf("pending purchase must hold zero credited points")
	}

	// Before the delay elapses the provider still reports pending.
	stillPending, err := f.svc.RefreshPurchase(context.Background(), pending)
	if err != nil {
		t.Fatalf("refresh before delay: %v", err)
	}
	if stillPending.Status != StatusPendingPayment {
		t.Fatalf("purchase completed before the configured delay elapsed")
	}
	if f.wallet.totalCredits() != 0 {
		t.Fatalf("no points may move before the provider reports completion")
	}

	// Advance the injected clock past the delay: the provider reports
	// completed and fulfillment credits exactly once.
	f.clock.Advance(11 * time.Second)
	completed, err := f.svc.RefreshPurchase(context.Background(), stillPending)
	if err != nil {
		t.Fatalf("refresh after delay: %v", err)
	}
	if completed.Status != StatusCompleted {
		t.Fatalf("delayed purchase must complete after the delay, got %s", completed.Status)
	}
	if f.wallet.counts[PurchaseCreditKey(purchase.ID)] != 1 || f.wallet.counts[PurchaseBonusCreditKey(purchase.ID)] != 1 {
		t.Fatalf("delayed completion must credit exactly once: %+v", f.wallet.counts)
	}

	// A second refresh replays idempotently.
	again, err := f.svc.RefreshPurchase(context.Background(), completed)
	if err != nil {
		t.Fatalf("refresh replay: %v", err)
	}
	if again.Status != StatusCompleted || f.wallet.totalCredits() != 2 {
		t.Fatalf("refresh replay must not re-credit: status=%s credits=%d", again.Status, f.wallet.totalCredits())
	}
}

func TestPendingPurchaseStaysPendingWithoutConfirmation(t *testing.T) {
	f := newFixture(t, Config{})
	purchase := checkoutSuccess(t, f, "u-1", "starter", "key-1")

	refreshed, err := f.svc.RefreshPurchase(context.Background(), purchase)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if refreshed.Status != StatusPendingPayment {
		t.Fatalf("unconfirmed purchase must stay pending, got %s", refreshed.Status)
	}
	if f.wallet.totalCredits() != 0 {
		t.Fatalf("pending purchase must not credit points")
	}
}

func TestStateTransitionMatrix(t *testing.T) {
	statuses := []PurchaseStatus{StatusPendingPayment, StatusCompleted, StatusFailed, StatusCanceled}
	for _, from := range statuses {
		for _, to := range statuses {
			want := from == StatusPendingPayment && to != StatusPendingPayment
			if got := CanTransition(from, to); got != want {
				t.Fatalf("CanTransition(%s, %s) = %v, want %v", from, to, got, want)
			}
		}
	}
}

func TestFirstPurchaseBonusBpsAppliesOnlyToFirstPurchase(t *testing.T) {
	f := newFixture(t, Config{FirstPurchaseBonusBps: 1000})

	first := checkoutSuccess(t, f, "u-1", "player", "key-1")
	// player: base 1000, catalogue bonus 50, first-purchase extra 10% of base.
	if first.BonusPoints != 50+100 {
		t.Fatalf("first purchase bonus = %d, want 150", first.BonusPoints)
	}
	if _, _, err := f.svc.Confirm(context.Background(), first, DemoOutcomeSuccess); err != nil {
		t.Fatalf("confirm: %v", err)
	}

	second := checkoutSuccess(t, f, "u-1", "player", "key-2")
	if second.BonusPoints != 50 {
		t.Fatalf("second purchase bonus = %d, want the plain catalogue 50", second.BonusPoints)
	}
}

func TestWebhookEventFulfillsAndRepaysIdempotently(t *testing.T) {
	f := newFixture(t, Config{})
	purchase := checkoutSuccess(t, f, "u-1", "popular", "key-1")

	event := WebhookEvent{
		EventID:    "evt-1",
		EventType:  "checkout.completed",
		PurchaseID: purchase.ID,
		Status:     "completed",
	}
	updated, alreadyFulfilled, err := f.svc.HandleWebhookEvent(context.Background(), event)
	if err != nil {
		t.Fatalf("webhook event: %v", err)
	}
	if alreadyFulfilled || updated.Status != StatusCompleted {
		t.Fatalf("webhook fulfillment failed: %+v already=%v", updated, alreadyFulfilled)
	}
	creditsAfterFirst := f.wallet.totalCredits()

	replayed, alreadyFulfilled, err := f.svc.HandleWebhookEvent(context.Background(), event)
	if err != nil {
		t.Fatalf("webhook replay must succeed, got %v", err)
	}
	if !alreadyFulfilled || replayed.Status != StatusCompleted {
		t.Fatalf("webhook replay must be an idempotent no-op")
	}
	if f.wallet.totalCredits() != creditsAfterFirst {
		t.Fatalf("webhook replay must not re-credit")
	}

	if _, _, err := f.svc.HandleWebhookEvent(context.Background(), WebhookEvent{
		EventID:    "evt-2",
		PurchaseID: "sp_missing",
		Status:     "completed",
	}); !errors.Is(err, ErrPurchaseNotFound) {
		t.Fatalf("unknown purchase must be ErrPurchaseNotFound, got %v", err)
	}
}

func TestWalletFailureAbortsFulfillment(t *testing.T) {
	f := newFixture(t, Config{})
	purchase := checkoutSuccess(t, f, "u-1", "starter", "key-1")

	f.wallet.err = errors.New("wallet unavailable")
	if _, _, err := f.svc.Confirm(context.Background(), purchase, DemoOutcomeSuccess); err == nil {
		t.Fatalf("expected fulfillment to fail when the wallet credit fails")
	}
	current, err := f.svc.Purchase(context.Background(), purchase.ID)
	if err != nil {
		t.Fatalf("get purchase: %v", err)
	}
	if current.Status != StatusPendingPayment {
		t.Fatalf("failed wallet credit must leave the purchase pending, got %s", current.Status)
	}

	// Retry after the wallet recovers: fulfillment completes exactly once.
	f.wallet.err = nil
	updated, _, err := f.svc.Confirm(context.Background(), purchase, DemoOutcomeSuccess)
	if err != nil {
		t.Fatalf("retry confirm: %v", err)
	}
	if updated.Status != StatusCompleted || f.wallet.counts[PurchaseCreditKey(purchase.ID)] != 1 {
		t.Fatalf("retry must fulfill exactly once: %+v", f.wallet.counts)
	}
}

func TestLedgerReasonsPassLaunchSafetyScrub(t *testing.T) {
	for _, reason := range []string{ReasonPointPackPurchase, ReasonPromoBonus} {
		if compliance.HasLaunchProhibitedCopy(reason) {
			t.Fatalf("ledger reason %q trips the launch-safety copy scrub and would render redacted", reason)
		}
	}
}

func TestLedgerReasonsAreNotFreeGrantReasons(t *testing.T) {
	// isRewardGrantReason (internal/http/wallet_handlers.go) counts these
	// reasons against REWARD_DAILY_GRANT_LIMIT_CENTS and the free-faucet
	// device/IP caps. Paid purchase reasons must never join that set.
	freeGrantReasons := map[string]bool{
		"daily_claim":      true,
		"point_pack_grant": true,
		"mission_reward":   true,
		"streak_reward":    true,
	}
	for _, reason := range []string{ReasonPointPackPurchase, ReasonPromoBonus} {
		if freeGrantReasons[reason] {
			t.Fatalf("purchase reason %q collides with the free-grant reason set", reason)
		}
	}
}

func TestIdempotencyKeyPrefixAvoidsExistingWalletNamespaces(t *testing.T) {
	// The wallet idempotency namespace is flat per (entry_type, user_id) and
	// mission/badge evidence counters key off prefixes. store_purchase: must
	// not shadow or be shadowed by any existing prefix.
	existingPrefixes := []string{
		"starter_grant:", "daily_claim:", "point_pack:", "mission_reward:",
		"streak_reward:", "reservation:", "release:", "capture:",
		"prediction_fill:", "prediction_fill_proceeds:", "prediction_payout:",
		"prediction_void:", "prediction_order:", "payment:",
	}
	baseKey := PurchaseCreditKey("sp_x")
	bonusKey := PurchaseBonusCreditKey("sp_x")
	for _, prefix := range existingPrefixes {
		for _, key := range []string{baseKey, bonusKey} {
			if strings.HasPrefix(key, prefix) {
				t.Fatalf("store key %q collides with existing wallet prefix %q", key, prefix)
			}
		}
		if strings.HasPrefix(prefix, "store_purchase:") {
			t.Fatalf("existing prefix %q shadows the store namespace", prefix)
		}
	}
}
