# Phoenix Prediction

Go prediction market service for the Phoenix platform.

## Scope

This service closes the largest parity gap between the old Scala Phoenix backend and the new Go platform by providing:

- public prediction overview, categories, market discovery, and market detail
- ticket preview for a prediction order
- authenticated player order placement, cancellation, and order history
- authenticated admin/trader/operator prediction oversight
- admin lifecycle actions: suspend, open, cancel, resolve, resettle
- admin bot-key issuance for prediction automation clients
- wallet-safe order reservation and settlement behavior

## Key routes

Public:
- `GET /api/v1/prediction/overview`
- `GET /api/v1/prediction/categories`
- `GET /api/v1/prediction/markets`
- `GET /api/v1/prediction/markets/{marketID}`
- `POST /api/v1/prediction/ticket/preview`

Player:
- `GET /api/v1/prediction/orders`
- `POST /api/v1/prediction/orders`
- `POST /api/v1/prediction/orders/{orderID}/cancel`

Admin:
- `GET /admin/prediction/summary`
- `GET /admin/prediction/markets`
- `GET /admin/prediction/markets/{marketID}`
- `GET /admin/prediction/markets/{marketID}/lifecycle`
- `GET /admin/prediction/orders`
- `GET /admin/prediction/orders/{orderID}`
- `POST /admin/prediction/markets/{marketID}/lifecycle/suspend`
- `POST /admin/prediction/markets/{marketID}/lifecycle/open`
- `POST /admin/prediction/markets/{marketID}/lifecycle/cancel`
- `POST /admin/prediction/markets/{marketID}/lifecycle/resolve`
- `POST /admin/prediction/markets/{marketID}/lifecycle/resettle`
- `POST /v1/bot/keys`
- `POST /api/v1/bot/keys`

## Runtime

- Port: `8014`
- Database: shared PostgreSQL
- Outbox: enabled through `event_outbox`
- Wallet integration:
  - reserve on place order via `phoenix-wallet`
  - release on player cancel via `phoenix-wallet`
  - settlement uses the same wallet ledger/event pattern as `phoenix-settlement`
