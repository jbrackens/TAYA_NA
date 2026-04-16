package provider

import "testing"

func TestBuildRuntimeOptionsFromEnvDefaults(t *testing.T) {
	t.Setenv("GATEWAY_PROVIDER_SNAPSHOT_ENABLED", "")
	t.Setenv("GATEWAY_PROVIDER_SNAPSHOT_REVISION", "")
	t.Setenv("GATEWAY_PROVIDER_RATE_LIMIT_ENABLED", "")
	t.Setenv("GATEWAY_PROVIDER_RATE_LIMIT_RPS", "")
	t.Setenv("GATEWAY_PROVIDER_RATE_LIMIT_BURST", "")
	t.Setenv("GATEWAY_PROVIDER_CANCEL_MAX_ATTEMPTS", "")
	t.Setenv("GATEWAY_PROVIDER_CANCEL_INITIAL_BACKOFF_MS", "")
	t.Setenv("GATEWAY_PROVIDER_CANCEL_MAX_BACKOFF_MS", "")
	t.Setenv("GATEWAY_PROVIDER_CANCEL_FALLBACK_ADAPTERS", "")
	t.Setenv("GATEWAY_PROVIDER_ENABLED_SPORTS", "")

	options := buildRuntimeOptionsFromEnv()
	if !options.EnableSnapshotBootstrap {
		t.Fatal("expected snapshot bootstrap enabled by default")
	}
	if options.SnapshotAtRevision != -1 {
		t.Fatalf("expected default SnapshotAtRevision=-1, got %d", options.SnapshotAtRevision)
	}
	if options.RateGovernor == nil {
		t.Fatal("expected rate governor to be initialized")
	}
	if !options.RateGovernor.Enabled() {
		t.Fatal("expected rate governor enabled by default")
	}
	if options.CancelOptions.MaxAttempts != DefaultCancelOptions().MaxAttempts {
		t.Fatalf("expected default cancel attempts=%d, got %d", DefaultCancelOptions().MaxAttempts, options.CancelOptions.MaxAttempts)
	}
	if len(options.EnabledSports) != 0 {
		t.Fatalf("expected default enabled sports empty, got %v", options.EnabledSports)
	}
}

func TestBuildRuntimeOptionsFromEnvOverrides(t *testing.T) {
	t.Setenv("GATEWAY_PROVIDER_SNAPSHOT_ENABLED", "false")
	t.Setenv("GATEWAY_PROVIDER_SNAPSHOT_REVISION", "42")
	t.Setenv("GATEWAY_PROVIDER_RATE_LIMIT_ENABLED", "false")
	t.Setenv("GATEWAY_PROVIDER_RATE_LIMIT_RPS", "5")
	t.Setenv("GATEWAY_PROVIDER_RATE_LIMIT_BURST", "2")
	t.Setenv("GATEWAY_PROVIDER_CANCEL_MAX_ATTEMPTS", "4")
	t.Setenv("GATEWAY_PROVIDER_CANCEL_INITIAL_BACKOFF_MS", "50")
	t.Setenv("GATEWAY_PROVIDER_CANCEL_MAX_BACKOFF_MS", "500")
	t.Setenv("GATEWAY_PROVIDER_CANCEL_FALLBACK_ADAPTERS", "betby-demo,odds88-demo")
	t.Setenv("GATEWAY_PROVIDER_ENABLED_SPORTS", "esports,mlb,nfl")

	options := buildRuntimeOptionsFromEnv()
	if options.EnableSnapshotBootstrap {
		t.Fatal("expected snapshot bootstrap disabled")
	}
	if options.SnapshotAtRevision != 42 {
		t.Fatalf("expected SnapshotAtRevision=42, got %d", options.SnapshotAtRevision)
	}
	if options.RateGovernor == nil {
		t.Fatal("expected rate governor to be initialized")
	}
	if options.RateGovernor.Enabled() {
		t.Fatal("expected rate governor disabled from env")
	}
	if options.CancelOptions.MaxAttempts != 4 {
		t.Fatalf("expected cancel max attempts=4, got %d", options.CancelOptions.MaxAttempts)
	}
	if len(options.CancelOptions.FallbackAdapters) != 2 {
		t.Fatalf("expected 2 cancel fallback adapters, got %d", len(options.CancelOptions.FallbackAdapters))
	}
	if len(options.EnabledSports) != 3 {
		t.Fatalf("expected 3 enabled sports, got %d", len(options.EnabledSports))
	}
	if options.EnabledSports[0] != "esports" || options.EnabledSports[1] != "mlb" || options.EnabledSports[2] != "nfl" {
		t.Fatalf("unexpected enabled sports ordering/value: %v", options.EnabledSports)
	}
}
