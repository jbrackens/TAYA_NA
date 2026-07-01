# Live No-Money Boundary Report

- Generated: `2026-06-30T08:52:08.912Z`
- Surfaces: `player`, `office`, `gateway`
- Checks: 70
- Failures: 38

| Surface | Method | Path | Status | Expectation | Result |
|---|---|---|---:|---|---:|
player | GET | `/` | 0 | page responds below 500 | Fail
player | GET | `/predict` | 0 | page responds below 500 | Fail
player | GET | `/rewards` | 0 | page responds below 500 | Fail
player | GET | `/leaderboards` | 0 | page responds below 500 | Fail
player | GET | `/cashier` | 0 | money path is absent | Fail
player | GET | `/cashier/cheque` | 0 | money path is absent | Fail
player | GET | `/cashout` | 0 | money path is absent | Fail
player | GET | `/crypto` | 0 | money path is absent | Fail
player | GET | `/deposit` | 0 | money path is absent | Fail
player | GET | `/deposits` | 0 | money path is absent | Fail
player | GET | `/fiat` | 0 | money path is absent | Fail
player | GET | `/payment` | 0 | money path is absent | Fail
player | GET | `/payments` | 0 | money path is absent | Fail
player | GET | `/prize` | 0 | money path is absent | Fail
player | GET | `/prizes` | 0 | money path is absent | Fail
player | GET | `/redeem` | 0 | money path is absent | Fail
player | GET | `/redemption` | 0 | money path is absent | Fail
player | GET | `/withdraw` | 0 | money path is absent | Fail
player | GET | `/withdrawal` | 0 | money path is absent | Fail
player | GET | `/withdrawals` | 0 | money path is absent | Fail
office | GET | `/` | 0 | page responds below 500 | Fail
office | GET | `/auth/login` | 0 | page responds below 500 | Fail
office | GET | `/cashier` | 0 | money path is absent | Fail
office | GET | `/cashier/cheque` | 0 | money path is absent | Fail
office | GET | `/cashout` | 0 | money path is absent | Fail
office | GET | `/crypto` | 0 | money path is absent | Fail
office | GET | `/deposit` | 0 | money path is absent | Fail
office | GET | `/deposits` | 0 | money path is absent | Fail
office | GET | `/fiat` | 0 | money path is absent | Fail
office | GET | `/payment` | 0 | money path is absent | Fail
office | GET | `/payments` | 0 | money path is absent | Fail
office | GET | `/prize` | 0 | money path is absent | Fail
office | GET | `/prizes` | 0 | money path is absent | Fail
office | GET | `/redeem` | 0 | money path is absent | Fail
office | GET | `/redemption` | 0 | money path is absent | Fail
office | GET | `/withdraw` | 0 | money path is absent | Fail
office | GET | `/withdrawal` | 0 | money path is absent | Fail
office | GET | `/withdrawals` | 0 | money path is absent | Fail
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
