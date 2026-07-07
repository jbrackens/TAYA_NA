package prediction

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
)

type fakeResolutionStore struct {
	proposals map[string]*ResolutionProposal
	disputes  map[string]*Dispute // keyed by dispute ID
	seq       int
	lmu       sync.Mutex
	locks     map[string]*sync.Mutex
}

func newFakeResolutionStore() *fakeResolutionStore {
	return &fakeResolutionStore{
		proposals: map[string]*ResolutionProposal{},
		disputes:  map[string]*Dispute{},
		locks:     map[string]*sync.Mutex{},
	}
}

func (f *fakeResolutionStore) WithMarketLock(_ context.Context, marketID string, fn func() error) error {
	f.lmu.Lock()
	m := f.locks[marketID]
	if m == nil {
		m = &sync.Mutex{}
		f.locks[marketID] = m
	}
	f.lmu.Unlock()
	m.Lock()
	defer m.Unlock()
	return fn()
}

func (f *fakeResolutionStore) CreateProposal(_ context.Context, p *ResolutionProposal) error {
	f.proposals[p.MarketID] = p
	return nil
}
func (f *fakeResolutionStore) GetActiveProposal(_ context.Context, marketID string) (*ResolutionProposal, error) {
	if p := f.proposals[marketID]; p != nil && p.Status == "proposed" {
		return p, nil
	}
	return nil, nil
}
func (f *fakeResolutionStore) MarkProposalFinalized(_ context.Context, marketID string) (bool, error) {
	// CAS: only the proposed -> finalized transition "wins" the claim.
	if p := f.proposals[marketID]; p != nil && p.Status == "proposed" {
		p.Status = "finalized"
		return true, nil
	}
	return false, nil
}
func (f *fakeResolutionStore) ReopenProposal(_ context.Context, marketID string) error {
	if p := f.proposals[marketID]; p != nil && p.Status == "finalized" {
		p.Status = "proposed"
	}
	return nil
}
func (f *fakeResolutionStore) MarkProposalVoided(_ context.Context, marketID string) error {
	if p := f.proposals[marketID]; p != nil {
		p.Status = "voided"
	}
	return nil
}
func (f *fakeResolutionStore) ListFinalizableProposals(_ context.Context, asOf time.Time) ([]ResolutionProposal, error) {
	var out []ResolutionProposal
	for _, p := range f.proposals {
		// proposed_by IS NULL mirrors the SQL dual-control filter: only
		// system-proposed resolutions are auto-finalizable.
		if p.Status == "proposed" && p.ProposedBy == nil && !p.ChallengeEndsAt.After(asOf) {
			out = append(out, *p)
		}
	}
	return out, nil
}
func (f *fakeResolutionStore) CountOpenDisputes(_ context.Context, marketID string) (int, error) {
	n := 0
	for _, d := range f.disputes {
		if d.MarketID == marketID && d.Status == "open" {
			n++
		}
	}
	return n, nil
}
func (f *fakeResolutionStore) CreateDispute(_ context.Context, d *Dispute) error {
	f.seq++
	if d.ID == "" {
		d.ID = fmt.Sprintf("dispute-%d", f.seq)
	}
	if d.Status == "" {
		d.Status = "open"
	}
	cp := *d
	f.disputes[d.ID] = &cp
	return nil
}
func (f *fakeResolutionStore) ListDisputes(_ context.Context, marketID string) ([]Dispute, error) {
	var out []Dispute
	for _, d := range f.disputes {
		if d.MarketID == marketID {
			out = append(out, *d)
		}
	}
	return out, nil
}
func (f *fakeResolutionStore) ListOpenDisputes(_ context.Context) ([]Dispute, error) {
	var out []Dispute
	for _, d := range f.disputes {
		if d.Status == "open" {
			out = append(out, *d)
		}
	}
	return out, nil
}
func (f *fakeResolutionStore) GetDispute(_ context.Context, id string) (*Dispute, error) {
	if d := f.disputes[id]; d != nil {
		cp := *d
		return &cp, nil
	}
	return nil, nil
}
func (f *fakeResolutionStore) ResolveDispute(_ context.Context, id, status, note string, resolvedBy *string) error {
	if d := f.disputes[id]; d != nil && d.Status == "open" {
		d.Status = status
		if note != "" {
			d.ResolutionNote = &note
		}
		d.ResolvedBy = resolvedBy
	}
	return nil
}

// TestProposeThenFinalizeResolution covers the ADR-0003/0004 seam: propose holds
// payouts (market -> proposed_resolution), finalize is gated on the challenge
// window and open disputes, and succeeds (-> settled) only when both clear.
func TestProposeThenFinalizeResolution(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed

	svc := NewService(repo, &fakeWallet{balances: map[string]int64{"alice": 0}})
	store := newFakeResolutionStore()
	svc.SetResolutionStore(store)

	// Propose: market enters the challenge window; no settlement yet.
	if _, err := svc.ProposeResolution(context.Background(), "mkt-1", ResolveMarketRequest{
		Result:            MarketResultYes,
		AttestationSource: "admin",
	}, strPtr("admin-1"), time.Hour); err != nil {
		t.Fatalf("ProposeResolution: %v", err)
	}
	if got, _ := repo.GetMarket(context.Background(), "mkt-1"); got.Status != MarketStatusProposedResolution {
		t.Fatalf("after propose: want proposed_resolution, got %s", got.Status)
	}
	if store.proposals["mkt-1"] == nil {
		t.Fatal("proposal should be persisted")
	}

	// Finalize before the window elapses -> rejected.
	if _, _, err := svc.FinalizeResolution(context.Background(), "mkt-1", strPtr("admin-2")); err == nil {
		t.Fatal("finalize must fail before the challenge window elapses")
	}

	// Elapse the window.
	store.proposals["mkt-1"].ChallengeEndsAt = time.Now().UTC().Add(-time.Minute)

	// An open dispute blocks finalize.
	disp := &Dispute{MarketID: "mkt-1", UserID: "bob", Reason: "wrong source", Status: "open"}
	if err := store.CreateDispute(context.Background(), disp); err != nil {
		t.Fatalf("CreateDispute: %v", err)
	}
	if _, _, err := svc.FinalizeResolution(context.Background(), "mkt-1", strPtr("admin-2")); err == nil {
		t.Fatal("finalize must be blocked while a dispute is open")
	}
	// Reject the dispute -> finalize unblocks.
	if err := store.ResolveDispute(context.Background(), disp.ID, "rejected", "no merit", strPtr("admin-2")); err != nil {
		t.Fatalf("ResolveDispute: %v", err)
	}

	// Now finalize succeeds and the market settles.
	if _, _, err := svc.FinalizeResolution(context.Background(), "mkt-1", strPtr("admin-2")); err != nil {
		t.Fatalf("FinalizeResolution: %v", err)
	}
	if got, _ := repo.GetMarket(context.Background(), "mkt-1"); got.Status != MarketStatusSettled {
		t.Fatalf("after finalize: want settled, got %s", got.Status)
	}
	if store.proposals["mkt-1"].Status != "finalized" {
		t.Fatalf("proposal should be marked finalized, got %s", store.proposals["mkt-1"].Status)
	}
}

// TestProposeResolutionRequiresStore confirms the windowed path is disabled when
// no store is configured (ResolveMarket immediate path stays usable).
func TestProposeResolutionRequiresStore(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed
	svc := NewService(repo, &fakeWallet{balances: map[string]int64{}})

	if _, err := svc.ProposeResolution(context.Background(), "mkt-1", ResolveMarketRequest{
		Result:            MarketResultNo,
		AttestationSource: "admin",
	}, nil, time.Hour); err == nil {
		t.Fatal("ProposeResolution must error without a resolution store")
	}
}

// TestResolveDisputeUpheldVoidsAndRefunds covers the ADR-0004 review queue
// uphold path: an upheld dispute voids the market (refunding both sides at cost,
// no clawback), terminates the proposal, and marks every open dispute upheld.
func TestResolveDisputeUpheldVoidsAndRefunds(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed

	repo.positions["alice:mkt-1:yes"] = &Position{
		ID: "pos-alice", UserID: "alice", MarketID: "mkt-1", Side: OrderSideYes,
		Quantity: 20, AvgPricePoints: 50, TotalCostPoints: 1000,
	}
	repo.positions["bob:mkt-1:no"] = &Position{
		ID: "pos-bob", UserID: "bob", MarketID: "mkt-1", Side: OrderSideNo,
		Quantity: 15, AvgPricePoints: 50, TotalCostPoints: 750,
	}

	wallet := &fakeWallet{balances: map[string]int64{"alice": 0, "bob": 0}}
	svc := NewService(repo, wallet)
	store := newFakeResolutionStore()
	svc.SetResolutionStore(store)

	// Admin-1 proposes; the market enters proposed_resolution.
	if _, err := svc.ProposeResolution(context.Background(), "mkt-1", ResolveMarketRequest{
		Result: MarketResultYes, AttestationSource: "admin",
	}, strPtr("admin-1"), time.Hour); err != nil {
		t.Fatalf("ProposeResolution: %v", err)
	}
	// A holder disputes; the market reflects disputed.
	disp := &Dispute{MarketID: "mkt-1", UserID: "bob", Reason: "wrong source", Status: "open"}
	if err := store.CreateDispute(context.Background(), disp); err != nil {
		t.Fatalf("CreateDispute: %v", err)
	}
	if err := svc.MarkMarketDisputed(context.Background(), "mkt-1", "bob"); err != nil {
		t.Fatalf("MarkMarketDisputed: %v", err)
	}
	if got, _ := repo.GetMarket(context.Background(), "mkt-1"); got.Status != MarketStatusDisputed {
		t.Fatalf("after dispute filed: want disputed, got %s", got.Status)
	}

	// Admin-2 upholds -> market voided, both sides refunded at cost.
	resolved, err := svc.ResolveDispute(context.Background(), disp.ID, true, "bad source", strPtr("admin-2"))
	if err != nil {
		t.Fatalf("ResolveDispute(uphold): %v", err)
	}
	if resolved.Status != "upheld" {
		t.Fatalf("dispute status: want upheld, got %s", resolved.Status)
	}
	if got, _ := repo.GetMarket(context.Background(), "mkt-1"); got.Status != MarketStatusVoided {
		t.Fatalf("after uphold: want voided, got %s", got.Status)
	}
	if wallet.balances["alice"] != 1000 || wallet.balances["bob"] != 750 {
		t.Fatalf("refunds wrong: alice=%d (want 1000), bob=%d (want 750)", wallet.balances["alice"], wallet.balances["bob"])
	}
	if store.proposals["mkt-1"].Status != "voided" {
		t.Fatalf("proposal should be voided, got %s", store.proposals["mkt-1"].Status)
	}
}

// TestResolveDisputeDualControlAndReject covers the reject path and dual-control:
// the proposer cannot resolve a dispute against their own proposal; a different
// admin rejects it, and finalize then settles the market.
func TestResolveDisputeDualControlAndReject(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed
	svc := NewService(repo, &fakeWallet{balances: map[string]int64{}})
	store := newFakeResolutionStore()
	svc.SetResolutionStore(store)

	if _, err := svc.ProposeResolution(context.Background(), "mkt-1", ResolveMarketRequest{
		Result: MarketResultYes, AttestationSource: "admin",
	}, strPtr("admin-1"), time.Hour); err != nil {
		t.Fatalf("ProposeResolution: %v", err)
	}
	disp := &Dispute{MarketID: "mkt-1", UserID: "carol", Reason: "disagree", Status: "open"}
	if err := store.CreateDispute(context.Background(), disp); err != nil {
		t.Fatalf("CreateDispute: %v", err)
	}
	if err := svc.MarkMarketDisputed(context.Background(), "mkt-1", "carol"); err != nil {
		t.Fatalf("MarkMarketDisputed: %v", err)
	}

	// Dual-control: the proposer (admin-1) may not resolve their own dispute.
	if _, err := svc.ResolveDispute(context.Background(), disp.ID, false, "", strPtr("admin-1")); err == nil {
		t.Fatal("dual-control: proposer must not be able to resolve the dispute")
	}
	// A different admin rejects it.
	if _, err := svc.ResolveDispute(context.Background(), disp.ID, false, "no merit", strPtr("admin-2")); err != nil {
		t.Fatalf("ResolveDispute(reject): %v", err)
	}

	// Window elapses; admin-2 finalizes -> settled.
	store.proposals["mkt-1"].ChallengeEndsAt = time.Now().UTC().Add(-time.Minute)
	if _, _, err := svc.FinalizeResolution(context.Background(), "mkt-1", strPtr("admin-2")); err != nil {
		t.Fatalf("FinalizeResolution: %v", err)
	}
	if got, _ := repo.GetMarket(context.Background(), "mkt-1"); got.Status != MarketStatusSettled {
		t.Fatalf("after finalize: want settled, got %s", got.Status)
	}
}

// TestDirectResolveRejectsWindowedState covers the codex P1-1 fix: once a market
// is in the windowed resolution flow, the DIRECT settle path must refuse it so
// the legacy /admin/settlements endpoint can't bypass the window/dispute gates.
// Finalize is the only way through.
func TestDirectResolveRejectsWindowedState(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed
	svc := NewService(repo, &fakeWallet{balances: map[string]int64{}})
	store := newFakeResolutionStore()
	svc.SetResolutionStore(store)

	if _, err := svc.ProposeResolution(context.Background(), "mkt-1", ResolveMarketRequest{
		Result: MarketResultYes, AttestationSource: "admin",
	}, strPtr("admin-1"), time.Hour); err != nil {
		t.Fatalf("ProposeResolution: %v", err)
	}
	// Direct settle must be refused (market is proposed_resolution).
	if _, _, err := svc.ResolveMarket(context.Background(), "mkt-1", ResolveMarketRequest{
		Result: MarketResultYes, AttestationSource: "admin",
	}, strPtr("admin-2")); err == nil {
		t.Fatal("direct ResolveMarket must refuse a market in the windowed resolution flow")
	}
	// Finalize after the window still settles it.
	store.proposals["mkt-1"].ChallengeEndsAt = time.Now().UTC().Add(-time.Minute)
	if _, _, err := svc.FinalizeResolution(context.Background(), "mkt-1", strPtr("admin-2")); err != nil {
		t.Fatalf("FinalizeResolution: %v", err)
	}
	if got, _ := repo.GetMarket(context.Background(), "mkt-1"); got.Status != MarketStatusSettled {
		t.Fatalf("want settled, got %s", got.Status)
	}
}

// TestFinalizeClaimedExactlyOnce covers the codex P1-2 fix: the proposed ->
// finalized claim means a second finalize cannot re-execute payouts.
func TestFinalizeClaimedExactlyOnce(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed
	svc := NewService(repo, &fakeWallet{balances: map[string]int64{}})
	store := newFakeResolutionStore()
	svc.SetResolutionStore(store)

	// System proposal (proposed_by nil) so dual-control doesn't gate the test.
	if _, err := svc.ProposeResolution(context.Background(), "mkt-1", ResolveMarketRequest{
		Result: MarketResultYes, AttestationSource: "system",
	}, nil, time.Hour); err != nil {
		t.Fatalf("ProposeResolution: %v", err)
	}
	store.proposals["mkt-1"].ChallengeEndsAt = time.Now().UTC().Add(-time.Minute)

	if _, _, err := svc.FinalizeResolution(context.Background(), "mkt-1", nil); err != nil {
		t.Fatalf("first FinalizeResolution: %v", err)
	}
	if store.proposals["mkt-1"].Status != "finalized" {
		t.Fatalf("proposal should be finalized, got %s", store.proposals["mkt-1"].Status)
	}
	// A second finalize must not re-settle: the proposal is no longer claimable.
	if _, _, err := svc.FinalizeResolution(context.Background(), "mkt-1", nil); err == nil {
		t.Fatal("second FinalizeResolution must fail (proposal already finalized)")
	}
}

// TestFileDisputeUnderLockBlocksFinalize covers the bucket-5 hardening: a
// dispute filed via the locked FileDispute path transitions the market to
// disputed and blocks finalize even after the window elapses.
func TestFileDisputeUnderLockBlocksFinalize(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed
	svc := NewService(repo, &fakeWallet{balances: map[string]int64{}})
	store := newFakeResolutionStore()
	svc.SetResolutionStore(store)

	if _, err := svc.ProposeResolution(context.Background(), "mkt-1", ResolveMarketRequest{
		Result: MarketResultYes, AttestationSource: "system",
	}, nil, time.Hour); err != nil {
		t.Fatalf("ProposeResolution: %v", err)
	}
	d, err := svc.FileDispute(context.Background(), "mkt-1", "carol", "wrong source")
	if err != nil {
		t.Fatalf("FileDispute: %v", err)
	}
	if d.Status != "open" || d.ID == "" {
		t.Fatalf("dispute should be open with an id, got %+v", d)
	}
	if got, _ := repo.GetMarket(context.Background(), "mkt-1"); got.Status != MarketStatusDisputed {
		t.Fatalf("after FileDispute: want disputed, got %s", got.Status)
	}
	store.proposals["mkt-1"].ChallengeEndsAt = time.Now().UTC().Add(-time.Minute)
	if _, _, err := svc.FinalizeResolution(context.Background(), "mkt-1", nil); err == nil {
		t.Fatal("finalize must be blocked while the filed dispute is open")
	}
}

// TestFileDisputeRejectsNonDisputable covers FileDispute's authoritative
// under-lock status gate: a market not in proposed_resolution/disputed yields
// ErrMarketNotDisputable.
func TestFileDisputeRejectsNonDisputable(t *testing.T) {
	repo := newMemRepo()
	m := seedMarket(t, repo)
	m.Status = MarketStatusClosed // not disputable
	svc := NewService(repo, &fakeWallet{balances: map[string]int64{}})
	svc.SetResolutionStore(newFakeResolutionStore())

	if _, err := svc.FileDispute(context.Background(), "mkt-1", "carol", "x"); !errors.Is(err, ErrMarketNotDisputable) {
		t.Fatalf("want ErrMarketNotDisputable, got %v", err)
	}
}
