package http

import (
	"encoding/csv"
	"log/slog"
	stdhttp "net/http"
	"strconv"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

// registerPredictionRiskRoutes wires the prediction-native operator risk
// dashboard data source (replaces the sportsbook /risk-management subtree):
//
//	GET /api/v1/admin/prediction/risk            -> RiskSnapshot
//	GET /api/v1/admin/prediction/risk?format=csv -> point-accounting CSV
//
// Admin-only. Read-only aggregates over the prediction tables — settlement
// aging, cost-basis concentration, and platform point-accounting invariants.
// Registered only when the SQL repository is live (the snapshot is DB-backed).
func registerPredictionRiskRoutes(mux *stdhttp.ServeMux, repo *prediction.SQLRepository) {
	mux.Handle("/api/v1/admin/prediction/risk", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		snapshot, err := repo.RiskSnapshot(r.Context())
		if err != nil {
			return httpx.Internal("failed to compute risk snapshot", err)
		}
		snapshot = riskSnapshotPayload(snapshot)
		if r.URL.Query().Get("format") == "csv" {
			return writeRiskSnapshotCSV(w, snapshot)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, snapshot)
	}))
	slog.Info("prediction: admin risk dashboard route registered")
}

func riskSnapshotPayload(snapshot *prediction.RiskSnapshot) *prediction.RiskSnapshot {
	if snapshot == nil {
		return nil
	}
	out := *snapshot
	out.SettlementAging.Items = make([]prediction.AgingMarket, 0, len(snapshot.SettlementAging.Items))
	for _, market := range snapshot.SettlementAging.Items {
		market.Ticker = redactLaunchProhibitedUserText(market.Ticker)
		out.SettlementAging.Items = append(out.SettlementAging.Items, market)
	}
	out.Concentration = make([]prediction.MarketExposure, 0, len(snapshot.Concentration))
	for _, market := range snapshot.Concentration {
		market.Ticker = redactLaunchProhibitedUserText(market.Ticker)
		out.Concentration = append(out.Concentration, market)
	}
	return &out
}

func writeRiskSnapshotCSV(w stdhttp.ResponseWriter, snapshot *prediction.RiskSnapshot) error {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="prediction-risk-snapshot.csv"`)

	writer := csv.NewWriter(w)
	if err := writer.Write([]string{
		"section",
		"metric",
		"value_points",
		"count",
		"market_id",
		"ticker",
		"status",
		"closed_at",
		"age_seconds",
		"holders",
	}); err != nil {
		return httpx.Internal("failed to write risk csv", err)
	}

	write := func(record []string) error {
		if err := writer.Write(record); err != nil {
			return httpx.Internal("failed to write risk csv", err)
		}
		return nil
	}
	if err := write([]string{
		"point_accounting",
		"open_position_point_cost",
		riskPoints(snapshot.PointAccounting.OpenPositionPointCostCents),
		"",
		"",
		"",
		"",
		"",
		"",
		"",
	}); err != nil {
		return err
	}
	if err := write([]string{
		"point_accounting",
		"max_settlement_points",
		riskPoints(snapshot.PointAccounting.MaxSettlementPointsCents),
		"",
		"",
		"",
		"",
		"",
		"",
		"",
	}); err != nil {
		return err
	}
	if err := write([]string{
		"point_accounting",
		"reserved_points",
		riskPoints(snapshot.PointAccounting.ReservedPointsCents),
		"",
		"",
		"",
		"",
		"",
		"",
		"",
	}); err != nil {
		return err
	}
	if err := write([]string{
		"point_accounting",
		"resting_orders",
		"",
		strconv.Itoa(snapshot.PointAccounting.OpenOrderCount),
		"",
		"",
		"",
		"",
		"",
		"",
	}); err != nil {
		return err
	}
	if err := write([]string{
		"point_accounting",
		"non_terminal_markets",
		"",
		strconv.Itoa(snapshot.PointAccounting.NonTerminalMarkets),
		"",
		"",
		"",
		"",
		"",
		"",
	}); err != nil {
		return err
	}
	if err := write([]string{
		"point_accounting",
		"collateral_drift_alerts_24h",
		"",
		strconv.Itoa(snapshot.PointAccounting.DriftAlerts24h),
		"",
		"",
		"",
		"",
		"",
		"",
	}); err != nil {
		return err
	}
	if err := write([]string{
		"settlement_aging",
		"closed_awaiting_settlement",
		"",
		strconv.Itoa(snapshot.SettlementAging.ClosedAwaitingSettlement),
		"",
		"",
		"",
		"",
		strconv.FormatInt(snapshot.SettlementAging.OldestAgeSeconds, 10),
		"",
	}); err != nil {
		return err
	}
	for _, market := range snapshot.SettlementAging.Items {
		if err := write([]string{
			"settlement_aging_market",
			"closed_awaiting_settlement",
			"",
			"",
			csvSafeCell(market.MarketID),
			csvSafeCell(market.Ticker),
			"",
			csvSafeCell(market.ClosedAt),
			strconv.FormatInt(market.AgeSeconds, 10),
			"",
		}); err != nil {
			return err
		}
	}
	for _, market := range snapshot.Concentration {
		if err := write([]string{
			"point_cost_concentration",
			"market_open_exposure",
			riskPoints(market.OpenPointCostCents),
			"",
			csvSafeCell(market.MarketID),
			csvSafeCell(market.Ticker),
			csvSafeCell(market.Status),
			"",
			"",
			strconv.Itoa(market.Holders),
		}); err != nil {
			return err
		}
		if err := write([]string{
			"point_cost_concentration",
			"market_max_returned_points",
			riskPoints(market.MaxReturnedPointsCents),
			"",
			csvSafeCell(market.MarketID),
			csvSafeCell(market.Ticker),
			csvSafeCell(market.Status),
			"",
			"",
			strconv.Itoa(market.Holders),
		}); err != nil {
			return err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return httpx.Internal("failed to flush risk csv", err)
	}
	return nil
}

func riskPoints(cents int64) string {
	return strconv.FormatFloat(float64(cents)/100, 'f', 2, 64)
}
