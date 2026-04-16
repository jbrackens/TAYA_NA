# Next.js React Isomorphic App - `@phoenix-ui/app`

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

## Current Product Surfaces

The player app includes sportsbook-native loyalty, leaderboards, analytics, and rewards:

- `/account` shows rewards balance, tier progress, recent ledger activity, competition snapshot, betting heatmap, and links to the Rewards Center
- `/rewards` is a standalone 9-section Rewards Center with tier ladder, referral program, full ledger history, heatmap, and competition standings
- `/bets` shows `points earned` callouts on settled bets and a "Share this win" button on winning bets (generates branded PNG)
- `/bets/analytics` is a bet analytics dashboard with ROI over time, win rate charts, cumulative P&L, stake distribution, and 5 summary stat cards
- `/leaderboards` and `/leaderboards/[id]` expose live competition boards with personalized rank, window dates, and prize info
- Betslip shows estimated rewards points preview alongside the potential return

### Other scripts

See core [README.md](../../README.md#scripts)
