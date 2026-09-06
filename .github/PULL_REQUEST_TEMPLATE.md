## Summary

What changed?

## User Impact

What does the player, operator, or developer see differently?

## Domain Check

- [ ] Uses prediction-market language, not sportsbook language
- [ ] No new fixtures/selections/betslip/sport_key/punter_bets naming
- [ ] YES/NO prices are Points (1-99, yes+no=100), not odds and not cents
      — migration 050 renamed every `*_cents` column to `*_points`

## Tests

- [ ] Player typecheck: `npm run typecheck`
- [ ] Player unit tests: `npm test`
- [ ] Player smoke tests: `PLAYWRIGHT_BASE_URL=http://localhost:3010 npm run test:smoke`
- [ ] Go tests: `go test ./modules/platform/... ./services/gateway/... ./services/auth/...`

## Screenshots

Add before/after screenshots for UI changes.

## Migrations

- [ ] No schema change
- [ ] New goose migration added
- [ ] Migration/seed impact documented
