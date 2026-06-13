# Phoenix Market Engine

`phoenix-market-engine` owns market lifecycle, odds management, market reads, liquidity inspection, and settlement.

## Implemented contract

Public routes:

- `GET /api/v1/markets`
- `GET /api/v1/markets/{marketID}`

Authenticated routes:

- `POST /api/v1/markets`
- `POST /api/v1/providers/mockdata/markets/sync`
- `POST /api/v1/providers/oddin/markets/sync`
- `POST /api/v1/providers/betgenius/markets/sync`
- `PUT /api/v1/markets/{marketID}/odds`
- `PUT /api/v1/markets/{marketID}/status`
- `POST /api/v1/markets/{marketID}/settle`
- `GET /api/v1/markets/{marketID}/liquidity`

## Runtime

- router: Chi v5
- database: PostgreSQL via `pgx`
- auth: HMAC JWT validation
- money math: `shopspring/decimal`
- logging: `slog`
- Kafka publishing for market lifecycle events

## Schema alignment

The service is implemented against the real prep schema:

- `events`
- `markets`
- `outcomes`
- `bets` for liquidity inspection

It does not assume legacy scaffold tables for standalone odds or settlement records.

## Role model

- `operator` or `admin`
  - create market
  - update status
  - settle market
  - inspect liquidity
- `odds-manager`, `operator`, or `admin`
  - update odds

## Published Kafka topics

- `phoenix.market.created`
- `phoenix.market.provider-synced`
- `phoenix.market.odds-updated`
- `phoenix.market.status-changed`
- `phoenix.market.settled`

## Configuration

```bash
export PORT=8003
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/phoenix_platform?sslmode=disable
export JWT_SECRET=phoenix-secret
export JWT_ISSUER=phoenix-user
export JWT_AUDIENCE=phoenix-platform
export KAFKA_BROKERS=localhost:9092
export DEFAULT_MIN_BET=1.00
export DEFAULT_MAX_BET=10000.00
```

## Development

```bash
make deps
make test
make build
make run
```

## Validation

```bash
go test ./...
go test -race ./...
```

## Notes

- Liquidity is derived from the `bets` table. `unmatched_orders` is currently reported as `0` because the prep schema does not include an orderbook table.
- Settlement writes market/outcome state and publishes settlement events, but downstream payout logic belongs in `phoenix-settlement` / `phoenix-wallet`.
- `mockdata` sync resolves fixtures by `events.external_id`, upserts markets by `markets.external_id`, and updates outcome odds by normalized outcome names.
- `oddin` sync is the first provider-specific market adapter in Go. It accepts OddsChange-style provider payloads, derives stable provider market IDs from `sport_event_id + market_description_id + specifiers`, resolves fixtures by `oddin:{sport_event_id}`, and upserts markets by provider `external_id`.
- `betgenius` sync accepts fixture market-set payloads, resolves fixtures by `betgenius:{fixture_id}`, upserts markets by provider `external_id`, and updates selection odds by normalized selection names and trading status.
