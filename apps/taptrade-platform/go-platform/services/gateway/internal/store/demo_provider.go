package store

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"
)

// DefaultDelayedCompletion is how long a "delayed" demo checkout stays
// pending before GetCheckoutStatus reports it completed.
const DefaultDelayedCompletion = 10 * time.Second

const demoSessionPrefix = "demo_cs_"

// DemoProvider is the deterministic simulated checkout provider
// (STORE_PROVIDER=demo). Outcomes are chosen on the demo checkout screen
// (success / failure / cancel / delayed); "delayed" leaves the purchase
// pending and reports completed only after a fixed delay elapses, exercising
// the pending -> completed path. No real charge occurs anywhere.
type DemoProvider struct {
	mu       sync.Mutex
	delay    time.Duration
	now      func() time.Time
	sessions map[string]*demoSession
}

type demoSession struct {
	purchaseID string
	state      CheckoutStatusState
	// completeAt is set for delayed sessions: the session reports completed
	// once the clock reaches it.
	completeAt time.Time
	delayed    bool
}

// NewDemoProvider builds the simulator. delay <= 0 uses
// DefaultDelayedCompletion; now == nil uses time.Now (injectable for tests).
func NewDemoProvider(delay time.Duration, now func() time.Time) *DemoProvider {
	if delay <= 0 {
		delay = DefaultDelayedCompletion
	}
	if now == nil {
		now = time.Now
	}
	return &DemoProvider{
		delay:    delay,
		now:      now,
		sessions: make(map[string]*demoSession),
	}
}

// CreateCheckoutSession registers a deterministic demo session for the
// purchase. The session id derives from the purchase id so replays of the
// same checkout map to the same session.
func (p *DemoProvider) CreateCheckoutSession(_ context.Context, req CheckoutSessionRequest) (CheckoutSession, error) {
	if strings.TrimSpace(req.PurchaseID) == "" {
		return CheckoutSession{}, fmt.Errorf("store demo provider: purchase id is required")
	}
	sessionID := demoSessionPrefix + req.PurchaseID
	p.mu.Lock()
	defer p.mu.Unlock()
	if _, exists := p.sessions[sessionID]; !exists {
		p.sessions[sessionID] = &demoSession{
			purchaseID: req.PurchaseID,
			state:      CheckoutStatePending,
		}
	}
	return CheckoutSession{
		ProviderSessionID: sessionID,
		CheckoutToken:     "demo_tok_" + req.PurchaseID,
	}, nil
}

// GetCheckoutStatus reports the session state. A delayed session flips to
// completed once the injected clock passes its completion time. Sessions
// unknown to this process (e.g. after a restart) report pending — the demo
// simulator holds no durable state; the purchase row stays authoritative.
func (p *DemoProvider) GetCheckoutStatus(_ context.Context, providerSessionID string) (CheckoutStatus, error) {
	if !strings.HasPrefix(providerSessionID, demoSessionPrefix) {
		return CheckoutStatus{}, ErrProviderSessionUnknown
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	session, ok := p.sessions[providerSessionID]
	if !ok {
		return CheckoutStatus{ProviderSessionID: providerSessionID, State: CheckoutStatePending}, nil
	}
	if session.delayed && session.state == CheckoutStatePending && !p.now().Before(session.completeAt) {
		session.state = CheckoutStateCompleted
	}
	return CheckoutStatus{ProviderSessionID: providerSessionID, State: session.state}, nil
}

// HandlePaymentConfirmation maps a demo checkout outcome to a purchase
// outcome. Repeated success confirmations return the same result — the
// service's fulfillment path makes replays 200-OK no-ops.
func (p *DemoProvider) HandlePaymentConfirmation(_ context.Context, conf ConfirmationInput) (ConfirmationResult, error) {
	outcome := strings.ToLower(strings.TrimSpace(conf.Outcome))
	sessionID := strings.TrimSpace(conf.ProviderSessionID)
	if sessionID == "" {
		sessionID = demoSessionPrefix + conf.PurchaseID
	}

	p.mu.Lock()
	session, ok := p.sessions[sessionID]
	if !ok {
		session = &demoSession{purchaseID: conf.PurchaseID, state: CheckoutStatePending}
		p.sessions[sessionID] = session
	}
	p.mu.Unlock()

	// Deterministic event ids: a replayed confirmation carries the same
	// provider event id, so the append-only event log dedupes it.
	eventID := func(kind string) string {
		return "demo_evt_" + conf.PurchaseID + ":" + kind
	}

	switch outcome {
	case DemoOutcomeSuccess:
		p.setSessionState(sessionID, CheckoutStateCompleted)
		return ConfirmationResult{
			Outcome:         OutcomeCompleted,
			EventType:       "checkout.completed",
			ProviderEventID: eventID("success"),
		}, nil
	case DemoOutcomeFailure:
		p.setSessionState(sessionID, CheckoutStateFailed)
		return ConfirmationResult{
			Outcome:         OutcomeFailed,
			FailureReason:   "simulated checkout declined",
			EventType:       "checkout.failed",
			ProviderEventID: eventID("failure"),
		}, nil
	case DemoOutcomeCancel:
		p.setSessionState(sessionID, CheckoutStateCanceled)
		return ConfirmationResult{
			Outcome:         OutcomeCanceled,
			FailureReason:   "checkout canceled before completion",
			EventType:       "checkout.canceled",
			ProviderEventID: eventID("cancel"),
		}, nil
	case DemoOutcomeDelayed:
		p.mu.Lock()
		if session.state == CheckoutStatePending && !session.delayed {
			session.delayed = true
			session.completeAt = p.now().Add(p.delay)
		}
		p.mu.Unlock()
		return ConfirmationResult{
			Outcome:         OutcomePending,
			EventType:       "checkout.delayed",
			ProviderEventID: eventID("delayed"),
		}, nil
	default:
		return ConfirmationResult{}, fmt.Errorf("%w: %q", ErrOutcomeInvalid, conf.Outcome)
	}
}

func (p *DemoProvider) setSessionState(sessionID string, state CheckoutStatusState) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if session, ok := p.sessions[sessionID]; ok {
		session.state = state
		session.delayed = false
	}
}
