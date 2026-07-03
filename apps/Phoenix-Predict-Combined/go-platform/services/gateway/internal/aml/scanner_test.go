package aml

import "testing"

// The classifier is the single source of truth for what the scanner treats as
// money-flow. Trading and bonus rows must be excluded; real-fund deposits /
// withdrawals / adjustments included.
func TestClassifyMoneyFlow(t *testing.T) {
	cases := []struct {
		name       string
		entryType  string
		fundType   string
		reason     string
		idemKey    string
		wantKind   string
		wantIsFlow bool
	}{
		{"deposit", "credit", "real", "deposit via card", "dep:1", "deposit", true},
		{"withdrawal", "debit", "real", "withdrawal initiated", "wd:1", "withdrawal", true},
		{"manual adjustment", "credit", "real", "goodwill credit", "adj:1", "adjustment", true},
		{"trading order excluded", "debit", "real", "order fill", "prediction_order:abc", "", false},
		{"settlement payout excluded", "credit", "real", "payout", "prediction_payout:1:2", "", false},
		{"void refund excluded", "credit", "real", "void", "prediction_void:m:p", "", false},
		{"bonus fund excluded", "credit", "bonus", "deposit via promo", "bonus:1", "", false},
		{"promo fund excluded", "credit", "promo", "withdrawal", "x:1", "", false},
		{"deposit case-insensitive", "credit", "real", "Deposit Confirmed", "d:2", "deposit", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			kind, isFlow := classifyMoneyFlow(tc.entryType, tc.fundType, tc.reason, tc.idemKey)
			if isFlow != tc.wantIsFlow || kind != tc.wantKind {
				t.Fatalf("classify(%q,%q,%q,%q) = (%q,%v), want (%q,%v)",
					tc.entryType, tc.fundType, tc.reason, tc.idemKey, kind, isFlow, tc.wantKind, tc.wantIsFlow)
			}
		})
	}
}

func TestCasePriorityForPoints(t *testing.T) {
	for _, tc := range []struct {
		pts  int
		want string
	}{{50, "low"}, {100, "medium"}, {150, "medium"}, {200, "high"}, {500, "high"}} {
		if got := casePriorityForPoints(tc.pts); got != tc.want {
			t.Fatalf("points %d: got %q want %q", tc.pts, got, tc.want)
		}
	}
}
