// Package discover ports prediction_markets.py — fetches active markets from
// three free public APIs, normalizes them into one shape, dedupes by fuzzy
// title similarity, and persists them under our own UUIDs and image paths.
//
// Source identity (Polymarket / Kalshi / Manifold) stays inside this package.
// Nothing user-visible — DB columns, API responses, image paths, log lines
// reachable by clients — should mention an upstream by name. Server-side logs
// (stderr, slog) are fine; client-reachable strings are not.
package discover

import "time"

// Market is the in-memory unified shape produced by the fetchers and consumed
// by dedupe + persistence. Source and ExternalID are used to compute the
// stable hash and pick a winner during dedupe; they are never written to disk
// or returned over the wire.
type Market struct {
	Source      string // "polymarket" | "kalshi" | "manifold"
	ExternalID  string
	Title       string
	Description string
	ImageURL    string // upstream URL — used at ingest only, never persisted
	EndTime     *time.Time
	Volume      float64
	Liquidity   float64
	Outcomes    []string
	Prices      []float64
	Category    string // upstream-provided when available; classifier fills otherwise
	Resolution  *Resolution
}

// Resolution represents an upstream market that has resolved YES or NO.
// Set on rows where the upstream signaled `closed/settled/isResolved`.
// nil = market is still open upstream.
type Resolution struct {
	Outcome    string // "yes" | "no" | "ambiguous" — ambiguous routes to manual settlement
	ResolvedAt time.Time
}
