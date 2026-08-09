package prediction

// Settlement payouts seam (SettlementPayoutsHandler): the per-user
// notification hook must fire post-commit with every payout on a settle
// and every refund on a void — this is what the http layer turns into
// bell rows, portfolio pushes, and emails. No payouts (empty market) → no
// fire.

import (
	"context"
	"testing"
	"time"
)

type firedPayouts struct {
	market  *Market
	kind    string
	payouts []Payout
}

func seedTwoPositions(repo *memRepo) {
	repo.positions["alice:mkt-1:yes"] = &Position{
		ID: "pos-alice", UserID: "alice", MarketID: "mkt-1", Side: OrderSideYes,
		Quantity: 20, AvgPricePoints: 50, TotalCostPoints: 1000,
	}
	repo.positions["bob:mkt-1:no"] = &Position{
		ID: "pos-bob", UserID: "bob", MarketID: "mkt-1", Side: OrderSideNo,
		Quantity: 15, AvgPricePoints: 50, TotalCostPoints: 750,
	}
}

func TestResolveMarket_FiresPayoutsHook(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed
	seedTwoPositions(repo)

	svc := NewService(repo, &fakeWallet{balances: map[string]int64{"alice": 0, "bob": 0}})
	got := make(chan firedPayouts, 1)
	svc.SetSettlementPayoutsHandler(func(m *Market, kind string, payouts []Payout) {
		got <- firedPayouts{market: m, kind: kind, payouts: payouts}
	})

	_, _, err := svc.ResolveMarket(context.Background(), "mkt-1", ResolveMarketRequest{
		Result:            MarketResultYes,
		AttestationSource: "admin",
	}, nil)
	if err != nil {
		t.Fatalf("ResolveMarket: %v", err)
	}

	select {
	case f := <-got:
		if f.kind != "settled" {
			t.Errorf("kind: want settled, got %q", f.kind)
		}
		if f.market == nil || f.market.Status != MarketStatusSettled {
			t.Errorf("hook market should be settled, got %+v", f.market)
		}
		if len(f.payouts) != 2 {
			t.Fatalf("expected both position holders in payouts, got %d", len(f.payouts))
		}
		byUser := map[string]Payout{}
		for _, p := range f.payouts {
			byUser[p.UserID] = p
		}
		if byUser["alice"].PayoutPoints != 2000 {
			t.Errorf("alice payout: want 2000, got %d", byUser["alice"].PayoutPoints)
		}
		if byUser["bob"].PayoutPoints != 0 {
			t.Errorf("bob payout: want 0 (losing side), got %d", byUser["bob"].PayoutPoints)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("payouts hook did not fire within 2s")
	}
}

func TestVoidMarket_FiresPayoutsHookWithRefunds(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusOpen
	seedTwoPositions(repo)

	svc := NewService(repo, &fakeWallet{balances: map[string]int64{"alice": 0, "bob": 0}})
	got := make(chan firedPayouts, 1)
	svc.SetSettlementPayoutsHandler(func(m *Market, kind string, payouts []Payout) {
		got <- firedPayouts{market: m, kind: kind, payouts: payouts}
	})

	if _, err := svc.VoidMarket(context.Background(), "mkt-1", "feed corrupted", strPtr("admin-1")); err != nil {
		t.Fatalf("VoidMarket: %v", err)
	}

	select {
	case f := <-got:
		if f.kind != "voided" {
			t.Errorf("kind: want voided, got %q", f.kind)
		}
		if len(f.payouts) != 2 {
			t.Fatalf("expected 2 refunds, got %d", len(f.payouts))
		}
		for _, p := range f.payouts {
			if p.PayoutPoints <= 0 {
				t.Errorf("void refund for %s should be positive entry cost, got %d", p.UserID, p.PayoutPoints)
			}
		}
	case <-time.After(2 * time.Second):
		t.Fatal("void payouts hook did not fire within 2s")
	}
}

func TestResolveMarket_NoPositionsNoPayoutsHook(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed

	svc := NewService(repo, &fakeWallet{balances: map[string]int64{}})
	got := make(chan firedPayouts, 1)
	svc.SetSettlementPayoutsHandler(func(m *Market, kind string, payouts []Payout) {
		got <- firedPayouts{market: m, kind: kind, payouts: payouts}
	})

	if _, _, err := svc.ResolveMarket(context.Background(), "mkt-1", ResolveMarketRequest{
		Result:            MarketResultNo,
		AttestationSource: "admin",
	}, nil); err != nil {
		t.Fatalf("ResolveMarket: %v", err)
	}

	select {
	case f := <-got:
		t.Fatalf("hook must not fire for a market with no positions, got %d payouts", len(f.payouts))
	case <-time.After(300 * time.Millisecond):
		// correct: nothing to notify
	}
}
