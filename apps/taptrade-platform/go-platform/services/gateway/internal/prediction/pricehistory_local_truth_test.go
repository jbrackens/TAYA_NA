package prediction

// Regression: ISSUE-001 — /prices fabricated a price cliff on imported
// markets that have LOCAL trades. The snapshot-merge gate ("no movement
// in trade buckets") predates the exchange repricing engine; once local
// fills reprice a market, upstream's diverged tail must never blend into
// a window that carries real local trades.
// Found by /qa on 2026-08-10.

import (
	"context"
	"testing"
	"time"
)

type priceHistoryFakeRepo struct {
	*memRepo
	tradeBuckets    []PricePoint
	importedBuckets []PricePoint
	importedCalled  bool
}

func (r *priceHistoryFakeRepo) ListPriceBuckets(_ context.Context, _ string, _, _ time.Time, _ int) ([]PricePoint, error) {
	return r.tradeBuckets, nil
}

func (r *priceHistoryFakeRepo) ListImportedPriceBuckets(_ context.Context, _ string, _, _ time.Time, _ int) ([]PricePoint, error) {
	r.importedCalled = true
	return r.importedBuckets, nil
}

func TestGetPriceHistory_LocalTradesBlockImportedMerge(t *testing.T) {
	repo := &priceHistoryFakeRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.YesPricePoints = 13
	m.NoPricePoints = 87

	now := time.Now().UTC()
	// One flat local trade bucket (a single 13¢ fill) — no "movement",
	// which the old gate treated as license to blend upstream's 1¢ tail.
	repo.tradeBuckets = []PricePoint{
		{BucketStart: now.Add(-2 * time.Hour), YesPricePoints: 13, TradeCount: 1},
	}
	repo.importedBuckets = []PricePoint{
		{BucketStart: now.Add(-20 * time.Hour), YesPricePoints: 1},
		{BucketStart: now.Add(-1 * time.Hour), YesPricePoints: 1},
	}

	svc := NewService(repo, &fakeWallet{balances: map[string]int64{}})
	res, err := svc.GetPriceHistory(context.Background(), "mkt-1", PriceHistoryRange1D)
	if err != nil {
		t.Fatalf("GetPriceHistory: %v", err)
	}
	if repo.importedCalled {
		t.Fatal("imported snapshots must not be consulted when local trade buckets exist in the window")
	}
	for _, p := range res.Points {
		if p.YesPricePoints == 1 {
			t.Fatalf("upstream 1¢ leaked into a locally-traded window: %+v", p)
		}
	}
}

func TestGetPriceHistory_TradedMarketAgedWindowStaysLocal(t *testing.T) {
	// The second face of ISSUE-001: the last local fill ages out of the 1d
	// window (raw empty), and the leading current-price pad + upstream's
	// diverged tail rebuilt the cliff (13,13,…,1,1). A market that has EVER
	// traded locally keeps its own flat-at-current line instead.
	repo := &priceHistoryFakeRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.YesPricePoints = 13
	lastTrade := 13
	m.LastTradePricePoints = &lastTrade

	now := time.Now().UTC()
	repo.tradeBuckets = nil // fills exist, but outside this window
	repo.importedBuckets = []PricePoint{
		{BucketStart: now.Add(-16 * time.Hour), YesPricePoints: 1},
		{BucketStart: now.Add(-1 * time.Hour), YesPricePoints: 1},
	}

	svc := NewService(repo, &fakeWallet{balances: map[string]int64{}})
	res, err := svc.GetPriceHistory(context.Background(), "mkt-1", PriceHistoryRange1D)
	if err != nil {
		t.Fatalf("GetPriceHistory: %v", err)
	}
	if repo.importedCalled {
		t.Fatal("a locally-traded market must never consult upstream snapshots")
	}
	for _, p := range res.Points {
		if p.YesPricePoints != 13 {
			t.Fatalf("expected a flat line at the local price 13, got %+v", p)
		}
	}
}

func TestGetPriceHistory_NoLocalTradesStillUsesImported(t *testing.T) {
	repo := &priceHistoryFakeRepo{memRepo: newMemRepo()}
	m := seedMarket(t, repo.memRepo)
	m.YesPricePoints = 50

	now := time.Now().UTC()
	repo.tradeBuckets = nil
	repo.importedBuckets = []PricePoint{
		{BucketStart: now.Add(-5 * time.Hour), YesPricePoints: 40},
		{BucketStart: now.Add(-1 * time.Hour), YesPricePoints: 44},
	}

	svc := NewService(repo, &fakeWallet{balances: map[string]int64{}})
	res, err := svc.GetPriceHistory(context.Background(), "mkt-1", PriceHistoryRange1D)
	if err != nil {
		t.Fatalf("GetPriceHistory: %v", err)
	}
	if !repo.importedCalled {
		t.Fatal("with zero local trades the imported snapshots are still the right signal")
	}
	saw44 := false
	for _, p := range res.Points {
		if p.YesPricePoints == 44 {
			saw44 = true
		}
	}
	if !saw44 {
		t.Fatal("imported snapshot values should render when no local trades exist")
	}
}
