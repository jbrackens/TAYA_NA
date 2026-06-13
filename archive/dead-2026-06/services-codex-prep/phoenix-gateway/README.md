# Phoenix Gateway

Phoenix Gateway is the single public HTTP entry point for the Go microservices platform. It is implemented with Chi v5, validates JWT bearer tokens, applies Redis-backed rate limiting, exposes admin gateway introspection endpoints, and reverse proxies requests to downstream Phoenix services.

## Implemented Contract

Public routes:
- `POST /auth/login`
- `GET /health`
- `GET /ready`
- `GET /live`
- `GET /api/v1/ws/web-socket`
- `GET /api/v1/markets`
- `GET /api/v1/markets/{marketID}`
- `GET /api/v1/events`
- `GET /api/v1/events/{eventID}`
- `GET /api/v1/sports`
- `GET /api/v1/leagues/{sport}`
- `GET /api/v1/users/{userID}/profile`
- `GET /api/v1/users/{userID}/followers`
- `GET /api/v1/pages`
- `GET /api/v1/pages/{pageID}`
- `GET /api/v1/promotions`
- `GET /api/v1/banners`
- `GET /api/v1/engagement-score/{userID}`
- `GET /api/v1/stream/achievements/{userID}`
- `GET /api/v1/stream/leaderboard`

Authenticated routes:
- `POST /auth/refresh`
- `POST /auth/logout`
- proxied downstream API routes under `/api/v1/*`

Websocket compatibility:
- `GET /api/v1/ws/web-socket`
- supported channels:
  - `market^{marketID}`
  - `fixture^{gameID}^{fixtureID}`
  - `bets`
  - `wallets`
- `bets` and `wallets` require a JWT token in the websocket subscribe message payload
- current implementation is a polling-backed compatibility stream for sportsbook frontend migration

Admin routes:
- `GET /api/v1/routes`
- `GET /api/v1/rate-limits`
- `GET /api/v1/metrics`
- `GET /api/v1/config`

## Downstream Services

The gateway resolves requests to these downstream services by path prefix:
- `phoenix-user`
- `phoenix-wallet`
- `phoenix-market-engine`
- `phoenix-betting-engine`
- `phoenix-events`
- `phoenix-retention`
- `phoenix-social`
- `phoenix-compliance`
- `phoenix-analytics`
- `phoenix-settlement`
- `phoenix-notification`
- `phoenix-cms`
- `stella-engagement`

## Configuration

Important environment variables:

```bash
PORT=8080
ENVIRONMENT=development
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
JWT_SECRET_KEY=change-me
JWT_ISSUER=phoenix-gateway
JWT_AUDIENCE=phoenix-platform
PHOENIX_USER_URL=http://localhost:8001
PHOENIX_WALLET_URL=http://localhost:8002
PHOENIX_MARKET_ENGINE_URL=http://localhost:8003
PHOENIX_BETTING_ENGINE_URL=http://localhost:8004
PHOENIX_EVENTS_URL=http://localhost:8005
```

## Rate Limits

Default policies:
- `auth-login`: 5 requests/minute
- `auth-refresh`: 20 requests/minute
- `auth-logout`: 20 requests/minute
- `admin`: 60 requests/minute
- `proxy`: 300 requests/minute

## Development

```bash
make deps
make test
make build
make run
```

Compose-backed integration:

```bash
./scripts/run_compose_integration.sh
```

That script validates a real gateway path through user, wallet, events, market, betting, social, compliance, analytics reporting, settlement, notification, CMS, and Stella engagement services against PostgreSQL, Redis, and Kafka.
Analytics event ingest is exercised directly against the analytics service because `POST /api/v1/events` is already reserved for the public events service contract.

## Notes

- Gateway auth is HMAC JWT validation for the current scaffold phase.
- Health and readiness aggregate downstream service health by calling each configured service's health endpoint.
- Request IDs and correlation IDs are generated or propagated automatically and forwarded downstream.
