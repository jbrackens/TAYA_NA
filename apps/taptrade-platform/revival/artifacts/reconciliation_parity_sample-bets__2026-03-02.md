# Reconciliation Parity Report

- Fixture: `internal/http/testdata/reconciliation/lifecycle_cases.json`
- Historical CSV: `/Users/johnb/Desktop/PhoenixBotRevival/phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/main/resources/data/reports/sample-bets.csv`
- Cases: `3`
- Passed: `3`
- Failed: `0`

## Skipped Historical Records

- betId=b1 skipped: no supported terminal event (expected SETTLED/CANCELLED/VOIDED)

| Case | Status | Expected (C/D/N/E/U) | Actual (C/D/N/E/U) | Notes |
|---|---|---:|---:|---|
| settle_win | PASS | 7000/1000/6000/3/1 | 7000/1000/6000/3/1 | ok |
| settle_loss_refund | PASS | 6000/1000/5000/3/1 | 6000/1000/5000/3/1 | ok |
| cancel_placed | PASS | 6000/1000/5000/3/1 | 6000/1000/5000/3/1 | ok |
