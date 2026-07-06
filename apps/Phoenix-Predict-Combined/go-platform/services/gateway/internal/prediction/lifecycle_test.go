package prediction

import (
	"regexp"
	"testing"
)

func TestValidMarketTransitions(t *testing.T) {
	valid := []struct {
		from, to MarketStatus
	}{
		{MarketStatusUnopened, MarketStatusOpen},
		{MarketStatusUnopened, MarketStatusVoided},
		{MarketStatusOpen, MarketStatusHalted},
		{MarketStatusOpen, MarketStatusClosed},
		{MarketStatusOpen, MarketStatusVoided},
		{MarketStatusHalted, MarketStatusOpen},
		{MarketStatusHalted, MarketStatusClosed},
		{MarketStatusHalted, MarketStatusVoided},
		{MarketStatusClosed, MarketStatusSettled},
		{MarketStatusClosed, MarketStatusVoided},
		{MarketStatusClosed, MarketStatusProposedResolution},
		{MarketStatusProposedResolution, MarketStatusSettled},
		{MarketStatusProposedResolution, MarketStatusDisputed},
		{MarketStatusProposedResolution, MarketStatusVoided},
		{MarketStatusDisputed, MarketStatusSettled},
		{MarketStatusDisputed, MarketStatusVoided},
	}

	for _, tc := range valid {
		if !CanTransition(tc.from, tc.to) {
			t.Errorf("expected %s → %s to be valid", tc.from, tc.to)
		}
	}
}

func TestInvalidMarketTransitions(t *testing.T) {
	invalid := []struct {
		from, to MarketStatus
	}{
		{MarketStatusUnopened, MarketStatusClosed},
		{MarketStatusUnopened, MarketStatusSettled},
		{MarketStatusOpen, MarketStatusSettled},
		{MarketStatusOpen, MarketStatusUnopened},
		{MarketStatusClosed, MarketStatusOpen},
		{MarketStatusSettled, MarketStatusOpen},
		{MarketStatusSettled, MarketStatusVoided},
		{MarketStatusVoided, MarketStatusOpen},
	}

	for _, tc := range invalid {
		if CanTransition(tc.from, tc.to) {
			t.Errorf("expected %s → %s to be invalid", tc.from, tc.to)
		}
	}
}

func TestTransitionMarket(t *testing.T) {
	m := &Market{Status: MarketStatusUnopened}

	err := TransitionMarket(m, MarketStatusOpen)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if m.Status != MarketStatusOpen {
		t.Errorf("expected status Open, got %s", m.Status)
	}

	err = TransitionMarket(m, MarketStatusSettled)
	if err == nil {
		t.Error("expected error for open → settled (must close first)")
	}
}

func TestIsTradeable(t *testing.T) {
	if !IsTradeable(MarketStatusOpen) {
		t.Error("Open market should be tradeable")
	}
	if IsTradeable(MarketStatusClosed) {
		t.Error("Closed market should not be tradeable")
	}
	if IsTradeable(MarketStatusHalted) {
		t.Error("Halted market should not be tradeable")
	}
}

func TestIsTerminal(t *testing.T) {
	if !IsTerminal(MarketStatusSettled) {
		t.Error("Settled should be terminal")
	}
	if !IsTerminal(MarketStatusVoided) {
		t.Error("Voided should be terminal")
	}
	if IsTerminal(MarketStatusOpen) {
		t.Error("Open should not be terminal")
	}
}

func TestDescribeTapTradeMarketLifecycleMapsLaunchStages(t *testing.T) {
	cases := []struct {
		status        MarketStatus
		stage         string
		label         string
		tradeable     bool
		terminal      bool
		action        string
		targetStage   string
		requiresAudit bool
	}{
		{MarketStatusUnopened, "draft", "Draft", false, false, "open", "open", false},
		{MarketStatusOpen, "open", "Open", true, false, "halt", "paused", true},
		{MarketStatusHalted, "paused", "Paused", false, false, "open", "open", false},
		{MarketStatusClosed, "closed", "Closed", false, false, "propose", "resolving", true},
		{MarketStatusProposedResolution, "resolving", "Resolving", false, false, "finalize", "settled", true},
		{MarketStatusDisputed, "resolving", "Disputed", false, false, "finalize", "settled", true},
		{MarketStatusSettled, "settled", "Settled", false, true, "", "", false},
		{MarketStatusVoided, "invalid", "Invalid", false, true, "", "", false},
	}

	for _, tc := range cases {
		got := DescribeTapTradeMarketLifecycle(tc.status)
		if got.Stage != tc.stage || got.Label != tc.label {
			t.Fatalf("%s mapped to stage=%q label=%q, want stage=%q label=%q", tc.status, got.Stage, got.Label, tc.stage, tc.label)
		}
		if got.Tradeable != tc.tradeable || got.Terminal != tc.terminal {
			t.Fatalf("%s tradeable=%v terminal=%v, want tradeable=%v terminal=%v", tc.status, got.Tradeable, got.Terminal, tc.tradeable, tc.terminal)
		}
		if tc.action == "" {
			if len(got.AllowedActions) != 0 {
				t.Fatalf("%s should have no launch-facing actions, got %+v", tc.status, got.AllowedActions)
			}
			continue
		}
		var matched *TapTradeLifecycleAction
		for i := range got.AllowedActions {
			if got.AllowedActions[i].Action == tc.action {
				matched = &got.AllowedActions[i]
				break
			}
		}
		if matched == nil {
			t.Fatalf("%s missing launch action %q in %+v", tc.status, tc.action, got.AllowedActions)
		}
		if matched.TargetStage != tc.targetStage || matched.RequiresReason != tc.requiresAudit {
			t.Fatalf("%s action %q targetStage=%q requiresReason=%v, want targetStage=%q requiresReason=%v", tc.status, tc.action, matched.TargetStage, matched.RequiresReason, tc.targetStage, tc.requiresAudit)
		}
	}
}

func TestDescribeTapTradeMarketLifecycleUsesPointNativeCopy(t *testing.T) {
	prohibited := regexp.MustCompile(`(?i)\b(cash|cashout|deposit|withdraw|withdrawal|crypto|fiat|money|payout|payouts|prize|redeem|sportsbook|wager|wagering|bet)\b`)

	statuses := []MarketStatus{
		MarketStatusUnopened,
		MarketStatusOpen,
		MarketStatusHalted,
		MarketStatusClosed,
		MarketStatusProposedResolution,
		MarketStatusDisputed,
		MarketStatusSettled,
		MarketStatusVoided,
	}
	for _, status := range statuses {
		got := DescribeTapTradeMarketLifecycle(status)
		if prohibited.MatchString(got.Description) {
			t.Fatalf("%s lifecycle description uses launch-prohibited copy: %q", status, got.Description)
		}
	}
}

func TestValidEventTransitions(t *testing.T) {
	valid := []struct {
		from, to EventStatus
	}{
		{EventStatusDraft, EventStatusOpen},
		{EventStatusOpen, EventStatusClosed},
		{EventStatusClosed, EventStatusSettling},
		{EventStatusSettling, EventStatusSettled},
	}
	for _, tc := range valid {
		if !CanTransitionEvent(tc.from, tc.to) {
			t.Errorf("expected event %s → %s to be valid", tc.from, tc.to)
		}
	}
}

func TestInvalidEventTransitions(t *testing.T) {
	if CanTransitionEvent(EventStatusSettled, EventStatusOpen) {
		t.Error("settled → open should be invalid for events")
	}
	if CanTransitionEvent(EventStatusDraft, EventStatusSettled) {
		t.Error("draft → settled should be invalid for events")
	}
}
