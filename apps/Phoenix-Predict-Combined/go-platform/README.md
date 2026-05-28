# Go Platform Scaffold

This directory is the initial Go workspace for the Phoenix sportsbook backend migration.

## Workspace Layout
- `modules/platform`: shared runtime primitives and reusable platform utilities.
- `services/gateway`: sportsbook-facing API gateway scaffold.
- `services/auth`: authentication/session service scaffold.

## Quick Start
```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/go-platform
go work sync
go test ./...
```

## Run Starter Services
```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/go-platform
go run ./services/gateway/cmd/gateway
go run ./services/auth/cmd/auth
```

Default service ports:
- gateway: `18080`
- auth: `18081`

Override with:
```bash
PORT=19000 go run ./services/gateway/cmd/gateway
```

## Alpha Cashier Config

The closed Alpha custodial USDC cashier lives in the gateway under
`services/gateway/internal/alphacashier` and is disabled unless
`ALPHA_CASHIER_ENABLED=true`.

Required live-chain values when enabled:

- `ALPHA_CASHIER_RPC_URL`
- `ALPHA_CASHIER_TOKEN_ADDRESS`
- `ALPHA_CASHIER_TREASURY_ADDRESS`

Stage 1 defaults remain conservative: Base chain ID `8453`, `USDC`, 6 decimals,
12 confirmations, $1 minimum, $250 max per deposit, $1,000 daily limit,
withdrawals disabled, and withdrawal review required. Keep payout keys outside
the app and do not use the legacy `CRYPTO_*` prototype rail for this path.
