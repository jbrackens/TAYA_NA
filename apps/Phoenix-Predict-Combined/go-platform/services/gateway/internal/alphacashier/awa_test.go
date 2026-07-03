package alphacashier

import (
	"testing"
	"time"
)

// at builds a UTC time at the given hour (for schedule-window tests).
func at(hour int) time.Time {
	return time.Date(2026, 7, 3, hour, 30, 0, 0, time.UTC)
}

// A fully-permissive-but-realistic policy: enabled, generous caps, 24/7.
func openRules() AWARules {
	return AWARules{
		AutoApproveEnabled:       true,
		MaxAutoApproveCents:      100_000,
		MaxDailyAutoApproveCents: 500_000,
		ScheduleStartHourUTC:     0,
		ScheduleEndHourUTC:       24,
	}
}

func TestDecideAWAFailClosedByDefault(t *testing.T) {
	// The zero value and DefaultAWARules must route everything to review.
	for _, rules := range []AWARules{{}, DefaultAWARules()} {
		d := DecideAWA(rules, AWAContext{AmountCents: 1, NowUTC: at(12)})
		if d.AutoApprove || d.Reason != "auto_approve_disabled" {
			t.Fatalf("default must review: %+v", d)
		}
	}
}

func TestDecideAWA(t *testing.T) {
	cases := []struct {
		name       string
		mutate     func(*AWARules)
		ctx        AWAContext
		wantAuto   bool
		wantReason string
	}{
		{"all pass → auto-approve", nil,
			AWAContext{AmountCents: 50_000, DailyAutoApprovedCents: 0, NowUTC: at(12)}, true, "auto_approved"},
		{"exactly at amount cap → auto-approve", nil,
			AWAContext{AmountCents: 100_000, NowUTC: at(12)}, true, "auto_approved"},
		{"exactly at daily cap → auto-approve", nil,
			AWAContext{AmountCents: 100_000, DailyAutoApprovedCents: 400_000, NowUTC: at(12)}, true, "auto_approved"},
		{"over amount cap → review", nil,
			AWAContext{AmountCents: 100_001, NowUTC: at(12)}, false, "over_amount_threshold"},
		{"zero amount cap → review", func(r *AWARules) { r.MaxAutoApproveCents = 0 },
			AWAContext{AmountCents: 1, NowUTC: at(12)}, false, "over_amount_threshold"},
		{"over daily aggregate → review", nil,
			AWAContext{AmountCents: 100_000, DailyAutoApprovedCents: 400_001, NowUTC: at(12)}, false, "over_daily_aggregate"},
		{"zero daily cap → review", func(r *AWARules) { r.MaxDailyAutoApproveCents = 0 },
			AWAContext{AmountCents: 1, NowUTC: at(12)}, false, "over_daily_aggregate"},
		{"manual-review trigger → review (overrides headroom)", nil,
			AWAContext{AmountCents: 1, NowUTC: at(12), ManualReviewTriggers: []string{"first_withdrawal"}}, false, "manual_review_trigger:first_withdrawal"},
		{"empty trigger strings are ignored", nil,
			AWAContext{AmountCents: 1, NowUTC: at(12), ManualReviewTriggers: []string{"", ""}}, true, "auto_approved"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rules := openRules()
			if tc.mutate != nil {
				tc.mutate(&rules)
			}
			d := DecideAWA(rules, tc.ctx)
			if d.AutoApprove != tc.wantAuto || d.Reason != tc.wantReason {
				t.Fatalf("got %+v, want auto=%v reason=%q", d, tc.wantAuto, tc.wantReason)
			}
		})
	}
}

func TestDecideAWASchedule(t *testing.T) {
	base := AWAContext{AmountCents: 1_000, DailyAutoApprovedCents: 0}
	cases := []struct {
		name       string
		start, end int
		hour       int
		wantAuto   bool
	}{
		{"24/7 midnight in window", 0, 24, 0, true},
		{"24/7 late in window", 0, 24, 23, true},
		{"day window in", 6, 22, 10, true},
		{"day window out (evening)", 6, 22, 23, false},
		{"day window out (early)", 6, 22, 3, false},
		{"overnight window in (late)", 22, 6, 23, true},
		{"overnight window in (early)", 22, 6, 3, true},
		{"overnight window out (midday)", 22, 6, 12, false},
		{"zero-width window → fail-closed", 0, 0, 12, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rules := openRules()
			rules.ScheduleStartHourUTC, rules.ScheduleEndHourUTC = tc.start, tc.end
			ctx := base
			ctx.NowUTC = at(tc.hour)
			d := DecideAWA(rules, ctx)
			if d.AutoApprove != tc.wantAuto {
				t.Fatalf("hour %d window [%d,%d): got auto=%v (%s), want %v", tc.hour, tc.start, tc.end, d.AutoApprove, d.Reason, tc.wantAuto)
			}
			if !tc.wantAuto && d.Reason != "outside_schedule" {
				t.Fatalf("expected outside_schedule, got %q", d.Reason)
			}
		})
	}
}
