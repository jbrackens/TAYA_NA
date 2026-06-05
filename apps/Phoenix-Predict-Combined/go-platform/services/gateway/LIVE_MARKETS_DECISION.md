# Live Markets Decision

## Authenticated market data flag

Authenticated market-data WebSocket consumption is implemented but hidden behind
`AUTHENTICATED_MARKET_DATA_ENABLED=true`.

Default behavior keeps this provider absent from `/api/v1/live-markets`, skips
private-key validation, and does not attempt an authenticated WebSocket
connection. This avoids exposing a half-configured provider on the player `/live`
page while API-key/private-key provisioning is still unresolved.

Enable only after the runtime has:

- `KALSHI_API_KEY_ID`
- `KALSHI_API_PRIVATE_KEY_PATH` or `KALSHI_API_PRIVATE_KEY`
- Optional `KALSHI_WS_MARKET_TICKERS` if the feed should be scoped

Sports live moments remain controlled by `LIVE_MARKETS_ENABLED`.
