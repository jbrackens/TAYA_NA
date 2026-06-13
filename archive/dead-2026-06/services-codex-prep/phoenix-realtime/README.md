# Phoenix Realtime Service

`phoenix-realtime` provides dedicated websocket fan-out for sportsbook core realtime domains.

## Routes

- `GET /health`
- `GET /ready`
- `GET /api/v1/ws/web-socket`

## Supported channels

- `market^{marketID}`
- `fixture^{gameID}^{fixtureID}`
- `bets`
- `wallets`

`bets` and `wallets` require a JWT token in the subscribe payload.

## Event sources

- `phoenix.market.*`
- `phoenix.event.*`
- `phoenix.bet.*`
- `phoenix.wallet.balance-updated`
- `phoenix.wallet.transactions`

The service reacts to Kafka events and fetches current market, fixture, and wallet snapshots from the existing Go services before pushing websocket updates.
