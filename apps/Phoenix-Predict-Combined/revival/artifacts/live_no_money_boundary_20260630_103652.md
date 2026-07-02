# Live No-Money Boundary Report

- Generated: `2026-06-30T08:36:52.401Z`
- Surfaces: `gateway`
- Checks: 32
- Failures: 0

| Surface | Method | Path | Status | Expectation | Result |
|---|---|---|---:|---|---:|
gateway | GET | `/api/v1/status` | 200 | gateway reports point launch boundary | Pass
gateway | GET | `/api/v1/status` | 200 | status includes prediction | Pass
gateway | GET | `/api/v1/status` | 200 | status includes orders | Pass
gateway | GET | `/api/v1/status` | 200 | status includes point_wallet | Pass
gateway | GET | `/api/v1/status` | 200 | status includes responsible_play | Pass
gateway | GET | `/api/v1/status` | 200 | status includes loyalty | Pass
gateway | GET | `/api/v1/status` | 200 | status includes leaderboards | Pass
gateway | GET | `/api/v1/status` | 200 | status includes auth | Pass
gateway | GET | `/api/v1/status` | 200 | status excludes alpha_cashier | Pass
gateway | GET | `/api/v1/status` | 200 | status excludes payments | Pass
gateway | GET | `/api/v1/status` | 200 | status excludes crypto_payments | Pass
gateway | GET | `/api/v1/cashier/alpha/config` | 404 | gateway money path is absent | Pass
gateway | GET | `/api/v1/cashier/alpha/wallet/challenge` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/cashier/alpha/wallet/connect` | 404 | gateway money path is absent | Pass
gateway | GET | `/api/v1/cashier/alpha/wallets` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/cashier/alpha/deposit-intents` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/cashier/alpha/deposit-intents/intent-1/submit-tx` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/cashier/alpha/withdrawal-requests` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/cashier/alpha/withdrawal-requests/request-1/cancel` | 404 | gateway money path is absent | Pass
gateway | GET | `/api/v1/admin/cashier/alpha/preflight` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/admin/cashier/alpha/deposits` | 404 | gateway money path is absent | Pass
gateway | GET | `/api/v1/admin/cashier/alpha/reconciliation` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/admin/cashier/alpha/withdrawals` | 404 | gateway money path is absent | Pass
gateway | GET | `/api/v1/admin/cashier/alpha/audit-events` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/admin/cashier/alpha/withdrawals/request-1/approve` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/payments/deposit` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/payments/withdraw` | 404 | gateway money path is absent | Pass
gateway | GET | `/api/v1/payments/methods` | 404 | gateway money path is absent | Pass
gateway | GET | `/api/v1/payments/status?transactionId=dep-1` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/payments/webhook` | 404 | gateway money path is absent | Pass
gateway | GET | `/api/v1/payments/crypto/config` | 404 | gateway money path is absent | Pass
gateway | POST | `/api/v1/payments/crypto/deposit-address` | 404 | gateway money path is absent | Pass
