# 114 - SB-405 Acknowledgement Lifecycle Controls

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 48 by adding acknowledgement lifecycle controls (`resolve`, `reopen`, `reassign`) with explicit audit actions, backend status reconstruction, and Talon operator controls/guardrails.

## Implementation

### 1) Gateway lifecycle action model and audit mapping
Updated:
- `go-platform/services/gateway/internal/http/admin_handlers.go`
- `go-platform/services/gateway/internal/http/handlers_test.go`

Added:
1. Acknowledgement request `action` support (`acknowledge`, `reassign`, `resolve`, `reopen`).
2. Persisted acknowledgement fields:
   - `status` (`acknowledged` / `resolved`)
   - `lastAction` (`acknowledged` / `reassigned` / `resolved` / `reopened`)
3. Action metadata mapping from request action -> audit action:
   - `provider.stream.acknowledged`
   - `provider.stream.reassigned`
   - `provider.stream.resolved`
   - `provider.stream.reopened`
4. Snapshot logic updated to include all acknowledgement lifecycle audit actions and pick latest stream state deterministically (tie-break by entry ID).
5. Backward-compatible normalization so legacy entries still resolve to valid acknowledgement status/action values.

### 2) Talon provider-ops lifecycle UX
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/contracts.ts`
- `talon-backoffice/packages/office/containers/provider-ops/index.tsx`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

Added:
1. Acknowledgement lifecycle contract types (`ProviderAcknowledgementAction`, `status`, `lastAction`).
2. Action-aware acknowledgement payload builder and response normalization.
3. Acknowledgement form action selector for `acknowledge` / `reassign` / `resolve` / `reopen`.
4. Stream-row lifecycle shortcuts:
   - prepare resolve
   - prepare reopen
   - prepare reassign
5. Table rendering updates:
   - resolved vs acknowledged tag state
   - last action visibility
6. Triage summary split:
   - active acknowledged streams
   - resolved streams
7. Deterministic test hook via `provider-ops-ack-submit` test id for lifecycle submit assertion.

### 3) Translation updates
Updated:
- `talon-backoffice/packages/office/translations/en/page-provider-ops.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-provider-ops.json`

Added keys:
- `TRIAGE_RESOLVED`
- `ACK_FIELD_ACTION`
- `ACK_ACTION_ACKNOWLEDGE`
- `ACK_ACTION_RESOLVE`
- `ACK_ACTION_REOPEN`
- `ACK_ACTION_REASSIGN`
- `ACK_ACTION_PREPARE_RESOLVE`
- `ACK_ACTION_PREPARE_REOPEN`
- `ACK_ACTION_PREPARE_REASSIGN`
- `ACK_STATUS_RESOLVED`

## Validation
Executed with Node 20 active for Talon (`nvm use 20`) and Go toolchain for gateway:

1. Gateway lifecycle-focused HTTP tests:
- `cd go-platform/services/gateway && go test ./internal/http -run "TestAdminProviderAcknowledgementsRoundTrip|TestAdminProviderAcknowledgementsLifecycleControls" -count=1`
- Result: PASS

2. Gateway HTTP suite:
- `cd go-platform/services/gateway && go test ./internal/http/... -count=1`
- Result: PASS

3. Gateway full suite:
- `cd go-platform/services/gateway && go test ./... -count=1`
- Result: PASS

4. Talon provider-ops tests:
- `cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts --passWithNoTests`
- Result: PASS

5. Talon TypeScript gate:
- `cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Provider-ops acknowledgements now support full lifecycle transitions with explicit auditable action semantics and operator-visible status progression, instead of single-shot acknowledgement writes.

## Next
Backlog item 49:
- Add SB-405 acknowledgement SLA escalation and stale-ownership reminders (age-based warning buckets + targeted audit deep-link shortcuts).
