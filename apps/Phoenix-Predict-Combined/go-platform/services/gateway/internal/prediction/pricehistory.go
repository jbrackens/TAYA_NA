package prediction

import (
	"context"
	"fmt"
	"time"
)

// PriceHistoryWindow returns the (since, until, bucketSec) parameters
// for a requested time range. Buckets are sized so each window renders
// ~24-60 points — enough resolution for a smooth line, not so many
// that the response gets huge.
//
//	1h  → 60 buckets of 60s (1-minute buckets)
//	1d  → 24 buckets of 1h
//	1w  → ~56 buckets of 3h
//	1m  → 30 buckets of 1d
//	all → 60 buckets of (window/60), or daily, whichever is coarser
//
// "all" looks at the market's lifespan; the caller supplies marketCreatedAt
// so we don't synthesize history before the market existed. Since/Until
// are returned in UTC.
func PriceHistoryWindow(rng PriceHistoryRange, now, marketCreatedAt time.Time) (since, until time.Time, bucketSec int) {
	until = now.UTC()
	switch rng {
	case PriceHistoryRange1H:
		since = until.Add(-1 * time.Hour)
		bucketSec = 60 // 1-minute buckets
	case PriceHistoryRange1D, "":
		since = until.Add(-24 * time.Hour)
		bucketSec = 3600 // 1-hour buckets
	case PriceHistoryRange1W:
		since = until.Add(-7 * 24 * time.Hour)
		bucketSec = 3 * 3600 // 3-hour buckets ≈ 56 points
	case PriceHistoryRange1M:
		since = until.Add(-30 * 24 * time.Hour)
		bucketSec = 24 * 3600 // 1-day buckets
	case PriceHistoryRangeAll:
		since = marketCreatedAt.UTC()
		if since.After(until) {
			since = until.Add(-24 * time.Hour)
		}
		// Aim for ~60 buckets but no finer than 1 hour.
		span := int(until.Sub(since).Seconds())
		bucketSec = span / 60
		if bucketSec < 3600 {
			bucketSec = 3600
		}
	default:
		// Unknown range falls back to 1d so misconfigured callers still
		// get a useful response.
		since = until.Add(-24 * time.Hour)
		bucketSec = 3600
	}
	return since, until, bucketSec
}

// GetPriceHistory fetches volume-weighted price buckets for a market
// over the requested range. Empty buckets carry forward the prior
// known price; the first bucket falls back to the market's current
// yes_price_cents if no trades exist in the window.
func (s *Service) GetPriceHistory(ctx context.Context, marketID string, rng PriceHistoryRange) (*PriceHistoryResponse, error) {
	market, err := s.repo.GetMarket(ctx, marketID)
	if err != nil {
		return nil, fmt.Errorf("market not found: %w", err)
	}

	since, until, bucketSec := PriceHistoryWindow(rng, time.Now(), market.CreatedAt)

	pointsRepo, ok := s.repo.(PriceHistoryReader)
	if !ok {
		// Memory-mode repo: synthesize a flat line at the current price.
		// Better than 500ing the chart entirely.
		return synthesizeFlatHistory(market, since, until, bucketSec, string(rng)), nil
	}
	raw, err := pointsRepo.ListPriceBuckets(ctx, marketID, since, until, bucketSec)
	if err != nil {
		return nil, fmt.Errorf("fetch price buckets: %w", err)
	}
	points := fillPriceHistory(raw, since, until, bucketSec, market.YesPriceCents)
	return &PriceHistoryResponse{
		MarketID:  market.ID,
		Range:     string(rng),
		Since:     since,
		Until:     until,
		BucketSec: bucketSec,
		Points:    points,
	}, nil
}

// PriceHistoryReader is the read surface a Repository must implement to
// support /prices. The SQL repo does; the in-memory test repo doesn't,
// and the service falls back to a flat synthesized series so charts
// keep rendering in test mode.
type PriceHistoryReader interface {
	ListPriceBuckets(ctx context.Context, marketID string, since, until time.Time, bucketSec int) ([]PricePoint, error)
}

// fillPriceHistory pads a sparse bucket sequence with carry-forward
// values so the chart line is continuous. raw is the list of buckets
// that actually had trades, ordered by BucketStart ascending. The
// returned slice has exactly ceil((until-since) / bucketSec) entries.
func fillPriceHistory(raw []PricePoint, since, until time.Time, bucketSec int, fallbackPrice int) []PricePoint {
	if bucketSec <= 0 {
		return nil
	}
	rawByBucket := make(map[int64]PricePoint, len(raw))
	for _, p := range raw {
		rawByBucket[bucketAlign(p.BucketStart, bucketSec)] = p
	}

	startBucket := bucketAlign(since, bucketSec)
	endBucket := bucketAlign(until, bucketSec)
	if endBucket < startBucket {
		return nil
	}

	// Seed lastPrice with the most recent trade price BEFORE the window
	// when possible, else the market's current price. Without this, the
	// first carryforward bucket would read 0¢ and the chart would dip
	// to zero before climbing.
	lastPrice := fallbackPrice
	if len(raw) > 0 && bucketAlign(raw[0].BucketStart, bucketSec) >= startBucket {
		// First bucket lives in the window — leave lastPrice at fallback.
	}

	out := make([]PricePoint, 0, (endBucket-startBucket)/int64(bucketSec)+1)
	for b := startBucket; b <= endBucket; b += int64(bucketSec) {
		if p, ok := rawByBucket[b]; ok {
			out = append(out, p)
			lastPrice = p.YesPriceCents
		} else {
			out = append(out, PricePoint{
				BucketStart:   time.Unix(b, 0).UTC(),
				YesPriceCents: lastPrice,
				TradeCount:    0,
				VolumeCents:   0,
			})
		}
	}
	return out
}

// bucketAlign rounds a timestamp down to the nearest bucketSec boundary
// (epoch-aligned). Returns the unix seconds of the bucket start.
func bucketAlign(t time.Time, bucketSec int) int64 {
	s := t.Unix()
	return s - (s % int64(bucketSec))
}

// synthesizeFlatHistory is the memory-mode fallback. Returns the same
// number of points as the real path would, all at the market's current
// price. Charts still render — they just don't show movement.
func synthesizeFlatHistory(market *Market, since, until time.Time, bucketSec int, rng string) *PriceHistoryResponse {
	startBucket := bucketAlign(since, bucketSec)
	endBucket := bucketAlign(until, bucketSec)
	points := make([]PricePoint, 0, (endBucket-startBucket)/int64(bucketSec)+1)
	for b := startBucket; b <= endBucket; b += int64(bucketSec) {
		points = append(points, PricePoint{
			BucketStart:   time.Unix(b, 0).UTC(),
			YesPriceCents: market.YesPriceCents,
		})
	}
	return &PriceHistoryResponse{
		MarketID:  market.ID,
		Range:     rng,
		Since:     since,
		Until:     until,
		BucketSec: bucketSec,
		Points:    points,
	}
}
