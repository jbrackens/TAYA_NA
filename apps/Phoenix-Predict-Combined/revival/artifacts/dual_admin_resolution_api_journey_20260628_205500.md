# Loop 357 - Dual-Admin Resolution API Journey

Generated: 2026-06-28T18:55:00Z

## Commands

```bash
MIGRATIONS_DIR=/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/go-platform/services/gateway/migrations \
GATEWAY_DB_DSN='postgres://postgres:postgres@127.0.0.1:56551/postgres?sslmode=disable' \
go run ./cmd/migrate up

GATEWAY_DB_DSN='postgres://postgres:postgres@127.0.0.1:56551/postgres?sslmode=disable' \
WALLET_DB_DSN='postgres://postgres:postgres@127.0.0.1:56551/postgres?sslmode=disable' \
WALLET_STORE_MODE=db STARTER_GRANT_CENTS=500000 MISSION_FIRST_PREDICTION_REWARD_CENTS=450 \
go run ./cmd/seed -mode demo

AUTH_COOKIE_SECURE=false AUTH_STORE_MODE=db \
AUTH_DB_DSN='postgres://postgres:postgres@127.0.0.1:56551/postgres?sslmode=disable' \
PORT=18081 go run ./cmd/auth

AUTH_BASE_URL=http://127.0.0.1:18081 AUTH_COOKIE_SECURE=false MARKET_SYNC_ENABLED=false \
GATEWAY_DB_DSN='postgres://postgres:postgres@127.0.0.1:56551/postgres?sslmode=disable' \
WALLET_DB_DSN='postgres://postgres:postgres@127.0.0.1:56551/postgres?sslmode=disable' \
WALLET_STORE_MODE=db STARTER_GRANT_CENTS=500000 MISSION_FIRST_PREDICTION_REWARD_CENTS=450 \
PORT=18180 go run ./cmd/gateway

PREDICT_BASE_URL=http://127.0.0.1:3022 \
npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts

go test ./internal/prediction ./internal/http -run 'Test(MarketJSONClampsOutOfRangeImportedTimes|MarketJSONExposesPointAliases|ProposeThenFinalizeResolution|PredictionAdminWindowedResolution(RoutesEnforceDualControlAndDisputeGate|AllowsExplicitZeroHourWindow|RequiresIdentifiedAdmin))'
```

## Results

```text
gateway status: {"pointMode":"non_redeemable_points","legacyMoneyRoutes":"disabled",...}
markets=15 total=15
ops-login-200
demo-login-200
9 passed (8.9s)
ok   phoenix-revival/gateway/internal/prediction
ok   phoenix-revival/gateway/internal/http
```

## Notes

Auth must run with `AUTH_STORE_MODE=db` for seeded staff fallback through `admin_users`. Running with only `AUTH_DB_DSN` leaves auth in in-memory mode and prevents the dual-admin proof from exercising the seeded staff directory.
