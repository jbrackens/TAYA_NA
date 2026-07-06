# Taya NA Predict

Prediction-market platform for trading binary YES/NO contracts on real-world outcomes. Prices are cents from 0 to 100, where the YES price is the implied probability and winning contracts pay $1.

This repo was forked from the Taya NA sportsbook codebase on 2026-04-16. Current product language, setup commands, and docs should use the prediction-market domain: categories, series, events, markets, orders, positions, trades, and settlements.

## Surfaces

| Surface | Path | Local URL |
| --- | --- | --- |
| Player app | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app` | `http://localhost:3010/predict` |
| Backoffice | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office` | `http://localhost:3001` |
| Gateway API | `apps/Phoenix-Predict-Combined/go-platform/services/gateway` | `http://localhost:18080/api/v1` |
| Auth service | `apps/Phoenix-Predict-Combined/go-platform/services/auth` | `http://localhost:18081` |
| PostgreSQL | Docker Compose service `postgres` | `localhost:5434` |
| Redis | Docker Compose service `redis` | `localhost:6380` |

## Quick Start

Prerequisites:

- Node.js 20+
- Yarn 1.22.22
- Go 1.25+
- Docker Desktop

Start the backend stack:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined
docker compose up -d postgres redis gateway auth
```

Start the player app:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/talon-backoffice/packages/app
NEXT_PUBLIC_API_URL=http://localhost:18080 \
NEXT_PUBLIC_AUTH_URL=http://localhost:18081 \
NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws \
npm run dev -- -p 3010
```

Open `http://localhost:3010/predict`.

Demo player login:

- Email: `demo@taptrade.local`
- Password: `demo123`

## Developer Checks

Player app:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/talon-backoffice/packages/app
npm run typecheck
npm test
PLAYWRIGHT_BASE_URL=http://localhost:3010 npm run test:smoke
```

Gateway/auth:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/go-platform
go test ./modules/platform/... ./services/gateway/... ./services/auth/...
```

## Docs

- [Project instructions](./CLAUDE.md)
- [Combined app README](./apps/Phoenix-Predict-Combined/README.md)
- [Developer setup](./apps/Phoenix-Predict-Combined/DEVELOPMENT.md)
- [API examples](./apps/Phoenix-Predict-Combined/API_EXAMPLES.md)
- [Error and debugging guide](./apps/Phoenix-Predict-Combined/ERRORS.md)
- [Changelog](./apps/Phoenix-Predict-Combined/CHANGELOG.md)
- [Migration guide](./apps/Phoenix-Predict-Combined/MIGRATION.md)
- [Upgrade guide](./apps/Phoenix-Predict-Combined/UPGRADE.md)
- [Developer experience scorecard](./apps/Phoenix-Predict-Combined/DX.md)
- [Contributing](./CONTRIBUTING.md)
- [Support](./SUPPORT.md)
- [Security](./SECURITY.md)
- [Code of conduct](./CODE_OF_CONDUCT.md)

## Current Product Model

```
Category
  -> Series
      -> Event
          -> Market
              -> Orders / Positions / Trades / Settlement
```

Multi-outcome questions are represented as multiple binary markets, one market per candidate outcome.

## Important Guardrails

- Do not reintroduce sportsbook concepts in prediction-market code.
- Do not use `fixtures`, `selections`, `betslip`, `sport_key`, or `punter_bets` for new prediction features.
- Player app UI uses Tailwind/inline styles, not `@taptrade-ui/design-system`.
- Production code should use structured loggers, not raw `console.*`.
- New database tables or columns require a new goose migration.
