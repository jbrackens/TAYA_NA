# 116 - SB-405 Per-Adapter Acknowledgement SLA Controls

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 50 by introducing persisted acknowledgement SLA settings with operator-tunable default/adapter thresholds, gateway admin API support, and Talon Provider Ops settings UI wired into stale-ownership escalation logic.

## Implementation

### 1) Gateway persisted acknowledgement SLA settings API
Updated:
- `go-platform/services/gateway/internal/http/admin_handlers.go`
- `go-platform/services/gateway/internal/http/handlers_test.go`

Added:
1. New admin endpoint:
   - `GET /api/v1/admin/provider/acknowledgement-sla`
   - `POST /api/v1/admin/provider/acknowledgement-sla`
   - mirrored on `/admin/provider/acknowledgement-sla`
2. Request validation for operator-tunable thresholds:
   - `warningMinutes` must be positive
   - `criticalMinutes` must be greater than `warningMinutes`
3. Persisted updates via provider-ops audit stream with explicit actions:
   - `provider.stream.sla.default.updated`
   - `provider.stream.sla.adapter.updated`
4. Settings snapshot composition model:
   - env-backed default baseline
   - persisted default override
   - per-adapter override list
   - effective adapter thresholds (default fallback + overrides)
5. Admin config enrichment:
   - `providerRuntime.acknowledgementSLA` now exposed in `/admin/config`.

### 2) Gateway SLA helper module
Added:
- `go-platform/services/gateway/internal/http/provider_ack_sla.go`

Features:
1. SLA setting DTOs and normalization helpers.
2. Audit detail serialization/parsing helpers (JSON + key-value fallback).
3. Effective-threshold snapshot builder merging:
   - runtime adapters
   - persisted acknowledgement adapters
   - explicit override adapters
4. Env default support:
   - `GATEWAY_PROVIDER_ACK_SLA_WARNING_MINUTES`
   - `GATEWAY_PROVIDER_ACK_SLA_CRITICAL_MINUTES`

### 3) Talon Provider Ops settings UX + staleness integration
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/contracts.ts`
- `talon-backoffice/packages/office/containers/provider-ops/index.tsx`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`
- `talon-backoffice/packages/office/translations/en/page-provider-ops.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-provider-ops.json`

Added:
1. New Provider Ops contract model for acknowledgement SLA settings:
   - `defaultSetting`, `overrides`, `effectiveByAdapter`
   - update payload builder
   - adapter-threshold resolver
2. New Provider Ops settings card:
   - edit/save default warning/critical thresholds
   - edit/save adapter override thresholds
   - view effective adapter threshold list with source (`default` vs `override`)
3. Staleness evaluation now uses adapter-aware thresholds instead of hard-coded global buckets.
4. Acknowledgement normalization now keeps stream context (`streamKey`, `adapter`, `stream`) so stale counters can be adapter-accurate.

## Validation
Executed with Node 20 active (`nvm use 20`) and Go toolchain for gateway:

1. Gateway targeted SLA + acknowledgement tests:
- `cd go-platform/services/gateway && go test ./internal/http -run "TestAdminProviderAcknowledgementSLASettingsRoundTrip|TestAdminProviderAcknowledgementsRoundTrip|TestAdminProviderAcknowledgementsLifecycleControls|TestAdminFeedHealthWithProviderRuntimeEnabled" -count=1`
- Result: PASS

2. Gateway HTTP package suite:
- `cd go-platform/services/gateway && go test ./internal/http/... -count=1`
- Result: PASS

3. Gateway full suite:
- `cd go-platform/services/gateway && go test ./... -count=1`
- Result: PASS

4. Talon locale generation:
- `cd talon-backoffice && yarn bootstrap:locales`
- Result: PASS

5. Talon Provider Ops tests:
- `cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts --passWithNoTests`
- Result: PASS

6. Talon TypeScript gate:
- `cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Provider Ops now supports persisted, operator-managed acknowledgement SLA thresholds per adapter with default fallbacks, and stale ownership escalation is computed against those effective settings rather than fixed hard-coded windows.

## Next
Backlog item 51:
- Add SB-405 Provider Ops acknowledgement SLA audit ergonomics (human-readable Talon audit labels + direct settings-to-audit deep-link).
