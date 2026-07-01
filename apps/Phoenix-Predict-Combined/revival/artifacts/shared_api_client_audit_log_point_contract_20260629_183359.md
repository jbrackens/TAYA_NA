# Shared API Client Audit Log Point Contract Artifact

- Report: `revival/89_SHARED_API_CLIENT_AUDIT_LOG_POINT_CONTRACT.md`
- Changed files:
  - `talon-backoffice/packages/api-client/src/types.ts`
  - `talon-backoffice/packages/api-client/src/client.ts`
  - `talon-backoffice/packages/app/app/__tests__/wallet-paths.test.ts`

## Result

The shared API-client audit-log export now uses point-native fields for point
grant/rule review data. Retired promo fields remain only as private
compatibility fallbacks in `client.ts`.

## Commands

```sh
npx tsx --test app/__tests__/wallet-paths.test.ts
npm run build
go test ./services/gateway/internal/http -run TestLaunchDocsStayPointsOnly -count=1
rg -n "freebetId|oddsBoostId|freebetAppliedCents|balanceCents|amountCents|Phoenix Sportsbook" talon-backoffice/packages/api-client/src/types.ts
make qa-preservation-modifications
git diff --check
make qa-rc-completion-audit
```

## Evidence

- Focused wallet/API contract regression: passed, 20 tests.
- Shared API-client TypeScript build: passed.
- Launch docs point-only test: passed.
- Shared exported type scan: no retired promo or wallet cent aliases.
- Preservation modification gate: passed,
  `revival/artifacts/preservation_modification_map_20260629_163333.md`.
- RC completion audit: failed as intended because scenarios 4, 6, 7, 9, 10,
  11, and 12 remain Partial.
