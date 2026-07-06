package http

import (
	"encoding/csv"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"taptrade/gateway/internal/prediction"
)

func TestWriteRiskSnapshotCSVUsesPointAccountingLabels(t *testing.T) {
	snapshot := &prediction.RiskSnapshot{
		GeneratedAt: "2026-06-24T09:30:00Z",
		SettlementAging: prediction.SettlementAging{
			ClosedAwaitingSettlement: 1,
			OldestAgeSeconds:         3600,
			Items: []prediction.AgingMarket{{
				MarketID:   "mkt-risk-1",
				Ticker:     `=HYPERLINK("https://example.invalid","risk")`,
				ClosedAt:   "2026-06-24T08:30:00Z",
				AgeSeconds: 3600,
			}},
		},
		Concentration: []prediction.MarketExposure{{
			MarketID:               "mkt-risk-2",
			Ticker:                 "RISK-YES",
			Status:                 "open",
			OpenPointCostCents:     12345,
			MaxReturnedPointsCents: 50000,
			Holders:                7,
		}},
		PointAccounting: prediction.PointAccountingInvariants{
			OpenPositionPointCostCents: 12345,
			MaxSettlementPointsCents:   50000,
			ReservedPointsCents:        2500,
			OpenOrderCount:             3,
			NonTerminalMarkets:         2,
			DriftAlerts24h:             1,
		},
	}

	res := httptest.NewRecorder()
	if err := writeRiskSnapshotCSV(res, snapshot); err != nil {
		t.Fatalf("write csv: %v", err)
	}
	if ct := res.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/csv") {
		t.Fatalf("expected text/csv content type, got %q", ct)
	}
	if cd := res.Header().Get("Content-Disposition"); !strings.Contains(cd, `filename="prediction-risk-snapshot.csv"`) {
		t.Fatalf("expected risk csv filename, got %q", cd)
	}

	rows, err := csv.NewReader(strings.NewReader(res.Body.String())).ReadAll()
	if err != nil {
		t.Fatalf("read csv: %v", err)
	}
	if len(rows) != 11 {
		t.Fatalf("expected header plus 10 rows, got %d rows: %+v", len(rows), rows)
	}
	if got := rows[0]; got[0] != "section" || got[1] != "metric" || got[2] != "value_points" {
		t.Fatalf("unexpected header: %+v", got)
	}
	if got := rows[1]; got[0] != "point_accounting" || got[1] != "open_position_point_cost" || got[2] != "123.45" {
		t.Fatalf("unexpected point accounting row: %+v", got)
	}
	if got := rows[3]; got[1] != "reserved_points" || got[2] != "25.00" {
		t.Fatalf("unexpected reserved points row: %+v", got)
	}
	if got := rows[8]; got[0] != "settlement_aging_market" || got[5] != `'=HYPERLINK("https://example.invalid","risk")` {
		t.Fatalf("expected formula-safe aging row, got %+v", got)
	}
	if got := rows[9]; got[0] != "point_cost_concentration" || got[1] != "market_open_exposure" || got[2] != "123.45" || got[9] != "7" {
		t.Fatalf("unexpected concentration row: %+v", got)
	}
}

func TestRiskSnapshotPayloadRedactsUnsafeTickersWithoutMutatingSnapshot(t *testing.T) {
	snapshot := &prediction.RiskSnapshot{
		GeneratedAt: "2026-06-24T09:30:00Z",
		SettlementAging: prediction.SettlementAging{
			ClosedAwaitingSettlement: 1,
			Items: []prediction.AgingMarket{{
				MarketID: "mkt-risk-unsafe-aging",
				Ticker:   "BTC cash payout",
			}},
		},
		Concentration: []prediction.MarketExposure{{
			MarketID: "mkt-risk-unsafe-concentration",
			Ticker:   "USDC payout",
			Status:   "open",
		}},
	}

	payload := riskSnapshotPayload(snapshot)
	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal risk payload: %v", err)
	}
	body := string(encoded)
	for _, unsafe := range []string{"BTC cash payout", "USDC payout"} {
		if strings.Contains(body, unsafe) {
			t.Fatalf("risk payload leaked unsafe ticker %q: %s", unsafe, body)
		}
	}
	if !strings.Contains(body, launchRedactedUserText) {
		t.Fatalf("expected redaction marker in risk payload: %s", body)
	}
	if snapshot.SettlementAging.Items[0].Ticker != "BTC cash payout" ||
		snapshot.Concentration[0].Ticker != "USDC payout" {
		t.Fatalf("source risk snapshot was mutated: %+v", snapshot)
	}
}

func TestRiskSnapshotJSONUsesOnlyPointAccountingFields(t *testing.T) {
	pointAccounting := prediction.PointAccountingInvariants{
		OpenPositionPointCostCents: 12345,
		MaxSettlementPointsCents:   50000,
		ReservedPointsCents:        2500,
		OpenOrderCount:             3,
		NonTerminalMarkets:         2,
		DriftAlerts24h:             1,
	}
	snapshot := &prediction.RiskSnapshot{
		GeneratedAt: "2026-06-24T09:30:00Z",
		Concentration: []prediction.MarketExposure{{
			MarketID:               "mkt-risk-2",
			Ticker:                 "RISK-YES",
			Status:                 "open",
			OpenPointCostCents:     12345,
			MaxReturnedPointsCents: 50000,
			Holders:                7,
		}},
		PointAccounting: pointAccounting,
	}

	payload, err := json.Marshal(snapshot)
	if err != nil {
		t.Fatalf("marshal risk snapshot: %v", err)
	}
	body := string(payload)
	for _, token := range []string{
		`"pointAccounting"`,
		`"openPositionPointCostCents":12345`,
		`"maxSettlementPointsCents":50000`,
		`"reservedPointsCents":2500`,
		`"openPointCostCents":12345`,
		`"maxReturnedPointsCents":50000`,
	} {
		if !strings.Contains(body, token) {
			t.Fatalf("expected JSON payload to contain %s, got %s", token, body)
		}
	}
	for _, token := range []string{
		`"openCostCents"`,
		`"maxPayoutLiabilityCents"`,
		`"moneyInvariants"`,
		`"openPositionCostCents"`,
		`"maxSettlementLiabilityCents"`,
		`"reservedCashCents"`,
	} {
		if strings.Contains(body, token) {
			t.Fatalf("expected JSON payload to omit retired risk alias %s, got %s", token, body)
		}
	}
}
