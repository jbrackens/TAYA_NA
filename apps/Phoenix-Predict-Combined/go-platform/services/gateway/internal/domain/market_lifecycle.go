package domain

import (
	"fmt"
	"strings"
)

// Market lifecycle states
const (
	MarketStatusPreMatch  = "pre_match"
	MarketStatusLive      = "live"
	MarketStatusOpen      = "open"      // alias for pre_match/live bettable state
	MarketStatusSuspended = "suspended"
	MarketStatusClosed    = "closed"
	MarketStatusResulted  = "resulted"
	MarketStatusSettled   = "settled"
	MarketStatusVoided    = "voided"
	MarketStatusCancelled = "cancelled" // alias for voided
)

// validTransitions defines which state transitions are allowed.
// Key = from state, Value = set of allowed target states.
var validTransitions = map[string]map[string]bool{
	MarketStatusPreMatch: {
		MarketStatusLive:      true,
		MarketStatusOpen:      true,
		MarketStatusSuspended: true,
		MarketStatusClosed:    true,
		MarketStatusVoided:    true,
		MarketStatusCancelled: true,
	},
	MarketStatusOpen: {
		MarketStatusLive:      true,
		MarketStatusSuspended: true,
		MarketStatusClosed:    true,
		MarketStatusVoided:    true,
		MarketStatusCancelled: true,
	},
	MarketStatusLive: {
		MarketStatusSuspended: true,
		MarketStatusClosed:    true,
		MarketStatusVoided:    true,
		MarketStatusCancelled: true,
	},
	MarketStatusSuspended: {
		MarketStatusOpen:      true,
		MarketStatusLive:      true,
		MarketStatusPreMatch:  true,
		MarketStatusClosed:    true,
		MarketStatusVoided:    true,
		MarketStatusCancelled: true,
	},
	MarketStatusClosed: {
		MarketStatusResulted:  true,
		MarketStatusVoided:    true,
		MarketStatusCancelled: true,
		MarketStatusSuspended: true, // reopen to suspended for corrections
	},
	MarketStatusResulted: {
		MarketStatusSettled:   true,
		MarketStatusVoided:    true,
		MarketStatusCancelled: true,
		MarketStatusResulted:  true, // allow re-result for corrections
	},
	MarketStatusSettled: {
		// Terminal state — only resettlement (which goes through resulted again)
		MarketStatusResulted: true, // resettlement path
		MarketStatusVoided:   true, // void after settlement (with refunds)
	},
	MarketStatusVoided: {
		// Terminal state
	},
	MarketStatusCancelled: {
		// Terminal state (alias for voided)
	},
}

// IsBettableStatus returns true if the market status allows bet placement.
func IsBettableStatus(status string) bool {
	normalized := strings.ToLower(strings.TrimSpace(status))
	switch normalized {
	case MarketStatusOpen, MarketStatusPreMatch, MarketStatusLive:
		return true
	}
	return false
}

// IsTerminalStatus returns true if the market is in a terminal state.
func IsTerminalStatus(status string) bool {
	normalized := strings.ToLower(strings.TrimSpace(status))
	switch normalized {
	case MarketStatusVoided, MarketStatusCancelled:
		return true
	}
	return false
}

// ValidateMarketTransition checks if a state transition is allowed.
// Returns nil if valid, or an error describing why the transition is rejected.
func ValidateMarketTransition(fromStatus string, toStatus string) error {
	from := strings.ToLower(strings.TrimSpace(fromStatus))
	to := strings.ToLower(strings.TrimSpace(toStatus))

	if from == to {
		return nil // no-op transitions are always allowed
	}

	allowed, exists := validTransitions[from]
	if !exists {
		return fmt.Errorf("unknown market status %q", from)
	}

	if !allowed[to] {
		return fmt.Errorf("invalid market transition from %q to %q", from, to)
	}

	return nil
}

// MarketTransitionReason tracks why a market state changed (for audit trail).
type MarketTransitionReason struct {
	Source string // "feed", "admin", "system"
	Actor  string // userID or system identifier
	Reason string // human-readable reason
}
