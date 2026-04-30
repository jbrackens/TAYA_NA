package prediction

import (
	"context"
	"testing"
	"time"
)

// TestTransitionMarketStatus_FiresLifecycleHook verifies that the post-commit
// hook is fired with the post-transition market state. Critical for the WS
// market_update fan-out that lets player-app subscribers see admin halt /
// close / void without refreshing.
func TestTransitionMarketStatus_FiresLifecycleHook(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusOpen // must be open to halt

	svc := NewService(repo, &fakeWallet{balances: map[string]int64{}})

	type fired struct {
		market *Market
		event  LifecycleEvent
	}
	got := make(chan fired, 1)
	svc.SetMarketLifecycleHandler(func(m *Market, e LifecycleEvent) {
		got <- fired{market: m, event: e}
	})

	if err := svc.TransitionMarketStatus(
		context.Background(),
		"mkt-1",
		MarketStatusHalted,
		"halted by admin",
		strPtr("admin-1"),
	); err != nil {
		t.Fatalf("TransitionMarketStatus: %v", err)
	}

	select {
	case f := <-got:
		if f.market == nil {
			t.Fatal("hook fired with nil market")
		}
		if f.market.Status != MarketStatusHalted {
			t.Errorf("hook market status: want %q, got %q", MarketStatusHalted, f.market.Status)
		}
		if f.event.EventType != string(MarketStatusHalted) {
			t.Errorf("hook event type: want %q, got %q", MarketStatusHalted, f.event.EventType)
		}
		if f.event.Reason == nil || *f.event.Reason != "halted by admin" {
			t.Errorf("hook event reason: want \"halted by admin\", got %v", f.event.Reason)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("lifecycle hook did not fire within 2s")
	}
}

// TestResolveMarket_FiresLifecycleHook covers the settle path (non-atomic).
func TestResolveMarket_FiresLifecycleHook(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed

	wallet := &fakeWallet{balances: map[string]int64{"alice": 0}}
	svc := NewService(repo, wallet)

	got := make(chan *Market, 1)
	svc.SetMarketLifecycleHandler(func(m *Market, _ LifecycleEvent) {
		got <- m
	})

	_, _, err := svc.ResolveMarket(context.Background(), "mkt-1", ResolveMarketRequest{
		Result:            MarketResultYes,
		AttestationSource: "admin",
	}, nil)
	if err != nil {
		t.Fatalf("ResolveMarket: %v", err)
	}

	select {
	case fired := <-got:
		if fired == nil {
			t.Fatal("hook fired with nil market")
		}
		if fired.Status != MarketStatusSettled {
			t.Errorf("settled hook: status want %q, got %q", MarketStatusSettled, fired.Status)
		}
		if fired.Result == nil || *fired.Result != MarketResultYes {
			t.Errorf("settled hook: result want %q, got %v", MarketResultYes, fired.Result)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("settle hook did not fire within 2s")
	}
}

// TestVoidMarket_FiresLifecycleHook covers the void path (non-atomic).
func TestVoidMarket_FiresLifecycleHook(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusOpen

	wallet := &fakeWallet{balances: map[string]int64{}}
	svc := NewService(repo, wallet)

	got := make(chan *Market, 1)
	svc.SetMarketLifecycleHandler(func(m *Market, _ LifecycleEvent) {
		got <- m
	})

	if _, err := svc.VoidMarket(context.Background(), "mkt-1", "data feed corrupted", strPtr("admin-1")); err != nil {
		t.Fatalf("VoidMarket: %v", err)
	}

	select {
	case fired := <-got:
		if fired == nil {
			t.Fatal("void hook fired with nil market")
		}
		if fired.Status != MarketStatusVoided {
			t.Errorf("void hook: status want %q, got %q", MarketStatusVoided, fired.Status)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("void hook did not fire within 2s")
	}
}

// TestResolveMarket_AtomicPath_FiresLifecycleHook covers the production
// (DB-backed atomic) settle path. Distinct from the non-atomic test above
// because the firing point is on a different return branch.
func TestResolveMarket_AtomicPath_FiresLifecycleHook(t *testing.T) {
	repo := &atomicMemRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.Status = MarketStatusClosed

	wallet := &fakeTxWallet{fakeWallet: &fakeWallet{balances: map[string]int64{"alice": 0}}}
	svc := NewService(repo, wallet)

	got := make(chan *Market, 1)
	svc.SetMarketLifecycleHandler(func(m *Market, _ LifecycleEvent) {
		got <- m
	})

	_, _, err := svc.ResolveMarket(context.Background(), "mkt-1", ResolveMarketRequest{
		Result:            MarketResultNo,
		AttestationSource: "admin",
	}, nil)
	if err != nil {
		t.Fatalf("ResolveMarket (atomic): %v", err)
	}

	if repo.atomicSettlementCalls != 1 {
		t.Fatalf("expected atomic path, got %d atomic settlement calls", repo.atomicSettlementCalls)
	}

	select {
	case fired := <-got:
		if fired.Status != MarketStatusSettled {
			t.Errorf("atomic-settle hook: status want %q, got %q", MarketStatusSettled, fired.Status)
		}
		if fired.Result == nil || *fired.Result != MarketResultNo {
			t.Errorf("atomic-settle hook: result want %q, got %v", MarketResultNo, fired.Result)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("atomic-settle hook did not fire within 2s")
	}
}

func strPtr(s string) *string { return &s }
