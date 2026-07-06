# 113 - SB-405 Persisted Acknowledgement State Integration

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 47 by persisting Provider Ops stream acknowledgements through gateway admin APIs backed by shared provider-ops audit storage, then wiring Talon to consume the persisted state so acknowledgement ownership survives reloads and is shared across operator sessions.

## Implementation

### 1) Gateway persisted acknowledgement API
Updated:
- `go-platform/services/gateway/internal/http/admin_handlers.go`
- `go-platform/services/gateway/internal/http/handlers_test.go`

Added:
1. `GET /api/v1/admin/provider/acknowledgements` and `POST /api/v1/admin/provider/acknowledgements` (plus `/admin/...` aliases).
2. Acknowledgement payload/response DTOs and stream-key normalization helpers.
3. Persistence path using existing shared provider-ops audit storage via action `provider.stream.acknowledged`.
4. Snapshot builder that reconstructs latest acknowledgement per stream from persisted audit entries.
5. HTTP round-trip test (`TestAdminProviderAcknowledgementsRoundTrip`) including persistence reload behavior.

### 2) Talon Provider Ops integration with persisted source-of-truth
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/contracts.ts`
- `talon-backoffice/packages/office/containers/provider-ops/index.tsx`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

Added:
1. Ack API contracts (`ProviderStreamAcknowledgement*`) and normalization/build helpers.
2. Container wiring for:
   - `GET admin/provider/acknowledgements`
   - `POST admin/provider/acknowledgements`
3. Initial load + refresh hydration from persisted acknowledgement API.
4. Post-submit re-fetch to keep UI aligned with backend source-of-truth.
5. Test updates covering contract normalization and persisted acknowledgement rendering.

### 3) Stability hardening discovered during validation
Updated:
- `go-platform/services/gateway/internal/oddsboosts/service.go`
- `go-platform/services/gateway/internal/oddsboosts/service_test.go`

Adjusted:
1. Replaced hardcoded odds-boost seed base date with dynamic `time.Now().UTC()` so acceptance tests do not decay as wall-clock date advances.
2. Updated expiry test to force expiration relative to seeded `ExpiresAt`, preserving deterministic intent.

## Validation
Executed with Node 20 active for Talon (`nvm use 20`) and Go toolchain for gateway:

1. Provider Ops tests:
- `cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts --passWithNoTests`
- Result: PASS

2. Talon TypeScript gate:
- `cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

3. Gateway HTTP regression focus:
- `cd go-platform/services/gateway && go test ./internal/http/... -count=1`
- Result: PASS

4. Gateway full suite:
- `cd go-platform/services/gateway && go test ./... -count=1`
- Result: PASS

## Outcome
SB-405 acknowledgement ownership is now persisted and shared across operators/reloads through gateway admin APIs and shared provider-ops storage, with Talon consuming backend state as the source-of-truth.

## Next
Backlog item 48:
- Add SB-405 acknowledgement lifecycle controls (resolve/reopen/reassign) with explicit audit actions and operator guardrails.
