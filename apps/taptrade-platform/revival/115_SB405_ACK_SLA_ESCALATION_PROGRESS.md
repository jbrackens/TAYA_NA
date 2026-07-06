# 115 - SB-405 Acknowledgement SLA Escalation

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 49 by adding acknowledgement SLA ageing signals and stale-ownership reminders in Talon Provider Ops, including stale-state tagging and acknowledgement-focused audit deep-link support.

## Implementation

### 1) SLA/staleness contract helpers
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/contracts.ts`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`

Added:
1. `AcknowledgementStaleness` model (`fresh`, `warning`, `critical`).
2. `computeAcknowledgementStaleness(acknowledgedAt)` with threshold buckets:
   - warning: >= 15 minutes
   - critical: >= 30 minutes
3. `buildProviderAcknowledgementAuditLogQuery(...)` to deep-link stale entries to acknowledgment lifecycle audit logs using stream `targetId`.

### 2) Provider Ops stale ownership UX
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/index.tsx`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

Added:
1. Stale acknowledgement counters in triage summary (`TRIAGE_ACK_STALE`).
2. Staleness badges in stream acknowledgement cells:
   - `ACK_STALE_WARNING`
   - `ACK_STALE_CRITICAL`
3. Conditional stale-audit action button on stream rows for unresolved stale ownership (`ACK_ACTION_STALE_AUDIT`).
4. Router deep-link wiring for acknowledgement audit context.

### 3) Translation updates
Updated:
- `talon-backoffice/packages/office/translations/en/page-provider-ops.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-provider-ops.json`

Added keys:
- `TRIAGE_ACK_STALE`
- `ACK_ACTION_STALE_AUDIT`
- `ACK_STALE_WARNING`
- `ACK_STALE_CRITICAL`

## Validation
Executed with Node 20 active (`nvm use 20`):

1. Locale generation:
- `cd talon-backoffice && yarn bootstrap:locales`
- Result: PASS

2. Provider Ops tests:
- `cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts --passWithNoTests`
- Result: PASS

3. Office TypeScript gate:
- `cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

4. Gateway regression confidence (unchanged by this slice):
- `cd go-platform/services/gateway && go test ./... -count=1`
- Result: PASS

## Outcome
Provider Ops now proactively signals stale triage ownership with SLA buckets and gives operators a direct route into acknowledgement audit history for follow-up and escalation.

## Next
Backlog item 50:
- Add SB-405 per-adapter acknowledgement SLA controls (operator-tunable warning/critical thresholds with saved defaults surfaced in Provider Ops settings).
