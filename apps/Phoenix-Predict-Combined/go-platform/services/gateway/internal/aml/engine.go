package aml

import (
	"fmt"
	"strings"
	"time"
)

// MoneyEvent is one money-path movement to evaluate: a deposit, withdrawal, or
// manual adjustment. The engine reads these read-only (slice 2 sources them
// from the wallet ledger); it never mutates the money path.
type MoneyEvent struct {
	SubjectID   string
	Kind        string // deposit, withdrawal, adjustment
	AmountCents int64  // absolute value
	OccurredAt  time.Time
	Reference   string // ledger entry id / idempotency key, for the dedupe key
}

// SubjectWindow is the recent history the engine needs for velocity/aggregate
// rules: the count and summed amount of a subject's events within a rule's
// lookback window. Slice 2 supplies these from the ledger; slice 1 tests
// supply them directly. Keeping the engine free of DB access makes it a pure,
// table-testable function.
type SubjectWindow struct {
	// CountWithin returns how many of the subject's events (including the
	// current one) fall within the given lookback ending at the event time.
	CountWithin func(window time.Duration) int
	// SumWithinCents returns the summed absolute amount over the same lookback.
	SumWithinCents func(window time.Duration) int64
}

// Evaluate runs every enabled rule against one event and returns the alerts to
// persist. It is deterministic and DB-free. Rules whose params are malformed
// are skipped (a bad data row must not crash monitoring) — the caller logs
// skips. With no rules, it returns no alerts: the plumbing runs, no regime is
// assumed.
func Evaluate(rules []Rule, ev MoneyEvent, win SubjectWindow) []Alert {
	alerts := []Alert{}
	for _, r := range rules {
		if !r.Enabled {
			continue
		}
		fired, summary, detail := evalRule(r, ev, win)
		if !fired {
			continue
		}
		alerts = append(alerts, Alert{
			RuleID:     r.ID,
			RuleName:   r.Name,
			Severity:   severityOrDefault(r.Severity),
			SubjectID:  ev.SubjectID,
			RiskPoints: r.RiskPoints,
			Summary:    summary,
			Detail:     detail,
			DedupeKey:  dedupeKey(r, ev),
		})
	}
	return alerts
}

// dedupeKey ties an alert to (rule, subject, event) so a re-scan over the same
// ledger window cannot double-report. Aggregate/velocity rules key on the
// triggering event's reference so each crossing is recorded once.
func dedupeKey(r Rule, ev MoneyEvent) string {
	return fmt.Sprintf("aml:%d:%s:%s", r.ID, ev.SubjectID, ev.Reference)
}

func evalRule(r Rule, ev MoneyEvent, win SubjectWindow) (bool, string, map[string]any) {
	switch r.Kind {
	case "amount_threshold":
		// Single event at or above a cents threshold. Optional kinds filter.
		thr := paramCents(r.Params, "thresholdCents")
		if thr <= 0 || !kindMatches(r.Params, ev.Kind) {
			return false, "", nil
		}
		if ev.AmountCents >= thr {
			return true,
				fmt.Sprintf("%s of %d cents met the %d-cent threshold", ev.Kind, ev.AmountCents, thr),
				map[string]any{"amountCents": ev.AmountCents, "thresholdCents": thr, "kind": ev.Kind}
		}
	case "velocity":
		// N or more events within a window.
		n := paramInt(r.Params, "count")
		w := paramWindow(r.Params)
		if n <= 0 || w <= 0 || !kindMatches(r.Params, ev.Kind) || win.CountWithin == nil {
			return false, "", nil
		}
		if c := win.CountWithin(w); c >= n {
			return true,
				fmt.Sprintf("%d %s events within %s met the velocity rule (>= %d)", c, ev.Kind, w, n),
				map[string]any{"count": c, "threshold": n, "windowSeconds": int64(w.Seconds())}
		}
	case "aggregate":
		// Summed amount within a window at or above a cents threshold
		// (structuring / smurfing detection).
		thr := paramCents(r.Params, "thresholdCents")
		w := paramWindow(r.Params)
		if thr <= 0 || w <= 0 || !kindMatches(r.Params, ev.Kind) || win.SumWithinCents == nil {
			return false, "", nil
		}
		if sum := win.SumWithinCents(w); sum >= thr {
			return true,
				fmt.Sprintf("%d cents of %s within %s met the aggregate threshold (%d)", sum, ev.Kind, w, thr),
				map[string]any{"sumCents": sum, "thresholdCents": thr, "windowSeconds": int64(w.Seconds())}
		}
	}
	return false, "", nil
}

// kindMatches honors an optional "kinds" param (comma-separated allow-list);
// absent/empty means the rule applies to every event kind.
func kindMatches(params map[string]any, evKind string) bool {
	raw, ok := params["kinds"]
	if !ok {
		return true
	}
	s, ok := raw.(string)
	if !ok || strings.TrimSpace(s) == "" {
		return true
	}
	for _, k := range strings.Split(s, ",") {
		if strings.EqualFold(strings.TrimSpace(k), evKind) {
			return true
		}
	}
	return false
}

func paramCents(params map[string]any, key string) int64 {
	return paramInt64(params, key)
}

func paramInt(params map[string]any, key string) int {
	return int(paramInt64(params, key))
}

// paramInt64 tolerates JSON numbers (float64) and ints (from tests).
func paramInt64(params map[string]any, key string) int64 {
	switch v := params[key].(type) {
	case float64:
		return int64(v)
	case int:
		return int64(v)
	case int64:
		return v
	}
	return 0
}

func paramWindow(params map[string]any) time.Duration {
	secs := paramInt64(params, "windowSeconds")
	if secs <= 0 {
		return 0
	}
	return time.Duration(secs) * time.Second
}
