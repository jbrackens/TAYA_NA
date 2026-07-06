# Gateway Launch Boundary Report

- Point mode: `non_redeemable_points`
- Legacy money routes: `disabled`
- Launch route domains: `prediction, orders, portfolio, settlement, point_wallet, users, responsible_play, loyalty, leaderboards, auth`
- Prohibited route probes: 21
- Failures: 0

| Method | Path | Status | Result |
|---|---|---:|---:|
| GET | `/api/v1/cashier/alpha/config` | 404 | Pass |
| GET | `/api/v1/cashier/alpha/wallet/challenge` | 404 | Pass |
| POST | `/api/v1/cashier/alpha/wallet/connect` | 404 | Pass |
| GET | `/api/v1/cashier/alpha/wallets` | 404 | Pass |
| POST | `/api/v1/cashier/alpha/deposit-intents` | 404 | Pass |
| POST | `/api/v1/cashier/alpha/deposit-intents/intent-1/submit-tx` | 404 | Pass |
| POST | `/api/v1/cashier/alpha/withdrawal-requests` | 404 | Pass |
| POST | `/api/v1/cashier/alpha/withdrawal-requests/request-1/cancel` | 404 | Pass |
| GET | `/api/v1/admin/cashier/alpha/preflight` | 404 | Pass |
| GET | `/api/v1/admin/cashier/alpha/deposits` | 404 | Pass |
| GET | `/api/v1/admin/cashier/alpha/reconciliation` | 404 | Pass |
| GET | `/api/v1/admin/cashier/alpha/withdrawals` | 404 | Pass |
| GET | `/api/v1/admin/cashier/alpha/audit-events` | 404 | Pass |
| POST | `/api/v1/admin/cashier/alpha/withdrawals/request-1/approve` | 404 | Pass |
| POST | `/api/v1/payments/deposit` | 404 | Pass |
| POST | `/api/v1/payments/withdraw` | 404 | Pass |
| GET | `/api/v1/payments/methods` | 404 | Pass |
| GET | `/api/v1/payments/status?transactionId=dep-1` | 404 | Pass |
| POST | `/api/v1/payments/webhook` | 404 | Pass |
| GET | `/api/v1/payments/crypto/config` | 404 | Pass |
| GET | `/api/v1/payments/crypto/deposit-address` | 404 | Pass |
