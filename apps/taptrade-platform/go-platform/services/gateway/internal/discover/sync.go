package discover

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"
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
	FetchedPolymarket   int
	FetchedKalshi       int
	FetchedManifold     int
	BeforeDedupe        int
	AfterDedupe         int
	Created             int
	Updated             int
	ImagesRehosted      int
	ImagesFailed        int
	ImagesDroppedShared int
	MarketImagesAligned int
	RemovedExpired      int
	FetchErrors         []error
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

	// The request budget is per RUN (maxRequestsPerSourcePerRun), not per
	// process. This layer was written for the one-shot sync-markets CLI,
	// where process exit reset it implicitly; the in-process hourly worker
	// (startHourlyMarketSyncWorker) reuses the process-global budget, so
	// without this reset kalshi exhausts its budget at boot and every
	// source is dead within hours — each later run then fails in
	// milliseconds with "budget exhausted" and the catalog silently stops
	// updating (observed on the demo box, 2026-07-07).
	resetBudget()

	res := SyncResult{}
	all := make([]Market, 0, 500)
	enabledSources := 0
	for _, src := range []string{"polymarket", "kalshi", "manifold"} {
		if limits[src] > 0 {
			enabledSources++
		}
	}

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

	// No fresh upstream signal → no mutations. Without this, a run where
	// every enabled fetcher failed (e.g. the 2026-07-07 budget-exhaustion
	// incident) still executed the stale-import janitor and image sweeps
	// against a catalog nothing refreshed — every failed hourly run kept
	// advancing expiry blind, mass-voiding imports over time.
	if enabledSources == 0 {
		return res, nil, nil
	}
	if len(all) == 0 && len(res.FetchErrors) == enabledSources {
		return res, nil, errors.New("all enabled fetchers failed")
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
		if rehoster != nil && m.ImageURL != "" {
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
			ID:                ur.ID,
			ExternalHash:      hash,
			Title:             m.Title,
			Description:       m.Description,
			SourceURL:         m.SourceURL,
			UpstreamStatus:    m.Status,
			UpstreamUpdatedAt: m.UpdatedAt,
			RulesText:         m.RulesText,
			EventGroup:        m.EventGroup,
			Tags:              m.Tags,
			ImagePath:         imagePath,
			EndTime:           m.EndTime,
			Volume:            m.Volume,
			Volume24h:         m.Volume24h,
			Liquidity:         m.Liquidity,
			Outcomes:          m.Outcomes,
			Prices:            m.Prices,
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

	staleHashes, err := repo.StaleImportedHashes(ctx, timeNowUTC())
	if err != nil {
		slog.Warn("discover stale cleanup scan failed", "err", err)
	} else if len(staleHashes) > 0 {
		removed, err := repo.MarkMissing(ctx, staleHashes)
		if err != nil {
			slog.Warn("discover stale cleanup failed", "err", err)
		} else {
			res.RemovedExpired = removed
		}
	}

	// Thumbnail hygiene, in two passes. First drop covers that upstream
	// reuses across unrelated markets (needs the rehost folder to hash file
	// content, so it's skipped when rehosting is disabled). Then align every
	// promoted IMP-* market's image_path with its imported row, which both
	// propagates the drops and corrects historical mismatches.
	if rehoster != nil {
		dropped, err := dropSharedCoverImages(ctx, repo, rehoster)
		if err != nil {
			slog.Warn("discover shared-cover sweep failed", "err", err)
		} else {
			res.ImagesDroppedShared = dropped
		}
	}
	aligned, err := repo.AlignPromotedMarketImages(ctx)
	if err != nil {
		slog.Warn("discover promoted image align failed", "err", err)
	} else {
		res.MarketImagesAligned = aligned
	}

	return res, deduped, nil
}

// dropSharedCoverImages clears thumbnails whose file content is shared by
// imported markets that don't belong to one upstream event. Sources reuse
// series/venue branding this way — one game-cover image stamped on dozens of
// unrelated questions — and a wrong cover is worse than no cover.
func dropSharedCoverImages(ctx context.Context, repo *Repository, rehoster *ImageRehoster) (int, error) {
	rows, err := repo.ListImageRows(ctx)
	if err != nil {
		return 0, err
	}
	ids := sharedCoverImageRowIDs(rows, rehoster.HashHostedImage)
	return repo.ClearImagePaths(ctx, ids)
}

// sharedCoverImageRowIDs is the pure decision core of the shared-cover sweep:
// group rows by image content hash; a hash spanning more than one upstream
// event group is generic branding, not art for any single market, so every
// row carrying it loses the image. Rows sharing one event group keep their
// cover (an event's own image on that event's markets is legitimate); a row
// without an event group counts as its own group. Rows whose file can't be
// hashed are left untouched.
func sharedCoverImageRowIDs(rows []ImportedImageRow, hashOf func(string) (string, bool)) []string {
	type group struct {
		ids       []string
		eventKeys map[string]struct{}
	}
	groups := map[string]*group{}
	for _, row := range rows {
		hash, ok := hashOf(row.ImagePath)
		if !ok {
			continue
		}
		g := groups[hash]
		if g == nil {
			g = &group{eventKeys: map[string]struct{}{}}
			groups[hash] = g
		}
		g.ids = append(g.ids, row.ID)
		eventKey := strings.ToLower(strings.TrimSpace(row.EventGroup))
		if eventKey == "" {
			eventKey = "row:" + row.ID
		}
		g.eventKeys[eventKey] = struct{}{}
	}

	var out []string
	for _, g := range groups {
		if len(g.eventKeys) > 1 {
			out = append(out, g.ids...)
		}
	}
	return out
}

var timeNowUTC = func() time.Time { return time.Now().UTC() }
