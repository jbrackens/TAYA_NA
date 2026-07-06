package discover

import (
	"context"
	"math"
	"strings"
	"testing"
	"time"

	"taptrade/gateway/internal/prediction"
)

func pastTime() time.Time { return time.Now().UTC().Add(-24 * time.Hour) }

// TestInitAMMShares_PriceMatchesLMSR is the most important invariant: the
// share state we initialize must produce the displayed price under the
// LMSR. If this drifts, every promoted market starts with a price the
// trader sees that differs from what executes (P0-2).
func TestInitAMMShares_PriceMatchesLMSR(t *testing.T) {
	amm := &prediction.AMMEngine{}
	const b = 100.0

	cases := []struct {
		name string
		p    float64
	}{
		{"low_long_shot", 0.05},
		{"slight_long_shot", 0.20},
		{"underdog", 0.42},
		{"even", 0.50},
		{"slight_favorite", 0.58},
		{"strong_favorite", 0.80},
		{"near_certain", 0.95},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			yesShares, noShares := initAMMShares(c.p, b)
			gotPrice := amm.PriceYes(yesShares, noShares, b)
			diff := math.Abs(gotPrice - c.p)
			if diff > 0.01 {
				t.Fatalf("p=%.2f: initAMMShares produced shares (yes=%.4f no=%.4f) "+
					"but LMSR returns %.4f (diff %.4f). Trader sees %.0f¢ "+
					"YES, executes at %.0f¢ — exactly the P0-2 mismatch.",
					c.p, yesShares, noShares, gotPrice, diff, c.p*100, gotPrice*100)
			}
		})
	}
}

// TestInitAMMShares_OutOfRangeReturnsZero documents the safety bound.
// p outside (0, 1) means the upstream is broken or we got bad data; default
// to 50/50 rather than NaN/Inf.
func TestInitAMMShares_OutOfRangeReturnsZero(t *testing.T) {
	cases := []float64{-0.1, 0, 1.0, 1.5, math.NaN()}
	for _, p := range cases {
		yes, no := initAMMShares(p, 100)
		if yes != 0 || no != 0 {
			t.Fatalf("p=%v: expected (0,0), got (%v,%v)", p, yes, no)
		}
	}
}

// TestInitAMMShares_OneSidePinnedAtZero documents the construction
// invariant: we always set one side to zero and put the magnitude on the
// other. This keeps the AMM economically equivalent to "the house pre-loaded
// half a position" without making one side go below zero (which the LMSR
// allows mathematically but the column type doesn't).
func TestInitAMMShares_OneSidePinnedAtZero(t *testing.T) {
	for _, p := range []float64{0.05, 0.42, 0.50, 0.58, 0.95} {
		yes, no := initAMMShares(p, 100)
		if yes < 0 || no < 0 {
			t.Fatalf("p=%.2f: negative shares (yes=%v, no=%v); column is non-negative", p, yes, no)
		}
		if yes > 0 && no > 0 {
			t.Fatalf("p=%.2f: both sides non-zero (yes=%v, no=%v); should pin one to zero", p, yes, no)
		}
	}
}

// TestClampPrices covers the cents-conversion contract. The CHECK constraint
// on prediction_markets requires both in [1,99] summing to 100; this helper
// is the only place we satisfy that, so its invariants matter.
func TestClampPrices(t *testing.T) {
	cases := []struct {
		name    string
		input   []float64
		wantYes int
		wantNo  int
		wantSum int
	}{
		{"normal_42", []float64{0.42, 0.58}, 42, 58, 100},
		{"normal_58", []float64{0.58, 0.42}, 58, 42, 100},
		{"floor_clamp", []float64{0.001, 0.999}, 1, 99, 100},
		{"ceil_clamp", []float64{0.999, 0.001}, 99, 1, 100},
		{"empty_defaults_to_50", []float64{}, 50, 50, 100},
		{"single_value", []float64{0.30}, 30, 70, 100},
		{"negative_clamps_floor", []float64{-0.5}, 1, 99, 100},
		{"above_one_clamps_ceil", []float64{1.5}, 99, 1, 100},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			yes, no := clampPrices(c.input)
			if yes != c.wantYes || no != c.wantNo {
				t.Errorf("clampPrices(%v) = (%d,%d), want (%d,%d)", c.input, yes, no, c.wantYes, c.wantNo)
			}
			if yes+no != c.wantSum {
				t.Errorf("clampPrices(%v) sum = %d, want %d (CHECK constraint requires 100)", c.input, yes+no, c.wantSum)
			}
			if yes < 1 || yes > 99 || no < 1 || no > 99 {
				t.Errorf("clampPrices(%v) out of [1,99] range: yes=%d no=%d", c.input, yes, no)
			}
		})
	}
}

// TestGenerateTicker_StableAcrossSyncs is the round-2 idempotency invariant:
// re-running sync against the same upstream market yields the same ticker.
// Earlier we considered deriving the ticker from imported_markets.id (a UUID);
// that would rotate on every re-sync. We use external_hash (SHA-256 of
// source:external_id) which is stable.
func TestGenerateTicker_StableAcrossSyncs(t *testing.T) {
	m := Market{Source: "polymarket", ExternalID: "0x123abc"}
	t1 := generateTicker(m)
	t2 := generateTicker(m)
	if t1 != t2 {
		t.Fatalf("ticker not stable: first=%q second=%q", t1, t2)
	}
	if !strings.HasPrefix(t1, "IMP-") {
		t.Fatalf("ticker missing IMP- prefix: %q", t1)
	}
	if len(t1) != len("IMP-")+8 {
		t.Fatalf("ticker length wrong: got %d want %d", len(t1), len("IMP-")+8)
	}
}

// TestGenerateTicker_DifferentSourcesDifferentTickers covers the dedupe case
// where the same external_id slug exists across upstreams (e.g., Polymarket
// and Kalshi both have a market called "trump-2028"). Each must get a unique
// ticker so neither overwrites the other.
func TestGenerateTicker_DifferentSourcesDifferentTickers(t *testing.T) {
	m1 := Market{Source: "polymarket", ExternalID: "trump-2028"}
	m2 := Market{Source: "kalshi", ExternalID: "trump-2028"}
	t1 := generateTicker(m1)
	t2 := generateTicker(m2)
	if t1 == t2 {
		t.Fatalf("same ticker for different sources: %q", t1)
	}
}

// TestPickCloseAt covers the edge where upstream end_time is in the past
// (resolved markets, mostly) — we need a sensible default to avoid
// CloseAt < CreatedAt invariant violations.
func TestPickCloseAt_PastTimeFallsBack(t *testing.T) {
	past := pastTime()
	got := pickCloseAt(&past)
	if !got.After(past) {
		t.Fatalf("pickCloseAt returned past time %v for past input %v", got, past)
	}
}

func TestShouldRemoveFromPlayer(t *testing.T) {
	past := pastTime()
	future := time.Now().UTC().Add(24 * time.Hour)
	now := time.Date(2026, time.June, 4, 12, 0, 0, 0, time.UTC)

	cases := []struct {
		name string
		m    Market
		want bool
	}{
		{
			name: "open future stays visible",
			m:    Market{Status: "open", EndTime: &future},
			want: false,
		},
		{
			name: "open expired is removed",
			m:    Market{Status: "open", EndTime: &past},
			want: true,
		},
		{
			name: "inactive is removed",
			m:    Market{Status: "inactive", EndTime: &future},
			want: true,
		},
		{
			name: "closed without binary resolution is removed",
			m:    Market{Status: "closed", EndTime: &future},
			want: true,
		},
		{
			name: "ambiguous resolution is removed",
			m:    Market{Status: "closed", Resolution: &Resolution{Outcome: "ambiguous", ResolvedAt: past}},
			want: true,
		},
		{
			name: "binary resolution follows settlement path",
			m:    Market{Status: "closed", Resolution: &Resolution{Outcome: "yes", ResolvedAt: past}},
			want: false,
		},
		{
			name: "past scheduled game date is removed despite future trading close",
			m: Market{
				Status:      "open",
				EndTime:     &future,
				Description: "If Jaylon Tyson records 20+ Points in the New York vs Cleveland professional basketball game originally scheduled for May 25, 2026, then the market resolves to Yes.",
			},
			want: true,
		},
		{
			name: "eliminated NBA outright is removed despite future close",
			m: Market{
				Status:      "open",
				EndTime:     &future,
				Title:       "Will the Detroit Pistons win the 2026 NBA Finals?",
				Description: "This market will resolve to No if it becomes impossible for this team to win the 2026 NBA Finals based off the rules of the NBA.",
			},
			want: true,
		},
		{
			name: "active NBA finalist stays visible",
			m: Market{
				Status:      "open",
				EndTime:     &future,
				Title:       "Will the New York Knicks win the 2026 NBA Finals?",
				Description: "This market will resolve to No if it becomes impossible for this team to win the 2026 NBA Finals based off the rules of the NBA.",
			},
			want: false,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			oldNow := timeNowUTC
			timeNowUTC = func() time.Time { return now }
			t.Cleanup(func() { timeNowUTC = oldNow })
			if got := shouldRemoveFromPlayer(c.m); got != c.want {
				t.Fatalf("shouldRemoveFromPlayer() = %v, want %v", got, c.want)
			}
		})
	}
}

func TestApplyUpstreamStateToExistingVoidsExpiredMarket(t *testing.T) {
	existing := &prediction.Market{
		ID:     "mkt-expired",
		Ticker: "IMP-EXPIRED",
		Status: prediction.MarketStatusOpen,
	}
	svc := &recordingPromoteService{}

	outcome := applyUpstreamStateToExisting(context.Background(), svc, existing, Market{Status: "expired"})

	if outcome != "removed" {
		t.Fatalf("outcome = %q, want removed", outcome)
	}
	if svc.marketID != existing.ID || svc.to != prediction.MarketStatusVoided {
		t.Fatalf("transition = (%q,%q), want (%q,%q)", svc.marketID, svc.to, existing.ID, prediction.MarketStatusVoided)
	}
	if !strings.Contains(svc.reason, "inactive or expired") {
		t.Fatalf("reason = %q, want inactive/expired audit reason", svc.reason)
	}
}

func TestTextHasPastScheduledDate(t *testing.T) {
	now := time.Date(2026, time.June, 4, 12, 0, 0, 0, time.UTC)
	if !textHasPastScheduledDate("game originally scheduled for May 25, 2026", now) {
		t.Fatal("expected May 25, 2026 scheduled date to be stale on June 4, 2026")
	}
	if textHasPastScheduledDate("game scheduled for June 4, 2026", now) {
		t.Fatal("same-day scheduled date should not be considered stale")
	}
	if textHasPastScheduledDate("market closes on May 25, 2026", now) {
		t.Fatal("generic dates without scheduled-for wording should not be matched")
	}
}

func TestOutrightWinnerNoLongerActive(t *testing.T) {
	afterNBAFinalsStart := time.Date(2026, time.June, 4, 12, 0, 0, 0, time.UTC)
	beforeNBAFinalsStart := time.Date(2026, time.June, 1, 12, 0, 0, 0, time.UTC)

	cases := []struct {
		name  string
		title string
		now   time.Time
		want  bool
	}{
		{
			name:  "detroit eliminated after finals start",
			title: "Will the Detroit Pistons win the 2026 NBA Finals?",
			now:   afterNBAFinalsStart,
			want:  true,
		},
		{
			name:  "okc eliminated despite stale high source price",
			title: "Will the Oklahoma City Thunder win the 2026 NBA Finals?",
			now:   afterNBAFinalsStart,
			want:  true,
		},
		{
			name:  "knicks active finalist",
			title: "Will the New York Knicks win the 2026 NBA Finals?",
			now:   afterNBAFinalsStart,
			want:  false,
		},
		{
			name:  "spurs active finalist",
			title: "Will the San Antonio Spurs win the 2026 NBA Finals?",
			now:   afterNBAFinalsStart,
			want:  false,
		},
		{
			name:  "do not remove before finals matchup lock",
			title: "Will the Detroit Pistons win the 2026 NBA Finals?",
			now:   beforeNBAFinalsStart,
			want:  false,
		},
		{
			name:  "colorado eliminated from stanley cup",
			title: "Will the Colorado Avalanche win the 2026 NHL Stanley Cup?",
			now:   afterNBAFinalsStart,
			want:  true,
		},
		{
			name:  "vegas active stanley cup finalist",
			title: "Will the Vegas Golden Knights win the 2026 NHL Stanley Cup?",
			now:   afterNBAFinalsStart,
			want:  false,
		},
		{
			name:  "world cup longshot not in scoped finalist detector",
			title: "Will Ivory Coast win the 2026 FIFA World Cup?",
			now:   afterNBAFinalsStart,
			want:  false,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := outrightWinnerNoLongerActive(c.title, c.now); got != c.want {
				t.Fatalf("outrightWinnerNoLongerActive(%q) = %v, want %v", c.title, got, c.want)
			}
		})
	}
}

type recordingPromoteService struct {
	marketID string
	to       prediction.MarketStatus
	reason   string
}

func (s *recordingPromoteService) CreateMarket(context.Context, prediction.CreateMarketRequest) (*prediction.Market, error) {
	return nil, nil
}

func (s *recordingPromoteService) TransitionMarketStatus(_ context.Context, marketID string, to prediction.MarketStatus, reason string, _ *string) error {
	s.marketID = marketID
	s.to = to
	s.reason = reason
	return nil
}

func (s *recordingPromoteService) ResolveMarket(context.Context, string, prediction.ResolveMarketRequest, *string) (*prediction.Settlement, []prediction.Payout, error) {
	return nil, nil, nil
}
