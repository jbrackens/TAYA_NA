# Live No-Money Boundary Report

- Generated: `2026-06-30T08:54:48.775Z`
- Surfaces: `player`, `office`, `gateway`
- Checks: 70
- Failures: 0

| Surface | Method | Path | Status | Expectation | Result |
|---|---|---|---:|---|---:|
player | GET | `/` | 200 | page responds below 500 | Pass
player | GET | `/predict` | 200 | page responds below 500 | Pass
player | GET | `/rewards` | 200 | page responds below 500 | Pass
player | GET | `/leaderboards` | 200 | page responds below 500 | Pass
player | GET | `/cashier` | 404 | money path is absent | Pass
player | GET | `/cashier/cheque` | 404 | money path is absent | Pass
player | GET | `/cashout` | 404 | money path is absent | Pass
player | GET | `/crypto` | 404 | money path is absent | Pass
player | GET | `/deposit` | 404 | money path is absent | Pass
player | GET | `/deposits` | 404 | money path is absent | Pass
player | GET | `/fiat` | 404 | money path is absent | Pass
player | GET | `/payment` | 404 | money path is absent | Pass
player | GET | `/payments` | 404 | money path is absent | Pass
player | GET | `/prize` | 404 | money path is absent | Pass
player | GET | `/prizes` | 404 | money path is absent | Pass
player | GET | `/redeem` | 404 | money path is absent | Pass
player | GET | `/redemption` | 404 | money path is absent | Pass
player | GET | `/withdraw` | 404 | money path is absent | Pass
player | GET | `/withdrawal` | 404 | money path is absent | Pass
player | GET | `/withdrawals` | 404 | money path is absent | Pass
office | GET | `/` | 200 | page responds below 500 | Pass
office | GET | `/auth/login` | 200 | page responds below 500 | Pass
office | GET | `/cashier` | 404 | money path is absent | Pass
office | GET | `/cashier/cheque` | 404 | money path is absent | Pass
office | GET | `/cashout` | 404 | money path is absent | Pass
office | GET | `/crypto` | 404 | money path is absent | Pass
office | GET | `/deposit` | 404 | money path is absent | Pass
office | GET | `/deposits` | 404 | money path is absent | Pass
office | GET | `/fiat` | 404 | money path is absent | Pass
office | GET | `/payment` | 404 | money path is absent | Pass
office | GET | `/payments` | 404 | money path is absent | Pass
office | GET | `/prize` | 404 | money path is absent | Pass
office | GET | `/prizes` | 404 | money path is absent | Pass
office | GET | `/redeem` | 404 | money path is absent | Pass
office | GET | `/redemption` | 404 | money path is absent | Pass
office | GET | `/withdraw` | 404 | money path is absent | Pass
office | GET | `/withdrawal` | 404 | money path is absent | Pass
office | GET | `/withdrawals` | 404 | money path is absent | Pass
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

## Runtime Inputs

- Date: `2026-06-30`
- Player: `http://127.0.0.1:3022`
- Office: `http://127.0.0.1:3020`
- Gateway: `http://127.0.0.1:18180`
- Artifact: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/live_no_money_boundary_20260630_105447.md`
