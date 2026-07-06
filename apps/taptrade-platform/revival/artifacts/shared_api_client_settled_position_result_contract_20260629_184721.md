# Shared API Client Settled Position Result Contract Artifact

- Generated: 2026-06-29T18:47:21+0200
- Report: `revival/91_SHARED_API_CLIENT_SETTLED_POSITION_RESULT_CONTRACT.md`

## Changed Files

- `talon-backoffice/packages/api-client/src/prediction-types.ts`
- `talon-backoffice/packages/api-client/src/prediction-client.ts`
- `talon-backoffice/packages/api-client/src/index.ts`
- `talon-backoffice/packages/app/app/portfolio/page.tsx`
- `talon-backoffice/packages/app/app/__tests__/qa-regressions-2026-04-18.test.ts`

## Contract Result

The shared API-client portfolio-history export is now
`SettledPositionResult`, not `SettledPayout`. The exported row contains
point-native settlement result fields and `PTS` unit metadata. Private legacy
normalization still reads older `pnlCents` and `payoutCents` payloads without
reattaching those fields or re-exporting a payout-named type.

## Verification Evidence

- `npx tsx --test app/__tests__/qa-regressions-2026-04-18.test.ts`
  - Result: pass, 99 tests.
- `npx tsx --test app/__tests__/wallet-paths.test.ts`
  - Result: pass, 21 tests.
- `npm run build`
  - Workdir: `talon-backoffice/packages/api-client`
  - Result: pass.
- `yarn typecheck`
  - Workdir: `talon-backoffice/packages/app`
  - Result: pass, 0 scoped type errors.
- `go test ./services/gateway/internal/http -run TestLaunchDocsStayPointsOnly -count=1`
  - Workdir: `go-platform`
  - Result: pass.
- Focused scan:
  - Result: no exported `SettledPayout` or old normalizer name in edited
    shared API-client files or portfolio page.
- `git diff --check`
  - Result: pass.
- `make qa-preservation-modifications`
  - Result: pass.
  - Artifact: `revival/artifacts/preservation_modification_map_20260629_164651.md`.
- `make qa-rc-completion-audit`
  - Result: expected fail.
  - Partial scenarios: 4, 6, 7, 9, 10, 11, 12.
  - Artifact: `revival/artifacts/rc_completion_audit_gate_20260629_164709.md`.
