package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDefaultFixtureReconcilesPointNativeLedger(t *testing.T) {
	cases, err := loadCases(filepath.Join("..", "..", defaultFixturePath))
	if err != nil {
		t.Fatalf("load default fixture: %v", err)
	}
	if len(cases) == 0 {
		t.Fatal("expected fixture cases")
	}
	for _, tc := range cases {
		result := runCase(tc)
		if !result.Passed {
			t.Fatalf("case %s failed: %+v actual=%+v expected=%+v", tc.Name, result.FailNotes, result.Actual, result.Expected)
		}
	}
}

func TestFixtureRejectsRetiredMoneyAndBetFields(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "retired.json")
	body := `{"cases":[{"name":"bad","userId":"u-1","marketId":"m-1","stakeCents":100,"ledger":[]}]}`
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	_, err := loadCases(path)
	if err == nil {
		t.Fatal("expected retired stakeCents field to be rejected")
	}
	if !strings.Contains(err.Error(), "stakeCents") {
		t.Fatalf("expected stakeCents error, got %v", err)
	}
}

func TestReportUsesPointNativeVocabulary(t *testing.T) {
	cases, err := loadCases(filepath.Join("..", "..", defaultFixturePath))
	if err != nil {
		t.Fatalf("load default fixture: %v", err)
	}
	results := make([]caseResult, 0, len(cases))
	for _, tc := range cases {
		results = append(results, runCase(tc))
	}
	report := renderMarkdownReport(defaultFixturePath, results)
	if !strings.Contains(report, "Prediction Point Reconciliation Report") {
		t.Fatalf("expected point reconciliation title, got %s", report)
	}
	for _, retired := range []string{"amountCents", "stakeCents", "betId", "deposit", "withdraw", "cashier", "crypto", "USD", "$"} {
		if strings.Contains(report, retired) {
			t.Fatalf("report must not include retired money vocabulary %q: %s", retired, report)
		}
	}
}

func TestReconciliationFixtureFollowsLaunchGatewayContracts(t *testing.T) {
	openapi := readGatewayFile(t, "api/openapi.yaml")
	predictionHandlers := readGatewayFile(t, "internal/http/prediction_handlers.go")
	walletHandlers := readGatewayFile(t, "internal/http/wallet_handlers.go")
	fixture := readGatewayFile(t, defaultFixturePath)

	for _, needle := range []string{
		"PlaceOrderRequest",
		"pricePointsCents",
		"notionalCapPointsCents",
		"amountPointsCents",
		"pointDisbursements",
		"settlementPointsCents",
		"totalSettlementPointsCents",
	} {
		if !strings.Contains(openapi, needle) {
			t.Fatalf("launch OpenAPI must expose %s for point reconciliation proof", needle)
		}
	}

	for _, needle := range []string{
		`json:"pointDisbursements"`,
		`json:"totalSettlementPointsCents"`,
		`json:"settlementPointsCents"`,
		`"pricePointsCents"`,
		`"notionalCapPointsCents"`,
	} {
		if !strings.Contains(predictionHandlers, needle) {
			t.Fatalf("prediction handlers must expose %s for point reconciliation proof", needle)
		}
	}

	for _, needle := range []string{
		`json:"amountPointsCents"`,
		`"amountPointsCents":  entry.AmountCents`,
		`"prediction_order"`,
	} {
		if !strings.Contains(walletHandlers, needle) {
			t.Fatalf("wallet handlers must expose %s for point reconciliation proof", needle)
		}
	}

	for _, needle := range []string{
		`"amountPointsCents"`,
		`"prediction_order"`,
		`"prediction_settlement"`,
		`"unit": "PTS"`,
	} {
		if !strings.Contains(fixture, needle) {
			t.Fatalf("reconciliation fixture must use launch gateway field/source %s", needle)
		}
	}
}

func readGatewayFile(t *testing.T, rel string) string {
	t.Helper()
	body, err := os.ReadFile(filepath.Join("..", "..", rel))
	if err != nil {
		t.Fatalf("read %s: %v", rel, err)
	}
	return string(body)
}
