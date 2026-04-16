# Reconciliation Parity Report

- Fixture: `internal/http/testdata/reconciliation/lifecycle_cases.json`
- Cases: `3`
- Passed: `3`
- Failed: `0`

| Case | Status | Expected (C/D/N/E/U) | Actual (C/D/N/E/U) | Notes |
|---|---|---:|---:|---|
| settle_win | PASS | 7000/1000/6000/3/1 | 7000/1000/6000/3/1 | ok |
| settle_loss_refund | PASS | 6000/1000/5000/3/1 | 6000/1000/5000/3/1 | ok |
| cancel_placed | PASS | 6000/1000/5000/3/1 | 6000/1000/5000/3/1 | ok |
