# Snapshot Recovery Pipeline Progress (SB-005)

Date: 2026-03-04  
Backlog reference: `SB-005` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added runtime snapshot bootstrap options:
   - `EnableSnapshotBootstrap`
   - `SnapshotAtRevision`
2. Added env-based runtime snapshot configuration:
   - `GATEWAY_PROVIDER_SNAPSHOT_ENABLED` (default: `true`)
   - `GATEWAY_PROVIDER_SNAPSHOT_REVISION` (default: `-1` meaning latest available by provider policy)
3. Implemented snapshot-first recovery flow per stream:
   - load checkpoint
   - fetch snapshot
   - replay snapshot into canonical engine
   - resume stream subscription from resulting checkpoint revision
4. Added snapshot telemetry to stream status:
   - `snapshotApplied`
   - `snapshotSkipped`
   - `lastSnapshotAt`
5. Extended feed summaries and metrics to include snapshot counters:
   - summary: `totalSnapshotApplied`, `totalSnapshotSkipped`
   - metrics:
     - `phoenix_provider_stream_snapshot_applied_total`
     - `phoenix_provider_stream_snapshot_skipped_total`

## Key Files

1. Runtime snapshot flow:
   - `go-platform/services/gateway/internal/provider/runtime.go`
2. Runtime options bootstrap/env parsing:
   - `go-platform/services/gateway/internal/provider/bootstrap.go`
3. Feed summary + thresholds model:
   - `go-platform/services/gateway/internal/provider/health.go`
4. Feed Prometheus metrics:
   - `go-platform/services/gateway/internal/provider/metrics.go`
5. Admin feed-health surface:
   - `go-platform/services/gateway/internal/http/admin_handlers.go`

## Tests Added/Updated

1. `go-platform/services/gateway/internal/provider/runtime_test.go`
   - verifies snapshot is applied before stream subscription and checkpoint-based resume revision is used.
   - verifies snapshot bootstrap can be disabled.
2. `go-platform/services/gateway/internal/provider/bootstrap_test.go`
   - verifies default and override env parsing for snapshot options.
3. `go-platform/services/gateway/internal/provider/health_test.go`
   - verifies snapshot totals are included in feed summary.
4. `go-platform/services/gateway/internal/http/handlers_test.go`
   - verifies feed-health summary includes snapshot totals.
   - verifies `/metrics/feed` exposes snapshot metric series.

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Why this satisfies SB-005 foundation

1. The runtime can now rebuild state from provider snapshots and then catch up from stream revision without duplicate side effects.
2. Snapshot behavior is configurable but enabled by default for cold-start/local reset recovery paths.
3. Recovery visibility is exposed operationally (admin + metrics) for auditing and troubleshooting.

## Next

1. Replace demo adapter snapshot behavior with first production provider implementation.
2. [done] Added targeted replay/snapshot consistency coverage under mandatory gate suites (`SB-501`/`SB-502`):
   - `scripts/qa/go-provider-conformance.sh`
   - `scripts/qa/go-regression-pack.sh`
   - `revival/178_SB501_PROVIDER_CONFORMANCE_REPORT.md`
   - `revival/179_SB502_CANONICAL_REGRESSION_PACK_REPORT.md`
