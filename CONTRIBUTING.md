# Contributing

Thanks for working on Taya NA Predict. This project is a prediction-market fork of a sportsbook codebase, so the most important contribution rule is to keep new work in the prediction domain.

## Before You Start

Read:

- [README.md](./README.md)
- [CLAUDE.md](./CLAUDE.md)
- [Developer setup](./apps/taptrade-platform/DEVELOPMENT.md)
- [Migration guide](./apps/taptrade-platform/MIGRATION.md)

## Local Checks

Player app:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/taptrade-platform/frontend/packages/app
npm run typecheck
npm test
PLAYWRIGHT_BASE_URL=http://localhost:3010 npm run test:smoke
```

Go services:

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/taptrade-platform/go-platform
go test ./modules/platform/... ./services/gateway/... ./services/auth/...
```

## Prediction Domain Rules

- Use categories, series, events, markets, orders, positions, trades, and settlements.
- Do not add new sportsbook naming such as fixtures, selections, betslip, sport_key, or punter_bets.
- Use YES/NO prices in cents, not odds.
- Keep prediction code decoupled from wallet internals through the existing adapter boundary.
- Add new goose migrations for schema changes. Do not edit shipped migrations in place.

## Pull Request Expectations

- Describe the user-visible behavior change.
- List the checks you ran.
- Include screenshots for player/backoffice UI changes.
- Call out any intentionally stubbed or incomplete behavior.
- Note whether the change affects setup, migrations, auth, wallet, or settlement.
