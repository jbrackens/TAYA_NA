# Phoenix Wallet Service

`phoenix-wallet` implements Phase 2 wallet and transaction workflows for the Phoenix Platform.

## Current scope

Implemented against the prep migrations and service contracts with:

- wallet summary: `GET /api/v1/wallets/{userID}`
- wallet creation: `POST /api/v1/wallets/{userID}`
- deposits: `POST /api/v1/wallets/{userID}/deposits`
- withdrawals: `POST /api/v1/wallets/{userID}/withdrawals`
- transaction history: `GET /api/v1/wallets/{userID}/transactions`
- referral reward application: `POST /api/v1/wallets/{userID}/apply-referral-reward`
- reserve funds: `POST /api/v1/wallets/{userID}/reserve`
- release reserve: `POST /api/v1/wallets/{userID}/release-reserve`
- legacy cashier aliases:
  - `POST /payments/deposit`
  - `POST /payments/withdrawal`
  - `POST /payments/cash-withdrawal`
  - `POST /payments/cheque-withdrawal`
  - `GET /payments/transactions/{transactionID}`
- admin payment operations:
  - `POST /admin/provider/cancel`
  - `GET /admin/payments/transactions`
  - `GET /admin/payments/transactions/export`
  - `GET /admin/payments/transactions/summary`
  - `GET /admin/payments/transactions/reconciliation-queue`
  - `GET /admin/payments/transactions/reconciliation-queue/export`
  - `POST /admin/payments/transactions/reconcile/preview`
  - `GET /admin/payments/transactions/by-provider-reference/{providerReference}`
  - `GET /admin/payments/transactions/by-provider-reference/{providerReference}/events`
  - `POST /admin/payments/transactions/by-provider-reference/{providerReference}/assign`
  - `POST /admin/payments/transactions/by-provider-reference/{providerReference}/notes`
  - `GET /admin/payments/transactions/{transactionID}`
  - `GET /admin/payments/transactions/{transactionID}/events`
  - `POST /admin/payments/transactions/{transactionID}/assign`
  - `POST /admin/payments/transactions/{transactionID}/notes`
  - `POST /admin/payments/transactions/{transactionID}/approve`
  - `POST /admin/payments/transactions/{transactionID}/decline`
  - `POST /admin/payments/transactions/{transactionID}/retry`
  - `POST /admin/payments/transactions/{transactionID}/status`
  - `POST /admin/payments/transactions/{transactionID}/settle`
  - `POST /admin/payments/transactions/{transactionID}/refund`
  - `POST /admin/payments/transactions/{transactionID}/reverse`
  - `POST /admin/payments/transactions/{transactionID}/chargeback`
  - `GET /admin/users/{userID}/transactions`
  - `GET /admin/punters/{userID}/transactions`
  - `GET /admin/users/{userID}/financial-summary`
  - `GET /admin/punters/{userID}/financial-summary`
  - `POST /admin/users/{userID}/funds/credit`
  - `POST /admin/punters/{userID}/funds/credit`
  - `POST /admin/users/{userID}/funds/debit`
  - `POST /admin/punters/{userID}/funds/debit`
- provider callback compatibility:
  - `POST /pxp/payment-state-changed/handlePaymentStateChangedNotification`
  - `POST /pxp/verify-cash-deposit`

## Runtime

- router: Chi v5
- database: PostgreSQL via `pgx`
- auth: HMAC JWT validation
- money math: `shopspring/decimal`
- logging: `slog`
- async delivery: transactional `event_outbox` rows published by the shared `phoenix-common/pkg/outbox` worker

## Schema alignment

The service now uses the real prep schema instead of the original scaffold assumptions:

- `wallets`
- `wallet_transactions`
- `referral_codes`
- `referral_relationships`
- `referral_commissions`
- `event_store`
- `event_outbox`

It does not assume nonexistent `balances`, `transactions`, or `referral_bonuses` tables.

## Reservation model

Reserve and release operations are persisted as wallet events in `event_store` and replayed to compute reserved balance. That keeps reserve state durable without inventing extra tables outside the prep migration set.

## Cashier orchestration modes

`phoenix-wallet` now supports two runtime modes:

- `PAYMENT_PROVIDER_MODE=inline`
  - demo/default mode
  - deposits and withdrawals are applied directly against the wallet ledger
- `PAYMENT_PROVIDER_MODE=provider`
  - provider-oriented mode
  - deposits/withdrawals are created as pending transactions
  - PXP-style callback routes update transaction state and complete or fail wallet mutations
  - admin users can inspect, settle, refund, reverse, charge back, and manually advance/reject provider transactions
  - admin users can assign cashier-review ownership and add review notes by transaction ID or provider reference
  - admin users can work a reconciliation queue for `PENDING_APPROVAL`, `PENDING_REVIEW`, and `RETRYING` transactions
  - admin users can filter the queue and summary views by `assigned_to`, including `unassigned`
  - admin users and operators can review per-user wallet history via both `users/{userID}` and `punters/{userID}` aliases using the legacy Talon wallet-history response shape
  - admin users, operators, and internal support can review per-user financial summary data via both `users/{userID}` and `punters/{userID}` aliases
  - admin users, operators, and internal support can apply manual credit and debit adjustments via both `users/{userID}` and `punters/{userID}` aliases, with operator details persisted in transaction metadata
  - admin users can export the filtered transaction queue as CSV for handoff/review workflows
  - admin users can preview provider reconciliation effects before mutating a transaction
  - transaction detail responses now expose provider timestamps and persisted provider metadata for ops/support tooling
  - provider transitions now persist event history and support richer states such as `PROCESSING`, `CANCELLED`, `REFUNDED`, `REVERSED`, `CHARGEBACK`, and `RETRYING`
  - succeeded deposits and withdrawals now handle balance-safe refund / reversal / chargeback flows
  - provider-ops users (`admin`, `operator`, `trader`) now have a compatibility `POST /admin/provider/cancel` route that resolves the supplied `requestId` against provider-backed wallet transactions and applies a real `CANCELLED` transition when the request still maps to a cancellable payment transaction
  - provider-cancel compatibility writes narrow `audit_log` rows using `provider.cancel.succeeded` and `provider.cancel.failed` action names for provider-ops visibility

## Configuration

```bash
export PORT=8002
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/phoenix_platform?sslmode=disable
export JWT_SECRET=dev-secret-change-in-production
export JWT_ISSUER=phoenix-user
export JWT_AUDIENCE=phoenix-platform
export KAFKA_BROKERS=localhost:9092
export OUTBOX_ENABLED=true
export OUTBOX_POLL_INTERVAL=1s
export OUTBOX_BATCH_SIZE=50
export PAYMENT_PROVIDER_MODE=provider
export PXP_WEBHOOK_USERNAME=pxp
export PXP_WEBHOOK_PASSWORD=pxp-secret
```

## Validation

```bash
go test ./...
go test -race ./...
```

Current status:

- compiles cleanly
- service-level validation tests pass
- race-enabled tests pass
