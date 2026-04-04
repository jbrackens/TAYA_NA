package provider

import (
	"context"
	"testing"
	"time"
)

func TestNewRateGovernorFromEnv(t *testing.T) {
	lookup := func(key string) string {
		switch key {
		case "GATEWAY_PROVIDER_RATE_LIMIT_ENABLED":
			return "false"
		case "GATEWAY_PROVIDER_RATE_LIMIT_RPS":
			return "15"
		case "GATEWAY_PROVIDER_RATE_LIMIT_BURST":
			return "3"
		default:
			return ""
		}
	}
	governor := NewRateGovernorFromEnv(lookup)
	if governor == nil {
		t.Fatal("expected governor instance")
	}
	if governor.Enabled() {
		t.Fatal("expected governor disabled from env")
	}
}

func TestRateGovernorWaitAppliesThrottleDelay(t *testing.T) {
	governor := NewRateGovernor(true, 10, 1)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	first, err := governor.Wait(ctx, "adapter|delta|snapshot")
	if err != nil {
		t.Fatalf("unexpected first wait error: %v", err)
	}
	second, err := governor.Wait(ctx, "adapter|delta|snapshot")
	if err != nil {
		t.Fatalf("unexpected second wait error: %v", err)
	}

	if first < 0 {
		t.Fatalf("expected non-negative first wait, got %s", first)
	}
	if second < 50*time.Millisecond {
		t.Fatalf("expected throttled second wait to be >=50ms, got %s", second)
	}
}

func TestRateGovernorDisabledHasNoDelay(t *testing.T) {
	governor := NewRateGovernor(false, 1, 1)
	waited, err := governor.Wait(context.Background(), "adapter|delta|snapshot")
	if err != nil {
		t.Fatalf("unexpected wait error: %v", err)
	}
	if waited != 0 {
		t.Fatalf("expected zero wait when disabled, got %s", waited)
	}
}
