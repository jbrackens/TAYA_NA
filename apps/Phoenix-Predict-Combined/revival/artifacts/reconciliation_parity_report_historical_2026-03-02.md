# Reconciliation Parity Report

- Fixture: `internal/http/testdata/reconciliation/lifecycle_cases.json`
- Historical CSV: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-backend/services/src/test/resources/data/reports/application/multiple-states-bets.csv`
- Cases: `7`
- Passed: `7`
- Failed: `0`

| Case | Status | Expected (C/D/N/E/U) | Actual (C/D/N/E/U) | Notes |
|---|---|---:|---:|---|
| settle_win | PASS | 7000/1000/6000/3/1 | 7000/1000/6000/3/1 | ok |
| settle_loss_refund | PASS | 6000/1000/5000/3/1 | 6000/1000/5000/3/1 | ok |
| cancel_placed | PASS | 6000/1000/5000/3/1 | 6000/1000/5000/3/1 | ok |
| historical_b1 | PASS | 500250/100/500150/3/1 | 500250/100/500150/3/1 | ok |
| historical_b2 | PASS | 500200/200/500000/3/1 | 500200/200/500000/3/1 | ok |
| historical_b3 | PASS | 500480/780/499700/4/1 | 500480/780/499700/4/1 | ok |
| historical_b4 | PASS | 500400/400/500000/3/1 | 500400/400/500000/3/1 | ok |
