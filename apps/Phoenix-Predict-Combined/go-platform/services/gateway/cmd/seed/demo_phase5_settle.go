package main

import (
	"context"
	"fmt"

	"taptrade/gateway/internal/prediction"
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
	// Demo user bought VAL-MASTERS-FINAL YES → wins.
	{"VAL-MASTERS-FINAL", prediction.MarketResultYes, "demo: Valorant result confirmed"},
	// Demo user bought AVATAR3-200M YES → wins.
	{"AVATAR3-200M", prediction.MarketResultYes, "demo: Avatar 3 cleared $200M"},

	// IMP-* markets — extras that don't appear in Phase 4's u-1 portfolio
	// but are heavily in Phase 2's synthetic-volume universe (33-40
	// orders each from alice/bob/charlie). Settling these is what gets
	// the Phase 2 traders above MinSettled=10 for the Accuracy and
	// Sharpness leaderboards. Without them the boards read "Nobody has
	// qualified" — the morning's populated state was only because of
	// stale leftover settlements that wipe-demo now cleans up correctly.
	//
	// Outcomes split roughly 50/50 so the resulting Accuracy column has
	// believable variance across traders, not a 100%-or-0% blowout.
	{"IMP-BA07C103", prediction.MarketResultYes, "demo: IMP-BA07C103 resolved YES"},
	{"IMP-8F36FDF0", prediction.MarketResultNo, "demo: IMP-8F36FDF0 resolved NO"},
	{"IMP-C018931F", prediction.MarketResultYes, "demo: IMP-C018931F resolved YES"},
	{"IMP-596EDE83", prediction.MarketResultNo, "demo: IMP-596EDE83 resolved NO"},
	{"IMP-379D8671", prediction.MarketResultYes, "demo: IMP-379D8671 resolved YES"},
	{"IMP-6C474A7E", prediction.MarketResultNo, "demo: IMP-6C474A7E resolved NO"},
	{"IMP-35380ECD", prediction.MarketResultYes, "demo: IMP-35380ECD resolved YES"},
	{"IMP-2E46461B", prediction.MarketResultNo, "demo: IMP-2E46461B resolved NO"},
	{"IMP-CE2B8EA0", prediction.MarketResultYes, "demo: IMP-CE2B8EA0 resolved YES"},
	{"IMP-DA701547", prediction.MarketResultNo, "demo: IMP-DA701547 resolved NO"},
	{"IMP-77BDFBFB", prediction.MarketResultYes, "demo: IMP-77BDFBFB resolved YES"},
	{"IMP-309AB782", prediction.MarketResultNo, "demo: IMP-309AB782 resolved NO"},
	{"IMP-4A0D4DD7", prediction.MarketResultYes, "demo: IMP-4A0D4DD7 resolved YES"},
	{"IMP-4C7B651D", prediction.MarketResultNo, "demo: IMP-4C7B651D resolved NO"},
	{"IMP-14D1C287", prediction.MarketResultYes, "demo: IMP-14D1C287 resolved YES"},
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
		_, settlementCredits, err := h.Service.ResolveMarket(ctx, target.ID, req, &settledBy)
		if err != nil {
			stats.Errors++
			fmt.Printf("    [phase5] %s resolve err: %v\n", target.Ticker, err)
			continue
		}
		fmt.Printf("    [phase5] %-22s -> %s  settlementCredits=%d\n",
			target.Ticker, entry.result, len(settlementCredits))
		stats.MarketsTouched++
		stats.OrdersPlaced += len(settlementCredits)
	}
	return stats, nil
}
