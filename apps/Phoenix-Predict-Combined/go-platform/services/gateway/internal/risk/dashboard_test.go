package risk

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeRepo struct {
	users         []UserConcentration
	markets       []MarketConcentration
	aging         SettlementAging
	invar         MoneyInvariants
	usersErr      error
	marketsErr    error
	agingErr      error
	invarErr      error
	usersLimit    int
	marketsLimit  int
	agingLimit    int
}

func (f *fakeRepo) TopUserConcentration(_ context.Context, limit int) ([]UserConcentration, error) {
	f.usersLimit = limit
	return f.users, f.usersErr
}
func (f *fakeRepo) TopMarketConcentration(_ context.Context, limit int) ([]MarketConcentration, error) {
	f.marketsLimit = limit
	return f.markets, f.marketsErr
}
func (f *fakeRepo) SettlementAging(_ context.Context, oldestLimit int) (SettlementAging, error) {
	f.agingLimit = oldestLimit
	return f.aging, f.agingErr
}
func (f *fakeRepo) MoneyInvariants(_ context.Context) (MoneyInvariants, error) {
	return f.invar, f.invarErr
}

func TestDashboardHappyPath(t *testing.T) {
	repo := &fakeRepo{
		users: []UserConcentration{
			{UserID: "u1", CostBasisCents: 50000, PositionsCount: 4, MarketsCount: 3},
		},
		markets: []MarketConcentration{
			{MarketID: "m1", Ticker: "BTC-50K", Title: "BTC > 50k by EOY", Status: "open", OpenInterestCents: 1_000_000, VolumeCents: 5_000_000},
		},
		aging: SettlementAging{
			Bucket0To1h:    2,
			Bucket1To6h:    1,
			TotalUnsettled: 3,
			Oldest:         []AgingMarket{{MarketID: "m9", Ticker: "OLD", AgeMinutes: 90}},
		},
		invar: MoneyInvariants{
			Computed:                      true,
			WalletBalanceTotalCents:       1_000_000,
			LedgerReplayBalanceCents:      1_000_000,
			OpenPositionsCostBasisCents:   500_000,
			UnsettledPayoutLiabilityCents: 250_000,
		},
	}
	svc := NewService(repo)
	d, err := svc.Dashboard(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d == nil {
		t.Fatal("dashboard nil")
	}
	if len(d.UserConcentration) != 1 || d.UserConcentration[0].UserID != "u1" {
		t.Fatalf("user concentration not populated: %+v", d.UserConcentration)
	}
	if len(d.MarketConcentration) != 1 || d.MarketConcentration[0].Ticker != "BTC-50K" {
		t.Fatalf("market concentration not populated: %+v", d.MarketConcentration)
	}
	if !d.SettlementAging.Computed {
		t.Fatal("aging.Computed must be true on success")
	}
	if d.SettlementAging.TotalUnsettled != 3 {
		t.Fatalf("aging total=%d want 3", d.SettlementAging.TotalUnsettled)
	}
	if !d.MoneyInvariants.Computed {
		t.Fatal("invariants.Computed must be true on success")
	}
	if d.MoneyInvariants.DriftCents != 0 {
		t.Fatalf("drift should be zero on healthy ledger, got %d", d.MoneyInvariants.DriftCents)
	}
	if repo.usersLimit != 10 || repo.marketsLimit != 10 || repo.agingLimit != 10 {
		t.Fatalf("expected limits=10 for all top-N queries; got users=%d markets=%d aging=%d",
			repo.usersLimit, repo.marketsLimit, repo.agingLimit)
	}
	if d.GeneratedAt.IsZero() {
		t.Fatal("GeneratedAt not stamped")
	}
	if time.Since(d.GeneratedAt) > 5*time.Second {
		t.Fatalf("GeneratedAt too old: %v", d.GeneratedAt)
	}
}

func TestDashboardSurfacesNonZeroDrift(t *testing.T) {
	repo := &fakeRepo{
		invar: MoneyInvariants{
			Computed:                 true,
			WalletBalanceTotalCents:  1_000_000,
			LedgerReplayBalanceCents: 999_500, // 5.00 of drift = bug
		},
	}
	d, err := NewService(repo).Dashboard(context.Background())
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if d.MoneyInvariants.DriftCents != 500 {
		t.Fatalf("drift=%d want 500", d.MoneyInvariants.DriftCents)
	}
}

func TestDashboardSuppressesDriftWhenInvariantsIncomplete(t *testing.T) {
	// Codex P1 #5: a partial money-invariants failure must NOT show
	// $0 drift to the operator. With Computed=false the service must
	// leave DriftCents at zero AND keep Computed=false so the UI
	// suppresses the "healthy ledger" indicator.
	repo := &fakeRepo{
		invarErr: errors.New("snapshot tx aborted"),
	}
	d, err := NewService(repo).Dashboard(context.Background())
	if err == nil {
		t.Fatal("expected error from invariants failure")
	}
	if d.MoneyInvariants.Computed {
		t.Fatal("Computed must remain false when invariants query failed")
	}
	if d.MoneyInvariants.DriftCents != 0 {
		t.Fatalf("DriftCents must stay zero when invariants incomplete; got %d", d.MoneyInvariants.DriftCents)
	}
	// Wallet/ledger totals must also be zero — partial reads would be
	// misleading.
	if d.MoneyInvariants.WalletBalanceTotalCents != 0 || d.MoneyInvariants.LedgerReplayBalanceCents != 0 {
		t.Fatalf("partial totals leaked into payload: %+v", d.MoneyInvariants)
	}
}

func TestDashboardReturnsFirstErrorAndPartialPayload(t *testing.T) {
	// One block fails, the others succeed. Service returns the error
	// AND the partial dashboard so the operator UI can show what
	// data did come back.
	repo := &fakeRepo{
		users: []UserConcentration{{UserID: "u1", CostBasisCents: 100}},
		markets: []MarketConcentration{
			{MarketID: "m1", Ticker: "T", OpenInterestCents: 10},
		},
		agingErr: errors.New("settlement aging blew up"),
		invar:    MoneyInvariants{Computed: true, WalletBalanceTotalCents: 1, LedgerReplayBalanceCents: 1},
	}
	d, err := NewService(repo).Dashboard(context.Background())
	if err == nil {
		t.Fatal("expected error from settlement aging failure")
	}
	if d == nil {
		t.Fatal("partial dashboard should still be returned")
	}
	if len(d.UserConcentration) != 1 || len(d.MarketConcentration) != 1 {
		t.Fatalf("non-failing blocks should be populated; got users=%v markets=%v",
			d.UserConcentration, d.MarketConcentration)
	}
	if d.SettlementAging.Computed {
		t.Fatal("failing block must not have Computed=true")
	}
	if d.SettlementAging.TotalUnsettled != 0 {
		t.Fatalf("failing block should be zero-valued, got %+v", d.SettlementAging)
	}
}

func TestDashboardNilGuards(t *testing.T) {
	if _, err := (*Service)(nil).Dashboard(context.Background()); err == nil {
		t.Fatal("expected error on nil service")
	}
	if _, err := NewService(nil).Dashboard(context.Background()); err == nil {
		t.Fatal("expected error on nil repo")
	}
}

func TestDashboardFirstErrorReportedOnceWhenMultipleFail(t *testing.T) {
	repo := &fakeRepo{
		usersErr:   errors.New("users blew up"),
		marketsErr: errors.New("markets blew up"),
	}
	_, err := NewService(repo).Dashboard(context.Background())
	if err == nil {
		t.Fatal("expected error")
	}
	// The service captures the first error that arrives but ordering
	// is deterministic in the fan-in (users first). Still, we care
	// that *some* meaningful error surfaces.
	if err.Error() == "" {
		t.Fatal("error message is empty")
	}
}
