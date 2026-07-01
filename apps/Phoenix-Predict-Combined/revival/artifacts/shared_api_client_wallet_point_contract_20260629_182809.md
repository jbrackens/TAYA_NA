# Shared API Client Wallet Point Contract Artifact

- Report: `revival/88_SHARED_API_CLIENT_WALLET_POINT_CONTRACT.md`
- Changed files:
  - `talon-backoffice/packages/api-client/src/types.ts`
  - `talon-backoffice/packages/api-client/src/client.ts`
  - `talon-backoffice/packages/app/app/__tests__/wallet-paths.test.ts`

## Result

The shared API-client wallet exports now use point-native fields and `PTS`
units. Retired `amountCents` and `balanceCents` fields remain only as private
compatibility fallbacks in the client normalizer.

## Commands

```sh
npx tsx --test app/__tests__/wallet-paths.test.ts
npm run build
go test ./services/gateway/internal/http -run TestLaunchDocsStayPointsOnly -count=1
rg -n "balanceCents|amountCents|availableCents|reservedCents|Phoenix Sportsbook" talon-backoffice/packages/api-client/src/types.ts
make qa-preservation-modifications
git diff --check
make qa-rc-completion-audit
```

## Evidence

- Focused wallet regression: passed, 19 tests.
- Shared API-client TypeScript build: passed.
- Launch docs point-only test: passed.
- Shared exported wallet types scan: no retired cent aliases.
- Preservation modification gate: passed,
  `revival/artifacts/preservation_modification_map_20260629_162742.md`.
- RC completion audit: failed as intended because scenarios 4, 6, 7, 9, 10,
  11, and 12 remain Partial.
