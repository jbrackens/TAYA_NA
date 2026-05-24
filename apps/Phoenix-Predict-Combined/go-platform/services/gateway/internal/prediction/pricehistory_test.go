package prediction

import (
	"testing"
	"time"
)

func TestPriceHistoryWindow(t *testing.T) {
	now := time.Date(2026, 5, 15, 12, 0, 0, 0, time.UTC)
	created := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)

	cases := []struct {
		rng           PriceHistoryRange
		wantSinceDiff time.Duration
		wantBucketSec int
	}{
		{PriceHistoryRange1H, -1 * time.Hour, 60},
		{PriceHistoryRange1D, -24 * time.Hour, 3600},
		{PriceHistoryRange1W, -7 * 24 * time.Hour, 3 * 3600},
		{PriceHistoryRange1M, -30 * 24 * time.Hour, 24 * 3600},
		// Empty string falls back to 1d.
		{"", -24 * time.Hour, 3600},
		// Unknown range also falls back to 1d.
		{"bogus", -24 * time.Hour, 3600},
	}
	for _, c := range cases {
		t.Run(string(c.rng), func(t *testing.T) {
			since, until, sec := PriceHistoryWindow(c.rng, now, created)
			if !until.Equal(now.UTC()) {
				t.Errorf("until = %v, want %v", until, now.UTC())
			}
			want := now.Add(c.wantSinceDiff).UTC()
			if !since.Equal(want) {
				t.Errorf("since = %v, want %v", since, want)
			}
			if sec != c.wantBucketSec {
				t.Errorf("bucketSec = %d, want %d", sec, c.wantBucketSec)
			}
		})
	}
}

func TestPriceHistoryWindow_All(t *testing.T) {
	now := time.Date(2026, 5, 15, 12, 0, 0, 0, time.UTC)
	created := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)

	since, until, sec := PriceHistoryWindow(PriceHistoryRangeAll, now, created)
	if !since.Equal(created.UTC()) {
		t.Errorf("All since = %v, want %v (market creation)", since, created)
	}
	if !until.Equal(now.UTC()) {
		t.Errorf("All until = %v, want now", until)
	}
	// Span is ~44 days; bucket should be at least 1h.
	if sec < 3600 {
		t.Errorf("All bucketSec = %d, want >= 3600", sec)
	}
}

func TestPriceHistoryWindow_AllFutureCreatedDate(t *testing.T) {
	// Pathological: market created in the future relative to now. Falls
	// back to a 24h window so the response is at least sensible.
	now := time.Date(2026, 5, 15, 12, 0, 0, 0, time.UTC)
	created := now.Add(48 * time.Hour)

	since, until, sec := PriceHistoryWindow(PriceHistoryRangeAll, now, created)
	want := now.Add(-24 * time.Hour).UTC()
	if !since.Equal(want) {
		t.Errorf("future-created since = %v, want %v", since, want)
	}
	if !until.Equal(now.UTC()) {
		t.Errorf("future-created until = %v, want %v", until, now)
	}
	if sec < 3600 {
		t.Errorf("future-created bucketSec = %d, want >= 3600", sec)
	}
}

func TestFillPriceHistoryCarryForward(t *testing.T) {
	// Window: 6 hours, bucket = 1 hour → 7 buckets (6 boundaries + the
	// closing boundary at exactly `until`).
	since := time.Date(2026, 5, 15, 0, 0, 0, 0, time.UTC)
	until := time.Date(2026, 5, 15, 6, 0, 0, 0, time.UTC)
	bucketSec := 3600

	// Trades land in bucket 2 (price 60) and bucket 4 (price 70).
	// Expected fill pattern: fallback, fallback, 60, 60, 70, 70, 70
	raw := []PricePoint{
		{BucketStart: since.Add(2 * time.Hour), YesPriceCents: 60, TradeCount: 1},
		{BucketStart: since.Add(4 * time.Hour), YesPriceCents: 70, TradeCount: 1},
	}
	got := fillPriceHistory(raw, since, until, bucketSec, 50)

	if len(got) != 7 {
		t.Fatalf("len(points) = %d, want 7", len(got))
	}
	want := []int{50, 50, 60, 60, 70, 70, 70}
	for i, w := range want {
		if got[i].YesPriceCents != w {
			t.Errorf("bucket %d price = %d, want %d", i, got[i].YesPriceCents, w)
		}
	}
}

func TestFillPriceHistoryEmptyRaw(t *testing.T) {
	since := time.Date(2026, 5, 15, 0, 0, 0, 0, time.UTC)
	until := time.Date(2026, 5, 15, 3, 0, 0, 0, time.UTC)
	bucketSec := 3600

	got := fillPriceHistory(nil, since, until, bucketSec, 42)
	if len(got) != 4 {
		t.Fatalf("len = %d, want 4 (3 hours + closing bucket)", len(got))
	}
	for i, p := range got {
		if p.YesPriceCents != 42 {
			t.Errorf("bucket %d = %d, want 42 (fallback)", i, p.YesPriceCents)
		}
		if p.TradeCount != 0 {
			t.Errorf("bucket %d trade_count = %d, want 0", i, p.TradeCount)
		}
	}
}

func TestMergePriceBucketsTradesOverrideImported(t *testing.T) {
	since := time.Date(2026, 5, 15, 0, 0, 0, 0, time.UTC)
	bucketSec := 3600
	imported := []PricePoint{
		{BucketStart: since, YesPriceCents: 40},
		{BucketStart: since.Add(time.Hour), YesPriceCents: 45},
	}
	trades := []PricePoint{
		{BucketStart: since.Add(time.Hour), YesPriceCents: 60, TradeCount: 2},
	}

	got := mergePriceBuckets(imported, trades, bucketSec)
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2", len(got))
	}
	if got[0].YesPriceCents != 40 {
		t.Errorf("first bucket = %d, want imported 40", got[0].YesPriceCents)
	}
	if got[1].YesPriceCents != 60 {
		t.Errorf("second bucket = %d, want trade override 60", got[1].YesPriceCents)
	}
	if got[1].TradeCount != 2 {
		t.Errorf("second bucket trade_count = %d, want 2", got[1].TradeCount)
	}
}

func TestPricePointsHaveMovement(t *testing.T) {
	if pricePointsHaveMovement(nil) {
		t.Fatal("nil points should not have movement")
	}
	if pricePointsHaveMovement([]PricePoint{{YesPriceCents: 50}, {YesPriceCents: 50}}) {
		t.Fatal("flat points should not have movement")
	}
	if !pricePointsHaveMovement([]PricePoint{{YesPriceCents: 50}, {YesPriceCents: 51}}) {
		t.Fatal("changed points should have movement")
	}
}

func TestBucketAlignAlignsOnHour(t *testing.T) {
	t1 := time.Date(2026, 5, 15, 12, 37, 41, 0, time.UTC)
	got := bucketAlign(t1, 3600)
	want := time.Date(2026, 5, 15, 12, 0, 0, 0, time.UTC).Unix()
	if got != want {
		t.Errorf("bucketAlign(12:37) = %d, want %d (12:00)", got, want)
	}
}
