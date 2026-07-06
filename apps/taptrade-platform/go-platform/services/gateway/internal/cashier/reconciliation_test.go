package cashier

import "testing"

func TestSummarizeReconciliationReportCountsMismatchesByStatus(t *testing.T) {
	report := ReconciliationReport{
		ID:           "recon_2026_05_25",
		BusinessDate: "2026-05-25",
		GeneratedAt:  "2026-05-25T00:05:00Z",
		GeneratedBy:  "cashier-reconciler",
		Items: []ReconciliationItem{
			{
				ID:            "recon_item_matched",
				SubjectType:   "deposit_intent",
				SubjectID:     "dep_test_001",
				ExpectedUnits: "1000000",
				ObservedUnits: "1000000",
				Asset:         "USDT",
				Chain:         "tron",
				Status:        ReconciliationMatched,
			},
			{
				ID:            "recon_item_missing_chain",
				SubjectType:   "deposit_intent",
				SubjectID:     "dep_missing_chain",
				ExpectedUnits: "1000000",
				ObservedUnits: "0",
				Asset:         "USDT",
				Chain:         "tron",
				Status:        ReconciliationMissingChain,
			},
			{
				ID:            "recon_item_quarantined",
				SubjectType:   "bridge_event",
				SubjectID:     "bridge_evt_quarantined",
				ExpectedUnits: "5000000",
				ObservedUnits: "5000000",
				Asset:         "USDT",
				Chain:         "tron",
				Status:        ReconciliationQuarantined,
			},
		},
	}

	summary := SummarizeReconciliationReport(report)

	if summary.ItemCount != 3 {
		t.Fatalf("expected 3 items, got %d", summary.ItemCount)
	}
	if summary.MatchedCount != 1 {
		t.Fatalf("expected 1 matched item, got %d", summary.MatchedCount)
	}
	if summary.MismatchCount != 2 {
		t.Fatalf("expected 2 mismatches, got %d", summary.MismatchCount)
	}
	if summary.ByStatus[ReconciliationMissingChain] != 1 {
		t.Fatalf("expected missing_chain count to be 1")
	}
	if summary.ByStatus[ReconciliationQuarantined] != 1 {
		t.Fatalf("expected quarantined count to be 1")
	}
}
