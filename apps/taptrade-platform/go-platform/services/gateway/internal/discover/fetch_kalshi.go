package discover

import (
	"fmt"
	"net/url"
	"strings"
	"time"
)

// kalshiAPIBase is a package var so tests can point the fetcher at a local
// httptest server. Production value is the public unauthenticated read API.
var kalshiAPIBase = "https://api.elections.kalshi.com/trade-api/v2"

// FetchKalshi pulls open AND settled markets from the Kalshi public read
// API.
//
// It pages /events?with_nested_markets=true, NOT the flat /markets listing.
// Since ~mid-2026 /markets is unusable for discovery: auto-generated
// multivariate-event (MVE) parlays dominate it so completely that the first
// 10+ pages (10,000+ rows, for both status=open and status=settled) contain
// zero standalone markets (verified 2026-07-07). Paging /markets burned the
// whole page budget on parlay pages, filtered every row client-side, and
// returned 0 markets with no error — a silent zero in the market-sync logs
// while Polymarket/Manifold kept importing. The events listing carries no
// MVE parlay collections (0/200 on both open and settled pages, verified
// 2026-07-07), and each event also provides the `category` field that
// market rows stopped carrying.
//
// Field-name potholes worth flagging (re-derivation from upstream docs gets
// these wrong):
//   - prices live in `yes_bid_dollars` / `no_bid_dollars` as strings already
//     in 0..1 (e.g. "0.4500") — NOT cents, no /100 needed
//   - volume lives in `volume_fp` (with `volume_24h_fp` as fallback)
//   - liquidity lives in `liquidity_dollars`
//   - category lives on the EVENT, not the market row
//   - open markets report status "active"; resolved ones "settled"/"finalized"
//   - description fallback chain: rules_primary → yes_sub_title → no_sub_title
//   - resolution: status "settled"/"finalized" + `result` ("yes" | "no" | "")
//   - settled EVENTS can still nest active markets (multi-market events
//     settle per-market) and some nest no markets at all (`markets: null`)
//
// MVE guard stays as belt-and-braces on top of the events pivot: skip events
// and rows whose ticker starts with "KXMVE" or that carry mve_selected_legs.
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
			params.Set("limit", "200") // events endpoint max page size
			params.Set("with_nested_markets", "true")
			if cursor != "" {
				params.Set("cursor", cursor)
			}
			endpoint := kalshiAPIBase + "/events?" + params.Encode()

			var data struct {
				Events []struct {
					EventTicker string           `json:"event_ticker"`
					Title       string           `json:"title"`
					Category    string           `json:"category"`
					Markets     []map[string]any `json:"markets"`
				} `json:"events"`
				Cursor string `json:"cursor"`
			}
			if err := fetchWithBudget("kalshi", endpoint, &data); err != nil {
				return out, fmt.Errorf("kalshi status=%s cursor=%q: %w", status, cursor, err)
			}
			pages++
			if len(data.Events) == 0 {
				break
			}
			for _, ev := range data.Events {
				if strings.HasPrefix(ev.EventTicker, "KXMVE") {
					continue
				}
				// Settled events may nest zero markets (markets: null);
				// ranging a nil slice is a no-op, no guard needed.
				for _, m := range ev.Markets {
					if legs, ok := m["mve_selected_legs"]; ok {
						if legsArr, isArr := legs.([]any); isArr && len(legsArr) > 0 {
							continue
						}
						if _, isObj := legs.(map[string]any); isObj {
							continue
						}
					}
					eventTicker := strs(m["event_ticker"])
					if eventTicker == "" {
						eventTicker = ev.EventTicker
					}
					if strings.HasPrefix(eventTicker, "KXMVE") {
						continue
					}

					marketStatus := strs(m["status"])
					// The settled pass exists to drip resolutions into
					// Promote; settled events still nest active markets,
					// and those rows would eat the resolution budget.
					if status == "settled" && marketStatus != "settled" && marketStatus != "finalized" {
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
					if title == "" {
						title = ev.Title
					}

					volume := toFloat(m["volume_fp"])
					if volume == 0 {
						volume = toFloat(m["volume_24h_fp"])
					}
					ticker := strs(m["ticker"])

					category := strs(m["category"])
					if category == "" {
						category = ev.Category
					}

					market := Market{
						Source:      "kalshi",
						ExternalID:  ticker,
						Title:       title,
						Description: description,
						SourceURL:   fmt.Sprintf("https://kalshi.com/markets/%s/%s", eventTicker, ticker),
						ImageURL:    "",
						EndTime:     parseISO(m["close_time"]),
						UpdatedAt:   firstTime(m["last_updated_ts"], m["updated_time"], m["updated_at"]),
						Volume:      volume,
						Volume24h:   toFloat(m["volume_24h_fp"]),
						Liquidity:   toFloat(m["liquidity_dollars"]),
						Outcomes:    []string{"Yes", "No"},
						Prices:      prices,
						Category:    category,
						Status:      marketStatus,
						RulesText:   strs(m["rules_primary"]),
						EventGroup:  eventTicker,
						Tags:        compactStrings(category, strs(m["market_type"])),
					}

					if market.Resolution == nil && marketExpired(market.EndTime) {
						market.Status = "expired"
					}

					// Resolution: status "settled"/"finalized" + result field set.
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

	// Zero usable rows means upstream drifted again (the 2026-07-07 failure
	// mode was exactly this, silent). Fail loudly so the run lands in
	// FetchErrors and the marketSync status block instead of reporting a
	// healthy sync that imported nothing.
	if len(out) == 0 {
		return out, fmt.Errorf("kalshi: 0 usable markets after %d page(s) — listing schema or content drifted?", pages)
	}
	return out, nil
}
