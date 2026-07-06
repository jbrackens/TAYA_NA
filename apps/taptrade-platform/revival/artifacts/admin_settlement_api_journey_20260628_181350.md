# Admin Settlement API Journey

- Generated: `2026-06-28T18:13:50Z`
- Source report: `revival/39_ADMIN_SETTLEMENT_API_JOURNEY.md`

## Verification Result

`PREDICT_BASE_URL=http://127.0.0.1:3022 npx playwright test --config playwright.prediction.config.ts e2e/prediction/critical-paths.api.spec.ts`

```txt
8 passed (5.3s)
```

The run used a fresh migrated and demo-seeded Postgres container `tiangge-e2e-pg-355` on port `56549`, auth on `18081`, gateway on `18180`, and the player same-origin proxy on `3022`.

The new eighth test proves a fresh user can buy YES, an admin can close and resolve the market, settlement produces point disbursement response fields, the user receives a `prediction_payout:` ledger credit, and portfolio history exposes the settled result with `PTS` fields.
