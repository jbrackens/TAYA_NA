package aml

import "testing"

// The classifier is the single source of truth for what the scanner treats as
// money-flow. It keys on the stable idempotency-key prefix each rail stamps, so
// every case below uses the REAL (reason, idempotency_key) signature that rail
// writes to wallet_ledger — verified against alphacashier/service.go,
// wallet/service.go (capture/reservation/release), payments/db_service.go, and
// wallet_handlers.go (faucets). The native-crypto deposit/withdrawal cases are
// the verification #7 MAJOR regression: their reasons ("alpha USDC deposit …",
// "reservation captured alpha_withdrawal:…") do NOT begin with
// deposit/withdrawal, so a reason-prefix classifier mislabeled them.
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
		// Deposits — every real inflow rail.
		{"native crypto deposit (regression)", "credit", "real", "alpha USDC deposit 1/0xabc", "alpha-cashier:deposit:1:0xabc:0", "deposit", true},
		{"legacy payment deposit (prod)", "credit", "real", "deposit via card", "payment:txn-123", "deposit", true},
		{"legacy payment deposit (dev)", "credit", "real", "deposit via card", "payment:dep:db:1720000000", "deposit", true},
		{"mock rail deposit", "credit", "real", "deposit via method", "dep:7", "deposit", true},
		// Withdrawals — every real outflow rail (the debit is the capture leg).
		{"native crypto withdrawal (regression)", "debit", "real", "reservation captured alpha_withdrawal:w-9", "capture:alpha_withdrawal:w-9", "withdrawal", true},
		{"legacy payment withdrawal capture", "debit", "real", "partial capture withdrawal:txn-5", "capture:withdrawal:txn-5", "withdrawal", true},
		{"mock rail withdrawal", "debit", "real", "withdrawal via method (pending)", "wdr:3", "withdrawal", true},
		// Adjustments — operator-supplied key/reason, and the safe residual.
		{"manual admin credit", "credit", "real", "goodwill points for outage", "admin-ui:uuid-1", "adjustment", true},
		{"maker-checker executed debit", "debit", "real", "clawback", "operator-supplied-key-2", "adjustment", true},
		{"unknown future real credit → safe residual", "credit", "real", "mystery inflow", "some-future-rail:1", "adjustment", true},
		// Trading / settlement — excluded by the prediction_ key prefix.
		{"trading fill excluded", "debit", "real", "order fill", "prediction_fill:t-1", "", false},
		{"trading fill proceeds excluded", "credit", "real", "fill proceeds", "prediction_fill_proceeds:t-1", "", false},
		{"settlement payout excluded", "credit", "real", "payout", "prediction_payout:1:2", "", false},
		{"void refund excluded", "credit", "real", "void", "prediction_void:m:p", "", false},
		// Reservation-lifecycle markers — move no settled balance, excluded by
		// entry_type (never credit/debit) + reservation:/release: key. The
		// prediction_order release/reservation markers are the confirmed leak:
		// their keys do NOT start with prediction_, so a pure prefix guard
		// missed them and they used to count as "adjustment".
		{"prediction order reservation marker excluded (leak)", "reservation", "real", "reservation held prediction_order:o-1", "reservation:prediction_order:o-1", "", false},
		{"prediction order release marker excluded (leak)", "release", "real", "reservation released prediction_order:o-1", "release:prediction_order:o-1", "", false},
		{"withdrawal hold reservation marker excluded", "reservation", "real", "reservation held alpha_withdrawal:w-9", "reservation:alpha_withdrawal:w-9", "", false},
		{"withdrawal release marker excluded", "release", "real", "reservation released alpha_withdrawal:w-9", "release:alpha_withdrawal:w-9", "", false},
		// Non-real fund — bonus/promo belong to the bonus engine, not AML.
		{"bonus fund excluded", "credit", "bonus", "bonus grant", "bonus-grant:1", "", false},
		{"promo fund excluded", "credit", "promo", "promo credit", "promo:1", "", false},
		// Real-pool play-money faucets — excluded so grants are not monitored as
		// customer money movement.
		{"starter grant faucet excluded", "credit", "real", "welcome grant", "starter_grant:u-1", "", false},
		{"daily claim faucet excluded", "credit", "real", "daily bonus", "daily_claim:u-1:2026-07-03", "", false},
		{"point pack faucet excluded", "credit", "real", "point pack", "point_pack:u-1:p-2", "", false},
		{"mission reward faucet excluded", "credit", "real", "mission reward", "mission_reward:u-1:m-2", "", false},
		{"streak reward faucet excluded", "credit", "real", "streak reward", "streak_reward:u-1", "", false},
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
