# Historical Parity Batch Report

- Input directory: `/Users/johnb/Desktop/PhoenixBotRevival/phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/test/resources/data/reports/application`
- Total CSV files: `2`
- Passed: `1`
- Failed: `0`
- Skipped (schema): `1`

| CSV | Status | Report | Notes |
|---|---|---|---|
| `/Users/johnb/Desktop/PhoenixBotRevival/phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/test/resources/data/reports/application/fixture-market.csv` | SKIPPED | n/a | missing required columns (eventType, betId) |
| `/Users/johnb/Desktop/PhoenixBotRevival/phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/test/resources/data/reports/application/multiple-states-bets.csv` | PASS | `revival/artifacts/reconciliation_parity_multiple-states-bets__2026-03-02.md` | strict parity passed |
