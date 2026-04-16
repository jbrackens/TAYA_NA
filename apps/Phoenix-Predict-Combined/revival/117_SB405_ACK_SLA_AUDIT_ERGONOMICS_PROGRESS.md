# 117 - SB-405 Acknowledgement SLA Audit Ergonomics

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 51 by improving provider-ops acknowledgement SLA audit usability: added explicit gateway `targetId` filtering for admin audit logs, added provider-ops settings deep-links into scoped SLA audit history, and introduced human-readable Talon audit labels for SLA update actions.

## Implementation

### 1) Gateway audit filter enhancement
Updated:
- `go-platform/services/gateway/internal/http/admin_handlers.go`
- `go-platform/services/gateway/internal/http/handlers_test.go`

Added:
1. `targetId` query parsing in admin audit-log list handlers.
2. Audit filtering by `entry.TargetID` in `filterAuditEntries(...)`.
3. Coverage in SLA settings roundtrip test to ensure `targetId` narrowing returns only matching entries.

### 2) Provider Ops deep-link ergonomics
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/contracts.ts`
- `talon-backoffice/packages/office/containers/provider-ops/index.tsx`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

Added:
1. `buildProviderAcknowledgementSLAAuditLogQuery(...)` helper to standardize SLA audit routing params.
2. Provider Ops settings CTA (`ACK_SLA_ACTION_OPEN_AUDIT`) linking directly into `/logs` with SLA action + target scope.
3. Tests validating query payload generation and router navigation behavior.

### 3) Human-readable audit labels for SLA actions
Updated:
- `talon-backoffice/packages/office/components/audit-logs/utils/resolvers.ts`
- `talon-backoffice/packages/office/components/audit-logs/utils/__tests__/resolvers.test.ts`
- `talon-backoffice/packages/office/translations/en/page-audit-logs.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-audit-logs.json`

Added/confirmed mappings:
- `provider.stream.sla.default.updated` -> `CELL_ACTION_PROVIDER_ACK_SLA_DEFAULT_UPDATED`
- `provider.stream.sla.adapter.updated` -> `CELL_ACTION_PROVIDER_ACK_SLA_ADAPTER_UPDATED`

## Validation
1. Gateway targeted tests:
- `cd go-platform/services/gateway && go test ./internal/http -run "TestAdminProviderAcknowledgementSLASettingsRoundTrip|TestAdminAuditLogsListApiV1PathWithAdminRole" -count=1`
- Result: PASS

2. Talon tests (provider-ops + resolver coverage):
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts --passWithNoTests`
- Result: PASS

## Outcome
Provider Ops now offers operator-friendly SLA audit navigation and readable SLA action labels, while gateway audit APIs support scoped `targetId` filtering to keep incident timelines focused.

## Next
Queue item 52:
- Close Talon audit-log `targetId` filter parity so deep-links pass through router/UI/API filter layers end-to-end.
