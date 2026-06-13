package webhooks

import (
	"bytes"
	"context"
	"encoding/json"
	stdhttp "net/http"
	"time"
)

// Per-delivery headers (besides the signature).
const (
	EventHeader      = "X-TNA-Event"
	DeliveryIDHeader = "X-TNA-Delivery-Id"
)

// DeliveryOutcome classifies a single delivery attempt.
type DeliveryOutcome int

const (
	// Delivered: the receiver accepted (2xx). Terminal success.
	Delivered DeliveryOutcome = iota
	// Retryable: a transient failure (5xx, 408, 429, network/timeout). The
	// dispatcher should back off and retry.
	Retryable
	// Permanent: a failure retries won't fix (most 4xx — bad URL, auth,
	// malformed). Don't retry; dead-letter after logging.
	Permanent
)

func (o DeliveryOutcome) String() string {
	switch o {
	case Delivered:
		return "delivered"
	case Retryable:
		return "retryable"
	default:
		return "permanent"
	}
}

// Deliver makes ONE signed POST attempt to the endpoint and classifies the
// result. It does not retry: the dispatcher owns the retry loop so attempts can
// be persisted and backed off independently (at-least-once across restarts).
func Deliver(ctx context.Context, client *stdhttp.Client, ep Endpoint, ev Event) (DeliveryOutcome, int, error) {
	body, err := json.Marshal(ev)
	if err != nil {
		return Permanent, 0, err
	}
	req, err := stdhttp.NewRequestWithContext(ctx, stdhttp.MethodPost, ep.URL, bytes.NewReader(body))
	if err != nil {
		return Permanent, 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(SignatureHeader, Sign(ep.Secret, body))
	req.Header.Set(EventHeader, ev.Type)
	req.Header.Set(DeliveryIDHeader, ev.ID)

	resp, err := client.Do(req)
	if err != nil {
		return Retryable, 0, err // network / timeout — transient
	}
	defer func() { _ = resp.Body.Close() }()
	return classify(resp.StatusCode), resp.StatusCode, nil
}

func classify(status int) DeliveryOutcome {
	switch {
	case status >= 200 && status < 300:
		return Delivered
	case status >= 500, status == stdhttp.StatusRequestTimeout, status == stdhttp.StatusTooManyRequests:
		return Retryable
	default:
		return Permanent
	}
}

// Backoff returns the delay before retry `attempt` (1-based): exponential from
// base, capped at max — prompt retries first, sparse later, so a flapping
// receiver isn't hammered. attempt 1 → base, 2 → 2*base, 3 → 4*base, …
func Backoff(attempt int, base, max time.Duration) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	d := base
	for i := 1; i < attempt; i++ {
		d *= 2
		if d >= max || d <= 0 { // cap (and guard against overflow wrap)
			return max
		}
	}
	if d > max {
		return max
	}
	return d
}
