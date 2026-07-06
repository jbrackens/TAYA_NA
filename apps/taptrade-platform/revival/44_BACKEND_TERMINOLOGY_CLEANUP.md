# Loop 360 - Backend Terminology Cleanup

Generated: 2026-06-28 22:13 Europe/Malta

## Summary

Loop 360 removes another narrow set of launch-prohibited money/stake wording from
active backend and launch app source surfaces while preserving inherited storage
and compatibility contracts.

The most important behavior-facing change is the void-refund wallet ledger
reason: prediction void credits now say `returning locked points` instead of
`returning stake`.

## Changed Surfaces

- `go-platform/services/gateway/internal/prediction/settlement.go`
  - Void-refund ledger reason now says `returning locked points`.
  - Resolution-dispute comment now says voiding returns locked points.
- `go-platform/services/gateway/internal/wallet/service.go`
  - Production wallet-store fatal log now warns about production point ledgers,
    not real money.
  - Reservation comments now describe point operations instead of bet or
    withdrawal examples.
  - Balance-breakdown comments now describe regular points and bonus points.
- `go-platform/services/gateway/internal/wallet/bonus_ops.go`
  - Bonus conversion comments now describe play-through and gameplay points.
- `go-platform/services/gateway/internal/wallet/wagering.go`
  - Comments now clarify the inherited storage names and point-native launch
    aliases.
- `talon-backoffice/packages/app/app/globals.css`
  - Numeric typography comment now refers to point amounts.
- `talon-backoffice/packages/office/app/(dashboard)/layout.tsx`
  - Admin shell comment now refers to point-account state instead of financials.

## Verification

```sh
gofmt -w \
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/service.go \
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/bonus_ops.go \
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/wagering.go \
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/settlement.go

git diff --check -- \
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/service.go \
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/bonus_ops.go \
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/wagering.go \
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/settlement.go \
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/globals.css \
  'apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/layout.tsx'

rg -n "returning stake|real money|dollar amounts|financials \\(wallet balance|portfolio P&L|refund stakes" \
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet \
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/settlement.go \
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/globals.css \
  'apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/layout.tsx'

go test ./internal/wallet ./internal/prediction -run 'Test|$^'

bash -n apps/Phoenix-Predict-Combined/scripts/qa/preservation-modification-gate.sh
make qa-preservation-modifications
```

Results:

- Targeted `git diff --check` passed.
- Targeted unsafe-phrase scan returned no matches.
- `go test ./internal/wallet ./internal/prediction -run 'Test|$^'` passed.
- `make qa-preservation-modifications` passed after classifying
  `talon-backoffice/packages/app/app/globals.css` as a player launch surface:
  392 modified artifacts, 89 high-risk contract files, 35 large-change files,
  tracked line churn `+31355 / -6143`.

## Scenario Impact

- Scenario 12 Safety, compliance, and trust boundary: still Partial, but one
  more backend ledger/log/comment cluster now uses point-native launch wording.

Remaining before RC: broader backend terminology cleanup, complete preservation
review, dependency/security risk triage, and final RC audit.
