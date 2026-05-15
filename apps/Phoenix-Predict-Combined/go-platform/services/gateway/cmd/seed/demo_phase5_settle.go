package main

import (
	"context"
	"fmt"

	"phoenix-revival/gateway/internal/prediction"
)

// Phase 5 settles a sample of markets so the demo has filled History +
// non-empty Leaderboards. Each market goes open → closed → settled via
// Service.TransitionMarketStatus and Service.ResolveMarket.
// attestation_source='demo' is the key the Phase 0 cleanup uses to
// find and remove demo settlements (and revert the markets' status
// to 'open') on re-run.
//
// Why ten markets, not three: the Accuracy leaderboard requires
// MinSettled=10 in the last 30 days to qualify any trader. With three
// settlements the board read "Nobody has qualified" during the demo
// walkthrough. Ten gets alice/bob/charlie (each has positions in many
// of the markets Phase 2 generated) above the threshold so the board
// populates. The mix also gives u-1 a 70% accuracy (7W / 3L) — a
// believable demo trader, not a clairvoyant.
var phase5Plan = []struct {
	tickerPrefix string
	result       prediction.MarketResult
	reason       string
}{
	// Demo user bought SENATE-DEM-2026 YES in Phase 4 → wins.
	{"SENATE-DEM-2026", prediction.MarketResultYes, "demo: 2026 midterms settled"},
	// Demo user bought GPT5-JUL26 YES in Phase 4 → loses (resolves NO).
	{"GPT5-JUL26", prediction.MarketResultNo, "demo: GPT-5 not released by July"},
	// Demo user bought UCL-CITY NO → wins their NO bet (City didn't win).
	{"UCL-CITY", prediction.MarketResultNo, "demo: City didn't win UCL"},
	// Demo user bought SENATE-GOP NO → wins (Dems hold).
	{"SENATE-GOP-2026", prediction.MarketResultNo, "demo: GOP fell short in 2026"},
	// Demo user bought HOUSE-DEM YES → wins.
	{"HOUSE-DEM-2026", prediction.MarketResultYes, "demo: Dems won the House"},
	// Demo user bought APPLE-LLM YES → loses (Apple ships late).
	{"APPLE-LLM-2026", prediction.MarketResultNo, "demo: Apple LLM slipped to 2027"},
	// Demo user bought US-RECESSION NO → wins (no recession declared).
	{"US-RECESSION-2026", prediction.MarketResultNo, "demo: no recession in 2026"},
	// Demo user bought UCL-REAL YES → loses (Real didn't win).
	{"UCL-REAL", prediction.MarketResultNo, "demo: Real didn't win UCL"},
	// Demo user bought ETH-5K NO → wins (ETH stayed below).
	{"ETH-5K-MAY26", prediction.MarketResultNo, "demo: ETH stayed under $5K"},
	// Demo user bought AVATAR3-200M YES → wins.
	{"AVATAR3-200M", prediction.MarketResultYes, "demo: Avatar 3 cleared $200M"},
}

// RunPhase5Settle resolves the planned markets. Each market is
// transitioned open → closed → settled in sequence. If a market is
// already settled (re-run after a prior demo seed), this is a no-op
// because the open→closed transition fails and we skip the resolve.
// Wipe mode handles re-runs separately by deleting the settlement
// row before this phase runs.
func RunPhase5Settle(ctx context.Context, h *Harness) (*PhaseStats, error) {
	stats := &PhaseStats{}
	settledBy := "demo-seed"

	statusOpen := prediction.MarketStatusOpen
	markets, _, err := h.Repo.ListMarkets(ctx, prediction.MarketFilter{
		Status:   &statusOpen,
		Page:     1,
		PageSize: 1000,
	})
	if err != nil {
		return stats, fmt.Errorf("list markets: %w", err)
	}

	for _, entry := range phase5Plan {
		var target *prediction.Market
		for i := range markets {
			if startsWith(markets[i].Ticker, entry.tickerPrefix) {
				target = &markets[i]
				break
			}
		}
		if target == nil {
			stats.OrdersSkipped++
			continue
		}

		reason := entry.reason
		if err := h.Service.TransitionMarketStatus(ctx, target.ID, prediction.MarketStatusClosed, reason, &settledBy); err != nil {
			stats.Errors++
			fmt.Printf("    [phase5] %s close err: %v\n", target.Ticker, err)
			continue
		}

		req := prediction.ResolveMarketRequest{
			Result:            entry.result,
			AttestationSource: "demo",
			Reason:            &reason,
		}
		_, payouts, err := h.Service.ResolveMarket(ctx, target.ID, req, &settledBy)
		if err != nil {
			stats.Errors++
			fmt.Printf("    [phase5] %s resolve err: %v\n", target.Ticker, err)
			continue
		}
		fmt.Printf("    [phase5] %-22s -> %s  payouts=%d\n",
			target.Ticker, entry.result, len(payouts))
		stats.MarketsTouched++
		stats.OrdersPlaced += len(payouts)
	}
	return stats, nil
}
