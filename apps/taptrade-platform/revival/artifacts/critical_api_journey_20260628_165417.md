# Critical API Journey Proof

Generated: 2026-06-28T16:54:17Z

## Scope

This proof runs the launch-native Playwright prediction critical-path API spec against the player app same-origin `/api` proxy.

Runtime surfaces:

- Auth service: `http://127.0.0.1:18081`
- Gateway: `http://127.0.0.1:18180`
- Tiangge player proxy: `http://127.0.0.1:3022`
- Disposable Postgres: `postgres://postgres:postgres@127.0.0.1:56546/postgres?sslmode=disable`

Launch settings:

- `GATEWAY_AUTH_ENABLED=true`
- `AUTH_COOKIE_SECURE=false` for local HTTP Playwright cookies
- `TIANGGE_LEGACY_MONEY_ROUTES_ENABLED` unset, so legacy money routes stay disabled
- `STARTER_GRANT_CENTS=500000`
- `WALLET_STORE_MODE=db`

Database setup:

- Gateway migrations applied through version 48.
- `go run ./cmd/seed -mode demo` completed with demo markets, orders, positions, trades, wallets, settlements, rewards, and leaderboard snapshots.

## Result

Command:

```sh
PREDICT_BASE_URL=http://127.0.0.1:3022 npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts
```

Result: 7 passed.

Covered tests:

1. Public market and category data is served from the database.
2. Demo player can place a market order that fills against the CLOB.
3. Portfolio summary returns point-native accounting fields and omits retired P&L aliases.
4. KYC lifecycle: submit, pending, admin approve, approved.
5. Player authz cannot reach admin APIs.
6. Launch money and crypto routes are absent.
7. New user can claim a gameplay-point starter grant idempotently, place a PTS order, and inspect starter-grant plus prediction-fill wallet ledger evidence.

## Status

This strengthens the authenticated canonical journey evidence, especially account creation, starter points, market discovery, order placement, portfolio accounting, ledger inspection, admin KYC action, authz, and no-money route absence.

Scenario 12 remains Partial because this API proof does not yet cover the full browser journey, buy NO or sell/close, social comment/share/follow, reward progression/claim, leaderboard appearance, admin close/resolve/settlement in the same deployed-like run, or remaining backend terminology cleanup.
