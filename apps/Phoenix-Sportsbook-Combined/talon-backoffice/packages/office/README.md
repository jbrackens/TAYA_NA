# Next.js React Isomorphic App - `@phoenix-ui/office`

## Configuration

To be able to develop locally with different configuration you've to set special
file `.env.local` which by default is ignored while commit because of
[next.js recommendations](https://nextjs.org/docs/basic-features/environment-variables#default-environment-variables)

### Example .env.local file

```
ENV_NAME=development
API_GLOBAL_ENDPOINT=http://localhost:3010
WS_GLOBAL_ENDPOINT=ws://localhost:3010
```

## Scripts

### Development

- `run-local:dev` - runs development server with hot reload
- `test` - runs tests suites with `--coverage` option

## Current Admin Surfaces

The office app includes sportsbook-native loyalty and leaderboard administration:

- `/loyalty` for rewards account operations with tier filtering
- `/loyalty/[id]` for manual adjustments, ledger inspection, referral activity, and tier progress visualization
- `/loyalty/settings` for tier thresholds, tier benefits editing, accrual rule management, and rule creation
- `/leaderboards` for board list with window dates, status filters, batch recompute all, and create form with window dates
- `/leaderboards/[id]` for definition editing with window start/end dates, lifecycle buttons (draft/active/closed), score-event recording, recompute, and standings with metadata
- `/reports` for leaderboard analytics snapshots inside admin reporting

### Dev-mode auth

The office uses a legacy Keycloak JWT auth system. For local development against the Go gateway (which issues opaque tokens), a dev-mode bypass is enabled when `NODE_ENV=development`. Login with any credentials at `/auth/login` and the session guard will accept the gateway's opaque bearer tokens.

### Other scripts

See core [README.md](../../README.md#scripts)
