package provider

import (
	"context"
	"errors"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"phoenix-revival/platform/canonical/adapter"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

var (
	ErrInvalidCancelRequest  = errors.New("invalid provider cancel request")
	ErrProviderCancelFailed  = errors.New("provider cancel failed")
	ErrRetryableCancelReason = errors.New("retryable provider cancel failure")
)

const (
	cancelStateCancelled = "cancelled"
	cancelStateFailed    = "failed"
)

type CancelOptions struct {
	MaxAttempts      int           `json:"maxAttempts"`
	InitialBackoff   time.Duration `json:"initialBackoff"`
	MaxBackoff       time.Duration `json:"maxBackoff"`
	FallbackAdapters []string      `json:"fallbackAdapters,omitempty"`
}

func DefaultCancelOptions() CancelOptions {
	return CancelOptions{
		MaxAttempts:    3,
		InitialBackoff: 100 * time.Millisecond,
		MaxBackoff:     2 * time.Second,
	}
}

type CancelResult struct {
	State            string          `json:"state"`
	PlayerID         string          `json:"playerId"`
	BetID            string          `json:"betId"`
	RequestID        string          `json:"requestId"`
	Adapter          string          `json:"adapter,omitempty"`
	TriedAdapters    []string        `json:"triedAdapters,omitempty"`
	Attempts         int             `json:"attempts"`
	RetryCount       int             `json:"retryCount"`
	FallbackUsed     bool            `json:"fallbackUsed,omitempty"`
	ProviderRevision int64           `json:"providerRevision,omitempty"`
	Bet              canonicalv1.Bet `json:"bet,omitempty"`
	LastError        string          `json:"lastError,omitempty"`
	UpdatedAt        string          `json:"updatedAt"`
}

type CancelMetrics struct {
	TotalAttempts int64 `json:"totalAttempts"`
	TotalRetries  int64 `json:"totalRetries"`
	TotalFallback int64 `json:"totalFallback"`
	TotalSuccess  int64 `json:"totalSuccess"`
	TotalFailed   int64 `json:"totalFailed"`
}

type CancelExecutor struct {
	registry *adapter.Registry
	options  CancelOptions

	mu    sync.RWMutex
	cache map[string]CancelResult
	stats CancelMetrics
}

func NewCancelExecutor(registry *adapter.Registry, options CancelOptions) (*CancelExecutor, error) {
	if registry == nil {
		return nil, fmt.Errorf("registry is required")
	}
	options = normalizeCancelOptions(options)
	return &CancelExecutor{
		registry: registry,
		options:  options,
		cache:    map[string]CancelResult{},
	}, nil
}

func (e *CancelExecutor) Cancel(
	ctx context.Context,
	primaryAdapter string,
	request adapter.CancelBetRequest,
) (CancelResult, error) {
	normalized, err := normalizeCancelRequest(request)
	if err != nil {
		return CancelResult{State: cancelStateFailed, LastError: err.Error()}, err
	}

	cacheKey := cancelRequestKey(normalized)
	if cached, found := e.getCached(cacheKey); found {
		if cached.State == cancelStateCancelled {
			return cached, nil
		}
		return cached, fmt.Errorf("%w: %s", ErrProviderCancelFailed, cached.LastError)
	}

	adapterOrder := orderedCancelAdapters(primaryAdapter, e.options.FallbackAdapters)
	if len(adapterOrder) == 0 {
		failed := CancelResult{
			State:     cancelStateFailed,
			PlayerID:  normalized.PlayerID,
			BetID:     normalized.BetID,
			RequestID: normalized.RequestID,
			LastError: "no adapter configured for cancellation",
			UpdatedAt: time.Now().UTC().Format(time.RFC3339),
		}
		e.storeCached(cacheKey, failed)
		return failed, fmt.Errorf("%w: %s", ErrProviderCancelFailed, failed.LastError)
	}

	result := CancelResult{
		State:         cancelStateFailed,
		PlayerID:      normalized.PlayerID,
		BetID:         normalized.BetID,
		RequestID:     normalized.RequestID,
		TriedAdapters: []string{},
		UpdatedAt:     time.Now().UTC().Format(time.RFC3339),
	}

	for idx, adapterName := range adapterOrder {
		adapterImpl, getErr := e.registry.Get(adapterName)
		result.TriedAdapters = append(result.TriedAdapters, adapterName)
		if getErr != nil {
			result.LastError = getErr.Error()
			continue
		}

		for attempt := 1; attempt <= e.options.MaxAttempts; attempt++ {
			if err := ctx.Err(); err != nil {
				result.LastError = err.Error()
				result.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
				e.storeCached(cacheKey, result)
				e.incrementFailed(1)
				return result, fmt.Errorf("%w: %s", ErrProviderCancelFailed, result.LastError)
			}

			result.Attempts++
			e.incrementAttempts(1)
			response, cancelErr := adapterImpl.CancelBet(ctx, normalized)
			if cancelErr == nil {
				result.State = cancelStateCancelled
				result.Adapter = adapterName
				result.FallbackUsed = idx > 0
				result.ProviderRevision = response.ProviderRevision
				result.Bet = response.Bet
				result.LastError = ""
				result.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
				e.storeCached(cacheKey, result)
				e.incrementSuccess(result.FallbackUsed)
				return result, nil
			}

			result.LastError = cancelErr.Error()
			if !isRetryableCancelError(cancelErr) {
				result.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
				e.storeCached(cacheKey, result)
				e.incrementFailed(1)
				return result, fmt.Errorf("%w: %v", ErrProviderCancelFailed, cancelErr)
			}

			if attempt == e.options.MaxAttempts {
				break
			}

			wait := exponentialBackoff(e.options.InitialBackoff, e.options.MaxBackoff, attempt)
			if wait > 0 {
				timer := time.NewTimer(wait)
				select {
				case <-ctx.Done():
					timer.Stop()
					result.LastError = ctx.Err().Error()
					result.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
					e.storeCached(cacheKey, result)
					e.incrementFailed(1)
					return result, fmt.Errorf("%w: %s", ErrProviderCancelFailed, result.LastError)
				case <-timer.C:
				}
			}
			result.RetryCount++
			e.incrementRetries(1)
		}
	}

	result.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	e.storeCached(cacheKey, result)
	e.incrementFailed(1)
	return result, fmt.Errorf("%w: %s", ErrProviderCancelFailed, result.LastError)
}

func MarkCancelRetryable(err error) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("%w: %v", ErrRetryableCancelReason, err)
}

func isRetryableCancelError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return false
	}
	if errors.Is(err, ErrRetryableCancelReason) {
		return true
	}

	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}
	return false
}

func normalizeCancelOptions(options CancelOptions) CancelOptions {
	if options.MaxAttempts <= 0 {
		options.MaxAttempts = DefaultCancelOptions().MaxAttempts
	}
	if options.InitialBackoff < 0 {
		options.InitialBackoff = 0
	}
	if options.MaxBackoff < 0 {
		options.MaxBackoff = 0
	}
	if options.MaxBackoff > 0 && options.InitialBackoff > options.MaxBackoff {
		options.InitialBackoff = options.MaxBackoff
	}
	return options
}

func normalizeCancelRequest(request adapter.CancelBetRequest) (adapter.CancelBetRequest, error) {
	request.PlayerID = strings.TrimSpace(request.PlayerID)
	request.BetID = strings.TrimSpace(request.BetID)
	request.RequestID = strings.TrimSpace(request.RequestID)
	request.Reason = strings.TrimSpace(request.Reason)

	if request.PlayerID == "" || request.BetID == "" {
		return adapter.CancelBetRequest{}, ErrInvalidCancelRequest
	}
	if request.RequestID == "" {
		request.RequestID = "cancel:" + request.BetID
	}
	return request, nil
}

func orderedCancelAdapters(primary string, fallback []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, 1+len(fallback))
	appendIfNew := func(value string) {
		name := strings.TrimSpace(strings.ToLower(value))
		if name == "" {
			return
		}
		if _, found := seen[name]; found {
			return
		}
		seen[name] = struct{}{}
		out = append(out, name)
	}

	appendIfNew(primary)
	for _, name := range fallback {
		appendIfNew(name)
	}
	return out
}

func cancelRequestKey(request adapter.CancelBetRequest) string {
	return strings.TrimSpace(request.PlayerID) + "|" +
		strings.TrimSpace(request.BetID) + "|" +
		strings.TrimSpace(request.RequestID)
}

func exponentialBackoff(initial time.Duration, max time.Duration, attempt int) time.Duration {
	if initial <= 0 || attempt <= 0 {
		return 0
	}
	wait := initial
	for i := 1; i < attempt; i++ {
		wait *= 2
		if max > 0 && wait >= max {
			return max
		}
	}
	if max > 0 && wait > max {
		return max
	}
	return wait
}

func (e *CancelExecutor) getCached(key string) (CancelResult, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	result, found := e.cache[key]
	return result, found
}

func (e *CancelExecutor) storeCached(key string, result CancelResult) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.cache[key] = result
}

func (e *CancelExecutor) Metrics() CancelMetrics {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.stats
}

func (e *CancelExecutor) incrementAttempts(value int64) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.stats.TotalAttempts += value
}

func (e *CancelExecutor) incrementRetries(value int64) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.stats.TotalRetries += value
}

func (e *CancelExecutor) incrementSuccess(fallback bool) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.stats.TotalSuccess++
	if fallback {
		e.stats.TotalFallback++
	}
}

func (e *CancelExecutor) incrementFailed(value int64) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.stats.TotalFailed += value
}
