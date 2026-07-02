package prediction

import "fmt"

// TianggeLifecycleAction describes a launch-facing operation an admin can take
// from a market's current state.
type TianggeLifecycleAction struct {
	Action         string       `json:"action"`
	Label          string       `json:"label"`
	TargetStatus   MarketStatus `json:"targetStatus"`
	TargetStage    string       `json:"targetStage"`
	RequiresReason bool         `json:"requiresReason"`
	Destructive    bool         `json:"destructive"`
}

// TianggeMarketLifecycle maps legacy engine statuses to the launch-facing
// lifecycle language used in the Tiangge backoffice.
type TianggeMarketLifecycle struct {
	Stage          string                   `json:"stage"`
	Label          string                   `json:"label"`
	Description    string                   `json:"description"`
	Tradeable      bool                     `json:"tradeable"`
	Terminal       bool                     `json:"terminal"`
	AllowedActions []TianggeLifecycleAction `json:"allowedActions"`
}

// validTransitions defines allowed market status transitions.
var validTransitions = map[MarketStatus][]MarketStatus{
	MarketStatusUnopened: {MarketStatusOpen, MarketStatusVoided},
	MarketStatusOpen:     {MarketStatusHalted, MarketStatusClosed, MarketStatusVoided},
	MarketStatusHalted:   {MarketStatusOpen, MarketStatusClosed, MarketStatusVoided},
	// closed can settle directly (immediate finalize / backward-compat) or move
	// through the proposed-resolution challenge window (ADR-0003/0004).
	MarketStatusClosed:             {MarketStatusProposedResolution, MarketStatusSettled, MarketStatusVoided},
	MarketStatusProposedResolution: {MarketStatusSettled, MarketStatusDisputed, MarketStatusVoided},
	MarketStatusDisputed:           {MarketStatusSettled, MarketStatusVoided},
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

// DescribeTianggeMarketLifecycle returns the status mapping the launch
// backoffice should render. It does not change the persisted engine status.
func DescribeTianggeMarketLifecycle(status MarketStatus) TianggeMarketLifecycle {
	switch status {
	case MarketStatusUnopened:
		return TianggeMarketLifecycle{
			Stage:       "draft",
			Label:       "Draft",
			Description: "Not yet published. Admins can open or cancel before users can trade.",
			Tradeable:   false,
			Terminal:    false,
			AllowedActions: []TianggeLifecycleAction{
				lifecycleAction("open", "Open", MarketStatusOpen, "open", false, false),
				lifecycleAction("void", "Cancel", MarketStatusVoided, "invalid", true, true),
			},
		}
	case MarketStatusOpen:
		return TianggeMarketLifecycle{
			Stage:       "open",
			Label:       "Open",
			Description: "Published and accepting prediction orders.",
			Tradeable:   true,
			Terminal:    false,
			AllowedActions: []TianggeLifecycleAction{
				lifecycleAction("halt", "Pause", MarketStatusHalted, "paused", true, true),
				lifecycleAction("close", "Close", MarketStatusClosed, "closed", true, true),
				lifecycleAction("void", "Invalidate", MarketStatusVoided, "invalid", true, true),
			},
		}
	case MarketStatusHalted:
		return TianggeMarketLifecycle{
			Stage:       "paused",
			Label:       "Paused",
			Description: "Visible but not accepting new orders until resumed or closed.",
			Tradeable:   false,
			Terminal:    false,
			AllowedActions: []TianggeLifecycleAction{
				lifecycleAction("open", "Resume", MarketStatusOpen, "open", false, false),
				lifecycleAction("close", "Close", MarketStatusClosed, "closed", true, true),
				lifecycleAction("void", "Invalidate", MarketStatusVoided, "invalid", true, true),
			},
		}
	case MarketStatusClosed:
		return TianggeMarketLifecycle{
			Stage:       "closed",
			Label:       "Closed",
			Description: "Trading is closed. The market is ready for resolution or invalidation.",
			Tradeable:   false,
			Terminal:    false,
			AllowedActions: []TianggeLifecycleAction{
				lifecycleAction("propose", "Propose Resolution", MarketStatusProposedResolution, "resolving", true, true),
				lifecycleAction("settle", "Settle Now", MarketStatusSettled, "settled", true, true),
				lifecycleAction("void", "Invalidate", MarketStatusVoided, "invalid", true, true),
			},
		}
	case MarketStatusProposedResolution:
		return TianggeMarketLifecycle{
			Stage:       "resolving",
			Label:       "Resolving",
			Description: "A resolution has been proposed and is awaiting challenge-window finalization.",
			Tradeable:   false,
			Terminal:    false,
			AllowedActions: []TianggeLifecycleAction{
				lifecycleAction("finalize", "Finalize", MarketStatusSettled, "settled", true, true),
				lifecycleAction("void", "Invalidate", MarketStatusVoided, "invalid", true, true),
			},
		}
	case MarketStatusDisputed:
		return TianggeMarketLifecycle{
			Stage:       "resolving",
			Label:       "Disputed",
			Description: "Resolution is disputed and must be finalized or invalidated by admins.",
			Tradeable:   false,
			Terminal:    false,
			AllowedActions: []TianggeLifecycleAction{
				lifecycleAction("finalize", "Finalize", MarketStatusSettled, "settled", true, true),
				lifecycleAction("void", "Invalidate", MarketStatusVoided, "invalid", true, true),
			},
		}
	case MarketStatusSettled:
		return TianggeMarketLifecycle{
			Stage:       "settled",
			Label:       "Settled",
			Description: "Final result and point disbursements are recorded.",
			Tradeable:   false,
			Terminal:    true,
		}
	case MarketStatusVoided:
		return TianggeMarketLifecycle{
			Stage:       "invalid",
			Label:       "Invalid",
			Description: "Market is canceled or invalidated and no longer accepts actions.",
			Tradeable:   false,
			Terminal:    true,
		}
	default:
		return TianggeMarketLifecycle{
			Stage:       string(status),
			Label:       string(status),
			Description: "Unknown lifecycle state.",
			Tradeable:   false,
			Terminal:    false,
		}
	}
}

func lifecycleAction(action, label string, targetStatus MarketStatus, targetStage string, requiresReason, destructive bool) TianggeLifecycleAction {
	return TianggeLifecycleAction{
		Action:         action,
		Label:          label,
		TargetStatus:   targetStatus,
		TargetStage:    targetStage,
		RequiresReason: requiresReason,
		Destructive:    destructive,
	}
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
