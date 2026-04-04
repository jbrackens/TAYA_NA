# Phoenix Retention

`phoenix-retention` implements achievements, leaderboards, campaigns, loyalty-point redemption, free bets, and odds boosts for the Go rebuild.

## Implemented contract

- `POST /api/v1/achievements/{userID}/unlock`
- `GET /api/v1/users/{userID}/achievements`
- `GET /api/v1/leaderboards`
- `POST /api/v1/campaigns`
- `GET /api/v1/users/{userID}/loyalty-points`
- `POST /api/v1/users/{userID}/loyalty-points/redeem`
- `GET /api/v1/freebets?userId={userID}&status={status}`
- `GET /api/v1/freebets/{freebetID}`
- `GET /api/v1/odds-boosts?userId={userID}&status={status}`
- `GET /api/v1/odds-boosts/{oddsBoostID}`
- `POST /api/v1/odds-boosts/{oddsBoostID}/accept`

## Schema alignment

The service uses the real prep schema:

- `achievements`
- `user_achievements`
- `leaderboards`
- `leaderboard_entries`
- `campaigns`
- `freebets`
- `odds_boosts`
- `event_store`
- `event_outbox`

There is no dedicated loyalty-points table in the prep migrations, so loyalty balances are modeled as an event-sourced ledger in `event_store`.

## Runtime

- router: Chi v5
- database: PostgreSQL via `pgx`
- cache: Redis for leaderboard reads
- auth: HMAC JWT validation
- reward credit: HTTP call to `phoenix-wallet`
- async delivery: transactional `event_outbox` rows published by the shared `phoenix-common/pkg/outbox` worker

## Configuration

```bash
export PORT=8006
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/phoenix_platform?sslmode=disable
export REDIS_ADDR=localhost:6379
export JWT_SECRET=phoenix-secret
export JWT_ISSUER=phoenix-user
export JWT_AUDIENCE=phoenix-platform
export WALLET_URL=http://localhost:8002
export KAFKA_BROKERS=localhost:9092
export OUTBOX_ENABLED=true
export OUTBOX_POLL_INTERVAL=1s
export OUTBOX_BATCH_SIZE=50
export LEADERBOARD_CACHE_TTL_SECONDS=30
```

## Notes

- Achievement unlock is idempotent at the `(user_id, achievement_id)` level.
- Campaign types from the external contract are mapped onto the enum values available in the prep migration.
- Loyalty redemption currently credits wallet synchronously, then records the points spend.
