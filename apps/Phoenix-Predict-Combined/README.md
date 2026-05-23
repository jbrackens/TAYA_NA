# Phoenix Predict Combined

Full local stack for Taya NA Predict: a player prediction-market app, admin backoffice, Go gateway, Go auth service, PostgreSQL, and Redis.

## Quick Start

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined
docker compose up -d postgres redis gateway auth
```

Then start the player app:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/talon-backoffice/packages/app
NEXT_PUBLIC_API_URL=http://localhost:18080 \
NEXT_PUBLIC_AUTH_URL=http://localhost:18081 \
NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws \
npm run dev -- -p 3010
```

Open `http://localhost:3010/predict`.

## Services

| Service | URL | Notes |
| --- | --- | --- |
| Player app | `http://localhost:3010/predict` | Market discovery, market detail, trade ticket, portfolio |
| Backoffice | `http://localhost:3001` | Market creation, lifecycle, settlement, risk |
| Gateway API | `http://localhost:18080/api/v1` | Prediction, orders, portfolio, wallet, payments (incl. crypto rail), compliance/KYC, auth proxy |
| Auth service | `http://localhost:18081` | Login, refresh, session management |
| PostgreSQL | `localhost:5434` | Database `predict`, user `predict`, password `localdev` |
| Redis | `localhost:6380` | Cache and pub/sub |

Demo player:

- Email: `demo@phoenix.local`
- Password: `demo123`

Demo admin:

- Email: `admin@phoenix.local`
- Password: `admin123`

## Architecture

```
Player App / Backoffice
        |
        v
Gateway API + WebSocket hub
        |
        +--> Auth service
        +--> PostgreSQL
        +--> Redis
```

Prediction hierarchy:

```
Category -> Series -> Event -> Market -> Orders / Positions / Trades / Settlement
```

## Common Commands

Backend stack:

```bash
docker compose ps
docker compose logs -f gateway auth
docker compose down
```

Player app:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/talon-backoffice/packages/app
npm run dev -- -p 3010
npm run typecheck
npm test
PLAYWRIGHT_BASE_URL=http://localhost:3010 npm run test:smoke
```

Go services:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/go-platform
go test ./modules/platform/... ./services/gateway/... ./services/auth/...
```

Prediction end-to-end tests (against the running stack):

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/talon-backoffice
PREDICT_BASE_URL=http://localhost:8080 npx playwright test --config playwright.prediction.config.ts
```

Migrations and seeds:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/go-platform/services/gateway
GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable" \
MIGRATIONS_DIR="$(pwd)/migrations" \
go run ./cmd/migrate up

GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable" \
go run ./cmd/seed
```

## Documentation

- [Architecture overview](./ARCHITECTURE.md)
- [Deployment guide](./DEPLOYMENT.md)
- [Developer setup](./DEVELOPMENT.md)
- [API examples](./API_EXAMPLES.md)
- [Error and debugging guide](./ERRORS.md)
- [Changelog](./CHANGELOG.md)
- [Migration guide](./MIGRATION.md)
- [Upgrade guide](./UPGRADE.md)
- [Developer experience scorecard](./DX.md)
- [Gateway OpenAPI spec](./go-platform/services/gateway/api/openapi.yaml)
- [Grafana prediction dashboard](./ops/grafana/README.md)

## Notes For Contributors

This package still contains some archived sportsbook-era directories and markdown. New work should follow the prediction-market model and the root `CLAUDE.md` guardrails.
