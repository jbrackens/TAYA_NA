# Admin Settlement API Journey

- Generated: `2026-06-28T18:13:50Z`
- Scope: Tiangge live DB-backed critical-path API proof
- Stack:
  - Auth: `http://127.0.0.1:18081`
  - Gateway: `http://127.0.0.1:18180`
  - Player same-origin proxy: `http://127.0.0.1:3022`
  - Postgres: disposable `postgres:16-alpine` container `tiangge-e2e-pg-355` on port `56549`

## What Changed

The Playwright prediction critical-path API spec now includes same-run admin lifecycle and settlement proof:

- Registers a fresh launch-disclosure user.
- Claims starter points.
- Places a real YES order on an open order-book market.
- Logs in as admin and closes the market through `/api/v1/admin/markets/{id}/lifecycle/close`.
- Resolves the market YES through `/api/v1/admin/settlements/{marketId}`.
- Verifies the settlement response is point-native:
  - `unit: "PTS"`
  - `settlement.result: "yes"`
  - `tianggeLifecycle.stage: "settled"`
  - user `pointDisbursements` row with `settlementPointsCents`
  - no top-level retired `payouts`, `payoutCents`, `totalPayoutCents`, or `currency`
- Verifies lifecycle audit includes closed and settled events with Tiangge lifecycle stages.
- Logs back in as the user and verifies:
  - wallet ledger contains a `prediction_payout:{marketId}:...` idempotency key
  - wallet ledger reason starts with `prediction settlement:`
  - ledger fields are `amountPointsCents` and `balancePointsCents`, not retired cents aliases
  - portfolio history contains the settled market row with matching `settlementPointsCents`

## Verification

Fresh DB setup:

```sh
GATEWAY_DB_DRIVER=postgres \
GATEWAY_DB_DSN='postgres://postgres:postgres@127.0.0.1:56549/postgres?sslmode=disable' \
MIGRATIONS_DIR=migrations \
go run ./cmd/migrate up

GATEWAY_DB_DSN='postgres://postgres:postgres@127.0.0.1:56549/postgres?sslmode=disable' \
go run ./cmd/seed -mode demo
```

Health:

```txt
auth=200
gateway=200
player=200
```

Proof command:

```sh
PREDICT_BASE_URL=http://127.0.0.1:3022 \
npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts
```

Result:

```txt
8 passed (5.3s)
```

Focused pre-run checks:

```sh
npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts --list
git diff --check -- apps/Phoenix-Predict-Combined/talon-backoffice/e2e/prediction/critical-paths.api.spec.ts
```

Results:

- Playwright listed 8 API tests.
- `git diff --check` passed.

## Scenario Impact

- Scenario 7 Market lifecycle and resolution: stronger evidence, still Partial. Same-run admin close and direct settlement are now live DB-backed, but dual-admin propose/finalize and office-browser variants remain incomplete.
- Scenario 10 Admin and market operations: stronger evidence, still Partial. Admin lifecycle/settlement APIs are now part of the critical path, but broader office/admin operation proof remains incomplete.
- Scenario 11 API/data surface: stronger evidence, still Partial. The critical API suite now covers admin close, settlement, lifecycle audit, user ledger, and portfolio history together.
- Scenario 12 Safety, compliance, and trust boundary: stronger evidence, still Partial. Settlement is point-native and ledger-backed in the same deployed-like run, but full browser journey, new-user leaderboard appearance, backend terminology cleanup, complete preservation review, and broader abuse evidence remain incomplete.
