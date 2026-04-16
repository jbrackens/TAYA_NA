package provider

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/platform/canonical/adapter"
	"phoenix-revival/platform/canonical/replay"
)

func BootstrapRuntimeFromEnv(ctx context.Context, sink EventSink) (*Runtime, error) {
	if !strings.EqualFold(strings.TrimSpace(os.Getenv("GATEWAY_PROVIDER_RUNTIME_ENABLED")), "true") {
		return nil, nil
	}

	store, err := buildCheckpointStoreFromEnv()
	if err != nil {
		return nil, err
	}

	registry, err := adapter.NewRegistry(
		NewDemoMultiFeedAdapter("odds88-demo"),
		NewDemoMultiFeedAdapter("betby-demo"),
	)
	if err != nil {
		return nil, err
	}

	engine := replay.NewEngine(store)
	if sink == nil {
		sink = NewMemorySink()
	}
	runtimeOptions := buildRuntimeOptionsFromEnv()
	runtime, err := NewRuntimeWithOptions(registry, engine, sink, runtimeOptions)
	if err != nil {
		return nil, err
	}
	if err := runtime.Start(ctx); err != nil {
		return nil, err
	}

	slog.Info("provider runtime started",
		"adapters", runtime.AdapterNames(),
		"snapshot_enabled", runtimeOptions.EnableSnapshotBootstrap,
		"snapshot_at_revision", runtimeOptions.SnapshotAtRevision,
	)
	return runtime, nil
}

func buildCheckpointStoreFromEnv() (replay.Store, error) {
	mode := strings.TrimSpace(strings.ToLower(os.Getenv("GATEWAY_PROVIDER_CHECKPOINT_MODE")))
	path := strings.TrimSpace(os.Getenv("GATEWAY_PROVIDER_CHECKPOINT_FILE"))
	if mode == "file" || path != "" {
		if path == "" {
			path = filepath.Join(".runtime", "provider", "checkpoints.json")
		}
		return replay.NewFileStore(path)
	}
	return replay.NewMemoryStore(), nil
}

func buildRuntimeOptionsFromEnv() RuntimeOptions {
	options := DefaultRuntimeOptions()
	options.RateGovernor = NewRateGovernorFromEnv(os.Getenv)
	options.CancelOptions = buildCancelOptionsFromEnv(os.Getenv)

	snapshotEnabledRaw := strings.TrimSpace(os.Getenv("GATEWAY_PROVIDER_SNAPSHOT_ENABLED"))
	if snapshotEnabledRaw != "" {
		options.EnableSnapshotBootstrap = strings.EqualFold(snapshotEnabledRaw, "true")
	}

	snapshotRevisionRaw := strings.TrimSpace(os.Getenv("GATEWAY_PROVIDER_SNAPSHOT_REVISION"))
	if snapshotRevisionRaw != "" {
		value, err := strconv.ParseInt(snapshotRevisionRaw, 10, 64)
		if err == nil {
			options.SnapshotAtRevision = value
		}
	}
	options.EnabledSports = splitCSV(strings.TrimSpace(os.Getenv("GATEWAY_PROVIDER_ENABLED_SPORTS")))

	return options
}

func buildCancelOptionsFromEnv(getenv func(string) string) CancelOptions {
	options := DefaultCancelOptions()

	if raw := strings.TrimSpace(getenv("GATEWAY_PROVIDER_CANCEL_MAX_ATTEMPTS")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			options.MaxAttempts = parsed
		}
	}
	if raw := strings.TrimSpace(getenv("GATEWAY_PROVIDER_CANCEL_INITIAL_BACKOFF_MS")); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil && parsed >= 0 {
			options.InitialBackoff = time.Duration(parsed) * time.Millisecond
		}
	}
	if raw := strings.TrimSpace(getenv("GATEWAY_PROVIDER_CANCEL_MAX_BACKOFF_MS")); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil && parsed >= 0 {
			options.MaxBackoff = time.Duration(parsed) * time.Millisecond
		}
	}
	if raw := strings.TrimSpace(getenv("GATEWAY_PROVIDER_CANCEL_FALLBACK_ADAPTERS")); raw != "" {
		options.FallbackAdapters = splitCSV(raw)
	}

	return options
}

func splitCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		out = append(out, value)
	}
	return out
}
