# Shared API Client Wallet Point Contract

- Date: 2026-06-29
- Scope: shared TypeScript API client wallet exports
- Scenarios: 6, 11, and 12 remain Partial

## Summary

The shared `@phoenix-ui/api-client` wallet contract now exports point-native
wallet fields instead of retired cent aliases:

- `WalletBalance.balancePointsCents`
- `WalletBalance.availablePointsCents`
- `WalletBalance.reservedPointsCents`
- `WalletLedgerEntry.amountPointsCents`
- `WalletLedgerEntry.balancePointsCents`
- `WalletMutationRequest.amountPointsCents`
- `WalletMutationResponse.balancePointsCents`
- `unit: "PTS"`

The client keeps old `amountCents` and `balanceCents` fields only inside
private legacy payload interfaces used as compatibility fallbacks while
normalizing responses to point-native exported shapes.

## Files

- `talon-backoffice/packages/api-client/src/types.ts`
- `talon-backoffice/packages/api-client/src/client.ts`
- `talon-backoffice/packages/app/app/__tests__/wallet-paths.test.ts`

## Verification

- `npx tsx --test app/__tests__/wallet-paths.test.ts` passed with 19 tests.
- `npm run build` passed in `talon-backoffice/packages/api-client`.
- `go test ./services/gateway/internal/http -run TestLaunchDocsStayPointsOnly -count=1`
  passed.
- `rg -n "balanceCents|amountCents|availableCents|reservedCents|Phoenix Sportsbook" talon-backoffice/packages/api-client/src/types.ts`
  returned no matches.
- `make qa-preservation-modifications` passed with 412 classified modified
  artifacts, 92 high-risk contract files, 36 large-change files, tracked line
  churn `+32106 / -6637`, and zero unclassified modified paths. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_162742.md`.
- `git diff --check` passed.
- `make qa-rc-completion-audit` failed as intended with scenarios 4, 6, 7, 9,
  10, 11, and 12 still Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_162803.md`.

## Remaining Risk

This closes one exported wallet API-client alias leak. It does not remove every
private compatibility fallback, prove the full canonical journey, or complete
the broader backend/API terminology cleanup.
