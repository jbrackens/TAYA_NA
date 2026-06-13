# Phoenix Betting Engine

`phoenix-betting-engine` owns bet placement, pre-validation, parlay creation, user bet history, and cashout workflows for the Go rebuild.

## Implemented contract

- `POST /api/v1/bets`
- `POST /api/v1/bets/precheck`
- `POST /api/v1/bets/builder/quote`
- `GET /api/v1/bets/builder/quotes/{quoteID}`
- `POST /api/v1/bets/builder/accept`
- `POST /api/v1/bets/exotics/fixed/quote`
- `GET /api/v1/bets/exotics/fixed/quotes/{quoteID}`
- `POST /api/v1/bets/exotics/fixed/accept`
- `POST /api/v1/bets/status`
- `GET /api/v1/bets/{betID}`
- `GET /api/v1/users/{userID}/bets`
- `GET /admin/users/{userID}/bets`
- `GET /admin/punters/{userID}/bets`
- `POST /admin/bets/{betID}/cancel`
- `POST /admin/bets/{betID}/lifecycle/{action}`
- `POST /api/v1/bets/{betID}/cashout`
- `GET /api/v1/bets/{betID}/cashout-offer`
- `POST /api/v1/parlays`

Legacy compatibility aliases also exist for frontend migration, including:

- `POST /punters/bets/status`

## Runtime

- router: Chi v5
- database: PostgreSQL via `pgx`
- auth: HMAC JWT validation
- money math: `shopspring/decimal`
- logging: `slog`
- async delivery: transactional `event_outbox` rows published by the shared `phoenix-common/pkg/outbox` worker

## Schema alignment

The service is implemented against the prep migrations and uses:

- `bets`
- `bet_legs`
- `advanced_bet_quotes`
- `advanced_bet_quote_legs`
- `event_store`
- `event_outbox`

It does not invent additional orderbook tables that are not present in the prep schema.

## Downstream dependencies

- `phoenix-market-engine` for market validation and current odds
- `phoenix-wallet` for reserve, release, deposit, and withdrawal flows

## Important implementation notes

- The DB enum stores open bets as `pending`; the external API maps that to `matched`.
- Reservation linkage is persisted through `event_store` because the bet tables do not carry a `reservation_id` column.
- Single and parlay placement now persist optional promo linkage on `bets` through `freebet_id`, `freebet_applied_cents`, and `odds_boost_id` so admin promo-usage reporting is based on real bet data.
- Admin per-user bet history aliases now expose a Talon-compatible legacy read shape, including root pagination fields and expanded leg context, for `GET /admin/users/{userID}/bets` and `GET /admin/punters/{userID}/bets`.
- `POST /admin/bets/{betID}/cancel` now performs a reservation-safe admin cancel workflow:
  - release reserved stake
  - mark the bet and any legs as `cancelled`
  - restore the reservation if the repository update fails after wallet release
- `POST /admin/bets/{betID}/lifecycle/{action}` is now a provider-ops compatibility alias:
  - `cancel` delegates to the same reservation-safe admin cancel workflow
  - `refund` now performs an open-bet refund/void workflow by releasing the reserved stake and marking the bet `voided`
  - `settle` now performs manual single-bet settlement for open bets by releasing the reserved stake and then applying the correct wallet profit/loss adjustment before marking the bet `won` or `lost`
  - `settle` still rejects parlays/multi-leg bets because the current provider-ops payload only carries one winning selection id
- Cashout is implemented as a service-layer workflow, not a distributed saga yet:
  - release reservation
  - settle profit/loss against wallet
  - mark bet as `cashed_out`

## Configuration

```bash
export PORT=8004
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/phoenix_platform?sslmode=disable
export JWT_SECRET=phoenix-secret
export JWT_ISSUER=phoenix-user
export JWT_AUDIENCE=phoenix-platform
export MARKET_ENGINE_URL=http://localhost:8003
export WALLET_URL=http://localhost:8002
export KAFKA_BROKERS=localhost:9092
export OUTBOX_ENABLED=true
export OUTBOX_POLL_INTERVAL=1s
export OUTBOX_BATCH_SIZE=50
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
