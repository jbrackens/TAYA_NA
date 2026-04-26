package discover

import (
	"fmt"
	"net/url"
	"strings"
	"time"
)

// FetchKalshi pulls open AND settled markets from the Kalshi public read
// endpoint. Filters out the auto-generated multivariate-event (MVE) parlays
// that dominate the raw list.
//
// Field-name potholes worth flagging (re-derivation from upstream docs gets
// these wrong):
//   - prices live in `yes_bid_dollars` / `no_bid_dollars` as strings already
//     in 0..1 (e.g. "0.4500") — NOT cents, no /100 needed
//   - volume lives in `volume_fp` (with `volume_24h_fp` as fallback)
//   - liquidity lives in `liquidity_dollars`
//   - description fallback chain: rules_primary → yes_sub_title → no_sub_title
//   - resolution: `status == "settled"` + `result` ("yes" | "no" | "")
//
// MVE filter: skip rows where mve_selected_legs is set OR event_ticker
// starts with "KXMVE".
func FetchKalshi(limit int) ([]Market, error) {
	out := []Market{}
	pages := 0

	// Split the budget between open and settled so resolved markets aren't
	// starved when the open list is large enough to fill `limit` on its own.
	// Roughly 60% open / 40% settled — open dominates day-to-day, but we
	// still need a steady drip of resolutions to settle prior markets.
	openBudget := (limit * 60) / 100
	if openBudget < 1 {
		openBudget = 1
	}
	settledBudget := limit - openBudget
	if settledBudget < 1 {
		settledBudget = 1
	}
	statusBudgets := map[string]int{
		"open":    openBudget,
		"settled": settledBudget,
	}

	for _, status := range []string{"open", "settled"} {
		cursor := ""
		statusOut := 0
		statusCap := statusBudgets[status]
		for statusOut < statusCap && pages < maxPagePerSource {
			params := url.Values{}
			params.Set("status", status)
			params.Set("limit", "1000")
			if cursor != "" {
				params.Set("cursor", cursor)
			}
			endpoint := "https://api.elections.kalshi.com/trade-api/v2/markets?" + params.Encode()

			var data struct {
				Markets []map[string]any `json:"markets"`
				Cursor  string           `json:"cursor"`
			}
			if err := fetchWithBudget("kalshi", endpoint, &data); err != nil {
				return out, fmt.Errorf("kalshi status=%s cursor=%q: %w", status, cursor, err)
			}
			pages++
			if len(data.Markets) == 0 {
				break
			}
			for _, m := range data.Markets {
				if legs, ok := m["mve_selected_legs"]; ok {
					if legsArr, isArr := legs.([]any); isArr && len(legsArr) > 0 {
						continue
					}
					if _, isObj := legs.(map[string]any); isObj {
						continue
					}
				}
				if strings.HasPrefix(strs(m["event_ticker"]), "KXMVE") {
					continue
				}

				yesP := toFloat(m["yes_bid_dollars"])
				noP := toFloat(m["no_bid_dollars"])
				prices := []float64{}
				if yesP > 0 {
					prices = append(prices, yesP)
				}
				if noP > 0 {
					prices = append(prices, noP)
				}

				sub := strs(m["yes_sub_title"])
				if sub == "" {
					sub = strs(m["no_sub_title"])
				}
				description := strs(m["rules_primary"])
				if description == "" {
					description = sub
				}
				title := strs(m["title"])
				if title == "" {
					title = sub
				}

				volume := toFloat(m["volume_fp"])
				if volume == 0 {
					volume = toFloat(m["volume_24h_fp"])
				}

				market := Market{
					Source:      "kalshi",
					ExternalID:  strs(m["ticker"]),
					Title:       title,
					Description: description,
					ImageURL:    "",
					EndTime:     parseISO(m["close_time"]),
					Volume:      volume,
					Liquidity:   toFloat(m["liquidity_dollars"]),
					Outcomes:    []string{"Yes", "No"},
					Prices:      prices,
					Category:    strs(m["category"]),
				}

				// Resolution: status=="settled" + result field set.
				marketStatus := strs(m["status"])
				if marketStatus == "settled" || marketStatus == "finalized" {
					if result := strings.ToLower(strs(m["result"])); result == "yes" || result == "no" {
						resolvedAt := time.Now().UTC()
						if t := parseISO(m["expiration_time"]); t != nil {
							resolvedAt = *t
						} else if t := parseISO(m["close_time"]); t != nil {
							resolvedAt = *t
						}
						market.Resolution = &Resolution{
							Outcome:    result,
							ResolvedAt: resolvedAt,
						}
					}
				}

				out = append(out, market)
				statusOut++
				if statusOut >= statusCap {
					break
				}
			}
			cursor = data.Cursor
			if cursor == "" {
				break
			}
		}
	}
	return out, nil
}
