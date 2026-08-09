package discover

// Catalog curation: keep imported ad-spam out of the player catalog.
//
// Manifold (user-created markets) ships titles like
// "11kk Bangladesh | Best Online Betting & Live Casino Platform" — a
// gambling-site advertisement wearing a market costume. prohibitedRE only
// screens launch-prohibited crypto topics, so ad spam sailed through and
// surfaced at the top of discovery (observed 2026-08-08; the frontend
// grew an UNSUITABLE_TITLE band-aid in onboarding.ts — this module is the
// source-of-truth fix at the catalog boundary).
//
// The guard is PHRASE-shaped, not word-shaped, because real prediction
// markets legitimately mention gambling as a topic: "Will sports betting
// be legalized in Texas?" and "Will the Mega Millions jackpot exceed $1B?"
// must stay. What no legitimate question contains: ad-title pipes, URLs,
// "best online betting", "casino platform", promo/signup-bonus offers.

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"regexp"
	"strings"

	"taptrade/gateway/internal/prediction"
)

// NOTES on deliberately ABSENT signatures — each one was tried against
// the live catalog and voided something real (voiding is terminal, so a
// false positive destroys a market):
//   - bare pipe: "… Team Visma | Lease a Bike …" is a real cycling team.
//   - URLs (https://, www.): Manifold questions legitimately ask about
//     specific tweets/sites by link — "Will https://x.com/… turn out
//     accurate?" is a market, not an ad. Every observed URL-spam title
//     also matches an ad phrase below, so URLs add only false positives.
var unsuitableImportRE = regexp.MustCompile(`(?i)` + strings.Join([]string{
	`\b(?:best|top|premier|trusted|#1)\s+(?:online\s+)?(?:betting|casino|gambling|slots?|pharmacy)\b`,
	`\b(?:betting|casino|gambling)\s+(?:platform|site|website|app)\b`,
	`\blive\s+casino\b`,
	`\bonline\s+(?:casino|pharmacy)\b`,
	`\bnhà\s+cái\b`, // Vietnamese "bookmaker" — a whole spam family of its own
	`\bpromo\s+code\b`,
	`\bfree\s+spins?\b`,
	`\bno[\s-]?deposit\s+bonus\b`,
	`\bsign[\s-]?up\s+bonus\b`,
	`\bwelcome\s+bonus\b`,
	`\bofficial\s+site\b`,
}, "|"))

// IsUnsuitableImport reports whether an imported market's text reads as an
// advertisement rather than a prediction question.
func IsUnsuitableImport(text string) bool {
	return unsuitableImportRE.MatchString(text)
}

// CurateImportedCatalog voids already-promoted imported markets whose titles
// fail the suitability guard. Runs at the top of every sync cycle — before
// any upstream fetch, so stale spam is cleaned even when every source is
// down. Voiding goes through the Service (FSM + lifecycle audit + refunds),
// which also fires the settlement-notification seam: any holder of a voided
// spam market is told their points came back.
//
// Idempotent: a voided market is terminal and never matches again.
func CurateImportedCatalog(ctx context.Context, db *sql.DB, svc Service) (int, error) {
	if db == nil {
		return 0, nil
	}
	rows, err := db.QueryContext(ctx, `
		SELECT id, ticker, title
		  FROM prediction_markets
		 WHERE ticker LIKE 'IMP-%'
		   AND status NOT IN ('settled', 'voided')`)
	if err != nil {
		return 0, fmt.Errorf("list imported markets: %w", err)
	}
	type candidate struct{ id, ticker, title string }
	var unsuitable []candidate
	for rows.Next() {
		var c candidate
		if err := rows.Scan(&c.id, &c.ticker, &c.title); err != nil {
			rows.Close()
			return 0, fmt.Errorf("scan imported market: %w", err)
		}
		if IsUnsuitableImport(c.title) {
			unsuitable = append(unsuitable, c)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, err
	}

	actor := "catalog-curation"
	voided := 0
	for _, c := range unsuitable {
		if err := svc.TransitionMarketStatus(ctx, c.id, prediction.MarketStatusVoided,
			"curation: unsuitable imported title", &actor); err != nil {
			slog.Warn("curation: void unsuitable market failed",
				"ticker", c.ticker, "error", err)
			continue
		}
		slog.Info("curation: voided unsuitable imported market",
			"ticker", c.ticker, "title", c.title)
		voided++
	}
	return voided, nil
}
