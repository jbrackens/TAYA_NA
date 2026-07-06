# Go Launch Critical Path Proof (2026-06-28)

Command: `make qa-e2e-critical`

- Result: **pass**
- Retired legacy flow: old /api/v1/bets place/settle replay is no longer a launch gate.
- Launch boundary report: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/go_launch_boundary_20260628_130512.md`
- Point reconciliation report: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/go_prediction_reconciliation_20260628_130512.md`

## Scope

1. Gateway launch boundary reports non-redeemable point mode and disabled legacy money routes.
2. Inherited cashier/payment/crypto-payment routes return 404 in launch mode.
3. Point-native prediction reconciliation fixture passes with PTS ledger fields.
