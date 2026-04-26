package discover

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// FetchPolymarket pulls open AND resolved markets from the Gamma API.
//
// Resolution detection: when a market's `outcomePrices` collapses to
// approximately [1, 0] or [0, 1] (threshold ≥ 0.95) AND `closed=true`, we
// treat it as resolved upstream. Polymarket's UMA-style resolutions
// occasionally leave dust on the loser side, so a strict ==1.0 check would
// miss real resolutions.
//
// Quirks worth flagging (re-derivation from upstream docs gets these wrong):
//   - `outcomes` and `outcomePrices` ship as JSON-encoded *strings*, not
//     arrays — they need a second json.Unmarshal.
//   - We now pull both `active=true` and `active=false` so resolved markets
//     are included.
func FetchPolymarket(limit int) ([]Market, error) {
	const page = 500
	const resolvedThreshold = 0.95

	out := []Market{}
	offset := 0
	pages := 0
	for len(out) < limit && pages < maxPagePerSource {
		// Pull both active AND closed markets so resolved upstreams flow
		// through with their resolution attached. Earlier versions filtered
		// `closed=false` here, which silently dropped every resolved market
		// despite the Resolution-parsing code below assuming we'd see them.
		url := fmt.Sprintf(
			"https://gamma-api.polymarket.com/markets?limit=%d&offset=%d",
			page, offset,
		)
		var data []map[string]any
		if err := fetchWithBudget("polymarket", url, &data); err != nil {
			return out, fmt.Errorf("polymarket page offset=%d: %w", offset, err)
		}
		pages++
		if len(data) == 0 {
			break
		}
		for _, m := range data {
			outcomes, prices := decodePolymarketOutcomes(m)
			image := strs(m["image"])
			if image == "" {
				image = strs(m["icon"])
			}
			endTime := parseISO(m["endDate"])

			market := Market{
				Source:      "polymarket",
				ExternalID:  strs(m["id"]),
				Title:       strs(m["question"]),
				Description: strs(m["description"]),
				ImageURL:    image,
				EndTime:     endTime,
				Volume:      toFloat(m["volume"]),
				Liquidity:   toFloat(m["liquidity"]),
				Outcomes:    outcomes,
				Prices:      prices,
				Category:    strs(m["category"]),
			}

			// Resolution: Polymarket sets `closed=true` and the winning side's
			// price collapses to ≥0.95 once UMA settles.
			if isClosed, _ := m["closed"].(bool); isClosed && len(prices) >= 2 {
				if outcome := pickWinningOutcome(prices, resolvedThreshold); outcome != "" {
					resolvedAt := time.Now().UTC()
					if endTime != nil {
						resolvedAt = *endTime
					}
					market.Resolution = &Resolution{
						Outcome:    outcome,
						ResolvedAt: resolvedAt,
					}
				}
			}

			out = append(out, market)
			if len(out) >= limit {
				break
			}
		}
		if len(data) < page {
			break
		}
		offset += page
	}
	return out, nil
}

func decodePolymarketOutcomes(m map[string]any) ([]string, []float64) {
	outcomesStr := strs(m["outcomes"])
	pricesStr := strs(m["outcomePrices"])
	if outcomesStr == "" {
		outcomesStr = "[]"
	}
	if pricesStr == "" {
		pricesStr = "[]"
	}
	var outcomes []string
	var pricesRaw []string
	if err := json.Unmarshal([]byte(outcomesStr), &outcomes); err != nil {
		return nil, nil
	}
	if err := json.Unmarshal([]byte(pricesStr), &pricesRaw); err != nil {
		var pricesNum []float64
		if err2 := json.Unmarshal([]byte(pricesStr), &pricesNum); err2 != nil {
			return outcomes, nil
		}
		return outcomes, pricesNum
	}
	prices := make([]float64, 0, len(pricesRaw))
	for _, p := range pricesRaw {
		var f float64
		if _, err := fmt.Sscanf(strings.TrimSpace(p), "%f", &f); err == nil {
			prices = append(prices, f)
		}
	}
	return outcomes, prices
}

// pickWinningOutcome returns "yes" if prices[0] ≥ threshold, "no" if
// prices[1] ≥ threshold, "" if neither (still ambiguous, treat as open).
// Assumes outcomes are ordered Yes/No (Polymarket convention).
func pickWinningOutcome(prices []float64, threshold float64) string {
	if len(prices) < 2 {
		return ""
	}
	if prices[0] >= threshold {
		return "yes"
	}
	if prices[1] >= threshold {
		return "no"
	}
	return ""
}

func strs(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
