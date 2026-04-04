# phoenix-settlement

`phoenix-settlement` handles market settlement batches, manual payouts, and post-settlement reconciliation.

## Implemented API
- `POST /api/v1/settlement-batches`
- `GET /api/v1/settlement-batches/{batch_id}`
- `GET /api/v1/settlement-batches`
- `POST /api/v1/payouts/manual`
- `POST /api/v1/reconciliation`
- `GET /api/v1/reconciliation/{reconciliation_id}`

## Storage
- `settlement_batches`
- `settlement_batch_items`
- `manual_payouts`
- `reconciliations`
- shared reads/writes against `bets`, `wallets`, `wallet_transactions`, `event_store`, `event_outbox`

## Notes
- Settlement is executed atomically in Postgres across bet status updates, reservation releases, wallet ledger mutations, and batch item records.
- Winning bets credit profit only because stake remains on-wallet until reserved funds are released.
- Losing bets convert the reserved stake into a `bet_place` wallet debit during settlement.
- Reconciliation compares expected settlement outcomes against the persisted wallet-adjustment records captured in `settlement_batch_items`.
