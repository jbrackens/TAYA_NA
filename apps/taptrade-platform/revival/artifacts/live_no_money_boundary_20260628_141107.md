# Live No-Money Boundary Report

- Generated: `2026-06-28T12:11:07.312Z`
- Surfaces: `gateway`
- Checks: 32
- Failures: 29

| Surface | Method | Path | Status | Expectation | Result |
|---|---|---|---:|---|---:|
gateway | GET | `/api/v1/status` | 0 | gateway reports point launch boundary | Fail
gateway | GET | `/api/v1/status` | 0 | status includes prediction | Fail
gateway | GET | `/api/v1/status` | 0 | status includes orders | Fail
gateway | GET | `/api/v1/status` | 0 | status includes point_wallet | Fail
gateway | GET | `/api/v1/status` | 0 | status includes responsible_play | Fail
gateway | GET | `/api/v1/status` | 0 | status includes loyalty | Fail
gateway | GET | `/api/v1/status` | 0 | status includes leaderboards | Fail
gateway | GET | `/api/v1/status` | 0 | status includes auth | Fail
gateway | GET | `/api/v1/status` | 0 | status excludes alpha_cashier | Pass
gateway | GET | `/api/v1/status` | 0 | status excludes payments | Pass
gateway | GET | `/api/v1/status` | 0 | status excludes crypto_payments | Pass
gateway | GET | `/api/v1/cashier/alpha/config` | 0 | gateway money path is absent | Fail
gateway | GET | `/api/v1/cashier/alpha/wallet/challenge` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/cashier/alpha/wallet/connect` | 0 | gateway money path is absent | Fail
gateway | GET | `/api/v1/cashier/alpha/wallets` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/cashier/alpha/deposit-intents` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/cashier/alpha/deposit-intents/intent-1/submit-tx` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/cashier/alpha/withdrawal-requests` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/cashier/alpha/withdrawal-requests/request-1/cancel` | 0 | gateway money path is absent | Fail
gateway | GET | `/api/v1/admin/cashier/alpha/preflight` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/admin/cashier/alpha/deposits` | 0 | gateway money path is absent | Fail
gateway | GET | `/api/v1/admin/cashier/alpha/reconciliation` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/admin/cashier/alpha/withdrawals` | 0 | gateway money path is absent | Fail
gateway | GET | `/api/v1/admin/cashier/alpha/audit-events` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/admin/cashier/alpha/withdrawals/request-1/approve` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/payments/deposit` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/payments/withdraw` | 0 | gateway money path is absent | Fail
gateway | GET | `/api/v1/payments/methods` | 0 | gateway money path is absent | Fail
gateway | GET | `/api/v1/payments/status?transactionId=dep-1` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/payments/webhook` | 0 | gateway money path is absent | Fail
gateway | GET | `/api/v1/payments/crypto/config` | 0 | gateway money path is absent | Fail
gateway | POST | `/api/v1/payments/crypto/deposit-address` | 0 | gateway money path is absent | Fail
