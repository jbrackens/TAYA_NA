package prediction

import (
	"context"
	"time"

	"github.com/lib/pq"
)

// Prediction-native operator risk snapshot (replaces the sportsbook-shaped
// /risk-management subtree). Everything here is a read-only aggregate over the
// prediction tables — no mocks. Three operator concerns:
//
//   1. Settlement aging   — closed markets still awaiting settlement (money
//                           owed to winners is stuck until an operator settles).
//   2. Cost-basis         — where open exposure / max payout liability
//      concentration       concentrates, so a single market resolving wrong
//                           can't surprise the book.
//   3. Money invariants   — platform-wide outstanding cost basis, worst-case
//                           settlement liability, reserved (held) cash on
//                           resting orders, and live collateral-drift alerts.
//
// Mounted admin-only at GET /api/v1/admin/prediction/risk.

// nonTerminalMarketStatuses are the market states that still carry live
// financial exposure (positions can still pay out / refund).
var nonTerminalMarketStatuses = []string{"open", "halted", "closed", "proposed_resolution", "disputed"}

// RiskSnapshot is the full operator risk view.
type RiskSnapshot struct {
	GeneratedAt     string           `json:"generatedAt"`
	SettlementAging SettlementAging  `json:"settlementAging"`
	Concentration   []MarketExposure `json:"costBasisConcentration"`
	MoneyInvariants MoneyInvariants  `json:"moneyInvariants"`
}

// SettlementAging summarizes markets that have closed but are not yet settled.
type SettlementAging struct {
	ClosedAwaitingSettlement int           `json:"closedAwaitingSettlement"`
	OldestAgeSeconds         int64         `json:"oldestAgeSeconds"`
	Items                    []AgingMarket `json:"items"`
}

// AgingMarket is one closed-but-unsettled market, oldest first.
type AgingMarket struct {
	MarketID   string `json:"marketId"`
	Ticker     string `json:"ticker"`
	ClosedAt   string `json:"closedAt"`
	AgeSeconds int64  `json:"ageSeconds"`
}

// MarketExposure is one market's open exposure for the concentration table.
type MarketExposure struct {
	MarketID                string `json:"marketId"`
	Ticker                  string `json:"ticker"`
	Status                  string `json:"status"`
	OpenCostCents           int64  `json:"openCostCents"`
	MaxPayoutLiabilityCents int64  `json:"maxPayoutLiabilityCents"`
	Holders                 int    `json:"holders"`
}

// MoneyInvariants are the platform-wide solvency-relevant aggregates.
type MoneyInvariants struct {
	OpenPositionCostCents       int64 `json:"openPositionCostCents"`
	MaxSettlementLiabilityCents int64 `json:"maxSettlementLiabilityCents"`
	ReservedCashCents           int64 `json:"reservedCashCents"`
	OpenOrderCount              int   `json:"openOrderCount"`
	NonTerminalMarkets          int   `json:"nonTerminalMarkets"`
	DriftAlerts24h              int   `json:"driftAlerts24h"`
}

const riskConcentrationLimit = 20

// RiskSnapshot computes the operator risk view from current DB state.
func (r *SQLRepository) RiskSnapshot(ctx context.Context) (*RiskSnapshot, error) {
	snap := &RiskSnapshot{
		GeneratedAt:   time.Now().UTC().Format("2006-01-02T15:04:05Z07:00"),
		Concentration: []MarketExposure{},
	}

	// 1. Settlement aging — count + oldest, then the oldest N for the table.
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(MAX(EXTRACT(EPOCH FROM (now() - close_at))::bigint), 0)
		FROM prediction_markets WHERE status = 'closed'`,
	).Scan(&snap.SettlementAging.ClosedAwaitingSettlement, &snap.SettlementAging.OldestAgeSeconds); err != nil {
		return nil, err
	}
	snap.SettlementAging.Items = []AgingMarket{}
	agingRows, err := r.db.QueryContext(ctx, `
		SELECT id, ticker, close_at, EXTRACT(EPOCH FROM (now() - close_at))::bigint
		FROM prediction_markets WHERE status = 'closed'
		ORDER BY close_at ASC LIMIT 20`)
	if err != nil {
		return nil, err
	}
	defer agingRows.Close()
	for agingRows.Next() {
		var a AgingMarket
		var closedAt time.Time
		if err := agingRows.Scan(&a.MarketID, &a.Ticker, &closedAt, &a.AgeSeconds); err != nil {
			return nil, err
		}
		a.ClosedAt = closedAt.UTC().Format("2006-01-02T15:04:05Z07:00")
		snap.SettlementAging.Items = append(snap.SettlementAging.Items, a)
	}
	if err := agingRows.Err(); err != nil {
		return nil, err
	}

	// 2. Cost-basis concentration — top markets by open position cost.
	concRows, err := r.db.QueryContext(ctx, `
		SELECT m.id, m.ticker, m.status,
		       COALESCE(SUM(p.total_cost_cents), 0) AS open_cost,
		       COALESCE(SUM(CASE WHEN p.side = 'yes' THEN p.quantity ELSE 0 END), 0) AS yes_qty,
		       COALESCE(SUM(CASE WHEN p.side = 'no'  THEN p.quantity ELSE 0 END), 0) AS no_qty,
		       COUNT(DISTINCT p.user_id) AS holders
		FROM prediction_markets m
		JOIN prediction_positions p ON p.market_id = m.id AND p.quantity > 0
		WHERE m.status = ANY($1)
		GROUP BY m.id, m.ticker, m.status
		ORDER BY open_cost DESC
		LIMIT $2`, pq.Array(nonTerminalMarketStatuses), riskConcentrationLimit)
	if err != nil {
		return nil, err
	}
	defer concRows.Close()
	for concRows.Next() {
		var m MarketExposure
		var yesQty, noQty int64
		if err := concRows.Scan(&m.MarketID, &m.Ticker, &m.Status, &m.OpenCostCents, &yesQty, &noQty, &m.Holders); err != nil {
			return nil, err
		}
		win := yesQty
		if noQty > win {
			win = noQty
		}
		m.MaxPayoutLiabilityCents = win * 100
		snap.Concentration = append(snap.Concentration, m)
	}
	if err := concRows.Err(); err != nil {
		return nil, err
	}

	// 3a. Open position cost basis across non-terminal markets.
	if err := r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(p.total_cost_cents), 0)
		FROM prediction_positions p
		JOIN prediction_markets m ON m.id = p.market_id
		WHERE p.quantity > 0 AND m.status = ANY($1)`,
		pq.Array(nonTerminalMarketStatuses),
	).Scan(&snap.MoneyInvariants.OpenPositionCostCents); err != nil {
		return nil, err
	}

	// 3b. Worst-case settlement liability: per market, the winning side's
	// contracts pay 100c each; platform exposure is the sum of each market's
	// larger side.
	if err := r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(GREATEST(yes_qty, no_qty) * 100), 0) FROM (
			SELECT m.id,
			       SUM(CASE WHEN p.side = 'yes' THEN p.quantity ELSE 0 END) AS yes_qty,
			       SUM(CASE WHEN p.side = 'no'  THEN p.quantity ELSE 0 END) AS no_qty
			FROM prediction_markets m
			JOIN prediction_positions p ON p.market_id = m.id AND p.quantity > 0
			WHERE m.status = ANY($1)
			GROUP BY m.id
		) t`, pq.Array(nonTerminalMarketStatuses),
	).Scan(&snap.MoneyInvariants.MaxSettlementLiabilityCents); err != nil {
		return nil, err
	}

	// 3c. Reserved (held, uncaptured) cash on resting orders.
	if err := r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(reserved_cash_cents - captured_cash_cents), 0), COUNT(*)
		FROM prediction_orders WHERE status IN ('open', 'partial')`,
	).Scan(&snap.MoneyInvariants.ReservedCashCents, &snap.MoneyInvariants.OpenOrderCount); err != nil {
		return nil, err
	}

	// 3d. Count of non-terminal markets.
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM prediction_markets WHERE status = ANY($1)`,
		pq.Array(nonTerminalMarketStatuses),
	).Scan(&snap.MoneyInvariants.NonTerminalMarkets); err != nil {
		return nil, err
	}

	// 3e. Live collateral-drift alerts (reuse the exchange repo's existing
	// reader so the risk view and the /drift-alerts endpoint agree).
	if alerts, derr := r.ListRecentDriftAlerts(ctx, time.Now().UTC().Add(-24*time.Hour)); derr == nil {
		snap.MoneyInvariants.DriftAlerts24h = len(alerts)
	}

	return snap, nil
}
