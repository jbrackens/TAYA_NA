package discover

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/prediction"
)

// Settlement defaults applied to every promoted market.
const (
	defaultAMMLiquidityParam = 100.0
	defaultAMMSubsidyCents   = 10000 // $100/market
	defaultSettlementRule    = "manual_attestation"
	defaultSettlementSource  = "manual"
	farFutureCloseAt         = "2099-12-31T23:59:59Z"
	// settlementCutoffPad is added to a market's close_at to set its
	// settlement_cutoff_at. The AutoSettler worker picks up rows where
	// status='closed' AND settlement_cutoff_at <= NOW(), so this gives the
	// upstream a 1-hour grace window between close and the worker firing.
	settlementCutoffPad = 1 * time.Hour
)

// PromoteResult is the per-run summary for the promotion step.
type PromoteResult struct {
	Created          int            // newly inserted, status=open
	Resolved         int            // newly inserted, status=settled with payouts
	ResolvedExisting int            // existing-ticker rows we transitioned and settled
	Closed           int            // newly inserted, status=closed (ambiguous, awaiting manual)
	Skipped          int            // already exists, no new resolution to apply
	Failed           int            // logged via slog.Warn, sync continues
	ByCategory       map[string]int // category -> count of created+resolved
}

// PredictionRepo is the subset of prediction.Repository we read from. We
// use the Service for any write that needs FSM enforcement, lifecycle audit,
// or the settlement engine.
type PredictionRepo interface {
	GetMarketByTicker(ctx context.Context, ticker string) (*prediction.Market, error)
}

// Service is the subset of prediction.Service we call for writes. Defined
// locally so the package stays decoupled from the full interface.
type Service interface {
	CreateMarket(ctx context.Context, req prediction.CreateMarketRequest) (*prediction.Market, error)
	TransitionMarketStatus(ctx context.Context, marketID string, to prediction.MarketStatus, reason string, actorID *string) error
	ResolveMarket(ctx context.Context, marketID string, req prediction.ResolveMarketRequest, settledBy *string) (*prediction.Settlement, []prediction.Payout, error)
}

// Promote turns a list of fetched-and-deduped markets into first-class AMM
// rows in `prediction_markets`. Idempotent on re-run.
//
// Per-market flow:
//
//	mentionsUpstream(title|desc)? → skip
//	classify → category
//	resolveCategoryID + ensureSyntheticEvent → eventID
//	stable ticker
//	row already exists?
//	  yes + Resolution + still open locally → transition closed → ResolveMarket
//	  yes + no Resolution                   → skip (idempotent)
//	  yes + Resolution + already settled    → skip (idempotent)
//	  no                                    → insert based on Resolution:
//	    open upstream:    Service.CreateMarket → TransitionMarketStatus(open)
//	    resolved YES/NO:  Service.CreateMarket → Transition(open) → Transition(closed) → ResolveMarket
//	    ambiguous:        Service.CreateMarket → Transition(open) → Transition(closed)
//	                      (manual adapter settles via /api/v1/admin/settlements)
//
// Service.CreateMarket creates rows at status='unopened' with default 50/50
// prices. We follow up by writing the AMM share state directly so the LMSR
// price matches the displayed price (P0-2 fix), and by transitioning into
// the correct lifecycle state (P0-3 fix).
func Promote(
	ctx context.Context,
	db *sql.DB,
	repo PredictionRepo,
	svc Service,
	markets []Market,
) (PromoteResult, error) {
	res := PromoteResult{ByCategory: map[string]int{}}

	catIDs, err := resolveCategoryIDs(ctx, db)
	if err != nil {
		return res, fmt.Errorf("resolve categories: %w", err)
	}
	eventIDs, err := ensureSyntheticEvents(ctx, db, catIDs)
	if err != nil {
		return res, fmt.Errorf("ensure synthetic events: %w", err)
	}

	for _, m := range markets {
		if mentionsUpstream(m.Title) || mentionsUpstream(m.Description) {
			res.Skipped++
			continue
		}

		category := Classify(m)
		eventID, ok := eventIDs[category]
		if !ok {
			slog.Warn("promote: unknown category, skipping", "category", category)
			res.Failed++
			continue
		}

		ticker := generateTicker(m)
		existing, _ := repo.GetMarketByTicker(ctx, ticker)
		if existing != nil {
			outcome := applyResolutionToExisting(ctx, svc, existing, m)
			switch outcome {
			case "resolved":
				res.ResolvedExisting++
				res.ByCategory[category]++
			case "skip":
				res.Skipped++
			case "fail":
				res.Failed++
			}
			continue
		}

		// New market: create at unopened, then walk the FSM into the right state.
		yesC, noC := clampPrices(m.Prices)
		closeAt := pickCloseAt(m.EndTime)
		cutoff := closeAt.Add(settlementCutoffPad)

		req := prediction.CreateMarketRequest{
			EventID:             eventID,
			Ticker:              ticker,
			Title:               m.Title,
			Description:         m.Description,
			SettlementSourceKey: defaultSettlementSource,
			SettlementRule:      defaultSettlementRule,
			SettlementParams:    json.RawMessage("{}"),
			CloseAt:             closeAt,
			SettlementCutoffAt:  &cutoff,
			AMMLiquidityParam:   defaultAMMLiquidityParam,
			AMMSubsidyCents:     defaultAMMSubsidyCents,
		}
		mkt, err := svc.CreateMarket(ctx, req)
		if err != nil {
			slog.Warn("promote: create failed", "ticker", ticker, "err", err)
			res.Failed++
			continue
		}

		// Write AMM share state and image_path directly so the LMSR price
		// matches the displayed price. CreateMarket leaves shares at zero
		// (which prices the market at 50/50) and doesn't accept image_path.
		yesShares, noShares := initAMMShares(float64(yesC)/100.0, defaultAMMLiquidityParam)
		if err := writeInitialState(ctx, db, mkt.ID, yesC, noC, yesShares, noShares, imagePathFor(ctx, db, m)); err != nil {
			slog.Warn("promote: write initial state failed", "ticker", ticker, "err", err)
			res.Failed++
			continue
		}

		// Walk the FSM. CreateMarket leaves the row at status=unopened.
		actor := "promote"
		if err := svc.TransitionMarketStatus(ctx, mkt.ID, prediction.MarketStatusOpen, "promote: opened from upstream", &actor); err != nil {
			slog.Warn("promote: transition open failed", "ticker", ticker, "err", err)
			res.Failed++
			continue
		}

		// Branch on resolution.
		if m.Resolution == nil {
			res.Created++
			res.ByCategory[category]++
			continue
		}

		switch m.Resolution.Outcome {
		case "yes", "no":
			if err := svc.TransitionMarketStatus(ctx, mkt.ID, prediction.MarketStatusClosed, "promote: closed for upstream resolution", &actor); err != nil {
				slog.Warn("promote: transition closed failed", "ticker", ticker, "err", err)
				res.Failed++
				continue
			}
			result := prediction.MarketResultYes
			if m.Resolution.Outcome == "no" {
				result = prediction.MarketResultNo
			}
			if _, _, err := svc.ResolveMarket(ctx, mkt.ID, prediction.ResolveMarketRequest{
				Result:            result,
				AttestationSource: "upstream",
				AttestationData:   buildAttestation(m),
			}, &actor); err != nil {
				slog.Warn("promote: resolve failed", "ticker", ticker, "err", err)
				res.Failed++
				continue
			}
			res.Resolved++
			res.ByCategory[category]++

		case "ambiguous":
			// Manifold MKT or CANCEL: don't auto-resolve. Park as closed so
			// the ops queue picks it up via /api/v1/admin/settlements.
			if err := svc.TransitionMarketStatus(ctx, mkt.ID, prediction.MarketStatusClosed, "promote: closed pending manual review", &actor); err != nil {
				slog.Warn("promote: transition closed failed", "ticker", ticker, "err", err)
				res.Failed++
				continue
			}
			res.Closed++
			res.ByCategory[category]++
		}
	}

	return res, nil
}

// applyResolutionToExisting handles the "ticker already exists" branch.
// Returns "resolved" if we transitioned + resolved a previously-open market,
// "skip" if there's nothing to do (already settled, or no new resolution),
// "fail" if a transition or resolve errored.
func applyResolutionToExisting(ctx context.Context, svc Service, existing *prediction.Market, m Market) string {
	if m.Resolution == nil {
		return "skip"
	}
	// Only act on markets that are still in the open lifecycle. Settled,
	// voided, or already closed manually are out of scope here.
	if existing.Status != prediction.MarketStatusOpen {
		return "skip"
	}
	if m.Resolution.Outcome == "ambiguous" {
		// Don't auto-close ambiguous; let the existing market run to its
		// own close_at and let ops handle.
		return "skip"
	}
	actor := "promote-resync"
	if err := svc.TransitionMarketStatus(ctx, existing.ID, prediction.MarketStatusClosed, "re-sync: upstream resolved", &actor); err != nil {
		slog.Warn("applyResolution: transition closed failed", "ticker", existing.Ticker, "err", err)
		return "fail"
	}
	result := prediction.MarketResultYes
	if m.Resolution.Outcome == "no" {
		result = prediction.MarketResultNo
	}
	if _, _, err := svc.ResolveMarket(ctx, existing.ID, prediction.ResolveMarketRequest{
		Result:            result,
		AttestationSource: "upstream",
		AttestationData:   buildAttestation(m),
	}, &actor); err != nil {
		slog.Warn("applyResolution: resolve failed", "ticker", existing.Ticker, "err", err)
		return "fail"
	}
	return "resolved"
}

// initAMMShares returns the AMM share state (yesShares, noShares) such that
// the LMSR cost function returns the target YES probability `p` for liquidity
// parameter `b`. Derived from the LMSR price relation:
//
//	p_yes = e^(qYes/b) / (e^(qYes/b) + e^(qNo/b))
//	⇒ qYes - qNo = b · ln(p / (1-p))
//
// We keep one side at zero and put the magnitude on the other side. This
// gives the AMM a "pre-loaded" position consistent with the displayed price
// without requiring any actual trades. p outside (0, 1) defaults to 50/50.
func initAMMShares(p, b float64) (yesShares, noShares float64) {
	if p <= 0 || p >= 1 || b <= 0 {
		return 0, 0
	}
	if p > 0.5 {
		return b * math.Log(p/(1-p)), 0
	}
	if p < 0.5 {
		return 0, b * math.Log((1-p)/p)
	}
	return 0, 0
}

// writeInitialState writes the post-CreateMarket fields (prices, AMM share
// state, image_path) directly. CreateMarket forces status=unopened and
// 50/50 prices and doesn't accept image_path; we patch that one row before
// transitioning the FSM.
func writeInitialState(ctx context.Context, db *sql.DB, marketID string, yesC, noC int, yesShares, noShares float64, imagePath string) error {
	_, err := db.ExecContext(ctx,
		`UPDATE prediction_markets
		   SET yes_price_cents = $1,
		       no_price_cents  = $2,
		       amm_yes_shares  = $3,
		       amm_no_shares   = $4,
		       image_path      = $5,
		       updated_at      = NOW()
		 WHERE id = $6`,
		yesC, noC, yesShares, noShares, nullStrSafe(imagePath), marketID,
	)
	return err
}

func nullStrSafe(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

// buildAttestation packs upstream metadata into the ResolveMarketRequest's
// AttestationData. Source identity (polymarket/kalshi/manifold) is OK in
// this audit-trail field — it's never user-visible.
func buildAttestation(m Market) json.RawMessage {
	if m.Resolution == nil {
		return json.RawMessage("{}")
	}
	payload := map[string]interface{}{
		"source":      m.Source,
		"external_id": m.ExternalID,
		"resolved_at": m.Resolution.ResolvedAt.UTC().Format(time.RFC3339),
		"outcome":     m.Resolution.Outcome,
	}
	b, err := json.Marshal(payload)
	if err != nil {
		return json.RawMessage("{}")
	}
	return b
}

// generateTicker is the stable dedupe key for promotion. Uses external_hash
// (SHA-256 of source:external_id from phase 1) so re-syncs that rotate
// imported_markets.id (UUIDs) still hit the same ticker.
//
// Format: "IMP-" + first 8 hex chars of external_hash.
func generateTicker(m Market) string {
	hash := HashKey(m.Source, m.ExternalID)
	if len(hash) < 8 {
		return "IMP-" + hash
	}
	return "IMP-" + strings.ToUpper(hash[:8])
}

// clampPrices rounds floats to cents in [1,99] with sum=100. The CHECK
// constraint on prediction_markets enforces this; we satisfy it explicitly.
func clampPrices(prices []float64) (int, int) {
	if len(prices) < 1 {
		return 50, 50
	}
	yes := prices[0]
	if yes < 0.01 {
		yes = 0.01
	}
	if yes > 0.99 {
		yes = 0.99
	}
	yesC := int(yes*100 + 0.5)
	if yesC < 1 {
		yesC = 1
	}
	if yesC > 99 {
		yesC = 99
	}
	return yesC, 100 - yesC
}

// pickCloseAt returns the upstream's end_time when set, else 90 days out.
func pickCloseAt(t *time.Time) time.Time {
	if t != nil && t.After(time.Now().UTC()) {
		return *t
	}
	return time.Now().UTC().Add(90 * 24 * time.Hour)
}

// resolveCategoryIDs queries prediction_categories and returns slug → id.
func resolveCategoryIDs(ctx context.Context, db *sql.DB) (map[string]string, error) {
	rows, err := db.QueryContext(ctx,
		`SELECT slug, id FROM prediction_categories WHERE slug = ANY($1)`,
		"{"+strings.Join(AllCategories, ",")+"}")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var slug, id string
		if err := rows.Scan(&slug, &id); err != nil {
			return nil, err
		}
		out[slug] = id
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	for _, slug := range AllCategories {
		if _, ok := out[slug]; !ok {
			return nil, fmt.Errorf("category %q not found in prediction_categories — run migration 018", slug)
		}
	}
	return out, nil
}

// ensureSyntheticEvents inserts one synthetic event per category (idempotent
// via deterministic UUID + ON CONFLICT DO NOTHING). Returns category-slug → event-id.
//
// Synthetic event names are intentionally neutral ("Politics Markets" etc.)
// so audit logs and admin tools never display source-leak labels.
func ensureSyntheticEvents(ctx context.Context, db *sql.DB, catIDs map[string]string) (map[string]string, error) {
	out := map[string]string{}
	closeAt, _ := time.Parse(time.RFC3339, farFutureCloseAt)
	for slug, catID := range catIDs {
		title := titleCase(slug) + " Markets"
		_, err := db.ExecContext(ctx,
			`INSERT INTO prediction_events
			   (id, title, description, category_id, status, close_at, metadata, is_synthetic)
			 VALUES (md5($1)::uuid, $2, $3, $4, 'open', $5, $6::jsonb, true)
			 ON CONFLICT (id) DO NOTHING`,
			"synthetic-event-"+slug,
			title,
			"",
			catID,
			closeAt,
			`{"synthetic": true}`,
		)
		if err != nil {
			return nil, fmt.Errorf("upsert synthetic event %s: %w", slug, err)
		}
		var eventID string
		err = db.QueryRowContext(ctx,
			`SELECT id FROM prediction_events WHERE id = md5($1)::uuid`,
			"synthetic-event-"+slug,
		).Scan(&eventID)
		if err != nil {
			return nil, fmt.Errorf("read back synthetic event %s: %w", slug, err)
		}
		out[slug] = eventID
	}
	return out, nil
}

// imagePathFor pulls the rehosted image path from imported_markets for the
// matching external_hash. If not found (rehost failed in phase 1), returns "".
func imagePathFor(ctx context.Context, db *sql.DB, m Market) string {
	hash := HashKey(m.Source, m.ExternalID)
	var path sql.NullString
	err := db.QueryRowContext(ctx,
		`SELECT image_path FROM imported_markets WHERE external_hash = $1`,
		hash,
	).Scan(&path)
	if err != nil || !path.Valid {
		return ""
	}
	return path.String
}

func titleCase(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}
