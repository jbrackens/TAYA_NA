package discover

import (
	"fmt"
	"strings"
	"time"
)

// FetchManifold pulls open AND resolved community markets from the v0 list
// endpoint.
//
// Quirks:
//   - `closeTime` is Unix milliseconds, not seconds.
//   - Pagination is `?before=<lastID>`.
//   - Resolution: `isResolved=true` + `resolution` field ("YES"/"NO"/"MKT"/"CANCEL").
//   - "MKT" and "CANCEL" route to manual settlement (Outcome="ambiguous").
func FetchManifold(limit int) ([]Market, error) {
	out := []Market{}
	before := ""
	pages := 0

	for len(out) < limit && pages < maxPagePerSource {
		pageSize := limit - len(out)
		if pageSize > 1000 {
			pageSize = 1000
		}
		endpoint := fmt.Sprintf("https://api.manifold.markets/v0/markets?limit=%d", pageSize)
		if before != "" {
			endpoint += "&before=" + before
		}

		var data []map[string]any
		if err := fetchWithBudget("manifold", endpoint, &data); err != nil {
			return out, fmt.Errorf("manifold before=%q: %w", before, err)
		}
		pages++
		if len(data) == 0 {
			break
		}
		for _, m := range data {
			outcomeType := strs(m["outcomeType"])
			if outcomeType != "BINARY" {
				// Skip non-binary; we only support YES/NO contracts.
				continue
			}
			outcomes := []string{"Yes", "No"}
			prices := []float64{}
			if probAny, ok := m["probability"]; ok {
				prob := toFloat(probAny)
				prices = []float64{prob, 1 - prob}
			}

			market := Market{
				Source:      "manifold",
				ExternalID:  strs(m["id"]),
				Title:       strs(m["question"]),
				Description: strs(m["textDescription"]),
				SourceURL:   strs(m["url"]),
				ImageURL:    strs(m["coverImageUrl"]),
				EndTime:     msToTime(m["closeTime"]),
				UpdatedAt:   msToTime(firstNonNil(m["lastUpdatedTime"], m["lastBetTime"], m["createdTime"])),
				Volume:      toFloat(m["volume"]),
				Volume24h:   toFloat(m["volume24Hours"]),
				Liquidity:   toFloat(m["totalLiquidity"]),
				Outcomes:    outcomes,
				Prices:      prices,
				Category:    "", // not available in list endpoint; classifier fills
				Status:      manifoldStatus(m),
				RulesText:   strs(m["description"]),
				EventGroup:  firstString(m["groupSlug"], m["groupId"]),
				Tags:        stringSlice(m["groupSlugs"]),
			}

			if market.Resolution == nil && marketExpired(market.EndTime) {
				market.Status = "expired"
			}

			// Resolution: isResolved=true + resolution field.
			if resolved, _ := m["isResolved"].(bool); resolved {
				resolvedAt := time.Now().UTC()
				if t := msToTime(m["resolutionTime"]); t != nil {
					resolvedAt = *t
				}
				switch strings.ToLower(strs(m["resolution"])) {
				case "yes":
					market.Resolution = &Resolution{Outcome: "yes", ResolvedAt: resolvedAt}
				case "no":
					market.Resolution = &Resolution{Outcome: "no", ResolvedAt: resolvedAt}
				case "mkt", "cancel":
					// Routes to manual settlement: ops decides the call.
					market.Resolution = &Resolution{Outcome: "ambiguous", ResolvedAt: resolvedAt}
				}
			}

			out = append(out, market)
			if len(out) >= limit {
				break
			}
		}
		if len(data) < 1000 {
			break
		}
		before = strs(data[len(data)-1]["id"])
		if before == "" {
			break
		}
	}
	return out, nil
}
