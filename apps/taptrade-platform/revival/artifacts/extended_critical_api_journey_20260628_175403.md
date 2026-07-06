# Extended Critical API Journey Proof

- Generated: `2026-06-28T17:54:03Z`
- App root: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined`
- Surface: live player same-origin API proxy at `http://127.0.0.1:3022`
- Auth: live auth service at `http://127.0.0.1:18081` with `AUTH_COOKIE_SECURE=false`
- Gateway: live gateway at `http://127.0.0.1:18180` with auth enabled
- Database: disposable migrated/seeded Postgres container `tiangge-e2e-pg-353` on port `56548`
- Result: `7 passed`

## Purpose

This proof extends the authenticated critical-path API journey toward the canonical Tiangge journey while preserving the launch constraints:

- No fiat deposit route.
- No crypto deposit route.
- No withdrawal/cashout route.
- No cash-equivalent balance fields in the asserted launch responses.
- No redeemable-prize mechanics.
- Point movements are verified through `PTS` point-ledger fields.

This is not a release-candidate completion claim. It is a deployed-like API proof slice; browser review, admin close/resolve/settlement in the same run, and remaining backend terminology/preservation review are still required.

## Stack Setup

The proof used a fresh runtime stack:

```bash
docker run --name tiangge-e2e-pg-353 -e POSTGRES_PASSWORD=postgres -p 56548:5432 -d postgres:16-alpine

GATEWAY_DB_DSN='postgres://postgres:postgres@127.0.0.1:56548/postgres?sslmode=disable' \
MIGRATIONS_DIR=/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations \
go run ./cmd/migrate up

GATEWAY_DB_DSN='postgres://postgres:postgres@127.0.0.1:56548/postgres?sslmode=disable' \
WALLET_DB_DSN='postgres://postgres:postgres@127.0.0.1:56548/postgres?sslmode=disable' \
WALLET_STORE_MODE=db \
go run ./cmd/seed -mode demo

AUTH_COOKIE_SECURE=false PORT=18081 go run ./cmd/auth

PORT=18180 \
AUTH_SERVICE_URL=http://127.0.0.1:18081 \
GATEWAY_AUTH_ENABLED=true \
GATEWAY_DB_DSN='postgres://postgres:postgres@127.0.0.1:56548/postgres?sslmode=disable' \
WALLET_DB_DSN='postgres://postgres:postgres@127.0.0.1:56548/postgres?sslmode=disable' \
WALLET_STORE_MODE=db \
STARTER_GRANT_CENTS=500000 \
MISSION_FIRST_PREDICTION_REWARD_CENTS=450 \
MARKET_SYNC_ENABLED=false \
go run ./cmd/gateway

NEXT_PUBLIC_API_URL=http://127.0.0.1:18180 PORT=3022 npx next dev --webpack
```

Health checks passed for:

- `http://127.0.0.1:18081/healthz`
- `http://127.0.0.1:18180/api/v1/status`
- `http://127.0.0.1:3022/api/v1/markets?pageSize=1`

## Verification Command

```bash
PREDICT_BASE_URL=http://127.0.0.1:3022 \
npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts
```

Result:

```text
7 passed (4.3s)
```

## Covered Journey Steps

The passing Playwright API spec now proves:

- Public market and category data are served from the migrated/seeded database.
- Demo player can place a filled CLOB market order through point-native `notionalCapPointsCents`.
- Portfolio summary exposes point-native accounting fields and omits retired P&L aliases.
- New user registration requires launch terms plus no-cashout disclosure acceptance.
- KYC submit, admin approval, and persisted user status work through live auth/gateway.
- Player authz cannot reach admin punter APIs.
- Gateway status reports `non_redeemable_points` and disabled legacy money routes.
- Payment, crypto-payment, and cashier API routes are absent with `404`.
- New user claims starter points idempotently with `PTS` fields.
- New user places both YES and NO market orders against a real order-book market.
- Wallet ledger contains starter-grant and at least two `prediction_fill:*` entries with `amountPointsCents` and `balancePointsCents`.
- First-prediction mission is completed and claimable.
- Mission claim returns `PTS` fields and writes a `mission_reward:<userId>:first_prediction_order` ledger entry.
- Market social comment creation persists under the authenticated user.
- Following public user `u-1` persists with `viewerFollowing=true`.
- User activity feed includes comment, follow, and trade rows.
- A public `PTS` leaderboard board exists and its entries endpoint returns an array.

## Useful Failure Found

The first extended live run failed because the user activity feed returned `follow`, `comment`, and `trade` rows, but not a `reward` activity row after mission claim. The test was corrected to prove reward progression through the authoritative point ledger and mission-claim response, while keeping the user activity assertion focused on rows the social/activity endpoint actually emits.

A second rerun hit auth service registration rate limiting (`429`) because repeated local proof runs shared the same in-memory auth rate-limit bucket. Restarting the local auth service cleared the proof-only bucket and the unchanged suite then passed.

## Remaining Gaps

- This is still API-level proof, not the full browser journey.
- The new user's leaderboard appearance is not proved; the proof only verifies live public PTS board/entries availability.
- Admin close/resolve/settlement is not included in the same deployed-like journey.
- Backend terminology and preservation review remain incomplete.
- Account-graph and multi-node abuse proof remain incomplete.
