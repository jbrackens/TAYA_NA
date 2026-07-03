package alphacashier

import "time"

// Auto-Withdrawal-Approval (AWA) rules engine — P1-1 (PAM spec §22 Payments,
// Deposits, and Withdrawals). Decides, per withdrawal request, whether it may be
// AUTO-APPROVED or must be ROUTED TO MANUAL REVIEW. The engine is a pure,
// deterministic decision over rules-as-data; the caller supplies the aggregate
// context (today's already-auto-approved total, any manual-review triggers).
//
// FAIL-CLOSED by construction: auto-approval requires the master switch ON AND
// the amount at/under the per-withdrawal cap AND the running daily auto-approved
// total (incl. this one) at/under the daily cap AND the current time inside the
// configured UTC schedule window AND zero manual-review triggers. Any missing or
// zero-valued rule, and any edge case, routes to review — never the reverse.

// AWADecision is the outcome for one withdrawal.
type AWADecision struct {
	AutoApprove bool   `json:"autoApprove"`
	// Reason is a stable machine string for auditing (e.g. "auto_approved",
	// "auto_approve_disabled", "over_amount_threshold", "over_daily_aggregate",
	// "outside_schedule", "manual_review_trigger:<name>").
	Reason string `json:"reason"`
}

// AWARules is the operator-configured, rules-as-data policy. The zero value is
// fully fail-closed: AutoApproveEnabled is false, so every withdrawal reviews.
type AWARules struct {
	// AutoApproveEnabled is the master switch. Default false → always review.
	AutoApproveEnabled bool `json:"autoApproveEnabled"`
	// MaxAutoApproveCents: a withdrawal strictly above this routes to review. A
	// value <= 0 means "auto-approve nothing" (fail-closed).
	MaxAutoApproveCents int64 `json:"maxAutoApproveCents"`
	// MaxDailyAutoApproveCents: if a user's already-auto-approved total today
	// plus this withdrawal would exceed this, it routes to review. A value <= 0
	// means "no daily headroom" (fail-closed).
	MaxDailyAutoApproveCents int64 `json:"maxDailyAutoApproveCents"`
	// Schedule window in UTC hours, half-open [start, end). Auto-approval is
	// only permitted inside the window. start==end means "no window" →
	// fail-closed (always review). For 24/7, set start=0, end=24.
	ScheduleStartHourUTC int `json:"scheduleStartHourUtc"`
	ScheduleEndHourUTC   int `json:"scheduleEndHourUtc"`
}

// AWAContext is the per-request signal set the engine evaluates. The caller
// (the withdrawal-creation path) computes these from the repository and the
// current request; the engine stays pure and DB-free.
type AWAContext struct {
	AmountCents            int64
	DailyAutoApprovedCents int64
	NowUTC                 time.Time
	// ManualReviewTriggers: any non-empty entry forces review (e.g.
	// "first_withdrawal", "destination_changed", "kyc_stale"). Computed by the
	// caller; the engine only checks presence.
	ManualReviewTriggers []string
}

// DefaultAWARules is the conservative fail-closed default: auto-approval OFF.
// Every withdrawal routes to manual review until an operator deliberately
// configures and enables the policy.
func DefaultAWARules() AWARules {
	return AWARules{AutoApproveEnabled: false}
}

// DecideAWA returns the auto-approve/route-to-review decision. Pure and
// deterministic. The order of checks is chosen so the audited reason names the
// FIRST failing gate.
func DecideAWA(rules AWARules, c AWAContext) AWADecision {
	if !rules.AutoApproveEnabled {
		return AWADecision{AutoApprove: false, Reason: "auto_approve_disabled"}
	}
	// A manual-review trigger is absolute — it overrides any amount/schedule
	// headroom.
	for _, t := range c.ManualReviewTriggers {
		if t != "" {
			return AWADecision{AutoApprove: false, Reason: "manual_review_trigger:" + t}
		}
	}
	if rules.MaxAutoApproveCents <= 0 || c.AmountCents > rules.MaxAutoApproveCents {
		return AWADecision{AutoApprove: false, Reason: "over_amount_threshold"}
	}
	if rules.MaxDailyAutoApproveCents <= 0 || c.DailyAutoApprovedCents+c.AmountCents > rules.MaxDailyAutoApproveCents {
		return AWADecision{AutoApprove: false, Reason: "over_daily_aggregate"}
	}
	if !awaWithinSchedule(rules, c.NowUTC) {
		return AWADecision{AutoApprove: false, Reason: "outside_schedule"}
	}
	return AWADecision{AutoApprove: true, Reason: "auto_approved"}
}

// awaWithinSchedule reports whether now (UTC) falls in the half-open window
// [start, end) of UTC hours, supporting overnight wraparound. A zero-width
// window (start==end) is treated as "no window" → false (fail-closed).
func awaWithinSchedule(rules AWARules, now time.Time) bool {
	start, end := rules.ScheduleStartHourUTC, rules.ScheduleEndHourUTC
	if start == end {
		return false
	}
	h := now.UTC().Hour()
	if start < end {
		return h >= start && h < end
	}
	// Overnight window, e.g. [22, 6): in-window if late evening OR early morning.
	return h >= start || h < end
}
