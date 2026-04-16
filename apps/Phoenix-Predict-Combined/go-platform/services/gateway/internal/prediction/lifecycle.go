package prediction

import "fmt"

// validTransitions defines allowed market status transitions.
var validTransitions = map[MarketStatus][]MarketStatus{
	MarketStatusUnopened: {MarketStatusOpen, MarketStatusVoided},
	MarketStatusOpen:     {MarketStatusHalted, MarketStatusClosed, MarketStatusVoided},
	MarketStatusHalted:   {MarketStatusOpen, MarketStatusClosed, MarketStatusVoided},
	MarketStatusClosed:   {MarketStatusSettled, MarketStatusVoided},
	// Terminal states — no transitions out
	MarketStatusSettled: {},
	MarketStatusVoided:  {},
}

// CanTransition checks whether a market can move from its current status to the target.
func CanTransition(from, to MarketStatus) bool {
	allowed, ok := validTransitions[from]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

// TransitionMarket attempts to transition a market to a new status.
// Returns an error if the transition is not allowed.
func TransitionMarket(market *Market, to MarketStatus) error {
	if !CanTransition(market.Status, to) {
		return fmt.Errorf("invalid market transition: %s → %s", market.Status, to)
	}
	market.Status = to
	return nil
}

// IsTradeable returns true if the market accepts new orders.
func IsTradeable(status MarketStatus) bool {
	return status == MarketStatusOpen
}

// IsTerminal returns true if the market is in a final state.
func IsTerminal(status MarketStatus) bool {
	return status == MarketStatusSettled || status == MarketStatusVoided
}

// validEventTransitions defines allowed event status transitions.
var validEventTransitions = map[EventStatus][]EventStatus{
	EventStatusDraft:       {EventStatusOpen, EventStatusVoided},
	EventStatusOpen:        {EventStatusTradingHalt, EventStatusClosed, EventStatusVoided},
	EventStatusTradingHalt: {EventStatusOpen, EventStatusClosed, EventStatusVoided},
	EventStatusClosed:      {EventStatusSettling, EventStatusVoided},
	EventStatusSettling:    {EventStatusSettled, EventStatusVoided},
	EventStatusSettled:     {},
	EventStatusVoided:      {},
}

// CanTransitionEvent checks whether an event can transition to the target status.
func CanTransitionEvent(from, to EventStatus) bool {
	allowed, ok := validEventTransitions[from]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}
