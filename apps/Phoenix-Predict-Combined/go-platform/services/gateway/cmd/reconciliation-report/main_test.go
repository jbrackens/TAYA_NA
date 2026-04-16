package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadHistoricalBetCases_GeneratesSupportedCasesIncludingResettled(t *testing.T) {
	t.Parallel()

	csv := strings.Join([]string{
		"eventType,betId,punterId,marketId,selectionId,stake,odds,operationTime,paidAmount,unsettledAmount,resettledAmount",
		"OPEN,b1,p1,m:o:m1,s2,1,2.5,2021-02-20T10:11+00:00,,,",
		"SETTLED,b1,p1,m:o:m1,s2,1,2.5,2021-02-20T11:11+00:00,2.5,,",
		"OPEN,b2,p1,m:o:m2,s1,2,3.5,2021-02-20T12:11+00:00,,,",
		"CANCELLED,b2,p1,m:o:m2,s1,2,3.5,2021-02-20T12:11+00:00,,,",
		"OPEN,b3,p1,m:o:m21,s1,3,1.6,2021-02-20T13:11+00:00,,,",
		"SETTLED,b3,p1,m:o:m21,s1,3,1.6,2021-02-20T18:11+00:00,4.8,,",
		"RESETTLED,b3,p1,m:o:m21,s1,3,1.6,2021-02-20T20:11+00:00,,4.8,0.0",
	}, "\n")
	path := writeTempCSV(t, csv)

	gotCases, gotSkipped, err := loadHistoricalBetCases(path, 500000)
	if err != nil {
		t.Fatalf("loadHistoricalBetCases error: %v", err)
	}

	if len(gotCases) != 3 {
		t.Fatalf("expected 3 generated cases, got %d", len(gotCases))
	}
	if len(gotSkipped) != 0 {
		t.Fatalf("expected 0 skipped case, got %d (%v)", len(gotSkipped), gotSkipped)
	}

	byName := map[string]fixtureCase{}
	for _, c := range gotCases {
		byName[c.Name] = c
	}

	winCase, ok := byName["historical_b1"]
	if !ok {
		t.Fatalf("missing historical_b1 case: %#v", byName)
	}
	if winCase.PlacedSelectionID != "home" {
		t.Fatalf("expected normalized placedSelectionId=home, got %q", winCase.PlacedSelectionID)
	}
	if winCase.WinningSelectionID != "home" {
		t.Fatalf("expected winningSelectionId=home, got %q", winCase.WinningSelectionID)
	}
	if winCase.WinningSelectionName != "Home Selection (Historical)" {
		t.Fatalf("expected winningSelectionName for historical winner, got %q", winCase.WinningSelectionName)
	}
	if winCase.ResultSource != "historical_csv" {
		t.Fatalf("expected resultSource=historical_csv, got %q", winCase.ResultSource)
	}
	if winCase.Expected != (summaryValue{
		TotalCreditsCents: 500250,
		TotalDebitsCents:  100,
		NetMovementCents:  500150,
		EntryCount:        3,
		DistinctUserCount: 1,
	}) {
		t.Fatalf("unexpected winner expected summary: %#v", winCase.Expected)
	}

	cancelCase, ok := byName["historical_b2"]
	if !ok {
		t.Fatalf("missing historical_b2 case: %#v", byName)
	}
	if cancelCase.PostLifecycle != "cancel" {
		t.Fatalf("expected cancel lifecycle, got %q", cancelCase.PostLifecycle)
	}
	if cancelCase.Expected != (summaryValue{
		TotalCreditsCents: 500200,
		TotalDebitsCents:  200,
		NetMovementCents:  500000,
		EntryCount:        3,
		DistinctUserCount: 1,
	}) {
		t.Fatalf("unexpected cancel expected summary: %#v", cancelCase.Expected)
	}

	resettledCase, ok := byName["historical_b3"]
	if !ok {
		t.Fatalf("missing historical_b3 case: %#v", byName)
	}
	if resettledCase.PostLifecycle != "resettle" {
		t.Fatalf("expected resettle lifecycle, got %q", resettledCase.PostLifecycle)
	}
	if resettledCase.WinningSelectionName != "Home Selection (Historical)" {
		t.Fatalf("expected resettled winningSelectionName, got %q", resettledCase.WinningSelectionName)
	}
	if resettledCase.ResultSource != "historical_csv" {
		t.Fatalf("expected resettled resultSource=historical_csv, got %q", resettledCase.ResultSource)
	}
	if resettledCase.AdminDebitCents != 480 {
		t.Fatalf("expected adminDebitCents=480, got %d", resettledCase.AdminDebitCents)
	}
	if resettledCase.AdminCreditCents != 0 {
		t.Fatalf("expected adminCreditCents=0, got %d", resettledCase.AdminCreditCents)
	}
	if resettledCase.Expected != (summaryValue{
		TotalCreditsCents: 500480,
		TotalDebitsCents:  780,
		NetMovementCents:  499700,
		EntryCount:        4,
		DistinctUserCount: 1,
	}) {
		t.Fatalf("unexpected resettled expected summary: %#v", resettledCase.Expected)
	}
}

func TestToFixtureCaseFromHistory_MissingOpen(t *testing.T) {
	t.Parallel()

	_, ok, reason := toFixtureCaseFromHistory("b_missing_open", []historicalBetRecord{
		{eventType: "SETTLED", betID: "b_missing_open", paidAmountMajor: 2.0},
	}, 500000)
	if ok {
		t.Fatalf("expected conversion to fail for missing OPEN event")
	}
	if !strings.Contains(reason, "missing OPEN") {
		t.Fatalf("expected missing OPEN reason, got %q", reason)
	}
}

func TestToFixtureCaseFromHistory_ResettledWithoutSettled(t *testing.T) {
	t.Parallel()

	_, ok, reason := toFixtureCaseFromHistory("b_resettled_only", []historicalBetRecord{
		{eventType: "OPEN", betID: "b_resettled_only", punterID: "p1", stakeMajor: 1, odds: 2},
		{eventType: "RESETTLED", betID: "b_resettled_only", unsettledAmountMajor: 2, resettledAmountMajor: 1},
	}, 500000)
	if ok {
		t.Fatalf("expected conversion to fail for RESETTLED without SETTLED")
	}
	if !strings.Contains(reason, "without SETTLED") {
		t.Fatalf("expected RESETTLED/SETTLED reason, got %q", reason)
	}
}

func writeTempCSV(t *testing.T, csv string) string {
	t.Helper()

	dir := t.TempDir()
	path := filepath.Join(dir, "historical.csv")
	if err := os.WriteFile(path, []byte(csv), 0o644); err != nil {
		t.Fatalf("write csv: %v", err)
	}
	return path
}
