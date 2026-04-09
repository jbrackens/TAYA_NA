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

The office app now includes sportsbook-native loyalty and leaderboard administration:

- `/loyalty` for rewards account operations
- `/loyalty/[id]` for manual adjustments and ledger inspection
- `/loyalty/settings` for tier threshold and accrual rule management
- `/leaderboards` and `/leaderboards/[id]` for create, edit, score-event, and recompute flows
- `/reports` for leaderboard analytics snapshots inside admin reporting

### Other scripts

See core [README.md](../../README.md#scripts)
