package provider

import (
	"context"
	"errors"
	"testing"
	"time"

	"phoenix-revival/platform/canonical/adapter"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestCancelExecutorRetriesTransientAndCachesSuccess(t *testing.T) {
	primary := &cancelTestAdapter{
		name: "odds88-demo",
		cancelResults: []cancelCallResult{
			{err: MarkCancelRetryable(errors.New("timeout"))},
			{response: adapter.CancelBetResponse{Bet: canonicalv1.Bet{BetID: "b-1", Status: canonicalv1.BetStatusCancelled}}},
		},
	}
	registry, err := adapter.NewRegistry(primary)
	if err != nil {
		t.Fatalf("registry init: %v", err)
	}

	executor, err := NewCancelExecutor(registry, CancelOptions{
		MaxAttempts:    3,
		InitialBackoff: time.Millisecond,
		MaxBackoff:     time.Millisecond,
	})
	if err != nil {
		t.Fatalf("cancel executor init: %v", err)
	}

	request := adapter.CancelBetRequest{PlayerID: "u-1", BetID: "b-1", RequestID: "req-1"}

	first, err := executor.Cancel(context.Background(), "odds88-demo", request)
	if err != nil {
		t.Fatalf("cancel request failed: %v", err)
	}
	if first.State != cancelStateCancelled {
		t.Fatalf("expected state=%s, got %s", cancelStateCancelled, first.State)
	}
	if first.Attempts != 2 {
		t.Fatalf("expected 2 attempts, got %d", first.Attempts)
	}
	if first.RetryCount != 1 {
		t.Fatalf("expected retryCount=1, got %d", first.RetryCount)
	}
	if primary.cancelCallCount != 2 {
		t.Fatalf("expected provider call count=2, got %d", primary.cancelCallCount)
	}
	metrics := executor.Metrics()
	if metrics.TotalAttempts != 2 {
		t.Fatalf("expected total attempts=2, got %d", metrics.TotalAttempts)
	}
	if metrics.TotalRetries != 1 {
		t.Fatalf("expected total retries=1, got %d", metrics.TotalRetries)
	}
	if metrics.TotalSuccess != 1 {
		t.Fatalf("expected total success=1, got %d", metrics.TotalSuccess)
	}

	second, err := executor.Cancel(context.Background(), "odds88-demo", request)
	if err != nil {
		t.Fatalf("cached cancel request failed: %v", err)
	}
	if second.State != cancelStateCancelled {
		t.Fatalf("expected cached state=%s, got %s", cancelStateCancelled, second.State)
	}
	if primary.cancelCallCount != 2 {
		t.Fatalf("expected cached result to skip provider call, count=%d", primary.cancelCallCount)
	}
}

func TestCancelExecutorFallsBackAfterRetryExhaustion(t *testing.T) {
	primary := &cancelTestAdapter{
		name: "odds88-demo",
		cancelResults: []cancelCallResult{
			{err: MarkCancelRetryable(errors.New("stream timeout"))},
			{err: MarkCancelRetryable(errors.New("stream timeout"))},
		},
	}
	fallback := &cancelTestAdapter{
		name: "betby-demo",
		cancelResults: []cancelCallResult{
			{response: adapter.CancelBetResponse{Bet: canonicalv1.Bet{BetID: "b-2", Status: canonicalv1.BetStatusCancelled}}},
		},
	}
	registry, err := adapter.NewRegistry(primary, fallback)
	if err != nil {
		t.Fatalf("registry init: %v", err)
	}

	executor, err := NewCancelExecutor(registry, CancelOptions{
		MaxAttempts:      2,
		InitialBackoff:   time.Millisecond,
		MaxBackoff:       time.Millisecond,
		FallbackAdapters: []string{"betby-demo"},
	})
	if err != nil {
		t.Fatalf("cancel executor init: %v", err)
	}

	result, err := executor.Cancel(context.Background(), "odds88-demo", adapter.CancelBetRequest{
		PlayerID:  "u-2",
		BetID:     "b-2",
		RequestID: "req-2",
	})
	if err != nil {
		t.Fatalf("cancel request failed: %v", err)
	}
	if result.State != cancelStateCancelled {
		t.Fatalf("expected state=%s, got %s", cancelStateCancelled, result.State)
	}
	if result.Adapter != "betby-demo" {
		t.Fatalf("expected fallback adapter betby-demo, got %s", result.Adapter)
	}
	if !result.FallbackUsed {
		t.Fatalf("expected fallbackUsed=true")
	}
	if result.Attempts != 3 {
		t.Fatalf("expected 3 total attempts (2 primary + 1 fallback), got %d", result.Attempts)
	}
	if primary.cancelCallCount != 2 {
		t.Fatalf("expected 2 primary calls, got %d", primary.cancelCallCount)
	}
	if fallback.cancelCallCount != 1 {
		t.Fatalf("expected 1 fallback call, got %d", fallback.cancelCallCount)
	}
	metrics := executor.Metrics()
	if metrics.TotalFallback != 1 {
		t.Fatalf("expected total fallback=1, got %d", metrics.TotalFallback)
	}
}

func TestCancelExecutorStopsOnTerminalErrorAndCachesFailure(t *testing.T) {
	primary := &cancelTestAdapter{
		name: "odds88-demo",
		cancelResults: []cancelCallResult{
			{err: errors.New("bet not found on provider")},
		},
	}
	fallback := &cancelTestAdapter{
		name: "betby-demo",
		cancelResults: []cancelCallResult{
			{response: adapter.CancelBetResponse{Bet: canonicalv1.Bet{BetID: "b-3", Status: canonicalv1.BetStatusCancelled}}},
		},
	}
	registry, err := adapter.NewRegistry(primary, fallback)
	if err != nil {
		t.Fatalf("registry init: %v", err)
	}

	executor, err := NewCancelExecutor(registry, CancelOptions{
		MaxAttempts:      3,
		InitialBackoff:   time.Millisecond,
		MaxBackoff:       time.Millisecond,
		FallbackAdapters: []string{"betby-demo"},
	})
	if err != nil {
		t.Fatalf("cancel executor init: %v", err)
	}

	request := adapter.CancelBetRequest{PlayerID: "u-3", BetID: "b-3", RequestID: "req-3"}
	result, err := executor.Cancel(context.Background(), "odds88-demo", request)
	if err == nil {
		t.Fatalf("expected terminal cancel failure")
	}
	if !errors.Is(err, ErrProviderCancelFailed) {
		t.Fatalf("expected ErrProviderCancelFailed, got %v", err)
	}
	if result.State != cancelStateFailed {
		t.Fatalf("expected failed state, got %s", result.State)
	}
	if primary.cancelCallCount != 1 {
		t.Fatalf("expected one primary call, got %d", primary.cancelCallCount)
	}
	if fallback.cancelCallCount != 0 {
		t.Fatalf("expected no fallback calls on terminal error, got %d", fallback.cancelCallCount)
	}

	cached, err := executor.Cancel(context.Background(), "odds88-demo", request)
	if err == nil {
		t.Fatalf("expected cached failure to return error")
	}
	if cached.State != cancelStateFailed {
		t.Fatalf("expected cached failed state, got %s", cached.State)
	}
	if primary.cancelCallCount != 1 {
		t.Fatalf("expected cached failure to skip provider calls, got %d", primary.cancelCallCount)
	}
	metrics := executor.Metrics()
	if metrics.TotalFailed != 1 {
		t.Fatalf("expected total failed=1, got %d", metrics.TotalFailed)
	}
}

func TestCancelExecutorValidatesRequest(t *testing.T) {
	registry, err := adapter.NewRegistry(&cancelTestAdapter{name: "odds88-demo"})
	if err != nil {
		t.Fatalf("registry init: %v", err)
	}
	executor, err := NewCancelExecutor(registry, DefaultCancelOptions())
	if err != nil {
		t.Fatalf("cancel executor init: %v", err)
	}

	_, cancelErr := executor.Cancel(context.Background(), "odds88-demo", adapter.CancelBetRequest{
		PlayerID: "",
		BetID:    "b-1",
	})
	if cancelErr == nil {
		t.Fatalf("expected validation error")
	}
	if !errors.Is(cancelErr, ErrInvalidCancelRequest) {
		t.Fatalf("expected ErrInvalidCancelRequest, got %v", cancelErr)
	}
}

type cancelCallResult struct {
	response adapter.CancelBetResponse
	err      error
}

type cancelTestAdapter struct {
	name            string
	cancelResults   []cancelCallResult
	cancelCallCount int
}

func (a *cancelTestAdapter) Name() string { return a.name }

func (a *cancelTestAdapter) CanonicalSchema() canonicalv1.SchemaInfo {
	return canonicalv1.CurrentSchema()
}

func (a *cancelTestAdapter) SupportedStreams() []canonicalv1.StreamType { return nil }

func (a *cancelTestAdapter) SubscribeStream(
	context.Context,
	canonicalv1.StreamType,
	int64,
) (<-chan canonicalv1.Envelope, <-chan error, error) {
	return nil, nil, nil
}

func (a *cancelTestAdapter) FetchSnapshot(context.Context, canonicalv1.StreamType, int64) ([]canonicalv1.Envelope, error) {
	return nil, nil
}

func (a *cancelTestAdapter) PlaceBet(context.Context, adapter.PlaceBetRequest) (adapter.PlaceBetResponse, error) {
	return adapter.PlaceBetResponse{}, nil
}

func (a *cancelTestAdapter) CancelBet(context.Context, adapter.CancelBetRequest) (adapter.CancelBetResponse, error) {
	a.cancelCallCount++
	if len(a.cancelResults) == 0 {
		return adapter.CancelBetResponse{}, nil
	}
	index := a.cancelCallCount - 1
	if index >= len(a.cancelResults) {
		index = len(a.cancelResults) - 1
	}
	result := a.cancelResults[index]
	return result.response, result.err
}

func (a *cancelTestAdapter) MaxStake(context.Context, adapter.MaxStakeRequest) (adapter.MaxStakeResponse, error) {
	return adapter.MaxStakeResponse{}, nil
}

func (a *cancelTestAdapter) CashoutQuote(context.Context, adapter.CashoutQuoteRequest) (adapter.CashoutQuoteResponse, error) {
	return adapter.CashoutQuoteResponse{}, nil
}

func (a *cancelTestAdapter) CashoutAccept(context.Context, adapter.CashoutAcceptRequest) (adapter.CashoutAcceptResponse, error) {
	return adapter.CashoutAcceptResponse{}, nil
}
