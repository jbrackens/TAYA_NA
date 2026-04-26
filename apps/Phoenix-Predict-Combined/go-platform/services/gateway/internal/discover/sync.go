package discover

import (
	"context"
	"errors"
	"log/slog"
	"strings"
)

// upstreamNames are source-venue brand names that must never appear in any
// user-visible field. Some upstream markets are literally *about* the
// venue ("Will Manifold be mentioned in the Zizian docuseries?") or self-tag
// in their title ("WTI Crude Oil (Polymarket)"). Drop those rows at ingest;
// the spec-required eyeball check ("no 'polymarket'/'kalshi'/'manifold' in
// the response body") would otherwise fail on legitimate content leakage.
var upstreamNames = []string{"polymarket", "kalshi", "manifold"}

func mentionsUpstream(s string) bool {
	if s == "" {
		return false
	}
	low := strings.ToLower(s)
	for _, n := range upstreamNames {
		if strings.Contains(low, n) {
			return true
		}
	}
	return false
}

// SyncResult is the per-run summary the runner prints to stderr.
type SyncResult struct {
	FetchedPolymarket int
	FetchedKalshi     int
	FetchedManifold   int
	BeforeDedupe      int
	AfterDedupe       int
	Created           int
	Updated           int
	ImagesRehosted    int
	ImagesFailed      int
	FetchErrors       []error
}

// Sync runs the full pipeline once: fetch all three sources, dedupe by title,
// rehost any Polymarket images, and upsert by external_hash. Returns the
// deduped market list as the third value so the caller can chain into
// `Promote()` without re-fetching.
//
// Logging policy (important): every slog/log line in this package goes to
// the server-side stderr only. The strings "polymarket", "kalshi", and
// "manifold" are allowed there — but never in any field that could surface
// in a user-visible toast, status JSON, or Sentry tag exposed to the
// frontend. Phase 1 has no such surface; phase 2 must enforce this when we
// add error reporting.
func Sync(ctx context.Context, repo *Repository, rehoster *ImageRehoster,
	limits map[string]int) (SyncResult, []Market, error) {

	res := SyncResult{}
	all := make([]Market, 0, 500)

	if l := limits["polymarket"]; l > 0 {
		ms, err := FetchPolymarket(l)
		if err != nil {
			res.FetchErrors = append(res.FetchErrors, err)
			slog.Warn("discover fetch failed", "src", "polymarket", "err", err)
		}
		res.FetchedPolymarket = len(ms)
		all = append(all, ms...)
	}
	if l := limits["kalshi"]; l > 0 {
		ms, err := FetchKalshi(l)
		if err != nil {
			res.FetchErrors = append(res.FetchErrors, err)
			slog.Warn("discover fetch failed", "src", "kalshi", "err", err)
		}
		res.FetchedKalshi = len(ms)
		all = append(all, ms...)
	}
	if l := limits["manifold"]; l > 0 {
		ms, err := FetchManifold(l)
		if err != nil {
			res.FetchErrors = append(res.FetchErrors, err)
			slog.Warn("discover fetch failed", "src", "manifold", "err", err)
		}
		res.FetchedManifold = len(ms)
		all = append(all, ms...)
	}

	// Content filter — drop any market whose title or description names a
	// source venue, before dedupe. See upstreamNames above for rationale.
	filtered := make([]Market, 0, len(all))
	for _, m := range all {
		if mentionsUpstream(m.Title) || mentionsUpstream(m.Description) {
			continue
		}
		filtered = append(filtered, m)
	}
	all = filtered

	res.BeforeDedupe = len(all)
	deduped := Dedupe(all, 0.85)
	res.AfterDedupe = len(deduped)

	for _, m := range deduped {
		hash := HashKey(m.Source, m.ExternalID)
		ur, err := repo.Reserve(ctx, hash)
		if err != nil {
			slog.Warn("discover reserve failed", "src", m.Source, "err", err)
			continue
		}

		var imagePath *string
		if rehoster != nil && m.ImageURL != "" && m.Source == "polymarket" {
			path, err := rehoster.Rehost(ur.ID, m.ImageURL)
			if err != nil {
				res.ImagesFailed++
				slog.Warn("discover image rehost failed", "src", m.Source,
					"row_id", ur.ID, "err", err)
			} else if path != "" {
				imagePath = &path
				res.ImagesRehosted++
			}
		}

		row := Row{
			ID:          ur.ID,
			Title:       m.Title,
			Description: m.Description,
			ImagePath:   imagePath,
			EndTime:     m.EndTime,
			Volume:      m.Volume,
			Outcomes:    m.Outcomes,
			Prices:      m.Prices,
		}
		if err := repo.Update(ctx, ur.ID, row); err != nil {
			slog.Warn("discover update failed", "src", m.Source, "row_id", ur.ID, "err", err)
			continue
		}
		if ur.Created {
			res.Created++
		} else {
			res.Updated++
		}
	}

	if len(res.FetchErrors) == 3 && res.AfterDedupe == 0 {
		return res, deduped, errors.New("all three fetchers failed")
	}
	return res, deduped, nil
}
