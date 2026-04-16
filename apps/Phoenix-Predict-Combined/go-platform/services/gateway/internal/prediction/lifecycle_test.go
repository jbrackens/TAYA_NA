package prediction

import "testing"

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
