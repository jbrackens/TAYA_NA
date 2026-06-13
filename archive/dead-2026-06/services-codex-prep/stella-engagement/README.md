# stella-engagement

Go engagement engine with PostgreSQL state, Redis leaderboard cache, and websocket fan-out.

## Implemented endpoints
- `POST /api/v1/achievements/stream`
- `POST /api/v1/points/calculate`
- `POST /api/v1/aggregations/compute`
- `GET /api/v1/engagement-score/{user_id}`
- `GET /api/v1/stream/achievements/{user_id}` (websocket)
- `GET /api/v1/stream/leaderboard` (websocket)

## Development

```bash
make deps
make test
make build
make run
```

Important environment variables:

```bash
PORT=8013
DATABASE_URL=postgres://phoenix:phoenix@localhost:5432/phoenix?sslmode=disable
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
JWT_SECRET_KEY=change-me
JWT_ISSUER=phoenix-gateway
JWT_AUDIENCE=phoenix-platform
OUTBOX_ENABLED=true
```

## Notes
- points and achievements update PostgreSQL plus Redis leaderboard state
- events are written to `event_store` and `event_outbox`
- websocket streams receive in-process broadcasts from the calculation path
- compose-backed gateway integration now exercises the service end to end via achievement ingest, point calculation, aggregation, and engagement score reads
