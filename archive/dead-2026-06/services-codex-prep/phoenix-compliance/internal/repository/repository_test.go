package repository

import "testing"

func TestNormalizeLimitHistoryTypeHandlesStoredPeriodPrefix(t *testing.T) {
	tests := []struct {
		limitType  string
		wantType   string
		wantPeriod string
	}{
		{limitType: "daily_deposit", wantType: "Deposit", wantPeriod: "DAILY"},
		{limitType: "weekly_stake", wantType: "Stake", wantPeriod: "WEEKLY"},
		{limitType: "monthly_session", wantType: "SessionTime", wantPeriod: "MONTHLY"},
		{limitType: "monthly_loss", wantType: "loss", wantPeriod: "MONTHLY"},
	}

	for _, tt := range tests {
		t.Run(tt.limitType, func(t *testing.T) {
			gotType, gotPeriod := normalizeLimitHistoryType(tt.limitType)
			if gotType != tt.wantType || gotPeriod != tt.wantPeriod {
				t.Fatalf("normalizeLimitHistoryType(%q) = (%q, %q), want (%q, %q)", tt.limitType, gotType, gotPeriod, tt.wantType, tt.wantPeriod)
			}
		})
	}
}
