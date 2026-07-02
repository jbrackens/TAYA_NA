# Office Admin Lifecycle Browser Proof Artifact

Generated: 2026-06-28 22:06:51 Europe/Malta

## Environment

- Database: `postgres:16-alpine`, container `tiangge-e2e-pg-360`,
  `127.0.0.1:56554`.
- Auth: `http://127.0.0.1:18081`, `AUTH_STORE_MODE=db`.
- Gateway: `http://127.0.0.1:18080`, DB-backed prediction and wallet stores,
  `MARKET_SYNC_ENABLED=false`.
- Office: `http://localhost:3330`, `NEXT_PUBLIC_API_URL=""`,
  `OFFICE_SESSION_VALIDATE_URL=http://127.0.0.1:18080`.

## Commands

```sh
MIGRATIONS_DIR="$PWD/migrations" \
GATEWAY_DB_DSN='postgres://postgres:postgres@127.0.0.1:56554/postgres?sslmode=disable' \
go run ./cmd/migrate up

GATEWAY_DB_DSN='postgres://postgres:postgres@127.0.0.1:56554/postgres?sslmode=disable' \
go run ./cmd/seed -mode demo

npx playwright test --config playwright.prediction.config.ts \
  e2e/prediction/office-admin-lifecycle.ui.spec.ts --list

PREDICT_OFFICE_BASE_URL=http://localhost:3330 \
PREDICT_ADMIN_API_URL=http://127.0.0.1:18080 \
npx playwright test --config playwright.prediction.config.ts \
  e2e/prediction/office-admin-lifecycle.ui.spec.ts \
  --project=ui --no-deps --reporter=list
```

## Result

- Playwright discovery listed:
  - `[setup] auth.setup.ts: authenticate demo player`
  - `[ui] office-admin-lifecycle.ui.spec.ts: office admin opens, closes, and audits a prediction market through the browser`
- Final live run: `1 passed`.
- The office UI test created a synthetic draft market, opened it from the
  rendered office table, closed it with an explicit audit reason, verified the
  lifecycle audit modal, and checked `/cashier`, `/cashout`, `/crypto`,
  `/deposit`, and `/withdraw` return 404 in the office app.

## Notes

Failing attempts found real environment/app issues before the passing run:

- Loading office from `127.0.0.1` blocked Next dev resources and prevented the
  login form from hydrating. The passing proof uses `localhost:3330`.
- The office login proxy scoped `authToken` too narrowly. The route now sets
  `path: "/"`, allowing the dashboard auth proxy to see the login cookie.
- A verification rerun clicked the dev login form during a hot-reload hydration
  edge and did not issue `/api/auth/login`. The spec now waits for load/network
  settle, verifies field values, and requires the successful login POST before
  asserting the dashboard URL.
