# MS-003 Sport-Agnostic Ingestion Runtime Foundation Progress

Date: 2026-03-06  
Scope: Phase 9 ingestion refactor foundation in Go gateway provider runtime (`MS-003`).

## Delivered

1. Added sport-aware routing metadata in provider runtime event processing:
   - runtime now resolves `sportKey` per event from canonical payload fields (`sportKey` / `sportId`) with alias normalization.
   - fixture/market-to-sport caches now allow market events without explicit sport fields to inherit sport from prior fixture events.
2. Added per-sport partition telemetry model:
   - new `SportPartitionStatus` surface keyed by `adapter + stream + sportKey`.
   - runtime tracks applied/skipped/replay/duplicates/gaps/errors/lag by sport partition.
   - new runtime API: `PartitionSnapshot()`.
3. Extended stream-level telemetry with routing observability:
   - `lastSportKey`, `routedCount`, `unknownSports` on `StreamStatus`.
4. Refactored snapshot replay path to process event-by-event through the same routing/telemetry pipeline used by live stream events.
5. Exposed sport-partition telemetry to admin surfaces:
   - `GET /api/v1/admin/config` now includes `providerRuntime.partitions`.
   - `GET /api/v1/admin/feed-health` now includes top-level `partitions` and summary fields:
     - `partitionCount`
     - `bySport` (aggregated partition health by canonical sport key).
6. Extended Prometheus provider metrics with partition-level series:
   - `phoenix_provider_partitions_total`
   - `phoenix_provider_partition_applied_total`
   - `phoenix_provider_partition_skipped_total`
   - `phoenix_provider_partition_replay_total`
   - `phoenix_provider_partition_duplicates_total`
   - `phoenix_provider_partition_gaps_total`
   - `phoenix_provider_partition_errors_total`
   - `phoenix_provider_partition_last_lag_ms`
   - `phoenix_provider_partition_unhealthy`
7. Added and activated sport allow-list runtime gating:
   - `GATEWAY_PROVIDER_ENABLED_SPORTS` now enforces sport-level filtering at replay/apply time.
   - filtered events remain checkpoint-safe (revision/sequence advance preserved) while being excluded from sink apply.
8. Extended filtered telemetry across stream/partition summaries and metrics:
   - stream + partition `filteredCount` now flow into feed-health summary payloads and Prometheus metrics.
   - new metric series:
     - `phoenix_provider_stream_filtered_total`
     - `phoenix_provider_partition_filtered_total`

## Files Changed

1. `go-platform/services/gateway/internal/provider/runtime.go`
2. `go-platform/services/gateway/internal/provider/bootstrap.go`
3. `go-platform/services/gateway/internal/provider/bootstrap_test.go`
4. `go-platform/services/gateway/internal/provider/health.go`
5. `go-platform/services/gateway/internal/provider/health_test.go`
6. `go-platform/services/gateway/internal/provider/metrics.go`
7. `go-platform/services/gateway/internal/provider/runtime_test.go`
8. `go-platform/services/gateway/internal/http/admin_handlers.go`
9. `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

1. Provider runtime + health targeted tests:

```bash
cd go-platform/services/gateway
go test ./internal/provider -run 'TestRuntimeFiltersEventsForDisabledSports|TestRuntimeExposesSportPartitionStatuses|TestRuntimeRoutesMarketEventsToFixtureSportPartition|TestRuntimeProcessesMultipleStreams|TestSummarizeSportPartitionsGroupsBySportKey|TestSummarizeFeedHealthDetectsBreaches|TestRenderPrometheusFeedMetricsIncludesStreamSeries|TestBuildRuntimeOptionsFromEnvDefaults|TestBuildRuntimeOptionsFromEnvOverrides' -v
```

2. Admin runtime telemetry tests:

```bash
cd go-platform/services/gateway
go test ./internal/http -run 'TestAdminConfigIncludesProviderRuntimeWhenEnabled|TestAdminFeedHealthWithProviderRuntimeEnabled' -v
```

3. Gateway compile sanity:

```bash
cd go-platform/services/gateway
go test ./... -run '^$'
```

All above commands pass.

## Notes

1. This is the `MS-003` runtime foundation slice; it introduces sport partitions and sport-aware routing/observability without changing external provider adapter contracts.
2. Remaining `MS-003` expansion scope is per-sport worker execution policy and startup concurrency controls; allow-list gating and filtered telemetry are now active.
