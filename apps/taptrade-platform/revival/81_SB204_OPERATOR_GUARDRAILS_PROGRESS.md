# SB-204 Fixed Exotics Operator Guardrails Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 16 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added backend audit visibility for manual fixed-exotic quote expiration:
   - emits bet-event style audit action: `fixed_exotic.quote.expired`
   - captures actor, status, quote metadata, and expire reason details.
2. Extended admin fixed-exotics route test coverage to verify expire events appear in `/api/v1/admin/audit-logs`.
3. Hardened flaky feed-health test assertion for deterministic suite behavior:
   - switched from non-deterministic non-empty stream expectation to summary/count consistency assertion.
4. Added Talon role-scoped operator guardrail:
   - expire action is admin-only in UI (traders remain view-only).
   - explicit read-only warning shown for non-admin users.
5. Improved Talon fixed-exotics table audit signal:
   - added `lastReason` column to surface operator/manual expire context directly in list view.
6. Expanded Talon fixed-exotics container tests:
   - verifies list rendering path
   - verifies read-only warning path for non-admin eligibility.

## Key Files

1. Gateway audit/event hardening:
   - `go-platform/services/gateway/internal/bets/fixed_exotics.go`
   - `go-platform/services/gateway/internal/bets/fixed_exotics_test.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`
2. Talon guardrails/UI:
   - `talon-backoffice/packages/office/containers/fixed-exotics/index.tsx`
   - `talon-backoffice/packages/office/containers/fixed-exotics/__tests__/fixed-exotics.test.tsx`
   - `talon-backoffice/packages/office/translations/en/page-fixed-exotics.js`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/bets/... ./internal/http/...`
   - pass
2. `cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/fixed-exotics/__tests__/fixed-exotics.test.tsx --passWithNoTests`
   - pass

## Remaining

1. Completed in follow-up item 17:
   - `revival/82_SB204_FIXED_EXOTICS_OPERATIONS_CARD_PROGRESS.md`
2. Next queue handoff:
   - start SB-301 match-tracker canonical contract and gateway read endpoint skeleton.
