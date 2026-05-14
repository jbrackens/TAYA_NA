package main

import (
	"context"
	"fmt"

	"phoenix-revival/gateway/internal/prediction"
)

// Phase 5 settles a small set of markets so the demo has filled
// History tab + non-empty Leaderboards + Rewards. Each market goes
// open → closed → settled via Service.TransitionMarketStatus and
// Service.ResolveMarket. attestation_source='demo' is the key the
// Phase 0 cleanup uses to find and remove demo settlements on re-run.
//
// Three settlements: 1 YES (demo user wins on a YES bet), 1 NO (demo
// user loses on a YES bet, demo user wins on a NO bet), 1 neutral
// (settles in a direction demo user has no position on, just for
// leaderboard variety). All are markets where Phase 4 placed demo
// user positions; the wallet credits via Service.settlement land
// in u-1's balance.
var phase5Plan = []struct {
	tickerPrefix string
	result       prediction.MarketResult
	reason       string
}{
	// Demo user bought SENATE-DEM-2026 YES in Phase 4 → wins.
	{"SENATE-DEM-2026", prediction.MarketResultYes, "demo: 2026 midterms settled"},
	// Demo user bought GPT5-JUL26 YES in Phase 4 → loses (resolves NO).
	{"GPT5-JUL26", prediction.MarketResultNo, "demo: GPT-5 not released by July"},
	// Demo user has no position on UCL-CITY (bought NO) — wins their NO bet.
	{"UCL-CITY", prediction.MarketResultNo, "demo: City didn't win UCL"},
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
